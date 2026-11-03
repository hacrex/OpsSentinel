import { test, expect } from '@playwright/test';

test.describe('Incidents Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    // Mock incidents API
    await page.route('**/incidents*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 1,
              title: 'Production API Outage',
              description: 'API returning 500 errors',
              severity: 'critical',
              status: 'open',
              repo_name: 'test/repo',
              stack_name: 'production',
              workflow_name: 'deploy',
              created_at: new Date().toISOString(),
              resolved_at: null,
            },
            {
              id: 2,
              title: 'Database Connection Failures',
              description: 'DB pool exhausted',
              severity: 'high',
              status: 'investigating',
              repo_name: 'test/repo',
              stack_name: 'staging',
              workflow_name: 'ci',
              created_at: new Date().toISOString(),
              resolved_at: null,
            },
          ],
          pagination: { page: 1, limit: 25, total: 2, pages: 1 },
        }),
      });
    });
  });

  test('should display incidents page', async ({ page }) => {
    await page.goto('/dashboard/incidents');
    
    await expect(page.locator('text=OpsSentinel — Incidents')).toBeVisible();
    await expect(page.locator('text=Incidents')).toBeVisible();
  });

  test('should display incidents list', async ({ page }) => {
    await page.goto('/dashboard/incidents');
    
    await expect(page.locator('text=Production API Outage')).toBeVisible();
    await expect(page.locator('text=Database Connection Failures')).toBeVisible();
    await expect(page.locator('text=critical')).toBeVisible();
    await expect(page.locator('text=high')).toBeVisible();
  });

  test('should display metrics', async ({ page }) => {
    await page.goto('/dashboard/incidents');
    
    await expect(page.locator('text=Total Incidents')).toBeVisible();
    await expect(page.locator('text=Open')).toBeVisible();
    await expect(page.locator('text=Critical')).toBeVisible();
    await expect(page.locator('text=Resolved')).toBeVisible();
  });

  test('should have new incident button', async ({ page }) => {
    await page.goto('/dashboard/incidents');
    
    await expect(page.locator('button:has-text("New Incident")')).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/dashboard/incidents');
    await page.click('button:has-text("← Back")');
    await expect(page).toHaveURL('/dashboard');
  });
});
