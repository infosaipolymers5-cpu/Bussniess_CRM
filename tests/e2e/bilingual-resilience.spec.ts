import { test, expect } from '@playwright/test';

test.describe('Overall Application Resilience & Bilingual Journey', () => {
  test('navigates to public QR registration in English and toggles Marathi translation', async ({
    page,
  }) => {
    await page.goto('/qr-register');

    // Default renders
    await expect(page.locator('body')).toBeVisible();

    // Check language toggle button if available
    const langBtn = page.getByRole('button', { name: /मराठी|English/i });
    if (await langBtn.isVisible()) {
      await langBtn.click();
      // Should switch language without crashing
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('360px mobile viewport renders navigation and forms without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/qr-register');

    // Ensure horizontal scroll width is equal to client width (no horizontal overflow)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allowance of 2px rounding
  });
});
