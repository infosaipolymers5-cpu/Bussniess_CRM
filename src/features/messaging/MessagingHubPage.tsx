/**
 * Messaging Hub Page.
 * Centralized queue control room for payment reminders, birthdays, feed alerts,
 * and delivery announcements.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { fetchMessageJobs } from './messageQueueService';
import { MessageJobTable } from './MessageJobTable';
import { TransportSettingsDialog } from './TransportSettingsDialog';
import type { MessageJob } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function MessagingHubPage() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();
  const [jobs, setJobs] = useState<MessageJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [workflowFilter, setWorkflowFilter] = useState<string>('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const loadJobs = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMessageJobs(activeBusiness.id);
      if (res.error) {
        setError(res.error);
      } else {
        setJobs(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (statusFilter !== 'all' && j.status !== statusFilter) {
        return false;
      }
      if (workflowFilter !== 'all' && j.workflow_type !== workflowFilter) {
        return false;
      }
      return true;
    });
  }, [jobs, statusFilter, workflowFilter]);

  const stats = useMemo(() => {
    let awaiting = 0;
    let opened = 0;
    let sent = 0;

    jobs.forEach((j) => {
      if (j.status === 'awaiting_owner_action' || j.status === 'queued') awaiting++;
      else if (j.status === 'opened') opened++;
      else if (j.status === 'owner_marked_sent' || j.status === 'delivered') sent++;
    });

    return {
      total: jobs.length,
      awaiting,
      opened,
      sent,
    };
  }, [jobs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('messages.hubTitle', 'Messages & Automation Hub')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              'messages.hubSubtitle',
              'Audit-trailed message queue with transparent status transitions and manual WhatsApp handoff.',
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
            ⚙️ {t('messages.settings', 'Settings')}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void loadJobs();
            }}
            disabled={loading}
          >
            {loading ? t('common.loading', 'Loading...') : t('common.refresh', 'Refresh')}
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-500">
            {t('messages.totalQueued', 'Total In Queue')}
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{stats.total}</div>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-500">
            {t('messages.awaitingAction', 'Awaiting Action')}
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{stats.awaiting}</div>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-500">
            {t('messages.openedProgress', 'Opened / In Handoff')}
          </div>
          <div className="mt-1 text-2xl font-bold text-indigo-600">{stats.opened}</div>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 bg-white p-4">
          <div className="text-xs font-medium uppercase text-slate-500">
            {t('messages.sentCount', 'Confirmed Sent')}
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{stats.sent}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-slate-300 bg-white p-2 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">{t('messages.allStatuses', 'All Statuses')}</option>
            <option value="awaiting_owner_action">
              {t('messages.statusAwaiting', 'Awaiting Action')}
            </option>
            <option value="opened">{t('messages.statusOpened', 'Opened')}</option>
            <option value="owner_marked_sent">{t('messages.statusSent', 'Sent')}</option>
            <option value="cancelled">
              {t('messages.statusCancelled', 'Cancelled')}
            </option>
          </select>

          <select
            className="rounded-lg border border-slate-300 bg-white p-2 text-xs"
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value)}
          >
            <option value="all">{t('messages.allWorkflows', 'All Workflows')}</option>
            <option value="payment_reminder">
              {t('messages.typeReminder', 'Payment Reminders')}
            </option>
            <option value="material_finish">
              {t('messages.typeFeedFinish', 'Feed Finish')}
            </option>
            <option value="birthday">{t('messages.typeBirthday', 'Birthdays')}</option>
            <option value="delivery_announcement">
              {t('messages.typeDelivery', 'Delivery Trips')}
            </option>
            <option value="pvc_promo">{t('messages.typePvc', 'PVC Campaigns')}</option>
            <option value="festival_wish">
              {t('messages.typeFestival', 'Festival Wishes')}
            </option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">
          {t('common.loading', 'Loading message queue...')}
        </div>
      ) : (
        <MessageJobTable
          jobs={filteredJobs}
          onJobUpdated={() => {
            void loadJobs();
          }}
        />
      )}

      {/* Settings Dialog */}
      {activeBusiness && (
        <TransportSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          businessId={activeBusiness.id}
          onSaved={() => {
            void loadJobs();
          }}
        />
      )}
    </div>
  );
}
