import { test, expect } from '@playwright/test';

test.describe('Audit Logs Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    // Mock audit logs API
    await page.route('**/audit-logs*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 1,
              username: 'testuser',
              action: 'user_login',
              resource_type: 'auth',
              resource_id: '12345',
              details: { login: 'testuser' },
              ip_address: '127.0.0.1',
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              username: 'testuser',
              action: 'workflow_rerun',
              resource_type: 'workflow_run',
              resource_id: 'test/repo/runs/123',
              details: { owner: 'test', repo: 'repo', runId: '123' },
              ip_address: '127.0.0.1',
              created_at: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 50, total: 2, pages: 1 },
        }),
      });
    });
  });

  test('should display audit logs page', async ({ page }) => {
    await page.goto('/dashboard/audit');
    
    await expect(page.locator('text=Audit Logs')).toBeVisible();
  });

  test('should display audit log entries', async ({ page }) => {
    await page.goto('/dashboard/audit');
    
    await expect(page.locator('text=testuser')).toBeVisible();
    await expect(page.locator('text=User Login')).toBeVisible();
    await expect(page.locator('text=Workflow Re-run')).toBeVisible();
  });

  test('should have action filter', async ({ page }) => {
    await page.goto('/dashboard/audit');
    
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('option:has-text("All Actions")')).toBeVisible();
  });

  test('should filter by action', async ({ page }) => {
    await page.goto('/dashboard/audit');
    
    await page.selectOption('select', 'user_login');
    
    // Should trigger new API call with filter
    await expect(page.locator('text=User Login')).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/dashboard/audit');
    await page.click('button:has-text("← Back")');
    await expect(page).toHaveURL('/dashboard');
  });
});
