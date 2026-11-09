/**
 * UserMenu — Profile and sign out dropdown.
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/AuthProvider';
import { useBusiness } from '@/app/providers/BusinessProvider';
import clsx from 'clsx';

export function UserMenu() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { activeRole } = useBusiness();
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

  const displayName = user?.email?.split('@')[0] ?? 'User';
  const roleLabel = activeRole ? t(`business.${activeRole}`) : '';

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('shell.profile')}
        className={clsx(
          'inline-flex min-h-touch items-center gap-2 rounded-lg p-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        )}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
          aria-hidden="true"
        >
          {displayName.slice(0, 2).toUpperCase()}
        </div>
        <div className="hidden text-left md:block">
          <p className="text-xs font-semibold leading-tight text-slate-800">
            {displayName}
          </p>
          {roleLabel && (
            <p className="text-[10px] leading-tight text-slate-500">{roleLabel}</p>
          )}
        </div>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 z-50 mt-1 w-48 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          <div className="border-b border-slate-100 px-4 py-2">
            <p className="truncate text-xs font-medium text-slate-900">{user?.email}</p>
            {roleLabel && (
              <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                {roleLabel}
              </span>
            )}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              void signOut();
            }}
            className="flex min-h-touch w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
          >
            {t('auth.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

export default UserMenu;
