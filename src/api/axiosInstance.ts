import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT } from '@env';
import { STORAGE_KEYS } from '../utils/storage';
import { alertService } from '../services/alertService';
import { useAuthStore } from '../store/authStore';

const FALLBACK_URL = 'http://10.0.2.2:5000/api';
const BASE_URL = API_BASE_URL || FALLBACK_URL;
const TIMEOUT = Number(API_TIMEOUT) || 15000;

const ENABLE_API_LOGGING = __DEV__;

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

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    let token: string | null = null;

    if (!isPublicEndpoint(config.url)) {
      try {
        token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
          (config.headers as any)['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('[API] Token error:', error);
      }
    }


    if (ENABLE_API_LOGGING) {
      console.log('Headers:', JSON.stringify(config.headers, null, 2));
    }

    return config;
  },
  (error: AxiosError) => {
    if (ENABLE_API_LOGGING) {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

const SILENT_ERROR_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/me',
  '/auth/refresh',
  '/announcements/me',
];

const shouldShowGlobalAlert = (url: string | undefined, status: number | undefined): boolean => {

  if (url && SILENT_ERROR_ENDPOINTS.some(endpoint => url.includes(endpoint))) {
    return false;
  }

  if (status === 401) {
    return false;
  }
  return true;
};

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {

    if (ENABLE_API_LOGGING) {
      console.log('Response Data:', JSON.stringify(response.data, null, 2));
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _silentError?: boolean };
    const isSilentEndpoint = SILENT_ERROR_ENDPOINTS.some(endpoint => originalRequest.url?.includes(endpoint));

    // Only log errors for non-silent endpoints in development
    if (ENABLE_API_LOGGING && !isSilentEndpoint) {
      console.error('Error Message:', error.message);
      if (error.response?.data) {
        console.error('Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      console.error('================================\n');
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
          console.log('Request Body:', JSON.stringify({ refreshToken }, null, 2));

          const response = await axios.post(
            `${BASE_URL}/auth/refresh`,
            { refreshToken },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          console.log('Status:', response);

          // Check if refresh was successful
          if (response.data.success && response.data.data?.accessToken) {
            const { accessToken } = response.data.data;

            // Store new access token
            await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);

            // Update original request with new token
            (originalRequest.headers as any)['Authorization'] = `Bearer ${accessToken}`;
            console.log('New Access Token:', `${accessToken.substring(0, 30)}...${accessToken.substring(accessToken.length - 10)}`);

            // Retry original request with new token
            return axiosInstance(originalRequest);
          } else {
            console.log('Message:', response.data.message);
            throw new Error(response.data.message || 'Token refresh failed');
          }
        } else {
          // No refresh token available, logout and redirect to login
          console.log('\n========== TOKEN REFRESH FAILED ==========');

          await useAuthStore.getState().logout();

          alertService.showInfo(
            'Session Expired',
            'Your session has expired. Please log in again.'
          );

          return Promise.reject(error);
        }
      } catch (refreshError: any) {
        // Log refresh API error
        console.log('\n========== TOKEN REFRESH ERROR ==========');

        // Clear tokens and logout - redirect to login screen
        await useAuthStore.getState().logout();

        alertService.showInfo(
          'Session Expired',
          'Your session has expired. Please log in again.'
        );

        return Promise.reject(refreshError);
      }
    }


    if (
      !originalRequest._silentError &&
      shouldShowGlobalAlert(originalRequest.url, error.response?.status)
    ) {
      alertService.showApiError(error);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
