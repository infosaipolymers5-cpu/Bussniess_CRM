/**
 * AppShell — Main responsive application layout shell.
 *
 * Desktop: SidebarNav + TopBar + Main Content.
 * Mobile: TopBar + Main Content + MobileNav bottom bar.
 * PWA: Service worker update prompt and offline banner.
 */

import { useState, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SidebarNav } from './SidebarNav';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { registerServiceWorker, applyUpdate, type PwaUpdateState } from '@/lib/pwa';
import clsx from 'clsx';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pwaState, setPwaState] = useState<PwaUpdateState>({
    needRefresh: false,
    offlineReady: false,
  });

  useEffect(() => {
    registerServiceWorker((state) => {
      setPwaState(state);
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Offline Banner */}
      <OfflineBanner />

      {/* PWA Update Banner */}
      {pwaState.needRefresh && (
        <aside
          aria-label="PWA Update Available"
          className="flex items-center justify-center gap-3 bg-brand-700 px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm"
        >
          <span>{t('shell.updateAvailable')}</span>
          <button
            type="button"
            onClick={() => void applyUpdate()}
            className="min-h-touch rounded bg-white px-3 py-1 text-xs font-bold text-brand-700 shadow-sm hover:bg-brand-50"
          >
            {t('shell.updateNow')}
          </button>
        </aside>
      )}

      <div className="flex flex-1">
        {/* Desktop Persistent Sidebar */}
        <SidebarNav />

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 flex md:hidden"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="relative flex w-4/5 max-w-xs flex-col bg-white shadow-2xl">
              <SidebarNav />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden pb-16 md:pb-0">
          <TopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

          <main
            role="main"
            className={clsx(
              'flex-1 overflow-y-auto px-4 py-6 md:px-8',
              'mx-auto w-full max-w-content',
            )}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}

export default AppShell;
