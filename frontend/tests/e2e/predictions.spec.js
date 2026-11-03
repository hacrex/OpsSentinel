import { test, expect } from '@playwright/test';

test.describe('Predictions Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    // Mock predictions API
    await page.route('**/predictions*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 1,
              repo_name: 'test/repo',
              workflow_name: 'ci',
              stack_name: 'production',
              prediction_type: 'failure',
              target_entity: 'deploy job',
              probability: 0.85,
              risk_level: 'critical',
              reasons: 'Similar change failed 3 times',
              recommended_action: 'Review Dockerfile changes',
              predicted_at: new Date().toISOString(),
              resolved: false,
            },
            {
              id: 2,
              repo_name: 'test/repo',
              workflow_name: 'test',
              stack_name: 'staging',
              prediction_type: 'deployment_risk',
              target_entity: 'staging deploy',
              probability: 0.45,
              risk_level: 'medium',
              reasons: 'Dependency major version update',
              recommended_action: 'Pin dependency versions',
              predicted_at: new Date().toISOString(),
              resolved: false,
            },
          ],
          pagination: { page: 1, limit: 25, total: 2, pages: 1 },
        }),
      });
    });
  });

  test('should display predictions page', async ({ page }) => {
    await page.goto('/dashboard/predictions');
    
    await expect(page.locator('text=OpsSentinel — Predictive Analytics')).toBeVisible();
    await expect(page.locator('text=Predictions')).toBeVisible();
  });

  test('should display predictions list', async ({ page }) => {
    await page.goto('/dashboard/predictions');
    
    await expect(page.locator('text=deploy job')).toBeVisible();
    await expect(page.locator('text=staging deploy')).toBeVisible();
    await expect(page.locator('text=critical')).toBeVisible();
    await expect(page.locator('text=medium')).toBeVisible();
  });

  test('should display metrics', async ({ page }) => {
    await page.goto('/dashboard/predictions');
    
    await expect(page.locator('text=Total Predictions')).toBeVisible();
    await expect(page.locator('text=Critical Risk')).toBeVisible();
    await expect(page.locator('text=High Risk')).toBeVisible();
    await expect(page.locator('text=Unresolved')).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/dashboard/predictions');
    await page.click('button:has-text("← Back")');
    await expect(page).toHaveURL('/dashboard');
  });
});
