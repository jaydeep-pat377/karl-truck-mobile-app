import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '@env';

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

const supabaseServiceRoleKey = SUPABASE_SERVICE_ROLE_KEY;

const ANON_USER_ID_KEY = '@supabase_anon_user_id';

export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.length > 0 && supabaseAnonKey.length > 0);
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

let isInitialized = false;
let anonymousUserId: string | null = null;

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
    supabase.realtime.connect();
  } else if (state === 'background') {
    console.log('App going to background');
  }
});

supabase.realtime.connect();

export default supabase;
