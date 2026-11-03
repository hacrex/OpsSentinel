import { test, expect } from '@playwright/test';

test.describe('Configuration Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    // Mock configuration runs API
    await page.route('**/configuration/runs*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 1,
              repo_name: 'test/repo',
              tool: 'ansible',
              playbook: 'site.yml',
              inventory: 'inventory.ini',
              status: 'completed',
              conclusion: 'success',
              output_url: '/infra-logs/ansible.log',
              created_at: new Date().toISOString(),
            },
            {
              id: 2,
              repo_name: 'test/repo',
              tool: 'chef',
              playbook: 'cookbook.rb',
              inventory: 'nodes.json',
              status: 'completed',
              conclusion: 'failure',
              output_url: '/infra-logs/chef.log',
              created_at: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 25, total: 2, pages: 1 },
        }),
      });
    });
  });

  test('should display configuration page', async ({ page }) => {
    await page.goto('/dashboard/configuration');
    
    await expect(page.locator('text=OpsSentinel — Configuration')).toBeVisible();
    await expect(page.locator('text=Configuration Runs')).toBeVisible();
  });

  test('should display configuration runs table', async ({ page }) => {
    await page.goto('/dashboard/configuration');
    
    await expect(page.locator('text=test/repo')).toBeVisible();
    await expect(page.locator('text=ansible')).toBeVisible();
    await expect(page.locator('text=site.yml')).toBeVisible();
    await expect(page.locator('text=chef')).toBeVisible();
    await expect(page.locator('text=cookbook.rb')).toBeVisible();
  });

  test('should display metrics', async ({ page }) => {
    await page.goto('/dashboard/configuration');
    
    await expect(page.locator('text=Total Config Runs')).toBeVisible();
    await expect(page.locator('text=Failures')).toBeVisible();
    await expect(page.locator('text=Success Rate')).toBeVisible();
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/dashboard/configuration');
    await page.click('button:has-text("← Back")');
    await expect(page).toHaveURL('/dashboard');
  });
});
