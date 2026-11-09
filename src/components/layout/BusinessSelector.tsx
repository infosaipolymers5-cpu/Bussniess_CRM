/**
 * BusinessSelector — Switch active business context.
 * Accessible dropdown with keyboard support.
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import clsx from 'clsx';

export function BusinessSelector() {
  const { t } = useTranslation();
  const { businesses, activeBusiness, setActiveBusiness, loading } = useBusiness();
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

  if (loading) {
    return (
      <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-200" aria-busy="true" />
    );
  }

  if (businesses.length === 0) {
    return (
      <span className="text-sm font-medium text-slate-500">
        {t('shell.selectBusiness')}
      </span>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('shell.switchBusiness')}
        className={clsx(
          'inline-flex min-h-touch items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        )}
      >
        <span
          className="inline-block h-2.5 w-2.5 rounded-full bg-brand-600"
          aria-hidden="true"
        />
        <span className="max-w-[140px] truncate md:max-w-[200px]">
          {activeBusiness?.name ?? t('shell.selectBusiness')}
        </span>
        <span
          className={clsx(
            'rounded px-1.5 py-0.5 text-xs font-semibold uppercase',
            activeBusiness?.kind === 'cattle_feed'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-cyan-100 text-cyan-800',
          )}
        >
          {activeBusiness?.kind === 'cattle_feed'
            ? t('business.cattleFeed')
            : t('business.pvc')}
        </span>
        <svg
          className={clsx(
            'h-4 w-4 text-slate-400 transition-transform',
            isOpen && 'rotate-180',
          )}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label={t('shell.selectBusiness')}
          className="absolute right-0 z-50 mt-1 max-h-60 w-64 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          {businesses.map((biz) => {
            const isSelected = biz.id === activeBusiness?.id;
            return (
              <li
                key={biz.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setActiveBusiness(biz.id);
                  setIsOpen(false);
                }}
                className={clsx(
                  'flex cursor-pointer items-center justify-between px-3 py-2 text-sm',
                  isSelected
                    ? 'bg-brand-50 font-semibold text-brand-900'
                    : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                <div className="flex flex-col">
                  <span>{biz.name}</span>
                  <span className="text-xs text-slate-400">
                    {biz.kind === 'cattle_feed'
                      ? t('business.cattleFeed')
                      : t('business.pvc')}
                  </span>
                </div>
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

export default BusinessSelector;
