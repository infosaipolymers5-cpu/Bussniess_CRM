/**
 * ExpenseListPage — Owner-only categorized operating expenses.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { isOwner } from '@/lib/permissions';
import {
  fetchExpenses,
  fetchExpenseCategories,
  type ExpenseWithCategory,
} from './api/expenseService';
import { ExpenseFormDialog } from './ExpenseFormDialog';
import {
  Button,
  LoadingSpinner,
  EmptyState,
  MetricCard,
  Badge,
  Select,
  Input,
} from '@/components/ui';
import { formatPaise } from '@/lib/money';
import type { ExpenseCategory } from '@/lib/database.types';

export function ExpenseListPage() {
  const { t } = useTranslation();
  const { activeBusiness, activeRole } = useBusiness();

  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';
  const hasOwnerAccess = isOwner(activeRole ?? undefined);

  useEffect(() => {
    async function loadCategories() {
      if (!activeBusiness || !isCattleFeed || !hasOwnerAccess) return;
      try {
        const cats = await fetchExpenseCategories(activeBusiness.id);
        setCategories(cats);
      } catch {
        setCategories([]);
      }
    }
    void loadCategories();
  }, [activeBusiness, isCattleFeed, hasOwnerAccess]);

  const loadExpenses = useCallback(async () => {
    if (!activeBusiness || !isCattleFeed || !hasOwnerAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchExpenses(activeBusiness.id, {
        categoryId: selectedCategoryId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setExpenses(data);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [
    activeBusiness,
    isCattleFeed,
    hasOwnerAccess,
    selectedCategoryId,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  if (!isCattleFeed || !hasOwnerAccess) {
    return (
      <div className="p-6">
        <EmptyState
          title={t('expenses.title')}
          description={t('expenses.ownerOnlyNotice')}
        />
      </div>
    );
  }

  // Compute operating expenses vs load-absorbed expenses
  const operatingExpensesPaise = expenses
    .filter((e) => !e.is_load_allocated)
    .reduce((sum, e) => sum + e.amount_paise, 0);

  const loadAllocatedPaise = expenses
    .filter((e) => e.is_load_allocated)
    .reduce((sum, e) => sum + e.amount_paise, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('expenses.title')}
          </h1>
          <p className="text-sm text-gray-500">{t('expenses.ownerOnlyNotice')}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          + {t('expenses.recordExpense')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Operating Expenses (Deducted from Profit)"
          value={formatPaise(operatingExpensesPaise)}
        />
        <MetricCard
          label="Load-Allocated Freight (Absorbed in COGS)"
          value={formatPaise(loadAllocatedPaise)}
        />
      </div>

      {/* Filter Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label={t('expenses.category')}
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Input
            label={t('common.fromDate', 'From Date')}
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />

          <Input
            label={t('common.toDate', 'To Date')}
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : expenses.length === 0 ? (
        <EmptyState
          title={t('expenses.title')}
          description={t('expenses.noExpenses')}
          action={
            <Button onClick={() => setDialogOpen(true)}>
              + {t('expenses.recordExpense')}
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">{t('expenses.date')}</th>
                <th className="px-6 py-3">{t('expenses.category')}</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Mode / Ref</th>
                <th className="px-6 py-3">{t('expenses.notes')}</th>
                <th className="px-6 py-3 text-right">{t('expenses.amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                    {exp.expense_date}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                    {exp.category?.name ?? 'General'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {exp.is_load_allocated ? (
                      <Badge variant="default">Absorbed in COGS</Badge>
                    ) : (
                      <Badge variant="success">Operating Expense</Badge>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                    <span className="capitalize">{exp.payment_mode}</span>
                    {exp.reference_number && ` (${exp.reference_number})`}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {exp.notes ?? '—'}
                    {exp.load_reference && ` [Load: ${exp.load_reference}]`}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-mono font-bold text-gray-900">
                    {formatPaise(exp.amount_paise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeBusiness && (
        <ExpenseFormDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          businessId={activeBusiness.id}
          categories={categories}
          onSuccess={(newExp) => setExpenses((prev) => [newExp, ...prev])}
          onCategoryCreated={(newCat) => setCategories((prev) => [...prev, newCat])}
        />
      )}
    </div>
  );
}
