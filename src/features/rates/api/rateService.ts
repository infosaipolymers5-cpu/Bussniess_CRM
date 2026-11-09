/**
 * Customer Rates Service API layer.
 * Custom rate overrides per customer in Cattle Feed.
 */

import { supabase } from '@/lib/supabase';
import { rupeesToPaise } from '@/lib/money';
import type { CustomerRate, Product } from '@/lib/database.types';

/**
 * Fetch all special rates configured for a customer.
 */
export async function fetchCustomerRates(
  businessId: string,
  customerId: string,
): Promise<{ data: CustomerRate[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('customer_rates')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId);

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: data ?? [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch customer rates',
    };
  }
}

/**
 * Set or update a special rate for a customer.
 */
export async function setCustomerRate(
  businessId: string,
  customerId: string,
  productId: string,
  specialPriceRupees: number,
  notes?: string | null,
): Promise<{ rate: CustomerRate | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('customer_rates')
      .upsert(
        {
          business_id: businessId,
          customer_id: customerId,
          product_id: productId,
          special_price_paise: rupeesToPaise(specialPriceRupees),
          notes: notes?.trim() || null,
        },
        { onConflict: 'business_id,customer_id,product_id' },
      )
      .select('*')
      .single();

    if (error || !data) {
      return { rate: null, error: error?.message ?? 'Failed to set rate' };
    }
    return { rate: data, error: null };
  } catch (err) {
    return {
      rate: null,
      error: err instanceof Error ? err.message : 'Failed to set rate',
    };
  }
}

/**
 * Get effective price in paise for a customer and product.
 */
export async function getEffectiveProductPricePaise(
  businessId: string,
  customerId: string,
  product: Product,
): Promise<number> {
  try {
    const { data } = await supabase
      .from('customer_rates')
      .select('special_price_paise')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .eq('product_id', product.id)
      .maybeSingle();

    if (data && typeof data.special_price_paise === 'number') {
      return data.special_price_paise;
    }
    return product.default_price_paise;
  } catch {
    return product.default_price_paise;
  }
}
