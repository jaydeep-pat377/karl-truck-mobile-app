/**
 * i18n Configuration
 * Internationalization setup for multi-language support
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from './en.json';
import es from './es.json';
import frCA from './fr-CA.json';

<<<<<<< Updated upstream
// Supported languages
=======
const LANGUAGE_STORAGE_KEY = 'language';

>>>>>>> Stashed changes
export const supportedLanguages = {
  en: { name: 'English', nativeName: 'English' },
  es: { name: 'Spanish', nativeName: 'Español' },
  'fr-CA': { name: 'French (Canadian)', nativeName: 'Français (Canada)' },
} as const;

export type SupportedLanguage = keyof typeof supportedLanguages;

// Resources object for i18next
const resources = {
  en: { translation: en },
  es: { translation: es },
  'fr-CA': { translation: frCA },
};

// Get device language
const getDeviceLanguage = (): SupportedLanguage => {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const deviceLang = locales[0].languageTag;

      // Check for exact match first
      if (deviceLang in supportedLanguages) {
        return deviceLang as SupportedLanguage;
      }

      // Check for language code match (e.g., 'es-MX' -> 'es')
      const langCode = deviceLang.split('-')[0];
      if (langCode in supportedLanguages) {
        return langCode as SupportedLanguage;
      }

      // Special case for French variants
      if (langCode === 'fr') {
        return 'fr-CA';
      }
    }
  } catch (error) {
    console.warn('Failed to get device language:', error);
  }

  return 'en'; // Default to English
};

<<<<<<< Updated upstream
// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // React-i18next options
    react: {
      useSuspense: false,
    },

    // Debug mode (disable in production)
    debug: __DEV__,

    // Namespaces
    defaultNS: 'translation',
    ns: ['translation'],

    // Key separator for nested keys
    keySeparator: '.',

    // Return empty string for missing keys in production
    returnEmptyString: false,
    returnNull: false,
  });
=======
const resolveInitialLanguage = async (): Promise<SupportedLanguage> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && saved in supportedLanguages) {
      return saved as SupportedLanguage;
    }
  } catch (error) {
    console.warn('Failed to read saved language:', error);
  }
  return getDeviceLanguage();
};

export const i18nReady: Promise<void> = (async () => {
  const lng = await resolveInitialLanguage();
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng,
      fallbackLng: 'en',

      interpolation: {
        escapeValue: false,
      },

      react: {
        useSuspense: false,
      },

      debug: __DEV__,

      defaultNS: 'translation',
      ns: ['translation'],

      keySeparator: '.',

      returnEmptyString: false,
      returnNull: false,
    });
})();
>>>>>>> Stashed changes

// Function to change language
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to persist language:', error);
  }
  await i18n.changeLanguage(language);
};

<<<<<<< Updated upstream
// Function to get current language
=======
export const restoreSavedLanguage = async (): Promise<void> => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && saved in supportedLanguages && saved !== i18n.language) {
      await i18n.changeLanguage(saved);
    }
  } catch (error) {
    console.warn('Failed to restore saved language:', error);
  }
};

>>>>>>> Stashed changes
export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.language as SupportedLanguage;
};

// Function to get all supported languages
export const getSupportedLanguages = () => {
  return Object.entries(supportedLanguages).map(([code, names]) => ({
    code: code as SupportedLanguage,
    ...names,
  }));
};

export default i18n;
