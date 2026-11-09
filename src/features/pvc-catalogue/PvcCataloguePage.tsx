/**
 * PVC Catalogue & Private Item Search Page.
 * Manages category cards (Ceramic marked as coming later)
 * and high-performance paginated item search for 5,000+ items.
 */

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import {
  fetchPvcCategories,
  ensureDefaultPvcCategories,
  fetchPvcCatalogueItems,
  deletePvcCatalogueItem,
  type PvcItemWithRelations,
} from './api/pvcCatalogueService';
import { fetchBrands } from '@/features/brands/api/brandService';
import { PvcItemDialog } from './PvcItemDialog';
import type { PvcCategory, BrandRecord } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatPaise } from '@/lib/money';

export function PvcCataloguePage() {
  const { t, i18n } = useTranslation();
  const { activeBusiness } = useBusiness();
  const [, startTransition] = useTransition();

  const [categories, setCategories] = useState<PvcCategory[]>([]);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [items, setItems] = useState<PvcItemWithRelations[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PvcItemWithRelations | null>(null);

  const loadCategoriesAndBrands = useCallback(async () => {
    if (!activeBusiness?.id) return;
    try {
      await ensureDefaultPvcCategories(activeBusiness.id);
      const [catRes, brandRes] = await Promise.all([
        fetchPvcCategories(activeBusiness.id),
        fetchBrands(activeBusiness.id),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (brandRes.data) setBrands(brandRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metadata');
    }
  }, [activeBusiness?.id]);

  const loadItems = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPvcCatalogueItems({
        businessId: activeBusiness.id,
        categoryId: selectedCategory || undefined,
        brandId: selectedBrand || undefined,
        searchTerm: searchTerm.trim() || undefined,
        page,
        pageSize: 20,
      });

      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setItems(res.data.items);
        setTotalCount(res.data.totalCount);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search items');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id, selectedCategory, selectedBrand, searchTerm, page]);

  useEffect(() => {
    void loadCategoriesAndBrands();
  }, [loadCategoriesAndBrands]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleCategoryClick = (catId: string) => {
    startTransition(() => {
      setSelectedCategory((prev) => (prev === catId ? '' : catId));
      setPage(1);
    });
  };

  const handleDeleteItem = async (item: PvcItemWithRelations) => {
    const isMr = i18n.language === 'mr';
    const name = isMr ? item.item_name_mr : item.item_name_en;
    if (
      !confirm(
        t('catalogue.confirmDelete', {
          defaultValue: `Are you sure you want to delete ${name}?`,
          name,
        }),
      )
    ) {
      return;
    }

    const res = await deletePvcCatalogueItem(item.id);
    if (res.error) {
      alert(res.error);
    } else {
      await loadItems();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('catalogue.title', 'PVC Catalogue & Search')}
          </h1>
          <p className="text-sm text-slate-500">
            {t(
              'catalogue.subtitle',
              'Owner-managed categories, brand directory, and high-speed private item search',
            )}
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingItem(null);
            setDialogOpen(true);
          }}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          ➕ {t('catalogue.addItem', 'Add New Item')}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 1. Category Cards Grid */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
          {t('catalogue.categoriesHeading', 'Product Categories')}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const isComingLater = cat.is_coming_later;
            const name = i18n.language === 'mr' ? cat.name_mr : cat.name_en;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`relative flex flex-col items-center justify-between rounded-xl border p-3 text-center transition-all ${
                  isComingLater
                    ? 'border-dashed border-amber-300 bg-amber-50/50 opacity-80'
                    : isSelected
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {isComingLater && (
                  <Badge
                    variant="warning"
                    className="absolute -top-2 right-1 scale-90 px-1.5 py-0 text-[10px]"
                  >
                    {t('catalogue.comingLater', 'Coming Later')}
                  </Badge>
                )}

                <div className="my-1 text-2xl">
                  {cat.slug === 'pvc_pipes' && '🚰'}
                  {cat.slug === 'drip_irrigation' && '💧'}
                  {cat.slug === 'sprinklers' && '🌧️'}
                  {cat.slug === 'power_tiller_spares' && '🚜'}
                  {cat.slug === 'submersible_pumps' && '⚡'}
                  {cat.slug === 'agri_hardware' && '🛠️'}
                  {cat.slug === 'ceramic' && '🏺'}
                </div>

                <span className="line-clamp-2 text-xs font-semibold text-slate-800">
                  {name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Private Item Search Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder={t(
              'catalogue.searchPlaceholder',
              'Search 5,000+ items by code, name, size or dimension...',
            )}
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="">{t('catalogue.allBrands', 'All Brands')}</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.brand_name}
              </option>
            ))}
          </select>
        </div>

        {(selectedCategory || selectedBrand || searchTerm) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory('');
              setSelectedBrand('');
              setSearchTerm('');
              setPage(1);
            }}
          >
            {t('common.clear', 'Clear Filters')}
          </Button>
        )}
      </div>

      {/* 3. Items Results Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
          <span>
            {t('catalogue.totalItems', 'Total Items Found')}:{' '}
            <strong className="text-slate-900">{totalCount}</strong>
          </span>
          <span>
            {t('catalogue.pageStatus', 'Page {{page}} of {{totalPages}}', {
              page,
              totalPages: totalPages || 1,
            })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="border-b border-slate-200 bg-slate-100/70 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">{t('catalogue.itemCode', 'SKU / Code')}</th>
                <th className="px-4 py-3">{t('catalogue.name', 'Item Name')}</th>
                <th className="px-4 py-3">{t('catalogue.category', 'Category')}</th>
                <th className="px-4 py-3">{t('catalogue.brand', 'Brand')}</th>
                <th className="px-4 py-3">{t('catalogue.size', 'Size / Spec')}</th>
                <th className="px-4 py-3 text-right">
                  {t('catalogue.refRate', 'Ref Rate (₹)')}
                </th>
                <th className="px-4 py-3 text-right">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {t('common.loading', 'Searching catalogue items...')}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {t('catalogue.noItemsFound', 'No items matched your search query.')}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isMr = i18n.language === 'mr';
                  const primaryName = isMr ? item.item_name_mr : item.item_name_en;
                  const secondaryName = isMr ? item.item_name_en : item.item_name_mr;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                        {item.item_code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{primaryName}</div>
                        <div className="text-xs text-slate-500">{secondaryName}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          {isMr
                            ? item.category?.name_mr || item.category?.name_en
                            : item.category?.name_en}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                        {item.brand?.brand_name || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-800">
                        {item.size_dimension || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs font-bold text-slate-900">
                        {item.reference_rate_paise
                          ? formatPaise(item.reference_rate_paise)
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-xs">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setDialogOpen(true);
                            }}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {t('common.edit', 'Edit')}
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => void handleDeleteItem(item)}
                            className="font-medium text-red-600 hover:text-red-800"
                          >
                            {t('common.delete', 'Delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ⬅️ {t('common.previous', 'Previous')}
            </Button>
            <span className="text-xs text-slate-600">
              {t('common.pageOf', 'Page {{page}} of {{totalPages}}', {
                page,
                totalPages,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t('common.next', 'Next')} ➡️
            </Button>
          </div>
        )}
      </div>

      {/* Item Modal */}
      {dialogOpen && (
        <PvcItemDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          businessId={activeBusiness?.id || ''}
          item={editingItem}
          categories={categories}
          brands={brands}
          onSaved={() => {
            void loadItems();
          }}
        />
      )}
    </div>
  );
}
