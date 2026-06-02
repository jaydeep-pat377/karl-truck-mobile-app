/**
 * useSSOLogin — SSO authentication for Google and Microsoft.
 *
 * Google: Uses native @react-native-google-signin/google-signin.
 *
 * Microsoft: Direct OAuth via WebView (no auth app dependency).
 *   1. User taps "Sign in with Microsoft"
 *   2. Modal WebView opens Microsoft login (with PKCE)
 *   3. WebView intercepts callback redirect, extracts auth code
 *   4. App exchanges code for access_token at Microsoft token endpoint
 *   5. App sends access_token to /federated-auth/microsoft-login
 *   6. Backend validates via Graph API, returns session
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { sha256 } from '@noble/hashes/sha2';
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

const FEDERATED_URL = FEDERATED_AUTH_URL || 'https://admin.truckast.ai/api';

// Microsoft OAuth — direct from mobile
const MS_CLIENT_ID = '9c2d902a-153e-40e6-a91b-2f15b34d98ca';
const MS_AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_REDIRECT_URI = 'https://auth.truckast.ai/api/auth/oauth/microsoft/callback';
const MS_SCOPES = 'openid email profile User.Read';

// ---------- helpers ----------

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

function randomBase64Url(byteLength: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < byteLength; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function pkceChallenge(verifier: string): string {
  const hash = sha256(new TextEncoder().encode(verifier));
  let binary = '';
  hash.forEach((b: number) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function extractParam(url: string, param: string): string | null {
  const match = url.match(new RegExp('[?&#]' + param + '=([^&#]+)'));
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------- Google config ----------

const GOOGLE_CLIENT_ID_FALLBACK = '935388358636-qlo6ec057ls2jf8mhjjm5hsks6679k7b.apps.googleusercontent.com';
let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured) return;
  const clientId = GOOGLE_WEB_CLIENT_ID || GOOGLE_CLIENT_ID_FALLBACK;
  if (!clientId) return;
  GoogleSignin.configure({ webClientId: clientId, offlineAccess: false });
  googleConfigured = true;
}

// ---------- shared session setup ----------

async function setupSessionFromResponse(
  responseData: any,
  setAuth: (user: any, accessToken: string, refreshToken: string) => Promise<void>,
) {
  const tenantInfo = responseData.tenant;
  const backendUrl = tenantInfo?.backend_url ||
    responseData.user?.metadata?.tenant?.tenant_backend_url;

  if (backendUrl) {
    const effectiveUrl = FORCE_BACKEND_URL && FORCE_BACKEND_URL.trim().length > 0
      ? FORCE_BACKEND_URL : backendUrl;
    const normalizedUrl = `${normalizeBackendUrl(effectiveUrl)}/api`;
    await AsyncStorage.setItem(STORAGE_KEYS.BACKEND_URL, normalizedUrl);
    setDynamicBaseUrl(normalizedUrl);
  }

  const subdomain = tenantInfo?.subdomain ||
    responseData.user?.metadata?.tenant?.tenant_subdomain;
  if (subdomain) {
    await useWorkspaceStore.getState().setCurrentWorkspace(subdomain);
  }

  if (responseData.timezone) {
    await useTimezoneStore.getState().setTimezoneFromApi(
      responseData.timezone, responseData.company_timezone);
  }

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
    nestedConfig.SUPABASE_URL || null;
  const anonKey = pickKey(
    responseData.supabase_config?.SUPABASE_ANON_KEY,
    nestedConfig.SUPABASE_ANON_KEY);
  const serviceKey = pickKey(
    responseData.supabase_config?.SUPABASE_SERVICE_ROLE_KEY,
    nestedConfig.SUPABASE_SERVICE_ROLE_KEY);

  if (tenantUrl && anonKey) {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.SUPABASE_URL, tenantUrl],
      [STORAGE_KEYS.SUPABASE_ANON_KEY, anonKey],
      [STORAGE_KEYS.SUPABASE_SERVICE_ROLE_KEY, serviceKey || ''],
    ]);
    initializeTenantSupabase(tenantUrl, anonKey, serviceKey || anonKey);
  }

  await setAuth(responseData.user, responseData.accessToken, responseData.refreshToken);
}

// ==========================================================================
// Microsoft Auth WebView state — exposed so LoginScreen can render the WebView
// ==========================================================================

export interface MicrosoftAuthState {
  visible: boolean;
  url: string;
  codeVerifier: string;
}

// ==========================================================================
// Hook
// ==========================================================================

export const useSSOLogin = () => {
  const { setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WebView state for Microsoft auth
  const [msAuthState, setMsAuthState] = useState<MicrosoftAuthState>({
    visible: false,
    url: '',
    codeVerifier: '',
  });
  const msAuthResolverRef = useRef<((code: string | null) => void) | null>(null);

  useEffect(() => { ensureGoogleConfigured(); }, []);

  // ---- Google ----

  const exchangeGoogleToken = useCallback(async (idToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const deviceToken = await notificationService.getToken();
      const device_info = getDeviceInfo(deviceToken || undefined);
      const url = `${FEDERATED_URL}/federated-auth/google-login`;
      const body = { id_token: idToken, device_info };

      console.log('[SSO Google] ====== REQUEST ======');
      console.log('[SSO Google] URL:', url);
      console.log('[SSO Google] Body:', JSON.stringify({ id_token: idToken?.substring(0, 30) + '...', device_info }, null, 2));

      const response = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' }, timeout: 30000,
      });
      const data = response.data;

      console.log('[SSO Google] ====== RESPONSE ======');
      console.log('[SSO Google] Status:', response.status);
      console.log('[SSO Google] Success:', data.success);
      console.log('[SSO Google] User:', data.data?.user?.email);
      console.log('[SSO Google] AccessToken:', data.data?.accessToken?.substring(0, 30) + '...');
      console.log('[SSO Google] RefreshToken:', data.data?.refreshToken?.substring(0, 30) + '...');
      console.log('[SSO Google] Tenant:', JSON.stringify(data.data?.tenant, null, 2));
      console.log('[SSO Google] Backend URL:', data.data?.tenant?.backend_url);
      console.log('[SSO Google] Full Response:', JSON.stringify(data, null, 2));

      if (!data.success || !data.data) throw new Error(data.message || 'Google login failed');
      await setupSessionFromResponse(data.data, setAuth);
    } catch (err: any) {
      console.error('[SSO Google] ====== ERROR ======');
      console.error('[SSO Google] Message:', err?.response?.data?.message || err?.message);
      console.error('[SSO Google] Status:', err?.response?.status);
      console.error('[SSO Google] Response:', JSON.stringify(err?.response?.data, null, 2));
      setError(err?.response?.data?.message || err?.message || 'Google login failed.');
    } finally {
      setIsLoading(false);
    }
  }, [setAuth]);

  const startGoogleSignIn = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      ensureGoogleConfigured();
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isSuccessResponse(response)) {
        const idToken = response.data?.idToken;
        if (!idToken) throw new Error('No ID token from Google');
        await exchangeGoogleToken(idToken);
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled — no error
      } else {
        setError(err?.message || 'Google sign-in failed');
      }
      setIsLoading(false);
    }
  }, [exchangeGoogleToken]);

  // ---- Microsoft: exchange access_token with backend ----

  const exchangeMicrosoftToken = useCallback(async (accessToken: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const deviceToken = await notificationService.getToken();
      const device_info = getDeviceInfo(deviceToken || undefined);
      const url = `${FEDERATED_URL}/federated-auth/microsoft-login`;

      console.log('[SSO Microsoft] ====== REQUEST ======');
      console.log('[SSO Microsoft] URL:', url);
      console.log('[SSO Microsoft] Base URL (FEDERATED_URL):', FEDERATED_URL);
      console.log('[SSO Microsoft] Body:', JSON.stringify({ access_token: accessToken?.substring(0, 30) + '...', device_info }, null, 2));

      const response = await axios.post(url, { access_token: accessToken, device_info }, {
        headers: { 'Content-Type': 'application/json' }, timeout: 30000,
      });
      const data = response.data;

      console.log('[SSO Microsoft] ====== RESPONSE ======');
      console.log('[SSO Microsoft] Status:', response.status);
      console.log('[SSO Microsoft] Success:', data.success);
      console.log('[SSO Microsoft] User:', data.data?.user?.email);
      console.log('[SSO Microsoft] AccessToken:', data.data?.accessToken?.substring(0, 30) + '...');
      console.log('[SSO Microsoft] RefreshToken:', data.data?.refreshToken?.substring(0, 30) + '...');
      console.log('[SSO Microsoft] Tenant:', JSON.stringify(data.data?.tenant, null, 2));
      console.log('[SSO Microsoft] Backend URL:', data.data?.tenant?.backend_url);
      console.log('[SSO Microsoft] Full Response:', JSON.stringify(data, null, 2));

      if (!data.success || !data.data) throw new Error(data.message || 'Microsoft login failed');
      await setupSessionFromResponse(data.data, setAuth);
    } catch (err: any) {
      console.error('[SSO Microsoft] ====== ERROR ======');
      console.error('[SSO Microsoft] Message:', err?.response?.data?.message || err?.message);
      console.error('[SSO Microsoft] Status:', err?.response?.status);
      console.error('[SSO Microsoft] Response:', JSON.stringify(err?.response?.data, null, 2));
      setError(err?.response?.data?.message || err?.message || 'Microsoft login failed.');
    } finally {
      setIsLoading(false);
    }
  }, [setAuth]);

  // ---- Microsoft: start OAuth flow (opens WebView) ----

  const startMicrosoftSignIn = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const codeVerifier = randomBase64Url(64);
      const codeChallenge = pkceChallenge(codeVerifier);
      const state = randomBase64Url(32);

      const params = new URLSearchParams({
        client_id: MS_CLIENT_ID,
        response_type: 'code',
        redirect_uri: MS_REDIRECT_URI,
        scope: MS_SCOPES,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        prompt: 'select_account',
        response_mode: 'query',
      });
      const authorizeUrl = `${MS_AUTHORIZE_URL}?${params.toString()}`;
      console.log('[SSO] Opening Microsoft OAuth WebView...');

      // Show WebView and wait for the callback URL to be intercepted
      const code = await new Promise<string | null>((resolve) => {
        msAuthResolverRef.current = resolve;
        setMsAuthState({ visible: true, url: authorizeUrl, codeVerifier });
      });

      if (!code) {
        console.log('[SSO] Microsoft sign-in cancelled');
        setIsLoading(false);
        return;
      }

      console.log('[SSO Token Exchange] ====== REQUEST ======');
      console.log('[SSO Token Exchange] URL:', MS_TOKEN_URL);
      console.log('[SSO Token Exchange] Auth Code:', code?.substring(0, 20) + '...');
      console.log('[SSO Token Exchange] Redirect URI:', MS_REDIRECT_URI);

      // Exchange code for access_token using PKCE
      const tokenBody = new URLSearchParams({
        client_id: MS_CLIENT_ID,
        client_secret: 'gvN8Q~H9cdUiFTY75OjIL~PRWPA.UMHOJfVnycsW',
        grant_type: 'authorization_code',
        code,
        redirect_uri: MS_REDIRECT_URI,
        code_verifier: codeVerifier,
        scope: MS_SCOPES,
      });

      let tokenData: any;
      try {
        const tokenResponse = await axios.post(MS_TOKEN_URL, tokenBody.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        });
        tokenData = tokenResponse.data;

        console.log('[SSO Token Exchange] ====== RESPONSE ======');
        console.log('[SSO Token Exchange] Access Token:', tokenData.access_token?.substring(0, 30) + '...');
        console.log('[SSO Token Exchange] ID Token:', tokenData.id_token ? tokenData.id_token.substring(0, 30) + '...' : 'none');
        console.log('[SSO Token Exchange] Token Type:', tokenData.token_type);
        console.log('[SSO Token Exchange] Expires In:', tokenData.expires_in);
        console.log('[SSO Token Exchange] Scope:', tokenData.scope);
      } catch (tokenErr: any) {
        const msError = tokenErr?.response?.data;
        console.error('[SSO Token Exchange] ====== ERROR ======');
        console.error('[SSO Token Exchange] Status:', tokenErr?.response?.status);
        console.error('[SSO Token Exchange] Response:', JSON.stringify(msError, null, 2));
        throw new Error(msError?.error_description || msError?.error || 'Token exchange failed');
      }

      const { access_token } = tokenData;
      if (!access_token) throw new Error('No access_token from Microsoft');

      console.log('[SSO] Sending access_token to backend...');
      await exchangeMicrosoftToken(access_token);

    } catch (err: any) {
      console.error('[SSO] Microsoft sign-in error:', err);
      setError(err?.response?.data?.error_description || err?.message || 'Microsoft sign-in failed');
      setIsLoading(false);
    }
  }, [exchangeMicrosoftToken]);

  /**
   * Called by the WebView when it detects the callback URL.
   * Extracts the auth code and resolves the promise.
   */
  const handleMicrosoftWebViewNavigation = useCallback((url: string): boolean => {
    if (url.startsWith(MS_REDIRECT_URI)) {
      const code = extractParam(url, 'code');
      const errorCode = extractParam(url, 'error');

      setMsAuthState({ visible: false, url: '', codeVerifier: '' });

      if (errorCode) {
        const desc = extractParam(url, 'error_description');
        console.error('[SSO] Microsoft OAuth error:', errorCode, desc);
        msAuthResolverRef.current?.(null);
        setError(desc || `Microsoft error: ${errorCode}`);
        setIsLoading(false);
      } else if (code) {
        msAuthResolverRef.current?.(code);
      } else {
        msAuthResolverRef.current?.(null);
        setIsLoading(false);
      }
      return false; // block the WebView from loading this URL
    }
    return true; // allow all other URLs to load
  }, []);

  /** Called when user dismisses the WebView modal. */
  const handleMicrosoftWebViewClose = useCallback(() => {
    setMsAuthState({ visible: false, url: '', codeVerifier: '' });
    msAuthResolverRef.current?.(null);
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    startGoogleSignIn,
    startMicrosoftSignIn,
    isLoading,
    error,
    reset,
    // Microsoft WebView state — LoginScreen renders the WebView using these
    msAuthState,
    handleMicrosoftWebViewNavigation,
    handleMicrosoftWebViewClose,
  };
};

export default useSSOLogin;
