/**
 * Birthday Alert Banner Component.
 * Displays customers celebrating birthdays today with one-click WhatsApp greetings.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchTodayBirthdays,
  queueBirthdayGreeting,
  type BirthdayCustomer,
} from './api/birthdayService';
import { markJobOpened, markJobSent } from '@/features/messaging/messageQueueService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface BirthdayAlertBannerProps {
  businessId: string;
  businessName: string;
}

export function BirthdayAlertBanner({
  businessId,
  businessName,
}: BirthdayAlertBannerProps) {
  const { t, i18n } = useTranslation();
  const [birthdays, setBirthdays] = useState<BirthdayCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [handledJobs, setHandledJobs] = useState<
    Record<string, { jobId: string; status: 'opened' | 'sent' }>
  >({});
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetchTodayBirthdays(businessId);
        if (isMounted && res.data) {
          setBirthdays(res.data);
        }
      } catch (err) {
        console.error('Failed to load birthdays', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, [businessId]);

  if (loading || birthdays.length === 0 || dismissed) {
    return null;
  }

  const handleSendWish = async (c: BirthdayCustomer) => {
    try {
      const res = await queueBirthdayGreeting({
        businessId,
        customer: c,
        businessName,
        language: i18n.language === 'mr' ? 'mr' : 'en',
      });

      if (res.job) {
        await markJobOpened(res.job.id);
        setHandledJobs((prev) => ({
          ...prev,
          [c.customerId]: { jobId: res.job!.id, status: 'opened' },
        }));
        window.open(res.deepLinkUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send birthday wish');
    }
  };

  const handleMarkSent = async (customerId: string, jobId: string) => {
    try {
      await markJobSent(jobId);
      setHandledJobs((prev) => ({
        ...prev,
        [customerId]: { jobId, status: 'sent' },
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark sent');
    }
  };

  return (
    <div className="relative rounded-xl border border-purple-200 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 p-4 shadow-sm">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-3 text-sm font-bold text-slate-400 hover:text-slate-600"
        title={t('common.dismiss', 'Dismiss')}
      >
        ✕
      </button>

      <div className="flex items-start gap-3">
        <span className="text-3xl" role="img" aria-label="birthday cake">
          🎂
        </span>

        <div className="flex-1 space-y-2">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-purple-900">
              <span>{t('birthdays.todayAlert', "Today's Birthdays!")}</span>
              <Badge variant="primary" className="bg-purple-600 text-xs text-white">
                {birthdays.length} {t('birthdays.celebrants', 'celebrant(s)')}
              </Badge>
            </h3>
            <p className="mt-0.5 text-xs text-purple-700">
              {t(
                'birthdays.wishHint',
                'Strengthen relationships by sending a warm personalized birthday greeting.',
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 md:grid-cols-3">
            {birthdays.map((c) => {
              const handled = handledJobs[c.customerId];

              return (
                <div
                  key={c.customerId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-purple-100 bg-white/80 p-2.5 text-xs backdrop-blur"
                >
                  <div className="truncate">
                    <div className="truncate font-medium text-slate-900">
                      {c.customerName}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      {c.displayPhone}
                    </div>
                  </div>

                  <div>
                    {!c.isEligible ? (
                      <span className="text-[11px] italic text-slate-400">
                        {t('birthdays.optedOut', 'Opted Out')}
                      </span>
                    ) : handled?.status === 'opened' ? (
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                        onClick={() => {
                          void handleMarkSent(c.customerId, handled.jobId);
                        }}
                      >
                        ✓ {t('common.confirm', 'Confirm')}
                      </Button>
                    ) : handled?.status === 'sent' ? (
                      <span className="text-xs font-medium text-emerald-600">
                        ✓ {t('common.sent', 'Sent')}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        className="flex h-7 items-center gap-1 bg-purple-600 px-2.5 py-1 text-xs text-white hover:bg-purple-700"
                        onClick={() => {
                          void handleSendWish(c);
                        }}
                      >
                        <span>🎉</span>
                        <span>{t('birthdays.wish', 'Wish')}</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
