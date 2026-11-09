/**
 * Broadcast Campaigns List Page.
 * Manages marketing campaigns, recipient batches, and message queue launches.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { fetchCampaigns, launchCampaignToMessageQueue } from './api/broadcastService';
import type { Campaign } from '@/lib/database.types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function CampaignListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeBusiness } = useBusiness();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCampaigns(activeBusiness.id);
      if (res.error) {
        setError(res.error);
      } else {
        setCampaigns(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const handleLaunchCampaign = async (campaignId: string) => {
    if (!activeBusiness?.id) return;
    if (
      !confirm(
        t(
          'broadcasts.confirmLaunch',
          'Launch this campaign into the message queue? Jobs will be prepared for WhatsApp handoff.',
        ),
      )
    ) {
      return;
    }

    setLaunchingId(campaignId);
    try {
      const res = await launchCampaignToMessageQueue({
        businessId: activeBusiness.id,
        campaignId,
      });

      if (res.error) {
        alert(res.error);
      } else {
        alert(
          t(
            'broadcasts.launchSuccess',
            `Successfully queued ${res.queuedCount} message jobs! Head to the Messages hub to dispatch them.`,
          ),
        );
        await loadCampaigns();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to launch campaign');
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('broadcasts.title', 'Marketing & Festival Campaigns')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              'broadcasts.subtitle',
              'Audience-segmented WhatsApp broadcasts with opt-out protection and cross-business isolation.',
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void loadCampaigns();
            }}
            disabled={loading}
          >
            {loading ? t('common.loading', 'Loading...') : t('common.refresh', 'Refresh')}
          </Button>
          <Button onClick={() => navigate('/campaigns/new')}>
            + {t('broadcasts.newCampaign', 'New Campaign')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-slate-500">
          {t('common.loading', 'Loading campaigns...')}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <p className="text-base font-medium">
            {t('broadcasts.noCampaigns', 'No broadcast campaigns created yet.')}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t(
              'broadcasts.startFirst',
              'Create festival greetings, special offers, or new product announcements.',
            )}
          </p>
          <div className="mt-4">
            <Button onClick={() => navigate('/campaigns/new')}>
              {t('broadcasts.createFirstCampaign', 'Create First Campaign')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {campaigns.map((camp) => (
            <Card
              key={camp.id}
              className="flex flex-col items-start justify-between gap-4 p-5 transition hover:border-slate-300 md:flex-row md:items-center"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">{camp.title}</span>
                  <Badge
                    variant="primary"
                    className="bg-slate-100 text-xs uppercase text-slate-800"
                  >
                    {camp.campaign_type.replace(/_/g, ' ')}
                  </Badge>
                  <Badge
                    variant={
                      camp.status === 'completed'
                        ? 'success'
                        : camp.status === 'active'
                          ? 'warning'
                          : 'secondary'
                    }
                  >
                    {camp.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>
                    {t('broadcasts.recipients', 'Recipients')}:{' '}
                    <strong>{camp.total_recipients}</strong>
                  </span>
                  <span>
                    {t('broadcasts.sent', 'Sent')}: <strong>{camp.sent_count}</strong>
                  </span>
                  <span>
                    {t('broadcasts.created', 'Created')}:{' '}
                    {new Date(camp.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="line-clamp-1 max-w-xl text-xs italic text-slate-600">
                  "{camp.message_template}"
                </p>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                {camp.status === 'draft' && (
                  <Button
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={launchingId === camp.id}
                    onClick={() => {
                      void handleLaunchCampaign(camp.id);
                    }}
                  >
                    🚀{' '}
                    {launchingId === camp.id
                      ? t('common.launching', 'Launching...')
                      : t('broadcasts.launchToQueue', 'Launch to Queue')}
                  </Button>
                )}

                {camp.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/messages')}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    💬 {t('broadcasts.viewInMessages', 'View in Messages Hub')}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
