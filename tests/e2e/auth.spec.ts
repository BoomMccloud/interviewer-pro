/**
 * @fileoverview End-to-end tests for authentication and routing using Playwright.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication and Routing', () => {
  test('should redirect to login when accessing a protected route while logged out', async ({ page }) => {
    // Scenario 1: Accessing Protected Route While Logged Out
    await page.goto('/dashboard');

    // Assertion: Assert that the browser is redirected to the /login page URL.
    await expect(page).toHaveURL(/.*\/login/);

    // Assertion: Assert that the content of the /login page (e.g., the "Sign in with Google" button) is visible.
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  });

  test('should redirect to login when accessing the root while logged out', async ({ page }) => {
    // Scenario 2: Accessing Root While Logged Out
    await page.goto('/');

    // Assertion: Assert that the "Sign In" link is visible on the root page.
    const signInLink = page.getByRole('link', { name: 'Sign In' });
    await expect(signInLink).toBeVisible();

    // Act: Click the "Sign In" link
    await signInLink.click();

    // Assertion: Assert that the browser is redirected to the /login page URL after clicking the link.
    await expect(page).toHaveURL(/.*\/login/);

    // Assertion: Assert that the content of the /login page (e.g., the "Sign in with Google" button) is visible.
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  });
}); 