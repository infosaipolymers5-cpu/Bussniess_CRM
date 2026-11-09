/**
 * ProductListPage — Cattle Feed product catalogue view.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { fetchProducts, createProduct, updateProduct } from './api/productService';
import { ProductFormDialog } from './ProductFormDialog';
import { Button, LoadingSpinner, EmptyState } from '@/components/ui';
import { formatPaise } from '@/lib/money';
import type { Product } from '@/lib/database.types';
import type { ProductFormData } from '@/lib/validation';

export function ProductListPage() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';

  const loadData = useCallback(async () => {
    if (!activeBusiness || !isCattleFeed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await fetchProducts(activeBusiness.id);
    setProducts(data);
    setLoading(false);
  }, [activeBusiness, isCattleFeed]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSave = async (formData: ProductFormData): Promise<boolean> => {
    if (!activeBusiness) return false;
    if (editingProduct) {
      const { error } = await updateProduct(editingProduct.id, formData);
      if (!error) {
        void loadData();
        return true;
      }
      return false;
    } else {
      const { error } = await createProduct(activeBusiness.id, formData);
      if (!error) {
        void loadData();
        return true;
      }
      return false;
    }
  };

  if (!isCattleFeed) {
    return (
      <div className="rounded-card border border-amber-200 bg-amber-50 p-6 shadow-card">
        <h2 className="text-base font-semibold text-amber-800">
          {t('products.cattleFeedExclusive')}
        </h2>
        <p className="mt-1 text-sm text-amber-700">
          The product catalogue, pricing, and billing engine belong exclusively to Cattle
          Feed. Please switch your active business to Cattle Feed in the navigation bar to
          manage products.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('products.title')}
          </h1>
          <p className="text-sm text-slate-500">
            {activeBusiness?.name} · Manage feed products, units, and standard prices in
            integer paise
          </p>
        </div>
        <div>
          <Button
            onClick={() => {
              setEditingProduct(null);
              setDialogOpen(true);
            }}
          >
            + {t('products.addProduct')}
          </Button>
        </div>
      </div>

      {/* Product List Table */}
      <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title={t('products.noProducts')}
            description="Add products to your catalogue to begin issuing bills."
            action={
              <Button
                onClick={() => {
                  setEditingProduct(null);
                  setDialogOpen(true);
                }}
              >
                + {t('products.addProduct')}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3">{t('products.productName')}</th>
                  <th className="px-6 py-3">{t('products.code')}</th>
                  <th className="px-6 py-3">{t('products.unit')}</th>
                  <th className="px-6 py-3 text-right">{t('products.defaultPrice')}</th>
                  <th className="px-6 py-3">{t('common.status')}</th>
                  <th className="px-6 py-3 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {product.code || '—'}
                    </td>
                    <td className="px-6 py-4 capitalize text-slate-700">
                      {product.unit}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900">
                      {formatPaise(product.default_price_paise)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          product.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingProduct(product);
                          setDialogOpen(true);
                        }}
                      >
                        {t('common.edit')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct}
        onSubmit={handleSave}
      />
    </div>
  );
}
