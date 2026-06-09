import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '@env';
import { STORAGE_KEYS } from '../../utils/storage';

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const ANON_USER_ID_KEY = '@supabase_anon_user_id';

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;
let _activeUrl: string | null = null;
let _activeAnonKey: string | null = null;
let _activeServiceKey: string | null = null;
let isInitialized = false;
let anonymousUserId: string | null = null;

const buildAnonClient = (url: string, key: string): SupabaseClient =>
  createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  });

const buildAdminClient = (url: string, key: string): SupabaseClient =>
  createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  });

const bootstrapFromEnv = () => {
  _activeUrl = SUPABASE_URL;
  _activeAnonKey = SUPABASE_ANON_KEY;
  _activeServiceKey = SUPABASE_SERVICE_ROLE_KEY;
  _supabase = buildAnonClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  _supabaseAdmin = buildAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
};

bootstrapFromEnv();

const makeProxy = (getClient: () => SupabaseClient): SupabaseClient =>
  new Proxy({} as SupabaseClient, {
    get: (_target, prop, receiver) => {
      const client = getClient();
      const value = Reflect.get(client, prop, receiver);
      return typeof value === 'function' ? value.bind(client) : value;
    },
  });

export const supabase: SupabaseClient = makeProxy(() => {
  if (!_supabase) bootstrapFromEnv();
  return _supabase!;
});

export const supabaseAdmin: SupabaseClient = makeProxy(() => {
  if (!_supabaseAdmin) bootstrapFromEnv();
  return _supabaseAdmin!;
});

export const isSupabaseConfigured = (): boolean => {
  return !!(_activeUrl && _activeAnonKey && _activeUrl.length > 0 && _activeAnonKey.length > 0);
};

/**
 * Swap the underlying Supabase clients to use tenant-specific credentials.
 * Tears down channels on the previous clients before rebuilding.
 */
export const initializeTenantSupabase = (
  url: string,
  anonKey: string,
  serviceRoleKey: string,
): void => {
  if (!url || !anonKey) {
    console.warn('[supabaseClient] initializeTenantSupabase called with missing url/anonKey — ignoring');
    return;
  }
  if (
    url === _activeUrl &&
    anonKey === _activeAnonKey &&
    serviceRoleKey === _activeServiceKey
  ) {
    return;
  }
  try {
    if (_supabase) {
      _supabase.removeAllChannels();
      _supabase.realtime.disconnect();
    }
    if (_supabaseAdmin) {
      _supabaseAdmin.removeAllChannels();
    }
  } catch (err: any) {
    console.warn('[supabaseClient] teardown during swap failed:', err?.message);
  }
  _activeUrl = url;
  _activeAnonKey = anonKey;
  _activeServiceKey = serviceRoleKey;
  _supabase = buildAnonClient(url, anonKey);
  _supabaseAdmin = serviceRoleKey ? buildAdminClient(url, serviceRoleKey) : buildAdminClient(url, anonKey);
  _supabase.realtime.connect();
  _supabaseAdmin.realtime.connect();
  isInitialized = true;
};

/**
 * Restore tenant Supabase clients from persisted credentials (called at app launch).
 * Falls back to .env defaults if no persisted credentials exist.
 */
export const restoreTenantSupabaseFromStorage = async (): Promise<boolean> => {
  try {
    const [url, anonKey, serviceKey] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.SUPABASE_URL),
      AsyncStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY),
      AsyncStorage.getItem(STORAGE_KEYS.SUPABASE_SERVICE_ROLE_KEY),
    ]);
    if (url && anonKey) {
      initializeTenantSupabase(url, anonKey, serviceKey || anonKey);
      return true;
    }
  } catch (err: any) {
    console.warn('[supabaseClient] restoreTenantSupabaseFromStorage failed:', err?.message);
  }
  return false;
};

/**
 * Tear down channels, disconnect realtime, and reset clients to .env defaults.
 * Call from logout.
 */
export const tearDownSupabase = (): void => {
  try {
    if (_supabase) {
      _supabase.removeAllChannels();
      _supabase.realtime.disconnect();
    }
    if (_supabaseAdmin) {
      _supabaseAdmin.removeAllChannels();
    }
  } catch (err: any) {
    console.warn('[supabaseClient] tearDownSupabase failed:', err?.message);
  }
  isInitialized = false;
  bootstrapFromEnv();
};

export const getAnonymousUserId = async (): Promise<string> => {
  if (anonymousUserId) {
    return anonymousUserId;
  }

  try {
    const storedId = await AsyncStorage.getItem(ANON_USER_ID_KEY);
    if (storedId) {
      anonymousUserId = storedId;
      return storedId;
    }

    const newId = generateUUID();
    await AsyncStorage.setItem(ANON_USER_ID_KEY, newId);
    anonymousUserId = newId;
    return newId;
  } catch (err) {
    const fallbackId = generateUUID();
    anonymousUserId = fallbackId;
    return fallbackId;
  }
};

export const initializeSupabaseAuth = async (): Promise<{ userId: string } | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const userId = await getAnonymousUserId();
    isInitialized = true;
    return { userId };
  } catch (err) {
    return null;
  }
};

export const ensureAuthenticated = async (): Promise<boolean> => {
  if (!isInitialized) {
    await initializeSupabaseAuth();
  }
  return isInitialized;
};

export const getCurrentUserId = async (): Promise<string | null> => {
  await ensureAuthenticated();
  return anonymousUserId;
};

export const isAuthenticated = (): boolean => {
  return isInitialized;
};

AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'active' && isInitialized) {
    _supabase?.realtime.connect();
    _supabaseAdmin?.realtime.connect();
  }
});

// Cast away the `null` control-flow narrowing here: _supabase is only assigned
// inside the init functions (called later), so at module-eval TS narrows it to
// null. The optional chain keeps this null-safe at runtime.
(_supabase as SupabaseClient | null)?.realtime.connect();

export default supabase;
