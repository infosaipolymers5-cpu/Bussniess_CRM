/**
 * KhateUtaraPage — Customer Account Statement (Running Ledger).
 * Provides immutable running ledger calculation, opening balance, and print export.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { fetchCustomers } from '@/features/customers';
import { fetchKhateUtara, type KhateUtaraStatement } from './api/statementService';
import {
  Button,
  Input,
  Select,
  MetricCard,
  LoadingSpinner,
  EmptyState,
} from '@/components/ui';
import { todayInBusinessTz, formatDate } from '@/lib/dates';
import { formatPaise } from '@/lib/money';
import type { Customer } from '@/lib/database.types';
import {
  generateStatementPdf,
  buildStatementWhatsAppText,
  registerDocumentVersion,
  type KhateUtaraDocumentSnapshot,
} from '@/lib/pdf';

export function KhateUtaraPage() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [fromDate, setFromDate] = useState(() => {
    const today = todayInBusinessTz();
    return `${today.slice(0, 7)}-01`; // First of current month
  });
  const [toDate, setToDate] = useState(todayInBusinessTz());

  const [statement, setStatement] = useState<KhateUtaraStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [language, setLanguage] = useState<'mr' | 'en'>('mr');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Load customer dropdown
  useEffect(() => {
    if (!activeBusiness || !isCattleFeed) {
      setLoadingCustomers(false);
      return;
    }
    setLoadingCustomers(true);
    void fetchCustomers(activeBusiness.id).then((res) => {
      setCustomers(res.data);
      if (res.data[0]) {
        setSelectedCustomerId(res.data[0].id);
      }
      setLoadingCustomers(false);
    });
  }, [activeBusiness, isCattleFeed]);

  const loadStatement = useCallback(async () => {
    if (!activeBusiness || !selectedCustomerId) return;
    setLoading(true);
    const { statement: stmt } = await fetchKhateUtara(
      activeBusiness.id,
      selectedCustomerId,
      fromDate,
      toDate,
    );
    setStatement(stmt);
    setLoading(false);
  }, [activeBusiness, selectedCustomerId, fromDate, toDate]);

  useEffect(() => {
    if (selectedCustomerId) {
      void loadStatement();
    }
  }, [selectedCustomerId, loadStatement]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const buildSnapshot = useCallback((): KhateUtaraDocumentSnapshot | null => {
    if (!statement || !selectedCustomer || !activeBusiness) return null;

    return {
      firm: {
        name: activeBusiness.name,
        tagline: 'Cattle Feed & Agribusiness Suppliers',
        address: 'Main Market Yard, Sangamner',
        phone: '9876543210',
        upi_id: 'rushiagro@upi',
      },
      customer: {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        display_phone: selectedCustomer.display_phone,
        area: selectedCustomer.area,
      },
      period: {
        from_date: fromDate,
        to_date: toDate,
        generated_date: todayInBusinessTz(),
      },
      language,
      opening_balance_paise: statement.openingBalancePaise,
      entries: statement.entries.map((e) => ({
        date: e.entryDate,
        voucher_number: e.referenceNumber || '',
        particulars: e.notes || e.entryType,
        debit_paise: e.debitPaise,
        credit_paise: e.creditPaise,
        running_balance_paise: e.runningBalancePaise,
      })),
      total_debit_paise: statement.totalDebitPaise,
      total_credit_paise: statement.totalCreditPaise,
      closing_balance_paise: statement.closingBalancePaise,
      notice:
        language === 'mr'
          ? 'हे संगणकीकृत लेजर खाते उतारा आहे. सर्व व्यवहार पडताळून घ्यावेत.'
          : 'This is a computer generated account statement derived from verified customer ledger.',
      generated_at: new Date().toISOString(),
    };
  }, [statement, selectedCustomer, activeBusiness, fromDate, toDate, language]);

  const handleDownloadPdf = async () => {
    const snapshot = buildSnapshot();
    if (!snapshot || !activeBusiness) return;

    setGeneratingPdf(true);
    try {
      const { bytes, checksum } = await generateStatementPdf(snapshot);

      // Audit document version in database
      await registerDocumentVersion({
        businessId: activeBusiness.id,
        documentType: 'khate_utara',
        referenceId: snapshot.customer.id,
        documentNumber: `STMT-${snapshot.customer.id.slice(0, 8)}-${fromDate}`,
        versionNumber: 1,
        isRevised: false,
        checksum,
        renderingSnapshot: snapshot,
        fileSizeBytes: bytes.byteLength,
      });

      // Browser download
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Khate-Utara-${selectedCustomer?.name || 'Customer'}-${fromDate}-to-${toDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    const snapshot = buildSnapshot();
    if (!snapshot) return;

    const text = buildStatementWhatsAppText(snapshot);
    const encodedText = encodeURIComponent(text);
    const cleanPhone = snapshot.customer.display_phone.replace(/\D/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const whatsappUrl = `https://wa.me/${phoneParam}?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isCattleFeed) {
    return (
      <div className="rounded-card border border-amber-200 bg-amber-50 p-6 shadow-card">
        <h2 className="text-base font-semibold text-amber-800">
          {t('bills.cattleFeedNotice')}
        </h2>
        <p className="mt-1 text-sm text-amber-700">
          Khate Utara (Account Statements) and ledger accounting apply strictly to Cattle
          Feed customers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header (Hidden on Print) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('khateUtara.title')}
          </h1>
          <p className="text-sm text-slate-500">{t('khateUtara.subtitle')}</p>
        </div>
        {statement && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={() => {
                void handleDownloadPdf();
              }}
              loading={generatingPdf}
            >
              📄 {t('khateUtara.downloadPdf', 'Download PDF')}
            </Button>
            <Button variant="secondary" onClick={handleShareWhatsApp}>
              📱 {t('khateUtara.shareWhatsApp', 'WhatsApp')}
            </Button>
            <Button variant="secondary" onClick={handlePrint}>
              🖨️ {t('khateUtara.printStatement')}
            </Button>
          </div>
        )}
      </div>

      {/* Filter Selector Bar (Hidden on Print) */}
      <div className="grid grid-cols-1 gap-4 rounded-card border border-slate-200 bg-white p-4 shadow-card sm:grid-cols-5 print:hidden">
        <div className="sm:col-span-2">
          {loadingCustomers ? (
            <div className="text-xs text-slate-400">Loading customers...</div>
          ) : (
            <Select
              label={t('khateUtara.selectCustomer')}
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.display_phone})
                </option>
              ))}
            </Select>
          )}
        </div>

        <div>
          <Input
            label={t('khateUtara.fromDate')}
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div>
          <Input
            label={t('khateUtara.toDate')}
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>

        <div>
          <Select
            label={t('khateUtara.language', 'भाषा (Language)')}
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'mr' | 'en')}
          >
            <option value="mr">मराठी (Marathi)</option>
            <option value="en">English</option>
          </Select>
        </div>
      </div>

      {/* Printable Statement Header */}
      {selectedCustomer && (
        <div className="mb-4 hidden border-b-2 border-slate-900 pb-4 print:block">
          <h1 className="text-2xl font-bold text-slate-900">{activeBusiness?.name}</h1>
          <h2 className="mt-1 text-lg font-semibold text-slate-700">
            खाते उतारा (Customer Account Statement)
          </h2>
          <div className="mt-2 flex justify-between text-sm text-slate-600">
            <div>
              <p>
                <strong>Customer:</strong> {selectedCustomer.name}
              </p>
              <p>
                <strong>Phone:</strong> {selectedCustomer.display_phone}
              </p>
              {selectedCustomer.area && (
                <p>
                  <strong>Area:</strong> {selectedCustomer.area}
                </p>
              )}
            </div>
            <div className="text-right">
              <p>
                <strong>Statement Period:</strong> {formatDate(fromDate)} to{' '}
                {formatDate(toDate)}
              </p>
              <p>
                <strong>Report Date:</strong> {formatDate(todayInBusinessTz())}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      {statement && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label={t('khateUtara.openingBalance')}
            value={formatPaise(statement.openingBalancePaise)}
            subtitle={`Prior to ${formatDate(fromDate)}`}
          />
          <MetricCard
            label={t('khateUtara.debit')}
            value={formatPaise(statement.totalDebitPaise)}
            subtitle="Total Billed"
          />
          <MetricCard
            label={t('khateUtara.credit')}
            value={formatPaise(statement.totalCreditPaise)}
            subtitle="Total Payments Received"
          />
          <MetricCard
            label={t('khateUtara.closingBalance')}
            value={formatPaise(statement.closingBalancePaise)}
            subtitle="Net Due Balance"
          />
        </div>
      )}

      {/* Statement Table */}
      <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : !statement || statement.entries.length === 0 ? (
          <EmptyState
            title={t('khateUtara.noEntries')}
            description="No bills or payment entries exist for this customer within the chosen date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">{t('khateUtara.particulars')}</th>
                  <th className="px-6 py-3">Ref #</th>
                  <th className="px-6 py-3 text-right">{t('khateUtara.debit')} (+)</th>
                  <th className="px-6 py-3 text-right">{t('khateUtara.credit')} (-)</th>
                  <th className="px-6 py-3 text-right">
                    {t('khateUtara.runningBalance')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Opening balance row */}
                <tr className="bg-slate-50/50 font-medium">
                  <td className="px-6 py-3 text-slate-500">{formatDate(fromDate)}</td>
                  <td className="px-6 py-3 italic text-slate-700" colSpan={2}>
                    {t('khateUtara.openingBalance')}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-400">—</td>
                  <td className="px-6 py-3 text-right text-slate-400">—</td>
                  <td className="px-6 py-3 text-right font-bold text-slate-900">
                    {formatPaise(statement.openingBalancePaise)}
                  </td>
                </tr>

                {statement.entries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3.5 text-slate-600">
                      {formatDate(row.entryDate)}
                    </td>
                    <td className="px-6 py-3.5 font-medium capitalize text-slate-900">
                      {row.entryType.replace('_', ' ')}
                      {row.notes && (
                        <div className="text-xs font-normal text-slate-400">
                          {row.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-brand-600">
                      {row.referenceNumber || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                      {row.debitPaise > 0 ? formatPaise(row.debitPaise) : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-emerald-700">
                      {row.creditPaise > 0 ? formatPaise(row.creditPaise) : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-extrabold text-slate-900">
                      {formatPaise(row.runningBalancePaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 text-sm font-bold">
                <tr>
                  <td colSpan={3} className="px-6 py-3 text-right">
                    {t('khateUtara.closingBalance')}:
                  </td>
                  <td className="px-6 py-3 text-right text-slate-900">
                    {formatPaise(statement.totalDebitPaise)}
                  </td>
                  <td className="px-6 py-3 text-right text-emerald-700">
                    {formatPaise(statement.totalCreditPaise)}
                  </td>
                  <td className="px-6 py-3 text-right text-base text-rose-700">
                    {formatPaise(statement.closingBalancePaise)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
