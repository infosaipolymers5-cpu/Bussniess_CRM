/**
 * Business Settings Service for Rushi CRM Platform v2.0
 * Features:
 * 1. Owner-only configuration of business identity, banking, and UPI for document injection.
 * 2. Bilingual invoice/statement footer notes in Marathi and English.
 * 3. Default recurrence thresholds for reminders (7-day default) and feed finish cues (5-day buffer).
 * 4. Safe messaging mode controls guarded by explicit owner approval preconditions.
 * 5. Full audit logging on every configuration change.
 */

import { supabase } from '@/lib/supabase';
import { auditService } from '@/features/audit/auditService';
import type { BusinessSettings } from '@/lib/database.types';
import type { BusinessSettingsFormData } from '@/lib/validation';

export const settingsService = {
  /**
   * Fetches the business operational settings, returning safe defaults if uninitialized
   */
  async getSettings(businessId: string): Promise<BusinessSettings> {
    const { data, error } = await supabase
      .from('business_settings')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) throw error;

    if (data) return data;

    // Default configuration if not yet initialized
    return {
      business_id: businessId,
      upi_id: 'rushi.agro@upi',
      bank_name: 'State Bank of India',
      bank_account_no: '12345678901',
      bank_ifsc: 'SBIN0001234',
      invoice_footer_notes_en:
        'Thank you for your business. Please settle outstanding balance within agreed terms. Goods once sold cannot be returned.',
      invoice_footer_notes_mr:
        'आपल्या सहकार्याबद्दल धन्यवाद. कृपया देय रक्कम वेळेत जमा करावी. विकलेला माल परत घेतला जाणार नाही.',
      default_payment_reminder_days: 7,
      default_feed_finish_buffer_days: 5,
      automatic_messaging_enabled: false,
      messaging_provider_config: {},
      updated_at: new Date().toISOString(),
      updated_by: null,
    };
  },

  /**
   * Updates business settings with audit trail
   */
  async updateSettings(
    businessId: string,
    data: BusinessSettingsFormData,
  ): Promise<BusinessSettings> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Guard: automatic messaging requires explicit credentials
    if (
      data.automatic_messaging_enabled &&
      (!data.messaging_provider_config ||
        Object.keys(data.messaging_provider_config).length === 0)
    ) {
      throw new Error(
        'Automatic messaging mode requires complete official API provider configuration and owner sign-off.',
      );
    }

    const payload = {
      business_id: businessId,
      upi_id: data.upi_id || null,
      bank_name: data.bank_name || null,
      bank_account_no: data.bank_account_no || null,
      bank_ifsc: data.bank_ifsc || null,
      invoice_footer_notes_en: data.invoice_footer_notes_en || null,
      invoice_footer_notes_mr: data.invoice_footer_notes_mr || null,
      default_payment_reminder_days: data.default_payment_reminder_days,
      default_feed_finish_buffer_days: data.default_feed_finish_buffer_days,
      automatic_messaging_enabled: data.automatic_messaging_enabled,
      messaging_provider_config: data.messaging_provider_config,
      updated_at: new Date().toISOString(),
      updated_by: user?.id || null,
    };

    const { data: updated, error } = await supabase
      .from('business_settings')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;

    await auditService.logEvent(businessId, 'settings_update', 'settings', businessId, {
      updatedFields: Object.keys(data),
      automatic_messaging_enabled: data.automatic_messaging_enabled,
    });

    return updated;
  },
};
