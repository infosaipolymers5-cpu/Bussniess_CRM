/**
 * SupplierAccountPage — Supplier Khata, running payable balance, and payment ledger.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { isOwner } from '@/lib/permissions';
import { fetchSuppliers } from '@/features/suppliers';
import {
  fetchSupplierLedgerStatement,
  type SupplierStatementResult,
} from './api/supplierAccountService';
import { RecordSupplierPaymentDialog } from './RecordSupplierPaymentDialog';
import {
  Button,
  LoadingSpinner,
  EmptyState,
  MetricCard,
  Select,
  Input,
} from '@/components/ui';
import { formatPaise } from '@/lib/money';
import type { Supplier } from '@/lib/database.types';

export function SupplierAccountPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeBusiness, activeRole } = useBusiness();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    searchParams.get('supplierId') || '',
  );
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [statement, setStatement] = useState<SupplierStatementResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';
  const hasOwnerAccess = isOwner(activeRole ?? undefined);

  // Load suppliers list
  useEffect(() => {
    async function loadSuppliers() {
      if (!activeBusiness || !isCattleFeed || !hasOwnerAccess) return;
      try {
        const sups = await fetchSuppliers(activeBusiness.id);
        setSuppliers(sups);
        if (!selectedSupplierId && sups.length > 0 && sups[0]) {
          setSelectedSupplierId(sups[0].id);
        }
      } catch {
        setSuppliers([]);
      }
    }
    void loadSuppliers();
  }, [activeBusiness, isCattleFeed, hasOwnerAccess, selectedSupplierId]);

  // Load statement
  const loadStatement = useCallback(async () => {
    if (!activeBusiness || !selectedSupplierId || !hasOwnerAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchSupplierLedgerStatement(
        activeBusiness.id,
        selectedSupplierId,
        fromDate || undefined,
        toDate || undefined,
      );
      setStatement(data);
    } catch {
      setStatement(null);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, selectedSupplierId, hasOwnerAccess, fromDate, toDate]);

  useEffect(() => {
    void loadStatement();
  }, [loadStatement]);

  const handleSupplierChange = (sId: string) => {
    setSelectedSupplierId(sId);
    setSearchParams({ supplierId: sId });
  };

  if (!isCattleFeed || !hasOwnerAccess) {
    return (
      <div className="p-6">
        <EmptyState
          title={t('supplierLedger.title')}
          description={t('suppliers.ownerOnlyNotice')}
        />
      </div>
    );
  }

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('supplierLedger.title')}
          </h1>
          <p className="text-sm text-gray-500">{t('supplierLedger.paymentNotice')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPaymentDialogOpen(true)}>
            + {t('supplierLedger.recordPayment')}
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Print Statement
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label={t('purchaseOrders.supplier')}
            value={selectedSupplierId}
            onChange={(e) => handleSupplierChange(e.target.value)}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
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
      ) : !statement ? (
        <EmptyState
          title={t('supplierLedger.title')}
          description={t('supplierLedger.noEntries')}
        />
      ) : (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <MetricCard
              label={t('supplierLedger.openingPayable')}
              value={formatPaise(statement.opening_balance_paise)}
            />
            <MetricCard
              label={t('supplierLedger.totalPurchases')}
              value={formatPaise(statement.total_purchases_paise)}
            />
            <MetricCard
              label={t('supplierLedger.totalPayments')}
              value={formatPaise(statement.total_payments_paise)}
            />
            <MetricCard
              label={t('supplierLedger.closingPayable')}
              value={formatPaise(statement.closing_balance_paise)}
            />
          </div>

          {/* Ledger Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {selectedSupplier?.name} — Account Ledger
              </h2>
            </div>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Particulars / Description</th>
                  <th className="px-6 py-3 text-right">Purchases (Payable)</th>
                  <th className="px-6 py-3 text-right">Payments (Paid)</th>
                  <th className="px-6 py-3 text-right">Payable Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {statement.entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      {t('supplierLedger.noEntries')}
                    </td>
                  </tr>
                ) : (
                  statement.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                        {new Date(entry.entry_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-700">
                          {entry.entry_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {entry.description}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-gray-900">
                        {entry.credit_paise > 0 ? formatPaise(entry.credit_paise) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-emerald-600">
                        {entry.debit_paise > 0 ? formatPaise(entry.debit_paise) : '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-mono font-bold text-gray-900">
                        {formatPaise(entry.running_balance_paise ?? 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeBusiness && (
        <RecordSupplierPaymentDialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          businessId={activeBusiness.id}
          suppliers={suppliers}
          preselectedSupplierId={selectedSupplierId}
          onSuccess={() => {
            void loadStatement();
          }}
        />
      )}
    </div>
  );
}
