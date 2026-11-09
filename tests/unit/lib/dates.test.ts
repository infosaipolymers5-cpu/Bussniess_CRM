import { describe, it, expect } from 'vitest';
import {
  getBusinessTimezone,
  formatDate,
  formatDateTime,
  todayInBusinessTz,
} from '@/lib/dates';

describe('Date Utilities (Asia/Kolkata)', () => {
  it('uses the authoritative business timezone Asia/Kolkata', () => {
    expect(getBusinessTimezone()).toBe('Asia/Kolkata');
  });

  it('formats dates consistently using the business timezone', () => {
    // 2026-11-08T00:00:00Z is 05:30 in Kolkata on Nov 8, 2026
    const formatted = formatDate('2026-11-08T00:00:00Z', 'en-US');
    expect(formatted).toContain('Nov 8, 2026');
  });

  it('formats date and time together', () => {
    const formatted = formatDateTime('2026-11-08T06:30:00Z', 'en-US');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('12:00'); // 06:30 UTC + 5:30 = 12:00 IST
  });

  it('provides today date in YYYY-MM-DD format', () => {
    const today = todayInBusinessTz();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
