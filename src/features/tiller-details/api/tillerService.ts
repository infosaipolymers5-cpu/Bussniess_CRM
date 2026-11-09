/**
 * Customer Power-Tiller Profiles & Spares Targeting API Service.
 * Implements machinery ownership tracking and server-side recipient filtering
 * for targeted spare-part promotions and service campaigns.
 */

import { supabase } from '@/lib/supabase';
import type { CustomerTillerDetail, Customer } from '@/lib/database.types';

export interface SaveTillerInput {
  id?: string;
  businessId: string;
  customerId: string;
  tillerBrand: string;
  tillerModel: string;
  yearOfPurchase?: number | null;
  hpRating?: number | null;
  bladeType?: string | null;
  notes?: string | null;
}

/**
 * Fetch all registered power-tillers for a specific customer.
 */
export async function fetchCustomerTillers(
  customerId: string,
): Promise<{ data: CustomerTillerDetail[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('customer_tiller_details')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch tillers',
    };
  }
}

/**
 * Save (create or update) customer power-tiller details.
 */
export async function saveCustomerTiller(
  input: SaveTillerInput,
): Promise<{ data: CustomerTillerDetail | null; error: string | null }> {
  try {
    const payload = {
      business_id: input.businessId,
      customer_id: input.customerId,
      tiller_brand: input.tillerBrand.trim(),
      tiller_model: input.tillerModel.trim(),
      year_of_purchase: input.yearOfPurchase ?? null,
      hp_rating: input.hpRating ?? null,
      blade_type: input.bladeType?.trim() || null,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let query;
    if (input.id) {
      const { business_id: _bizId, customer_id: _custId, ...updateFields } = payload;
      query = supabase
        .from('customer_tiller_details')
        .update(updateFields)
        .eq('id', input.id)
        .select()
        .single();
    } else {
      query = supabase.from('customer_tiller_details').insert(payload).select().single();
    }

    const { data, error } = await query;
    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to save tiller',
    };
  }
}

/**
 * Delete a customer power-tiller record.
 */
export async function deleteCustomerTiller(
  id: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('customer_tiller_details')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete tiller',
    };
  }
}

/**
 * Server-side targeted recipient query:
 * Find customers matching specific power-tiller brand or model for spare-part campaigns.
 */
export async function fetchCustomersByTillerFilter(params: {
  businessId: string;
  tillerBrand?: string;
  tillerModel?: string;
}): Promise<{
  customers: Array<Customer & { tiller: CustomerTillerDetail }>;
  error: string | null;
}> {
  try {
    let query = supabase
      .from('customer_tiller_details')
      .select('*, customer:customers(*)')
      .eq('business_id', params.businessId);

    if (params.tillerBrand) {
      query = query.ilike('tiller_brand', `%${params.tillerBrand.trim()}%`);
    }

    if (params.tillerModel) {
      query = query.ilike('tiller_model', `%${params.tillerModel.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      return { customers: [], error: error.message };
    }

    interface TillerWithCustomerRow extends CustomerTillerDetail {
      customer: Customer;
    }

    const rows = (data as unknown as TillerWithCustomerRow[]) || [];
    const result: Array<Customer & { tiller: CustomerTillerDetail }> = rows.map(
      (row) => ({
        ...row.customer,
        tiller: {
          id: row.id,
          business_id: row.business_id,
          customer_id: row.customer_id,
          tiller_brand: row.tiller_brand,
          tiller_model: row.tiller_model,
          year_of_purchase: row.year_of_purchase,
          hp_rating: row.hp_rating,
          blade_type: row.blade_type,
          notes: row.notes,
          created_at: row.created_at,
          updated_at: row.updated_at,
        },
      }),
    );

    return { customers: result, error: null };
  } catch (err) {
    return {
      customers: [],
      error: err instanceof Error ? err.message : 'Failed to query tiller owners',
    };
  }
}
