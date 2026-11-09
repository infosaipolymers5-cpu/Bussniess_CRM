/**
 * TopBar — Compact top header with context controls.
 * Height: 64px (h-16).
 */

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/app/providers/AuthProvider';
import { BusinessSelector } from './BusinessSelector';
import { LanguageSelector } from './LanguageSelector';
import { UserMenu } from './UserMenu';

export interface TopBarProps {
  onOpenMobileMenu?: () => void;
}

export function TopBar({ onOpenMobileMenu }: TopBarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const userName = user?.email?.split('@')[0] ?? 'User';

  return (
    <header
      role="banner"
      className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur transition-shadow md:px-6"
    >
      {/* Left: Mobile hamburger + greeting */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open menu"
            className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:hidden"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        <div className="hidden sm:block">
          <h1 className="text-sm font-semibold text-slate-800">
            {t('shell.greeting', { name: userName })}
          </h1>
        </div>
      </div>

      {/* Right: Business Selector, Language Selector, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3">
        <BusinessSelector />
        <LanguageSelector />
        <UserMenu />
      </div>
    </header>
  );
}

export default TopBar;
