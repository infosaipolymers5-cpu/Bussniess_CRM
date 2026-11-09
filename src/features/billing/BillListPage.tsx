/**
 * BillListPage — Cattle Feed invoices list and summary metrics.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { fetchBills, type BillWithDetails } from './api/billingService';
import {
  Button,
  Input,
  Select,
  StatusBadge,
  MetricCard,
  LoadingSpinner,
  EmptyState,
} from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { formatPaise } from '@/lib/money';

export function BillListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeBusiness } = useBusiness();

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';

  const [bills, setBills] = useState<BillWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    if (!activeBusiness || !isCattleFeed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await fetchBills(activeBusiness.id, {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: search.trim() || undefined,
    });
    setBills(data);
    setLoading(false);
  }, [activeBusiness, isCattleFeed, statusFilter, search]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Aggregate summary metrics
  const totalBilledPaise = bills
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.total_amount_paise, 0);

  const totalOutstandingPaise = bills
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.balance_due_paise, 0);

  const paidCount = bills.filter((b) => b.status === 'paid').length;

  if (!isCattleFeed) {
    return (
      <div className="rounded-card border border-amber-200 bg-amber-50 p-6 shadow-card">
        <h2 className="text-base font-semibold text-amber-800">
          {t('bills.cattleFeedNotice')}
        </h2>
        <p className="mt-1 text-sm text-amber-700">
          Billing, invoices, customer dues, and payment allocation apply strictly to
          Cattle Feed. PVC is non-billing by architectural design.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('bills.title')}
          </h1>
          <p className="text-sm text-slate-500">
            {activeBusiness?.name} · Sequential Cattle Feed invoices with integer paise
            accuracy
          </p>
        </div>
        <div>
          <Button onClick={() => navigate('/bills/new')}>
            + {t('bills.createBill')}
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total Billed"
          value={formatPaise(totalBilledPaise)}
          subtitle="Non-cancelled invoices"
        />
        <MetricCard
          label="Outstanding Dues"
          value={formatPaise(totalOutstandingPaise)}
          subtitle="Pending customer payment"
        />
        <MetricCard
          label="Fully Paid Invoices"
          value={String(paidCount)}
          subtitle={`Out of ${bills.length} total`}
        />
      </div>

      {/* Filters Card */}
      <div className="grid grid-cols-1 gap-4 rounded-card border border-slate-200 bg-white p-4 shadow-card sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            label={t('common.search') || 'Search'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by bill number (e.g. CF-2026-27-0001)..."
          />
        </div>
        <div>
          <Select
            label={t('bills.status')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="issued">{t('bills.issued')}</option>
            <option value="partially_paid">{t('bills.partiallyPaid')}</option>
            <option value="paid">{t('bills.paid')}</option>
            <option value="cancelled">{t('bills.cancelled')}</option>
          </Select>
        </div>
      </div>

      {/* Bills Table */}
      <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : bills.length === 0 ? (
          <EmptyState
            title={t('bills.noBills')}
            description="Create your first Cattle Feed bill to track receivables."
            action={
              <Button onClick={() => navigate('/bills/new')}>
                + {t('bills.createBill')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">{t('bills.billNumber')}</th>
                  <th className="px-6 py-3">{t('customers.customer')}</th>
                  <th className="px-6 py-3">{t('bills.billDate')}</th>
                  <th className="px-6 py-3 text-right">{t('bills.totalAmount')}</th>
                  <th className="px-6 py-3 text-right">{t('bills.balanceDue')}</th>
                  <th className="px-6 py-3">{t('bills.status')}</th>
                  <th className="px-6 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-medium text-brand-600">
                      {bill.bill_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {bill.customer?.name || '—'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {bill.customer?.display_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(bill.bill_date)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatPaise(bill.total_amount_paise)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-rose-700">
                      {formatPaise(bill.balance_due_paise)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={
                          bill.status === 'paid'
                            ? 'paid'
                            : bill.status === 'partially_paid'
                              ? 'warning'
                              : bill.status === 'cancelled'
                                ? 'cancelled'
                                : 'pending'
                        }
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/bills/${bill.id}`)}
                      >
                        {t('common.view')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
