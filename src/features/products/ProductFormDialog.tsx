/**
 * ProductFormDialog — Create or edit a product in Cattle Feed catalogue.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Input, Select, Button } from '@/components/ui';
import { productFormSchema, type ProductFormData } from '@/lib/validation';
import { paiseToRupees } from '@/lib/money';
import type { Product, ProductUnit } from '@/lib/database.types';

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<boolean>;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
}: ProductFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(product?.name ?? '');
  const [code, setCode] = useState(product?.code ?? '');
  const [unit, setUnit] = useState<ProductUnit>(product?.unit ?? 'bag');
  const [defaultPriceRupees, setDefaultPriceRupees] = useState<string>(
    product ? String(paiseToRupees(product.default_price_paise)) : '',
  );
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const formData = {
      name,
      code: code || null,
      unit,
      defaultPriceRupees: parseFloat(defaultPriceRupees) || 0,
      isActive,
    };

    const result = productFormSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    const success = await onSubmit(result.data);
    setSubmitting(false);

    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onOpenChange(false)}
      title={product ? 'Edit Product' : t('products.addProduct')}
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4"
      >
        <div>
          <Input
            label={t('products.productName')}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sugarcane Feed 50kg"
            error={errors.name}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label={t('products.code') || 'Code'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CF-SUGAR-50"
              error={errors.code}
            />
          </div>

          <div>
            <Select
              label={t('products.unit')}
              required
              value={unit}
              onChange={(e) => setUnit(e.target.value as ProductUnit)}
            >
              <option value="bag">Bag</option>
              <option value="kg">Kilogram (Kg)</option>
              <option value="quintal">Quintal</option>
              <option value="unit">Unit</option>
              <option value="other">Other</option>
            </Select>
          </div>
        </div>

        <div>
          <Input
            label={t('products.defaultPrice')}
            required
            type="number"
            step="0.01"
            value={defaultPriceRupees}
            onChange={(e) => setDefaultPriceRupees(e.target.value)}
            placeholder="0.00"
            error={errors.defaultPriceRupees}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
            {t('products.isActive')}
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={submitting}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
