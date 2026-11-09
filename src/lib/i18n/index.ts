/**
 * i18n configuration — English and Marathi.
 * All user-visible production strings must come from translation resources.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import mr from './locales/mr.json';

export const SUPPORTED_LOCALES = ['en', 'mr'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  mr: 'मराठी',
};

const savedLocale = (() => {
  try {
    return localStorage.getItem('rushi-crm-locale') ?? 'en';
  } catch {
    return 'en';
  }
})();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    mr: { translation: mr },
  },
  lng: savedLocale,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React handles escaping
  },
  returnNull: false,
});

/** Persist locale choice */
export function setLocale(locale: SupportedLocale): void {
  void i18n.changeLanguage(locale);
  try {
    localStorage.setItem('rushi-crm-locale', locale);
  } catch {
    // Storage unavailable — skip persistence
  }
  document.documentElement.lang = locale;
}

export default i18n;
