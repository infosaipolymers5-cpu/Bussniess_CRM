/**
 * LoadingSpinner — Accessible loading indicator.
 *
 * - role="status" for assistive technology
 * - sr-only text announces loading state
 * - Respects prefers-reduced-motion via motion-reduce:hidden on the spinner
 */

import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export default function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const { t } = useTranslation();

  return (
    <span role="status" className={clsx('inline-flex items-center', className)}>
      <svg
        className={clsx(
          'animate-spin text-brand-600 motion-reduce:hidden',
          sizeClasses[size],
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="sr-only">{t('common.loading')}</span>
    </span>
  );
}
