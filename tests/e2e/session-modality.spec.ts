/**
 * @fileoverview E2E tests for session modality switching.
 * 
 * This test suite verifies that the correct UI component (Text or Voice)
 * is rendered based on the URL query parameter `modality`. It relies on the
 * global setup to seed a test session and the custom test auth utility
 * to
 * provide a mock authenticated session.
 */
import { test, expect } from '@playwright/test';

// The ID of the session seeded in the global setup script.
const TEST_SESSION_ID = 'clxnt1o60000008l3f9j6g9z7';

test.describe('Session Page Modality Switching', () => {
  // This setup is not strictly necessary due to the server-side auth bypass,
  // but it's good practice to keep for potential future auth strategies.
  // It ensures tests use a clean context.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should correctly render the TextInterviewUI by default', async ({ page }) => {
    await page.goto(`/sessions/${TEST_SESSION_ID}`);
    // A robust selector targeting the specific component for the text-based interview.
    await expect(page.getByTestId('text-interview-ui')).toBeVisible();
  });

  test('should correctly render the VoiceInterviewUI when modality=voice is in the URL', async ({ page }) => {
    await page.goto(`/sessions/${TEST_SESSION_ID}?modality=voice`);
    // A robust selector targeting the specific component for the voice-based interview.
    await expect(page.getByTestId('voice-interview-ui')).toBeVisible();
  });
}); 