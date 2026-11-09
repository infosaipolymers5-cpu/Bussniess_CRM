/**
 * Payment Reminders Hub Page.
 * Manages customer collection workflows, promise dates, and manual WhatsApp handoff.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import {
  fetchOverdueCustomers,
  queuePaymentReminder,
  type OverdueCustomer,
} from './api/reminderService';
import { markJobOpened, markJobSent } from '@/features/messaging/messageQueueService';
import { PromiseDateDialog } from './PromiseDateDialog';
import { formatPaise } from '@/lib/money';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BirthdayAlertBanner } from '@/features/birthdays/BirthdayAlertBanner';

type FilterTab = 'all' | 'eligible' | 'promised' | 'suppressed';

export function RemindersPage() {
  const { t, i18n } = useTranslation();
  const { activeBusiness } = useBusiness();
  const [customers, setCustomers] = useState<OverdueCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('eligible');
  const [selectedCustomer, setSelectedCustomer] = useState<OverdueCustomer | null>(null);
  const [isPromiseDialogOpen, setIsPromiseDialogOpen] = useState(false);
  const [sendingCustomerId, setSendingCustomerId] = useState<string | null>(null);
  const [recentlyHandledJobs, setRecentlyHandledJobs] = useState<
    Record<string, { jobId: string; status: 'opened' | 'sent' }>
  >({});

  const loadData = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOverdueCustomers(activeBusiness.id);
      if (res.error) {
        setError(res.error);
      } else {
        setCustomers(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Search filter
      const matchesSearch =
        c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.displayPhone.includes(searchQuery);

      if (!matchesSearch) return false;

      // Tab filter
      if (activeTab === 'eligible') {
        return c.isEligibleForReminder;
      }
      if (activeTab === 'promised') {
        return !!c.promiseDate;
      }
      if (activeTab === 'suppressed') {
        return c.isSuppressed;
      }
      return true; // 'all'
    });
  }, [customers, searchQuery, activeTab]);

  const stats = useMemo(() => {
    let totalPaise = 0;
    let eligibleCount = 0;
    let promisedCount = 0;

    customers.forEach((c) => {
      totalPaise += c.balancePaise;
      if (c.isEligibleForReminder) eligibleCount++;
      if (c.promiseDate) promisedCount++;
    });

    return {
      totalOverduePaise: totalPaise,
      totalCount: customers.length,
      eligibleCount,
      promisedCount,
    };
  }, [customers]);

  const handleOpenWhatsApp = async (customer: OverdueCustomer) => {
    if (!activeBusiness) return;
    setSendingCustomerId(customer.customerId);

    try {
      const res = await queuePaymentReminder({
        businessId: activeBusiness.id,
        customer,
        businessName: activeBusiness.name,
        language: i18n.language === 'mr' ? 'mr' : 'en',
      });

      if (res.error) {
        alert(t('reminders.queueError', 'Failed to prepare message: ') + res.error);
        return;
      }

      if (res.job) {
        // Mark job as opened
        await markJobOpened(res.job.id);

        setRecentlyHandledJobs((prev) => ({
          ...prev,
          [customer.customerId]: { jobId: res.job!.id, status: 'opened' },
        }));

        // Open WhatsApp web / app
        window.open(res.deepLinkUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error preparing reminder');
    } finally {
      setSendingCustomerId(null);
    }
  };

  const handleConfirmSent = async (customerId: string, jobId: string) => {
    try {
      await markJobSent(jobId);
      setRecentlyHandledJobs((prev) => ({
        ...prev,
        [customerId]: { jobId, status: 'sent' },
      }));
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to confirm sent');
    }
  };

  const openPromiseDialog = (customer: OverdueCustomer) => {
    setSelectedCustomer(customer);
    setIsPromiseDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Birthday Banner if today has birthdays */}
      {activeBusiness && (
        <BirthdayAlertBanner
          businessId={activeBusiness.id}
          businessName={activeBusiness.name}
        />
      )}

      {/* Header and Summary */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('reminders.title', 'Payment Reminders')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              'reminders.subtitle',
              'Durable 7-day payment reminder queue with promise tracking and manual WhatsApp handoff.',
            )}
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            void loadData();
          }}
          disabled={loading}
        >
          {loading ? t('common.loading', 'Loading...') : t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-amber-500 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-500">
            {t('reminders.totalOverdue', 'Total Outstanding')}
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-700">
            {formatPaise(stats.totalOverduePaise)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats.totalCount} {t('reminders.customersCount', 'customers with balance')}
          </div>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-500">
            {t('reminders.eligibleToday', 'Eligible Reminders Today')}
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {stats.eligibleCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {t('reminders.readyForDispatch', 'Ready for WhatsApp handoff')}
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-500">
            {t('reminders.activePromises', 'Active Payment Promises')}
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">
            {stats.promisedCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {t('reminders.deferredUntilDate', 'Deferred until promised date')}
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              activeTab === 'eligible'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('eligible')}
          >
            {t('reminders.tabEligible', 'Ready Today')} ({stats.eligibleCount})
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              activeTab === 'promised'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('promised')}
          >
            {t('reminders.tabPromised', 'Promised')} ({stats.promisedCount})
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('all')}
          >
            {t('reminders.tabAll', 'All Overdue')} ({stats.totalCount})
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              activeTab === 'suppressed'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('suppressed')}
          >
            {t('reminders.tabSuppressed', 'Suppressed')}
          </button>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder={t('common.searchPlaceholder', 'Search by name or phone...')}
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

      {/* Customer Reminder List */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">
          {t('common.loading', 'Loading overdue accounts...')}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <p className="text-base font-medium">
            {t('reminders.noCustomersFound', 'No overdue accounts match this filter.')}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {activeTab === 'eligible'
              ? t(
                  'reminders.allCaughtUp',
                  'All active payment reminders have been sent or deferred.',
                )
              : t('reminders.checkOtherTabs', 'Try checking other filter tabs.')}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredCustomers.map((c) => {
            const handled = recentlyHandledJobs[c.customerId];

            return (
              <Card
                key={c.customerId}
                className="flex flex-col items-start justify-between gap-4 p-4 transition hover:border-slate-300 md:flex-row md:items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">
                      {c.customerName}
                    </span>
                    {c.promiseDate && (
                      <Badge variant="warning">
                        📅 {t('reminders.promise', 'Promised')}: {c.promiseDate}
                      </Badge>
                    )}
                    {c.isSuppressed && (
                      <Badge variant="danger">
                        🚫 {t('reminders.suppressed', 'Suppressed')}
                      </Badge>
                    )}
                    {!c.isEligibleForReminder && !c.promiseDate && !c.isSuppressed && (
                      <Badge variant="secondary">
                        ⏱️ {c.ineligibilityReason || t('reminders.deferred', 'Deferred')}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      {t('common.phone', 'Phone')}:{' '}
                      <span className="font-mono text-slate-700">{c.displayPhone}</span>
                    </span>
                    <span>
                      {t('reminders.recurrence', 'Recurrence')}: {c.intervalDays}{' '}
                      {t('common.days', 'days')}
                    </span>
                    {c.lastRemindedAt && (
                      <span>
                        {t('reminders.lastReminded', 'Last sent')}:{' '}
                        {new Date(c.lastRemindedAt).toLocaleDateString()}
                      </span>
                    )}
                    {c.notes && (
                      <span className="italic text-slate-600">"{c.notes}"</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="text-right">
                    <div className="text-xs font-medium uppercase text-slate-400">
                      {t('common.balance', 'Balance')}
                    </div>
                    <div className="text-lg font-bold text-amber-700">
                      {formatPaise(c.balancePaise)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Tap to Call */}
                    <a
                      href={`tel:${c.displayPhone}`}
                      className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50"
                      title={t('reminders.call', 'Call customer')}
                    >
                      📞
                    </a>

                    {/* Set Promise Date */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPromiseDialog(c)}
                    >
                      {t('reminders.setPromise', 'Promise')}
                    </Button>

                    {/* WhatsApp Action */}
                    {handled?.status === 'opened' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => {
                          void handleConfirmSent(c.customerId, handled.jobId);
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
                        disabled={
                          !c.isEligibleForReminder || sendingCustomerId === c.customerId
                        }
                        onClick={() => {
                          void handleOpenWhatsApp(c);
                        }}
                        className="flex items-center gap-1.5 bg-green-600 text-white hover:bg-green-700"
                      >
                        <span>💬</span>
                        <span>
                          {sendingCustomerId === c.customerId
                            ? t('common.preparing', 'Preparing...')
                            : t('reminders.sendWhatsApp', 'WhatsApp')}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Promise Date Dialog */}
      {activeBusiness && (
        <PromiseDateDialog
          isOpen={isPromiseDialogOpen}
          onClose={() => setIsPromiseDialogOpen(false)}
          customer={selectedCustomer}
          businessId={activeBusiness.id}
          onSaved={() => {
            void loadData();
          }}
        />
      )}
    </div>
  );
}
