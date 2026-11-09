/**
 * PVC Catalogue & Private Item Search API Service.
 * Implements category management (with Ceramic marked as coming later)
 * and high-performance indexed paginated search for 5,000+ PVC items.
 */

import { supabase } from '@/lib/supabase';
import type {
  PvcCategory,
  PvcCatalogueItem,
  BrandRecord,
  Database,
} from '@/lib/database.types';

type PvcCatalogueItemUpdate =
  Database['public']['Tables']['pvc_catalogue_items']['Update'];

export interface PvcItemWithRelations extends PvcCatalogueItem {
  category?: PvcCategory;
  brand?: BrandRecord | null;
}

export interface FetchPvcItemsParams {
  businessId: string;
  categoryId?: string;
  brandId?: string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

export interface PvcItemsPaginationResult {
  items: PvcItemWithRelations[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch all PVC categories for a business.
 */
export async function fetchPvcCategories(
  businessId: string,
): Promise<{ data: PvcCategory[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('pvc_categories')
      .select('*')
      .eq('business_id', businessId)
      .order('sort_order', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch categories',
    };
  }
}

/**
 * Create or initialize default categories if empty.
 */
export async function ensureDefaultPvcCategories(
  businessId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data: existing } = await supabase
      .from('pvc_categories')
      .select('id')
      .eq('business_id', businessId)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: true, error: null };
    }

    const defaultCategories = [
      {
        business_id: businessId,
        slug: 'pvc_pipes',
        name_en: 'PVC Pipes & Fittings',
        name_mr: 'पीव्हीसी पाईप्स आणि फिटिंग्ज',
        description_en: 'Rigid PVC, casing, conduit pipes, elbows, tees and reducers',
        description_mr: 'कडक पीव्हीसी, केसिंग, पाईप्स, एल्बो आणि टी',
        icon_name: 'Pipe',
        sort_order: 1,
        is_coming_later: false,
      },
      {
        business_id: businessId,
        slug: 'drip_irrigation',
        name_en: 'Drip Irrigation Systems',
        name_mr: 'ठिबक सिंचन प्रणाली',
        description_en: 'Inline, online drip laterals, drippers, filters and venturi',
        description_mr: 'इनलाईन, ऑनलाईन ठिबक नळ्या, ड्रिपर्स आणि व्हेंचुरी',
        icon_name: 'Droplets',
        sort_order: 2,
        is_coming_later: false,
      },
      {
        business_id: businessId,
        slug: 'sprinklers',
        name_en: 'Sprinkler Systems',
        name_mr: 'तुषार सिंचन संच',
        description_en: 'Sprinkler nozzles, HDPE pipes, coupler and rain guns',
        description_mr: 'स्प्रिंकलर नोझल्स, एचडीपीई पाईप्स आणि रेन गन',
        icon_name: 'CloudRain',
        sort_order: 3,
        is_coming_later: false,
      },
      {
        business_id: businessId,
        slug: 'power_tiller_spares',
        name_en: 'Power Tiller Spares',
        name_mr: 'पॉवर टिलर स्पेअर पार्टस',
        description_en: 'Blades, tines, rotary parts, belts and engine components',
        description_mr: 'टिलर ब्लेड्स, रोटरी पार्टस, बेल्ट्स आणि इंजिन पार्टस',
        icon_name: 'Wrench',
        sort_order: 4,
        is_coming_later: false,
      },
      {
        business_id: businessId,
        slug: 'submersible_pumps',
        name_en: 'Submersible Pumps & Motors',
        name_mr: 'सबमर्सिबल पंप आणि मोटर्स',
        description_en: 'Borewell pumps, openwell pumps, starters and cables',
        description_mr: 'बोअरवेल पंप, ओपनवेल पंप, स्टार्टर्स आणि केबल्स',
        icon_name: 'Zap',
        sort_order: 5,
        is_coming_later: false,
      },
      {
        business_id: businessId,
        slug: 'agri_hardware',
        name_en: 'Agri Tools & Hardware',
        name_mr: 'कृषी अवजारे आणि हार्डवेअर',
        description_en: 'Fasteners, valves, solvent cement, Teflon tapes',
        description_mr: 'व्हॉल्व्हज, सोल्व्हंट सिमेंट, टेफ्लॉन टेप आणि अवजारे',
        icon_name: 'Tool',
        sort_order: 6,
        is_coming_later: false,
      },
      {
        business_id: businessId,
        slug: 'ceramic',
        name_en: 'Ceramic & Sanitaryware (Coming Later)',
        name_mr: 'सिरॅमिक आणि सॅनिटरीवेअर (लवकरच उपलब्ध)',
        description_en: 'Ceramic tiles, sanitary fittings (Launching soon)',
        description_mr: 'सिरॅमिक टाईल्स आणि सॅनिटरी फिटिंग्ज (लवकरच उपलब्ध)',
        icon_name: 'Grid',
        sort_order: 7,
        is_coming_later: true, // NON-NEGOTIABLE CONSTRAINT: Ceramic marked as coming later
      },
    ];

    const { error: insertErr } = await supabase
      .from('pvc_categories')
      .insert(defaultCategories);

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to seed categories',
    };
  }
}

/**
 * High-performance paginated item search across 5,000+ items.
 * Searches name (MR/EN), item code, size/dimension, and category.
 */
export async function fetchPvcCatalogueItems(
  params: FetchPvcItemsParams,
): Promise<{ data: PvcItemsPaginationResult | null; error: string | null }> {
  try {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(10, params.pageSize || 20));
    const offset = (page - 1) * pageSize;

    let countQuery = supabase
      .from('pvc_catalogue_items')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', params.businessId);

    let query = supabase
      .from('pvc_catalogue_items')
      .select('*, category:pvc_categories(*), brand:brand_records(*)')
      .eq('business_id', params.businessId);

    if (params.categoryId) {
      countQuery = countQuery.eq('category_id', params.categoryId);
      query = query.eq('category_id', params.categoryId);
    }

    if (params.brandId) {
      countQuery = countQuery.eq('brand_id', params.brandId);
      query = query.eq('brand_id', params.brandId);
    }

    if (params.searchTerm && params.searchTerm.trim()) {
      const term = params.searchTerm.trim();
      const filter = `item_code.ilike.%${term}%,item_name_en.ilike.%${term}%,item_name_mr.ilike.%${term}%,size_dimension.ilike.%${term}%`;
      countQuery = countQuery.or(filter);
      query = query.or(filter);
    }

    const pagedQuery = query
      .order('item_name_en', { ascending: true })
      .range(offset, offset + pageSize - 1);

    const [{ count, error: countErr }, { data, error: dataErr }] = await Promise.all([
      countQuery,
      pagedQuery,
    ]);

    if (countErr) {
      return { data: null, error: countErr.message };
    }
    if (dataErr) {
      return { data: null, error: dataErr.message };
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: {
        items: (data as unknown as PvcItemWithRelations[]) || [],
        totalCount,
        page,
        pageSize,
        totalPages,
      },
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to search items',
    };
  }
}

/**
 * Create a new PVC catalogue item.
 */
export async function createPvcCatalogueItem(input: {
  businessId: string;
  categoryId: string;
  brandId?: string | null;
  itemCode: string;
  itemNameEn: string;
  itemNameMr: string;
  sizeDimension?: string | null;
  unit?: string;
  referenceRatePaise?: number | null;
  specifications?: Record<string, unknown>;
}): Promise<{ data: PvcCatalogueItem | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('pvc_catalogue_items')
      .insert({
        business_id: input.businessId,
        category_id: input.categoryId,
        brand_id: input.brandId || null,
        item_code: input.itemCode.trim(),
        item_name_en: input.itemNameEn.trim(),
        item_name_mr: input.itemNameMr.trim(),
        size_dimension: input.sizeDimension?.trim() || null,
        unit: input.unit || 'piece',
        reference_rate_paise: input.referenceRatePaise ?? null,
        specifications: input.specifications || {},
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
      error: err instanceof Error ? err.message : 'Failed to create item',
    };
  }
}

/**
 * Update a PVC catalogue item.
 */
export async function updatePvcCatalogueItem(
  id: string,
  input: Partial<{
    categoryId: string;
    brandId: string | null;
    itemCode: string;
    itemNameEn: string;
    itemNameMr: string;
    sizeDimension: string | null;
    unit: string;
    referenceRatePaise: number | null;
    specifications: Record<string, unknown>;
    isActive: boolean;
  }>,
): Promise<{ data: PvcCatalogueItem | null; error: string | null }> {
  try {
    const updatePayload: PvcCatalogueItemUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (input.categoryId !== undefined) updatePayload.category_id = input.categoryId;
    if (input.brandId !== undefined) updatePayload.brand_id = input.brandId;
    if (input.itemCode !== undefined) updatePayload.item_code = input.itemCode.trim();
    if (input.itemNameEn !== undefined)
      updatePayload.item_name_en = input.itemNameEn.trim();
    if (input.itemNameMr !== undefined)
      updatePayload.item_name_mr = input.itemNameMr.trim();
    if (input.sizeDimension !== undefined)
      updatePayload.size_dimension = input.sizeDimension;
    if (input.unit !== undefined) updatePayload.unit = input.unit;
    if (input.referenceRatePaise !== undefined)
      updatePayload.reference_rate_paise = input.referenceRatePaise;
    if (input.specifications !== undefined)
      updatePayload.specifications = input.specifications;
    if (input.isActive !== undefined) updatePayload.is_active = input.isActive;

    const { data, error } = await supabase
      .from('pvc_catalogue_items')
      .update(updatePayload)
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
      error: err instanceof Error ? err.message : 'Failed to update item',
    };
  }
}

/**
 * Delete a PVC catalogue item.
 */
export async function deletePvcCatalogueItem(
  id: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('pvc_catalogue_items').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete item',
    };
  }
}
