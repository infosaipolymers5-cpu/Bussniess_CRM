/**
 * Public QR Registration Service API.
 * Handles public-facing sign-up without exposing internal customer records or rates.
 */

import { supabase } from '@/lib/supabase';
import { normalizePhoneNumber } from '@/lib/validation';
import type { PublicQrRegistration } from '@/lib/database.types';

export interface QrRegistrationSubmission {
  businessId: string;
  name: string;
  whatsappPhone: string;
  dateOfBirth: string;
  categoryInterest?: string | null;
  consentRecorded: boolean;
}

/**
 * Public-facing submission endpoint.
 * Requires consent_recorded = true; does not expose internal business or customer data.
 */
export async function submitPublicQrRegistration(
  input: QrRegistrationSubmission,
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!input.consentRecorded) {
      return { success: false, error: 'User consent is required for registration' };
    }

    const normalizedPhone = normalizePhoneNumber(input.whatsappPhone);

    const { error } = await supabase.from('public_qr_registrations').insert({
      business_id: input.businessId,
      name: input.name.trim(),
      whatsapp_phone: input.whatsappPhone.trim(),
      normalized_phone: normalizedPhone,
      date_of_birth: input.dateOfBirth,
      category_interest: input.categoryInterest?.trim() || null,
      consent_recorded: true,
      status: 'pending_review',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Registration failed',
    };
  }
}

/**
 * Fetch registrations for internal staff/owner review.
 */
export async function fetchQrRegistrations(
  businessId: string,
): Promise<{ data: PublicQrRegistration[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('public_qr_registrations')
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
      error: err instanceof Error ? err.message : 'Failed to fetch QR registrations',
    };
  }
}

/**
 * Convert a reviewed QR registration into an active customer.
 */
export async function convertQrRegistrationToCustomer(
  registrationId: string,
  businessId: string,
): Promise<{ customerId: string | null; error: string | null }> {
  try {
    // 1. Get registration
    const { data: reg, error: fetchError } = await supabase
      .from('public_qr_registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (fetchError || !reg) {
      return { customerId: null, error: fetchError?.message ?? 'Registration not found' };
    }

    const qrReg = reg;

    // 2. Insert customer
    const { data: customer, error: custError } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        name: qrReg.name,
        display_phone: qrReg.whatsapp_phone,
        normalized_phone: qrReg.normalized_phone,
        date_of_birth: qrReg.date_of_birth,
        notes: qrReg.category_interest ? `Interest: ${qrReg.category_interest}` : null,
        is_active: true,
      })
      .select('id')
      .single();

    if (custError || !customer) {
      return {
        customerId: null,
        error: custError?.message ?? 'Failed to convert to customer',
      };
    }

    // 3. Mark registration converted
    await supabase
      .from('public_qr_registrations')
      .update({ status: 'converted' })
      .eq('id', registrationId);

    // 4. Create default preferences
    await supabase.from('customer_preferences').insert({
      customer_id: customer.id,
      opted_out_marketing: false,
      opted_out_transactional: false,
      preferred_channel: 'whatsapp',
    });

    return { customerId: customer.id, error: null };
  } catch (err) {
    return {
      customerId: null,
      error: err instanceof Error ? err.message : 'Conversion failed',
    };
  }
}
