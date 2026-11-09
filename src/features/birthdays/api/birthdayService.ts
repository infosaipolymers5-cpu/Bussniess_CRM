/**
 * Customer Birthday Notification & Greeting Engine.
 * Evaluates birthdays in the configured business timezone (Asia/Kolkata),
 * enforces opt-out suppression, and queues bilingual wishes via manual WhatsApp handoff.
 */

import { supabase } from '@/lib/supabase';
import { checkRecipientEligibility } from '@/features/messaging/eligibilityService';
import { queueMessageJob } from '@/features/messaging/messageQueueService';
import type { Customer, MessageJob } from '@/lib/database.types';

export interface BirthdayCustomer {
  customerId: string;
  customerName: string;
  displayPhone: string;
  dateOfBirth: string;
  age?: number;
  isEligible: boolean;
  ineligibilityReason?: string;
}

export async function fetchTodayBirthdays(
  businessId: string,
  _timezone: string = 'Asia/Kolkata',
): Promise<{ data: BirthdayCustomer[]; error: string | null }> {
  try {
    // Current date in Asia/Kolkata
    const now = new Date();
    const kolkataFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      month: '2-digit',
      day: '2-digit',
    });
    // Format gives MM-DD
    const parts = kolkataFormatter.formatToParts(now);
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (!month || !day) {
      return { data: [], error: 'Unable to calculate local timezone date' };
    }

    const { data: rawCustomers, error } = await supabase
      .from('customers')
      .select('*, preferences:customer_preferences(*)')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .not('date_of_birth', 'is', null);

    if (error) {
      return { data: [], error: error.message };
    }

    const customers = ((rawCustomers as unknown[]) || []) as Array<
      Customer & { preferences?: { opted_out_marketing?: boolean } | null }
    >;
    const matched: BirthdayCustomer[] = [];

    for (const c of customers) {
      if (!c.date_of_birth) continue;
      // c.date_of_birth is 'YYYY-MM-DD'
      const [, cMonth, cDay] = c.date_of_birth.split('-');
      if (cMonth === month && cDay === day) {
        // Evaluate opt-out and phone validity
        const eligibility = checkRecipientEligibility({
          customer: c,
          workflowType: 'birthday',
          businessKind: 'cattle_feed',
          optOut: c.preferences?.opted_out_marketing ?? false,
        });

        const birthYear = parseInt((c.date_of_birth ?? '').split('-')[0] ?? '', 10);
        const currentYear = now.getFullYear();
        const age = !isNaN(birthYear) ? currentYear - birthYear : undefined;

        matched.push({
          customerId: c.id,
          customerName: c.name,
          displayPhone: c.display_phone || c.normalized_phone || '',
          dateOfBirth: c.date_of_birth ?? '',
          age,
          isEligible: eligibility.isEligible,
          ineligibilityReason: eligibility.explanation,
        });
      }
    }

    return { data: matched, error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch birthdays',
    };
  }
}

export function buildBirthdayWishText(params: {
  customerName: string;
  businessName: string;
  language?: 'mr' | 'en';
}): string {
  if (params.language === 'en') {
    return `Wishing you a very Happy Birthday, ${params.customerName}! 🎂🎉\n\nMay the year ahead bring you good health, prosperity, and immense happiness.\n\nWarm regards,\n${params.businessName}`;
  }

  // Marathi default
  return `वाढदिवसाच्या हार्दिक शुभेच्छा ${params.customerName} जी! 🎂🎉\n\nआपणास उदंड, निरोगी आणि समृद्ध आयुष्य लाभो हीच ईश्वरचरणी प्रार्थना!\n\nशुभेच्छुक:\n${params.businessName}`;
}

export async function queueBirthdayGreeting(params: {
  businessId: string;
  customer: BirthdayCustomer;
  businessName: string;
  language?: 'mr' | 'en';
}): Promise<{
  job: MessageJob | null;
  deepLinkUrl: string;
  error: string | null;
}> {
  try {
    const todayStr = new Date().toISOString().split('T')[0] ?? '';
    const year = todayStr.split('-')[0] ?? '';
    const idempotencyKey = `bday_${params.businessId}_${params.customer.customerId}_${year}`;

    const messageText = buildBirthdayWishText({
      customerName: params.customer.customerName,
      businessName: params.businessName,
      language: params.language ?? 'mr',
    });

    const cleanPhone = params.customer.displayPhone.replace(/\D/g, '');
    const fullPhone =
      cleanPhone.startsWith('91') && cleanPhone.length > 10
        ? cleanPhone
        : `91${cleanPhone.slice(-10)}`;
    const deepLinkUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(messageText)}`;

    const { data: job, error } = await queueMessageJob({
      businessId: params.businessId,
      customerId: params.customer.customerId,
      workflowType: 'birthday',
      transportMode: 'manual_handoff',
      scheduledDate: todayStr,
      idempotencyKey,
      recipientPhone: fullPhone,
      recipientName: params.customer.customerName,
      messageText,
      metadata: {
        dateOfBirth: params.customer.dateOfBirth,
        deepLinkUrl,
      },
    });

    if (error) {
      return { job: null, deepLinkUrl, error };
    }

    return { job, deepLinkUrl, error: null };
  } catch (err) {
    return {
      job: null,
      deepLinkUrl: '',
      error: err instanceof Error ? err.message : 'Failed to queue birthday greeting',
    };
  }
}
