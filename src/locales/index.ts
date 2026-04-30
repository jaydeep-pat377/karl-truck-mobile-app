

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import es from './es.json';
import frCA from './fr-CA.json';

export const supportedLanguages = {
  en: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  es: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  'fr-CA': { name: 'French (Canadian)', nativeName: 'Français (Canada)', flag: '🇨🇦' },
} as const;

export type SupportedLanguage = keyof typeof supportedLanguages;

const LANGUAGE_STORAGE_KEY = '@app_language';

const resources = {
  en: { translation: en },
  es: { translation: es },
  'fr-CA': { translation: frCA },
};

const getDeviceLanguage = (): SupportedLanguage => {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const deviceLang = locales[0].languageTag;

      if (deviceLang in supportedLanguages) {
        return deviceLang as SupportedLanguage;
      }

      const langCode = deviceLang.split('-')[0];
      if (langCode in supportedLanguages) {
        return langCode as SupportedLanguage;
      }

      if (langCode === 'fr') {
        return 'fr-CA';
      }
    }
  } catch (error) {
    console.warn('Failed to get device language:', error);
  }

  return 'en';
};

const readSavedLanguage = async (): Promise<SupportedLanguage> => {
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

// Start the AsyncStorage read immediately at module load time (parallel to i18n.init).
// App.tsx awaits this promise before rendering so the very first paint uses the
// persisted language and we never flash the device language.
export const i18nReady: Promise<void> = readSavedLanguage().then(async (lang) => {
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: lang,
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
});

// Kept for backwards compatibility — App.tsx awaits i18nReady directly now.
export const loadSavedLanguage = async (): Promise<void> => {
  await i18nReady;
};

export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(language);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch (error) {
    console.warn('Failed to persist language:', error);
  }
};

export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.language as SupportedLanguage) || 'en';
};

export const getSupportedLanguages = () => {
  return Object.entries(supportedLanguages).map(([code, info]) => ({
    code: code as SupportedLanguage,
    ...info,
  }));
};

export default i18n;
