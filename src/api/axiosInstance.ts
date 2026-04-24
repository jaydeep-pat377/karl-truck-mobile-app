import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT } from '@env';
import { STORAGE_KEYS } from '../utils/storage';
import { alertService } from '../services/alertService';
import { useAuthStore } from '../store/authStore';

const TIMEOUT = Number(API_TIMEOUT) || 60000;

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
  let cleaned = url.replace(/\/+$/, '');
  // Convert Vercel frontend URLs → correct API domain
  const vercelMatch = cleaned.match(
    /^https?:\/\/(\w[\w-]*?)-frontend-truckast-ai\.vercel\.app$/i,
  );
  if (vercelMatch) {
    cleaned = `https://${vercelMatch[1]}-api.truckast.ai`;
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

    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    if (config.params && Object.keys(config.params).length > 0) {
      console.log('[API Request] Query Params:', JSON.stringify(config.params, null, 2));
    }
    if (config.data) {
      const safeData = config.data?.password
        ? { ...config.data, password: '***' }
        : config.data;
      console.log('[API Request] Body:', JSON.stringify(safeData, null, 2));
    }
    console.log('[API Request] Headers:', JSON.stringify(config.headers, null, 2));

    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error.message);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.baseURL}${response.config.url} — Status: ${response.status}`);
    console.log('[API Response] Data:', JSON.stringify(response.data, null, 2));
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _silentError?: boolean };

    console.error(`[API Error] ${originalRequest.method?.toUpperCase()} ${originalRequest.baseURL}${originalRequest.url} — Status: ${error.response?.status}`);
    console.error('[API Error] Message:', error.message);
    if (error.response?.data) {
      console.error('[API Error] Response:', JSON.stringify(error.response.data, null, 2));
    }

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

        if (refreshToken) {
          const response = await axios.post(
            `${axiosInstance.defaults.baseURL}/auth/refresh`,
            { refreshToken },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.data.success && response.data.data?.accessToken) {
            const { accessToken } = response.data.data;

            await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            (originalRequest.headers as any)['Authorization'] = `Bearer ${accessToken}`;

            return axiosInstance(originalRequest);
          } else {
            throw new Error(response.data.message || 'Token refresh failed');
          }
        } else {
          await useAuthStore.getState().logout();
          alertService.showInfo('Session Expired', 'Your session has expired. Please log in again.');
          return Promise.reject(error);
        }
      } catch (refreshError: any) {
        await useAuthStore.getState().logout();
        alertService.showInfo('Session Expired', 'Your session has expired. Please log in again.');
        return Promise.reject(refreshError);
      }
    }

    if (!originalRequest._silentError && shouldShowGlobalAlert(originalRequest.url, error.response?.status)) {
      alertService.showApiError(error);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
