/**
 * Customer Tiller Section Component.
 * Displays and manages power-tiller machinery for a customer on their detail page.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCustomerTillers, deleteCustomerTiller } from './api/tillerService';
import { TillerFormDialog } from './TillerFormDialog';
import type { CustomerTillerDetail } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface CustomerTillerSectionProps {
  businessId: string;
  customerId: string;
}

export function CustomerTillerSection({
  businessId,
  customerId,
}: CustomerTillerSectionProps) {
  const { t } = useTranslation();
  const [tillers, setTillers] = useState<CustomerTillerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTiller, setEditingTiller] = useState<CustomerTillerDetail | null>(null);

  const loadTillers = useCallback(async () => {
    setLoading(true);
    const res = await fetchCustomerTillers(customerId);
    if (res.data) setTillers(res.data);
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    void loadTillers();
  }, [loadTillers]);

  const handleDelete = async (tiller: CustomerTillerDetail) => {
    if (
      !confirm(
        t('tiller.confirmDelete', {
          defaultValue: `Delete tiller record for ${tiller.tiller_brand} ${tiller.tiller_model}?`,
        }),
      )
    ) {
      return;
    }

    const res = await deleteCustomerTiller(tiller.id);
    if (!res.error) {
      await loadTillers();
    }
  };

  return (
    <div className="shadow-xs space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚜</span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {t('tiller.sectionTitle', 'Power-Tiller Machinery & Spares Profile')}
            </h3>
            <p className="text-xs text-slate-500">
              {t(
                'tiller.sectionSubtitle',
                'Recorded machinery used for targeted spare-part recommendations and campaigns',
              )}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingTiller(null);
            setDialogOpen(true);
          }}
        >
          ➕ {t('tiller.addBtn', 'Add Tiller')}
        </Button>
      </div>

      {loading ? (
        <div className="p-4 text-center text-xs text-slate-500">
          {t('common.loading', 'Loading tiller profiles...')}
        </div>
      ) : tillers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
          {t(
            'tiller.noTillers',
            'No power-tillers registered for this customer yet. Add one to enable targeted spare-part promotions.',
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tillers.map((tiller) => (
            <div
              key={tiller.id}
              className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {tiller.tiller_brand} {tiller.tiller_model}
                  </span>
                  {tiller.hp_rating && (
                    <Badge variant="info" className="text-[10px]">
                      {tiller.hp_rating} HP
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-3 text-slate-600">
                  {tiller.year_of_purchase && (
                    <span>
                      {t('tiller.year', 'Year')}:{' '}
                      <strong>{tiller.year_of_purchase}</strong>
                    </span>
                  )}
                  {tiller.blade_type && (
                    <span>
                      {t('tiller.blades', 'Blades')}: <strong>{tiller.blade_type}</strong>
                    </span>
                  )}
                </div>

                {tiller.notes && (
                  <p className="text-[11px] italic text-slate-500">"{tiller.notes}"</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTiller(tiller);
                    setDialogOpen(true);
                  }}
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  {t('common.edit', 'Edit')}
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => void handleDelete(tiller)}
                  className="font-medium text-red-600 hover:text-red-800"
                >
                  {t('common.delete', 'Delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <TillerFormDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          businessId={businessId}
          customerId={customerId}
          tiller={editingTiller}
          onSaved={() => {
            void loadTillers();
          }}
        />
      )}
    </div>
  );
}
