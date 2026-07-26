import { test, expect } from '@playwright/test';

test.describe('User Management Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    // Mock users API
    await page.route('**/users', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            github_id: '12345',
            username: 'admin',
            avatar_url: 'https://avatars.githubusercontent.com/u/12345',
            role: 'admin',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            github_id: '67890',
            username: 'developer',
            avatar_url: 'https://avatars.githubusercontent.com/u/67890',
            role: 'developer',
            created_at: new Date().toISOString(),
          },
          {
            id: 3,
            github_id: '11111',
            username: 'viewer',
            avatar_url: 'https://avatars.githubusercontent.com/u/11111',
            role: 'viewer',
            created_at: new Date().toISOString(),
          },
        ]),
      });
    });
  });

  test('should display user management page', async ({ page }) => {
    await page.goto('/dashboard/users');
    
    await expect(page.locator('text=User Management')).toBeVisible();
  });

  test('should display users list', async ({ page }) => {
    await page.goto('/dashboard/users');
    
    await expect(page.locator('text=admin')).toBeVisible();
    await expect(page.locator('text=developer')).toBeVisible();
    await expect(page.locator('text=viewer')).toBeVisible();
  });

  test('should display user roles', async ({ page }) => {
    await page.goto('/dashboard/users');
    
    await expect(page.locator('text=admin').first()).toBeVisible();
    await expect(page.locator('text=developer').first()).toBeVisible();
    await expect(page.locator('text=viewer').first()).toBeVisible();
  });

  test('should have role selection dropdowns', async ({ page }) => {
    await page.goto('/dashboard/users');
    
    const selects = page.locator('select');
    await expect(selects).toHaveCount(3);
  });

  test('should navigate back to dashboard', async ({ page }) => {
    await page.goto('/dashboard/users');
    await page.click('button:has-text("← Back")');
    await expect(page).toHaveURL('/dashboard');
  });
});
