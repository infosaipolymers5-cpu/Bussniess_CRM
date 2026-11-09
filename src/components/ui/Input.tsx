/**
 * Input — Accessible text input with label, error message, and required indicator.
 *
 * - aria-describedby wired to error element
 * - Visible focus ring
 * - Minimum 44px touch target
 */

import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, required, className, ...rest },
  ref,
) {
  const { t } = useTranslation();
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          )}
          {required && <span className="sr-only"> ({t('common.required')})</span>}
        </label>
      )}

      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={clsx(
          'min-h-touch rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
          error ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300',
          className,
        )}
        {...rest}
      />

      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export { Input };
export default Input;
