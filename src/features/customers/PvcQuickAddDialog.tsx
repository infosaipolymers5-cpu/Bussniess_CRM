/**
 * PvcQuickAddDialog — Three-field speed registration path for PVC counter:
 * 1. Customer Name (Required)
 * 2. Mobile Phone (Required)
 * 3. Date of Birth (Required)
 * Area & Notes optional.
 */

import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Input, Button } from '@/components/ui';
import { createCustomer } from './api/customerService';
import { pvcQuickAddSchema } from '@/lib/validation';

export interface PvcQuickAddDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  onSaved: () => void;
}

export function PvcQuickAddDialog({
  open,
  onClose,
  businessId,
  onSaved,
}: PvcQuickAddDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [area, setArea] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate 3 required fields
    const validation = pvcQuickAddSchema.safeParse({
      name,
      phone,
      dateOfBirth: dob,
      area: area || null,
    });

    if (!validation.success) {
      setError(validation.error.errors[0]?.message ?? 'Invalid input');
      setLoading(false);
      return;
    }

    try {
      const { error: createErr } = await createCustomer(businessId, {
        name,
        phone,
        dateOfBirth: dob,
        area: area || null,
      });

      if (createErr) {
        setError(createErr);
        setLoading(false);
        return;
      }

      setName('');
      setPhone('');
      setDob('');
      setArea('');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('customers.pvcQuickAdd')}>
      <div className="mb-4 rounded-lg bg-cyan-50 p-3 text-xs text-cyan-800">
        ⚡ <strong>Three-field speed path:</strong> Enter Name, Phone, and Date of Birth
        to quickly register PVC customers at the counter.
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <Input
          label={t('customers.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          disabled={loading}
          placeholder="e.g. Ramesh Patil"
        />

        <Input
          label={t('customers.phone')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          disabled={loading}
          placeholder="10-digit mobile number"
        />

        <Input
          label={t('customers.dob')}
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          required
          disabled={loading}
        />

        <Input
          label={`${t('customers.area')} (${t('common.optional')})`}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          disabled={loading}
          placeholder="Village or locality"
        />

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

export default PvcQuickAddDialog;
