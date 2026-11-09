/**
 * Product Service API layer.
 * Cattle Feed catalogue management storing prices in integer paise.
 */

import { supabase } from '@/lib/supabase';
import { rupeesToPaise } from '@/lib/money';
import type { Product, ProductUnit } from '@/lib/database.types';
import type { ProductFormData } from '@/lib/validation';

/**
 * Fetch products for a business.
 */
export async function fetchProducts(
  businessId: string,
  activeOnly = false,
): Promise<{ data: Product[]; error: string | null }> {
  try {
    let query = supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      return { data: [], error: error.message };
    }
    return { data: data ?? [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch products',
    };
  }
}

/**
 * Create a new product.
 */
export async function createProduct(
  businessId: string,
  input: ProductFormData,
): Promise<{ product: Product | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        business_id: businessId,
        name: input.name.trim(),
        code: input.code?.trim() || null,
        unit: input.unit,
        default_price_paise: rupeesToPaise(input.defaultPriceRupees),
        is_active: input.isActive,
      })
      .select('*')
      .single();

    if (error || !data) {
      return { product: null, error: error?.message ?? 'Failed to create product' };
    }
    return { product: data, error: null };
  } catch (err) {
    return {
      product: null,
      error: err instanceof Error ? err.message : 'Failed to create product',
    };
  }
}

/**
 * Update a product.
 */
export async function updateProduct(
  productId: string,
  input: Partial<ProductFormData>,
): Promise<{ product: Product | null; error: string | null }> {
  try {
    const updatePayload: {
      name?: string;
      code?: string | null;
      unit?: ProductUnit;
      default_price_paise?: number;
      is_active?: boolean;
    } = {};

    if (input.name) updatePayload.name = input.name.trim();
    if (input.code !== undefined) updatePayload.code = input.code?.trim() || null;
    if (input.unit) updatePayload.unit = input.unit;
    if (input.defaultPriceRupees !== undefined) {
      updatePayload.default_price_paise = rupeesToPaise(input.defaultPriceRupees);
    }
    if (input.isActive !== undefined) updatePayload.is_active = input.isActive;

    const { data, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', productId)
      .select('*')
      .single();

    if (error || !data) {
      return { product: null, error: error?.message ?? 'Failed to update product' };
    }
    return { product: data, error: null };
  } catch (err) {
    return {
      product: null,
      error: err instanceof Error ? err.message : 'Failed to update product',
    };
  }
}
