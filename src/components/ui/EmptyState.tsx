/**
 * EmptyState — placeholder when no data exists.
 */

import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon = '📋',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-card border-2 border-dashed border-slate-200 p-8 text-center',
        className,
      )}
    >
      <span className="mb-3 text-4xl" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
