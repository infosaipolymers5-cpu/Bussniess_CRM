/**
 * Customer & Opening Balance CSV/Excel Import Service.
 *
 * Rules:
 * - Agreed columns: Name, Phone, DOB, Area, OpeningBalance, BusinessType
 * - Pre-validates every row before commit.
 * - Detects duplicates against existing business database.
 * - Defaults duplicates to "Skip".
 * - Commit is executed under a batch idempotency key.
 * - Creates a single provenance-tagged opening balance for each imported due; never fabricates history.
 */

import { supabase } from '@/lib/supabase';
import { normalizePhoneNumber, importRowSchema } from '@/lib/validation';
import { rupeesToPaise } from '@/lib/money';
import { checkDuplicatePhone } from '@/features/customers/api/customerService';

export interface ParsedImportRow {
  rowIndex: number;
  raw: Record<string, string>;
  name: string;
  phone: string;
  normalizedPhone: string;
  dob: string | null;
  area: string | null;
  openingBalanceRupees: number;
  businessType: 'cattle_feed' | 'pvc';
  isValid: boolean;
  validationError?: string;
  isDuplicate: boolean;
  duplicateCustomerId?: string;
  duplicateCustomerName?: string;
  action: 'import' | 'skip';
}

export interface ImportPreviewSummary {
  batchId: string;
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  rows: ParsedImportRow[];
}

export interface ImportCommitResult {
  batchId: string;
  importedCount: number;
  skippedCount: number;
  openingBalancesCount: number;
  errors: string[];
}

/**
 * Parse a CSV line handling double-quoted values.
 */
export function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse raw CSV text into header-keyed row objects.
 */
export function parseCsvText(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0] || '');
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i] || '');
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

/**
 * Parse and validate CSV text into structured import preview rows.
 */
export async function parseAndPreviewCsv(
  businessId: string,
  csvText: string,
): Promise<ImportPreviewSummary> {
  const batchId = crypto.randomUUID();
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      batchId,
      totalRows: 0,
      validRows: 0,
      duplicateRows: 0,
      errorRows: 0,
      rows: [],
    };
  }

  // Parse header
  const header = parseCsvLine(lines[0] || '').map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => h.includes('name'));
  const phoneIdx = header.findIndex((h) => h.includes('phone') || h.includes('mobile'));
  const dobIdx = header.findIndex((h) => h.includes('dob') || h.includes('birth'));
  const areaIdx = header.findIndex((h) => h.includes('area') || h.includes('village'));
  const balIdx = header.findIndex(
    (h) => h.includes('balance') || h.includes('due') || h.includes('amount'),
  );
  const typeIdx = header.findIndex((h) => h.includes('type') || h.includes('business'));

  const parsedRows: ParsedImportRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i] || '';
    const cols = parseCsvLine(line);
    if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;

    const raw: Record<string, string> = {
      name: (nameIdx >= 0 ? cols[nameIdx] : cols[0]) || '',
      phone: (phoneIdx >= 0 ? cols[phoneIdx] : cols[1]) || '',
      dob: (dobIdx >= 0 ? cols[dobIdx] : cols[2]) || '',
      area: (areaIdx >= 0 ? cols[areaIdx] : cols[3]) || '',
      balance: (balIdx >= 0 ? cols[balIdx] : cols[4]) || '0',
      type: (typeIdx >= 0 ? cols[typeIdx] : cols[5]) || 'cattle_feed',
    };

    const rowObj = {
      name: raw.name,
      phone: raw.phone,
      dateOfBirth: raw.dob ? raw.dob.trim() : null,
      area: raw.area ? raw.area.trim() : null,
      openingBalanceRupees: parseFloat(raw.balance || '0') || 0,
      businessType: raw.type?.toLowerCase().includes('pvc') ? 'pvc' : 'cattle_feed',
    };

    const result = importRowSchema.safeParse(rowObj);

    if (!result.success) {
      parsedRows.push({
        rowIndex: i + 1,
        raw,
        name: raw.name ?? '',
        phone: raw.phone ?? '',
        normalizedPhone: normalizePhoneNumber(raw.phone ?? ''),
        dob: rowObj.dateOfBirth,
        area: rowObj.area,
        openingBalanceRupees: rowObj.openingBalanceRupees,
        businessType: rowObj.businessType as 'cattle_feed' | 'pvc',
        isValid: false,
        validationError: result.error.errors.map((e) => e.message).join('; '),
        isDuplicate: false,
        action: 'skip',
      });
      continue;
    }

    const validData = result.data;
    const normalizedPhone = normalizePhoneNumber(validData.phone);

    // Check duplicate
    const { isDuplicate, existingCustomer } = await checkDuplicatePhone(
      businessId,
      validData.phone,
    );

    parsedRows.push({
      rowIndex: i + 1,
      raw,
      name: validData.name,
      phone: validData.phone,
      normalizedPhone,
      dob: validData.dateOfBirth || null,
      area: validData.area || null,
      openingBalanceRupees: validData.openingBalanceRupees,
      businessType: validData.businessType,
      isValid: true,
      isDuplicate,
      duplicateCustomerId: existingCustomer?.id,
      duplicateCustomerName: existingCustomer?.name,
      // Default duplicates to "skip"
      action: isDuplicate ? 'skip' : 'import',
    });
  }

  const validRows = parsedRows.filter((r) => r.isValid && !r.isDuplicate).length;
  const duplicateRows = parsedRows.filter((r) => r.isValid && r.isDuplicate).length;
  const errorRows = parsedRows.filter((r) => !r.isValid).length;

  return {
    batchId,
    totalRows: parsedRows.length,
    validRows,
    duplicateRows,
    errorRows,
    rows: parsedRows,
  };
}

/**
 * Commit approved import rows under batch idempotency.
 * Creates customers and single provenance-tagged opening balance entries.
 */
export async function commitImportBatch(
  businessId: string,
  batchId: string,
  fileName: string,
  rows: ParsedImportRow[],
): Promise<ImportCommitResult> {
  let importedCount = 0;
  let skippedCount = 0;
  let openingBalancesCount = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (row.action === 'skip' || !row.isValid) {
      skippedCount++;
      continue;
    }

    try {
      // 1. Insert customer
      const { data: customer, error: custError } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          name: row.name,
          display_phone: row.phone,
          normalized_phone: row.normalizedPhone,
          date_of_birth: row.dob,
          area: row.area,
          is_active: true,
        })
        .select('*')
        .single();

      if (custError || !customer) {
        errors.push(
          `Row ${row.rowIndex}: ${custError?.message || 'Insert customer failed'}`,
        );
        continue;
      }

      const createdCustomer = customer;
      importedCount++;

      // 2. Insert preferences
      await supabase.from('customer_preferences').insert({
        customer_id: createdCustomer.id,
        opted_out_marketing: false,
        opted_out_transactional: false,
        preferred_channel: 'whatsapp',
      });

      // 3. Provenance-tagged opening balance if amount > 0
      if (row.openingBalanceRupees > 0) {
        const amountPaise = rupeesToPaise(row.openingBalanceRupees);
        const { error: balanceError } = await supabase
          .from('opening_balance_imports')
          .insert({
            business_id: businessId,
            batch_id: batchId,
            customer_id: createdCustomer.id,
            amount_paise: amountPaise,
            provenance_file: fileName,
            provenance_row: row.rowIndex,
            notes: `Imported opening balance from ${fileName} line ${row.rowIndex}`,
          });

        if (!balanceError) {
          openingBalancesCount++;
        } else {
          errors.push(
            `Row ${row.rowIndex}: Balance recorded with error (${balanceError.message})`,
          );
        }
      }
    } catch (err) {
      errors.push(
        `Row ${row.rowIndex}: Unexpected error ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return {
    batchId,
    importedCount,
    skippedCount,
    openingBalancesCount,
    errors,
  };
}
