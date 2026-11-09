/**
 * Digital Visiting Card Editor Page (Owner Control).
 * Customizes public visiting card details, services, theme, and public boundary settings.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { fetchBusinessCard, saveBusinessCard } from './api/digitalCardService';
import { fetchBrands } from '@/features/brands/api/brandService';
import type { BrandRecord } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export function DigitalCardEditorPage() {
  const { t } = useTranslation();
  const { activeBusiness } = useBusiness();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [cardSlug, setCardSlug] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [taglineMr, setTaglineMr] = useState('');
  const [taglineEn, setTaglineEn] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [cityOrVillage, setCityOrVillage] = useState('');
  const [pincode, setPincode] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [themeColor, setThemeColor] = useState('#1E40AF');
  const [isPublished, setIsPublished] = useState(true);

  // Services Tag Builder
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState('');

  // Brand records for reference
  const [brands, setBrands] = useState<BrandRecord[]>([]);

  useEffect(() => {
    async function loadCard() {
      if (!activeBusiness?.id) return;
      setLoading(true);
      setError(null);
      try {
        const [cardRes, brandRes] = await Promise.all([
          fetchBusinessCard(activeBusiness.id),
          fetchBrands(activeBusiness.id),
        ]);

        if (cardRes.data) {
          const c = cardRes.data;
          setCardSlug(c.card_slug);
          setDisplayName(c.display_name);
          setTaglineMr(c.tagline_mr || '');
          setTaglineEn(c.tagline_en || '');
          setOwnerName(c.owner_name);
          setPrimaryPhone(c.primary_phone);
          setWhatsappNumber(c.whatsapp_number);
          setEmail(c.email || '');
          setAddressLine1(c.address_line1);
          setAddressLine2(c.address_line2 || '');
          setCityOrVillage(c.city_or_village);
          setPincode(c.pincode || '');
          setGoogleMapsUrl(c.google_maps_url || '');
          setThemeColor(c.theme_color || '#1E40AF');
          setIsPublished(c.is_published);
          setServices(c.services_list || []);
        } else {
          // Defaults based on active business
          const defaultSlug =
            activeBusiness.kind === 'cattle_feed'
              ? 'rushi-cattle-feed'
              : 'rushi-pvc-irrigation';
          setCardSlug(defaultSlug);
          setDisplayName(activeBusiness.name);
          setOwnerName('Rushi Owner');
          setPrimaryPhone('9876543210');
          setWhatsappNumber('9876543210');
          setAddressLine1('Shop No. 1, Main Market Road');
          setCityOrVillage('Kolhapur');
          setServices(
            activeBusiness.kind === 'cattle_feed'
              ? [
                  'High Protein Cattle Feed',
                  'Milk Booster Supplements',
                  'Calf Growth Pellets',
                ]
              : [
                  'ISI PVC Pipes & Fittings',
                  'Drip Irrigation Laterals & Emitters',
                  'Power Tiller Spare Parts',
                  'Submersible Motors & Starters',
                ],
          );
        }

        if (brandRes.data) {
          setBrands(brandRes.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load card');
      } finally {
        setLoading(false);
      }
    }

    void loadCard();
  }, [activeBusiness]);

  const handleAddService = () => {
    if (!newService.trim()) return;
    setServices((prev) => [...prev, newService.trim()]);
    setNewService('');
  };

  const handleRemoveService = (idx: number) => {
    setServices((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeBusiness?.id) return;

    if (!cardSlug.trim()) {
      setError(t('cards.slugRequired', 'Card URL slug is required'));
      return;
    }
    if (!displayName.trim()) {
      setError(t('cards.nameRequired', 'Business display name is required'));
      return;
    }
    if (!primaryPhone.trim()) {
      setError(t('cards.phoneRequired', 'Primary phone is required'));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await saveBusinessCard({
        businessId: activeBusiness.id,
        cardSlug,
        displayName,
        taglineMr: taglineMr || null,
        taglineEn: taglineEn || null,
        ownerName,
        primaryPhone,
        whatsappNumber: whatsappNumber || primaryPhone,
        email: email || null,
        addressLine1,
        addressLine2: addressLine2 || null,
        cityOrVillage,
        pincode: pincode || null,
        googleMapsUrl: googleMapsUrl || null,
        servicesList: services,
        themeColor,
        isPublished,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(
          t('cards.saveSuccess', 'Digital visiting card saved and updated successfully!'),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = `${window.location.origin}/card/${cardSlug}`;

  const copyPublicLink = () => {
    void navigator.clipboard.writeText(publicUrl);
    alert(t('cards.linkCopied', 'Public digital card link copied to clipboard!'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('cards.title', 'Digital Visiting Card Settings')}
          </h1>
          <p className="text-sm text-slate-500">
            {t(
              'cards.subtitle',
              'Manage your publicly accessible mobile digital card, contact information, and services list',
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={copyPublicLink}>
            📋 {t('cards.copyLink', 'Copy Card Link')}
          </Button>
          <a
            href={`/card/${cardSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            ↗️ {t('cards.previewPublic', 'View Public Card')}
          </a>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-500">
          {t('common.loading', 'Loading digital card configuration...')}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-6"
        >
          {/* Card Link & Visibility Section */}
          <Card className="space-y-4 border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-900">
              🔗 {t('cards.publicUrlSection', 'Public URL & Publication')}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label={t('cards.cardSlug', 'Card URL Slug *')}
                  value={cardSlug}
                  onChange={(e) =>
                    setCardSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  placeholder="rushi-pvc"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {t('cards.publicAddress', 'Public link')}:{' '}
                  <span className="font-mono text-blue-600">{publicUrl}</span>
                </p>
              </div>

              <div className="flex flex-col justify-center">
                <label className="mb-2 text-xs font-semibold text-slate-700">
                  {t('cards.publishStatus', 'Public Status')}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is-published"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="is-published"
                    className="cursor-pointer text-sm font-medium text-slate-800"
                  >
                    {isPublished
                      ? t('cards.published', 'Published & Accessible to Customers')
                      : t('cards.draftOnly', 'Draft (Hidden from Public)')}
                  </label>
                </div>
              </div>
            </div>
          </Card>

          {/* Business & Owner Identity */}
          <Card className="space-y-4 border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-900">
              🏪 {t('cards.identitySection', 'Business Identity & Details')}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t('cards.displayName', 'Firm / Business Name *')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />

              <Input
                label={t('cards.ownerName', 'Proprietor / Owner Name *')}
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t('cards.taglineMr', 'Tagline (Marathi)')}
                value={taglineMr}
                onChange={(e) => setTaglineMr(e.target.value)}
                placeholder="उदा. दर्जेदार पीव्हीसी पाईप्स आणि कृषी अवजारांचे विश्वासू केंद्र"
              />

              <Input
                label={t('cards.taglineEn', 'Tagline (English)')}
                value={taglineEn}
                onChange={(e) => setTaglineEn(e.target.value)}
                placeholder="e.g. Trusted supplier of PVC pipes, drip and agricultural tools"
              />
            </div>
          </Card>

          {/* Contact Numbers & Location */}
          <Card className="space-y-4 border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-900">
              📞 {t('cards.contactSection', 'Contact Numbers & Location')}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label={t('cards.primaryPhone', 'Primary Phone Number *')}
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
              />

              <Input
                label={t('cards.whatsappNumber', 'WhatsApp Order Number *')}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />

              <Input
                label={t('cards.email', 'Email Address (Optional)')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t('cards.addressLine1', 'Address Line 1 *')}
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
              />

              <Input
                label={t('cards.addressLine2', 'Address Line 2')}
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label={t('cards.city', 'City / Village *')}
                value={cityOrVillage}
                onChange={(e) => setCityOrVillage(e.target.value)}
              />

              <Input
                label={t('cards.pincode', 'Pincode')}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />

              <Input
                label={t('cards.googleMapsUrl', 'Google Maps Link')}
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
              />
            </div>
          </Card>

          {/* Services & Theme Customizer */}
          <Card className="space-y-4 border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-900">
              🎨 {t('cards.servicesAndTheme', 'Services List & Card Theme')}
            </h2>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                {t('cards.themeColor', 'Header Theme Color')}
              </label>
              <div className="mt-2 flex items-center gap-3">
                {[
                  { name: 'Classic Blue', hex: '#1E40AF' },
                  { name: 'Forest Green', hex: '#047857' },
                  { name: 'Crimson Red', hex: '#B91C1C' },
                  { name: 'Slate Teal', hex: '#0F766E' },
                  { name: 'Royal Indigo', hex: '#4338CA' },
                ].map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setThemeColor(color.hex)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform ${
                      themeColor === color.hex
                        ? 'scale-110 border-slate-900 shadow-md'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
                <span className="font-mono text-xs text-slate-600">{themeColor}</span>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-2">
              <label className="text-xs font-semibold text-slate-700">
                {t('cards.servicesList', 'Featured Services & Products List')}
              </label>

              <div className="flex gap-2">
                <Input
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  placeholder={t(
                    'cards.addServicePlaceholder',
                    'e.g. Drip Irrigation System Installation / Power Tiller Repairs',
                  )}
                />
                <Button type="button" onClick={handleAddService} variant="secondary">
                  ➕ {t('common.add', 'Add')}
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {services.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => handleRemoveService(idx)}
                      className="ml-1 font-bold text-slate-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 text-xs text-slate-600">
              🏷️{' '}
              <strong>
                {
                  brands.filter((b) => b.show_on_digital_card && b.has_logo_permission)
                    .length
                }
              </strong>{' '}
              {t(
                'cards.featuredBrandsNote',
                'authorized brand partner logos currently featured on public card.',
              )}
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="submit"
              loading={saving}
              disabled={saving}
              className="bg-blue-600 px-8 py-2.5 text-base font-bold text-white hover:bg-blue-700"
            >
              💾 {t('common.saveChanges', 'Save Digital Card Settings')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
