/**
 * Money utilities — integer paise arithmetic only.
 * Never use floating-point for money.
 */

/** Format paise as display string (e.g. 12345 → "₹123.45") */
export function formatPaise(paise: number, locale = 'en-IN'): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** Parse rupee string to paise (only for display input — server is authority) */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** Paise to rupees for display only */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Sum an array of paise values safely */
export function sumPaise(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Check if a paise amount is positive */
export function isPositivePaise(paise: number): boolean {
  return Number.isInteger(paise) && paise > 0;
}
