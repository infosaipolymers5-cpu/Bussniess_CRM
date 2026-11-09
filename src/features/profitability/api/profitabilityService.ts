/**
 * Profitability Service (Owner-Only, Cattle Feed Exclusive)
 * Authoritative financial metrics: Net Sales, COGS, Gross Profit,
 * Operating Expenses, Net Profit, Collections, Receivables, Payables, Expected Profit.
 */

import { supabase } from '@/lib/supabase';

export type ProductMargin = {
  product_name: string;
  total_quantity: number;
  total_sales_paise: number;
  total_cogs_paise: number;
  gross_profit_paise: number;
  margin_percent: number;
};

export type OwnerProfitMetrics = {
  business_id: string;
  from_date: string | null;
  to_date: string | null;
  net_sales_paise: number;
  cogs_paise: number;
  gross_profit_paise: number;
  collections_paise: number;
  operating_expenses_paise: number;
  net_profit_paise: number;
  total_receivables_paise: number;
  total_payables_paise: number;
  expected_profit_paise: number;
  product_margins: ProductMargin[];
};

export async function fetchOwnerProfitMetrics(
  businessId: string,
  fromDate?: string,
  toDate?: string,
): Promise<OwnerProfitMetrics> {
  const { data, error } = await supabase.rpc('get_owner_profit_metrics', {
    p_business_id: businessId,
    p_from_date: fromDate || null,
    p_to_date: toDate || null,
  });

  if (error) {
    throw new Error(`Failed to fetch profit metrics: ${error.message}`);
  }

  return data as unknown as OwnerProfitMetrics;
}

export async function hasOwnerPinEnabled(businessId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('owner_pin_settings')
    .select('is_enabled')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error || !data) return false;
  return data.is_enabled;
}

export async function verifyOwnerPin(businessId: string, pin: string): Promise<boolean> {
  // Simple deterministic hash for verification
  const pinHash = await hashPin(pin);
  const { data, error } = await supabase.rpc('verify_owner_pin', {
    p_business_id: businessId,
    p_pin_hash: pinHash,
  });

  if (error) return false;
  return !!data;
}

export async function setOwnerPin(businessId: string, pin: string): Promise<void> {
  const pinHash = await hashPin(pin);
  const { error } = await supabase.from('owner_pin_settings').upsert(
    {
      business_id: businessId,
      pin_hash: pinHash,
      is_enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'business_id' },
  );

  if (error) {
    throw new Error(`Failed to set owner PIN: ${error.message}`);
  }
}

async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
