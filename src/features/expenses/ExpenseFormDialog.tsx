/**
 * ExpenseFormDialog — Record operating expense with double-counting prevention.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, Input, Select } from '@/components/ui';
import {
  createExpense,
  createExpenseCategory,
  type ExpenseWithCategory,
} from './api/expenseService';
import type { ExpenseCategory } from '@/lib/database.types';

interface ExpenseFormDialogProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  categories: ExpenseCategory[];
  onSuccess: (expense: ExpenseWithCategory) => void;
  onCategoryCreated: (category: ExpenseCategory) => void;
}

export function ExpenseFormDialog({
  open,
  onClose,
  businessId,
  categories,
  onSuccess,
  onCategoryCreated,
}: ExpenseFormDialogProps) {
  const { t } = useTranslation();

  const [categoryId, setCategoryId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [expenseDate, setExpenseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [paymentMode, setPaymentMode] = useState('cash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loadReference, setLoadReference] = useState('');
  const [isLoadAllocated, setIsLoadAllocated] = useState(false);

  // Quick category creation
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (categories.length > 0 && categories[0] && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId, open]);

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const cat = await createExpenseCategory(businessId, {
        name: newCatName.trim(),
      });
      onCategoryCreated(cat);
      setCategoryId(cat.id);
      setNewCatName('');
      setShowNewCategory(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amountRupees);
    if (!categoryId || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please provide a category and positive expense amount');
      return;
    }

    setSaving(true);
    try {
      const exp = await createExpense(businessId, {
        categoryId,
        amountRupees: parsedAmount,
        expenseDate,
        paymentMode,
        referenceNumber: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        loadReference: loadReference.trim() || null,
        isLoadAllocated,
      });

      const matchedCat = categories.find((c) => c.id === categoryId);
      onSuccess({
        ...exp,
        category: matchedCat || {
          id: categoryId,
          business_id: businessId,
          name: 'General',
          code: null,
          description: null,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={t('expenses.recordExpense')}>
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Category selection */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {t('expenses.category')}
            </span>
            <button
              type="button"
              onClick={() => setShowNewCategory(!showNewCategory)}
              className="text-primary-600 hover:text-primary-800 text-xs font-medium"
            >
              {showNewCategory ? 'Cancel' : '+ New Category'}
            </button>
          </div>

          {showNewCategory ? (
            <div className="flex gap-2">
              <Input
                label="New Category"
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Electricity, Hamali, Tea"
              />
              <Button
                type="button"
                onClick={() => {
                  void handleCreateCategory();
                }}
                className="mt-6"
              >
                Add
              </Button>
            </div>
          ) : (
            <Select
              label={t('expenses.category')}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        <Input
          label={t('expenses.amount')}
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
            label={t('expenses.date')}
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />

          <Select
            label={t('expenses.paymentMode')}
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer / NEFT</option>
            <option value="upi">UPI / QR</option>
            <option value="cheque">Cheque</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t('expenses.refNumber')}
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="UTR / Cheque #"
          />

          <Input
            label={t('expenses.loadReference')}
            type="text"
            value={loadReference}
            onChange={(e) => setLoadReference(e.target.value)}
            placeholder="Truck MH-12-XX"
          />
        </div>

        {/* Double count prevention checkbox */}
        <div className="space-y-2 rounded border border-amber-200 bg-amber-50 p-3">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={isLoadAllocated}
              onChange={(e) => setIsLoadAllocated(e.target.checked)}
              className="text-primary-600 mt-0.5 rounded border-gray-300"
            />
            <span className="text-xs font-semibold text-amber-900">
              {t('expenses.isLoadAllocated')}
            </span>
          </label>
          <p className="text-xs text-amber-800">{t('expenses.loadAllocatedNotice')}</p>
        </div>

        <Input
          label={t('expenses.notes')}
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
            {saving ? 'Recording...' : 'Record Expense'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
