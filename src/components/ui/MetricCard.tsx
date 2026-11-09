/**
 * MetricCard — dashboard metric card.
 * Uses design tokens: rounded-card, shadow-card.
 * Shows loading skeleton matching final geometry.
 */

import clsx from 'clsx';

export interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
  icon?: string;
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon,
  loading = false,
  className,
}: MetricCardProps) {
  if (loading) {
    return (
      <div
        className={clsx(
          'animate-pulse rounded-card border border-slate-200 bg-white p-5 shadow-card',
          className,
        )}
        aria-busy="true"
      >
        <div className="mb-3 h-4 w-24 rounded bg-slate-200" />
        <div className="mb-2 h-8 w-32 rounded bg-slate-200" />
        {subtitle && <div className="h-3 w-20 rounded bg-slate-100" />}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'rounded-card border border-slate-200 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover',
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {icon && (
          <span className="text-xl" aria-hidden="true">
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

export default MetricCard;
