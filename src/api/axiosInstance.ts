/**
 * Axios Instance - Production Ready
 */

import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT } from '@env';
import { STORAGE_KEYS } from '../utils/storage';

// CRITICAL: Log to verify env is loading
const FALLBACK_URL = 'http://api.truckast.ai/api';
const BASE_URL = API_BASE_URL || FALLBACK_URL;
const TIMEOUT = Number(API_TIMEOUT) || 30000;

// Always log this on app start to debug
console.log('==========================================');
console.log('API CONFIGURATION');
console.log('------------------------------------------');
console.log('ENV API_BASE_URL:', API_BASE_URL);
console.log('Using BASE_URL:', BASE_URL);
console.log('Timeout:', TIMEOUT);
console.log('==========================================');

// Public endpoints (no auth required)
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/refresh',
];

const isPublicEndpoint = (url: string | undefined): boolean => {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

// Create axios instance
export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${fullUrl}`);

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

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log(`[API RESPONSE] ${response.status} ${response.config.url}`);
    return response;
  },
  async (error: AxiosError) => {
    console.log(`[API ERROR] ${error.response?.status || 'Network Error'} ${error.config?.url}`);
    console.log('[API ERROR DATA]', error.response?.data || error.message);

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Token refresh on 401
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicEndpoint(originalRequest.url)
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const currentAccessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

        if (refreshToken && currentAccessToken) {
          const response = await axios.post(
            `${BASE_URL}/auth/refresh`,
            { refreshToken },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentAccessToken}`,
              },
            }
          );

          const { accessToken } = response.data.data;
          await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          (originalRequest.headers as any)['Authorization'] = `Bearer ${accessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.ACCESS_TOKEN,
          STORAGE_KEYS.REFRESH_TOKEN,
          STORAGE_KEYS.USER,
        ]);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
