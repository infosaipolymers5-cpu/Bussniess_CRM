import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { Button } from '@/components/ui/Button';
import {
  reportService,
  type SalesCollectionSummary,
  type OverdueDebtorRow,
} from './reportService';

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();

  const [activeTab, setActiveTab] = useState<'sales_collections' | 'overdue'>(
    'sales_collections',
  );
  const [scope, setScope] = useState<'cattle_feed' | 'pvc' | 'combined'>('combined');

  // Dates (default to start of current month to today)
  const todayStr = new Date().toISOString().split('T')[0] ?? '';
  const firstOfMonthStr =
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0] ?? '';

  const [startDate, setStartDate] = useState(firstOfMonthStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [loading, setLoading] = useState(false);
  const [salesSummary, setSalesSummary] = useState<SalesCollectionSummary | null>(null);
  const [overdueRows, setOverdueRows] = useState<OverdueDebtorRow[]>([]);
  const [sortBy, setSortBy] = useState<'amount' | 'days'>('amount');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const bId = activeBusiness?.id || null;
      if (activeTab === 'sales_collections') {
        const summary = await reportService.getSalesAndCollections(
          bId,
          startDate,
          endDate,
          scope,
        );
        setSalesSummary(summary);
      } else {
        const debtors = await reportService.getOverdueDebtors(bId, scope);
        setOverdueRows(debtors);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id, activeTab, startDate, endDate, scope]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleExportSalesCsv = () => {
    if (!salesSummary) return;
    const headers = [
      'Date',
      'Sales (₹)',
      'Collections (₹)',
      'Bills Count',
      'Payments Count',
      'Net Cashflow (₹)',
    ];
    const rows = salesSummary.breakdown.map((r) => [
      r.date,
      (r.salesPaise / 100).toFixed(2),
      (r.collectionsPaise / 100).toFixed(2),
      r.billsCount,
      r.paymentsCount,
      ((r.collectionsPaise - r.salesPaise) / 100).toFixed(2),
    ]);
    const filename = `sales-collections-${startDate}-to-${endDate}.csv`;
    reportService.exportToCsv(filename, headers, rows);
    void reportService.recordExportLog(
      activeBusiness?.id || null,
      {
        export_type: 'sales_collections',
        scope,
        date_range_start: startDate,
        date_range_end: endDate,
        file_format: 'csv',
      },
      rows.length,
    );
  };

  const handleExportOverdueCsv = () => {
    if (!overdueRows.length) return;
    const headers = [
      'Customer Name',
      'Phone',
      'Area',
      'Outstanding (₹)',
      'Days Overdue',
      'Oldest Bill Date',
      'Oldest Bill Number',
    ];
    const rows = overdueRows.map((d) => [
      d.customerName,
      d.phone,
      d.area || '-',
      (d.outstandingPaise / 100).toFixed(2),
      d.daysOverdue,
      d.oldestBillDate || '-',
      d.oldestBillNumber || '-',
    ]);
    const filename = `overdue-debtors-${todayStr}.csv`;
    reportService.exportToCsv(filename, headers, rows);
    void reportService.recordExportLog(
      activeBusiness?.id || null,
      {
        export_type: 'overdue_debtors',
        scope,
        date_range_start: todayStr,
        date_range_end: todayStr,
        file_format: 'csv',
      },
      rows.length,
    );
  };

  const sortedOverdueRows = [...overdueRows].sort((a, b) => {
    if (sortBy === 'amount') {
      return b.outstandingPaise - a.outstandingPaise;
    }
    return b.daysOverdue - a.daysOverdue;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('reports.title', 'Financial & Operational Reports')} / आर्थिक अहवाल
          </h1>
          <p className="text-sm text-gray-500">
            Authoritative sales and collections reporting, debt aging, and compliance
            exports.
          </p>
        </div>

        {/* Scope Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Scope:</label>
          <select
            value={scope}
            onChange={(e) =>
              setScope(e.target.value as 'cattle_feed' | 'pvc' | 'combined')
            }
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="combined">Combined / एकत्रित</option>
            <option value="cattle_feed">Cattle Feed / पशुखाद्य</option>
            <option value="pvc">PVC & Irrigation / पीव्हीसी पाईप्स</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('sales_collections')}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'sales_collections'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Sales vs Collections / विक्री व जमा
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'overdue'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Overdue Debtors / थकबाकीदार यादी
          </button>
        </nav>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {activeTab === 'sales_collections' ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Period:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void loadData();
              }}
            >
              Filter / शोधा
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Sort By:</span>
            <button
              onClick={() => setSortBy('amount')}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                sortBy === 'amount'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Highest Amount
            </button>
            <button
              onClick={() => setSortBy('days')}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                sortBy === 'days'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              Most Days Overdue
            </button>
          </div>
        )}

        <div>
          {activeTab === 'sales_collections' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSalesCsv}
              disabled={!salesSummary || salesSummary.breakdown.length === 0}
            >
              Export CSV / डाऊनलोड
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportOverdueCsv}
              disabled={overdueRows.length === 0}
            >
              Export CSV / डाऊनलोड
            </Button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="py-16 text-center text-gray-500">
          Loading authoritative report data...
        </div>
      ) : activeTab === 'sales_collections' && salesSummary ? (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-gray-400">
                Total Sales
              </span>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ₹
                {(salesSummary.totalSalesPaise / 100).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </p>
              <span className="mt-1 block text-xs text-gray-500">
                {salesSummary.totalBillsCount} active bills (cancelled excluded)
              </span>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-gray-400">
                Total Collections
              </span>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                ₹
                {(salesSummary.totalCollectionsPaise / 100).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </p>
              <span className="mt-1 block text-xs text-gray-500">
                {salesSummary.totalPaymentsCount} recorded payments
              </span>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-gray-400">
                Net Cashflow
              </span>
              <p
                className={`mt-1 text-2xl font-bold ${
                  salesSummary.netCashflowPaise >= 0
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                ₹
                {(salesSummary.netCashflowPaise / 100).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </p>
              <span className="mt-1 block text-xs text-gray-500">
                Collections - Sales
              </span>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-gray-400">
                Reconciliation Ratio
              </span>
              <p className="mt-1 text-2xl font-bold text-blue-600">
                {salesSummary.totalSalesPaise > 0
                  ? `${Math.round((salesSummary.totalCollectionsPaise / salesSummary.totalSalesPaise) * 100)}%`
                  : 'N/A'}
              </p>
              <span className="mt-1 block text-xs text-gray-500">
                Collected vs Billed
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="font-semibold text-gray-900">Daily Ledger Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-gray-500">
                      Sales (₹)
                    </th>
                    <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-gray-500">
                      Bills
                    </th>
                    <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-gray-500">
                      Collections (₹)
                    </th>
                    <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-gray-500">
                      Payments
                    </th>
                    <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-gray-500">
                      Net (₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {salesSummary.breakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No transactions recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    salesSummary.breakdown.map((row) => (
                      <tr key={row.date} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {row.date}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-900">
                          ₹
                          {(row.salesPaise / 100).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-500">
                          {row.billsCount}
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-emerald-600">
                          ₹
                          {(row.collectionsPaise / 100).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-500">
                          {row.paymentsCount}
                        </td>
                        <td
                          className={`px-6 py-3 text-right font-semibold ${
                            row.collectionsPaise >= row.salesPaise
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          ₹
                          {((row.collectionsPaise - row.salesPaise) / 100).toLocaleString(
                            'en-IN',
                            {
                              minimumFractionDigits: 2,
                            },
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'overdue' ? (
        <div className="space-y-6">
          {/* Overdue Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-gray-400">
                Total Outstanding
              </span>
              <p className="mt-1 text-2xl font-bold text-red-600">
                ₹
                {(
                  overdueRows.reduce((acc, cur) => acc + cur.outstandingPaise, 0) / 100
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <span className="mt-1 block text-xs text-gray-500">
                Cumulative uncollected credit
              </span>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-gray-400">
                Debtor Count
              </span>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {overdueRows.length}
              </p>
              <span className="mt-1 block text-xs text-gray-500">
                Customers with balance &gt; 0
              </span>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-gray-400">
                Severe Overdue (&gt;30 Days)
              </span>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {overdueRows.filter((r) => r.daysOverdue > 30).length}
              </p>
              <span className="mt-1 block text-xs text-gray-500">
                Requiring immediate follow-up
              </span>
            </div>
          </div>

          {/* Debtors List Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="font-semibold text-gray-900">Overdue Debtors Aging Table</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-gray-500">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-gray-500">
                      Phone / Area
                    </th>
                    <th className="px-6 py-3 text-right font-medium uppercase tracking-wider text-gray-500">
                      Outstanding (₹)
                    </th>
                    <th className="px-6 py-3 text-center font-medium uppercase tracking-wider text-gray-500">
                      Days Overdue
                    </th>
                    <th className="px-6 py-3 text-left font-medium uppercase tracking-wider text-gray-500">
                      Oldest Bill
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sortedOverdueRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 text-center font-medium text-emerald-600"
                      >
                        No outstanding debt! All accounts are settled.
                      </td>
                    </tr>
                  ) : (
                    sortedOverdueRows.map((r) => (
                      <tr key={r.customerId} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {r.customerName}
                        </td>
                        <td className="px-6 py-3 text-gray-500">
                          <div>{r.phone}</div>
                          {r.area && (
                            <div className="text-xs text-gray-400">{r.area}</div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-red-600">
                          ₹
                          {(r.outstandingPaise / 100).toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-6 py-3 text-center">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              r.daysOverdue > 30
                                ? 'bg-red-100 text-red-800'
                                : r.daysOverdue > 14
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {r.daysOverdue} days
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-500">
                          {r.oldestBillDate ? (
                            <div>
                              <span>{r.oldestBillDate}</span>
                              <span className="ml-1 text-gray-400">
                                ({r.oldestBillNumber})
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
