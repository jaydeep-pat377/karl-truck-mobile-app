import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const supabaseUrl = 'https://lwplbyltqsfmfvsgmrjq.supabase.co';
const supabaseAnonKey = 'SUPABASE_KEY_REMOVED';

const supabaseServiceRoleKey = 'SUPABASE_SERVICE_KEY_REMOVED';

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
    console.log('Created new anonymous user ID:', newId);
    return newId;
  } catch (err) {
    console.error('Error getting anonymous user ID:', err);

    const fallbackId = generateUUID();
    anonymousUserId = fallbackId;
    return fallbackId;
  }
};

export const initializeSupabaseAuth = async (): Promise<{ userId: string } | null> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured');
    return null;
  }

  try {
    console.log('Initializing Supabase...');


    const userId = await getAnonymousUserId();

    isInitialized = true;
    console.log('Supabase initialized with user ID:', userId);

    return { userId };
  } catch (err) {
    console.error('Supabase init error:', err);
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

    console.log('App active, reconnecting Supabase realtime...');


    supabase.realtime.connect();
  } else if (state === 'background') {
    console.log('App going to background');
  }
});

supabase.realtime.connect();

export default supabase;
