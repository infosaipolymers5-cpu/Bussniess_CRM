/**
 * Message Queue Service API.
 * Authoritative management for durable scheduled queues, status transitions, and audit.
 */

import { supabase } from '@/lib/supabase';
import type {
  MessageJob,
  MessageModeSettings,
  MessageJobStatus,
  WorkflowType,
} from '@/lib/database.types';

export interface QueueJobParams {
  businessId: string;
  customerId?: string | null;
  workflowType: WorkflowType;
  transportMode?: 'manual_handoff' | 'official_api';
  scheduledDate: string;
  idempotencyKey: string;
  recipientPhone: string;
  recipientName: string;
  messageText: string;
  contextId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function queueMessageJob(
  params: QueueJobParams,
): Promise<{ data: MessageJob | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('message_jobs')
      .upsert(
        {
          business_id: params.businessId,
          customer_id: params.customerId ?? null,
          workflow_type: params.workflowType,
          transport_mode: params.transportMode ?? 'manual_handoff',
          scheduled_date: params.scheduledDate,
          idempotency_key: params.idempotencyKey,
          recipient_phone: params.recipientPhone,
          recipient_name: params.recipientName,
          message_text: params.messageText,
          context_id: params.contextId ?? null,
          metadata: params.metadata ?? {},
          status: 'awaiting_owner_action',
        },
        { onConflict: 'business_id,idempotency_key' },
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
      error: err instanceof Error ? err.message : 'Failed to queue message job',
    };
  }
}

export async function fetchMessageJobs(
  businessId: string,
  options?: {
    status?: MessageJobStatus;
    workflowType?: WorkflowType;
    scheduledDate?: string;
  },
): Promise<{ data: MessageJob[]; error: string | null }> {
  try {
    let query = supabase
      .from('message_jobs')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }
    if (options?.workflowType) {
      query = query.eq('workflow_type', options.workflowType);
    }
    if (options?.scheduledDate) {
      query = query.eq('scheduled_date', options.scheduledDate);
    }

    const { data, error } = await query;
    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch message jobs',
    };
  }
}

export async function markJobOpened(
  jobId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.rpc('mark_message_job_opened', {
      p_job_id: jobId,
    });

    if (error) {
      // Fallback direct update if RPC is missing
      const { error: updErr } = await supabase
        .from('message_jobs')
        .update({
          status: 'opened',
          opened_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (updErr) return { success: false, error: updErr.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to mark job as opened',
    };
  }
}

export async function markJobSent(
  jobId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.rpc('mark_message_job_sent', {
      p_job_id: jobId,
    });

    if (error) {
      const { error: updErr } = await supabase
        .from('message_jobs')
        .update({
          status: 'owner_marked_sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (updErr) return { success: false, error: updErr.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to mark job as sent',
    };
  }
}

export async function cancelMessageJob(
  jobId: string,
  reason?: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('message_jobs')
      .update({
        status: 'cancelled',
        last_error: reason ?? 'Cancelled by owner',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to cancel job',
    };
  }
}

export async function fetchMessageModeSettings(
  businessId: string,
): Promise<{ data: MessageModeSettings | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('message_mode_settings')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch message settings',
    };
  }
}

export async function updateMessageModeSettings(
  businessId: string,
  settings: Partial<MessageModeSettings>,
): Promise<{ data: MessageModeSettings | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('message_mode_settings')
      .upsert(
        {
          business_id: businessId,
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_id' },
      )
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update message settings',
    };
  }
}
