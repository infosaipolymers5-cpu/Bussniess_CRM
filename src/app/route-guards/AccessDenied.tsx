/**
 * AccessDenied — shown when a user lacks required permissions.
 */

import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function AccessDenied() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-4 text-5xl" aria-hidden="true">
          🚫
        </div>
        <h1 className="mb-2 text-xl font-semibold text-slate-900">
          {t('auth.accessDenied')}
        </h1>
        <p className="mb-6 text-slate-600">{t('auth.unauthorized')}</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          {t('nav.dashboard')}
        </button>
      </div>
    </div>
  );
}
