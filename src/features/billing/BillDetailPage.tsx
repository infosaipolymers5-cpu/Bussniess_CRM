/**
 * BillDetailPage — Displays full invoice details, line items, and owner cancellation.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { fetchBillById, cancelBill, type BillWithDetails } from './api/billingService';
import { Button, StatusBadge, LoadingSpinner, Dialog, Input } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { formatPaise } from '@/lib/money';
import {
  generateBillPdf,
  buildBillWhatsAppText,
  registerDocumentVersion,
  type BillDocumentSnapshot,
} from '@/lib/pdf';

export function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();

  const [bill, setBill] = useState<BillWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cancellation state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const isOwner = true; // Business ownership verified on database RPC

  const buildSnapshot = useCallback((): BillDocumentSnapshot | null => {
    if (!bill || !activeBusiness) return null;

    const isRevised = (bill.revisions && bill.revisions.length > 0) || false;
    const revisionNumber = isRevised ? (bill.revisions?.length ?? 0) + 1 : 1;
    const previousOutstanding = 0;

    return {
      firm: {
        name: activeBusiness.name,
        tagline: 'Cattle Feed & Agribusiness Suppliers',
        address: 'Main Market Yard, Sangamner',
        phone: '9876543210',
        upi_id: 'rushiagro@upi',
      },
      bill: {
        id: bill.id,
        bill_number: bill.bill_number,
        financial_year: bill.financial_year,
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        status: bill.status,
        is_revised: isRevised,
        revision_number: revisionNumber,
        cancellation_reason: bill.cancellation_reason,
      },
      customer: {
        id: bill.customer?.id || '',
        name: bill.customer?.name || 'Customer',
        display_phone: bill.customer?.display_phone || '',
        area: bill.customer?.area,
      },
      items: (bill.items || []).map((item) => ({
        product_name: item.product_name_snapshot,
        unit: item.unit_snapshot,
        quantity: item.quantity,
        unit_price_paise: item.unit_price_paise,
        total_paise: item.total_paise,
      })),
      totals: {
        subtotal_paise: bill.subtotal_paise,
        discount_paise: bill.discount_paise,
        total_amount_paise: bill.total_amount_paise,
        paid_now_paise: bill.paid_now_paise,
        balance_due_paise: bill.balance_due_paise,
        previous_outstanding_paise: previousOutstanding,
        total_outstanding_paise: previousOutstanding + bill.balance_due_paise,
      },
      material_alert: undefined,
      notice:
        'This is a computer generated commercial bill, not a tax invoice. / हे संगणकीकृत व्यापारी बिल आहे.',
      generated_at: new Date().toISOString(),
    };
  }, [bill, activeBusiness]);

  const handleDownloadPdf = async () => {
    const snapshot = buildSnapshot();
    if (!snapshot || !activeBusiness) return;

    setGeneratingPdf(true);
    try {
      const { bytes, checksum } = await generateBillPdf(snapshot);

      // Audit document version in database
      await registerDocumentVersion({
        businessId: activeBusiness.id,
        documentType: snapshot.bill.is_revised ? 'revised_bill' : 'commercial_bill',
        referenceId: snapshot.bill.id,
        documentNumber: snapshot.bill.bill_number,
        versionNumber: snapshot.bill.revision_number,
        isRevised: snapshot.bill.is_revised,
        checksum,
        renderingSnapshot: snapshot,
        fileSizeBytes: bytes.byteLength,
      });

      // Browser download
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${snapshot.bill.bill_number}${snapshot.bill.is_revised ? '-REVISED' : ''}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const snapshot = buildSnapshot();
    if (!snapshot) return;

    const text = buildBillWhatsAppText(snapshot);
    const encodedText = encodeURIComponent(text);
    const cleanPhone = snapshot.customer.display_phone.replace(/\D/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const whatsappUrl = `https://wa.me/${phoneParam}?text=${encodedText}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
  };

  const loadBill = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, error: fetchErr } = await fetchBillById(id);
    if (fetchErr || !data) {
      setError(fetchErr ?? 'Bill not found');
    } else {
      setBill(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void loadBill();
  }, [loadBill]);

  const handleCancelConfirm = async () => {
    if (!activeBusiness || !bill || !cancelReason.trim()) return;
    setCancelling(true);
    const { success, error: cancelErr } = await cancelBill(
      activeBusiness.id,
      bill.id,
      cancelReason.trim(),
    );
    setCancelling(false);
    setCancelDialogOpen(false);

    if (success) {
      setActionSuccess(t('bills.cancellationSuccess'));
      void loadBill();
    } else {
      setError(cancelErr ?? 'Failed to cancel bill');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error ?? 'Bill not found'}
        </div>
        <Button variant="secondary" onClick={() => navigate('/bills')}>
          ← Back to Bills
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {bill.bill_number}
            </h1>
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
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Financial Year: {bill.financial_year} · Issued on {formatDate(bill.bill_date)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={() => {
              void handleDownloadPdf();
            }}
            loading={generatingPdf}
          >
            📄 {t('bills.downloadPdf', 'Download PDF')}
          </Button>
          <Button variant="secondary" onClick={handleShareWhatsApp}>
            📱 {t('bills.shareWhatsApp', 'WhatsApp')}
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            🖨️ {t('bills.print', 'Print')}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/bills')}>
            ← {t('common.back')}
          </Button>
          {isOwner && bill.status !== 'cancelled' && (
            <Button
              variant="destructive"
              onClick={() => {
                setCancelReason('');
                setCancelDialogOpen(true);
              }}
            >
              {t('bills.cancelBill')}
            </Button>
          )}
        </div>
      </div>

      {/* Revised Bill Notice Banner */}
      {Boolean(bill.revisions && bill.revisions.length > 0) && (
        <div className="rounded-card border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
          <div className="flex items-center gap-2 font-bold">
            <span className="rounded bg-amber-200 px-2 py-0.5 text-xs text-amber-800">
              REVISED BILL (v{(bill.revisions?.length || 0) + 1})
            </span>
            <span>सुधारित व्यापारी बिल</span>
          </div>
          <p className="mt-1 text-xs text-amber-700">
            This bill has been revised. The original bill number is retained and earlier
            versions are preserved in the audit log.
          </p>
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {actionSuccess}
        </div>
      )}

      {/* Customer Info & Metadata Card */}
      <div className="grid grid-cols-1 gap-6 rounded-card border border-slate-200 bg-white p-6 shadow-card md:grid-cols-3">
        <div>
          <span className="text-xs font-semibold uppercase text-slate-400">
            {t('customers.customer')}
          </span>
          <p className="mt-1 text-base font-bold text-slate-900">{bill.customer?.name}</p>
          <p className="text-sm text-slate-600">{bill.customer?.display_phone}</p>
          {bill.customer?.area && (
            <p className="mt-0.5 text-xs text-slate-500">Area: {bill.customer.area}</p>
          )}
        </div>

        <div>
          <span className="text-xs font-semibold uppercase text-slate-400">
            Payment & Due Status
          </span>
          <p className="mt-1 text-sm text-slate-700">
            <span className="font-medium">Due Date:</span>{' '}
            {bill.due_date ? formatDate(bill.due_date) : 'Immediate'}
          </p>
          <p className="mt-0.5 text-sm text-slate-700">
            <span className="font-medium">Paid Now:</span>{' '}
            {formatPaise(bill.paid_now_paise)}
          </p>
        </div>

        <div>
          <span className="text-xs font-semibold uppercase text-slate-400">
            Outstanding Due
          </span>
          <p className="mt-1 text-2xl font-extrabold text-rose-700">
            {formatPaise(bill.balance_due_paise)}
          </p>
        </div>
      </div>

      {/* Cancellation Notice Banner */}
      {bill.status === 'cancelled' && (
        <div className="space-y-1 rounded-card border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">This bill has been cancelled.</p>
          <p>Reason: {bill.cancellation_reason || 'No reason provided'}</p>
          {bill.cancelled_at && (
            <p className="text-xs text-rose-600">
              Cancelled on: {formatDate(bill.cancelled_at)}
            </p>
          )}
        </div>
      )}

      {/* Line Items Table */}
      <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{t('bills.items')}</h2>
        </div>
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-6 py-3">#</th>
              <th className="px-6 py-3">{t('products.productName')}</th>
              <th className="px-6 py-3">{t('products.unit')}</th>
              <th className="px-6 py-3 text-right">Quantity</th>
              <th className="px-6 py-3 text-right">Rate</th>
              <th className="px-6 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(bill.items || []).map((item, idx) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-400">{idx + 1}</td>
                <td className="px-6 py-4 font-medium text-slate-900">
                  {item.product_name_snapshot}
                </td>
                <td className="px-6 py-4 capitalize text-slate-600">
                  {item.unit_snapshot}
                </td>
                <td className="px-6 py-4 text-right font-medium">{item.quantity}</td>
                <td className="px-6 py-4 text-right font-mono">
                  {formatPaise(item.unit_price_paise)}
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-900">
                  {formatPaise(item.total_paise)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-sm">
            <tr>
              <td colSpan={5} className="px-6 py-2 text-right font-medium text-slate-600">
                {t('bills.subtotal')}:
              </td>
              <td className="px-6 py-2 text-right font-semibold text-slate-900">
                {formatPaise(bill.subtotal_paise)}
              </td>
            </tr>
            {bill.discount_paise > 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-2 text-right font-medium text-slate-600"
                >
                  {t('bills.discount')}:
                </td>
                <td className="px-6 py-2 text-right font-semibold text-emerald-700">
                  - {formatPaise(bill.discount_paise)}
                </td>
              </tr>
            )}
            <tr className="border-t border-slate-200">
              <td
                colSpan={5}
                className="px-6 py-3 text-right text-base font-bold text-slate-900"
              >
                {t('bills.totalAmount')}:
              </td>
              <td className="px-6 py-3 text-right text-base font-bold text-slate-900">
                {formatPaise(bill.total_amount_paise)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Cancellation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        title={t('bills.cancelBill')}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{t('bills.cancelConfirm')}</p>
          <div>
            <Input
              label={t('bills.cancelReason')}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Order cancelled by buyer / input correction"
              required
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-3">
            <Button
              variant="secondary"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelling}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void handleCancelConfirm();
              }}
              loading={cancelling}
              disabled={!cancelReason.trim()}
            >
              {t('bills.cancelBill')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
