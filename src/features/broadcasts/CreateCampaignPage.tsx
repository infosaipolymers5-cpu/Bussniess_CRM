/**
 * Create Broadcast Campaign Page.
 * Audience segmentation, cross-business isolation checks, opt-out filtering,
 * and message preview.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { createCampaign, fetchEligibleAudience } from './api/broadcastService';
import type { CampaignType, Customer } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

export function CreateCampaignPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeBusiness } = useBusiness();

  const isCattleFeed = activeBusiness?.kind === 'cattle_feed';
  const businessKind = isCattleFeed ? 'cattle_feed' : 'pvc';

  const [title, setTitle] = useState('');
  const [campaignType, setCampaignType] = useState<CampaignType>(
    isCattleFeed ? 'festival' : 'pvc_promo',
  );
  const [villageFilter, setVillageFilter] = useState('');
  const [messageTemplate, setMessageTemplate] = useState(
    'नमस्कार {नाव} जी,\n\nनवीन ऑफर बद्दल माहिती...\n\nअधिक माहितीसाठी संपर्क करा.',
  );

  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audience, setAudience] = useState<{
    eligibleCustomers: Customer[];
    excludedCount: number;
    reasons: Record<string, number>;
  }>({ eligibleCustomers: [], excludedCount: 0, reasons: {} });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch audience preview on criteria change
  useEffect(() => {
    let isMounted = true;
    async function previewAudience() {
      if (!activeBusiness?.id) return;
      setAudienceLoading(true);
      try {
        const res = await fetchEligibleAudience({
          businessId: activeBusiness.id,
          campaignType,
          businessKind,
          villageOrArea: villageFilter.trim() || undefined,
        });
        if (isMounted) {
          setAudience(res);
        }
      } catch (err) {
        console.error('Audience preview error', err);
      } finally {
        if (isMounted) setAudienceLoading(false);
      }
    }

    void previewAudience();
    return () => {
      isMounted = false;
    };
  }, [activeBusiness?.id, campaignType, businessKind, villageFilter]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeBusiness?.id) return;

    if (!title.trim()) {
      setError(t('broadcasts.titleRequired', 'Campaign title is required'));
      return;
    }

    if (!messageTemplate.trim()) {
      setError(t('broadcasts.messageRequired', 'Message text is required'));
      return;
    }

    if (audience.eligibleCustomers.length === 0) {
      setError(
        t(
          'broadcasts.zeroRecipients',
          'Cannot create campaign with 0 eligible recipients',
        ),
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await createCampaign({
        businessId: activeBusiness.id,
        businessKind,
        title: title.trim(),
        campaignType,
        messageTemplateText: messageTemplate,
        targetCriteria: {
          villageOrArea: villageFilter.trim() || undefined,
        },
      });

      if (res.error) {
        setError(res.error);
      } else {
        navigate('/campaigns');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('broadcasts.createCampaign', 'Create WhatsApp Campaign')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              'broadcasts.createSubtitle',
              'Design targeted promotional or festival announcements with strict cross-business & opt-out guards.',
            )}
          </p>
        </div>

        <Button variant="outline" onClick={() => navigate('/campaigns')}>
          {t('common.cancel', 'Cancel')}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="space-y-6"
      >
        <Card className="space-y-4 p-5">
          <h3 className="text-base font-semibold text-slate-900">
            {t('broadcasts.step1Basics', '1. Campaign Details')}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                {t('broadcasts.campaignTitle', 'Campaign Title')} *
              </label>
              <Input
                placeholder={t('broadcasts.titlePlaceholder', 'e.g. Diwali Wishes 2026')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
                {t('broadcasts.campaignType', 'Campaign Type')} *
              </label>
              <select
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm focus:ring-2 focus:ring-blue-500"
                value={campaignType}
                onChange={(e) => setCampaignType(e.target.value as CampaignType)}
              >
                {/* Cross-business guard: PVC promos only permitted for PVC business! */}
                {!isCattleFeed && (
                  <option value="pvc_promo">
                    {t('broadcasts.typePvcPromo', 'PVC Product Promotion')}
                  </option>
                )}
                <option value="festival">
                  {t('broadcasts.typeFestival', 'Festival Wishes')}
                </option>
                <option value="custom">
                  {t('broadcasts.typeCustom', 'Custom Announcement')}
                </option>
              </select>

              {isCattleFeed && campaignType === 'pvc_promo' && (
                <p className="mt-1 text-xs text-red-600">
                  ⚠️ Cattle Feed accounts are strictly excluded from PVC campaigns.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-700">
              {t('broadcasts.targetArea', 'Target Village / Area Filter (Optional)')}
            </label>
            <Input
              placeholder={t(
                'broadcasts.areaPlaceholder',
                'Leave blank for all areas, or type e.g. Mandavgan',
              )}
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
            />
          </div>
        </Card>

        {/* Audience Preview Card */}
        <Card className="space-y-3 border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              {t('broadcasts.audiencePreview', '2. Audience Segmentation Preview')}
            </h3>
            {audienceLoading && (
              <span className="text-xs text-slate-500">
                {t('common.calculating', 'Calculating...')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-xs font-medium uppercase text-emerald-800">
                {t('broadcasts.eligibleRecipients', 'Eligible Recipients')}
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-700">
                {audience.eligibleCustomers.length}
              </div>
              <div className="mt-0.5 text-xs text-emerald-600">
                {t('broadcasts.readyToQueue', 'Will be queued in batch')}
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="text-xs font-medium uppercase text-amber-800">
                {t('broadcasts.excludedRecipients', 'Excluded Contacts')}
              </div>
              <div className="mt-1 text-2xl font-bold text-amber-700">
                {audience.excludedCount}
              </div>
              <div className="mt-0.5 text-xs text-amber-600">
                {Object.entries(audience.reasons)
                  .map(([reason, count]) => `${count} ${reason.replace(/_/g, ' ')}`)
                  .join(', ') || t('broadcasts.noneExcluded', '0 excluded')}
              </div>
            </div>
          </div>
        </Card>

        {/* Message Composition Card */}
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              {t('broadcasts.messageTemplate', '3. Message Template')}
            </h3>
            <div className="flex gap-1">
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                {'{नाव}'}
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                {'{गाव}'}
              </span>
            </div>
          </div>

          <div>
            <textarea
              className="h-36 w-full rounded-lg border border-slate-300 p-3 font-sans text-sm focus:ring-2 focus:ring-blue-500"
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="Type your WhatsApp message template here..."
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              {t(
                'broadcasts.templateHint',
                'Tags like {नाव} or {name} will be automatically personalized for each customer.',
              )}
            </p>
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/campaigns')}
            disabled={saving}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            disabled={saving || audience.eligibleCustomers.length === 0}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {saving
              ? t('common.saving', 'Creating...')
              : t('broadcasts.createAndReview', 'Create Campaign & Review')}
          </Button>
        </div>
      </form>
    </div>
  );
}
