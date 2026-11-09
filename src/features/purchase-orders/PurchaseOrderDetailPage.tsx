/**
 * PurchaseOrderDetailPage — Order invoice view, status transition,
 * rate visibility switch with disclosure warning, and gate-pass mode.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { isOwner } from '@/lib/permissions';
import {
  fetchPurchaseOrderById,
  transitionPurchaseOrderStatus,
  type PurchaseOrderDetail,
} from './api/purchaseOrderService';
import {
  Button,
  LoadingSpinner,
  EmptyState,
  StatusBadge,
  Dialog,
  Input,
} from '@/components/ui';
import { formatPaise } from '@/lib/money';
import type { PurchaseOrderStatus } from '@/lib/database.types';
import {
  generatePurchaseOrderPdf,
  registerDocumentVersion,
  type PurchaseOrderDocumentSnapshot,
} from '@/lib/pdf';

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeBusiness, activeRole } = useBusiness();

  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [hideRates, setHideRates] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const hasOwnerAccess = isOwner(activeRole ?? undefined);

  const handleDownloadPdf = async () => {
    if (!order || !activeBusiness) return;

    const isGatePass = hideRates;
    const snapshot: PurchaseOrderDocumentSnapshot = {
      firm: {
        name: activeBusiness.name,
        tagline: 'Cattle Feed & Agribusiness Suppliers',
        address: 'Main Market Yard, Sangamner',
        phone: '9876543210',
        gstin: '27AABCR1234F1Z5',
      },
      po: {
        id: order.id,
        order_number: order.order_number,
        financial_year: order.financial_year,
        order_date: order.order_date,
        expected_delivery_date: order.expected_delivery_date,
        status: order.status,
        show_rates: !isGatePass,
        is_gate_pass: isGatePass,
      },
      supplier: {
        id: order.supplier?.id || '',
        name: order.supplier?.name || 'Supplier',
        phone: order.supplier?.phone,
        address: order.supplier?.address,
        gstin: order.supplier?.gstin,
      },
      items: (order.items || []).map((item) => ({
        product_name: item.product_name,
        unit: 'bag',
        quantity: item.quantity_bags,
        customer_reference:
          item.customer_name ||
          (item.customer_id ? `Cust: ${item.customer_id.slice(0, 8)}` : null),
        unit_price_paise: isGatePass ? undefined : item.unit_rate_paise,
        total_paise: isGatePass ? undefined : item.total_paise,
      })),
      total_amount_paise: isGatePass ? null : order.total_amount_paise,
      notes: order.notes,
      terms_and_conditions: [
        'Delivery must match specified units and grades.',
        'Payment settled according to agreed credit terms upon physical receipt verification.',
      ],
      notice: isGatePass
        ? 'GATE PASS / DELIVERY CHALLAN - Issued for transport verification. Rates strictly omitted.'
        : 'Official Purchase Order - Confidential commercial document.',
      generated_at: new Date().toISOString(),
    };

    setGeneratingPdf(true);
    try {
      const { bytes, checksum } = await generatePurchaseOrderPdf(snapshot);

      await registerDocumentVersion({
        businessId: activeBusiness.id,
        documentType: 'purchase_order',
        referenceId: order.id,
        documentNumber: order.order_number,
        versionNumber: 1,
        isRevised: false,
        checksum,
        renderingSnapshot: snapshot,
        fileSizeBytes: bytes.byteLength,
      });

      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order.order_number}${isGatePass ? '-GATE-PASS' : ''}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!id || !hasOwnerAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchPurchaseOrderById(id);
      setOrder(data);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id, hasOwnerAccess]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleStatusChange = async (toStatus: PurchaseOrderStatus, notes?: string) => {
    if (!order) return;
    setActionLoading(true);
    try {
      const transitionKey = `trans_${order.id}_${toStatus}_${Date.now()}`;
      await transitionPurchaseOrderStatus(order.id, toStatus, transitionKey, notes);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    setCancelDialogOpen(false);
    await handleStatusChange('cancelled', cancelReason.trim());
    setCancelReason('');
  };

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

  if (!hasOwnerAccess) {
    return (
      <div className="p-6">
        <EmptyState
          title={t('purchaseOrders.title')}
          description={t('suppliers.ownerOnlyNotice')}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <EmptyState
          title={t('purchaseOrders.title')}
          description="Purchase order not found"
          action={
            <Button onClick={() => navigate('/purchase-orders')}>
              Back to Purchase Orders
            </Button>
          }
        />
      </div>
    );
  }

  const grandTotalPaise = order.total_amount_paise + order.total_load_cost_paise;
  const totalBags = order.items.reduce((sum, item) => sum + item.quantity_bags, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="secondary" onClick={() => navigate('/purchase-orders')}>
            ← Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {order.order_number}
          </h1>
          <StatusBadge status={mapStatusType(order.status)} />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Rate visibility toggle */}
          <Button variant="secondary" onClick={() => setHideRates(!hideRates)}>
            {hideRates ? t('purchaseOrders.showRates') : t('purchaseOrders.hideRates')}
          </Button>

          {/* Workflow transitions */}
          {order.status === 'draft' && (
            <Button
              onClick={() => {
                void handleStatusChange('ordered');
              }}
              disabled={actionLoading}
            >
              {t('purchaseOrders.markOrdered')}
            </Button>
          )}

          {order.status === 'ordered' && (
            <Button
              onClick={() => {
                void handleStatusChange('received');
              }}
              disabled={actionLoading}
            >
              {t('purchaseOrders.markReceived')}
            </Button>
          )}

          {order.status !== 'cancelled' && order.status !== 'received' && (
            <Button
              variant="destructive"
              onClick={() => setCancelDialogOpen(true)}
              disabled={actionLoading}
            >
              {t('purchaseOrders.cancelOrder')}
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => {
              void handleDownloadPdf();
            }}
            loading={generatingPdf}
          >
            📄 {t('purchaseOrders.downloadPdf', 'Download PDF')}
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            🖨️ Print / Pass
          </Button>
        </div>
      </div>

      {/* Selling/Purchase Rate Disclosure Warning Banner */}
      {!hideRates && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <span className="font-semibold">
            {t('purchaseOrders.rateVisibilityWarning')}
          </span>
        </div>
      )}

      {/* Main Order Card */}
      <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4 sm:grid-cols-4">
          <div>
            <span className="text-xs text-gray-500">{t('purchaseOrders.supplier')}</span>
            <p className="font-semibold text-gray-900">{order.supplier?.name}</p>
            {order.supplier?.phone && (
              <p className="text-xs text-gray-500">{order.supplier.phone}</p>
            )}
          </div>
          <div>
            <span className="text-xs text-gray-500">{t('purchaseOrders.orderDate')}</span>
            <p className="font-semibold text-gray-900">{order.order_date}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">
              {t('purchaseOrders.deliveryDate')}
            </span>
            <p className="font-semibold text-gray-900">
              {order.expected_delivery_date ?? 'Immediate'}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Total Quantity</span>
            <p className="font-semibold text-gray-900">{totalBags} Bags</p>
          </div>
        </div>

        {/* Items Table */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            {t('purchaseOrders.items')}
          </h2>
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2">Item Description</th>
                <th className="px-4 py-2">Customer Link</th>
                <th className="px-4 py-2 text-right">Bags</th>
                {!hideRates && (
                  <>
                    <th className="px-4 py-2 text-right">Base Rate</th>
                    <th className="px-4 py-2 text-right">Effective Rate</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {item.product_name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.customer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {item.quantity_bags}
                  </td>
                  {!hideRates && (
                    <>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatPaise(item.unit_rate_paise)}
                      </td>
                      <td className="text-primary-700 px-4 py-3 text-right font-medium">
                        {formatPaise(item.effective_cost_paise)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatPaise(item.total_paise)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Load Costs Table (Only shown if rates are not hidden) */}
        {!hideRates && order.load_costs.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
              {t('purchaseOrders.loadCosts')}
            </h2>
            <div className="space-y-1 rounded border border-gray-100 bg-gray-50 p-3 text-xs">
              {order.load_costs.map((lc) => (
                <div key={lc.id} className="flex justify-between text-gray-700">
                  <span>
                    {lc.description} ({lc.allocation_method}):
                  </span>
                  <span className="font-mono font-medium">
                    {formatPaise(lc.amount_paise)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financial Totals */}
        {!hideRates && (
          <div className="space-y-2 border-t border-gray-200 pt-4 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>{t('purchaseOrders.totalGoods')}:</span>
              <span className="font-mono">{formatPaise(order.total_amount_paise)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>{t('purchaseOrders.totalLoad')}:</span>
              <span className="font-mono">
                {formatPaise(order.total_load_cost_paise)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
              <span>{t('purchaseOrders.grandTotal')}:</span>
              <span className="text-primary-700 font-mono">
                {formatPaise(grandTotalPaise)}
              </span>
            </div>
          </div>
        )}

        {order.notes && (
          <div className="rounded bg-gray-50 p-3 text-xs text-gray-600">
            <span className="font-semibold">Notes:</span> {order.notes}
          </div>
        )}
      </div>

      {/* Cancellation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        title={t('purchaseOrders.cancelOrder')}
      >
        <form
          onSubmit={(e) => {
            void handleCancelSubmit(e);
          }}
          className="space-y-4"
        >
          <p className="text-sm text-gray-600">
            Are you sure you want to cancel this order? If confirmed payables were posted,
            an auditable reversal will be created.
          </p>
          <Input
            label="Cancellation Reason"
            type="text"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Order cancelled by supplier"
            required
          />
          <div className="flex justify-end space-x-2 pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setCancelDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" type="submit">
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
