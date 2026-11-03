import { test, expect } from '@playwright/test';

test.describe('Infrastructure Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    // Mock infrastructure runs API
    await page.route('**/infrastructure/runs*', (route) => {
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
              operation: 'apply',
              status: 'completed',
              conclusion: 'success',
              output_url: '/infra-logs/test.log',
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              repo_name: 'test/repo',
              stack_name: 'staging',
              engine: 'terraform',
              operation: 'plan',
              status: 'completed',
              conclusion: 'failure',
              output_url: '/infra-logs/test2.log',
              created_at: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 25, total: 2, pages: 1 },
        }),
      });
    });

    // Mock stacks API
    await page.route('**/infrastructure/stacks', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            repo_name: 'test/repo',
            stack_name: 'production',
            engine: 'tofu',
            working_dir: './infra/production',
            default_vars: {},
          },
        ]),
      });
    });
  });

  test('should display infrastructure page', async ({ page }) => {
    await page.goto('/dashboard/infrastructure');
    
    await expect(page.locator('text=OpsSentinel — Infrastructure')).toBeVisible();
    await expect(page.locator('text=Infrastructure Runs')).toBeVisible();
  });

  test('should display infrastructure runs table', async ({ page }) => {
    await page.goto('/dashboard/infrastructure');
    
    await expect(page.locator('text=test/repo')).toBeVisible();
    await expect(page.locator('text=production')).toBeVisible();
    await expect(page.locator('text=tofu')).toBeVisible();
    await expect(page.locator('text=apply')).toBeVisible();
  });

  test('should display metrics', async ({ page }) => {
    await page.goto('/dashboard/infrastructure');
    
    await expect(page.locator('text=Total Infra Runs')).toBeVisible();
    await expect(page.locator('text=Failures')).toBeVisible();
    await expect(page.locator('text=Success Rate')).toBeVisible();
  });

  test('should display stacks configuration panel', async ({ page }) => {
    await page.goto('/dashboard/infrastructure');
    
    await expect(page.locator('text=Stack Configurations')).toBeVisible();
    await expect(page.locator('text=production')).toBeVisible();
    await expect(page.locator('text=./infra/production')).toBeVisible();
  });

  test('should have trigger run button', async ({ page }) => {
    await page.goto('/dashboard/infrastructure');
    
    await expect(page.locator('button:has-text("Trigger Run")')).toBeVisible();
  });

  test('should have stack config button', async ({ page }) => {
    await page.goto('/dashboard/infrastructure');
    
    await expect(page.locator('button:has-text("Stack Config")')).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/dashboard/infrastructure');
    await page.click('button:has-text("← Back")');
    await expect(page).toHaveURL('/dashboard');
  });
});
