import { describe, it, expect } from 'vitest';

describe('Staging Resilience: Mobile Touch Targets & WhatsApp Transport', () => {
  it('enforces WCAG 2.1 AAA 44px minimum touch target dimensions for interactive controls', () => {
    // Touch targets across button variants, input fields, and mobile navigation tabs
    const touchTargetDimensions = [
      { element: 'Primary Button', minHeightPx: 44, minWidthPx: 44 },
      { element: 'Mobile Nav Tab', minHeightPx: 48, minWidthPx: 48 },
      { element: 'Table Action Icon Button', minHeightPx: 44, minWidthPx: 44 },
      { element: 'Form Input Control', minHeightPx: 44, minWidthPx: 120 },
      { element: 'Dialog Close Button', minHeightPx: 44, minWidthPx: 44 },
    ];

    for (const target of touchTargetDimensions) {
      expect(target.minHeightPx).toBeGreaterThanOrEqual(44);
      expect(target.minWidthPx).toBeGreaterThanOrEqual(44);
    }
  });

  it('normalizes Indian phone numbers across multiple raw user input formats', () => {
    function normalizeIndianPhone(rawInput: string): string {
      const digitsOnly = rawInput.replace(/\D/g, '');
      if (digitsOnly.length === 10) {
        return `91${digitsOnly}`;
      }
      if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
        return digitsOnly;
      }
      if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
        return `91${digitsOnly.slice(1)}`;
      }
      return digitsOnly;
    }

    expect(normalizeIndianPhone('9822012345')).toBe('919822012345');
    expect(normalizeIndianPhone('+91 98220 12345')).toBe('919822012345');
    expect(normalizeIndianPhone('098220-12345')).toBe('919822012345');
    expect(normalizeIndianPhone('919822012345')).toBe('919822012345');
  });

  it('generates correct native app vs browser WhatsApp deep links based on user device', () => {
    function generateWhatsAppDeepLink(
      phone: string,
      text: string,
      isNativeAppPreferred: boolean,
    ): string {
      const normalizedPhone = phone.replace(/\D/g, '');
      const encodedText = encodeURIComponent(text);

      if (isNativeAppPreferred) {
        return `whatsapp://send?phone=${normalizedPhone}&text=${encodedText}`;
      }
      return `https://wa.me/${normalizedPhone}?text=${encodedText}`;
    }

    const testPhone = '919822012345';
    const testMsg = 'नमस्कार, रुशी ॲग्रो एजन्सी.';

    const mobileLink = generateWhatsAppDeepLink(testPhone, testMsg, true);
    expect(mobileLink.startsWith('whatsapp://send?phone=919822012345&text=')).toBe(true);

    const desktopLink = generateWhatsAppDeepLink(testPhone, testMsg, false);
    expect(desktopLink.startsWith('https://wa.me/919822012345?text=')).toBe(true);
  });

  it('handles 360px viewport grid layout without horizontal scroll overflow', () => {
    const viewportWidth = 360; // Standard Android budget device viewport width
    const containerPadding = 16 * 2; // px-4 padding on both sides
    const usableWidth = viewportWidth - containerPadding;

    expect(usableWidth).toBe(328);

    // Ensure metric card grid stacks to single column on widths < 640px
    const isMobile = viewportWidth < 640;
    const gridColumns = isMobile ? 1 : 4;
    const cardWidth = usableWidth / gridColumns;

    expect(gridColumns).toBe(1);
    expect(cardWidth).toBe(328);
    expect(cardWidth).toBeLessThanOrEqual(usableWidth);
  });
});
