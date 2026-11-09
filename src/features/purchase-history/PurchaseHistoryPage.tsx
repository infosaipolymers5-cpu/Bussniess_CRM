/**
 * PurchaseHistoryPage — Owner-only confirmed purchase lines and effective unit costs.
 * Rule: Excludes speculative stock counts (strictly no inventory balances).
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { isOwner } from '@/lib/permissions';
import { fetchSuppliers } from '@/features/suppliers';
import {
  fetchPurchaseHistory,
  type PurchaseHistoryLine,
} from './api/purchaseHistoryService';
import { LoadingSpinner, EmptyState, Select, Input } from '@/components/ui';
import { formatPaise } from '@/lib/money';
import type { Supplier } from '@/lib/database.types';

export function PurchaseHistoryPage() {
  const { t } = useTranslation();
  const { activeBusiness, activeRole } = useBusiness();

  const [historyLines, setHistoryLines] = useState<PurchaseHistoryLine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';
  const hasOwnerAccess = isOwner(activeRole ?? undefined);

  // Load suppliers
  useEffect(() => {
    async function loadSuppliers() {
      if (!activeBusiness || !isCattleFeed || !hasOwnerAccess) return;
      try {
        const sups = await fetchSuppliers(activeBusiness.id);
        setSuppliers(sups);
      } catch {
        setSuppliers([]);
      }
    }
    void loadSuppliers();
  }, [activeBusiness, isCattleFeed, hasOwnerAccess]);

  // Load purchase history
  const loadHistory = useCallback(async () => {
    if (!activeBusiness || !isCattleFeed || !hasOwnerAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPurchaseHistory(activeBusiness.id, {
        supplierId: selectedSupplierId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setHistoryLines(data);
    } catch {
      setHistoryLines([]);
    } finally {
      setLoading(false);
    }
  }, [
    activeBusiness,
    isCattleFeed,
    hasOwnerAccess,
    selectedSupplierId,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  if (!isCattleFeed || !hasOwnerAccess) {
    return (
      <div className="p-6">
        <EmptyState
          title={t('purchaseHistory.title')}
          description={t('suppliers.ownerOnlyNotice')}
        />
      </div>
    );
  }

  const totalBagsPurchased = historyLines.reduce(
    (sum, line) => sum + line.quantity_bags,
    0,
  );
  const totalCostPaise = historyLines.reduce(
    (sum, line) => sum + line.total_paise + line.allocated_load_cost_paise,
    0,
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {t('purchaseHistory.title')}
        </h1>
        <p className="text-sm text-gray-500">{t('purchaseHistory.subtitle')}</p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label={t('purchaseOrders.supplier')}
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
          >
            <option value="">All Suppliers</option>
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

      {/* Summary KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-gray-500">Confirmed Volume</span>
          <p className="text-2xl font-bold text-gray-900">{totalBagsPurchased} Bags</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <span className="text-xs text-gray-500">Total Inward Purchase Cost</span>
          <p className="text-primary-700 text-2xl font-bold">
            {formatPaise(totalCostPaise)}
          </p>
        </div>
      </div>

      {/* Purchase Lines Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : historyLines.length === 0 ? (
        <EmptyState
          title={t('purchaseHistory.title')}
          description={t('purchaseHistory.noHistory')}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">PO Number</th>
                <th className="px-6 py-3">Supplier</th>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3 text-right">Bags</th>
                <th className="px-6 py-3 text-right">Purchase Rate</th>
                <th className="px-6 py-3 text-right">Freight / Bag</th>
                <th className="px-6 py-3 text-right">
                  {t('purchaseHistory.effectiveRate')}
                </th>
                <th className="px-6 py-3 text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {historyLines.map((line) => {
                const freightPerBag =
                  line.quantity_bags > 0
                    ? Math.round(line.allocated_load_cost_paise / line.quantity_bags)
                    : 0;
                const totalItemCost = line.total_paise + line.allocated_load_cost_paise;

                return (
                  <tr key={line.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                      {line.order.order_date}
                    </td>
                    <td className="text-primary-600 whitespace-nowrap px-6 py-4 font-mono font-medium">
                      <Link
                        to={`/purchase-orders/${line.order.id}`}
                        className="hover:underline"
                      >
                        {line.order.order_number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-gray-900">
                      {line.order.supplier?.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                      {line.product_name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-gray-900">
                      {line.quantity_bags}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-gray-600">
                      {formatPaise(line.unit_rate_paise)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-gray-500">
                      {formatPaise(freightPerBag)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-emerald-700">
                      {formatPaise(line.effective_cost_paise)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-gray-900">
                      {formatPaise(totalItemCost)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
