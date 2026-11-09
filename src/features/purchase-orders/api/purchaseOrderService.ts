/**
 * Purchase Order Service (Owner-Only, Cattle Feed Exclusive)
 * Handles purchase orders, load costs apportionment, customer-linking,
 * and state transitions that post to the supplier ledger.
 */

import { supabase } from '@/lib/supabase';
import { getFinancialYear } from '@/lib/dates';
import { rupeesToPaise } from '@/lib/money';
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseLoadCost,
  PurchaseOrderStatusHistory,
  PurchaseOrderStatus,
  Supplier,
} from '@/lib/database.types';
import type { PurchaseOrderFormData } from '@/lib/validation';

export type PurchaseOrderDetail = PurchaseOrder & {
  supplier: Supplier;
  items: PurchaseOrderItem[];
  load_costs: PurchaseLoadCost[];
  status_history: PurchaseOrderStatusHistory[];
};

export async function fetchPurchaseOrders(
  businessId: string,
  options?: { supplierId?: string; status?: PurchaseOrderStatus },
): Promise<(PurchaseOrder & { supplier: Supplier })[]> {
  let query = supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(*)')
    .eq('business_id', businessId)
    .order('order_date', { ascending: false });

  if (options?.supplierId) {
    query = query.eq('supplier_id', options.supplierId);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch purchase orders: ${error.message}`);
  }

  return data ?? [];
}

export async function fetchPurchaseOrderById(
  orderId: string,
): Promise<PurchaseOrderDetail | null> {
  const { data: order, error: orderErr } = await supabase
    .from('purchase_orders')
    .select('*, supplier:suppliers(*)')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr) {
    throw new Error(`Failed to fetch purchase order: ${orderErr.message}`);
  }
  if (!order) return null;

  const [itemsRes, loadCostsRes, historyRes] = await Promise.all([
    supabase.from('purchase_order_items').select('*').eq('order_id', orderId),
    supabase.from('purchase_load_costs').select('*').eq('order_id', orderId),
    supabase
      .from('purchase_order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('changed_at', { ascending: true }),
  ]);

  if (itemsRes.error) throw new Error(`Failed to fetch items: ${itemsRes.error.message}`);
  if (loadCostsRes.error)
    throw new Error(`Failed to fetch load costs: ${loadCostsRes.error.message}`);
  if (historyRes.error)
    throw new Error(`Failed to fetch status history: ${historyRes.error.message}`);

  return {
    ...order,
    items: itemsRes.data ?? [],
    load_costs: loadCostsRes.data ?? [],
    status_history: historyRes.data ?? [],
  };
}

export async function createPurchaseOrder(
  businessId: string,
  data: PurchaseOrderFormData,
): Promise<PurchaseOrder> {
  const financialYear = getFinancialYear(new Date(data.orderDate));

  // 1. Allocate sequential order number
  const { data: orderNumber, error: seqErr } = await supabase.rpc(
    'allocate_purchase_order_number',
    {
      p_business_id: businessId,
      p_financial_year: financialYear,
    },
  );

  if (seqErr || !orderNumber) {
    throw new Error(
      `Failed to allocate PO number: ${seqErr?.message ?? 'No number generated'}`,
    );
  }

  // 2. Compute item totals in integer paise
  const processedItems = data.items.map((item) => {
    const unitRatePaise = rupeesToPaise(item.unitRateRupees);
    const totalPaise = unitRatePaise * item.quantityBags;
    return {
      productId: item.productId || null,
      productName: item.productName,
      customerId: item.customerId || null,
      customerName: item.customerName || null,
      quantityBags: item.quantityBags,
      unitRatePaise,
      totalPaise,
      allocatedLoadCostPaise: 0,
      effectiveCostPaise: unitRatePaise,
    };
  });

  const totalGoodsAmountPaise = processedItems.reduce(
    (sum, item) => sum + item.totalPaise,
    0,
  );
  const totalBags = processedItems.reduce((sum, item) => sum + item.quantityBags, 0);

  // 3. Process load costs & apportion to items
  let totalLoadCostPaise = 0;
  const processedLoadCosts = data.loadCosts.map((lc) => {
    const amountPaise = rupeesToPaise(lc.amountRupees);
    totalLoadCostPaise += amountPaise;
    return {
      description: lc.description,
      amountPaise,
      allocationMethod: lc.allocationMethod,
    };
  });

  if (totalLoadCostPaise > 0 && totalBags > 0) {
    let allocatedTotal = 0;
    processedItems.forEach((item, index) => {
      let itemLoadShare = 0;
      if (index === processedItems.length - 1) {
        // Remainder ensures exact sum
        itemLoadShare = totalLoadCostPaise - allocatedTotal;
      } else {
        itemLoadShare = Math.round((totalLoadCostPaise * item.quantityBags) / totalBags);
        allocatedTotal += itemLoadShare;
      }

      item.allocatedLoadCostPaise = itemLoadShare;
      const loadCostPerBag = Math.round(itemLoadShare / item.quantityBags);
      item.effectiveCostPaise = item.unitRatePaise + loadCostPerBag;
    });
  }

  // 4. Insert purchase order header (initial status: draft)
  const { data: order, error: orderErr } = await supabase
    .from('purchase_orders')
    .insert({
      business_id: businessId,
      supplier_id: data.supplierId,
      order_number: orderNumber,
      financial_year: financialYear,
      status: 'draft',
      order_date: data.orderDate,
      expected_delivery_date: data.expectedDeliveryDate || null,
      total_amount_paise: totalGoodsAmountPaise,
      total_load_cost_paise: totalLoadCostPaise,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (orderErr) {
    throw new Error(`Failed to create purchase order: ${orderErr.message}`);
  }

  // 5. Insert line items
  const itemsToInsert = processedItems.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.productName,
    customer_id: item.customerId,
    customer_name: item.customerName,
    quantity_bags: item.quantityBags,
    unit_rate_paise: item.unitRatePaise,
    total_paise: item.totalPaise,
    allocated_load_cost_paise: item.allocatedLoadCostPaise,
    effective_cost_paise: item.effectiveCostPaise,
  }));

  const { error: itemsErr } = await supabase
    .from('purchase_order_items')
    .insert(itemsToInsert);

  if (itemsErr) {
    throw new Error(`Failed to insert order items: ${itemsErr.message}`);
  }

  // 6. Insert load costs
  if (processedLoadCosts.length > 0) {
    const loadCostsToInsert = processedLoadCosts.map((lc) => ({
      order_id: order.id,
      description: lc.description,
      amount_paise: lc.amountPaise,
      allocation_method: lc.allocationMethod,
    }));

    const { error: lcErr } = await supabase
      .from('purchase_load_costs')
      .insert(loadCostsToInsert);

    if (lcErr) {
      throw new Error(`Failed to insert load costs: ${lcErr.message}`);
    }
  }

  // 7. Insert initial status history
  await supabase.from('purchase_order_status_history').insert({
    order_id: order.id,
    from_status: 'none',
    to_status: 'draft',
    transition_key: `create_${order.id}`,
    notes: 'Draft order initialized',
  });

  return order;
}

export async function transitionPurchaseOrderStatus(
  orderId: string,
  toStatus: PurchaseOrderStatus,
  transitionKey: string,
  notes?: string,
): Promise<void> {
  const { error } = await supabase.rpc('transition_purchase_order_status', {
    p_order_id: orderId,
    p_to_status: toStatus,
    p_transition_key: transitionKey,
    p_notes: notes || undefined,
  });

  if (error) {
    throw new Error(`Failed to transition order status: ${error.message}`);
  }
}
