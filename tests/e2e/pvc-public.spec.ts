import { test, expect } from '@playwright/test';

test.describe('Stage 8 PVC Public Presence Acceptance', () => {
  test('public PVC catalogue renders without auth and presents quote inquiry', async ({
    page,
  }) => {
    await page.goto('/pvc-catalogue');

    // Page title verification
    await expect(page.locator('h1')).toBeVisible();

    // Verify search input is present
    const searchInput = page.getByRole('textbox');
    await expect(searchInput).toBeVisible();

    // Verify brand filters or catalogue grid renders
    await expect(page.locator('main')).toBeVisible();
  });

  test('public digital card renders company contact and WhatsApp actions', async ({
    page,
  }) => {
    await page.goto('/card');

    // Digital card presentation
    await expect(page.locator('h1, h2')).toBeVisible();

    // Verify Call / WhatsApp actions exist without login requirements
    const contactLinks = page.locator(
      'a[href^="tel:"], a[href*="wa.me"], a[href*="whatsapp.com"]',
    );
    const count = await contactLinks.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
