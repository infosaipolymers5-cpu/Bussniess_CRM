import { describe, it, expect } from 'vitest';
import {
  formatPaise,
  rupeesToPaise,
  paiseToRupees,
  sumPaise,
  isPositivePaise,
} from '@/lib/money';

describe('Money Utilities (Integer Paise)', () => {
  it('formats paise into Indian Rupee currency string', () => {
    expect(formatPaise(10000)).toMatch(/₹\s*100\.00/);
    expect(formatPaise(123456)).toMatch(/₹\s*1,234\.56/);
    expect(formatPaise(0)).toMatch(/₹\s*0\.00/);
  });

  it('converts rupees to paise accurately without float loss', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(12.34)).toBe(1234);
    expect(rupeesToPaise(0.5)).toBe(50);
  });

  it('converts paise to rupees for display', () => {
    expect(paiseToRupees(10000)).toBe(100);
    expect(paiseToRupees(1234)).toBe(12.34);
  });

  it('sums paise correctly without precision drift', () => {
    const items = [1050, 2075, 3025]; // ₹10.50 + ₹20.75 + ₹30.25 = ₹61.50 (6150 paise)
    expect(sumPaise(items)).toBe(6150);
  });

  it('validates strictly positive paise amounts', () => {
    expect(isPositivePaise(100)).toBe(true);
    expect(isPositivePaise(1)).toBe(true);
    expect(isPositivePaise(0)).toBe(false);
    expect(isPositivePaise(-50)).toBe(false);
    expect(isPositivePaise(12.34)).toBe(false); // floats rejected
  });
});
