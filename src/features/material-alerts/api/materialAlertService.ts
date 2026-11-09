/**
 * Material Alert (Feed Finish) Calculation & API Service.
 * Tracks cattle feed consumption, schedules 5-day pre-finish reminders,
 * and manages status lifecycle (active -> resolved / superseded).
 */

import { supabase } from '@/lib/supabase';
import { checkRecipientEligibility } from '@/features/messaging/eligibilityService';
import { queueMessageJob } from '@/features/messaging/messageQueueService';
import type { Customer, MaterialAlert, MessageJob } from '@/lib/database.types';

export interface ActiveMaterialAlertItem {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  displayPhone: string;
  billId: string;
  productName: string;
  quantityBags: number;
  herdSize: number;
  dailyFeedingRateKg: number;
  estimatedDurationDays: number;
  billDate: string;
  expectedFinishDate: string;
  alertDate: string;
  daysUntilFinish: number;
  status: 'active' | 'resolved' | 'suppressed' | 'superseded';
  isEligible: boolean;
  notes?: string | null;
}

export async function fetchMaterialAlerts(
  businessId: string,
  options?: { status?: 'suppressed' | 'active' | 'resolved' | 'superseded' },
): Promise<{ data: ActiveMaterialAlertItem[]; error: string | null }> {
  try {
    let query = supabase
      .from('material_alerts')
      .select('*, customer:customers(*, preferences:customer_preferences(*))')
      .eq('business_id', businessId)
      .order('expected_finish_date', { ascending: true });

    if (options?.status) {
      query = query.eq('status', options.status);
    } else {
      query = query.eq('status', 'active');
    }

    const { data: rawAlerts, error } = await query;
    if (error) {
      return { data: [], error: error.message };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    type RawAlertRow = MaterialAlert & {
      customer: Customer & {
        preferences?: { opted_out_marketing?: boolean } | null;
      };
    };

    const items: ActiveMaterialAlertItem[] = (
      ((rawAlerts as unknown[]) || []) as RawAlertRow[]
    ).map((row) => {
      const customer = row.customer;
      const finishDate = new Date(row.expected_finish_date);
      finishDate.setHours(0, 0, 0, 0);

      const diffMs = finishDate.getTime() - today.getTime();
      const daysUntilFinish = Math.round(diffMs / (1000 * 60 * 60 * 24));

      const eligibility = customer
        ? checkRecipientEligibility({
            customer,
            workflowType: 'material_finish',
            businessKind: 'cattle_feed',
            optOut: customer.preferences?.opted_out_marketing ?? false,
          })
        : { isEligible: false, explanation: 'Missing customer' };

      return {
        id: row.id,
        businessId: row.business_id,
        customerId: row.customer_id,
        customerName: customer?.name || 'Unknown',
        displayPhone: customer?.display_phone || customer?.normalized_phone || '',
        billId: row.bill_id,
        productName: row.product_name,
        quantityBags: Number(row.quantity_bags),
        herdSize: row.herd_size,
        dailyFeedingRateKg: Number(row.daily_feeding_rate_kg),
        estimatedDurationDays: row.estimated_duration_days,
        billDate: row.bill_date,
        expectedFinishDate: row.expected_finish_date,
        alertDate: row.alert_date,
        daysUntilFinish,
        status: row.status,
        isEligible: eligibility.isEligible,
        notes: row.notes,
      };
    });

    return { data: items, error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch material alerts',
    };
  }
}

export async function createMaterialAlert(params: {
  businessId: string;
  customerId: string;
  billId: string;
  productName: string;
  quantityBags: number;
  herdSize?: number;
  dailyFeedingRateKg?: number;
  estimatedDurationDays?: number;
  billDate: string; // YYYY-MM-DD
  daysBeforeAlert?: number;
}): Promise<{ data: MaterialAlert | null; error: string | null }> {
  try {
    const herdSize = params.herdSize ?? 5;
    const dailyRate = params.dailyFeedingRateKg ?? 5.0; // 5 kg per animal per day

    // If duration not provided, estimate: bags * 50kg / (herdSize * dailyRate)
    let duration = params.estimatedDurationDays;
    if (!duration || duration <= 0) {
      const totalKg = params.quantityBags * 50;
      const dailyConsumption = herdSize * dailyRate;
      duration = Math.max(1, Math.round(totalKg / (dailyConsumption || 1)));
    }

    const billDateObj = new Date(params.billDate);
    const finishDateObj = new Date(billDateObj);
    finishDateObj.setDate(billDateObj.getDate() + duration);
    const finishDateStr = finishDateObj.toISOString().split('T')[0] ?? '';

    const alertDaysBefore = params.daysBeforeAlert ?? 5;
    const alertDateObj = new Date(finishDateObj);
    alertDateObj.setDate(finishDateObj.getDate() - alertDaysBefore);
    const alertDateStr = alertDateObj.toISOString().split('T')[0] ?? '';

    // Mark previous active alerts for this customer as superseded
    await supabase
      .from('material_alerts')
      .update({
        status: 'superseded',
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', params.businessId)
      .eq('customer_id', params.customerId)
      .eq('status', 'active');

    const { data, error } = await supabase
      .from('material_alerts')
      .insert({
        business_id: params.businessId,
        customer_id: params.customerId,
        bill_id: params.billId,
        product_name: params.productName,
        quantity_bags: params.quantityBags,
        herd_size: herdSize,
        daily_feeding_rate_kg: dailyRate,
        estimated_duration_days: duration,
        bill_date: params.billDate,
        expected_finish_date: finishDateStr,
        alert_date: alertDateStr,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create material alert',
    };
  }
}

export async function resolveMaterialAlert(
  alertId: string,
  resolutionStatus: 'resolved' | 'suppressed' = 'resolved',
  notes?: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('material_alerts')
      .update({
        status: resolutionStatus,
        resolved_at: new Date().toISOString(),
        notes: notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to resolve alert',
    };
  }
}

export function buildMaterialAlertText(params: {
  customerName: string;
  productName: string;
  daysRemaining: number;
  businessName: string;
  businessPhone?: string;
  language?: 'mr' | 'en';
}): string {
  const days = Math.max(0, params.daysRemaining);
  const phoneLine = params.businessPhone ? `\nसंपर्क: ${params.businessPhone}` : '';

  if (params.language === 'en') {
    return `Dear ${params.customerName},\n\nThis is a friendly reminder from ${params.businessName}.\nYour cattle feed supply of ${params.productName} is estimated to finish in approx ${days} days.\n\nTo ensure uninterrupted feed for your herd, please place your next order in advance.${params.businessPhone ? `\nContact: ${params.businessPhone}` : ''}\n\nThank you!`;
  }

  // Marathi default
  return `नमस्कार ${params.customerName} जी,\n\n${params.businessName} कडून नम्र आठवण.\nआपल्याकडे घेतलेली '${params.productName}' साधारण ${days} दिवसांत संपण्याची शक्यता आहे.\n\nजनावरांचे खाद्य वेळेत मिळावे यासाठी कृपया आजच नवीन ऑर्डर नोंदवा.${phoneLine}\n\nधन्यवाद!`;
}

export async function queueMaterialAlertNotification(params: {
  businessId: string;
  alert: ActiveMaterialAlertItem;
  businessName: string;
  businessPhone?: string;
  language?: 'mr' | 'en';
}): Promise<{
  job: MessageJob | null;
  deepLinkUrl: string;
  error: string | null;
}> {
  try {
    const todayStr = new Date().toISOString().split('T')[0] ?? '';
    const idempotencyKey = `mat_${params.businessId}_${params.alert.id}_${todayStr}`;

    const messageText = buildMaterialAlertText({
      customerName: params.alert.customerName,
      productName: params.alert.productName,
      daysRemaining: params.alert.daysUntilFinish,
      businessName: params.businessName,
      businessPhone: params.businessPhone,
      language: params.language ?? 'mr',
    });

    const cleanPhone = params.alert.displayPhone.replace(/\D/g, '');
    const fullPhone =
      cleanPhone.startsWith('91') && cleanPhone.length > 10
        ? cleanPhone
        : `91${cleanPhone.slice(-10)}`;
    const deepLinkUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(messageText)}`;

    const { data: job, error } = await queueMessageJob({
      businessId: params.businessId,
      customerId: params.alert.customerId,
      workflowType: 'material_finish',
      transportMode: 'manual_handoff',
      scheduledDate: todayStr,
      idempotencyKey,
      recipientPhone: fullPhone,
      recipientName: params.alert.customerName,
      messageText,
      contextId: params.alert.id,
      metadata: {
        alertId: params.alert.id,
        productName: params.alert.productName,
        expectedFinishDate: params.alert.expectedFinishDate,
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
      error: err instanceof Error ? err.message : 'Failed to queue material alert',
    };
  }
}
