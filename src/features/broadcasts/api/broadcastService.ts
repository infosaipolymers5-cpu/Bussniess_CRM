/**
 * Broadcast & Marketing Campaigns API Service.
 * Implements targeted audience segmentation, PVC cross-business isolation,
 * and opt-out policy enforcement.
 */

import { supabase } from '@/lib/supabase';
import { checkRecipientEligibility } from '@/features/messaging/eligibilityService';
import { queueMessageJob } from '@/features/messaging/messageQueueService';
import type {
  Campaign,
  CampaignRecipient,
  CampaignType,
  Customer,
  WorkflowType,
} from '@/lib/database.types';

export interface CampaignWithRecipients extends Campaign {
  recipients?: CampaignRecipient[];
}

export function campaignTypeToWorkflowType(ct: CampaignType): WorkflowType {
  switch (ct) {
    case 'festival':
      return 'festival';
    case 'pvc_promo':
      return 'pvc_promo';
    case 'cattle_feed_launch':
    case 'custom':
    default:
      return 'custom_broadcast';
  }
}

export interface CreateCampaignInput {
  businessId: string;
  businessKind: 'cattle_feed' | 'pvc';
  title: string;
  campaignType: CampaignType;
  messageTemplateText: string;
  targetCriteria?: {
    villageOrArea?: string;
    groupId?: string;
    explicitCustomerIds?: string[];
  };
}

export async function fetchEligibleAudience(params: {
  businessId: string;
  campaignType: CampaignType;
  businessKind: 'cattle_feed' | 'pvc';
  villageOrArea?: string;
  groupId?: string;
  explicitCustomerIds?: string[];
}): Promise<{
  eligibleCustomers: Customer[];
  excludedCount: number;
  reasons: Record<string, number>;
}> {
  // STRICT RULE: If campaign is pvc_promo and businessKind is cattle_feed, reject!
  if (params.campaignType === 'pvc_promo' && params.businessKind === 'cattle_feed') {
    return {
      eligibleCustomers: [],
      excludedCount: 0,
      reasons: { cross_business_excluded: 0 },
    };
  }

  let query = supabase
    .from('customers')
    .select('*, preferences:customer_preferences(*)')
    .eq('business_id', params.businessId)
    .eq('is_active', true);

  if (params.villageOrArea) {
    query = query.eq('area', params.villageOrArea);
  }

  if (params.explicitCustomerIds && params.explicitCustomerIds.length > 0) {
    query = query.in('id', params.explicitCustomerIds);
  }

  const { data: rawCustomers, error } = await query;
  if (error || !rawCustomers) {
    return { eligibleCustomers: [], excludedCount: 0, reasons: {} };
  }

  const customers = ((rawCustomers as unknown[]) || []) as Array<
    Customer & { preferences?: { opted_out_marketing?: boolean } | null }
  >;

  const eligible: Customer[] = [];
  let excluded = 0;
  const reasons: Record<string, number> = {};

  const workflowType = campaignTypeToWorkflowType(params.campaignType);

  for (const c of customers) {
    const eligibility = checkRecipientEligibility({
      customer: c,
      workflowType,
      businessKind: params.businessKind,
      optOut: c.preferences?.opted_out_marketing ?? false,
    });

    if (eligibility.isEligible) {
      eligible.push(c);
    } else {
      excluded++;
      const reasonKey = eligibility.reason || 'unknown';
      reasons[reasonKey] = (reasons[reasonKey] || 0) + 1;
    }
  }

  return { eligibleCustomers: eligible, excludedCount: excluded, reasons };
}

export async function createCampaign(
  input: CreateCampaignInput,
): Promise<{ data: Campaign | null; error: string | null }> {
  try {
    // 1. Validate audience
    const audience = await fetchEligibleAudience({
      businessId: input.businessId,
      campaignType: input.campaignType,
      businessKind: input.businessKind,
      villageOrArea: input.targetCriteria?.villageOrArea,
      groupId: input.targetCriteria?.groupId,
      explicitCustomerIds: input.targetCriteria?.explicitCustomerIds,
    });

    if (audience.eligibleCustomers.length === 0) {
      return {
        data: null,
        error:
          'No eligible recipients found. Opt-outs and cross-business isolation may have excluded all selected contacts.',
      };
    }

    // 2. Insert Campaign record
    const { data: campaignData, error: campErr } = await supabase
      .from('campaigns')
      .insert({
        business_id: input.businessId,
        title: input.title,
        campaign_type: input.campaignType,
        target_audience_type: input.targetCriteria?.villageOrArea ? 'area' : 'all_active',
        target_area: input.targetCriteria?.villageOrArea || null,
        message_template: input.messageTemplateText,
        total_recipients: audience.eligibleCustomers.length,
        status: 'draft',
      })
      .select()
      .single();

    if (campErr) {
      return { data: null, error: campErr.message };
    }

    const campaign = campaignData;

    // 3. Insert Campaign Recipients
    const recipientRows = audience.eligibleCustomers.map((cust) => {
      const phone = cust.display_phone || cust.normalized_phone || '';
      const cleanPhone = phone.replace(/\D/g, '');
      const fullPhone =
        cleanPhone.startsWith('91') && cleanPhone.length > 10
          ? cleanPhone
          : `91${cleanPhone.slice(-10)}`;

      return {
        campaign_id: campaign.id,
        customer_id: cust.id,
        customer_name: cust.name,
        phone: fullPhone,
        status: 'pending' as const,
      };
    });

    const { error: recipErr } = await supabase
      .from('campaign_recipients')
      .insert(recipientRows);

    if (recipErr) {
      return { data: null, error: recipErr.message };
    }

    return { data: campaign, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to create campaign',
    };
  }
}

export async function fetchCampaigns(
  businessId: string,
): Promise<{ data: Campaign[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch campaigns',
    };
  }
}

export async function fetchCampaignRecipients(
  campaignId: string,
): Promise<{ data: CampaignRecipient[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('recipient_name');

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch recipients',
    };
  }
}

export async function launchCampaignToMessageQueue(params: {
  businessId: string;
  campaignId: string;
}): Promise<{ queuedCount: number; error: string | null }> {
  try {
    // 1. Fetch campaign
    const { data: campaign, error: campErr } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', params.campaignId)
      .single();

    if (campErr || !campaign) {
      return { queuedCount: 0, error: 'Campaign not found' };
    }

    // 2. Fetch pending recipients
    const { data: recipients, error: recErr } = await supabase
      .from('campaign_recipients')
      .select('*')
      .eq('campaign_id', params.campaignId)
      .eq('status', 'pending');

    if (recErr || !recipients || recipients.length === 0) {
      return { queuedCount: 0, error: 'No pending recipients to queue' };
    }

    let queuedCount = 0;
    const todayStr = new Date().toISOString().split('T')[0] ?? '';

    for (const r of (recipients || []) as CampaignRecipient[]) {
      const idempotencyKey = `camp_${params.campaignId}_${r.id}`;

      // Personalize template
      const personalizedText = campaign.message_template
        .replace(/\{name\}/gi, r.customer_name)
        .replace(/\{गाव\}/gi, '')
        .replace(/\{नाव\}/gi, r.customer_name);

      const { data: job, error: qErr } = await queueMessageJob({
        businessId: params.businessId,
        customerId: r.customer_id,
        workflowType: campaignTypeToWorkflowType(campaign.campaign_type),
        transportMode: 'manual_handoff',
        scheduledDate: todayStr,
        idempotencyKey,
        recipientPhone: r.phone,
        recipientName: r.customer_name,
        messageText: personalizedText,
        contextId: params.campaignId,
        metadata: {
          campaignId: params.campaignId,
          recipientId: r.id,
        },
      });

      if (!qErr && job) {
        queuedCount++;
        // Update recipient record
        await supabase
          .from('campaign_recipients')
          .update({
            job_id: job.id,
            status: 'queued',
          })
          .eq('id', r.id);
      }
    }

    // Update campaign status
    await supabase
      .from('campaigns')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.campaignId);

    return { queuedCount, error: null };
  } catch (err) {
    return {
      queuedCount: 0,
      error: err instanceof Error ? err.message : 'Failed to launch campaign',
    };
  }
}
