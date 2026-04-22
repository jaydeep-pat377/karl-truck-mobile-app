import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { authService } from '../api/services/authService';
import { setDynamicBaseUrl } from '../api/axiosInstance';
import { STORAGE_KEYS } from '../utils/storage';
import { DeviceInfo, LoginRequest, LoginResponse } from '../types/user';
import { AxiosError } from 'axios';
import { APP_ENV } from '@env';

// TODO: Remove after testing — forces mobile app to use local backend instead of production
const DEV_LOCAL_BACKEND_URL = 'http://192.168.1.20:5000/api';

interface LoginParams {
  email: string;
  password: string;
  deviceToken?: string;
}

interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  error?: string;
}

const generateFallbackToken = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `fallback_${Platform.OS}_${timestamp}_${randomPart}`;
};

const getDeviceInfo = (deviceToken?: string): DeviceInfo => ({
  device_token: deviceToken || generateFallbackToken(),
  device_type: Platform.OS as 'android' | 'ios',
  device_name: `${Platform.OS} Device`,
});

export const useLogin = () => {
  const { setAuth } = useAuthStore();

  const mutation = useMutation<LoginResponse, AxiosError<ApiErrorResponse>, LoginParams>({
    mutationFn: async ({ email, password, deviceToken }: LoginParams) => {
      // Federated login to get tenant backend_url
      const federatedResponse = await authService.federatedLogin(email, password);
      if (!federatedResponse.success || !federatedResponse.data?.tenant?.backend_url) {
        throw new Error(federatedResponse.message || 'Federated login failed');
      }

      // In development, use local backend; in production, use the tenant's backend_url
      const backendUrl = APP_ENV === 'development'
        ? DEV_LOCAL_BACKEND_URL
        : `${federatedResponse.data.tenant.backend_url}/api`;
      await AsyncStorage.setItem(STORAGE_KEYS.BACKEND_URL, backendUrl);
      setDynamicBaseUrl(backendUrl);

      // Persist the logged-in tenant so it shows in the dropdown on reopen
      const tenantSubdomain = federatedResponse.data.tenant.subdomain;
      if (tenantSubdomain) {
        await useWorkspaceStore.getState().setCurrentWorkspace(tenantSubdomain);
      }

      // Existing two-step login flow using the new backend_url
      const credentials: LoginRequest = {
        email,
        password,
        device_info: getDeviceInfo(deviceToken),
      };
      return authService.login(credentials, federatedResponse.data.code, federatedResponse.data.client_secret);
    },
    onSuccess: async (response) => {
      if (response.success && response.data) {
        await setAuth(
          response.data.user,
          response.data.accessToken,
          response.data.refreshToken
        );
      }
    },
  });

  const login = async (email: string, password: string, deviceToken?: string) => {
    return mutation.mutateAsync({ email, password, deviceToken });
  };

  const errorMessage =
    mutation.error?.response?.data?.message ||
    mutation.error?.response?.data?.error ||
    (mutation.error ? mutation.error.message || 'Login failed. Please check your credentials.' : null);

  return {
    login,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: errorMessage,
    reset: mutation.reset,
  };
};

export default useLogin;
