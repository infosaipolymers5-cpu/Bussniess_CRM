/**
 * Brand Records API Service.
 * Implements owner-managed brand directory with category linkage
 * and strictly guarded logo-use permission verification.
 */

import { supabase } from '@/lib/supabase';
import type { BrandRecord, Database } from '@/lib/database.types';

type BrandUpdate = Database['public']['Tables']['brand_records']['Update'];

export interface CreateBrandInput {
  businessId: string;
  brandName: string;
  categoryId?: string | null;
  categoryName?: string | null;
  descriptionEn?: string | null;
  descriptionMr?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  hasLogoPermission: boolean;
  logoPermissionNotes?: string | null;
  showOnDigitalCard?: boolean;
}

export interface UpdateBrandInput {
  brandName?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  descriptionEn?: string | null;
  descriptionMr?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  hasLogoPermission?: boolean;
  logoPermissionNotes?: string | null;
  showOnDigitalCard?: boolean;
  isActive?: boolean;
}

/**
 * Fetch all brands for a business.
 */
export async function fetchBrands(
  businessId: string,
): Promise<{ data: BrandRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('brand_records')
      .select('*')
      .eq('business_id', businessId)
      .order('brand_name', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch brands',
    };
  }
}

/**
 * Fetch public brands that are active and have recorded logo permission.
 */
export async function fetchPublicCardBrands(
  businessId: string,
): Promise<{ data: BrandRecord[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('brand_records')
      .select('*')
      .eq('business_id', businessId)
      .eq('show_on_digital_card', true)
      .eq('has_logo_permission', true)
      .eq('is_active', true)
      .order('brand_name', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch public brands',
    };
  }
}

/**
 * Create a new brand record.
 * STRICT NON-NEGOTIABLE RULE: Cannot show on digital card without recorded logo permission.
 */
export async function createBrand(
  input: CreateBrandInput,
): Promise<{ data: BrandRecord | null; error: string | null }> {
  try {
    if (input.showOnDigitalCard && !input.hasLogoPermission) {
      return {
        data: null,
        error:
          'Owner must confirm and record logo-use permission before publishing brand to digital card.',
      };
    }

    const { data, error } = await supabase
      .from('brand_records')
      .insert({
        business_id: input.businessId,
        brand_name: input.brandName.trim(),
        category_id: input.categoryId || null,
        category_name: input.categoryName?.trim() || null,
        description_en: input.descriptionEn?.trim() || null,
        description_mr: input.descriptionMr?.trim() || null,
        logo_url: input.logoUrl?.trim() || null,
        website_url: input.websiteUrl?.trim() || null,
        has_logo_permission: input.hasLogoPermission,
        logo_permission_notes: input.logoPermissionNotes?.trim() || null,
        show_on_digital_card: input.showOnDigitalCard || false,
        is_active: true,
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
      error: err instanceof Error ? err.message : 'Failed to create brand',
    };
  }
}

/**
 * Update an existing brand record.
 */
export async function updateBrand(
  id: string,
  input: UpdateBrandInput,
): Promise<{ data: BrandRecord | null; error: string | null }> {
  try {
    // If updating digital card visibility, check permission
    if (input.showOnDigitalCard === true && input.hasLogoPermission === false) {
      return {
        data: null,
        error:
          'Cannot publish brand to digital card without recorded logo-use permission.',
      };
    }

    const payload: BrandUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (input.brandName !== undefined) payload.brand_name = input.brandName.trim();
    if (input.categoryId !== undefined) payload.category_id = input.categoryId;
    if (input.categoryName !== undefined) payload.category_name = input.categoryName;
    if (input.descriptionEn !== undefined) payload.description_en = input.descriptionEn;
    if (input.descriptionMr !== undefined) payload.description_mr = input.descriptionMr;
    if (input.logoUrl !== undefined) payload.logo_url = input.logoUrl;
    if (input.websiteUrl !== undefined) payload.website_url = input.websiteUrl;
    if (input.hasLogoPermission !== undefined)
      payload.has_logo_permission = input.hasLogoPermission;
    if (input.logoPermissionNotes !== undefined)
      payload.logo_permission_notes = input.logoPermissionNotes;
    if (input.showOnDigitalCard !== undefined)
      payload.show_on_digital_card = input.showOnDigitalCard;
    if (input.isActive !== undefined) payload.is_active = input.isActive;

    const { data, error } = await supabase
      .from('brand_records')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to update brand',
    };
  }
}

/**
 * Delete a brand record.
 */
export async function deleteBrand(
  id: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('brand_records').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete brand',
    };
  }
}
