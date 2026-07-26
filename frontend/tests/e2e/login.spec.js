import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check for login elements
    await expect(page.locator('text=OpsSentinel')).toBeVisible();
    await expect(page.locator('text=Sign in with GitHub')).toBeVisible();
  });

  test('should redirect to dashboard when authenticated', async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: true }),
      });
    });

    await page.goto('/');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should stay on login when not authenticated', async ({ page }) => {
    // Mock unauthenticated
    await page.route('**/auth/me', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not authenticated' }),
      });
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
