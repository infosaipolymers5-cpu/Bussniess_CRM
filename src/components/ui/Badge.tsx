/**
 * Badge — Small label with semantic variants.
 *
 * - Uses text AND icon, never colour alone
 * - Accessible contrast ratios
 */

import type { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeVariant =
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-brand-50 text-brand-700',
  secondary: 'bg-gray-100 text-gray-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
};

export function Badge({ variant = 'default', icon, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {icon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

export default Badge;
