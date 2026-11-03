# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: audit.spec.js >> Audit Logs Page >> should have action filter
- Location: tests\e2e\audit.spec.js:62:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('option:has-text("All Actions")')
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" locator('option:has-text("All Actions")') with timeout 5000ms
  - waiting for locator('option:has-text("All Actions")')
    13 × locator resolved to <option value="">All Actions</option>
       - unexpected value "hidden"

```

```yaml
- button
- heading "Audit Logs" [level=1]
- combobox:
  - option "All Actions" [selected]
  - option "User Login"
  - option "Workflow Re-run"
  - option "Notification Test"
  - option "Settings Change"
- table:
  - rowgroup:
    - row "Time User Action Resource Details IP":
      - columnheader "Time"
      - columnheader "User"
      - columnheader "Action"
      - columnheader "Resource"
      - columnheader "Details"
      - columnheader "IP"
  - rowgroup:
    - 'row "11/3/2026, 7:10:00 PM testuser User Login 12345 {\"login\":\"testuser\"} 127.0.0.1"':
      - cell "11/3/2026, 7:10:00 PM"
      - cell "testuser"
      - cell "User Login"
      - cell "12345"
      - 'cell "{\"login\":\"testuser\"}"':
        - code: "{\"login\":\"testuser\"}"
      - cell "127.0.0.1"
    - 'row "11/3/2026, 7:10:00 PM testuser Workflow Re-run test/repo/runs/123 {\"owner\":\"test\",\"repo\":\"repo\",\"runId\":\"123\"} 127.0.0.1"':
      - cell "11/3/2026, 7:10:00 PM"
      - cell "testuser"
      - cell "Workflow Re-run"
      - cell "test/repo/runs/123"
      - 'cell "{\"owner\":\"test\",\"repo\":\"repo\",\"runId\":\"123\"}"':
        - code: "{\"owner\":\"test\",\"repo\":\"repo\",\"runId\":\"123\"}"
      - cell "127.0.0.1"
- text: Showing 1 to 2 of 2 logs
- button "Previous" [disabled]
- button "Next" [disabled]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Audit Logs Page', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Mock authentication
  6  |     await page.route('**/auth/me', (route) => {
  7  |       route.fulfill({
  8  |         status: 200,
  9  |         contentType: 'application/json',
  10 |         body: JSON.stringify({ authenticated: true }),
  11 |       });
  12 |     });
  13 | 
  14 |     // Mock audit logs API
  15 |     await page.route('**/audit-logs*', (route) => {
  16 |       route.fulfill({
  17 |         status: 200,
  18 |         contentType: 'application/json',
  19 |         body: JSON.stringify({
  20 |           data: [
  21 |             {
  22 |               id: 1,
  23 |               username: 'testuser',
  24 |               action: 'user_login',
  25 |               resource_type: 'auth',
  26 |               resource_id: '12345',
  27 |               details: { login: 'testuser' },
  28 |               ip_address: '127.0.0.1',
  29 |               created_at: new Date().toISOString(),
  30 |             },
  31 |             {
  32 |               id: 2,
  33 |               username: 'testuser',
  34 |               action: 'workflow_rerun',
  35 |               resource_type: 'workflow_run',
  36 |               resource_id: 'test/repo/runs/123',
  37 |               details: { owner: 'test', repo: 'repo', runId: '123' },
  38 |               ip_address: '127.0.0.1',
  39 |               created_at: new Date().toISOString(),
  40 |             },
  41 |           ],
  42 |           pagination: { page: 1, limit: 50, total: 2, pages: 1 },
  43 |         }),
  44 |       });
  45 |     });
  46 |   });
  47 | 
  48 |   test('should display audit logs page', async ({ page }) => {
  49 |     await page.goto('/dashboard/audit');
  50 |     
  51 |     await expect(page.locator('text=Audit Logs')).toBeVisible();
  52 |   });
  53 | 
  54 |   test('should display audit log entries', async ({ page }) => {
  55 |     await page.goto('/dashboard/audit');
  56 |     
  57 |     await expect(page.locator('text=testuser')).toBeVisible();
  58 |     await expect(page.locator('text=User Login')).toBeVisible();
  59 |     await expect(page.locator('text=Workflow Re-run')).toBeVisible();
  60 |   });
  61 | 
  62 |   test('should have action filter', async ({ page }) => {
  63 |     await page.goto('/dashboard/audit');
  64 |     
  65 |     await expect(page.locator('select')).toBeVisible();
> 66 |     await expect(page.locator('option:has-text("All Actions")')).toBeVisible();
     |                                                                  ^ Error: expect(locator).toBeVisible() failed
  67 |   });
  68 | 
  69 |   test('should filter by action', async ({ page }) => {
  70 |     await page.goto('/dashboard/audit');
  71 |     
  72 |     await page.selectOption('select', 'user_login');
  73 |     
  74 |     // Should trigger new API call with filter
  75 |     await expect(page.locator('text=User Login')).toBeVisible();
  76 |   });
  77 | 
  78 |   test('should navigate back to dashboard', async ({ page }) => {
  79 |     await page.goto('/dashboard/audit');
  80 |     await page.click('button:has-text("← Back")');
  81 |     await expect(page).toHaveURL('/dashboard');
  82 |   });
  83 | });
  84 | 
```