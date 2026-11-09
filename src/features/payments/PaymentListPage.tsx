/**
 * PaymentListPage — Cattle Feed payment receipts and collection history.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { fetchCustomers } from '@/features/customers';
import { fetchPayments, type PaymentWithDetails } from './api/paymentService';
import { RecordPaymentDialog } from './RecordPaymentDialog';
import { Button, MetricCard, LoadingSpinner, EmptyState } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { formatPaise } from '@/lib/money';
import type { Customer } from '@/lib/database.types';

export function PaymentListPage() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';

  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeBusiness || !isCattleFeed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [paymentsRes, custRes] = await Promise.all([
      fetchPayments(activeBusiness.id),
      fetchCustomers(activeBusiness.id),
    ]);
    setPayments(paymentsRes.data);
    setCustomers(custRes.data);
    setLoading(false);
  }, [activeBusiness, isCattleFeed]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalCollectedPaise = payments.reduce((sum, p) => sum + p.amount_paise, 0);

  if (!isCattleFeed) {
    return (
      <div className="rounded-card border border-amber-200 bg-amber-50 p-6 shadow-card">
        <h2 className="text-base font-semibold text-amber-800">
          {t('bills.cattleFeedNotice')}
        </h2>
        <p className="mt-1 text-sm text-amber-700">
          Customer payment receipts, allocations, and ledger entries belong exclusively to
          Cattle Feed.
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
            {t('payments.title')}
          </h1>
          <p className="text-sm text-slate-500">
            {activeBusiness?.name} · Confirmed customer collections with atomic FIFO
            allocation
          </p>
        </div>
        <div>
          <Button onClick={() => setDialogOpen(true)}>
            + {t('payments.recordPayment')}
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          label="Total Collected"
          value={formatPaise(totalCollectedPaise)}
          subtitle="All confirmed customer receipts"
        />
        <MetricCard
          label="Receipts Issued"
          value={String(payments.length)}
          subtitle="Transactions recorded"
        />
      </div>

      {/* Payments Table */}
      <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            title={t('payments.noPayments')}
            description="Record payments received from customers to clear outstanding dues."
            action={
              <Button onClick={() => setDialogOpen(true)}>
                + {t('payments.recordPayment')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">{t('payments.receiptNumber')}</th>
                  <th className="px-6 py-3">{t('customers.customer')}</th>
                  <th className="px-6 py-3">{t('payments.paymentDate')}</th>
                  <th className="px-6 py-3">{t('payments.paymentMethod')}</th>
                  <th className="px-6 py-3">{t('payments.reference')}</th>
                  <th className="px-6 py-3 text-right">{t('payments.amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-medium text-brand-600">
                      {p.receipt_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {p.customer?.name || '—'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {p.customer?.display_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="px-6 py-4 capitalize">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        {p.payment_method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {p.reference_details || '—'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-700">
                      + {formatPaise(p.amount_paise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecordPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        businessId={activeBusiness.id}
        customers={customers}
        onSuccess={() => void loadData()}
      />
    </div>
  );
}
