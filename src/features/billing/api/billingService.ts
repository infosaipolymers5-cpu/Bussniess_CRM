/**
 * Billing Service API layer.
 * Cattle Feed exclusive invoice lifecycle, sequential bill numbering, and ledger integration.
 */

import { supabase } from '@/lib/supabase';
import { rupeesToPaise } from '@/lib/money';
import { getFinancialYear } from '@/lib/dates';
import type { Bill, BillItem, BillRevision, Customer } from '@/lib/database.types';
import type { BillFormData } from '@/lib/validation';

export interface BillWithDetails extends Bill {
  customer?: Customer;
  items?: BillItem[];
  revisions?: BillRevision[];
}

export interface BillFilterOptions {
  customerId?: string;
  status?: string;
  search?: string;
}

/**
 * Fetch bills for a business with optional filtering.
 */
export async function fetchBills(
  businessId: string,
  filters: BillFilterOptions = {},
): Promise<{ data: BillWithDetails[]; error: string | null }> {
  try {
    let query = supabase
      .from('bills')
      .select('*, customer:customers(*)')
      .eq('business_id', businessId)
      .order('bill_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status as Bill['status']);
    }
    if (filters.search) {
      query = query.ilike('bill_number', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) {
      return { data: [], error: error.message };
    }
    return { data: data ?? [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch bills',
    };
  }
}

/**
 * Fetch a single bill with full line items and revisions.
 */
export async function fetchBillById(
  billId: string,
): Promise<{ data: BillWithDetails | null; error: string | null }> {
  try {
    const { data: billData, error: billError } = await supabase
      .from('bills')
      .select('*, customer:customers(*)')
      .eq('id', billId)
      .single();

    if (billError || !billData) {
      return { data: null, error: billError?.message ?? 'Bill not found' };
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from('bill_items')
      .select('*')
      .eq('bill_id', billId)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      return { data: null, error: itemsError.message };
    }

    const { data: revisionsData } = await supabase
      .from('bill_revisions')
      .select('*')
      .eq('bill_id', billId)
      .order('revision_number', { ascending: true });

    const fullBill: BillWithDetails = {
      ...(billData as BillWithDetails),
      items: itemsData ?? [],
      revisions: revisionsData ?? [],
    };

    return { data: fullBill, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch bill details',
    };
  }
}

/**
 * Create and post a new Cattle Feed bill.
 * Atomically allocates sequential bill number, inserts line items, and posts debit to customer ledger.
 */
export async function createBill(
  businessId: string,
  input: BillFormData,
): Promise<{ bill: Bill | null; error: string | null }> {
  try {
    // Calculate paise amounts
    let subtotalPaise = 0;
    const computedItems = input.items.map((item, index) => {
      const unitPricePaise = rupeesToPaise(item.unitPriceRupees);
      const totalPaise = Math.round(item.quantity * unitPricePaise);
      subtotalPaise += totalPaise;
      return {
        product_id: item.productId || null,
        product_name_snapshot: item.productName.trim(),
        unit_snapshot: item.unit,
        quantity: item.quantity,
        unit_price_paise: unitPricePaise,
        total_paise: totalPaise,
        sort_order: index,
      };
    });

    const discountPaise = rupeesToPaise(input.discountRupees || 0);
    const totalAmountPaise = Math.max(0, subtotalPaise - discountPaise);
    const paidNowPaise = rupeesToPaise(input.paidNowRupees || 0);
    const balanceDuePaise = Math.max(0, totalAmountPaise - paidNowPaise);

    const initialStatus: Bill['status'] =
      balanceDuePaise === 0 ? 'paid' : paidNowPaise > 0 ? 'partially_paid' : 'issued';

    const fy = getFinancialYear(input.billDate);

    // 1. Allocate sequential bill number
    const { data: billNumberData, error: seqError } = await supabase.rpc(
      'allocate_bill_number',
      {
        p_business_id: businessId,
        p_financial_year: fy,
      },
    );

    if (seqError || !billNumberData) {
      return {
        bill: null,
        error: seqError?.message ?? 'Failed to allocate sequential bill number',
      };
    }

    const billNumber = billNumberData;

    // 2. Insert Bill Header
    const { data: billRecord, error: billInsertError } = await supabase
      .from('bills')
      .insert({
        business_id: businessId,
        customer_id: input.customerId,
        bill_number: billNumber,
        financial_year: fy,
        bill_date: input.billDate,
        due_date: input.dueDate || null,
        subtotal_paise: subtotalPaise,
        discount_paise: discountPaise,
        total_amount_paise: totalAmountPaise,
        paid_now_paise: paidNowPaise,
        balance_due_paise: balanceDuePaise,
        status: initialStatus,
        notes: input.notes?.trim() || null,
      })
      .select('*')
      .single();

    if (billInsertError || !billRecord) {
      return {
        bill: null,
        error: billInsertError?.message ?? 'Failed to insert bill record',
      };
    }

    // 3. Insert Line Items
    const itemsToInsert = computedItems.map((item) => ({
      ...item,
      bill_id: billRecord.id,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('bill_items')
      .insert(itemsToInsert)
      .select('*');

    if (itemsError) {
      return { bill: null, error: itemsError.message };
    }

    // 3b. Create immutable sale cost snapshots for each bill item
    for (const item of (insertedItems ?? []) as BillItem[]) {
      await supabase.rpc('create_sale_cost_snapshot', {
        p_business_id: businessId,
        p_bill_id: billRecord.id,
        p_bill_item_id: item.id,
        p_product_id: item.product_id,
        p_product_name: item.product_name_snapshot,
        p_quantity: Number(item.quantity),
        p_realized_selling_rate_paise: item.unit_price_paise,
      });
    }

    // 4. Post Debit Entry to Customer Ledger
    const { error: ledgerError } = await supabase.from('customer_ledger_entries').insert({
      business_id: businessId,
      customer_id: input.customerId,
      entry_date: input.billDate,
      entry_type: 'bill_charge',
      reference_id: billRecord.id,
      reference_number: billNumber,
      debit_paise: totalAmountPaise,
      credit_paise: 0,
      notes: input.notes?.trim() || null,
    });

    if (ledgerError) {
      console.error('Ledger debit insert warning:', ledgerError);
    }

    // 5. If immediate payment was made at bill issuance, record receipt and credit
    if (paidNowPaise > 0) {
      const receiptNum = `RCP-${fy}-NOW-${billNumber.split('-').pop()}`;
      const { data: paymentRecord } = await supabase
        .from('customer_payments')
        .insert({
          business_id: businessId,
          customer_id: input.customerId,
          receipt_number: receiptNum,
          payment_date: input.billDate,
          amount_paise: paidNowPaise,
          payment_method: 'cash',
          reference_details: `Paid now during bill ${billNumber}`,
          notes: 'Immediate payment at bill issuance',
        })
        .select('id')
        .single();

      if (paymentRecord) {
        // Post credit to customer ledger
        await supabase.from('customer_ledger_entries').insert({
          business_id: businessId,
          customer_id: input.customerId,
          entry_date: input.billDate,
          entry_type: 'payment',
          reference_id: paymentRecord.id,
          reference_number: receiptNum,
          debit_paise: 0,
          credit_paise: paidNowPaise,
          notes: `Paid at bill issuance: ${billNumber}`,
        });

        // Allocation to this bill
        await supabase.from('payment_allocations').insert({
          payment_id: paymentRecord.id,
          bill_id: billRecord.id,
          allocated_paise: Math.min(paidNowPaise, totalAmountPaise),
        });
      }
    }

    return { bill: billRecord, error: null };
  } catch (err) {
    return {
      bill: null,
      error: err instanceof Error ? err.message : 'Failed to create bill',
    };
  }
}

/**
 * Owner-only bill cancellation.
 * Triggers database RPC to reverse debit in customer ledger and mark status cancelled.
 */
export async function cancelBill(
  businessId: string,
  billId: string,
  reason: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('cancel_cattle_feed_bill', {
      p_business_id: businessId,
      p_bill_id: billId,
      p_reason: reason.trim(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: !!data, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to cancel bill',
    };
  }
}
