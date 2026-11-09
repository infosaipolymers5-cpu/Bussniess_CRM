/**
 * Select — Accessible select dropdown with label, error, and required indicator.
 *
 * - Wraps native HTML <select>
 * - aria-describedby for errors
 * - Visible focus ring
 * - Minimum 44px touch target
 */

import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  error?: string;
  options?: Array<{ value: string; label: string }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, required, className, children, options, ...rest },
  ref,
) {
  const { t } = useTranslation();
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> ({t('common.required')})</span>}
      </label>

      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={clsx(
          'min-h-touch appearance-none rounded-lg border bg-white px-3 py-2 pr-8 text-sm text-gray-900',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
          error ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300',
          className,
        )}
        {...rest}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>

      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export { Select };
export default Select;
