import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/app/providers/BusinessProvider';
import { Button } from '@/components/ui/Button';
import { settingsService } from './settingsService';
import type { BusinessSettingsFormData } from '@/lib/validation';

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { activeBusiness, activeRole } = useBusiness();
  const isOwner = activeRole === 'owner';

  const [activeTab, setActiveTab] = useState<
    'banking' | 'footers' | 'reminders' | 'messaging'
  >('banking');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [formData, setFormData] = useState<BusinessSettingsFormData>({
    upi_id: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    invoice_footer_notes_en: '',
    invoice_footer_notes_mr: '',
    default_payment_reminder_days: 7,
    default_feed_finish_buffer_days: 5,
    automatic_messaging_enabled: false,
    messaging_provider_config: {},
  });

  const loadSettings = useCallback(async () => {
    if (!activeBusiness?.id) return;
    setLoading(true);
    try {
      const data = await settingsService.getSettings(activeBusiness.id);
      setFormData({
        upi_id: data.upi_id || '',
        bank_name: data.bank_name || '',
        bank_account_no: data.bank_account_no || '',
        bank_ifsc: data.bank_ifsc || '',
        invoice_footer_notes_en: data.invoice_footer_notes_en || '',
        invoice_footer_notes_mr: data.invoice_footer_notes_mr || '',
        default_payment_reminder_days: data.default_payment_reminder_days || 7,
        default_feed_finish_buffer_days: data.default_feed_finish_buffer_days || 5,
        automatic_messaging_enabled: data.automatic_messaging_enabled || false,
        messaging_provider_config: data.messaging_provider_config || {},
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness?.id]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness?.id || !isOwner) return;
    setSaving(true);
    setMessage(null);
    try {
      await settingsService.updateSettings(activeBusiness.id, formData);
      setMessage({
        type: 'success',
        text: 'Settings updated successfully and audit log captured!',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update settings',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {t('settings.title', 'Business Settings & System Configuration')} / प्रणाली व
          व्यवसाय सेटिंग्ज
        </h1>
        <p className="text-sm text-gray-500">
          Owner-authorized operational settings, banking details for bill injection,
          bilingual footers, and messaging modes.
        </p>
      </div>

      {/* Alert Messages */}
      {message && (
        <div
          className={`rounded-md p-4 text-sm ${
            message.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('banking')}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'banking'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Banking & UPI / बँक व युपीआय
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('footers')}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'footers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Invoice Footers / बिलावरील अटी
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'reminders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Reminders & Alerts / स्मरणपत्रे
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('messaging')}
            className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'messaging'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Messaging Mode / मेसेजिंग पद्धत
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading settings...</div>
      ) : (
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="space-y-6"
        >
          {/* Tab 1: Banking & UPI */}
          {activeTab === 'banking' && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="border-b pb-2 text-base font-semibold text-gray-900">
                Bank Account & UPI Details (Injected on Commercial Bills & Khate Utara)
              </h3>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  UPI ID (VPA) / युपीआय आयडी
                </label>
                <input
                  type="text"
                  value={formData.upi_id || ''}
                  onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                  placeholder="e.g. rushi.agro@upi"
                  disabled={!isOwner}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Bank Name / बँकेचे नाव
                  </label>
                  <input
                    type="text"
                    value={formData.bank_name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_name: e.target.value })
                    }
                    placeholder="e.g. State Bank of India"
                    disabled={!isOwner}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    IFSC Code / आयएफसी कोड
                  </label>
                  <input
                    type="text"
                    value={formData.bank_ifsc || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bank_ifsc: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="e.g. SBIN0001234"
                    disabled={!isOwner}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Bank Account Number / बँक खाते क्रमांक
                </label>
                <input
                  type="text"
                  value={formData.bank_account_no || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_account_no: e.target.value })
                  }
                  placeholder="e.g. 123456789012"
                  disabled={!isOwner}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Document Footers */}
          {activeTab === 'footers' && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="border-b pb-2 text-base font-semibold text-gray-900">
                Document Footer & Terms (Printed on Bills & Statements)
              </h3>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Marathi Terms & Conditions / मराठीतील अटी व शर्ती
                </label>
                <textarea
                  rows={3}
                  value={formData.invoice_footer_notes_mr || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_footer_notes_mr: e.target.value })
                  }
                  placeholder="आपल्या सहकार्याबद्दल धन्यवाद. कृपया देय रक्कम वेळेत जमा करावी..."
                  disabled={!isOwner}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  English Terms & Conditions / इंग्रजीतील अटी व शर्ती
                </label>
                <textarea
                  rows={3}
                  value={formData.invoice_footer_notes_en || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_footer_notes_en: e.target.value })
                  }
                  placeholder="Thank you for your business. Goods once sold will not be returned..."
                  disabled={!isOwner}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Reminders & Alerts */}
          {activeTab === 'reminders' && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="border-b pb-2 text-base font-semibold text-gray-900">
                Automated Operational Thresholds & Follow-Up Recurrence
              </h3>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Default Payment Reminder Interval (Days) / पेमेंट स्मरणपत्र कालावधी
                  (दिवस)
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={formData.default_payment_reminder_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_payment_reminder_days: parseInt(e.target.value, 10) || 7,
                    })
                  }
                  disabled={!isOwner}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none md:w-48"
                />
                <span className="mt-1 block text-xs text-gray-500">
                  Default recurrence cadence for overdue customers (Standard: 7 days).
                </span>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Feed Finish Pre-Alert Buffer (Days) / पशुखाद्य संपण्यापूर्वी इशारा
                  (दिवस)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={formData.default_feed_finish_buffer_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_feed_finish_buffer_days: parseInt(e.target.value, 10) || 5,
                    })
                  }
                  disabled={!isOwner}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none md:w-48"
                />
                <span className="mt-1 block text-xs text-gray-500">
                  Cattle Feed consumption projection alerts owner prior to farmer stock
                  depletion (Standard: 5 days).
                </span>
              </div>
            </div>
          )}

          {/* Tab 4: Messaging Mode */}
          {activeTab === 'messaging' && (
            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="border-b pb-2 text-base font-semibold text-gray-900">
                WhatsApp & Messaging Dispatch Mode
              </h3>

              <div className="space-y-1 rounded border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
                <strong>Current Production Mode:</strong> Manual WhatsApp Handoff (Safe,
                Zero-Cost, Full Control).
                <p>
                  Every reminder, bill share, and campaign opens pre-filled
                  Marathi/English text directly in WhatsApp. No risk of accidental
                  automated spam or API per-message surcharges.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="auto_messaging"
                  checked={formData.automatic_messaging_enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      automatic_messaging_enabled: e.target.checked,
                    })
                  }
                  disabled={!isOwner}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="auto_messaging"
                  className="text-sm font-medium text-gray-900"
                >
                  Enable Official WhatsApp Cloud API / स्वयंचलित मेसेजिंग सुरू करा
                </label>
              </div>

              {formData.automatic_messaging_enabled && (
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  Requires Meta Business verification, approved HSM templates, and
                  registered webhook secrets. Preconditions must be confirmed with owner
                  before release sign-off.
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          {isOwner && (
            <div className="flex justify-end gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving Settings...' : 'Save Settings / बदल जतन करा'}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
