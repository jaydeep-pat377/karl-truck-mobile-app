import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/user';
import { authService } from '../api/services/authService';
import { STORAGE_KEYS } from '../utils/storage';
import { setAuthCredentials, clearWidgetData } from '../modules/TodayOverviewWidget';
import { setWidgetLoggedIn, reloadWidget } from '../native/WidgetModule';
import { normaliseUserRole } from '../utils/permissions';
import { setDynamicBaseUrl, resetBaseUrl } from '../api/axiosInstance';
import { useWorkspaceStore } from './workspaceStore';
import { tearDownSupabase } from '../services/supabase/supabaseClient';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  appPermissions: string[];
  showRegion: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

interface AuthActions {
  setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (isLoading: boolean) => void;
  initialize: () => Promise<void>;
  verifyAuth: () => Promise<boolean>;
  updateUser: (user: Partial<User>) => void;
  fetchAppPermissions: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  appPermissions: [],
  showRegion: true,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setAuth: async (rawUser: User, accessToken: string, refreshToken: string) => {
    try {
      // Normalise role fields (handles user_role → userRole, display names → slugs)
      const user = normaliseUserRole(rawUser) as User;
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

      // Use the dynamic tenant backend URL for the widget
      const widgetApiUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
      if (widgetApiUrl) {
        setAuthCredentials(accessToken, widgetApiUrl).catch((err) =>
          console.log('Widget auth setup error:', err)
        );
      }

      setWidgetLoggedIn(true);
      reloadWidget();

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });

      // Fetch app permissions after login
      get().fetchAppPermissions();
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      // Disconnect tenant Supabase realtime + reset client to .env defaults
      // BEFORE wiping storage, so any in-flight subscribers see a clean teardown.
      tearDownSupabase();

      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.APP_PERMISSIONS,
        STORAGE_KEYS.BACKEND_URL,
        STORAGE_KEYS.CURRENT_TENANT,
        STORAGE_KEYS.SUPABASE_URL,
        STORAGE_KEYS.SUPABASE_ANON_KEY,
        STORAGE_KEYS.SUPABASE_SERVICE_ROLE_KEY,
      ]);

      // Verification log: after removal, all 3 should read back as null.
      const afterClear = await AsyncStorage.multiGet([
        STORAGE_KEYS.SUPABASE_URL,
        STORAGE_KEYS.SUPABASE_ANON_KEY,
        STORAGE_KEYS.SUPABASE_SERVICE_ROLE_KEY,
      ]);
      console.log('[authStore.logout] AsyncStorage after Supabase cred removal:');
      afterClear.forEach(([k, v]) => console.log(`  ${k} = ${v}`));

      resetBaseUrl();

      clearWidgetData().catch((err) =>
        console.log('Widget clear error:', err)
      );

      setWidgetLoggedIn(false);
      reloadWidget();

      // Reset workspace store so stale tenant doesn't persist across logins
      useWorkspaceStore.getState().reset();

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        appPermissions: [],
        showRegion: true,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error clearing auth data:', error);
      throw error;
    }
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  initialize: async () => {
    try {
      set({ isLoading: true });

      // Restore dynamic backend URL before any API calls
      const savedBackendUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
      if (savedBackendUrl) {
        setDynamicBaseUrl(savedBackendUrl);
      }

      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (accessToken && refreshToken) {
        const isValid = await get().verifyAuth();
        if (!isValid) {
          await get().logout();
        }
      }

      set({ isInitialized: true, isLoading: false });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ isInitialized: true, isLoading: false });
    }
  },

  verifyAuth: async (): Promise<boolean> => {
    try {
      const response = await authService.getMe();

      if (response.success && response.data?.user) {
        const user = normaliseUserRole(response.data.user) as User;
        const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        set({
          user,
          accessToken: accessToken,
          refreshToken: refreshToken,
          isAuthenticated: true,
        });

        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

        if (accessToken) {
          const widgetApiUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
          if (widgetApiUrl) {
            setAuthCredentials(accessToken, widgetApiUrl).catch((err) =>
              console.log('Widget auth setup error:', err)
            );
          }
        }

        setWidgetLoggedIn(true);
        reloadWidget();

        // Fetch app permissions on app restart
        get().fetchAppPermissions();

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying auth:', error);
      return false;
    }
  },

  updateUser: (userData: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      set({ user: updatedUser });
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
  },

  fetchAppPermissions: async () => {
    try {
      const response = await authService.getAppPermissions();
      if (response.success && response.data?.permissions) {
        const permissions = response.data.permissions;
        const showRegion = response.data?.showRegion !== false;
        set({ appPermissions: permissions, showRegion });
        await AsyncStorage.setItem(STORAGE_KEYS.APP_PERMISSIONS, JSON.stringify(permissions));
      }
    } catch (error) {
      console.error('[Auth] Failed to fetch app permissions:', error);
      // Try to load from cache
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.APP_PERMISSIONS);
        if (cached) {
          set({ appPermissions: JSON.parse(cached) });
        }
      } catch { /* ignore */ }
    }
  },

  hasPermission: (code: string) => {
    return get().appPermissions.includes(code);
  },
}));

export default useAuthStore;
