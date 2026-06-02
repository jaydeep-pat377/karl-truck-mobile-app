/**
 * useSSOLogin — Native Google Sign-In for mobile.
 *
 * Uses @react-native-google-signin/google-signin to authenticate natively
 * (no browser, no redirect, no deep links). After Google returns an idToken,
 * sends it to admin.truckast.ai/api/federated-auth/google-login which
 * validates the token and returns session tokens.
 *
 * Flow:
 *   1. User taps "Sign in with Google"
 *   2. Native Google Sign-In UI appears (no browser)
 *   3. User picks their Google account
 *   4. SDK returns idToken to the app
 *   5. App sends idToken + device_info to /federated-auth/google-login
 *   6. Backend validates token, looks up user, returns session
 *   7. App stores tokens and navigates to main screen
 */

import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuthStore } from '../store/authStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTimezoneStore } from '../store/timezoneStore';
import { setDynamicBaseUrl, normalizeBackendUrl } from '../api/axiosInstance';
import { STORAGE_KEYS } from '../utils/storage';
import { DeviceInfo } from '../types/user';
import { decryptValue } from '../utils/encryption';
import { initializeTenantSupabase } from '../services/supabase/supabaseClient';
import { notificationService } from '../services/notificationService';
import { FEDERATED_AUTH_URL, FORCE_BACKEND_URL, GOOGLE_WEB_CLIENT_ID } from '@env';

// TODO: revert to FEDERATED_AUTH_URL after local testing
const FEDERATED_URL = 'http://192.168.1.20:3001/api';

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

// Hardcoded fallback so .env resets can't break Google Sign-In
const GOOGLE_CLIENT_ID_FALLBACK = '935388358636-qlo6ec057ls2jf8mhjjm5hsks6679k7b.apps.googleusercontent.com';

// Configure Google Sign-In once at module level
let configured = false;
function ensureGoogleConfigured() {
  if (configured) return;
  const clientId = GOOGLE_WEB_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK;
  if (!clientId) {
    console.warn('[SSO] GOOGLE_WEB_CLIENT_ID not set');
    return;
  }
  GoogleSignin.configure({
    webClientId: clientId,
    offlineAccess: false,
  });
  configured = true;
  console.log('[SSO] Google Sign-In configured with:', clientId.substring(0, 20) + '...');
}

export const useSSOLogin = () => {
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configure on mount
  useEffect(() => {
    ensureGoogleConfigured();
  }, []);

  /**
   * Send the Google idToken to the backend, receive session tokens,
   * and set up the full app session (identical to useLogin onSuccess).
   */
  const exchangeGoogleToken = useCallback(async (idToken: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const deviceToken = await notificationService.getToken();
      const device_info = getDeviceInfo(deviceToken || undefined);

      const url = `${FEDERATED_URL}/federated-auth/google-login`;
      console.log(`[SSO] Sending Google token to: ${url}`);

      const response = await axios.post(url, { id_token: idToken, device_info }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const data = response.data;

      if (!data.success || !data.data) {
        throw new Error(data.message || 'Google login failed');
      }

      const responseData = data.data;

      // ---- Set up tenant backend URL ----
      const tenantInfo = responseData.tenant;
      const backendUrl = tenantInfo?.backend_url ||
        responseData.user?.metadata?.tenant?.tenant_backend_url;

      if (backendUrl) {
        const effectiveUrl = FORCE_BACKEND_URL && FORCE_BACKEND_URL.trim().length > 0
          ? FORCE_BACKEND_URL
          : backendUrl;
        const normalizedUrl = `${normalizeBackendUrl(effectiveUrl)}/api`;
        await AsyncStorage.setItem(STORAGE_KEYS.BACKEND_URL, normalizedUrl);
        setDynamicBaseUrl(normalizedUrl);
      }

      // ---- Set current workspace ----
      const subdomain = tenantInfo?.subdomain ||
        responseData.user?.metadata?.tenant?.tenant_subdomain;
      if (subdomain) {
        await useWorkspaceStore.getState().setCurrentWorkspace(subdomain);
      }

      // ---- Save timezone ----
      if (responseData.timezone) {
        await useTimezoneStore.getState().setTimezoneFromApi(
          responseData.timezone,
          responseData.company_timezone,
        );
      }

      // ---- Handle Supabase credentials (same logic as useLogin) ----
      const nestedConfig =
        (responseData.user?.metadata?.tenant as any)?.supabase_config || {};
      const pickKey = (top: string | undefined, nested: string | undefined): string | null => {
        const fromTop = decryptValue(top);
        if (fromTop) return fromTop;
        const fromNestedDecrypted = decryptValue(nested);
        if (fromNestedDecrypted) return fromNestedDecrypted;
        return nested || top || null;
      };
      const tenantUrl =
        responseData.user?.metadata?.tenant?.tenant_supabase_url ||
        nestedConfig.SUPABASE_URL ||
        null;
      const anonKey = pickKey(
        responseData.supabase_config?.SUPABASE_ANON_KEY,
        nestedConfig.SUPABASE_ANON_KEY,
      );
      const serviceKey = pickKey(
        responseData.supabase_config?.SUPABASE_SERVICE_ROLE_KEY,
        nestedConfig.SUPABASE_SERVICE_ROLE_KEY,
      );

      if (tenantUrl && anonKey) {
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.SUPABASE_URL, tenantUrl],
          [STORAGE_KEYS.SUPABASE_ANON_KEY, anonKey],
          [STORAGE_KEYS.SUPABASE_SERVICE_ROLE_KEY, serviceKey || ''],
        ]);
        initializeTenantSupabase(tenantUrl, anonKey, serviceKey || anonKey);
      }

      // ---- Complete login ----
      await setAuth(
        responseData.user,
        responseData.accessToken,
        responseData.refreshToken,
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Google login failed. Please try again.';
      console.error('[SSO] Exchange error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setAuth]);

  /**
   * Start native Google Sign-In. No browser opens — uses the native
   * Google account picker and returns an idToken directly.
   */
  const startGoogleSignIn = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      ensureGoogleConfigured();
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (isSuccessResponse(response)) {
        const idToken = response.data?.idToken;
        if (!idToken) {
          throw new Error('No ID token received from Google');
        }
        console.log('[SSO] Google sign-in successful, exchanging token...');
        await exchangeGoogleToken(idToken);
      } else {
        // User cancelled
        setIsLoading(false);
      }
    } catch (err: any) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            console.log('[SSO] User cancelled Google sign-in');
            // Don't show error for user cancellation
            break;
          case statusCodes.IN_PROGRESS:
            console.log('[SSO] Sign-in already in progress');
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            setError('Google Play Services is not available on this device');
            break;
          default:
            setError(err.message || 'Google sign-in failed');
        }
      } else {
        setError(err?.message || 'Google sign-in failed');
      }
      setIsLoading(false);
    }
  }, [exchangeGoogleToken]);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    startGoogleSignIn,
    isLoading,
    error,
    reset,
  };
};

export default useSSOLogin;
