import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTimezoneStore } from '../store/timezoneStore';
import { authService } from '../api/services/authService';
import { setDynamicBaseUrl, normalizeBackendUrl } from '../api/axiosInstance';
import { STORAGE_KEYS } from '../utils/storage';
import { DeviceInfo, LoginRequest, LoginResponse } from '../types/user';
import { AxiosError } from 'axios';
import { decryptValue } from '../utils/encryption';
import { initializeTenantSupabase } from '../services/supabase/supabaseClient';
import { FORCE_BACKEND_URL } from '@env';

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

      const federatedBackendUrl = federatedResponse.data.tenant.backend_url;
      const effectiveBackendUrl = FORCE_BACKEND_URL && FORCE_BACKEND_URL.trim().length > 0
        ? FORCE_BACKEND_URL
        : federatedBackendUrl;
      if (FORCE_BACKEND_URL && FORCE_BACKEND_URL.trim().length > 0) {
        console.log(`[useLogin] FORCE_BACKEND_URL override active: ${FORCE_BACKEND_URL} (federated returned: ${federatedBackendUrl})`);
      }
      const backendUrl = `${normalizeBackendUrl(effectiveBackendUrl)}/api`;
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
        // Save timezone from API response (user preference or tenant default)
        if (response.data.timezone) {
          await useTimezoneStore.getState().setTimezoneFromApi(
            response.data.timezone,
            response.data.company_timezone,
          );
        }

        // Pull tenant Supabase credentials per spec:
        //   URL          → response.data.user.metadata.tenant.tenant_supabase_url (plaintext as-is)
        //   ANON_KEY     → response.data.supabase_config.SUPABASE_ANON_KEY (encrypted → decrypt)
        //   SERVICE_KEY  → response.data.supabase_config.SUPABASE_SERVICE_ROLE_KEY (encrypted → decrypt)
        // Store all 3 (plaintext) in AsyncStorage; clear on logout.
        const tenantUrl =
          response.data.user?.metadata?.tenant?.tenant_supabase_url || null;
        const anonKey = decryptValue(
          response.data.supabase_config?.SUPABASE_ANON_KEY,
        );
        const serviceKey = decryptValue(
          response.data.supabase_config?.SUPABASE_SERVICE_ROLE_KEY,
        );

        if (tenantUrl && anonKey) {
          await AsyncStorage.multiSet([
            [STORAGE_KEYS.SUPABASE_URL, tenantUrl],
            [STORAGE_KEYS.SUPABASE_ANON_KEY, anonKey],
            [STORAGE_KEYS.SUPABASE_SERVICE_ROLE_KEY, serviceKey || ''],
          ]);

          // Verification log: show what landed in AsyncStorage after the write.
          const stored = await AsyncStorage.multiGet([
            STORAGE_KEYS.SUPABASE_URL,
            STORAGE_KEYS.SUPABASE_ANON_KEY,
            STORAGE_KEYS.SUPABASE_SERVICE_ROLE_KEY,
          ]);
          console.log('[useLogin] AsyncStorage stored Supabase creds:');
          stored.forEach(([k, v]) =>
            console.log(`  ${k} = ${v ? v.slice(0, 60) + (v.length > 60 ? '…' : '') : v}`),
          );

          initializeTenantSupabase(tenantUrl, anonKey, serviceKey || anonKey);
        } else {
          console.warn(
            '[useLogin] missing tenant URL or ANON_KEY decryption failed — chat will use .env defaults',
            { hasUrl: !!tenantUrl, hasAnonKey: !!anonKey },
          );
        }

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
