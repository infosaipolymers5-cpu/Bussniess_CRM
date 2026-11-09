/**
 * Report Service for Rushi CRM Platform v2.0
 * Authoritative financial summaries:
 * 1. Strictly derives sales from non-cancelled bills (excluding cancelled bills).
 * 2. Strictly derives collections from customer_payments (sales != collections).
 * 3. Scope separation between Cattle Feed, PVC, and Combined businesses.
 * 4. Overdue debtors aging analysis and CSV export generation.
 */

import { supabase } from '@/lib/supabase';
import type { ReportFilterData } from '@/lib/validation';

export type SalesCollectionSummary = {
  scope: 'cattle_feed' | 'pvc' | 'combined';
  dateStart: string;
  dateEnd: string;
  totalSalesPaise: number;
  totalCollectionsPaise: number;
  totalBillsCount: number;
  totalPaymentsCount: number;
  netCashflowPaise: number;
  breakdown: Array<{
    date: string;
    salesPaise: number;
    collectionsPaise: number;
    billsCount: number;
    paymentsCount: number;
  }>;
};

export type OverdueDebtorRow = {
  customerId: string;
  customerName: string;
  phone: string;
  area: string | null;
  outstandingPaise: number;
  daysOverdue: number;
  oldestBillDate: string | null;
  oldestBillNumber: string | null;
  businessKind: 'cattle_feed' | 'pvc';
};

export const reportService = {
  /**
   * Fetches authoritative sales and collections figures
   */
  async getSalesAndCollections(
    businessId: string | null,
    dateStart: string,
    dateEnd: string,
    scope: 'cattle_feed' | 'pvc' | 'combined' = 'combined',
  ): Promise<SalesCollectionSummary> {
    // 1. Fetch valid commercial bills (strictly exclude cancelled bills)
    let billsQuery = supabase
      .from('bills')
      .select('id, business_id, bill_date, total_amount_paise, status')
      .neq('status', 'cancelled')
      .gte('bill_date', dateStart)
      .lte('bill_date', dateEnd);

    if (businessId && scope !== 'combined') {
      billsQuery = billsQuery.eq('business_id', businessId);
    }

    const { data: bills, error: billsError } = await billsQuery;
    if (billsError) throw billsError;

    // 2. Fetch payments recorded in period
    let paymentsQuery = supabase
      .from('customer_payments')
      .select('id, business_id, payment_date, amount_paise')
      .gte('payment_date', dateStart)
      .lte('payment_date', dateEnd);

    if (businessId && scope !== 'combined') {
      paymentsQuery = paymentsQuery.eq('business_id', businessId);
    }

    const { data: payments, error: paymentsError } = await paymentsQuery;
    if (paymentsError) throw paymentsError;

    // Group by date
    const dateMap = new Map<
      string,
      {
        salesPaise: number;
        collectionsPaise: number;
        billsCount: number;
        paymentsCount: number;
      }
    >();

    let totalSalesPaise = 0;
    let totalCollectionsPaise = 0;

    for (const bill of bills || []) {
      totalSalesPaise += bill.total_amount_paise || 0;
      const cur = dateMap.get(bill.bill_date) || {
        salesPaise: 0,
        collectionsPaise: 0,
        billsCount: 0,
        paymentsCount: 0,
      };
      cur.salesPaise += bill.total_amount_paise || 0;
      cur.billsCount += 1;
      dateMap.set(bill.bill_date, cur);
    }

    for (const payment of payments || []) {
      totalCollectionsPaise += payment.amount_paise || 0;
      const cur = dateMap.get(payment.payment_date) || {
        salesPaise: 0,
        collectionsPaise: 0,
        billsCount: 0,
        paymentsCount: 0,
      };
      cur.collectionsPaise += payment.amount_paise || 0;
      cur.paymentsCount += 1;
      dateMap.set(payment.payment_date, cur);
    }

    const breakdown = Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        ...stats,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      scope,
      dateStart,
      dateEnd,
      totalSalesPaise,
      totalCollectionsPaise,
      totalBillsCount: bills?.length || 0,
      totalPaymentsCount: payments?.length || 0,
      netCashflowPaise: totalCollectionsPaise - totalSalesPaise,
      breakdown,
    };
  },

  /**
   * Fetches overdue debtors ranked by outstanding amount and days overdue
   */
  async getOverdueDebtors(
    businessId: string | null,
    scope: 'cattle_feed' | 'pvc' | 'combined' = 'combined',
  ): Promise<OverdueDebtorRow[]> {
    // 1. Fetch uncollected bills
    let billsQuery = supabase
      .from('bills')
      .select('customer_id, bill_number, bill_date, balance_due_paise, status')
      .neq('status', 'cancelled')
      .gt('balance_due_paise', 0);

    if (businessId && scope !== 'combined') {
      billsQuery = billsQuery.eq('business_id', businessId);
    }

    const { data: bills, error: billsError } = await billsQuery;
    if (billsError) throw billsError;
    if (!bills || bills.length === 0) return [];

    const now = new Date();
    const debtorMap = new Map<
      string,
      { balancePaise: number; oldestBillDate: string; oldestBillNumber: string }
    >();

    for (const b of bills) {
      const cur = debtorMap.get(b.customer_id);
      if (cur) {
        cur.balancePaise += b.balance_due_paise;
        if (b.bill_date < cur.oldestBillDate) {
          cur.oldestBillDate = b.bill_date;
          cur.oldestBillNumber = b.bill_number;
        }
      } else {
        debtorMap.set(b.customer_id, {
          balancePaise: b.balance_due_paise,
          oldestBillDate: b.bill_date,
          oldestBillNumber: b.bill_number,
        });
      }
    }

    const customerIds = Array.from(debtorMap.keys());
    const { data: customers, error: custError } = await supabase
      .from('customers')
      .select('id, name, display_phone, area, created_at, business_id')
      .in('id', customerIds);

    if (custError) throw custError;
    if (!customers || customers.length === 0) return [];

    const result: OverdueDebtorRow[] = [];
    for (const c of customers) {
      const debtorInfo = debtorMap.get(c.id);
      if (!debtorInfo) continue;

      const billDate = new Date(debtorInfo.oldestBillDate);
      const daysOverdue = Math.max(
        0,
        Math.floor((now.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24)),
      );

      result.push({
        customerId: c.id,
        customerName: c.name,
        phone: c.display_phone,
        area: c.area,
        outstandingPaise: debtorInfo.balancePaise,
        daysOverdue,
        oldestBillDate: debtorInfo.oldestBillDate,
        oldestBillNumber: debtorInfo.oldestBillNumber,
        businessKind: 'cattle_feed',
      });
    }

    return result.sort((a, b) => b.outstandingPaise - a.outstandingPaise);
  },

  /**
   * Generates a downloadable CSV string and triggers browser download
   */
  exportToCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
    const csvRows = [headers.join(',')];
    for (const row of rows) {
      const escaped = row.map((cell) => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      csvRows.push(escaped.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Records compliance export in database
   */
  async recordExportLog(
    businessId: string | null,
    params: ReportFilterData,
    totalRecords: number,
  ): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('report_exports').insert({
      business_id: businessId,
      export_type: params.export_type,
      scope: params.scope,
      date_range_start: params.date_range_start,
      date_range_end: params.date_range_end,
      total_records: totalRecords,
      file_format: params.file_format,
      generated_by: user.id,
    });
  },
};
