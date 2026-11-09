/**
 * Payment Reminders API & Calculation Service.
 * Implements 7-day default recurrence, customer overrides, promise-date deferral,
 * and zero-balance stop checks.
 */

import { supabase } from '@/lib/supabase';
import { checkRecipientEligibility } from '@/features/messaging/eligibilityService';
import { queueMessageJob } from '@/features/messaging/messageQueueService';
import { formatPaise } from '@/lib/money';
import type { Customer, MessageJob, ReminderRule } from '@/lib/database.types';

export interface OverdueCustomer {
  customerId: string;
  customerName: string;
  displayPhone: string;
  balancePaise: number;
  daysOverdue: number;
  lastBillDate: string | null;
  lastRemindedAt: string | null;
  promiseDate: string | null;
  intervalDays: number;
  isSuppressed: boolean;
  suppressionReason?: string | null;
  isEligibleForReminder: boolean;
  ineligibilityReason?: string;
  notes?: string | null;
}

export async function fetchOverdueCustomers(
  businessId: string,
): Promise<{ data: OverdueCustomer[]; error: string | null }> {
  try {
    // 1. Fetch active unpaid bills
    const { data: billsData, error: billsErr } = await supabase
      .from('bills')
      .select('customer_id, balance_due_paise, bill_date, due_date')
      .eq('business_id', businessId)
      .gt('balance_due_paise', 0)
      .neq('status', 'cancelled');

    if (billsErr) {
      return { data: [], error: billsErr.message };
    }

    const bills = (billsData || []) as Array<{
      customer_id: string;
      balance_due_paise: number;
      bill_date: string;
      due_date: string | null;
    }>;

    if (bills.length === 0) {
      return { data: [], error: null };
    }

    const customerBalanceMap = new Map<
      string,
      { balancePaise: number; earliestDate: string }
    >();

    bills.forEach((b) => {
      const prev = customerBalanceMap.get(b.customer_id);
      if (prev) {
        prev.balancePaise += b.balance_due_paise;
        if (b.bill_date < prev.earliestDate) {
          prev.earliestDate = b.bill_date;
        }
      } else {
        customerBalanceMap.set(b.customer_id, {
          balancePaise: b.balance_due_paise,
          earliestDate: b.bill_date,
        });
      }
    });

    const customerIds = Array.from(customerBalanceMap.keys());
    const { data: customersData, error: custErr } = await supabase
      .from('customers')
      .select('*, preferences:customer_preferences(*)')
      .in('id', customerIds)
      .eq('is_active', true);

    if (custErr) {
      return { data: [], error: custErr.message };
    }

    const customers = ((customersData as unknown[]) || []) as Array<
      Customer & { preferences?: { opted_out_marketing?: boolean } | null }
    >;
    if (customers.length === 0) {
      return { data: [], error: null };
    }

    // 2. Fetch business reminder settings (for default interval)
    const { data: settingsData } = await supabase
      .from('message_mode_settings')
      .select('default_payment_reminder_interval_days')
      .eq('business_id', businessId)
      .maybeSingle();

    const defaultInterval = settingsData?.default_payment_reminder_interval_days ?? 7;

    // 3. Fetch customer reminder rules & overrides
    const { data: rulesData } = await supabase
      .from('reminder_rules')
      .select('*')
      .eq('business_id', businessId);

    const rulesMap = new Map<string, ReminderRule>();
    ((rulesData as ReminderRule[]) || []).forEach((r) => {
      rulesMap.set(r.customer_id, r);
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    const overdueList: OverdueCustomer[] = customers.map((c) => {
      const rule = rulesMap.get(c.id);
      const balanceInfo = customerBalanceMap.get(c.id);
      const balancePaise = balanceInfo?.balancePaise ?? 0;
      const intervalDays = rule?.interval_days ?? defaultInterval;
      const promiseDate = rule?.promise_date ?? null;
      const isSuppressed = rule?.is_suppressed ?? false;
      const lastRemindedAt = rule?.last_reminded_at ?? null;

      // Calculate days overdue based on earliest bill date
      const refDate = new Date(balanceInfo?.earliestDate || c.updated_at || c.created_at);
      const diffTime = Math.max(0, now.getTime() - refDate.getTime());
      const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Check recipient eligibility
      const eligibility = checkRecipientEligibility({
        customer: c,
        workflowType: 'payment_reminder',
        businessKind: 'cattle_feed',
        optOut: c.preferences?.opted_out_marketing ?? false,
        outstandingBalancePaise: balancePaise,
        promiseDate,
        isRuleSuppressed: isSuppressed,
        currentDate: todayStr,
      });

      // Recurrence check: If reminded within intervalDays, defer unless overdue
      let eligible = eligibility.isEligible;
      let ineligibilityReason = eligibility.explanation;

      if (eligible && lastRemindedAt) {
        const lastRemindedDate = new Date(lastRemindedAt);
        const daysSinceReminder = Math.floor(
          (now.getTime() - lastRemindedDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysSinceReminder < intervalDays) {
          eligible = false;
          ineligibilityReason = `Recently reminded ${daysSinceReminder} day(s) ago (Interval: ${intervalDays} days)`;
        }
      }

      return {
        customerId: c.id,
        customerName: c.name,
        displayPhone: c.display_phone || c.normalized_phone || '',
        balancePaise,
        daysOverdue,
        lastBillDate: balanceInfo?.earliestDate || null,
        lastRemindedAt,
        promiseDate,
        intervalDays,
        isSuppressed,
        suppressionReason: rule?.suppression_reason,
        notes: rule?.notes,
        isEligibleForReminder: eligible,
        ineligibilityReason,
      };
    });

    return { data: overdueList, error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch overdue customers',
    };
  }
}

export async function saveReminderRule(params: {
  businessId: string;
  customerId: string;
  intervalDays?: number;
  promiseDate?: string | null;
  isSuppressed?: boolean;
  suppressionReason?: string | null;
  notes?: string | null;
}): Promise<{ data: ReminderRule | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('reminder_rules')
      .upsert(
        {
          business_id: params.businessId,
          customer_id: params.customerId,
          interval_days: params.intervalDays ?? 7,
          promise_date: params.promiseDate ?? null,
          is_suppressed: params.isSuppressed ?? false,
          suppression_reason: params.suppressionReason ?? null,
          notes: params.notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id,customer_id' },
      )
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to save reminder rule',
    };
  }
}

export function buildPaymentReminderText(params: {
  customerName: string;
  balancePaise: number;
  businessName: string;
  upiId?: string;
  language?: 'mr' | 'en';
}): string {
  const formattedAmount = formatPaise(params.balancePaise);
  const upiLine = params.upiId ? `\nUPI ID: ${params.upiId}` : '';

  if (params.language === 'en') {
    return `Dear ${params.customerName},\n\nThis is a gentle payment reminder from ${params.businessName}.\nYour outstanding balance is ${formattedAmount}.\nKindly clear the payment at your earliest convenience.${upiLine}\n\nThank you for your business!`;
  }

  // Marathi default
  return `नमस्कार ${params.customerName} जी,\n\n${params.businessName} कडून नम्र विनंती.\nआपल्या खात्यावरील बाकी रक्कम ${formattedAmount} आहे.\nकृपया वेळेवर भरणा करून सहकार्य करावे.${upiLine}\n\nआपल्या सहकार्याबद्दल धन्यवाद!`;
}

export async function queuePaymentReminder(params: {
  businessId: string;
  customer: OverdueCustomer | Customer;
  businessName: string;
  upiId?: string;
  language?: 'mr' | 'en';
  scheduledDate?: string;
}): Promise<{
  job: MessageJob | null;
  deepLinkUrl: string;
  error: string | null;
}> {
  try {
    const customerId =
      'customerId' in params.customer ? params.customer.customerId : params.customer.id;
    const customerName =
      'customerName' in params.customer
        ? params.customer.customerName
        : params.customer.name;
    const phone =
      'displayPhone' in params.customer
        ? params.customer.displayPhone
        : params.customer.display_phone || params.customer.normalized_phone || '';
    const balancePaise =
      'balancePaise' in params.customer ? params.customer.balancePaise : 0;

    const scheduledDate =
      params.scheduledDate ?? new Date().toISOString().split('T')[0] ?? '';
    const idempotencyKey = `reminder_${params.businessId}_${customerId}_${scheduledDate}`;

    const messageText = buildPaymentReminderText({
      customerName,
      balancePaise,
      businessName: params.businessName,
      upiId: params.upiId,
      language: params.language ?? 'mr',
    });

    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone =
      cleanPhone.startsWith('91') && cleanPhone.length > 10
        ? cleanPhone
        : `91${cleanPhone.slice(-10)}`;
    const deepLinkUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(messageText)}`;

    // Queue in message_jobs
    const { data: job, error: qErr } = await queueMessageJob({
      businessId: params.businessId,
      customerId,
      workflowType: 'payment_reminder',
      transportMode: 'manual_handoff',
      scheduledDate,
      idempotencyKey,
      recipientPhone: fullPhone,
      recipientName: customerName,
      messageText,
      metadata: {
        balancePaise,
        deepLinkUrl,
      },
    });

    if (qErr) {
      return { job: null, deepLinkUrl, error: qErr };
    }

    // Update reminder_rules last_reminded_at
    await supabase.from('reminder_rules').upsert(
      {
        business_id: params.businessId,
        customer_id: customerId,
        last_reminded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,customer_id' },
    );

    return { job, deepLinkUrl, error: null };
  } catch (err) {
    return {
      job: null,
      deepLinkUrl: '',
      error: err instanceof Error ? err.message : 'Failed to queue payment reminder',
    };
  }
}
