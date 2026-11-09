/**
 * Button — Accessible button primitive with variants, sizes, and loading state.
 *
 * - All text uses i18n
 * - Minimum 44px touch target
 * - Visible focus ring via focus-visible
 * - Loading state shows "Saving…" and disables interaction
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-300',
  secondary:
    'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400',
  outline:
    'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400',
  destructive:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300',
  ghost:
    'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 disabled:text-gray-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-touch min-w-touch px-3 py-1.5 text-sm',
  md: 'min-h-touch min-w-touch px-4 py-2 text-sm',
  lg: 'min-h-[48px] min-w-touch px-6 py-3 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const { t } = useTranslation();

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        'motion-safe:transition-colors',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <>
          <svg
            className="h-4 w-4 animate-spin motion-reduce:hidden"
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
          {t('common.saving')}
        </>
      ) : (
        children
      )}
    </button>
  );
});

export { Button };
export default Button;
