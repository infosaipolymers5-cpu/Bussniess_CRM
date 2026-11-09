/**
 * Brand Form Dialog.
 * Enforces owner-recorded logo-use authorization before publication.
 */

import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createBrand, updateBrand } from './api/brandService';
import type { BrandRecord, PvcCategory } from '@/lib/database.types';

interface BrandFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  brand?: BrandRecord | null;
  categories: PvcCategory[];
  onSaved: () => void;
}

export function BrandFormDialog({
  isOpen,
  onClose,
  businessId,
  brand,
  categories,
  onSaved,
}: BrandFormDialogProps) {
  const { t } = useTranslation();
  const [brandName, setBrandName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [descriptionMr, setDescriptionMr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [hasLogoPermission, setHasLogoPermission] = useState(false);
  const [logoPermissionNotes, setLogoPermissionNotes] = useState('');
  const [showOnDigitalCard, setShowOnDigitalCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (brand) {
      setBrandName(brand.brand_name);
      setCategoryId(brand.category_id || '');
      setDescriptionMr(brand.description_mr || '');
      setDescriptionEn(brand.description_en || '');
      setLogoUrl(brand.logo_url || '');
      setWebsiteUrl(brand.website_url || '');
      setHasLogoPermission(brand.has_logo_permission);
      setLogoPermissionNotes(brand.logo_permission_notes || '');
      setShowOnDigitalCard(brand.show_on_digital_card);
    } else {
      setBrandName('');
      setCategoryId(categories[0]?.id || '');
      setDescriptionMr('');
      setDescriptionEn('');
      setLogoUrl('');
      setWebsiteUrl('');
      setHasLogoPermission(false);
      setLogoPermissionNotes('');
      setShowOnDigitalCard(false);
    }
    setError(null);
  }, [brand, categories, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      setError(t('brands.nameRequired', 'Brand name is required'));
      return;
    }

    if (showOnDigitalCard && !hasLogoPermission) {
      setError(
        t(
          'brands.permissionRequired',
          'You must confirm logo-use permission before showing this brand on the digital visiting card.',
        ),
      );
      return;
    }

    setSaving(true);
    setError(null);

    const selectedCat = categories.find((c) => c.id === categoryId);
    const categoryName = selectedCat ? selectedCat.name_en : undefined;

    try {
      if (brand) {
        const res = await updateBrand(brand.id, {
          brandName,
          categoryId: categoryId || null,
          categoryName,
          descriptionMr: descriptionMr || null,
          descriptionEn: descriptionEn || null,
          logoUrl: logoUrl || null,
          websiteUrl: websiteUrl || null,
          hasLogoPermission,
          logoPermissionNotes: logoPermissionNotes || null,
          showOnDigitalCard,
        });

        if (res.error) {
          setError(res.error);
        } else {
          onSaved();
          onClose();
        }
      } else {
        const res = await createBrand({
          businessId,
          brandName,
          categoryId: categoryId || null,
          categoryName,
          descriptionMr: descriptionMr || null,
          descriptionEn: descriptionEn || null,
          logoUrl: logoUrl || null,
          websiteUrl: websiteUrl || null,
          hasLogoPermission,
          logoPermissionNotes: logoPermissionNotes || null,
          showOnDigitalCard,
        });

        if (res.error) {
          setError(res.error);
        } else {
          onSaved();
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = [
    { value: '', label: t('brands.noCategory', 'General Brand') },
    ...categories.map((c) => ({
      value: c.id,
      label: `${c.name_mr} (${c.name_en})`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        brand
          ? t('brands.editBrand', 'Edit Brand Record')
          : t('brands.addBrand', 'Add Authorized Brand')
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
          <Input
            label={t('brands.brandName', 'Brand Name *')}
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            placeholder="e.g. Finolex / Jain / VST Shakti / Lubi"
          />

          <Select
            label={t('brands.category', 'Product Category')}
            value={categoryId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setCategoryId(e.target.value)
            }
            options={categoryOptions}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('brands.logoUrl', 'Logo Image URL')}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://.../logo.png"
          />

          <Input
            label={t('brands.websiteUrl', 'Official Website')}
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://www.finolex.com"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t('brands.descriptionMr', 'Description (Marathi)')}
            value={descriptionMr}
            onChange={(e) => setDescriptionMr(e.target.value)}
            placeholder="उदा. अधिकृत वितरक आणि विक्रेता"
          />

          <Input
            label={t('brands.descriptionEn', 'Description (English)')}
            value={descriptionEn}
            onChange={(e) => setDescriptionEn(e.target.value)}
            placeholder="e.g. Authorized distributor and sales partner"
          />
        </div>

        {/* Logo Permission Section (Owner Requirement) */}
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="logo-permission"
              checked={hasLogoPermission}
              onChange={(e) => {
                const checked = e.target.checked;
                setHasLogoPermission(checked);
                if (!checked) setShowOnDigitalCard(false);
              }}
              className="mt-1 h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor="logo-permission"
              className="cursor-pointer text-xs font-semibold leading-snug text-amber-900"
            >
              🛡️{' '}
              {t(
                'brands.confirmPermission',
                'Owner Confirmation: We have obtained official permission / authorized dealership certificate to use this brand logo.',
              )}
            </label>
          </div>

          {hasLogoPermission && (
            <Input
              label={t(
                'brands.permissionNotes',
                'Authorization Notes / Dealership Certificate #',
              )}
              value={logoPermissionNotes}
              onChange={(e) => setLogoPermissionNotes(e.target.value)}
              placeholder="e.g. Dealership Agreement #2026/DL-492"
            />
          )}

          <div className="flex items-center gap-3 border-t border-amber-200/60 pt-1">
            <input
              type="checkbox"
              id="digital-card-show"
              checked={showOnDigitalCard}
              disabled={!hasLogoPermission}
              onChange={(e) => setShowOnDigitalCard(e.target.checked)}
              className="h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            />
            <label
              htmlFor="digital-card-show"
              className={`cursor-pointer text-xs font-medium ${
                hasLogoPermission ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              🏷️{' '}
              {t(
                'brands.showOnCard',
                'Feature this brand on Public Digital Visiting Card',
              )}
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            {brand
              ? t('common.saveChanges', 'Save Changes')
              : t('common.create', 'Add Brand')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
