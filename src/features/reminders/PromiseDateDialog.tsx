/**
 * Promise Date & Reminder Settings Dialog.
 * Allows setting, clearing, or suppressing payment reminders for a customer.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { saveReminderRule, type OverdueCustomer } from './api/reminderService';
import { formatPaise } from '@/lib/money';

interface PromiseDateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: OverdueCustomer | null;
  businessId: string;
  onSaved: () => void;
}

export function PromiseDateDialog({
  isOpen,
  onClose,
  customer,
  businessId,
  onSaved,
}: PromiseDateDialogProps) {
  const { t } = useTranslation();
  const [promiseDate, setPromiseDate] = useState<string>(customer?.promiseDate || '');
  const [intervalDays, setIntervalDays] = useState<number>(customer?.intervalDays || 7);
  const [notes, setNotes] = useState<string>(customer?.notes || '');
  const [isSuppressed, setIsSuppressed] = useState<boolean>(
    customer?.isSuppressed || false,
  );
  const [suppressionReason, setSuppressionReason] = useState<string>(
    customer?.suppressionReason || '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setPromiseDate(customer.promiseDate || '');
      setIntervalDays(customer.intervalDays || 7);
      setNotes(customer.notes || '');
      setIsSuppressed(customer.isSuppressed || false);
      setSuppressionReason(customer.suppressionReason || '');
      setError(null);
    }
  }, [customer]);

  if (!customer) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await saveReminderRule({
        businessId,
        customerId: customer.customerId,
        promiseDate: promiseDate || null,
        intervalDays: Number(intervalDays) || 7,
        isSuppressed,
        suppressionReason: isSuppressed ? suppressionReason : null,
        notes: notes || null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onSaved();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleClearPromiseDate = async () => {
    setSaving(true);
    try {
      const res = await saveReminderRule({
        businessId,
        customerId: customer.customerId,
        promiseDate: null,
        intervalDays: Number(intervalDays) || 7,
        isSuppressed,
        notes: notes || null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setPromiseDate('');
        onSaved();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear promise date');
    } finally {
      setSaving(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('reminders.promiseDialogTitle', 'Payment Promise & Reminder Rules')}
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-base font-semibold text-slate-800">
            {customer.customerName}
          </div>
          <div className="text-slate-500">
            {t('common.phone', 'Phone')}: {customer.displayPhone}
          </div>
          <div className="mt-1 font-medium text-amber-700">
            {t('common.balance', 'Balance')}: {formatPaise(customer.balancePaise)}
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block font-medium text-slate-700">
            {t('reminders.promiseDate', 'Promise Date (Defer Reminders Until)')}
          </label>
          <Input
            type="date"
            min={todayStr}
            value={promiseDate}
            onChange={(e) => setPromiseDate(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            {t(
              'reminders.promiseDateHint',
              'Reminders will be automatically deferred until this date.',
            )}
          </p>
        </div>

        <div>
          <label className="mb-1 block font-medium text-slate-700">
            {t('reminders.recurrenceInterval', 'Reminder Interval (Days)')}
          </label>
          <Input
            type="number"
            min={1}
            max={90}
            value={intervalDays}
            onChange={(e) =>
              setIntervalDays(Math.max(1, parseInt(e.target.value, 10) || 7))
            }
          />
          <p className="mt-1 text-xs text-slate-500">
            {t('reminders.intervalHint', 'Standard default is 7 days.')}
          </p>
        </div>

        <div>
          <label className="mb-1 block font-medium text-slate-700">
            {t('reminders.notes', 'Promise / Collection Notes')}
          </label>
          <Input
            placeholder={t(
              'reminders.notesPlaceholder',
              'e.g. Will pay cash on next market visit',
            )}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="border-t border-slate-200 pt-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isSuppressed}
              onChange={(e) => setIsSuppressed(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium text-slate-700">
              {t(
                'reminders.suppressReminders',
                'Permanently suppress reminders for this customer',
              )}
            </span>
          </label>

          {isSuppressed && (
            <div className="mt-2 pl-6">
              <Input
                placeholder={t(
                  'reminders.suppressReason',
                  'Reason for suppression (e.g. Family member, dispute)',
                )}
                value={suppressionReason}
                onChange={(e) => setSuppressionReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          {customer.promiseDate ? (
            <Button
              variant="outline"
              onClick={() => {
                void handleClearPromiseDate();
              }}
              disabled={saving}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              {t('reminders.clearPromise', 'Clear Promise Date')}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => {
                void handleSave();
              }}
              disabled={saving}
            >
              {saving
                ? t('common.saving', 'Saving...')
                : t('common.save', 'Save Changes')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
