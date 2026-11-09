/**
 * Customer Service API layer.
 * All queries derive business tenancy from businessId and active membership.
 */

import { supabase } from '@/lib/supabase';
import { normalizePhoneNumber } from '@/lib/validation';
import type {
  Database,
  Customer,
  CustomerPreferences,
  CustomerNote,
  DuplicateReview,
} from '@/lib/database.types';

export interface CustomerWithMeta extends Customer {
  preferences?: CustomerPreferences | null;
  groups?: { id: string; name: string }[];
  tags?: { id: string; name: string; color: string }[];
  latestNote?: CustomerNote | null;
}

export interface CustomerFilterOptions {
  search?: string;
  groupId?: string;
  tagId?: string;
  isActive?: boolean;
}

/**
 * Fetch business-scoped customers with filters and associated metadata.
 */
export async function fetchCustomers(
  businessId: string,
  options?: CustomerFilterOptions,
): Promise<{ data: CustomerWithMeta[]; error: string | null }> {
  try {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive);
    }

    if (options?.search) {
      const term = options.search.trim();
      const normalizedTerm = normalizePhoneNumber(term);
      if (normalizedTerm && normalizedTerm.length >= 3) {
        query = query.or(
          `name.ilike.%${term}%,normalized_phone.ilike.%${normalizedTerm}%,display_phone.ilike.%${term}%`,
        );
      } else {
        query = query.ilike('name', `%${term}%`);
      }
    }

    const { data, error } = await query;
    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch customers',
    };
  }
}

/**
 * Get full customer profile with preferences, groups, tags, and call notes.
 */
export async function getCustomerDetails(
  customerId: string,
): Promise<{ data: CustomerWithMeta | null; error: string | null }> {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error || !customer) {
      return { data: null, error: error?.message ?? 'Customer not found' };
    }

    // Fetch preferences
    const { data: prefs } = await supabase
      .from('customer_preferences')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    // Fetch notes
    const { data: notes } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    // Fetch groups
    const { data: groupMembers } = await supabase
      .from('customer_group_members')
      .select('group_id, customer_groups(id, name)')
      .eq('customer_id', customerId);

    // Fetch tags
    const { data: tagMembers } = await supabase
      .from('customer_tags')
      .select('tag_id, tags(id, name, color)')
      .eq('customer_id', customerId);

    const fullCustomer: CustomerWithMeta = {
      ...customer,
      preferences: prefs,
      latestNote: notes?.[0],
      groups: (groupMembers ?? [])
        .map(
          (gm: { customer_groups: unknown }) =>
            gm.customer_groups as { id: string; name: string },
        )
        .filter(Boolean),
      tags: (tagMembers ?? [])
        .map(
          (tm: { tags: unknown }) =>
            tm.tags as { id: string; name: string; color: string },
        )
        .filter(Boolean),
    };

    return { data: fullCustomer, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to get customer details',
    };
  }
}

/**
 * Check if a normalized phone number already exists in this business.
 * Never silently merges; flags collisions for review.
 */
export async function checkDuplicatePhone(
  businessId: string,
  phone: string,
  excludeCustomerId?: string,
): Promise<{ isDuplicate: boolean; existingCustomer: Customer | null }> {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return { isDuplicate: false, existingCustomer: null };
  }

  let query = supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .eq('normalized_phone', normalized);

  if (excludeCustomerId) {
    query = query.neq('id', excludeCustomerId);
  }

  const { data } = await query.maybeSingle();
  if (data) {
    return { isDuplicate: true, existingCustomer: data };
  }

  return { isDuplicate: false, existingCustomer: null };
}

/**
 * Create a new customer record with phone normalization and duplicate prevention.
 */
export async function createCustomer(
  businessId: string,
  input: {
    name: string;
    phone: string;
    dateOfBirth?: string | null;
    area?: string | null;
    notes?: string | null;
    confirmDistinctDuplicate?: boolean;
    groupIds?: string[];
    tagIds?: string[];
  },
): Promise<{
  customer: Customer | null;
  duplicateWarning?: boolean;
  error: string | null;
}> {
  try {
    const normalized = normalizePhoneNumber(input.phone);

    // Duplicate check
    const { isDuplicate, existingCustomer } = await checkDuplicatePhone(
      businessId,
      input.phone,
    );

    if (isDuplicate && !input.confirmDistinctDuplicate && existingCustomer) {
      // Record duplicate review warning queue entry
      await supabase.from('duplicate_reviews').insert({
        business_id: businessId,
        normalized_phone: normalized,
        existing_customer_id: existingCustomer.id,
        incoming_customer_data: {
          name: input.name,
          phone: input.phone,
          dateOfBirth: input.dateOfBirth,
          area: input.area,
        },
        status: 'pending',
      });

      return {
        customer: null,
        duplicateWarning: true,
        error: `Customer with phone number ${existingCustomer.display_phone} (${existingCustomer.name}) already exists.`,
      };
    }

    // Insert customer
    const { data: newCustomer, error: insertError } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        name: input.name.trim(),
        display_phone: input.phone.trim(),
        normalized_phone: normalized,
        date_of_birth: input.dateOfBirth || null,
        area: input.area?.trim() || null,
        notes: input.notes?.trim() || null,
        is_active: true,
      })
      .select('*')
      .single();

    if (insertError || !newCustomer) {
      return {
        customer: null,
        error: insertError?.message ?? 'Failed to insert customer',
      };
    }

    const created = newCustomer;

    // Create default preferences
    await supabase.from('customer_preferences').insert({
      customer_id: created.id,
      opted_out_marketing: false,
      opted_out_transactional: false,
      preferred_channel: 'whatsapp',
    });

    // Link groups if provided
    if (input.groupIds && input.groupIds.length > 0) {
      const groupLinks = input.groupIds.map((gId) => ({
        group_id: gId,
        customer_id: created.id,
      }));
      await supabase.from('customer_group_members').insert(groupLinks);
    }

    // Link tags if provided
    if (input.tagIds && input.tagIds.length > 0) {
      const tagLinks = input.tagIds.map((tId) => ({
        tag_id: tId,
        customer_id: created.id,
      }));
      await supabase.from('customer_tags').insert(tagLinks);
    }

    return { customer: created, error: null };
  } catch (err) {
    return {
      customer: null,
      error: err instanceof Error ? err.message : 'Failed to create customer',
    };
  }
}

/**
 * Update an existing customer record.
 */
export async function updateCustomer(
  customerId: string,
  businessId: string,
  input: {
    name?: string;
    phone?: string;
    dateOfBirth?: string | null;
    area?: string | null;
    notes?: string | null;
    isActive?: boolean;
  },
): Promise<{ customer: Customer | null; error: string | null }> {
  try {
    const updatePayload: Database['public']['Tables']['customers']['Update'] = {};

    if (input.name) updatePayload.name = input.name.trim();
    if (input.phone) {
      updatePayload.display_phone = input.phone.trim();
      updatePayload.normalized_phone = normalizePhoneNumber(input.phone);
    }
    if (input.dateOfBirth !== undefined) updatePayload.date_of_birth = input.dateOfBirth;
    if (input.area !== undefined) updatePayload.area = input.area?.trim() || null;
    if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null;
    if (input.isActive !== undefined) updatePayload.is_active = input.isActive;

    const { data, error } = await supabase
      .from('customers')
      .update(updatePayload)
      .eq('id', customerId)
      .eq('business_id', businessId)
      .select('*')
      .single();

    if (error || !data) {
      return { customer: null, error: error?.message ?? 'Failed to update customer' };
    }

    return { customer: data, error: null };
  } catch (err) {
    return {
      customer: null,
      error: err instanceof Error ? err.message : 'Failed to update customer',
    };
  }
}

/**
 * Add a call note or promise-to-pay date with author tracking.
 */
export async function addCustomerNote(
  customerId: string,
  authorId: string,
  input: {
    content: string;
    callDate?: string;
    promiseToPayDate?: string | null;
  },
): Promise<{ note: CustomerNote | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('customer_notes')
      .insert({
        customer_id: customerId,
        author_id: authorId,
        content: input.content.trim(),
        call_date: input.callDate || new Date().toISOString(),
        promise_to_pay_date: input.promiseToPayDate || null,
      })
      .select('*')
      .single();

    if (error || !data) {
      return { note: null, error: error?.message ?? 'Failed to add note' };
    }

    return { note: data, error: null };
  } catch (err) {
    return {
      note: null,
      error: err instanceof Error ? err.message : 'Failed to add customer note',
    };
  }
}

/**
 * Update marketing and transactional opt-out preferences.
 */
export async function updateCustomerPreferences(
  customerId: string,
  input: {
    optedOutMarketing?: boolean;
    optedOutTransactional?: boolean;
    preferredChannel?: 'whatsapp' | 'sms' | 'call';
  },
): Promise<{ preferences: CustomerPreferences | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('customer_preferences')
      .update(input)
      .eq('customer_id', customerId)
      .select('*')
      .single();

    if (error || !data) {
      return {
        preferences: null,
        error: error?.message ?? 'Failed to update preferences',
      };
    }

    return { preferences: data, error: null };
  } catch (err) {
    return {
      preferences: null,
      error: err instanceof Error ? err.message : 'Failed to update preferences',
    };
  }
}

/**
 * Fetch pending duplicate phone collisions for business review.
 */
export async function fetchDuplicateReviews(
  businessId: string,
): Promise<{ data: DuplicateReview[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('duplicate_reviews')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch duplicate reviews',
    };
  }
}

/**
 * Resolve duplicate review without merging histories.
 */
export async function resolveDuplicateReview(
  reviewId: string,
  status: 'approved_distinct' | 'skipped',
  reviewerId: string,
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('duplicate_reviews')
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    return { error: error?.message ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to resolve duplicate review',
    };
  }
}
