/**
 * Khate Utara (Account Statement) Service API layer.
 * Authoritative running ledger calculations for Cattle Feed customers.
 */

import { supabase } from '@/lib/supabase';
import type { LedgerEntryType } from '@/lib/database.types';

export interface KhateUtaraRow {
  id: string;
  entryDate: string;
  entryType: LedgerEntryType;
  referenceId: string | null;
  referenceNumber: string | null;
  debitPaise: number;
  creditPaise: number;
  runningBalancePaise: number;
  notes: string | null;
  createdAt: string;
}

export interface KhateUtaraStatement {
  customerId: string;
  fromDate: string;
  toDate: string;
  openingBalancePaise: number;
  closingBalancePaise: number;
  totalDebitPaise: number;
  totalCreditPaise: number;
  entries: KhateUtaraRow[];
}

/**
 * Fetch and construct Khate Utara statement for a customer in a date range.
 */
export async function fetchKhateUtara(
  businessId: string,
  customerId: string,
  fromDate: string,
  toDate: string,
): Promise<{ statement: KhateUtaraStatement | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('get_customer_khate_utara', {
      p_business_id: businessId,
      p_customer_id: customerId,
      p_from_date: fromDate,
      p_to_date: toDate,
    });

    if (error || !data) {
      return {
        statement: null,
        error: error?.message ?? 'Failed to generate account statement',
      };
    }

    const raw = data as {
      customer_id: string;
      from_date: string;
      to_date: string;
      opening_balance_paise: number;
      entries: Array<{
        id: string;
        entry_date: string;
        entry_type: LedgerEntryType;
        reference_id: string | null;
        reference_number: string | null;
        debit_paise: number;
        credit_paise: number;
        notes: string | null;
        created_at: string;
      }>;
    };

    let currentBalance = raw.opening_balance_paise || 0;
    let totalDebit = 0;
    let totalCredit = 0;

    const entriesWithRunning: KhateUtaraRow[] = (raw.entries || []).map((entry) => {
      const debit = entry.debit_paise || 0;
      const credit = entry.credit_paise || 0;
      totalDebit += debit;
      totalCredit += credit;
      currentBalance += debit - credit;

      return {
        id: entry.id,
        entryDate: entry.entry_date,
        entryType: entry.entry_type,
        referenceId: entry.reference_id,
        referenceNumber: entry.reference_number,
        debitPaise: debit,
        creditPaise: credit,
        runningBalancePaise: currentBalance,
        notes: entry.notes,
        createdAt: entry.created_at,
      };
    });

    return {
      statement: {
        customerId: raw.customer_id,
        fromDate: raw.from_date,
        toDate: raw.to_date,
        openingBalancePaise: raw.opening_balance_paise || 0,
        closingBalancePaise: currentBalance,
        totalDebitPaise: totalDebit,
        totalCreditPaise: totalCredit,
        entries: entriesWithRunning,
      },
      error: null,
    };
  } catch (err) {
    return {
      statement: null,
      error: err instanceof Error ? err.message : 'Failed to generate statement',
    };
  }
}
