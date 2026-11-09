/**
 * StatusBadge — Specialized badge for business statuses.
 * Shows text + icon + semantic color, never color alone.
 */

import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export type StatusType =
  'paid' | 'overdue' | 'pending' | 'failed' | 'warning' | 'cancelled' | 'draft';

interface StatusConfig {
  icon: string;
  className: string;
  translationKey: string;
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  paid: {
    icon: '✓',
    className: 'bg-green-50 text-green-700 border-green-200',
    translationKey: 'status.paid',
  },
  overdue: {
    icon: '!',
    className: 'bg-red-50 text-red-700 border-red-200 font-semibold',
    translationKey: 'status.overdue',
  },
  pending: {
    icon: '⏳',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    translationKey: 'status.pending',
  },
  failed: {
    icon: '✕',
    className: 'bg-red-100 text-red-800 border-red-300 font-semibold',
    translationKey: 'status.failed',
  },
  warning: {
    icon: '⚠',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    translationKey: 'status.warning',
  },
  cancelled: {
    icon: '⊘',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    translationKey: 'status.cancelled',
  },
  draft: {
    icon: '✎',
    className: 'bg-slate-50 text-slate-600 border-slate-200',
    translationKey: 'status.draft',
  },
};

export interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfigs[status];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs',
        config.className,
        className,
      )}
    >
      <span aria-hidden="true" className="text-xs">
        {config.icon}
      </span>
      <span>{t(config.translationKey)}</span>
    </span>
  );
}

export default StatusBadge;
