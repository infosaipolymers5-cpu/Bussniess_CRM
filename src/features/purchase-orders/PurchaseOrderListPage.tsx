/**
 * PurchaseOrderListPage — Owner-only view of purchase orders.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { isOwner } from '@/lib/permissions';
import { fetchPurchaseOrders } from './api/purchaseOrderService';
import { Button, LoadingSpinner, EmptyState, StatusBadge } from '@/components/ui';
import { formatPaise } from '@/lib/money';
import type { PurchaseOrder, Supplier, PurchaseOrderStatus } from '@/lib/database.types';

export function PurchaseOrderListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeBusiness, activeRole } = useBusiness();

  const [orders, setOrders] = useState<(PurchaseOrder & { supplier: Supplier })[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';
  const hasOwnerAccess = isOwner(activeRole ?? undefined);

  const loadData = useCallback(async () => {
    if (!activeBusiness || !isCattleFeed || !hasOwnerAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPurchaseOrders(activeBusiness.id, {
        status:
          statusFilter !== 'all' ? (statusFilter as PurchaseOrderStatus) : undefined,
      });
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, isCattleFeed, hasOwnerAccess, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const mapStatusType = (
    status: PurchaseOrderStatus,
  ): 'draft' | 'paid' | 'pending' | 'warning' | 'cancelled' => {
    switch (status) {
      case 'received':
        return 'paid';
      case 'ordered':
      case 'dispatched':
        return 'pending';
      case 'cancelled':
        return 'cancelled';
      case 'draft':
      default:
        return 'draft';
    }
  };

  if (!isCattleFeed || !hasOwnerAccess) {
    return (
      <div className="p-6">
        <EmptyState
          title={t('purchaseOrders.title')}
          description={t('suppliers.ownerOnlyNotice')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('purchaseOrders.title')}
          </h1>
          <p className="text-sm text-gray-500">{t('purchaseOrders.draftNotice')}</p>
        </div>
        <Button onClick={() => navigate('/purchase-orders/new')}>
          {t('purchaseOrders.createPO')}
        </Button>
      </div>

      <div className="flex gap-2">
        {['all', 'draft', 'ordered', 'dispatched', 'received', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === st
                ? 'bg-primary-600 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {st.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title={t('purchaseOrders.title')}
          description={t('purchaseOrders.noOrders')}
          action={
            <Button onClick={() => navigate('/purchase-orders/new')}>
              {t('purchaseOrders.createPO')}
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">{t('purchaseOrders.orderNumber')}</th>
                <th className="px-6 py-3">{t('purchaseOrders.supplier')}</th>
                <th className="px-6 py-3">{t('purchaseOrders.orderDate')}</th>
                <th className="px-6 py-3">{t('purchaseOrders.status')}</th>
                <th className="px-6 py-3 text-right">{t('purchaseOrders.totalGoods')}</th>
                <th className="px-6 py-3 text-right">{t('purchaseOrders.totalLoad')}</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-sm">
              {orders.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="text-primary-600 whitespace-nowrap px-6 py-4 font-mono font-medium">
                    <Link to={`/purchase-orders/${po.id}`} className="hover:underline">
                      {po.order_number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                    {po.supplier?.name ?? 'Unknown'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                    {po.order_date}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusBadge status={mapStatusType(po.status)} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-gray-900">
                    {formatPaise(po.total_amount_paise)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-gray-500">
                    {formatPaise(po.total_load_cost_paise)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      to={`/purchase-orders/${po.id}`}
                      className="text-primary-600 hover:text-primary-900 text-xs font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
