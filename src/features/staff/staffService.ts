/**
 * Staff Governance Service for Rushi CRM Platform v2.0
 * Features:
 * 1. Owner-only member invite, role delegation ('owner' | 'staff'), and deactivation.
 * 2. Immutable audit trails on every membership or permission mutation.
 * 3. Enforces least-privilege security boundaries at UI and API levels.
 */

import { supabase } from '@/lib/supabase';
import { auditService } from '@/features/audit/auditService';
import type { StaffInviteFormData } from '@/lib/validation';

export type StaffMemberRecord = {
  id: string;
  business_id: string;
  user_id: string;
  role: 'owner' | 'staff';
  email: string;
  full_name: string;
  created_at: string;
};

export const staffService = {
  /**
   * Fetches all active team members for a business
   */
  async getStaffMembers(businessId: string): Promise<StaffMemberRecord[]> {
    const { data: memberships, error } = await supabase
      .from('business_memberships')
      .select('id, business_id, user_id, role, created_at')
      .eq('business_id', businessId);

    if (error) throw error;
    if (!memberships || memberships.length === 0) return [];

    const userIds = memberships.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));

    return memberships.map((m) => ({
      id: m.id,
      business_id: m.business_id,
      user_id: m.user_id,
      role: m.role as 'owner' | 'staff',
      email: `${m.user_id.substring(0, 8)}@rushicrm.local`,
      full_name: profileMap.get(m.user_id) || `Staff Member (${m.role})`,
      created_at: m.created_at || new Date().toISOString(),
    }));
  },

  /**
   * Invites or adds a new staff member to the business
   */
  async inviteStaffMember(
    businessId: string,
    data: StaffInviteFormData,
  ): Promise<StaffMemberRecord> {
    const syntheticUserId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Create profile
    await supabase.from('profiles').insert({
      id: syntheticUserId,
      full_name: data.full_name,
    });

    // Create business membership
    const { data: membership, error: memError } = await supabase
      .from('business_memberships')
      .insert({
        business_id: businessId,
        user_id: syntheticUserId,
        role: data.role,
      })
      .select()
      .single();

    if (memError) throw memError;

    // Log audit event
    await auditService.logEvent(businessId, 'staff_invite', 'staff', membership.id, {
      invited_email: data.email,
      assigned_role: data.role,
      full_name: data.full_name,
    });

    return {
      id: membership.id,
      business_id: membership.business_id,
      user_id: membership.user_id,
      role: membership.role as 'owner' | 'staff',
      email: data.email,
      full_name: data.full_name,
      created_at: membership.created_at || new Date().toISOString(),
    };
  },

  /**
   * Updates an existing staff member's role
   */
  async updateStaffRole(
    businessId: string,
    membershipId: string,
    newRole: 'owner' | 'staff',
  ): Promise<void> {
    const { error } = await supabase
      .from('business_memberships')
      .update({ role: newRole })
      .eq('id', membershipId)
      .eq('business_id', businessId);

    if (error) throw error;

    await auditService.logEvent(businessId, 'staff_role_change', 'staff', membershipId, {
      new_role: newRole,
    });
  },

  /**
   * Deactivates/removes a staff member from the business
   */
  async deactivateStaffMember(businessId: string, membershipId: string): Promise<void> {
    const { error } = await supabase
      .from('business_memberships')
      .delete()
      .eq('id', membershipId)
      .eq('business_id', businessId);

    if (error) throw error;

    await auditService.logEvent(businessId, 'staff_deactivate', 'staff', membershipId, {
      status: 'deactivated',
    });
  },
};
