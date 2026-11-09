/**
 * Feed Finish Alerts Page.
 * Monitored cattle feed consumption, pre-finish cue alerts, and re-order communication.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import {
  fetchMaterialAlerts,
  resolveMaterialAlert,
  queueMaterialAlertNotification,
  type ActiveMaterialAlertItem,
} from './api/materialAlertService';
import { markJobOpened, markJobSent } from '@/features/messaging/messageQueueService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

export function MaterialAlertsPage() {
  const { t, i18n } = useTranslation();
  const { activeBusiness } = useBusiness();
  const [alerts, setAlerts] = useState<ActiveMaterialAlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'due' | 'all'>('due');
  const [handledJobs, setHandledJobs] = useState<
    Record<string, { jobId: string; status: 'opened' | 'sent' }>
  >({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMaterialAlerts(activeBusiness.id, { status: 'active' });
      if (res.error) {
        setError(res.error);
      } else {
        setAlerts(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed alerts');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      const matchesSearch =
        item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.displayPhone.includes(searchQuery);

      if (!matchesSearch) return false;

      if (filterMode === 'due') {
        // Due when daysUntilFinish <= 5
        return item.daysUntilFinish <= 5;
      }
      return true;
    });
  }, [alerts, searchQuery, filterMode]);

  const stats = useMemo(() => {
    let dueCount = 0;
    let totalBags = 0;

    alerts.forEach((a) => {
      totalBags += a.quantityBags;
      if (a.daysUntilFinish <= 5) {
        dueCount++;
      }
    });

    return {
      totalAlerts: alerts.length,
      dueCount,
      totalBags,
    };
  }, [alerts]);

  const handleSendReminder = async (alertItem: ActiveMaterialAlertItem) => {
    if (!activeBusiness) return;
    setProcessingId(alertItem.id);

    try {
      const res = await queueMaterialAlertNotification({
        businessId: activeBusiness.id,
        alert: alertItem,
        businessName: activeBusiness.name,
        language: i18n.language === 'mr' ? 'mr' : 'en',
      });

      if (res.error) {
        alert(t('alerts.queueError', 'Failed to prepare notification: ') + res.error);
        return;
      }

      if (res.job) {
        await markJobOpened(res.job.id);
        setHandledJobs((prev) => ({
          ...prev,
          [alertItem.id]: { jobId: res.job!.id, status: 'opened' },
        }));
        window.open(res.deepLinkUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error preparing reminder');
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmSent = async (alertId: string, jobId: string) => {
    try {
      await markJobSent(jobId);
      setHandledJobs((prev) => ({
        ...prev,
        [alertId]: { jobId, status: 'sent' },
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to confirm sent');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    if (
      !confirm(t('alerts.confirmResolve', 'Mark this feed-finish alert as resolved?'))
    ) {
      return;
    }

    try {
      const res = await resolveMaterialAlert(
        alertId,
        'resolved',
        'Marked resolved manually by owner',
      );
      if (res.error) {
        alert(res.error);
      } else {
        await loadAlerts();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resolve alert');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('alerts.title', 'Cattle Feed Consumption Alerts')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              'alerts.subtitle',
              'Proactively notifies farmers 5 days before feed finishes so their animals do not go hungry.',
            )}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            void loadAlerts();
          }}
          disabled={loading}
        >
          {loading ? t('common.loading', 'Loading...') : t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-500">
            {t('alerts.dueSoon', 'Due For Reminder (<= 5 Days)')}
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{stats.dueCount}</div>
          <div className="mt-1 text-xs text-slate-500">
            {t('alerts.needAttention', 'Feed finishing soon')}
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-500">
            {t('alerts.activeAlerts', 'Total Active Monitored')}
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{stats.totalAlerts}</div>
          <div className="mt-1 text-xs text-slate-500">
            {t('alerts.activeCycles', 'Customers on feed consumption cycles')}
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-500">
            {t('alerts.totalBags', 'Feed Bags Monitored')}
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">
            {stats.totalBags}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {t('alerts.bagDesc', 'Total 50kg bags in current consumption cycle')}
          </div>
        </Card>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              filterMode === 'due'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setFilterMode('due')}
          >
            {t('alerts.tabDue', 'Due for Re-order')} ({stats.dueCount})
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              filterMode === 'all'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setFilterMode('all')}
          >
            {t('alerts.tabAll', 'All Active')} ({stats.totalAlerts})
          </button>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder={t('alerts.searchPlaceholder', 'Search customer or product...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Alert List */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">
          {t('common.loading', 'Loading feed alerts...')}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <p className="text-base font-medium">
            {t('alerts.noAlertsFound', 'No active feed consumption alerts match.')}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {filterMode === 'due'
              ? t(
                  'alerts.allGood',
                  'No customers are in the 5-day pre-finish window today.',
                )
              : t(
                  'alerts.newBillsCreate',
                  'New feed bills will automatically schedule consumption tracking.',
                )}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredAlerts.map((item) => {
            const handled = handledJobs[item.id];
            const isDueNow = item.daysUntilFinish <= 5;
            const isFinished = item.daysUntilFinish <= 0;

            return (
              <Card
                key={item.id}
                className={`flex flex-col items-start justify-between gap-4 p-4 transition md:flex-row md:items-center ${
                  isDueNow ? 'border-amber-300 bg-amber-50/20' : 'hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">
                      {item.customerName}
                    </span>
                    <Badge variant="primary" className="bg-slate-700 text-xs text-white">
                      {item.productName} ({item.quantityBags} {t('common.bags', 'bags')})
                    </Badge>
                    {isFinished ? (
                      <Badge variant="danger">
                        ⚠️ {t('alerts.finished', 'Finished')}
                      </Badge>
                    ) : isDueNow ? (
                      <Badge variant="warning">
                        ⏱️ {item.daysUntilFinish} {t('alerts.daysRemaining', 'days left')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        {item.daysUntilFinish} {t('alerts.daysRemaining', 'days left')}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      {t('common.phone', 'Phone')}:{' '}
                      <span className="font-mono text-slate-700">
                        {item.displayPhone}
                      </span>
                    </span>
                    <span>
                      {t('alerts.billDate', 'Purchase Date')}: {item.billDate}
                    </span>
                    <span>
                      {t('alerts.expectedFinish', 'Expected Finish')}:{' '}
                      <span className="font-medium text-slate-700">
                        {item.expectedFinishDate}
                      </span>
                    </span>
                    <span>
                      {t('alerts.herdInfo', 'Herd')}: {item.herdSize}{' '}
                      {t('alerts.animals', 'animals')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <a
                    href={`tel:${item.displayPhone}`}
                    className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50"
                    title={t('reminders.call', 'Call customer')}
                  >
                    📞
                  </a>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleResolveAlert(item.id);
                    }}
                  >
                    {t('alerts.resolve', 'Resolve')}
                  </Button>

                  {handled?.status === 'opened' ? (
                    <Button
                      size="sm"
                      variant="primary"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => {
                        void handleConfirmSent(item.id, handled.jobId);
                      }}
                    >
                      ✓ {t('reminders.confirmSent', 'Confirm Sent')}
                    </Button>
                  ) : handled?.status === 'sent' ? (
                    <Badge variant="success" className="px-3 py-1.5">
                      ✓ {t('reminders.markedSent', 'Sent')}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      disabled={processingId === item.id || !item.isEligible}
                      onClick={() => {
                        void handleSendReminder(item);
                      }}
                      className="flex items-center gap-1.5 bg-green-600 text-white hover:bg-green-700"
                    >
                      <span>💬</span>
                      <span>
                        {processingId === item.id
                          ? t('common.preparing', 'Preparing...')
                          : t('alerts.reorderReminder', 'Re-order WhatsApp')}
                      </span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
