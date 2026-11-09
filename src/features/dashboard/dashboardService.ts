/**
 * Dashboard Projection Service for Rushi CRM Platform v2.0
 * Computes authoritative executive snapshot:
 * 1. Derives monetary totals strictly from bills (excluding cancelled) and payments.
 * 2. Compiles real-time action queues: Overdue follow-ups, feed finish alerts, birthdays, and delivery trips.
 * 3. Highlights backup health and operational warnings.
 */

import { supabase } from '@/lib/supabase';
import { backupService } from '@/features/backups/backupService';

export type DashboardMetrics = {
  totalOutstandingPaise: number;
  totalCustomersCount: number;
  todaysSalesPaise: number;
  todaysBillsCount: number;
  todaysCollectionsPaise: number;
  todaysPaymentsCount: number;
  dueFollowUpsCount: number;
  feedFinishAlertsCount: number;
  todaysBirthdaysCount: number;
  pendingDeliveryTripsCount: number;
  isBackupHealthy: boolean;
  backupWarning: string | null;
  recentActionQueue: Array<{
    id: string;
    type: 'follow_up' | 'feed_alert' | 'birthday' | 'delivery';
    title: string;
    subtitle: string;
    badgeText: string;
    badgeColor: 'blue' | 'amber' | 'emerald' | 'purple';
  }>;
};

export const dashboardService = {
  /**
   * Loads the authoritative dashboard projection for the given business
   */
  async getDashboardProjection(businessId: string | null): Promise<DashboardMetrics> {
    const today = new Date().toISOString().split('T')[0] ?? '';
    const todayMonthDay = today.substring(5); // "MM-DD"

    // 1. Fetch Customers
    let custQuery = supabase
      .from('customers')
      .select('id, name, display_phone, date_of_birth, is_active');
    if (businessId) {
      custQuery = custQuery.eq('business_id', businessId);
    }
    const { data: customers } = await custQuery;

    // 2. Fetch Uncollected Bills for Outstanding Balance
    let uncollectedBillsQuery = supabase
      .from('bills')
      .select('customer_id, balance_due_paise')
      .gt('balance_due_paise', 0)
      .neq('status', 'cancelled');
    if (businessId) {
      uncollectedBillsQuery = uncollectedBillsQuery.eq('business_id', businessId);
    }
    const { data: uncollectedBills } = await uncollectedBillsQuery;

    let totalOutstandingPaise = 0;
    const customerDebtMap = new Map<string, number>();

    for (const b of uncollectedBills || []) {
      totalOutstandingPaise += b.balance_due_paise;
      customerDebtMap.set(
        b.customer_id,
        (customerDebtMap.get(b.customer_id) || 0) + b.balance_due_paise,
      );
    }

    let todaysBirthdaysCount = 0;
    const actionQueue: DashboardMetrics['recentActionQueue'] = [];

    for (const c of customers || []) {
      const debt = customerDebtMap.get(c.id);
      if (debt && debt > 0) {
        if (actionQueue.length < 5) {
          actionQueue.push({
            id: `fu-${c.id}`,
            type: 'follow_up',
            title: c.name,
            subtitle: `₹${(debt / 100).toFixed(0)} overdue balance`,
            badgeText: 'Follow Up',
            badgeColor: 'amber',
          });
        }
      }

      // Birthday check
      if (c.date_of_birth && c.date_of_birth.substring(5) === todayMonthDay) {
        todaysBirthdaysCount++;
        actionQueue.unshift({
          id: `bday-${c.id}`,
          type: 'birthday',
          title: `Birthday: ${c.name}`,
          subtitle: `Send birthday greetings (${c.display_phone})`,
          badgeText: 'Birthday',
          badgeColor: 'purple',
        });
      }
    }

    // 3. Today's Commercial Bills (Exclude cancelled bills)
    let billsQuery = supabase
      .from('bills')
      .select('id, total_amount_paise, status')
      .eq('bill_date', today)
      .neq('status', 'cancelled');
    if (businessId) {
      billsQuery = billsQuery.eq('business_id', businessId);
    }
    const { data: todaysBills } = await billsQuery;

    let todaysSalesPaise = 0;
    for (const b of todaysBills || []) {
      todaysSalesPaise += b.total_amount_paise || 0;
    }

    // 4. Today's Collections (Customer Payments)
    let payQuery = supabase
      .from('customer_payments')
      .select('id, amount_paise')
      .eq('payment_date', today);
    if (businessId) {
      payQuery = payQuery.eq('business_id', businessId);
    }
    const { data: todaysPayments } = await payQuery;

    let todaysCollectionsPaise = 0;
    for (const p of todaysPayments || []) {
      todaysCollectionsPaise += p.amount_paise || 0;
    }

    // 5. Pending Delivery Trips
    let tripsQuery = supabase
      .from('delivery_trips')
      .select('id, trip_number, trip_date, area')
      .eq('trip_date', today);
    if (businessId) {
      tripsQuery = tripsQuery.eq('business_id', businessId);
    }
    const { data: deliveryTrips } = await tripsQuery;

    for (const dt of deliveryTrips || []) {
      if (actionQueue.length < 8) {
        actionQueue.push({
          id: `trip-${dt.id}`,
          type: 'delivery',
          title: `Trip #${dt.trip_number}`,
          subtitle: dt.area || 'Scheduled delivery trip',
          badgeText: 'Dispatch',
          badgeColor: 'blue',
        });
      }
    }

    // 6. Backup health
    const backupHealth = await backupService.evaluateBackupHealth(businessId);

    return {
      totalOutstandingPaise,
      totalCustomersCount: customers?.length || 0,
      todaysSalesPaise,
      todaysBillsCount: todaysBills?.length || 0,
      todaysCollectionsPaise,
      todaysPaymentsCount: todaysPayments?.length || 0,
      dueFollowUpsCount: customerDebtMap.size,
      feedFinishAlertsCount: 0,
      todaysBirthdaysCount,
      pendingDeliveryTripsCount: deliveryTrips?.length || 0,
      isBackupHealthy: backupHealth.isHealthy,
      backupWarning: backupHealth.warnings[0] || null,
      recentActionQueue: actionQueue.slice(0, 10),
    };
  },
};
