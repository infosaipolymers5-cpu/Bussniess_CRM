/**
 * LocaleProvider — manages the i18n language state.
 */

import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  setLocale as setI18nLocale,
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  type SupportedLocale,
} from '@/lib/i18n';

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  supportedLocales: readonly SupportedLocale[];
  localeLabels: Record<SupportedLocale, string>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  const setLocale = useCallback((locale: SupportedLocale) => {
    setI18nLocale(locale);
  }, []);

  return (
    <LocaleContext.Provider
      value={{
        locale: (i18n.language as SupportedLocale) || 'en',
        setLocale,
        supportedLocales: SUPPORTED_LOCALES,
        localeLabels: LOCALE_LABELS,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
}
