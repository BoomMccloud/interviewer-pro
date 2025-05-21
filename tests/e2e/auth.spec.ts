import { test, expect } from '@playwright/test';
// import dotenv from 'dotenv'; // No longer needed here for session mocking
// import { SignJWT } from 'jose'; // No longer needed here
// import { TextEncoder } from 'util'; // No longer needed here

// // Load environment variables from .env file (if you had client-side specific env vars for tests)
// dotenv.config();

test.describe('Authentication E2E Tests - Logged Out', () => {
  const PROTECTED_ROUTE = '/dashboard';
  const LOGIN_ROUTE = '/login';
  const ROOT_ROUTE = '/';

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('Scenario 1: Accessing Protected Route While Logged Out redirects to Login', async ({ page }) => {
    await page.goto(PROTECTED_ROUTE);
    await expect(page).toHaveURL(LOGIN_ROUTE);
    await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
  });

  test('Scenario 2: Accessing Root While Logged Out redirects to Login', async ({ page }) => {
    await page.goto(ROOT_ROUTE);
    await expect(page).toHaveURL(LOGIN_ROUTE);
    await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
  });
});

test.describe('Authentication E2E Tests - Logged In (Requires server with E2E_TESTING=true)', () => {
  const PROTECTED_ROUTE = '/dashboard';
  const LOGIN_ROUTE = '/login';
  // const MOCKED_USER_EMAIL = 'testuser@example.com'; // No longer needed for client-side mock creation
  // const AUTH_SECRET = process.env.AUTH_SECRET; // No longer needed for client-side mock creation

  // console.log('AUTH_SECRET loaded in test:', AUTH_SECRET ? '****** (loaded)' : 'NOT LOADED');
  // const cookieName = process.env.NEXTAUTH_URL?.startsWith('https')
  //   ? '__Secure-next-auth.session-token'
  //   : 'next-auth.session-token';
  // console.log('Determined cookie name:', cookieName);
  // console.log('NEXTAUTH_URL from env:', process.env.NEXTAUTH_URL);

  // if (!AUTH_SECRET) { // This check is not relevant if not creating cookie on client
  //   throw new Error('AUTH_SECRET environment variable is not set. Please ensure it is available in your .env file.');
  // }

  // beforeEach is no longer setting cookies here; server provides mock session via E2E_TESTING=true
  test.beforeEach(async ({ context }) => {
    // Clear cookies to ensure a clean slate even for logged-in tests, 
    // relying on server-side mock via E2E_TESTING=true
    await context.clearCookies(); 
  });

  test('Scenario 4: Accessing Protected Route While Logged In stays on Protected Route', async ({ page }) => {
    await page.goto(PROTECTED_ROUTE);
    await expect(page).toHaveURL(PROTECTED_ROUTE);
    await expect(page.getByRole('heading', { name: 'Interview Dashboard' })).toBeVisible();
  });

  test('Scenario 5: Accessing Login Page While Logged In redirects to Protected Route', async ({ page }) => {
    await page.goto(LOGIN_ROUTE);
    await expect(page).toHaveURL(PROTECTED_ROUTE);
    await expect(page.getByRole('heading', { name: 'Interview Dashboard' })).toBeVisible();
  });
}); 