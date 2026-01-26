import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/user';
import { authService } from '../api/services/authService';
import { STORAGE_KEYS } from '../utils/storage';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
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
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  setAuth: async (user: User, accessToken: string, refreshToken: string) => {
    try {
      console.log('=== SAVING AUTH DATA ===');
      console.log('Access Token:', accessToken ? `${accessToken.substring(0, 30)}...` : 'null');
      console.log('Storage Key:', STORAGE_KEYS.ACCESS_TOKEN);

      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

      // Verify token was saved
      const savedToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      console.log('Token saved successfully:', savedToken ? 'Yes' : 'No');
      console.log('========================');

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
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
      ]);
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
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
        // Token exists, verify with API
        const isValid = await get().verifyAuth();

        if (!isValid) {
          // Token invalid, clear storage
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
        const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        set({
          user: response.data.user,
          accessToken: accessToken,
          refreshToken: refreshToken,
          isAuthenticated: true,
        });

        // Update stored user data
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data.user));

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
}));

export default useAuthStore;
