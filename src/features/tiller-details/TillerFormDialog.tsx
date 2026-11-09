/**
 * Tiller Form Dialog.
 * Records customer power-tiller model, purchase year, and specifications.
 */

import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { saveCustomerTiller } from './api/tillerService';
import type { CustomerTillerDetail } from '@/lib/database.types';

interface TillerFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  customerId: string;
  tiller?: CustomerTillerDetail | null;
  onSaved: () => void;
}

export function TillerFormDialog({
  isOpen,
  onClose,
  businessId,
  customerId,
  tiller,
  onSaved,
}: TillerFormDialogProps) {
  const { t } = useTranslation();
  const [tillerBrand, setTillerBrand] = useState('');
  const [tillerModel, setTillerModel] = useState('');
  const [yearOfPurchase, setYearOfPurchase] = useState('');
  const [hpRating, setHpRating] = useState('');
  const [bladeType, setBladeType] = useState('Standard Curved');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tiller) {
      setTillerBrand(tiller.tiller_brand);
      setTillerModel(tiller.tiller_model);
      setYearOfPurchase(tiller.year_of_purchase ? String(tiller.year_of_purchase) : '');
      setHpRating(tiller.hp_rating ? String(tiller.hp_rating) : '');
      setBladeType(tiller.blade_type || 'Standard Curved');
      setNotes(tiller.notes || '');
    } else {
      setTillerBrand('VST Shakti');
      setTillerModel('');
      setYearOfPurchase('');
      setHpRating('13.0');
      setBladeType('Standard Curved');
      setNotes('');
    }
    setError(null);
  }, [tiller, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tillerBrand.trim()) {
      setError(t('tiller.brandRequired', 'Tiller brand is required'));
      return;
    }
    if (!tillerModel.trim()) {
      setError(t('tiller.modelRequired', 'Tiller model is required'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await saveCustomerTiller({
        id: tiller?.id,
        businessId,
        customerId,
        tillerBrand,
        tillerModel,
        yearOfPurchase: yearOfPurchase.trim() ? Number(yearOfPurchase) : null,
        hpRating: hpRating.trim() ? Number(hpRating) : null,
        bladeType: bladeType || null,
        notes: notes || null,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onSaved();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tiller');
    } finally {
      setSaving(false);
    }
  };

  const brandPresets = [
    { value: 'VST Shakti', label: 'VST Shakti' },
    { value: 'Kamco', label: 'Kamco' },
    { value: 'Greaves Cotton', label: 'Greaves Cotton' },
    { value: 'Honda', label: 'Honda' },
    { value: 'Kirloskar', label: 'Kirloskar' },
    { value: 'KMW by Kirloskar', label: 'KMW Mega T' },
    { value: 'Other', label: 'Other Brand (इतर ब्रँड)' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        tiller
          ? t('tiller.editTitle', 'Edit Power-Tiller Profile')
          : t('tiller.addTitle', 'Register Power-Tiller Machinery')
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
            label={t('tiller.brand', 'Tiller Brand *')}
            value={tillerBrand}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setTillerBrand(e.target.value)
            }
            options={brandPresets}
          />

          <Input
            label={t('tiller.model', 'Model Name / Number *')}
            value={tillerModel}
            onChange={(e) => setTillerModel(e.target.value)}
            placeholder="e.g. 130 DI / 135 DI / Tera 15"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label={t('tiller.year', 'Purchase Year')}
            type="number"
            min="1990"
            max="2030"
            value={yearOfPurchase}
            onChange={(e) => setYearOfPurchase(e.target.value)}
            placeholder="e.g. 2021"
          />

          <Input
            label={t('tiller.hp', 'Horsepower (HP)')}
            type="number"
            step="0.5"
            value={hpRating}
            onChange={(e) => setHpRating(e.target.value)}
            placeholder="e.g. 13.0 / 15.0"
          />

          <Input
            label={t('tiller.bladeType', 'Blade Type')}
            value={bladeType}
            onChange={(e) => setBladeType(e.target.value)}
            placeholder="e.g. J-Type / C-Type / Curved"
          />
        </div>

        <Input
          label={t('tiller.notes', 'Maintenance Notes / Special Parts')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Requires 18-blade rotary set, V-belt B-48"
        />

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            {tiller
              ? t('common.saveChanges', 'Save Changes')
              : t('common.save', 'Save Tiller')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
