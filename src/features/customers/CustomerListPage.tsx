/**
 * CustomerListPage — Search, filter, and manage business customers.
 * Mobile-responsive: Desktop table, mobile card list.
 * Speed path: Add Customer & PVC Quick-Add (3-field).
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import {
  fetchCustomers,
  fetchDuplicateReviews,
  type CustomerWithMeta,
} from './api/customerService';
import { Button, Input, EmptyState, LoadingSpinner } from '@/components/ui';
import { CustomerFormDialog } from './CustomerFormDialog';
import { PvcQuickAddDialog } from './PvcQuickAddDialog';
import type { DuplicateReview } from '@/lib/database.types';

export function CustomerListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeBusiness } = useBusiness();

  const [customers, setCustomers] = useState<CustomerWithMeta[]>([]);
  const [duplicateReviews, setDuplicateReviews] = useState<DuplicateReview[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pvcQuickAddOpen, setPvcQuickAddOpen] = useState(false);

  const loadCustomers = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);

    const [custRes, dupRes] = await Promise.all([
      fetchCustomers(activeBusiness.id, { search }),
      fetchDuplicateReviews(activeBusiness.id),
    ]);

    setCustomers(custRes.data);
    setDuplicateReviews(dupRes.data.filter((r) => r.status === 'pending'));
    setLoading(false);
  }, [activeBusiness, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadCustomers]);

  return (
    <div className="space-y-6">
      {/* Page Header & Primary Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('customers.title')}
          </h1>
          <p className="text-sm text-slate-500">
            {activeBusiness?.name} · {customers.length} records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeBusiness?.kind === 'pvc' && (
            <Button
              variant="secondary"
              onClick={() => setPvcQuickAddOpen(true)}
              className="border-cyan-500 bg-cyan-50 text-cyan-800 hover:bg-cyan-100"
            >
              ⚡ {t('customers.pvcQuickAdd')}
            </Button>
          )}

          <Button variant="primary" onClick={() => setAddDialogOpen(true)}>
            + {t('customers.addCustomer')}
          </Button>
        </div>
      </div>

      {/* Duplicate Review Banner if pending collisions exist */}
      {duplicateReviews.length > 0 && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-lg">
              ⚠️
            </span>
            <div>
              <strong>Duplicate collisions pending:</strong> {duplicateReviews.length}{' '}
              phone collision(s) require review.
            </div>
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card">
        <Input
          label=""
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('customers.searchPlaceholder')}
        />
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          icon="👥"
          title={t('customers.noCustomers')}
          description="Add a customer or run PVC Quick-Add to start building records."
          action={
            <Button variant="primary" onClick={() => setAddDialogOpen(true)}>
              + {t('customers.addCustomer')}
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden overflow-hidden rounded-card border border-slate-200 bg-white shadow-card md:block">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    {t('customers.name')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('customers.phone')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('customers.area')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('customers.dob')}
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">{c.name}</td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                      {c.display_phone}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{c.area ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-500">{c.date_of_birth ?? '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-medium text-brand-600 hover:text-brand-800">
                        View Profile →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="space-y-3 md:hidden">
            {customers.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/customers/${c.id}`)}
                className="cursor-pointer rounded-card border border-slate-200 bg-white p-4 shadow-card active:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">{c.name}</h3>
                  <span className="text-xs font-medium text-brand-600">→</span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-700">
                  📞 {c.display_phone}
                </p>
                {c.area && <p className="mt-0.5 text-xs text-slate-500">📍 {c.area}</p>}
                {c.date_of_birth && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    🎂 DOB: {c.date_of_birth}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Customer Dialog */}
      {activeBusiness && (
        <CustomerFormDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          businessId={activeBusiness.id}
          onSaved={() => void loadCustomers()}
        />
      )}

      {/* PVC Quick-Add Dialog */}
      {activeBusiness && (
        <PvcQuickAddDialog
          open={pvcQuickAddOpen}
          onClose={() => setPvcQuickAddOpen(false)}
          businessId={activeBusiness.id}
          onSaved={() => void loadCustomers()}
        />
      )}
    </div>
  );
}

export default CustomerListPage;
