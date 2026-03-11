

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';

import en from './en.json';
import es from './es.json';
import frCA from './fr-CA.json';

export const supportedLanguages = {
  en: { name: 'English', nativeName: 'English' },
  es: { name: 'Spanish', nativeName: 'Español' },
  'fr-CA': { name: 'French (Canadian)', nativeName: 'Français (Canada)' },
} as const;

export type SupportedLanguage = keyof typeof supportedLanguages;

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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
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

export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(language);
};

export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.language as SupportedLanguage;
};

export const getSupportedLanguages = () => {
  return Object.entries(supportedLanguages).map(([code, names]) => ({
    code: code as SupportedLanguage,
    ...names,
  }));
};

export default i18n;
