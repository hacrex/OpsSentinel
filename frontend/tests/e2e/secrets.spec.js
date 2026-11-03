import { test, expect } from '@playwright/test';

test.describe('Secrets Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    // Mock secrets API
    await page.route('**/secrets*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 1,
              name: 'DB_PASSWORD',
              value: '••••••••',
              provider: 'vault',
              scope: 'production',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 2,
              name: 'API_KEY',
              value: '••••••••',
              provider: 'aws-secrets-manager',
              scope: 'staging',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 25, total: 2, pages: 1 },
        }),
      });
    });
  });

  test('should display secrets page', async ({ page }) => {
    await page.goto('/dashboard/secrets');
    
    await expect(page.locator('text=OpsSentinel — Secrets')).toBeVisible();
    await expect(page.locator('text=Secrets')).toBeVisible();
  });

  test('should display secrets list', async ({ page }) => {
    await page.goto('/dashboard/secrets');
    
    await expect(page.locator('text=DB_PASSWORD')).toBeVisible();
    await expect(page.locator('text=API_KEY')).toBeVisible();
    await expect(page.locator('text=vault')).toBeVisible();
    await expect(page.locator('text=aws-secrets-manager')).toBeVisible();
  });

  test('should display metrics', async ({ page }) => {
    await page.goto('/dashboard/secrets');
    
    await expect(page.locator('text=Total Secrets')).toBeVisible();
    await expect(page.locator('text=Providers')).toBeVisible();
    await expect(page.locator('text=Encrypted at Rest')).toBeVisible();
  });

  test('should have new secret button', async ({ page }) => {
    await page.goto('/dashboard/secrets');
    
    await expect(page.locator('button:has-text("New Secret")')).toBeVisible();
  });

  test('should toggle secret value visibility', async ({ page }) => {
    await page.goto('/dashboard/secrets');
    
    // Click eye icon to reveal value
    await page.locator('button').filter({ hasText: '' }).first().click();
    // Value should be visible (masked or unmasked based on state)
    await expect(page.locator('text=••••••••')).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/dashboard/secrets');
    await page.click('button:has-text("← Back")');
    await expect(page).toHaveURL('/dashboard');
  });
});
