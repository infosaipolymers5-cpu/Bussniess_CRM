/**
 * Toast notification context and component.
 * Uses aria-live="polite" and auto-dismiss.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import clsx from 'clsx';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message }: Omit<ToastMessage, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={clsx(
              'pointer-events-auto rounded-lg border p-4 shadow-lg transition-all',
              {
                'border-green-200 bg-green-50 text-green-900': toast.type === 'success',
                'border-red-200 bg-red-50 text-red-900': toast.type === 'error',
                'border-amber-200 bg-amber-50 text-amber-900': toast.type === 'warning',
                'border-blue-200 bg-blue-50 text-blue-900': toast.type === 'info',
              },
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                {toast.title && <h4 className="text-sm font-semibold">{toast.title}</h4>}
                <p className="text-sm">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss"
                className="flex min-h-touch min-w-touch items-center justify-center text-sm text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
