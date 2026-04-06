import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/user';
import { authService } from '../api/services/authService';
import { STORAGE_KEYS } from '../utils/storage';
import { setAuthCredentials, clearWidgetData } from '../modules/TodayOverviewWidget';
import { setWidgetLoggedIn, reloadWidget } from '../native/WidgetModule';
import { API_BASE_URL } from '@env';
import { normaliseUserRole } from '../utils/permissions';

const WIDGET_API_URL = API_BASE_URL || 'http://api.truckast.ai/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  appPermissions: string[];
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

      setAuthCredentials(accessToken, WIDGET_API_URL).catch((err) =>
        console.log('Widget auth setup error:', err)
      );

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
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.APP_PERMISSIONS,
      ]);

      clearWidgetData().catch((err) =>
        console.log('Widget clear error:', err)
      );

      setWidgetLoggedIn(false);
      reloadWidget();

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        appPermissions: [],
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
          setAuthCredentials(accessToken, WIDGET_API_URL).catch((err) =>
            console.log('Widget auth setup error:', err)
          );
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
      console.log('[Auth] App permissions API response:', JSON.stringify(response, null, 2));
      if (response.success && response.data?.permissions) {
        const permissions = response.data.permissions;
        set({ appPermissions: permissions });
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
