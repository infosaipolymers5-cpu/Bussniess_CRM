/**
 * DashboardPage — Rushi CRM platform authoritative executive dashboard.
 *
 * Rules:
 * - Strictly derives monetary totals from non-cancelled bills and payment records.
 * - Distinctly surfaces Sales vs Collections.
 * - Multi-business scope support (Cattle Feed & PVC).
 * - Action queues for follow-ups, birthdays, and delivery dispatches.
 * - Displays backup health and operational warnings.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { MetricCard } from '@/components/ui';
import { dashboardService, type DashboardMetrics } from './dashboardService';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeBusiness } = useBusiness();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getDashboardProjection(
        activeBusiness?.id || null,
      );
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
      setError('Unable to load authoritative metrics from server.');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="space-y-6">
      {/* Page Title & Scope */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('nav.dashboard', 'Executive Dashboard')} / मुख्य नियंत्रण कक्ष
          </h1>
          <p className="text-sm text-slate-500">
            {activeBusiness
              ? `${activeBusiness.name} (${activeBusiness.kind === 'cattle_feed' ? 'Cattle Feed' : 'PVC & Irrigation'})`
              : 'Combined Business Scope / एकत्रित व्यवसाय'}
          </p>
        </div>

        <button
          onClick={() => {
            void loadMetrics();
          }}
          className="self-start text-xs font-medium text-blue-600 hover:text-blue-800 sm:self-auto"
        >
          ↻ Refresh Ledger Snapshot
        </button>
      </div>

      {/* Backup Health Warning Banner */}
      {metrics && !metrics.isBackupHealthy && metrics.backupWarning && (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <span className="text-sm font-bold text-amber-900">Backup Warning:</span>
              <p className="text-xs text-amber-800">{metrics.backupWarning}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/backups')}
            className="rounded bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Manage Backups
          </button>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Row 1: Primary Reconciled Monetary & Operational Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Outstanding / एकूण बाकी"
          value={
            metrics
              ? `₹${(metrics.totalOutstandingPaise / 100).toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}`
              : '—'
          }
          subtitle={
            metrics
              ? `${metrics.dueFollowUpsCount} debtor customers`
              : 'Awaiting ledger calculation'
          }
          icon="💳"
          loading={loading}
        />
        <MetricCard
          label="Today's Collections / आजची जमा"
          value={
            metrics
              ? `₹${(metrics.todaysCollectionsPaise / 100).toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}`
              : '—'
          }
          subtitle={
            metrics
              ? `${metrics.todaysPaymentsCount} recorded payments`
              : 'Awaiting payment ledger'
          }
          icon="💰"
          loading={loading}
        />
        <MetricCard
          label="Today's Sales / आजची विक्री"
          value={
            metrics
              ? `₹${(metrics.todaysSalesPaise / 100).toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}`
              : '—'
          }
          subtitle={
            metrics
              ? `${metrics.todaysBillsCount} active bills issued`
              : 'Awaiting commercial bills'
          }
          icon="📈"
          loading={loading}
        />
        <MetricCard
          label="Follow-Up Queue / स्मरणपत्रे"
          value={metrics ? String(metrics.dueFollowUpsCount) : '—'}
          subtitle={
            metrics?.todaysBirthdaysCount
              ? `Includes ${metrics.todaysBirthdaysCount} birthdays today`
              : 'Pending debtor follow-ups'
          }
          icon="⏰"
          loading={loading}
        />
      </div>

      {/* Main Grid: Overview & Action Queue */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Financial & Delivery Highlights */}
        <div className="space-y-6 lg:col-span-2">
          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={() => navigate('/billing')}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-500"
            >
              <span className="text-xl">🧾</span>
              <div className="mt-2 text-sm font-semibold text-slate-800">New Bill</div>
              <span className="text-xs text-slate-400">नवीन बिल बनवा</span>
            </button>
            <button
              onClick={() => navigate('/payments')}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-500"
            >
              <span className="text-xl">💵</span>
              <div className="mt-2 text-sm font-semibold text-slate-800">
                Record Payment
              </div>
              <span className="text-xs text-slate-400">पैसे जमा करा</span>
            </button>
            <button
              onClick={() => navigate('/reports')}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-500"
            >
              <span className="text-xl">📊</span>
              <div className="mt-2 text-sm font-semibold text-slate-800">
                Reports & Overdue
              </div>
              <span className="text-xs text-slate-400">अहवाल व बाकी</span>
            </button>
            <button
              onClick={() => navigate('/delivery-trips')}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-500"
            >
              <span className="text-xl">🚚</span>
              <div className="mt-2 text-sm font-semibold text-slate-800">
                Delivery Trips
              </div>
              <span className="text-xs text-slate-400">डिलिव्हरी फेऱ्या</span>
            </button>
          </div>

          {/* Ledger Health Card */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-slate-900">
              Financial Status & Business Summary
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              All financial figures are strictly calculated in integer paise and
              reconciled against authoritative ledgers. Cancelled bills are fully excluded
              from active sales.
            </p>

            <div className="grid grid-cols-1 gap-4 border-t pt-2 sm:grid-cols-3">
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400">
                  Active Customers
                </span>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {metrics?.totalCustomersCount ?? 0}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400">
                  Scheduled Dispatches
                </span>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {metrics?.pendingDeliveryTripsCount ?? 0}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400">
                  Feed Finish Alerts
                </span>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {metrics?.feedFinishAlertsCount ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Today's Action Queue */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Today&apos;s Action Queue / आजची कामे
              </h2>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                {metrics?.recentActionQueue.length ?? 0}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading action queue...
              </div>
            ) : !metrics?.recentActionQueue.length ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No immediate actions pending today. All tasks up to date!
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.recentActionQueue.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 p-3 transition hover:bg-slate-100"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500">{item.subtitle}</div>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                        item.badgeColor === 'purple'
                          ? 'bg-purple-100 text-purple-800'
                          : item.badgeColor === 'amber'
                            ? 'bg-amber-100 text-amber-800'
                            : item.badgeColor === 'emerald'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.badgeText}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 border-t pt-4">
            <button
              onClick={() => navigate('/reminders')}
              className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Open Full Reminder Queue →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
