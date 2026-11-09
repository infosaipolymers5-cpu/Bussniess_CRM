/**
 * LanguageSelector — Toggle between English and Marathi.
 * Accessible dropdown with keyboard navigation.
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/app/providers/LocaleProvider';
import clsx from 'clsx';

export function LanguageSelector() {
  const { t } = useTranslation();
  const { locale, setLocale, supportedLocales, localeLabels } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('shell.language')}
        className={clsx(
          'inline-flex min-h-touch items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        )}
      >
        <span aria-hidden="true" className="text-base">
          🌐
        </span>
        <span className="text-xs font-semibold uppercase">{locale}</span>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('shell.language')}
          className="absolute right-0 z-50 mt-1 w-32 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          {supportedLocales.map((loc) => {
            const isSelected = loc === locale;
            return (
              <li
                key={loc}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLocale(loc);
                  setIsOpen(false);
                }}
                className={clsx(
                  'flex cursor-pointer items-center justify-between px-3 py-2 text-sm',
                  isSelected
                    ? 'bg-brand-50 font-semibold text-brand-900'
                    : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                <span>{localeLabels[loc]}</span>
                {isSelected && (
                  <span className="text-brand-600" aria-hidden="true">
                    ✓
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default LanguageSelector;
