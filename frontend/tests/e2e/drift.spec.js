import { test, expect } from '@playwright/test';

test.describe('Drift Detection Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    // Mock drift events API
    await page.route('**/drift/events*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 1,
              repo_name: 'test/repo',
              stack_name: 'production',
              engine: 'tofu',
              drift_type: 'infrastructure',
              resource_type: 'aws_instance',
              resource_name: 'web_server',
              status: 'detected',
              severity: 'high',
              source_commit: 'abc123',
              recommended_action: 'Run tofu apply',
              detected_at: new Date().toISOString(),
              resolved_at: null,
            },
            {
              id: 2,
              repo_name: 'test/repo',
              stack_name: 'staging',
              engine: 'ansible',
              drift_type: 'configuration',
              resource_type: 'package',
              resource_name: 'nginx',
              status: 'remediated',
              severity: 'medium',
              source_commit: 'def456',
              recommended_action: 'Re-run playbook',
              detected_at: new Date().toISOString(),
              resolved_at: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 25, total: 2, pages: 1 },
        }),
      });
    });
  });

  test('should display drift page', async ({ page }) => {
    await page.goto('/dashboard/drift');
    
    await expect(page.locator('text=OpsSentinel — Drift Detection')).toBeVisible();
    await expect(page.locator('text=Drift Events')).toBeVisible();
  });

  test('should display drift events list', async ({ page }) => {
    await page.goto('/dashboard/drift');
    
    await expect(page.locator('text=tofu')).toBeVisible();
    await expect(page.locator('text=ansible')).toBeVisible();
    await expect(page.locator('text=infrastructure')).toBeVisible();
    await expect(page.locator('text=configuration')).toBeVisible();
    await expect(page.locator('text=web_server')).toBeVisible();
    await expect(page.locator('text=nginx')).toBeVisible();
  });

  test('should display metrics', async ({ page }) => {
    await page.goto('/dashboard/drift');
    
    await expect(page.locator('text=Total Drift Events')).toBeVisible();
    await expect(page.locator('text=Critical')).toBeVisible();
    await expect(page.locator('text=Unresolved')).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/dashboard/drift');
    await page.click('button:has-text("← Back")');
    await expect(page).toHaveURL('/dashboard');
  });
});
