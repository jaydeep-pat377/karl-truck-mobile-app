import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { authService } from '../api/services/authService';
import { DeviceInfo, LoginRequest } from '../types/user';
import { AxiosError } from 'axios';

interface UseAuthReturn {
  login: (email: string, password: string, deviceToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

export const useAuth = (): UseAuthReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setAuth, logout: storeLogout } = useAuthStore();

  const getDeviceInfo = (deviceToken: string): DeviceInfo => {
    return {
      device_token: deviceToken || 'fcm-device-token-here',
      device_type: Platform.OS as 'android' | 'ios',
      device_name: `${Platform.OS} Device`,
    };
  };

  const login = useCallback(
    async (email: string, password: string, deviceToken?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const deviceInfo = getDeviceInfo(deviceToken || '');

        const credentials: LoginRequest = {
          email,
          password,
          device_info: deviceInfo,
        };

        // Federated login to get code + client_secret
        const federatedResponse = await authService.federatedLogin(email, password);
        if (!federatedResponse.success || !federatedResponse.data?.code) {
          throw new Error(federatedResponse.message || 'Federated login failed');
        }

        const response = await authService.login(credentials, federatedResponse.data.code, federatedResponse.data.client_secret);

        await setAuth(
          response.user,
          response.access_token,
          response.refresh_token
        );
      } catch (err) {
        const axiosError = err as AxiosError<ApiErrorResponse>;
        const errorMessage =
          axiosError.response?.data?.message ||
          axiosError.response?.data?.error ||
          'Login failed. Please check your credentials.';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [setAuth]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout API failed:', err);
    } finally {
      await storeLogout();
      setIsLoading(false);
    }
  }, [storeLogout]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    login,
    logout,
    isLoading,
    error,
    clearError,
  };
};

export default useAuth;
