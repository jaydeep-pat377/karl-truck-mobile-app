import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

// Simple UUID generator (RFC4122 compliant)
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Supabase configuration
const supabaseUrl = 'https://lwplbyltqsfmfvsgmrjq.supabase.co';
const supabaseAnonKey = 'SUPABASE_KEY_REMOVED';

// Service role key - bypasses RLS (use for chat operations)
const supabaseServiceRoleKey = 'SUPABASE_SERVICE_KEY_REMOVED';

// Storage key for anonymous user ID
const ANON_USER_ID_KEY = '@supabase_anon_user_id';

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.length > 0 && supabaseAnonKey.length > 0);
};

// Create Supabase client with anon key (for realtime)
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

// Create Supabase admin client with service role key (bypasses RLS)
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Track initialization state
let isInitialized = false;
let anonymousUserId: string | null = null;

// Get or create anonymous user ID (stored locally)
export const getAnonymousUserId = async (): Promise<string> => {
  if (anonymousUserId) {
    return anonymousUserId;
  }

  try {
    // Try to get existing ID from storage
    const storedId = await AsyncStorage.getItem(ANON_USER_ID_KEY);
    if (storedId) {
      anonymousUserId = storedId;
      return storedId;
    }

    // Generate new UUID
    const newId = generateUUID();
    await AsyncStorage.setItem(ANON_USER_ID_KEY, newId);
    anonymousUserId = newId;
    console.log('Created new anonymous user ID:', newId);
    return newId;
  } catch (err) {
    console.error('Error getting anonymous user ID:', err);
    // Fallback to a generated ID
    const fallbackId = generateUUID();
    anonymousUserId = fallbackId;
    return fallbackId;
  }
};

// Initialize Supabase (no auth required - uses anon key)
export const initializeSupabaseAuth = async (): Promise<{ userId: string } | null> => {
  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured');
    return null;
  }

  try {
    console.log('Initializing Supabase...');

    // Get or create anonymous user ID
    const userId = await getAnonymousUserId();

    isInitialized = true;
    console.log('Supabase initialized with user ID:', userId);

    return { userId };
  } catch (err) {
    console.error('Supabase init error:', err);
    return null;
  }
};

// Ensure initialized before making requests
export const ensureAuthenticated = async (): Promise<boolean> => {
  if (!isInitialized) {
    await initializeSupabaseAuth();
  }
  return isInitialized;
};

// Get current user ID (for chat sender_id)
export const getCurrentUserId = async (): Promise<string | null> => {
  await ensureAuthenticated();
  return anonymousUserId;
};

// Check if currently initialized
export const isAuthenticated = (): boolean => {
  return isInitialized;
};

// Handle app state changes for realtime
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'active' && isInitialized) {
    // Reconnect realtime when app becomes active
    console.log('App active, reconnecting Supabase realtime...');

    // Force reconnect all channels
    supabase.realtime.connect();
  } else if (state === 'background') {
    console.log('App going to background');
  }
});

// Connect realtime on module load
supabase.realtime.connect();

export default supabase;
