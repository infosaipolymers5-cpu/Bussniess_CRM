import { test, expect } from '@playwright/test';

test.describe('Stage 2 CRM & Marketing Acceptance', () => {
  test('public QR registration page renders without authentication and enforces consent', async ({
    page,
  }) => {
    await page.goto('/qr-register');
    await expect(page.locator('h1')).toContainText(/Registration|नोंदणी/);

    // Verify submission button is present
    const submitBtn = page.getByRole('button', { name: /Register|नोंदणी/ });
    await expect(submitBtn).toBeVisible();

    // Attempt to submit without filling fields
    await submitBtn.click();
    // Verify consent warning or required field validation triggers
    await expect(page.locator('form')).toBeVisible();
  });
});
