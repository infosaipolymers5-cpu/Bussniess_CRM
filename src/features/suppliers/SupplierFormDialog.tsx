/**
 * SupplierFormDialog — Create or edit a supplier with contact details and opening balance.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, Input } from '@/components/ui';
import { getFinancialYear } from '@/lib/dates';
import type { Supplier } from '@/lib/database.types';
import type { SupplierFormData } from '@/lib/validation';

interface SupplierFormDialogProps {
  open: boolean;
  onClose: () => void;
  supplier?: Supplier | null;
  onSave: (
    data: SupplierFormData,
    openingBalance?: { fy: string; rupees: number },
  ) => Promise<boolean>;
}

export function SupplierFormDialog({
  open,
  onClose,
  supplier,
  onSave,
}: SupplierFormDialogProps) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [notes, setNotes] = useState('');
  const [openingBalanceRupees, setOpeningBalanceRupees] = useState('0');
  const [financialYear, setFinancialYear] = useState(() => getFinancialYear());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplier) {
      setName(supplier.name);
      setPhone(supplier.phone ?? '');
      setAddress(supplier.address ?? '');
      setGstin(supplier.gstin ?? '');
      setNotes(supplier.notes ?? '');
      setOpeningBalanceRupees('0');
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setGstin('');
      setNotes('');
      setOpeningBalanceRupees('0');
      setFinancialYear(getFinancialYear());
    }
    setError(null);
  }, [supplier, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t('suppliers.supplierName') + ' is required');
      return;
    }

    setSaving(true);
    try {
      const parsedBalance = parseFloat(openingBalanceRupees);
      const openingBalance =
        !supplier && parsedBalance > 0
          ? { fy: financialYear, rupees: parsedBalance }
          : undefined;

      const success = await onSave(
        {
          name: name.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          gstin: gstin.trim() || null,
          notes: notes.trim() || null,
        },
        openingBalance,
      );

      if (success) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={supplier ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <Input
          label={t('suppliers.supplierName')}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Godrej Agrovet Ltd"
          required
        />

        <Input
          label={t('suppliers.phone')}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="10-digit mobile"
        />

        <Input
          label={t('suppliers.address')}
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="City, State"
        />

        <Input
          label={t('suppliers.gstin')}
          type="text"
          value={gstin}
          onChange={(e) => setGstin(e.target.value.toUpperCase())}
          placeholder="27AAAAA0000A1Z5"
        />

        {!supplier && (
          <div className="grid grid-cols-2 gap-3 rounded border border-gray-100 bg-gray-50 p-3">
            <Input
              label={t('suppliers.openingBalance')}
              type="number"
              step="0.01"
              value={openingBalanceRupees}
              onChange={(e) => setOpeningBalanceRupees(e.target.value)}
            />
            <Input
              label={t('suppliers.financialYear')}
              type="text"
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
            />
          </div>
        )}

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
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
