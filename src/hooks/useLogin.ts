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
      console.log('[useLogin] ====== FEDERATED LOGIN START ======');
      console.log('[useLogin] Step 1 — federatedLogin params:', JSON.stringify({ email, password: '***' }));
      const federatedResponse = await authService.federatedLogin(email, password);
      console.log('[useLogin] Step 1 — federatedLogin response:', JSON.stringify(federatedResponse, null, 2));
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
      console.log('[useLogin] Step 2 — exchange-code params:', JSON.stringify({
        code: federatedResponse.data.code,
        client_secret: federatedResponse.data.client_secret ? '***' : undefined,
        device_info: credentials.device_info,
      }));
      console.log('[useLogin] Step 2 — exchange-code baseURL:', `${backendUrl}/auth/mobile/exchange-code`);
      const exchangeResponse = await authService.login(credentials, federatedResponse.data.code, federatedResponse.data.client_secret);
      console.log('[useLogin] Step 2 — exchange-code response:', JSON.stringify({
        success: exchangeResponse.success,
        hasUser: !!exchangeResponse.data?.user,
        userId: exchangeResponse.data?.user?.id,
        userEmail: exchangeResponse.data?.user?.email,
        hasAccessToken: !!exchangeResponse.data?.accessToken,
        hasRefreshToken: !!exchangeResponse.data?.refreshToken,
        backendUrl: exchangeResponse.data?.user?.metadata?.tenant?.tenant_backend_url,
        tenant: exchangeResponse.data?.tenant,
        timezone: exchangeResponse.data?.timezone,
      }, null, 2));
      console.log('[useLogin] ====== FEDERATED LOGIN END ======');
      return exchangeResponse;
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

        // Pull tenant Supabase credentials. Two response shapes seen in
        // the wild, and both can be encrypted:
        //   Dolese: top-level `supabase_config` with encrypted values.
        //   Sunrise et al: same fields nested under
        //                  user.metadata.tenant.supabase_config — also
        //                  encrypted (not plaintext as I initially assumed).
        // Resolution: try to decrypt whichever location has a value; if
        // decryption fails for a hex-iv:tag:ct string, the value is null
        // and we fall through to the next candidate; if a tenant
        // genuinely returns plaintext, decryptValue() returns null and
        // we use the raw value at the end. Without this, the encrypted
        // anon key gets sent to Supabase verbatim and the client rejects
        // it as "Invalid API key" on every realtime/query call.
        const nestedConfig =
          (response.data.user?.metadata?.tenant as any)?.supabase_config || {};
        const pickKey = (top: string | undefined, nested: string | undefined): string | null => {
          const fromTop = decryptValue(top);
          if (fromTop) return fromTop;
          const fromNestedDecrypted = decryptValue(nested);
          if (fromNestedDecrypted) return fromNestedDecrypted;
          return nested || top || null;
        };
        const tenantUrl =
          response.data.user?.metadata?.tenant?.tenant_supabase_url ||
          nestedConfig.SUPABASE_URL ||
          null;
        const anonKey = pickKey(
          response.data.supabase_config?.SUPABASE_ANON_KEY,
          nestedConfig.SUPABASE_ANON_KEY,
        );
        const serviceKey = pickKey(
          response.data.supabase_config?.SUPABASE_SERVICE_ROLE_KEY,
          nestedConfig.SUPABASE_SERVICE_ROLE_KEY,
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
