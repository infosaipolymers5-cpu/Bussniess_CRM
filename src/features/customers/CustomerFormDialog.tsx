/**
 * CustomerFormDialog — Modal form to create or edit a customer.
 */

import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Input, Button } from '@/components/ui';
import { createCustomer, updateCustomer } from './api/customerService';
import type { CustomerWithMeta } from './api/customerService';

export interface CustomerFormDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  customer?: CustomerWithMeta | null;
  onSaved: () => void;
}

export function CustomerFormDialog({
  open,
  onClose,
  businessId,
  customer,
  onSaved,
}: CustomerFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.display_phone ?? '');
  const [dob, setDob] = useState(customer?.date_of_birth ?? '');
  const [area, setArea] = useState(customer?.area ?? '');
  const [notes, setNotes] = useState(customer?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent, confirmDistinct = false) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDuplicateWarning(null);

    try {
      if (customer) {
        // Update existing
        const { error: updateErr } = await updateCustomer(customer.id, businessId, {
          name,
          phone,
          dateOfBirth: dob || null,
          area: area || null,
          notes: notes || null,
        });

        if (updateErr) {
          setError(updateErr);
          setLoading(false);
          return;
        }
      } else {
        // Create new
        const { error: createErr, duplicateWarning: isDup } = await createCustomer(
          businessId,
          {
            name,
            phone,
            dateOfBirth: dob || null,
            area: area || null,
            notes: notes || null,
            confirmDistinctDuplicate: confirmDistinct,
          },
        );

        if (isDup && !confirmDistinct) {
          setDuplicateWarning(createErr || t('customers.duplicateWarning'));
          setLoading(false);
          return;
        }

        if (createErr) {
          setError(createErr);
          setLoading(false);
          return;
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={customer ? t('customers.editCustomer') : t('customers.addCustomer')}
    >
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {duplicateWarning && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          <p className="font-semibold">{t('customers.duplicateWarning')}</p>
          <p className="mt-1 text-xs">{duplicateWarning}</p>
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(e) => void handleSubmit(e, true)}
              loading={loading}
            >
              Confirm Distinct Customer
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDuplicateWarning(null)}
            >
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Input
          label={t('customers.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />

        <Input
          label={t('customers.phone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="e.g. 9876543210"
          disabled={loading}
        />

        <Input
          label={t('customers.dob')}
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          disabled={loading}
        />

        <Input
          label={t('customers.area')}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Village or locality"
          disabled={loading}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {t('customers.notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={loading}
            rows={2}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default CustomerFormDialog;
