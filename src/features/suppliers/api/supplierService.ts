/**
 * Supplier Service (Owner-Only, Cattle Feed Exclusive)
 * Manages vendor/supplier records and per-financial-year opening balances.
 */

import { supabase } from '@/lib/supabase';
import type { Database, Supplier, SupplierOpeningBalance } from '@/lib/database.types';
import type { SupplierFormData } from '@/lib/validation';

type SupplierUpdate = Database['public']['Tables']['suppliers']['Update'];

export async function fetchSuppliers(businessId: string): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch suppliers: ${error.message}`);
  }

  return data ?? [];
}

export async function fetchSupplierById(supplierId: string): Promise<Supplier | null> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch supplier: ${error.message}`);
  }

  return data;
}

export async function createSupplier(
  businessId: string,
  data: SupplierFormData,
): Promise<Supplier> {
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .insert({
      business_id: businessId,
      name: data.name,
      phone: data.phone || null,
      address: data.address || null,
      gstin: data.gstin || null,
      notes: data.notes || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create supplier: ${error.message}`);
  }

  return supplier;
}

export async function updateSupplier(
  supplierId: string,
  data: Partial<SupplierFormData> & { isActive?: boolean },
): Promise<Supplier> {
  const updatePayload: SupplierUpdate = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.phone !== undefined) updatePayload.phone = data.phone || null;
  if (data.address !== undefined) updatePayload.address = data.address || null;
  if (data.gstin !== undefined) updatePayload.gstin = data.gstin || null;
  if (data.notes !== undefined) updatePayload.notes = data.notes || null;
  if (data.isActive !== undefined) updatePayload.is_active = data.isActive;

  const { data: updated, error } = await supabase
    .from('suppliers')
    .update(updatePayload)
    .eq('id', supplierId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update supplier: ${error.message}`);
  }

  return updated;
}

export async function fetchSupplierOpeningBalances(
  supplierId: string,
): Promise<SupplierOpeningBalance[]> {
  const { data, error } = await supabase
    .from('supplier_opening_balances')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('financial_year', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch supplier opening balances: ${error.message}`);
  }

  return data ?? [];
}

export async function setSupplierOpeningBalance(
  businessId: string,
  supplierId: string,
  financialYear: string,
  amountPaise: number,
  notes?: string,
): Promise<SupplierOpeningBalance> {
  const { data, error } = await supabase
    .from('supplier_opening_balances')
    .upsert(
      {
        business_id: businessId,
        supplier_id: supplierId,
        financial_year: financialYear,
        amount_paise: amountPaise,
        notes: notes || null,
      },
      { onConflict: 'supplier_id,financial_year' },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set supplier opening balance: ${error.message}`);
  }

  // Also post an opening balance entry to supplier ledger if non-zero
  if (amountPaise > 0) {
    await supabase.from('supplier_ledger_entries').insert({
      business_id: businessId,
      supplier_id: supplierId,
      entry_type: 'opening_balance',
      reference_type: 'manual',
      credit_paise: amountPaise,
      debit_paise: 0,
      description: `Opening Balance for FY ${financialYear}`,
    });
  }

  return data;
}
