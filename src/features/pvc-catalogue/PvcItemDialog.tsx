/**
 * PVC Item Modal Dialog.
 * Create and edit PVC items with private reference rate and size dimensions.
 */

import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  createPvcCatalogueItem,
  updatePvcCatalogueItem,
  type PvcItemWithRelations,
} from './api/pvcCatalogueService';
import type { PvcCategory, BrandRecord } from '@/lib/database.types';
import { rupeesToPaise, paiseToRupees } from '@/lib/money';

interface PvcItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  item?: PvcItemWithRelations | null;
  categories: PvcCategory[];
  brands: BrandRecord[];
  onSaved: () => void;
}

export function PvcItemDialog({
  isOpen,
  onClose,
  businessId,
  item,
  categories,
  brands,
  onSaved,
}: PvcItemDialogProps) {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemNameEn, setItemNameEn] = useState('');
  const [itemNameMr, setItemNameMr] = useState('');
  const [sizeDimension, setSizeDimension] = useState('');
  const [unit, setUnit] = useState('piece');
  const [rateRupees, setRateRupees] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setCategoryId(item.category_id);
      setBrandId(item.brand_id || '');
      setItemCode(item.item_code);
      setItemNameEn(item.item_name_en);
      setItemNameMr(item.item_name_mr);
      setSizeDimension(item.size_dimension || '');
      setUnit(item.unit || 'piece');
      setRateRupees(
        item.reference_rate_paise ? String(paiseToRupees(item.reference_rate_paise)) : '',
      );
    } else {
      setCategoryId(categories[0]?.id || '');
      setBrandId('');
      setItemCode('');
      setItemNameEn('');
      setItemNameMr('');
      setSizeDimension('');
      setUnit('piece');
      setRateRupees('');
    }
    setError(null);
  }, [item, categories, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim()) {
      setError(t('catalogue.codeRequired', 'Item code is required'));
      return;
    }
    if (!itemNameEn.trim()) {
      setError(t('catalogue.nameEnRequired', 'English item name is required'));
      return;
    }
    if (!itemNameMr.trim()) {
      setError(t('catalogue.nameMrRequired', 'Marathi item name is required'));
      return;
    }
    if (!categoryId) {
      setError(t('catalogue.categoryRequired', 'Please select a category'));
      return;
    }

    setSaving(true);
    setError(null);

    const refPaise = rateRupees.trim() ? rupeesToPaise(Number(rateRupees)) : null;

    try {
      if (item) {
        const res = await updatePvcCatalogueItem(item.id, {
          categoryId,
          brandId: brandId || null,
          itemCode,
          itemNameEn,
          itemNameMr,
          sizeDimension: sizeDimension || null,
          unit,
          referenceRatePaise: refPaise,
        });
        if (res.error) {
          setError(res.error);
        } else {
          onSaved();
          onClose();
        }
      } else {
        const res = await createPvcCatalogueItem({
          businessId,
          categoryId,
          brandId: brandId || null,
          itemCode,
          itemNameEn,
          itemNameMr,
          sizeDimension: sizeDimension || null,
          unit,
          referenceRatePaise: refPaise,
        });
        if (res.error) {
          setError(res.error);
        } else {
          onSaved();
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: `${c.name_mr} (${c.name_en})`,
  }));

  const brandOptions = [
    { value: '', label: t('catalogue.noBrand', 'Generic / No Brand') },
    ...brands.map((b) => ({
      value: b.id,
      label: b.brand_name,
    })),
  ];

  const unitOptions = [
    { value: 'piece', label: t('units.piece', 'Piece (नग)') },
    { value: 'meter', label: t('units.meter', 'Meter (मीटर)') },
    { value: 'bundle', label: t('units.bundle', 'Bundle (बंडल)') },
    { value: 'coil', label: t('units.coil', 'Coil (कॉइल)') },
    { value: 'set', label: t('units.set', 'Set (संच)') },
    { value: 'kg', label: t('units.kg', 'Kg (किलो)') },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        item
          ? t('catalogue.editItem', 'Edit Catalogue Item')
          : t('catalogue.addItem', 'Add New Catalogue Item')
      }
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-4 text-sm"
      >
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={t('catalogue.category', 'Category *')}
            value={categoryId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setCategoryId(e.target.value)
            }
            options={categoryOptions}
          />

          <Select
            label={t('catalogue.brand', 'Brand (Optional)')}
            value={brandId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setBrandId(e.target.value)}
            options={brandOptions}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('catalogue.itemCode', 'Item Code / SKU *')}
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            placeholder="e.g. PVC-PIPE-63-4K"
          />

          <Input
            label={t('catalogue.size', 'Size / Dimension')}
            value={sizeDimension}
            onChange={(e) => setSizeDimension(e.target.value)}
            placeholder="e.g. 63mm 4kg / 2 inch / 16mm"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('catalogue.nameMr', 'Item Name (Marathi) *')}
            value={itemNameMr}
            onChange={(e) => setItemNameMr(e.target.value)}
            placeholder="उदा. ६३ मिमी पीव्हीसी पाईप ४ किलो"
          />

          <Input
            label={t('catalogue.nameEn', 'Item Name (English) *')}
            value={itemNameEn}
            onChange={(e) => setItemNameEn(e.target.value)}
            placeholder="e.g. 63mm PVC Pipe 4kg"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label={t('catalogue.unit', 'Unit')}
            value={unit}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setUnit(e.target.value)}
            options={unitOptions}
          />

          <Input
            label={t(
              'catalogue.referenceRate',
              'Private Reference Rate (₹) [Owner Only]',
            )}
            type="number"
            step="0.01"
            min="0"
            value={rateRupees}
            onChange={(e) => setRateRupees(e.target.value)}
            placeholder="e.g. 450.00"
          />
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            {item
              ? t('common.saveChanges', 'Save Changes')
              : t('common.create', 'Create Item')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
