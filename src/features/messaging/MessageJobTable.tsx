/**
 * Message Job Table Component.
 * Displays durable message queues with truthful status badges and manual WhatsApp handoff actions.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { markJobOpened, markJobSent, cancelMessageJob } from './messageQueueService';
import type { MessageJob } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface MessageJobTableProps {
  jobs: MessageJob[];
  onJobUpdated: () => void;
}

export function MessageJobTable({ jobs, onJobUpdated }: MessageJobTableProps) {
  const { t } = useTranslation();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleOpenWhatsApp = async (job: MessageJob) => {
    setProcessingId(job.id);
    try {
      // Build WhatsApp URL
      const cleanPhone = job.recipient_phone.replace(/\D/g, '');
      const fullPhone =
        cleanPhone.startsWith('91') && cleanPhone.length > 10
          ? cleanPhone
          : `91${cleanPhone.slice(-10)}`;
      const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(job.message_text)}`;

      // Update state to opened
      await markJobOpened(job.id);
      onJobUpdated();

      // Open tab
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to open WhatsApp');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkSent = async (jobId: string) => {
    setProcessingId(jobId);
    try {
      await markJobSent(jobId);
      onJobUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark job sent');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm(t('messages.confirmCancel', 'Cancel this queued message job?'))) {
      return;
    }
    setProcessingId(jobId);
    try {
      await cancelMessageJob(jobId, 'Cancelled by owner');
      onJobUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel job');
    } finally {
      setProcessingId(null);
    }
  };

  const getWorkflowBadge = (workflow: string) => {
    switch (workflow) {
      case 'payment_reminder':
        return (
          <Badge variant="warning">💰 {t('messages.typeReminder', 'Reminder')}</Badge>
        );
      case 'material_finish':
        return (
          <Badge variant="primary" className="bg-amber-600 text-white">
            🌾 {t('messages.typeFeedFinish', 'Feed Finish')}
          </Badge>
        );
      case 'birthday':
        return (
          <Badge variant="primary" className="bg-purple-600 text-white">
            🎂 {t('messages.typeBirthday', 'Birthday')}
          </Badge>
        );
      case 'delivery_announcement':
        return (
          <Badge variant="primary" className="bg-blue-600 text-white">
            🚚 {t('messages.typeDelivery', 'Delivery')}
          </Badge>
        );
      case 'pvc_promo':
        return <Badge variant="secondary">🛠️ {t('messages.typePvc', 'PVC Promo')}</Badge>;
      default:
        return <Badge variant="secondary">{workflow}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'owner_marked_sent':
      case 'delivered':
        return <Badge variant="success">✓ {t('messages.statusSent', 'Sent')}</Badge>;
      case 'opened':
        return (
          <Badge variant="primary" className="bg-blue-100 text-blue-800">
            ↗ {t('messages.statusOpened', 'Opened')}
          </Badge>
        );
      case 'failed':
      case 'cancelled':
        return <Badge variant="danger">✕ {status}</Badge>;
      default:
        return (
          <Badge variant="warning">
            ⏳ {t('messages.statusAwaiting', 'Awaiting Action')}
          </Badge>
        );
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
        <p className="text-sm font-medium">
          {t('messages.noJobs', 'No message jobs found.')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 font-semibold uppercase tracking-wider text-slate-600">
          <tr>
            <th className="p-3">{t('messages.recipient', 'Recipient')}</th>
            <th className="p-3">{t('messages.workflow', 'Workflow')}</th>
            <th className="p-3">{t('messages.scheduled', 'Scheduled')}</th>
            <th className="p-3">{t('messages.preview', 'Message Preview')}</th>
            <th className="p-3">{t('messages.status', 'Status')}</th>
            <th className="p-3 text-right">{t('common.actions', 'Actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {jobs.map((job) => {
            const isSent =
              job.status === 'owner_marked_sent' || job.status === 'delivered';
            const isOpened = job.status === 'opened';
            const isCancelled = job.status === 'cancelled' || job.status === 'failed';

            return (
              <tr key={job.id} className="transition hover:bg-slate-50">
                <td className="p-3 font-medium text-slate-900">
                  <div>{job.recipient_name}</div>
                  <div className="font-mono text-[11px] text-slate-500">
                    {job.recipient_phone}
                  </div>
                </td>

                <td className="whitespace-nowrap p-3">
                  {getWorkflowBadge(job.workflow_type)}
                </td>

                <td className="whitespace-nowrap p-3 font-mono text-slate-600">
                  {job.scheduled_date}
                </td>

                <td className="max-w-xs p-3">
                  <p className="line-clamp-2 text-[11px] italic text-slate-600">
                    "{job.message_text}"
                  </p>
                </td>

                <td className="whitespace-nowrap p-3">{getStatusBadge(job.status)}</td>

                <td className="whitespace-nowrap p-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {!isSent && !isCancelled && (
                      <Button
                        size="sm"
                        disabled={processingId === job.id}
                        onClick={() => {
                          void handleOpenWhatsApp(job);
                        }}
                        className="flex h-7 items-center gap-1 bg-green-600 px-2.5 py-1 text-xs text-white hover:bg-green-700"
                      >
                        <span>💬</span>
                        <span>{t('messages.openWhatsApp', 'Open WA')}</span>
                      </Button>
                    )}

                    {isOpened && !isSent && (
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={processingId === job.id}
                        onClick={() => {
                          void handleMarkSent(job.id);
                        }}
                        className="h-7 bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                      >
                        ✓ {t('messages.confirmSent', 'Mark Sent')}
                      </Button>
                    )}

                    {!isSent && !isCancelled && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={processingId === job.id}
                        onClick={() => {
                          void handleCancelJob(job.id);
                        }}
                        className="h-7 px-2 py-1 text-xs text-slate-400 hover:text-red-600"
                        title={t('common.cancel', 'Cancel')}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
