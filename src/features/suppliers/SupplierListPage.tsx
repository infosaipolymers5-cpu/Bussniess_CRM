/**
 * SupplierListPage — Owner-only vendor and supplier directory.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { isOwner } from '@/lib/permissions';
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  setSupplierOpeningBalance,
} from './api/supplierService';
import { SupplierFormDialog } from './SupplierFormDialog';
import { Button, LoadingSpinner, EmptyState, Badge } from '@/components/ui';
import { rupeesToPaise } from '@/lib/money';
import type { Supplier } from '@/lib/database.types';
import type { SupplierFormData } from '@/lib/validation';

export function SupplierListPage() {
  const { t } = useTranslation();
  const { activeBusiness, activeRole } = useBusiness();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';
  const hasOwnerAccess = isOwner(activeRole ?? undefined);

  const loadData = useCallback(async () => {
    if (!activeBusiness || !isCattleFeed || !hasOwnerAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchSuppliers(activeBusiness.id);
      setSuppliers(data);
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, isCattleFeed, hasOwnerAccess]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSave = async (
    formData: SupplierFormData,
    openingBalance?: { fy: string; rupees: number },
  ): Promise<boolean> => {
    if (!activeBusiness) return false;
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
      } else {
        const created = await createSupplier(activeBusiness.id, formData);
        if (openingBalance && openingBalance.rupees > 0) {
          await setSupplierOpeningBalance(
            activeBusiness.id,
            created.id,
            openingBalance.fy,
            rupeesToPaise(openingBalance.rupees),
          );
        }
      }
      void loadData();
      return true;
    } catch {
      return false;
    }
  };

  if (!isCattleFeed) {
    return (
      <div className="p-6">
        <EmptyState
          title={t('suppliers.title')}
          description="Supplier purchasing engine is exclusive to Cattle Feed."
        />
      </div>
    );
  }

  if (!hasOwnerAccess) {
    return (
      <div className="p-6">
        <EmptyState
          title={t('suppliers.title')}
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
            {t('suppliers.title')}
          </h1>
          <p className="text-sm text-gray-500">{t('suppliers.ownerOnlyNotice')}</p>
        </div>
        <Button
          onClick={() => {
            setEditingSupplier(null);
            setDialogOpen(true);
          }}
        >
          {t('suppliers.addSupplier')}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          title={t('suppliers.title')}
          description={t('suppliers.noSuppliers')}
          action={
            <Button
              onClick={() => {
                setEditingSupplier(null);
                setDialogOpen(true);
              }}
            >
              {t('suppliers.addSupplier')}
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">{t('suppliers.supplierName')}</th>
                <th className="px-6 py-3">{t('suppliers.phone')}</th>
                <th className="px-6 py-3">{t('suppliers.gstin')}</th>
                <th className="px-6 py-3">{t('suppliers.address')}</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-sm">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                    {s.name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-gray-500">
                    {s.phone ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-500">
                    {s.gstin ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">{s.address ?? '—'}</td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge variant={s.is_active ? 'success' : 'default'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="space-x-2 whitespace-nowrap px-6 py-4 text-right">
                    <Link
                      to={`/supplier-accounts?supplierId=${s.id}`}
                      className="text-primary-600 hover:text-primary-900 text-xs font-medium"
                    >
                      View Khata
                    </Link>
                    <button
                      onClick={() => {
                        setEditingSupplier(s);
                        setDialogOpen(true);
                      }}
                      className="ml-3 text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      {t('common.edit', 'Edit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SupplierFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        supplier={editingSupplier}
        onSave={handleSave}
      />
    </div>
  );
}
