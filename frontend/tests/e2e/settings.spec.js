import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    // Mock settings API
    await page.route('**/settings', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          slack_webhook_url: '••••••••',
          teams_webhook_url: '',
          alert_email_to: 'test@example.com',
          smtp_host: 'smtp.example.com',
          smtp_port: '587',
          smtp_user: 'user@example.com',
          retention_days: '30',
        }),
      });
    });
  });

  test('should display settings page', async ({ page }) => {
    await page.goto('/dashboard/settings');
    
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('text=Notification Channels')).toBeVisible();
  });

  test('should display webhook URL', async ({ page }) => {
    await page.goto('/dashboard/settings');
    
    await expect(page.locator('text=Webhook URL')).toBeVisible();
    await expect(page.locator('input[readonly]')).toBeVisible();
  });

  test('should display Slack configuration', async ({ page }) => {
    await page.goto('/dashboard/settings');
    
    await expect(page.locator('text=Slack')).toBeVisible();
  });

  test('should display Teams configuration', async ({ page }) => {
    await page.goto('/dashboard/settings');
    
    await expect(page.locator('text=Microsoft Teams')).toBeVisible();
  });

  test('should display Email configuration', async ({ page }) => {
    await page.goto('/dashboard/settings');
    
    await expect(page.locator('text=Email')).toBeVisible();
  });

  test('should have test notification buttons', async ({ page }) => {
    await page.goto('/dashboard/settings');
    
    const testButtons = page.locator('button:has-text("Test")');
    await expect(testButtons).toHaveCount(3);
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.click('button:has-text("← Back")');
    await expect(page).toHaveURL('/dashboard');
  });
});
