/**
 * RecordPaymentDialog — Records a customer payment, allocating to oldest open bills via FIFO.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Input, Select, Button } from '@/components/ui';
import { recordPayment } from './api/paymentService';
import { paymentFormSchema } from '@/lib/validation';
import { todayInBusinessTz } from '@/lib/dates';
import type { Customer, PaymentMethod } from '@/lib/database.types';

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  customers: Customer[];
  defaultCustomerId?: string;
  onSuccess: () => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  businessId,
  customers,
  defaultCustomerId = '',
  onSuccess,
}: RecordPaymentDialogProps) {
  const { t } = useTranslation();

  const [customerId, setCustomerId] = useState(defaultCustomerId);
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentDate, setPaymentDate] = useState(todayInBusinessTz());
  const [referenceDetails, setReferenceDetails] = useState('');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    const formData = {
      customerId,
      amountRupees: parseFloat(amountRupees) || 0,
      paymentMethod,
      paymentDate,
      referenceDetails: referenceDetails || null,
      notes: notes || null,
    };

    const parsed = paymentFormSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const { result, error } = await recordPayment(businessId, parsed.data);
    setSubmitting(false);

    if (error || !result) {
      setSubmitError(error ?? 'Failed to record payment');
      return;
    }

    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={t('payments.recordPayment')}
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        {submitError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {submitError}
          </div>
        )}

        <div>
          <Select
            label={t('customers.customer')}
            required
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            error={errors.customerId}
          >
            <option value="">-- Select Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.display_phone})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label={t('payments.amount')}
              type="number"
              step="0.01"
              min="0.01"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="e.g. 5000.00"
              error={errors.amountRupees}
              required
            />
          </div>

          <div>
            <Input
              label={t('payments.paymentDate')}
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              error={errors.paymentDate}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Select
              label={t('payments.paymentMethod')}
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            >
              <option value="cash">{t('payments.cash')}</option>
              <option value="upi">{t('payments.upi')}</option>
              <option value="bank_transfer">{t('payments.bankTransfer')}</option>
              <option value="cheque">{t('payments.cheque')}</option>
              <option value="other">{t('payments.other')}</option>
            </Select>
          </div>

          <div>
            <Input
              label={t('payments.reference') || 'Reference'}
              value={referenceDetails}
              onChange={(e) => setReferenceDetails(e.target.value)}
              placeholder="e.g. UPI Ref / Cheque #"
              error={errors.referenceDetails}
            />
          </div>
        </div>

        <div>
          <Input
            label={t('customers.notes') || 'Notes'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Remarks / payer info"
          />
        </div>

        {/* FIFO Allocation helper notice */}
        <div className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs text-sky-800">
          <strong>FIFO Distribution:</strong> This payment will automatically clear oldest
          outstanding bills first. Any surplus amount will be credited as an advance
          credit.
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={submitting}>
            {t('payments.recordPayment')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
