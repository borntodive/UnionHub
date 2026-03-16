import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import en from './en.json';
import it from './it.json';

const LANGUAGE_KEY = '@app_language';

const resources = {
  en: { translation: en },
  it: { translation: it },
};

// Get stored language or default to English
const getStoredLanguage = async (): Promise<string> => {
  try {
    const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLang) return storedLang;
    
    // Check device locale
    const deviceLocale = Localization.locale;
    if (deviceLocale.startsWith('it')) return 'it';
    return 'en';
  } catch (error) {
    return 'en';
  }
};

// Save language preference
export const setLanguage = async (lang: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  } catch (error) {
    console.error('Failed to save language:', error);
  }
};

// Get current language
export const getLanguage = (): string => {
  return i18n.language || 'en';
};

// Initialize i18n
const initI18n = async () => {
  const storedLang = await getStoredLanguage();

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: storedLang,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
};

initI18n();

export default i18n;
