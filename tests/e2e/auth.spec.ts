import { test, expect } from '@playwright/test';

test.describe('Authentication E2E Tests', () => {
  const MOCKED_USER_EMAIL = 'testuser@example.com';
  const PROTECTED_ROUTE = '/dashboard';
  const LOGIN_ROUTE = '/login';
  const ROOT_ROUTE = '/';

  test.beforeEach(async ({ context }) => {
    // Clear cookies and local storage before each test to ensure a clean state
    await context.clearCookies();
    // await page.evaluate(() => window.localStorage.clear()); // If using local storage
  });

  test('Scenario 1: Accessing Protected Route While Logged Out redirects to Login', async ({ page }) => {
    // Navigate directly to a protected route
    await page.goto(PROTECTED_ROUTE);

    // Assertion: Assert that the browser is redirected to the /login page URL
    await expect(page).toHaveURL(LOGIN_ROUTE);

    // Assertion: Assert that the content of the /login page (e.g., the "Sign in with Google" button) is visible.
    // We'll assume the sign-in button has a specific text or test ID.
    // For now, let's look for text. Adjust the selector as needed based on your actual login page.
    await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
  });

  test('Scenario 2: Accessing Root While Logged Out redirects to Login', async ({ page }) => {
    // Navigate to the root URL
    await page.goto(ROOT_ROUTE);

    // Assertion: Assert that the browser is redirected to the /login page URL
    await expect(page).toHaveURL(LOGIN_ROUTE);

    // Assertion: Optionally, assert that the login page content is visible (same as Scenario 1)
    await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
  });

  // We will add other scenarios here
}); 