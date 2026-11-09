/**
 * ProfitDashboardPage — Owner-only financial and profitability dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { isOwner } from '@/lib/permissions';
import {
  fetchOwnerProfitMetrics,
  hasOwnerPinEnabled,
  type OwnerProfitMetrics,
} from './api/profitabilityService';
import { OwnerPinDialog } from './OwnerPinDialog';
import { Button, LoadingSpinner, EmptyState, MetricCard, Input } from '@/components/ui';
import { formatPaise } from '@/lib/money';

export function ProfitDashboardPage() {
  const { t } = useTranslation();
  const { activeBusiness, activeRole } = useBusiness();

  const [metrics, setMetrics] = useState<OwnerProfitMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // PIN security states
  const [isPinProtected, setIsPinProtected] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [settingNewPin, setSettingNewPin] = useState(false);

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';
  const hasOwnerAccess = isOwner(activeRole ?? undefined);

  // Check if PIN is configured
  useEffect(() => {
    async function checkPin() {
      if (!activeBusiness || !isCattleFeed || !hasOwnerAccess) return;
      const enabled = await hasOwnerPinEnabled(activeBusiness.id);
      setIsPinProtected(enabled);
      if (!enabled) {
        setIsUnlocked(true);
      }
    }
    void checkPin();
  }, [activeBusiness, isCattleFeed, hasOwnerAccess]);

  const loadMetrics = useCallback(async () => {
    if (!activeBusiness || !isCattleFeed || !hasOwnerAccess || !isUnlocked) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchOwnerProfitMetrics(
        activeBusiness.id,
        fromDate || undefined,
        toDate || undefined,
      );
      setMetrics(data);
    } catch {
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, isCattleFeed, hasOwnerAccess, isUnlocked, fromDate, toDate]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  if (!isCattleFeed || !hasOwnerAccess) {
    return (
      <div className="p-6">
        <EmptyState
          title={t('profitability.title')}
          description={t('expenses.ownerOnlyNotice')}
        />
      </div>
    );
  }

  // Locked state
  if (isPinProtected && !isUnlocked) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4 p-6 text-center">
        <div className="bg-primary-100 rounded-full p-4 text-3xl">🔒</div>
        <h2 className="text-xl font-bold text-gray-900">{t('profitability.title')}</h2>
        <p className="max-w-md text-sm text-gray-500">
          This dashboard contains private financial metrics, cost structures, and margins.
          Please enter your owner security PIN to view.
        </p>
        <Button onClick={() => setPinDialogOpen(true)}>
          {t('profitability.unlock')}
        </Button>

        {activeBusiness && (
          <OwnerPinDialog
            open={pinDialogOpen}
            onClose={() => setPinDialogOpen(false)}
            businessId={activeBusiness.id}
            isSettingNewPin={false}
            onSuccess={() => setIsUnlocked(true)}
          />
        )}
      </div>
    );
  }

  const grossMarginPercent =
    metrics && metrics.net_sales_paise > 0
      ? ((metrics.gross_profit_paise / metrics.net_sales_paise) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {t('profitability.title')}
          </h1>
          <p className="text-sm text-gray-500">{t('profitability.subtitle')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isPinProtected && (
            <Button variant="secondary" onClick={() => setIsUnlocked(false)}>
              {t('profitability.lock')}
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => {
              setSettingNewPin(true);
              setPinDialogOpen(true);
            }}
          >
            {isPinProtected ? 'Change PIN' : 'Set Security PIN'}
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Print Report
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      ) : !metrics ? (
        <EmptyState
          title={t('profitability.title')}
          description="No financial metrics found for selected period"
        />
      ) : (
        <div className="space-y-6">
          {/* Top Row: Sales, COGS, Gross Profit */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label={t('profitability.netSales')}
              value={formatPaise(metrics.net_sales_paise)}
            />
            <MetricCard
              label={t('profitability.cogs')}
              value={formatPaise(metrics.cogs_paise)}
            />
            <MetricCard
              label={`${t('profitability.grossProfit')} (${grossMarginPercent}%)`}
              value={formatPaise(metrics.gross_profit_paise)}
            />
          </div>

          {/* Middle Row: Expenses, Net Profit, Collections */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label={t('profitability.operatingExpenses')}
              value={formatPaise(metrics.operating_expenses_paise)}
            />
            <MetricCard
              label={t('profitability.netProfit')}
              value={formatPaise(metrics.net_profit_paise)}
            />
            <MetricCard
              label={t('profitability.collections')}
              value={formatPaise(metrics.collections_paise)}
            />
          </div>

          {/* Bottom Row: Receivables, Payables, Expected Profit */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label={t('profitability.receivables')}
              value={formatPaise(metrics.total_receivables_paise)}
            />
            <MetricCard
              label={t('profitability.payables')}
              value={formatPaise(metrics.total_payables_paise)}
            />
            <MetricCard
              label={t('profitability.expectedProfit')}
              value={formatPaise(metrics.expected_profit_paise)}
            />
          </div>

          {/* Product Margins Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h2 className="text-sm font-semibold text-gray-900">
                {t('profitability.productMargins')}
              </h2>
            </div>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-3">{t('profitability.productName')}</th>
                  <th className="px-6 py-3 text-right">
                    {t('profitability.quantitySold')}
                  </th>
                  <th className="px-6 py-3 text-right">
                    {t('profitability.salesValue')}
                  </th>
                  <th className="px-6 py-3 text-right">{t('profitability.cogsValue')}</th>
                  <th className="px-6 py-3 text-right">
                    {t('profitability.grossProfit')}
                  </th>
                  <th className="px-6 py-3 text-right">
                    {t('profitability.marginPercent')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {metrics.product_margins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No sales or cost snapshots recorded in this period.
                    </td>
                  </tr>
                ) : (
                  metrics.product_margins.map((pm, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                        {pm.product_name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-gray-700">
                        {pm.total_quantity}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-gray-900">
                        {formatPaise(pm.total_sales_paise)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-gray-500">
                        {formatPaise(pm.total_cogs_paise)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-bold text-emerald-700">
                        {formatPaise(pm.gross_profit_paise)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-gray-900">
                        {pm.margin_percent}%
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
        <OwnerPinDialog
          open={pinDialogOpen}
          onClose={() => {
            setPinDialogOpen(false);
            setSettingNewPin(false);
          }}
          businessId={activeBusiness.id}
          isSettingNewPin={settingNewPin}
          onSuccess={() => {
            setIsUnlocked(true);
            setIsPinProtected(true);
            void loadMetrics();
          }}
        />
      )}
    </div>
  );
}
