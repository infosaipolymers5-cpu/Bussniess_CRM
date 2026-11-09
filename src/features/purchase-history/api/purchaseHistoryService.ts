/**
 * Purchase History Service (Owner-Only, Cattle Feed Exclusive)
 * Queries confirmed purchase receipts, effective unit costs, and freight apportionment.
 * Invariant: Does NOT derive or display speculative stock balances.
 */

import { supabase } from '@/lib/supabase';
import type { PurchaseOrderItem, Supplier } from '@/lib/database.types';

export type PurchaseHistoryLine = PurchaseOrderItem & {
  order: {
    id: string;
    order_number: string;
    order_date: string;
    status: string;
    supplier: Supplier;
  };
};

type OrderRecord = {
  id: string;
  order_number: string;
  order_date: string;
  status: string;
  supplier: Supplier;
};

export async function fetchPurchaseHistory(
  businessId: string,
  options?: {
    supplierId?: string;
    productId?: string;
    fromDate?: string;
    toDate?: string;
  },
): Promise<PurchaseHistoryLine[]> {
  // Query confirmed purchase orders
  let poQuery = supabase
    .from('purchase_orders')
    .select('id, order_number, order_date, status, supplier:suppliers(*)')
    .eq('business_id', businessId)
    .in('status', ['ordered', 'dispatched', 'received'])
    .order('order_date', { ascending: false });

  if (options?.supplierId) {
    poQuery = poQuery.eq('supplier_id', options.supplierId);
  }
  if (options?.fromDate) {
    poQuery = poQuery.gte('order_date', options.fromDate);
  }
  if (options?.toDate) {
    poQuery = poQuery.lte('order_date', options.toDate);
  }

  const { data: rawOrders, error: ordersErr } = await poQuery;

  if (ordersErr) {
    throw new Error(`Failed to fetch orders for history: ${ordersErr.message}`);
  }

  const orders = (rawOrders ?? []) as unknown as OrderRecord[];

  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((o: OrderRecord) => o.id);
  const orderMap = new Map<string, OrderRecord>(
    orders.map((o: OrderRecord) => [o.id, o]),
  );

  let itemsQuery = supabase
    .from('purchase_order_items')
    .select('*')
    .in('order_id', orderIds)
    .order('created_at', { ascending: false });

  if (options?.productId) {
    itemsQuery = itemsQuery.eq('product_id', options.productId);
  }

  const { data: items, error: itemsErr } = await itemsQuery;

  if (itemsErr) {
    throw new Error(`Failed to fetch purchase order items: ${itemsErr.message}`);
  }

  const result: PurchaseHistoryLine[] = [];

  for (const item of items ?? []) {
    const parentOrder = orderMap.get(item.order_id);
    if (parentOrder) {
      result.push({
        ...item,
        order: parentOrder,
      });
    }
  }

  return result;
}
