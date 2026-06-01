import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { colors } from '../theme/colors';
import { STORAGE_KEYS } from '../utils/storage';
import { TenantListItem } from '../types/user';
import { authService } from '../api/services/authService';
import { setDynamicBaseUrl, normalizeBackendUrl } from '../api/axiosInstance';
import { notificationService } from '../services/notificationService';
import { decryptValue } from '../utils/encryption';
import { initializeTenantSupabase } from '../services/supabase/supabaseClient';
import { FORCE_BACKEND_URL } from '@env';

const PALETTE = [
  colors.primary.main,
  colors.secondary.main,
  colors.accent.indigo,
  colors.warning.main,
  colors.info.main,
  colors.status.enRoute,
];

const getAccent = (index: number) => PALETTE[index % PALETTE.length];

export interface Workspace {
  id: string;
  name: string;
  subdomain: string;
  slug: string;
  accent: string;
  status: 'active' | 'inactive';
  backendUrl?: string;
  imageUrl?: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspaceId: string;
  hydrated: boolean;
  isLoadingTenants: boolean;
  isSwitching: boolean;
}

interface WorkspaceActions {
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (id: string) => Promise<void>;
  hydrate: () => Promise<void>;
  fetchTenants: () => Promise<void>;
  switchTenant: (workspace: Workspace) => Promise<void>;
  setIsSwitching: (switching: boolean) => void;
  reset: () => void;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

/**
 * Maps API tenant items to Workspace objects.
 */
const mapTenantsToWorkspaces = (tenants: TenantListItem[]): Workspace[] =>
  tenants.map((t, i) => ({
    id: t.subdomain,
    name: t.name,
    subdomain: t.subdomain,
    slug: t.slug || t.subdomain,
    accent: getAccent(i),
    status: 'active' as const,
    backendUrl: t.backend_url,
    imageUrl: t.image_url,
  }));

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  currentWorkspaceId: '',
  hydrated: false,
  isLoadingTenants: false,
  isSwitching: false,

  setWorkspaces: (workspaces) => set({ workspaces }),

  setCurrentWorkspace: async (id) => {
    set({ currentWorkspaceId: id });
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, id);
    } catch (err) {
      console.warn('[workspaceStore] failed to persist workspace:', err);
    }
  },

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_TENANT);
      if (stored) {
        set({ currentWorkspaceId: stored });
      }
    } catch (err) {
      console.warn('[workspaceStore] hydrate failed:', err);
    } finally {
      set({ hydrated: true });
    }
  },

  /**
   * Fetch tenant list from federated auth server and populate workspaces.
   */
  fetchTenants: async () => {
    set({ isLoadingTenants: true });
    try {
      const response = await authService.getTenantList();
      console.log('[workspaceStore] /api/auth/mobile/tenants response:', JSON.stringify(response, null, 2));
      if (response.success && response.data) {
        const workspaces = mapTenantsToWorkspaces(response.data);
        set({ workspaces });

        // If no current workspace is set, try to match from stored user metadata
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId && workspaces.length > 0) {
          // Try to resolve from the saved backend URL
          const savedBackendUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
          const match = workspaces.find(
            (w) => w.backendUrl && savedBackendUrl?.includes(w.subdomain),
          );
          if (match) {
            set({ currentWorkspaceId: match.id });
          } else {
            set({ currentWorkspaceId: workspaces[0].id });
          }
        }
      }
    } catch (err) {
      console.warn('[workspaceStore] fetchTenants failed:', err);
    } finally {
      set({ isLoadingTenants: false });
    }
  },

  /**
   * Switch to a different tenant:
   * 1. Call federated auth to get auth code + new backend_url
   * 2. Set axios base URL to new tenant
   * 3. Exchange code for new tokens
   * 4. Update auth store
   */
  switchTenant: async (workspace: Workspace) => {
    const { useAuthStore } = require('./authStore');

    set({ isSwitching: true });
    try {
      // Step 1: Get auth code for target tenant
      const switchResponse = await authService.switchTenant(workspace.subdomain);
      if (!switchResponse.success || !switchResponse.data) {
        throw new Error('Failed to get switch credentials');
      }

      const { code, client_secret, tenant } = switchResponse.data;

      // Priority: FORCE_BACKEND_URL override > tenant's backend_url > local dev fallback
      const forced = FORCE_BACKEND_URL && FORCE_BACKEND_URL.trim().length > 0
        ? `${normalizeBackendUrl(FORCE_BACKEND_URL)}/api`
        : null;
      const newBackendUrl = forced
        ?? `${normalizeBackendUrl(tenant.backend_url)}/api`;
      if (forced) {
        console.log(`[workspaceStore] FORCE_BACKEND_URL override active: ${forced} (tenant.backend_url: ${tenant.backend_url})`);
      }

      // Step 2: Set new base URL
      await AsyncStorage.setItem(STORAGE_KEYS.BACKEND_URL, newBackendUrl);
      setDynamicBaseUrl(newBackendUrl);

      // Step 3: Exchange code for new tokens on the target tenant.
      // Use the real FCM token so the device_token registered in the target
      // tenant's user_devices table is one FCM can actually deliver to —
      // otherwise pushes silently fail for chats in that tenant.
      const fcmToken = await notificationService.getToken();
      const deviceInfo = {
        device_token: fcmToken || `switch_${Platform.OS}_${Date.now().toString(36)}`,
        device_type: Platform.OS as 'android' | 'ios',
        device_name: `${Platform.OS} Device`,
      };

      const exchangeResponse = await authService.exchangeCode({
        code,
        client_secret,
        device_info: deviceInfo,
      });

      if (!exchangeResponse.success || !exchangeResponse.data) {
        throw new Error(exchangeResponse.message || 'Code exchange failed');
      }

      // Step 3b: Swap Supabase to target tenant's project BEFORE setAuth.
      // Tenants return supabase_config in two shapes (top-level encrypted
      // vs nested under user.metadata.tenant.supabase_config). See
      // useLogin.ts for the same logic — fall through encrypted top,
      // encrypted nested, then raw nested.
      const nestedConfig =
        (exchangeResponse.data.user?.metadata?.tenant as any)?.supabase_config || {};
      const pickKey = (top: string | undefined, nested: string | undefined): string | null => {
        const fromTop = decryptValue(top);
        if (fromTop) return fromTop;
        const fromNestedDecrypted = decryptValue(nested);
        if (fromNestedDecrypted) return fromNestedDecrypted;
        return nested || top || null;
      };
      const tenantUrl =
        exchangeResponse.data.user?.metadata?.tenant?.tenant_supabase_url ||
        nestedConfig.SUPABASE_URL ||
        null;
      const anonKey = pickKey(
        exchangeResponse.data.supabase_config?.SUPABASE_ANON_KEY,
        nestedConfig.SUPABASE_ANON_KEY,
      );
      const serviceKey = pickKey(
        exchangeResponse.data.supabase_config?.SUPABASE_SERVICE_ROLE_KEY,
        nestedConfig.SUPABASE_SERVICE_ROLE_KEY,
      );

      if (tenantUrl && anonKey) {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.SUPABASE_URL, tenantUrl],
          [STORAGE_KEYS.SUPABASE_ANON_KEY, anonKey],
          [STORAGE_KEYS.SUPABASE_SERVICE_ROLE_KEY, serviceKey || ''],
        ]);

        const stored = await AsyncStorage.multiGet([
          STORAGE_KEYS.SUPABASE_URL,
          STORAGE_KEYS.SUPABASE_ANON_KEY,
          STORAGE_KEYS.SUPABASE_SERVICE_ROLE_KEY,
        ]);
        console.log('[workspaceStore] AsyncStorage stored Supabase creds (post-switch):');
        stored.forEach(([k, v]) =>
          console.log(`  ${k} = ${v ? v.slice(0, 60) + (v.length > 60 ? '…' : '') : v}`),
        );

        initializeTenantSupabase(tenantUrl, anonKey, serviceKey || anonKey);
      } else {
        console.warn(
          '[workspaceStore] switchTenant: missing tenant URL or ANON_KEY decryption failed — keeping previous Supabase client',
          { hasUrl: !!tenantUrl, hasAnonKey: !!anonKey },
        );
      }

      // Step 4: Update auth store with new credentials
      const { user, accessToken, refreshToken, timezone, company_timezone } = exchangeResponse.data;
      await useAuthStore.getState().setAuth(user, accessToken, refreshToken);

      // Step 4b: Update timezone for the new tenant
      if (timezone) {
        const { useTimezoneStore } = require('./timezoneStore');
        await useTimezoneStore.getState().setTimezoneFromApi(timezone, company_timezone);
      }

      // Step 5: Update current workspace
      await get().setCurrentWorkspace(workspace.id);

      console.log(`[workspaceStore] Switched to tenant: ${workspace.name}`);
    } catch (err) {
      console.error('[workspaceStore] switchTenant failed:', err);
      // Restore previous backend URL
      const savedBackendUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
      if (savedBackendUrl) {
        setDynamicBaseUrl(savedBackendUrl);
      }
      throw err;
    } finally {
      set({ isSwitching: false });
    }
  },

  setIsSwitching: (switching) => set({ isSwitching: switching }),

  reset: () => {
    set({
      workspaces: [],
      currentWorkspaceId: '',
      hydrated: false,
      isLoadingTenants: false,
      isSwitching: false,
    });
  },
}));

export const getWorkspaceInitial = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
