/**
 * Date/time utilities — Asia/Kolkata timezone-aware.
 * All date boundaries use the configured business timezone.
 */

const BUSINESS_TIMEZONE = 'Asia/Kolkata';

/** Get the current date/time in the business timezone */
export function nowInBusinessTz(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: BUSINESS_TIMEZONE }));
}

/** Format a date for display in the business timezone */
export function formatDate(
  date: Date | string,
  locale = 'en-IN',
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: 'medium',
    ...options,
  }).format(d);
}

/** Format a date-time for display in the business timezone */
export function formatDateTime(date: Date | string, locale = 'en-IN'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    timeZone: BUSINESS_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

/** Get today's date string (YYYY-MM-DD) in the business timezone */
export function todayInBusinessTz(): string {
  const now = nowInBusinessTz();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get the business timezone identifier */
export function getBusinessTimezone(): string {
  return BUSINESS_TIMEZONE;
}

/**
 * Compute the Indian Financial Year string (e.g. '2026-27') in Asia/Kolkata timezone.
 * Financial Year starts on 1 April and ends on 31 March.
 */
export function getFinancialYear(date: Date | string = nowInBusinessTz()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
  });
  const parts = formatter.formatToParts(d);
  const yearPart = parts.find((p) => p.type === 'year')?.value;
  const monthPart = parts.find((p) => p.type === 'month')?.value;

  const year = parseInt(yearPart || '2026', 10);
  const month = parseInt(monthPart || '1', 10);

  const startYear = month >= 4 ? year : year - 1;
  const nextYearSuffix = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${nextYearSuffix}`;
}
