import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse, CanceledError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL, API_TIMEOUT } from '@env';
import { STORAGE_KEYS } from '../utils/storage';
import { alertService } from '../services/alertService';
import { useAuthStore } from '../store/authStore';
import Toast from 'react-native-toast-message';

const TIMEOUT = Number(API_TIMEOUT) || 60000;

// Token refresh mutex — prevents concurrent refresh attempts
let isRefreshingToken = false;
let refreshQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

const processRefreshQueue = (error: any, token: string | null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token);
  });
  refreshQueue = [];
};

const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/mobile/login',
  '/auth/mobile/exchange-code',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/refresh',
];

const SILENT_ERROR_ENDPOINTS = [
  '/auth/login',
  '/auth/mobile/login',
  '/auth/mobile/exchange-code',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/me',
  '/auth/refresh',
  '/announcements/me',
  '/weather',
  '/eta',
  '/short-urls/resolve',
  '/notifications/register-device',
];

const isPublicEndpoint = (url: string | undefined): boolean => {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

const shouldShowGlobalAlert = (url: string | undefined, status: number | undefined): boolean => {
  if (url && SILENT_ERROR_ENDPOINTS.some(endpoint => url.includes(endpoint))) {
    return false;
  }
  if (status === 401) {
    return false;
  }
  return true;
};

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL || '',
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Normalise a backend URL returned by the federated auth server.
 * Some tenants (e.g. StevensonWeir) return a Vercel frontend URL like
 * https://stevensonweir-frontend-truckast-ai.vercel.app instead of the
 * real API host https://stevensonweir-api.truckast.ai.  This helper
 * converts those and strips trailing slashes.
 */
export const normalizeBackendUrl = (url: string): string => {
  let cleaned = url.trim().replace(/\/+$/, '');
  // Convert Vercel frontend URLs → correct API domain
  const vercelMatch = cleaned.match(
    /^https?:\/\/(\w[\w-]*?)-frontend-truckast-ai\.vercel\.app$/i,
  );
  if (vercelMatch) {
    cleaned = `https://${vercelMatch[1]}-api.truckast.ai`;
  }
  // Android emulator can't reach localhost — rewrite to 10.0.2.2
  if (Platform.OS === 'android') {
    cleaned = cleaned.replace(/\/\/localhost([:\/])/i, '//10.0.2.2$1');
  }
  return cleaned;
};

export const setDynamicBaseUrl = (url: string) => {
  axiosInstance.defaults.baseURL = normalizeBackendUrl(url);
};

export const resetBaseUrl = () => {
  axiosInstance.defaults.baseURL = API_BASE_URL || '';
};

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (!isPublicEndpoint(config.url)) {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
          (config.headers as any)['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('[API] Token error:', error);
      }
    }

    // Attach timezone header for server-side formatting
    try {
      const tzJson = await AsyncStorage.getItem(STORAGE_KEYS.TIMEZONE);
      if (tzJson) {
        const tz = JSON.parse(tzJson);
        if (tz?.iana_code) {
          (config.headers as any)['X-Timezone'] = tz.iana_code;
        }
      }
    } catch {}

    if (__DEV__) {
      const token = (config.headers as any)['Authorization'];
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      if (token) {
        console.log('[API Request] Token:', token);
      }
      if (config.params && Object.keys(config.params).length > 0) {
        console.log('[API Request] Params:', JSON.stringify(config.params, null, 2));
      }
      if (config.data) {
        const safeData = config.data?.password
          ? { ...config.data, password: '***' }
          : config.data;
        console.log('[API Request] Body:', JSON.stringify(safeData, null, 2));
      }
    }

    return config;
  },
  (error: AxiosError) => {
    if (__DEV__) console.error('[API Request Error]', error.message);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (__DEV__) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.baseURL}${response.config.url} — Status: ${response.status}`);
      console.log('[API Response] Data:', JSON.stringify(response.data, null, 2));
    }
    return response;
  },
  async (error: AxiosError) => {
    // Cancelled requests (user navigated away) — reject silently
    if (axios.isCancel(error) || error instanceof CanceledError) {
      return Promise.reject(error);
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _silentError?: boolean };

    const isSilent = SILENT_ERROR_ENDPOINTS.some(ep => originalRequest?.url?.includes(ep));

    if (__DEV__ && !isSilent) {
      console.error(`[API Error] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.baseURL}${originalRequest?.url} — Status: ${error.response?.status}`);
      console.error('[API Error] Message:', error.message);
      if (error.response?.data) {
        console.error('[API Error] Data:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // Token refresh with mutex to prevent concurrent refresh attempts
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      if (isRefreshingToken) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          (originalRequest.headers as any)['Authorization'] = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        });
      }

      isRefreshingToken = true;

      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        if (refreshToken) {
          const refreshUrl = `${axiosInstance.defaults.baseURL}/auth/refresh`;

          const response = await axios.post(
            refreshUrl,
            { refreshToken },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.data.success && response.data.data?.accessToken) {
            const { accessToken } = response.data.data;
            const newRefreshToken = response.data.data?.refreshToken;

            await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            if (newRefreshToken) {
              await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
            }

            useAuthStore.setState({ accessToken });

            (originalRequest.headers as any)['Authorization'] = `Bearer ${accessToken}`;

            processRefreshQueue(null, accessToken);
            return axiosInstance(originalRequest);
          } else {
            throw new Error(response.data.message || 'Token refresh failed');
          }
        } else {
          await useAuthStore.getState().logout();
          Toast.show({ type: 'error', text1: 'Session Expired', text2: 'Your session has expired. Please log in again.', position: 'top', visibilityTime: 5000, autoHide: true, topOffset: 50 });
          processRefreshQueue(error, null);
          return Promise.reject(error);
        }
      } catch (refreshError: any) {
        processRefreshQueue(refreshError, null);
        await useAuthStore.getState().logout();
        alertService.showInfo('Session Expired', 'Your session has expired. Please log in again.');
        return Promise.reject(refreshError);
      } finally {
        isRefreshingToken = false;
      }
    }

    if (!originalRequest._silentError && shouldShowGlobalAlert(originalRequest.url, error.response?.status)) {
      alertService.showApiError(error);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
