/**
 * Brand Directory Page.
 * Manages authorized supplier brands, logo permission compliance,
 * and visibility on public digital visiting cards.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { fetchBrands, deleteBrand } from './api/brandService';
import { fetchPvcCategories } from '@/features/pvc-catalogue/api/pvcCatalogueService';
import { BrandFormDialog } from './BrandFormDialog';
import type { BrandRecord, PvcCategory } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function BrandDirectoryPage() {
  const { t, i18n } = useTranslation();
  const { activeBusiness } = useBusiness();

  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [categories, setCategories] = useState<PvcCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandRecord | null>(null);

  const loadData = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [brandRes, catRes] = await Promise.all([
        fetchBrands(activeBusiness.id),
        fetchPvcCategories(activeBusiness.id),
      ]);

      if (brandRes.error) {
        setError(brandRes.error);
      } else {
        setBrands(brandRes.data);
      }

      if (catRes.data) {
        setCategories(catRes.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDelete = async (brand: BrandRecord) => {
    if (
      !confirm(
        t('brands.confirmDelete', {
          defaultValue: `Are you sure you want to delete brand "${brand.brand_name}"?`,
          name: brand.brand_name,
        }),
      )
    ) {
      return;
    }

    const res = await deleteBrand(brand.id);
    if (res.error) {
      alert(res.error);
    } else {
      await loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('brands.title', 'Authorized Brand Directory')}
          </h1>
          <p className="text-sm text-slate-500">
            {t(
              'brands.subtitle',
              'Owner-managed brand partnerships with logo permission verification & digital card publication',
            )}
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingBrand(null);
            setDialogOpen(true);
          }}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          ➕ {t('brands.addBrand', 'Add Brand')}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Brands Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">
          {t('common.loading', 'Loading brand directory...')}
        </div>
      ) : brands.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl">
            🏷️
          </div>
          <p className="text-base font-semibold text-slate-700">
            {t('brands.noBrands', 'No brands recorded yet')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t(
              'brands.noBrandsSub',
              'Add authorized brands to display them in catalogue filters and on your public digital card.',
            )}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {brands.map((brand) => {
            const desc =
              i18n.language === 'mr'
                ? brand.description_mr || brand.description_en
                : brand.description_en || brand.description_mr;

            return (
              <Card
                key={brand.id}
                className="flex flex-col justify-between border-slate-200 p-5 transition-shadow hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Top row with Logo and badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-1 text-slate-400">
                      {brand.logo_url ? (
                        <img
                          src={brand.logo_url}
                          alt={brand.brand_name}
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-xl font-bold uppercase text-slate-600">
                          {brand.brand_name.slice(0, 2)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {brand.has_logo_permission ? (
                        <Badge variant="success" className="text-[10px]">
                          🛡️ {t('brands.authorized', 'Authorized')}
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-[10px]">
                          ⚠️ {t('brands.pendingPermission', 'Unverified')}
                        </Badge>
                      )}

                      {brand.show_on_digital_card && (
                        <Badge variant="info" className="text-[10px]">
                          📇 {t('brands.onCard', 'On Digital Card')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {brand.brand_name}
                    </h3>
                    {brand.category_name && (
                      <span className="text-xs font-medium text-blue-600">
                        {brand.category_name}
                      </span>
                    )}
                  </div>

                  {desc && <p className="line-clamp-2 text-xs text-slate-500">{desc}</p>}

                  {brand.website_url && (
                    <a
                      href={brand.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-xs text-blue-600 hover:underline"
                    >
                      🌐 {brand.website_url.replace(/^https?:\/\//, '')}
                    </a>
                  )}

                  {brand.logo_permission_notes && (
                    <div className="rounded border border-slate-100 bg-slate-50 p-2 text-[11px] text-slate-600">
                      <strong>Doc:</strong> {brand.logo_permission_notes}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBrand(brand);
                      setDialogOpen(true);
                    }}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    {t('common.edit', 'Edit')}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => void handleDelete(brand)}
                    className="font-medium text-red-600 hover:text-red-800"
                  >
                    {t('common.delete', 'Delete')}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Brand Dialog */}
      {dialogOpen && (
        <BrandFormDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          businessId={activeBusiness?.id || ''}
          brand={editingBrand}
          categories={categories}
          onSaved={() => {
            void loadData();
          }}
        />
      )}
    </div>
  );
}
