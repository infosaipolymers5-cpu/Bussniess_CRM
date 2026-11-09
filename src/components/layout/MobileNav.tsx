/**
 * MobileNav — Bottom navigation bar for narrow screens (<768px).
 *
 * 5 primary touch items:
 * 1. Dashboard
 * 2. Customers
 * 3. Actions (Quick actions sheet)
 * 4. Reminders
 * 5. More (Full navigation drawer)
 */

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { isOwner } from '@/lib/permissions';
import clsx from 'clsx';

export function MobileNav() {
  const { t } = useTranslation();
  const { activeRole } = useBusiness();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const userIsOwner = isOwner(activeRole ?? undefined);

  const primaryItems = [
    { to: '/', labelKey: 'nav.dashboard', icon: '📊' },
    { to: '/customers', labelKey: 'nav.customers', icon: '👥' },
    { to: '/reminders', labelKey: 'nav.reminders', icon: '⏰' },
  ];

  const secondaryItems = [
    { to: '/groups', labelKey: 'nav.groups', icon: '🏷️', stage: 2 },
    { to: '/bills', labelKey: 'nav.bills', icon: '🧾', stage: 3 },
    { to: '/payments', labelKey: 'nav.payments', icon: '💳', stage: 3 },
    { to: '/khate-utara', labelKey: 'nav.khateUtara', icon: '📑', stage: 3 },
    { to: '/messages', labelKey: 'nav.messages', icon: '💬', stage: 7 },
    { to: '/campaigns', labelKey: 'nav.campaigns', icon: '📢', stage: 7 },
    {
      to: '/suppliers',
      labelKey: 'nav.suppliers',
      icon: '🏭',
      stage: 4,
      ownerOnly: true,
    },
    {
      to: '/purchase-orders',
      labelKey: 'nav.purchaseOrders',
      icon: '📦',
      stage: 4,
      ownerOnly: true,
    },
    { to: '/expenses', labelKey: 'nav.expenses', icon: '📉', stage: 5, ownerOnly: true },
    {
      to: '/profit-dashboard',
      labelKey: 'nav.profitDashboard',
      icon: '💰',
      stage: 5,
      ownerOnly: true,
    },
    { to: '/item-search', labelKey: 'nav.itemSearch', icon: '🔍' },
    { to: '/posters', labelKey: 'nav.posters', icon: '🎨' },
    { to: '/digital-cards', labelKey: 'nav.digitalCards', icon: '📇' },
    { to: '/delivery-trips', labelKey: 'nav.deliveryTrips', icon: '🚚' },
    { to: '/reports', labelKey: 'nav.reports', icon: '📈' },
    { to: '/staff', labelKey: 'nav.staff', icon: '👤', ownerOnly: true },
    { to: '/backups', labelKey: 'nav.backups', icon: '💾', ownerOnly: true },
    { to: '/audit', labelKey: 'nav.audit', icon: '🛡️', ownerOnly: true },
    { to: '/settings', labelKey: 'nav.settings', icon: '⚙️' },
  ];

  const visibleSecondary = secondaryItems.filter(
    (item) => !item.ownerOnly || userIsOwner,
  );

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      >
        {primaryItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex min-h-touch flex-1 flex-col items-center justify-center py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'font-bold text-brand-600'
                  : 'text-slate-500 hover:text-slate-900',
              )
            }
          >
            <span className="text-lg" aria-hidden="true">
              {item.icon}
            </span>
            <span className="max-w-[64px] truncate">{t(item.labelKey)}</span>
          </NavLink>
        ))}

        {/* More button */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          aria-expanded={isMoreOpen}
          aria-label={t('nav.more')}
          className="flex min-h-touch flex-1 flex-col items-center justify-center py-1 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <span className="text-lg" aria-hidden="true">
            ☰
          </span>
          <span>{t('nav.more')}</span>
        </button>
      </nav>

      {/* Slide-over sheet for "More" */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />

          <div className="relative ml-auto flex h-full w-4/5 max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="text-base font-bold text-slate-900">{t('nav.more')}</h2>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="flex min-h-touch min-w-touch items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
                aria-label={t('common.close')}
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              {visibleSecondary.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMoreOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex min-h-touch items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'text-slate-700 hover:bg-slate-100',
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{t(item.labelKey)}</span>
                  </div>
                  {item.stage && item.stage > 1 && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-400">
                      S{item.stage}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileNav;
