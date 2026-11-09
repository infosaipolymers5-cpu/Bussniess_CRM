/**
 * Supplier Account Service (Owner-Only, Cattle Feed Exclusive)
 * Manages supplier ledger, statements, and payment recordings with FIFO allocation.
 */

import { supabase } from '@/lib/supabase';
import { rupeesToPaise } from '@/lib/money';
import type {
  SupplierPayment,
  SupplierLedgerEntry,
  Supplier,
} from '@/lib/database.types';
import type { SupplierPaymentFormData } from '@/lib/validation';

export type SupplierStatementResult = {
  supplier_id: string;
  from_date: string | null;
  to_date: string | null;
  opening_balance_paise: number;
  total_purchases_paise: number;
  total_payments_paise: number;
  closing_balance_paise: number;
  entries: (SupplierLedgerEntry & { running_balance_paise?: number })[];
};

export async function fetchSupplierLedgerStatement(
  businessId: string,
  supplierId: string,
  fromDate?: string,
  toDate?: string,
): Promise<SupplierStatementResult> {
  const fromIso = fromDate ? new Date(`${fromDate}T00:00:00Z`).toISOString() : undefined;
  const toIso = toDate ? new Date(`${toDate}T23:59:59Z`).toISOString() : undefined;

  const { data, error } = await supabase.rpc('get_supplier_account_statement', {
    p_business_id: businessId,
    p_supplier_id: supplierId,
    p_from_date: fromIso,
    p_to_date: toIso,
  });

  if (error) {
    throw new Error(`Failed to fetch supplier statement: ${error.message}`);
  }

  const raw = data as unknown as SupplierStatementResult;
  let running = raw.opening_balance_paise;

  const entriesWithRunning = (raw.entries || []).map((entry) => {
    // Credit (purchase) increases payable; Debit (payment) decreases payable
    running = running + entry.credit_paise - entry.debit_paise;
    return {
      ...entry,
      running_balance_paise: running,
    };
  });

  return {
    ...raw,
    entries: entriesWithRunning,
  };
}

export async function recordSupplierPayment(
  businessId: string,
  data: SupplierPaymentFormData,
  idempotencyKey?: string,
): Promise<{ payment_id: string; payment_number: string; advance_credit_paise: number }> {
  const amountPaise = rupeesToPaise(data.amountRupees);
  const paymentDate = new Date(`${data.paymentDate}T12:00:00Z`).toISOString();
  const key = idempotencyKey || `spay_${data.supplierId}_${Date.now()}`;

  const { data: res, error } = await supabase.rpc('record_supplier_payment', {
    p_business_id: businessId,
    p_supplier_id: data.supplierId,
    p_amount_paise: amountPaise,
    p_payment_date: paymentDate,
    p_payment_mode: data.paymentMode,
    p_reference_number: data.referenceNumber || undefined,
    p_notes: data.notes || undefined,
    p_idempotency_key: key,
  });

  if (error) {
    throw new Error(`Failed to record supplier payment: ${error.message}`);
  }

  return res as unknown as {
    payment_id: string;
    payment_number: string;
    advance_credit_paise: number;
  };
}

export async function fetchSupplierPayments(
  businessId: string,
  supplierId?: string,
): Promise<(SupplierPayment & { supplier: Supplier })[]> {
  let query = supabase
    .from('supplier_payments')
    .select('*, supplier:suppliers(*)')
    .eq('business_id', businessId)
    .order('payment_date', { ascending: false });

  if (supplierId) {
    query = query.eq('supplier_id', supplierId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch supplier payments: ${error.message}`);
  }

  return data ?? [];
}
