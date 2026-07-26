import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    // Mock events API
    await page.route('**/events*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 1,
              repo_name: 'test/repo',
              workflow_name: 'CI',
              status: 'completed',
              conclusion: 'success',
              run_url: 'https://github.com/test/repo/actions/runs/1',
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              repo_name: 'test/repo',
              workflow_name: 'CI',
              status: 'completed',
              conclusion: 'failure',
              run_url: 'https://github.com/test/repo/actions/runs/2',
              created_at: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 25, total: 2, pages: 1 },
        }),
      });
    });

    // Mock repos API
    await page.route('**/repos', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(['test/repo']),
      });
    });
  });

  test('should display dashboard with header', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('text=OpsSentinel')).toBeVisible();
    await expect(page.locator('text=LIVE')).toBeVisible();
  });

  test('should display events table', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('text=Recent Runs')).toBeVisible();
    await expect(page.locator('text=test/repo')).toBeVisible();
    await expect(page.locator('text=CI')).toBeVisible();
  });

  test('should display metrics', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('text=Total Workflows')).toBeVisible();
    await expect(page.locator('text=Failures')).toBeVisible();
    await expect(page.locator('text=Health')).toBeVisible();
  });

  test('should have navigation buttons', async ({ page }) => {
    await page.goto('/dashboard');
    
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('text=Audit')).toBeVisible();
    await expect(page.locator('text=Users')).toBeVisible();
    await expect(page.locator('text=Logout')).toBeVisible();
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Settings');
    await expect(page).toHaveURL('/dashboard/settings');
  });

  test('should navigate to audit logs', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Audit');
    await expect(page).toHaveURL('/dashboard/audit');
  });

  test('should navigate to user management', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('text=Users');
    await expect(page).toHaveURL('/dashboard/users');
  });
});
