/**
 * Customer Groups & Tags Service API.
 * Provides business-scoped group and tag management.
 */

import { supabase } from '@/lib/supabase';
import type { CustomerGroup, Tag } from '@/lib/database.types';

export interface CustomerGroupWithCount extends CustomerGroup {
  memberCount?: number;
}

/**
 * Fetch all groups for a business with member counts.
 */
export async function fetchGroups(
  businessId: string,
): Promise<{ data: CustomerGroupWithCount[]; error: string | null }> {
  try {
    const { data: groups, error } = await supabase
      .from('customer_groups')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    // Get counts
    const groupList = (groups ?? []) as CustomerGroupWithCount[];
    for (const group of groupList) {
      const { count } = await supabase
        .from('customer_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id);
      group.memberCount = count ?? 0;
    }

    return { data: groupList, error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch customer groups',
    };
  }
}

/**
 * Create a new customer group.
 */
export async function createGroup(
  businessId: string,
  input: { name: string; description?: string | null },
): Promise<{ group: CustomerGroup | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('customer_groups')
      .insert({
        business_id: businessId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
      })
      .select('*')
      .single();

    if (error || !data) {
      return { group: null, error: error?.message ?? 'Failed to create group' };
    }

    return { group: data, error: null };
  } catch (err) {
    return {
      group: null,
      error: err instanceof Error ? err.message : 'Failed to create group',
    };
  }
}

/**
 * Delete a customer group.
 */
export async function deleteGroup(groupId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('customer_groups').delete().eq('id', groupId);
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete group' };
  }
}

/**
 * Fetch all tags for a business.
 */
export async function fetchTags(
  businessId: string,
): Promise<{ data: Tag[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data ?? [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch tags',
    };
  }
}

/**
 * Create a new tag.
 */
export async function createTag(
  businessId: string,
  input: { name: string; color?: string },
): Promise<{ tag: Tag | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('tags')
      .insert({
        business_id: businessId,
        name: input.name.trim(),
        color: input.color || '#3b82f6',
      })
      .select('*')
      .single();

    if (error || !data) {
      return { tag: null, error: error?.message ?? 'Failed to create tag' };
    }

    return { tag: data, error: null };
  } catch (err) {
    return {
      tag: null,
      error: err instanceof Error ? err.message : 'Failed to create tag',
    };
  }
}

/**
 * Delete a tag.
 */
export async function deleteTag(tagId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.from('tags').delete().eq('id', tagId);
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to delete tag' };
  }
}
