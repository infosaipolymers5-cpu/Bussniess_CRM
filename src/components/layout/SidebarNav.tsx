/**
 * SidebarNav — Persistent desktop sidebar navigation (260px).
 *
 * Permission-aware navigation hierarchy with explicit stage indicators:
 * - Active Stage 1 routes: Dashboard, Staff
 * - Deferred routes tagged with upcoming stage indicators
 */

import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { useConnection } from '@/app/providers/ConnectionProvider';
import { isOwner } from '@/lib/permissions';
import clsx from 'clsx';

interface NavItem {
  to: string;
  labelKey: string;
  icon: string;
  stage?: number;
  ownerOnly?: boolean;
  cattleFeedOnly?: boolean;
}

interface NavSection {
  titleKey?: string;
  items: NavItem[];
}

export function SidebarNav() {
  const { t } = useTranslation();
  const { activeBusiness, activeRole } = useBusiness();
  const { isOnline } = useConnection();

  const userIsOwner = isOwner(activeRole ?? undefined);
  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';

  const sections: NavSection[] = [
    {
      items: [
        { to: '/', labelKey: 'nav.dashboard', icon: '📊' },
        { to: '/customers', labelKey: 'nav.customers', icon: '👥', stage: 2 },
        { to: '/groups', labelKey: 'nav.groups', icon: '🏷️', stage: 2 },
      ],
    },
    {
      titleKey: 'nav.cattleFeed',
      items: [
        {
          to: '/bills',
          labelKey: 'nav.bills',
          icon: '🧾',
          stage: 3,
          cattleFeedOnly: true,
        },
        {
          to: '/payments',
          labelKey: 'nav.payments',
          icon: '💳',
          stage: 3,
          cattleFeedOnly: true,
        },
        {
          to: '/khate-utara',
          labelKey: 'nav.khateUtara',
          icon: '📑',
          stage: 3,
          cattleFeedOnly: true,
        },
        {
          to: '/products',
          labelKey: 'nav.products',
          icon: '📦',
          stage: 3,
          cattleFeedOnly: true,
        },
      ],
    },
    {
      items: [
        { to: '/reminders', labelKey: 'nav.reminders', icon: '⏰', stage: 7 },
        {
          to: '/material-alerts',
          labelKey: 'nav.feedAlerts',
          icon: '🌾',
          stage: 7,
          cattleFeedOnly: true,
        },
        { to: '/messages', labelKey: 'nav.messages', icon: '💬', stage: 7 },
        { to: '/campaigns', labelKey: 'nav.campaigns', icon: '📢', stage: 7 },
      ],
    },
    {
      titleKey: 'nav.suppliers',
      items: [
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
        {
          to: '/supplier-accounts',
          labelKey: 'nav.supplierAccounts',
          icon: '💼',
          stage: 4,
          ownerOnly: true,
        },
        {
          to: '/purchase-history',
          labelKey: 'nav.purchaseHistory',
          icon: '📜',
          stage: 4,
          ownerOnly: true,
        },
        {
          to: '/expenses',
          labelKey: 'nav.expenses',
          icon: '📉',
          stage: 5,
          ownerOnly: true,
        },
        {
          to: '/profit-dashboard',
          labelKey: 'nav.profitDashboard',
          icon: '💰',
          stage: 5,
          ownerOnly: true,
        },
      ],
    },
    {
      titleKey: 'nav.pvcMarketing',
      items: [
        { to: '/item-search', labelKey: 'nav.itemSearch', icon: '🔍' },
        { to: '/posters', labelKey: 'nav.posters', icon: '🎨' },
        { to: '/digital-cards', labelKey: 'nav.digitalCards', icon: '📇' },
        { to: '/brands', labelKey: 'nav.brands', icon: '✨' },
      ],
    },
    {
      titleKey: 'nav.reports',
      items: [
        { to: '/delivery-trips', labelKey: 'nav.deliveryTrips', icon: '🚚' },
        { to: '/reports', labelKey: 'nav.reports', icon: '📈' },
      ],
    },
    {
      titleKey: 'nav.settings',
      items: [
        { to: '/staff', labelKey: 'nav.staff', icon: '👤', ownerOnly: true },
        { to: '/backups', labelKey: 'nav.backups', icon: '💾', ownerOnly: true },
        { to: '/audit', labelKey: 'nav.audit', icon: '🛡️', ownerOnly: true },
        { to: '/settings', labelKey: 'nav.settings', icon: '⚙️' },
      ],
    },
  ];

  return (
    <aside
      className="sticky top-0 z-30 hidden h-screen w-[260px] flex-col border-r border-slate-200 bg-white shadow-sidebar md:flex"
      aria-label="Sidebar Navigation"
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white shadow-sm"
          aria-hidden="true"
        >
          RC
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-bold tracking-tight text-slate-900">
            {t('common.appName')}
          </span>
          <span className="truncate text-[11px] text-slate-500">
            {activeBusiness?.name ?? 'Platform'}
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4" role="navigation">
        {sections.map((section, idx) => {
          const visibleItems = section.items.filter((item) => {
            if (item.ownerOnly && !userIsOwner) return false;
            if (item.cattleFeedOnly && !isCattleFeed && !userIsOwner) return false;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              {section.titleKey && (
                <div className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {t(section.titleKey)}
                </div>
              )}
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'flex min-h-touch items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                      isActive
                        ? 'bg-brand-50 font-semibold text-brand-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                    )
                  }
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-base" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="truncate">{t(item.labelKey)}</span>
                  </div>
                  {item.stage && item.stage > 1 && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-400">
                      S{item.stage}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer Status & Help */}
      <div className="space-y-2 border-t border-slate-200 p-3 text-xs text-slate-500">
        <div className="flex items-center gap-2 px-2 py-1">
          <span
            className={clsx(
              'h-2 w-2 rounded-full',
              isOnline ? 'bg-green-500' : 'bg-amber-500',
            )}
            aria-hidden="true"
          />
          <span>
            {isOnline ? t('shell.connectionOnline') : t('shell.connectionOffline')}
          </span>
        </div>
      </div>
    </aside>
  );
}

export default SidebarNav;
