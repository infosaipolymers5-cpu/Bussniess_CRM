/**
 * Payment Service API layer.
 * Records customer payments, distributes via FIFO across open bills, and manages advance credits.
 */

import { supabase } from '@/lib/supabase';
import { rupeesToPaise } from '@/lib/money';
import type {
  CustomerPayment,
  Customer,
  PaymentAllocation,
  AdvanceCredit,
} from '@/lib/database.types';
import type { PaymentFormData } from '@/lib/validation';

export interface PaymentWithDetails extends CustomerPayment {
  customer?: Customer;
  allocations?: PaymentAllocation[];
}

/**
 * Fetch payments for a business.
 */
export async function fetchPayments(
  businessId: string,
  customerId?: string,
): Promise<{ data: PaymentWithDetails[]; error: string | null }> {
  try {
    let query = supabase
      .from('customer_payments')
      .select('*, customer:customers(*)')
      .eq('business_id', businessId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;
    if (error) {
      return { data: [], error: error.message };
    }
    return { data: data ?? [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch payments',
    };
  }
}

/**
 * Record a customer payment.
 * Invokes authoritative PostgreSQL RPC to execute atomic FIFO bill allocation and credit the ledger.
 */
export async function recordPayment(
  businessId: string,
  input: PaymentFormData,
): Promise<{ result: Record<string, unknown> | null; error: string | null }> {
  try {
    const amountPaise = rupeesToPaise(input.amountRupees);

    const { data, error } = await supabase.rpc('record_customer_payment', {
      p_business_id: businessId,
      p_customer_id: input.customerId,
      p_amount_paise: amountPaise,
      p_payment_method: input.paymentMethod,
      p_reference_details: input.referenceDetails?.trim() || undefined,
      p_notes: input.notes?.trim() || undefined,
      p_payment_date: input.paymentDate,
    });

    if (error) {
      return { result: null, error: error.message };
    }

    return { result: data, error: null };
  } catch (err) {
    return {
      result: null,
      error: err instanceof Error ? err.message : 'Failed to record payment',
    };
  }
}

/**
 * Fetch available advance credits for a customer.
 */
export async function fetchCustomerAdvanceCredits(
  businessId: string,
  customerId: string,
): Promise<{ data: AdvanceCredit[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('advance_credits')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .eq('status', 'available')
      .gt('remaining_amount_paise', 0);

    if (error) {
      return { data: [], error: error.message };
    }
    return { data: data ?? [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch advance credits',
    };
  }
}
