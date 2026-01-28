import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { authService } from '../api/services/authService';
import { DeviceInfo, LoginRequest, LoginResponse } from '../types/user';
import { AxiosError } from 'axios';

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

// Generate a fallback device token when FCM is unavailable (e.g., iOS simulator)
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
      const credentials: LoginRequest = {
        email,
        password,
        device_info: getDeviceInfo(deviceToken),
      };
      return authService.login(credentials);
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
    (mutation.error ? 'Login failed. Please check your credentials.' : null);

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
