/**
 * Transport & Recurrence Settings Dialog.
 * Enforces 7-day default payment reminder interval, material finish cue period,
 * and guarded transport switches.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  fetchMessageModeSettings,
  updateMessageModeSettings,
} from './messageQueueService';
import type { MessageModeSettings } from '@/lib/database.types';

interface TransportSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  onSaved: () => void;
}

export function TransportSettingsDialog({
  isOpen,
  onClose,
  businessId,
  onSaved,
}: TransportSettingsDialogProps) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Partial<MessageModeSettings>>({
    default_payment_reminder_interval_days: 7,
    material_alert_days_before: 5,
    payment_reminders_mode: 'manual_handoff',
    birthdays_mode: 'manual_handoff',
    festival_wishes_mode: 'manual_handoff',
    delivery_announcements_mode: 'manual_handoff',
    custom_campaigns_mode: 'manual_handoff',
    official_api_configured: false,
    official_api_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!businessId) return;
      setLoading(true);
      try {
        const res = await fetchMessageModeSettings(businessId);
        if (res.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    }
    if (isOpen) {
      void load();
    }
  }, [businessId, isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const interval = Number(settings.default_payment_reminder_interval_days) || 7;
      if (interval < 1) {
        setError(
          t(
            'settings.intervalMinError',
            'Payment reminder interval must be at least 1 day',
          ),
        );
        setSaving(false);
        return;
      }

      const res = await updateMessageModeSettings(businessId, {
        default_payment_reminder_interval_days: interval,
        material_alert_days_before: Number(settings.material_alert_days_before) || 5,
        payment_reminders_mode: settings.payment_reminders_mode,
        birthdays_mode: settings.birthdays_mode,
        festival_wishes_mode: settings.festival_wishes_mode,
        delivery_announcements_mode: settings.delivery_announcements_mode,
        custom_campaigns_mode: settings.custom_campaigns_mode,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onSaved();
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.messageSettingsTitle', 'Communication & WhatsApp Settings')}
    >
      <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1 text-sm">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-6 text-center text-slate-500">
            {t('common.loading', 'Loading settings...')}
          </div>
        ) : (
          <>
            {/* Recurrence Rules */}
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h4 className="font-semibold text-slate-800">
                {t('settings.recurrenceRules', 'Recurrence & Schedule Rules')}
              </h4>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  {t(
                    'settings.defaultReminderInterval',
                    'Default Payment Reminder Recurrence (Days)',
                  )}{' '}
                  *
                </label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.default_payment_reminder_interval_days || 7}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      default_payment_reminder_interval_days: Math.max(
                        1,
                        parseInt(e.target.value, 10) || 7,
                      ),
                    })
                  }
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {t(
                    'settings.defaultIntervalHint',
                    'Standard default is 7 days between automated payment reminders for customers with balance.',
                  )}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  {t(
                    'settings.materialAlertCue',
                    'Feed-Finish Pre-Alert Window (Days Before Exhaustion)',
                  )}{' '}
                  *
                </label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.material_alert_days_before || 5}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      material_alert_days_before: Math.max(
                        1,
                        parseInt(e.target.value, 10) || 5,
                      ),
                    })
                  }
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  {t(
                    'settings.materialAlertHint',
                    'Notifies farmers 5 days before their purchased feed runs out.',
                  )}
                </p>
              </div>
            </div>

            {/* Transport Modes */}
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h4 className="font-semibold text-slate-800">
                {t('settings.transportModes', 'Active Transport Modes')}
              </h4>
              <p className="text-xs text-slate-600">
                {t(
                  'settings.transportDesc',
                  'By default, all messages use manual WhatsApp deep-link handoff (100% free, no provider lock-in).',
                )}
              </p>

              <div className="space-y-1 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="font-semibold">
                  ⚠️ {t('settings.officialApiStatus', 'Official Meta WhatsApp Cloud API')}
                </div>
                <div>
                  {settings.official_api_configured
                    ? t('settings.apiConfigured', 'Configured')
                    : t(
                        'settings.apiNotConfigured',
                        'Not Configured. Official direct background API requires Meta Business verification and API credentials. Manual handoff is active and recommended.',
                      )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={() => {
                  void handleSave();
                }}
                disabled={saving}
              >
                {saving
                  ? t('common.saving', 'Saving...')
                  : t('common.save', 'Save Settings')}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
