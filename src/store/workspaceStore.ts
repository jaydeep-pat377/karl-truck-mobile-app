import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { colors } from '../theme/colors';
import { STORAGE_KEYS } from '../utils/storage';
import { TenantListItem } from '../types/user';
import { authService } from '../api/services/authService';
import { setDynamicBaseUrl } from '../api/axiosInstance';
import { APP_ENV } from '@env';

// TODO: Remove after testing — forces code exchange to use local backend
const DEV_LOCAL_BACKEND_URL = 'http://192.168.1.20:5000/api';

const PALETTE = [
  colors.primary.main,
  colors.secondary.main,
  colors.accent.indigo,
  colors.warning.main,
  colors.info.main,
  '#8B5CF6',
];

const getAccent = (index: number) => PALETTE[index % PALETTE.length];

export interface Workspace {
  id: string;
  name: string;
  subdomain: string;
  accent: string;
  status: 'active' | 'inactive';
  backendUrl?: string;
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
    accent: getAccent(i),
    status: 'active' as const,
    backendUrl: t.backend_url,
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

      // In development, stay on local backend; in production, switch to target tenant's backend
      const newBackendUrl = APP_ENV === 'development'
        ? DEV_LOCAL_BACKEND_URL
        : `${tenant.backend_url}/api`;

      // Step 2: Set new base URL
      await AsyncStorage.setItem(STORAGE_KEYS.BACKEND_URL, newBackendUrl);
      setDynamicBaseUrl(newBackendUrl);

      // Step 3: Exchange code for new tokens on the target tenant
      const deviceInfo = {
        device_token: `switch_${Platform.OS}_${Date.now().toString(36)}`,
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

      // Step 4: Update auth store with new credentials
      const { user, accessToken, refreshToken } = exchangeResponse.data;
      await useAuthStore.getState().setAuth(user, accessToken, refreshToken);

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
}));

export const getWorkspaceInitial = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
