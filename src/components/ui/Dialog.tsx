/**
 * Dialog — Accessible modal dialog using the native <dialog> element.
 *
 * - role="dialog", aria-modal, aria-labelledby
 * - Native focus trap via <dialog>.showModal()
 * - Escape to close
 * - Backdrop click to close
 */

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
  className,
}: DialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.hasAttribute('open')) {
      dialog.showModal();
    } else if (!open && dialog.hasAttribute('open')) {
      dialog.close();
    }
  }, [open]);

  /** Close on Escape (native dialog handles this, but we sync state) */
  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose],
  );

  /** Close on backdrop click */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="dialog-title"
      className={clsx(
        'w-full max-w-lg rounded-card bg-white p-0 shadow-xl',
        'backdrop:bg-black/50',
        'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95',
        className,
      )}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className="flex flex-col gap-4 p-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 id="dialog-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label={t('common.close')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="text-sm text-gray-600">{children}</div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-3 pt-2">{actions}</div>
        )}
      </div>
    </dialog>
  );
}

export default Dialog;
