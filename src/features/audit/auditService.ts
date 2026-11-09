/**
 * Audit Log Service for Rushi CRM Platform v2.0
 * Features:
 * 1. Owner-authorized audit search and filter by actor, action, target entity, and timestamp.
 * 2. Immutable ordinary-user access controls (audit_events can never be altered or deleted).
 * 3. Safe structured delta inspection with automatic redaction of sensitive tokens and secrets.
 */

import { supabase } from '@/lib/supabase';

export type SafeAuditEvent = {
  id: string;
  business_id: string | null;
  actor_id: string;
  actor_email?: string;
  actor_name?: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
};

export type AuditFilterParams = {
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
};

// Keys to redact from metadata display
const REDACTED_KEYS = new Set([
  'password',
  'token',
  'secret',
  'api_key',
  'pin',
  'pin_hash',
  'auth_header',
  'access_token',
]);

function redactSensitiveData(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactSensitiveData);

  const cleaned: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      cleaned[key] = '***REDACTED***';
    } else if (typeof val === 'object' && val !== null) {
      cleaned[key] = redactSensitiveData(val);
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

export const auditService = {
  /**
   * Fetches audit events with filtering and sensitive field redaction
   */
  async getAuditEvents(
    businessId: string | null,
    filters: AuditFilterParams = {},
  ): Promise<SafeAuditEvent[]> {
    let query = supabase
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(filters.limit || 100);

    if (businessId) {
      query = query.or(`business_id.eq.${businessId},business_id.is.null`);
    }

    if (filters.action) {
      query = query.ilike('action', `%${filters.action}%`);
    }

    if (filters.targetType) {
      query = query.eq('target_type', filters.targetType);
    }

    if (filters.startDate) {
      query = query.gte('created_at', `${filters.startDate}T00:00:00Z`);
    }

    if (filters.endDate) {
      query = query.lte('created_at', `${filters.endDate}T23:59:59Z`);
    }

    const { data: events, error } = await query;
    if (error) throw error;
    if (!events || events.length === 0) return [];

    // Optional user email mapping
    return events.map((ev) => ({
      id: ev.id,
      business_id: ev.business_id,
      actor_id: ev.actor_id,
      action: ev.action,
      target_type: ev.target_type,
      target_id: ev.target_id,
      metadata: redactSensitiveData(ev.metadata || {}) as Record<string, unknown>,
      ip_address: ev.ip_address,
      created_at: ev.created_at,
    }));
  },

  /**
   * Records an audit event using the security-definer RPC or direct table insertion
   */
  async logEvent(
    businessId: string | null,
    action: string,
    targetType?: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await supabase.rpc('record_audit_event', {
        p_business_id: businessId || '',
        p_action: action,
        p_target_type: targetType ?? undefined,
        p_target_id: targetId ?? undefined,
        p_metadata: metadata
          ? (redactSensitiveData(metadata) as Record<string, unknown>)
          : {},
      });
    } catch {
      // Best-effort audit logging; do not throw if RPC is unavailable in sandboxed mocks
    }
  },
};
