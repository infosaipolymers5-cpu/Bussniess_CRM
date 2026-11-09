/**
 * RecordSupplierPaymentDialog — Record a confirmed supplier payment.
 * Rule: Supplier payments reduce payables and are NEVER treated as expenses.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, Input, Select } from '@/components/ui';
import { recordSupplierPayment } from './api/supplierAccountService';
import type { Supplier } from '@/lib/database.types';

interface RecordSupplierPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  suppliers: Supplier[];
  preselectedSupplierId?: string;
  onSuccess: () => void;
}

export function RecordSupplierPaymentDialog({
  open,
  onClose,
  businessId,
  suppliers,
  preselectedSupplierId,
  onSuccess,
}: RecordSupplierPaymentDialogProps) {
  const { t } = useTranslation();

  const [supplierId, setSupplierId] = useState(preselectedSupplierId || '');
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [paymentMode, setPaymentMode] = useState('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedSupplierId) {
      setSupplierId(preselectedSupplierId);
    } else if (suppliers.length > 0 && suppliers[0]) {
      setSupplierId(suppliers[0].id);
    }
  }, [preselectedSupplierId, suppliers, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amountRupees);
    if (!supplierId || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please provide a valid supplier and positive payment amount');
      return;
    }

    setSaving(true);
    try {
      await recordSupplierPayment(businessId, {
        supplierId,
        amountRupees: parsedAmount,
        paymentDate,
        paymentMode,
        referenceNumber: referenceNumber.trim() || null,
        notes: notes.trim() || null,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('supplierLedger.recordPayment')}>
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="rounded border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          {t('supplierLedger.paymentNotice')}
        </div>

        <Select
          label={t('purchaseOrders.supplier')}
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          required
        >
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>

        <Input
          label={t('supplierLedger.paymentAmount')}
          type="number"
          step="0.01"
          min="0.01"
          value={amountRupees}
          onChange={(e) => setAmountRupees(e.target.value)}
          placeholder="0.00"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('supplierLedger.paymentDate')}
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />

          <Select
            label={t('supplierLedger.paymentMode')}
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            <option value="bank_transfer">Bank Transfer / NEFT</option>
            <option value="rtgs">RTGS</option>
            <option value="upi">UPI / QR</option>
            <option value="cheque">Cheque</option>
            <option value="cash">Cash</option>
          </Select>
        </div>

        <Input
          label={t('supplierLedger.refNumber')}
          type="text"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          placeholder="e.g. UTR12345678 or Cheque 001234"
        />

        <Input
          label={t('suppliers.notes')}
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional remarks"
        />

        <div className="flex justify-end space-x-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
