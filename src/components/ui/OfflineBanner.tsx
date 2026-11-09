/**
 * OfflineBanner — persistent offline indicator.
 * Shown when offline. Never claims financial writes were saved.
 * Accessible with aria-live="assertive".
 */

import { useConnection } from '@/app/providers/ConnectionProvider';
import { useTranslation } from 'react-i18next';

export function OfflineBanner() {
  const { isOnline } = useConnection();
  const { t } = useTranslation();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white shadow-sm"
    >
      <div className="flex items-center justify-center gap-2">
        <span aria-hidden="true">⚡</span>
        <span>{t('shell.connectionOffline')}</span>
      </div>
    </div>
  );
}

export default OfflineBanner;
