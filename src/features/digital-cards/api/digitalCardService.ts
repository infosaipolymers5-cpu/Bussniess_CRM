/**
 * Digital Visiting Cards API Service.
 * Implements owner-customized business cards and strictly isolated
 * anonymous public endpoints that never reveal internal rates or customer data.
 */

import { supabase } from '@/lib/supabase';
import type { BusinessCard, PublicVisitingCard } from '@/lib/database.types';

export interface SaveBusinessCardInput {
  businessId: string;
  cardSlug: string;
  displayName: string;
  taglineEn?: string | null;
  taglineMr?: string | null;
  ownerName: string;
  primaryPhone: string;
  whatsappNumber: string;
  email?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  cityOrVillage: string;
  pincode?: string | null;
  googleMapsUrl?: string | null;
  servicesList?: string[];
  featuredBrandIds?: string[];
  themeColor?: string;
  isPublished?: boolean;
}

/**
 * Fetch business card config for owner management (authenticated).
 */
export async function fetchBusinessCard(
  businessId: string,
): Promise<{ data: BusinessCard | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('business_cards')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch business card',
    };
  }
}

/**
 * Create or update business card configuration.
 */
export async function saveBusinessCard(
  input: SaveBusinessCardInput,
): Promise<{ data: BusinessCard | null; error: string | null }> {
  try {
    const cleanPhone = input.primaryPhone.replace(/\D/g, '');
    const cleanWa = input.whatsappNumber.replace(/\D/g, '');

    const payload = {
      business_id: input.businessId,
      card_slug: input.cardSlug.toLowerCase().trim(),
      display_name: input.displayName.trim(),
      tagline_en: input.taglineEn?.trim() || null,
      tagline_mr: input.taglineMr?.trim() || null,
      owner_name: input.ownerName.trim(),
      primary_phone: cleanPhone,
      whatsapp_number: cleanWa,
      email: input.email?.trim() || null,
      address_line1: input.addressLine1.trim(),
      address_line2: input.addressLine2?.trim() || null,
      city_or_village: input.cityOrVillage.trim(),
      pincode: input.pincode?.trim() || null,
      google_maps_url: input.googleMapsUrl?.trim() || null,
      services_list: input.servicesList || [],
      featured_brand_ids: input.featuredBrandIds || [],
      theme_color: input.themeColor || '#1E40AF',
      is_published: input.isPublished ?? true,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from('business_cards')
      .select('id')
      .eq('business_id', input.businessId)
      .maybeSingle();

    let query;
    if (existing) {
      const { business_id: _bizId, ...updateFields } = payload;
      query = supabase
        .from('business_cards')
        .update(updateFields)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      query = supabase.from('business_cards').insert(payload).select().single();
    }

    const { data, error } = await query;
    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to save business card',
    };
  }
}

/**
 * Public Visiting Card Fetcher (Anonymous Safe Boundary).
 * Calls security-definer RPC `get_public_visiting_card`.
 * NEVER reveals internal ledger, costs, wholesale rates, or customer data.
 */
export async function fetchPublicVisitingCard(
  cardSlug: string,
): Promise<{ data: PublicVisitingCard | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('get_public_visiting_card', {
      p_card_slug: cardSlug.toLowerCase().trim(),
    });

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Visiting card not found or not published' };
    }

    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch public card',
    };
  }
}

/**
 * Generate WhatsApp Quote Handoff Deep Link.
 */
export function buildQuoteWhatsAppUrl(
  card: PublicVisitingCard,
  inquirySubject?: string,
  language: 'mr' | 'en' = 'mr',
): string {
  const cleanPhone = card.whatsapp_number.replace(/\D/g, '');
  const fullPhone =
    cleanPhone.startsWith('91') && cleanPhone.length > 10
      ? cleanPhone
      : `91${cleanPhone.slice(-10)}`;

  let text: string;
  if (language === 'mr') {
    text = `नमस्कार ${card.display_name}!\nमी आपल्या डिजिटल व्हिजिटिंग कार्डवरून संपर्क साधत आहे. मला ${
      inquirySubject || 'उत्पादनांबद्दल / दरांबद्दल'
    } अधिक माहिती आणि कोटेशन हवे आहे.\n\nकृपया संपर्क साधावा. धन्यवाद!`;
  } else {
    text = `Hello ${card.display_name}!\nI found your digital visiting card. I would like to inquire about ${
      inquirySubject || 'products and quotes'
    }.\n\nPlease get back to me. Thank you!`;
  }

  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}
