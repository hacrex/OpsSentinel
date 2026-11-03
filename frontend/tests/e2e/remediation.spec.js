import { test, expect } from '@playwright/test';

test.describe('Remediation Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    // Mock remediation actions API
    await page.route('**/remediation/actions*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 1,
              fingerprint_hash: 'abc123',
              incident_id: 1,
              action_type: 'rerun_job',
              action_name: 'Rerun failed deploy job',
              status: 'pending',
              requires_approval: true,
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              fingerprint_hash: 'def456',
              incident_id: 2,
              action_type: 'rollback_deployment',
              action_name: 'Rollback to v1.2.3',
              status: 'completed',
              requires_approval: false,
              created_at: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 25, total: 2, pages: 1 },
        }),
      });
    });
  });

  test('should display remediation page', async ({ page }) => {
    await page.goto('/dashboard/remediation');
    
    await expect(page.locator('text=OpsSentinel — Automated Remediation')).toBeVisible();
    await expect(page.locator('text=Remediation Actions')).toBeVisible();
  });

  test('should display remediation actions list', async ({ page }) => {
    await page.goto('/dashboard/remediation');
    
    await expect(page.locator('text=Rerun failed deploy job')).toBeVisible();
    await expect(page.locator('text=Rollback to v1.2.3')).toBeVisible();
    await expect(page.locator('text=rerun_job')).toBeVisible();
    await expect(page.locator('text=rollback_deployment')).toBeVisible();
  });

  test('should display metrics', async ({ page }) => {
    await page.goto('/dashboard/remediation');
    
    await expect(page.locator('text=Total Actions')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
  });

  test('should have new action button', async ({ page }) => {
    await page.goto('/dashboard/remediation');
    
    await expect(page.locator('button:has-text("New Action")')).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/dashboard/remediation');
    await page.click('button:has-text("← Back")');
    await expect(page).toHaveURL('/dashboard');
  });
});
