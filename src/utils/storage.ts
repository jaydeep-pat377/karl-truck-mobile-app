import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  REMEMBER_ME: 'rememberMe',
} as const;

export const storageUtils = {

  setString: async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  },
  getString: async (key: string) => {
    return AsyncStorage.getItem(key);
  },


  setObject: async <T>(key: string, value: T) => {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  getObject: async <T>(key: string): Promise<T | null> => {
    const value = await AsyncStorage.getItem(key);
    if (value) {
      try {
        return JSON.parse(value) as T;
      } catch {
        return null;
      }
    }
    return null;
  },


  remove: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },
  removeMultiple: async (keys: string[]) => {
    await AsyncStorage.multiRemove(keys);
  },


  clearAll: async () => {
    await AsyncStorage.clear();
  },


  getAllKeys: async () => {
    return AsyncStorage.getAllKeys();
  },
};

export default AsyncStorage;
