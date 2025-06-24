/**
 * 🔴 RED: End-to-end test for pre-generated questions user flow
 * 
 * FILES UNDER TEST:
 * - src/app/(protected)/sessions/[id]/page.tsx (MODIFY: session page with progress UI)
 * - src/components/Sessions/InterviewUI/TextInterviewUI.tsx (MODIFY: progress indicators, button text)
 * - src/components/Sessions/InterviewUI/LiveVoiceInterviewUI.tsx (MODIFY: progress indicators)
 * - src/server/api/routers/session.ts (MODIFY: startInterviewSession, ADD: moveToNextQuestion)
 * - src/lib/gemini.ts (ADD: generateAllInterviewQuestions function)
 * 
 * PURPOSE: Test the complete user experience with pre-generated questions.
 * Verifies that users can see progress indicators, navigate between questions
 * instantly, and complete the full 3-question interview flow.
 * 
 * Following project pattern: Playwright + seeded database + server-side auth bypass
 */
import { test, expect } from '@playwright/test';

// Import test constants - may need to be created if they don't exist
let E2E_SESSION_ID: string;
let E2E_USER_ID: string;

try {
  const globalSetup = require('./global-setup');
  E2E_SESSION_ID = globalSetup.E2E_SESSION_ID;
  E2E_USER_ID = globalSetup.E2E_USER_ID;
} catch {
  // Fallback constants if global-setup doesn't exist yet
  E2E_SESSION_ID = 'clxnt1o60000008l3f9j6g9z7';
  E2E_USER_ID = 'e2e-test-user-id-123';
}

test.describe('🔴 RED: Pre-generated Questions User Flow', () => {
  
  test('should complete full interview with instant question transitions', async ({ page }) => {
    // 🔴 This test WILL FAIL - UI doesn't support pre-generated flow yet
    // Testing: Complete user journey across all frontend and backend files
    
    // Navigate to session (auth handled by server-side bypass when E2E_TESTING=true)
    await page.goto(`/sessions/${E2E_SESSION_ID}`);
    
    // Verify session page loads with progress indicator
    await expect(page.getByRole('heading', { name: /interview session/i })).toBeVisible();
    
    // 🔴 WILL FAIL: Progress indicator doesn't exist yet
    // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - progress UI
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
    
    // Verify first question is displayed (from pre-generated batch)
    await expect(page.getByText(/tell me about your.*react.*experience/i)).toBeVisible();
    
    // Answer first question
    const responseInput = page.locator('textarea[data-testid="user-response-input"]');
    await responseInput.fill('I have 3 years of React experience with hooks, functional components, and state management. I\'ve worked on large-scale applications using Redux and Context API.');
    
    // Submit response
    await page.click('button:text("Submit Response")');
    
    // Wait for AI follow-up to appear (existing conversation flow should still work)
    await expect(page.getByText(/that.*sounds.*great|interesting|tell.*more/i)).toBeVisible({ timeout: 10000 });
    
    // 🔴 WILL FAIL: Button text change doesn't exist yet
    // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - button text change
    await expect(page.getByRole('button', { name: /next question/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /get next topic/i })).not.toBeVisible();
    
    // Move to next question - should be INSTANT (no loading spinner)
    await page.click('button:text("Next Question")');
    
    // 🔴 WILL FAIL: Instant navigation doesn't exist yet
    // Testing: src/server/api/routers/session.ts - moveToNextQuestion procedure
    
    // Verify NO loading state appears (instant transition)
    await expect(page.locator('.loading-spinner, [data-testid="loading"]')).not.toBeVisible();
    
    // Verify instant navigation to question 2
    await expect(page.getByText('Question 2 of 3')).toBeVisible();
    await expect(page.getByText(/how.*do.*you.*handle.*complex.*state/i)).toBeVisible();
    
    // Answer second question
    await responseInput.fill('I use Redux for global state management in complex applications. For simpler cases, I prefer Context API with useReducer. I also implement state normalization patterns for complex data structures.');
    await page.click('button:text("Submit Response")');
    
    // Wait for follow-up
    await expect(page.getByText(/redux.*context/i)).toBeVisible({ timeout: 10000 });
    
    // Move to final question
    await page.click('button:text("Next Question")');
    
    // Verify question 3
    await expect(page.getByText('Question 3 of 3')).toBeVisible();
    await expect(page.getByText(/describe.*challenging.*technical.*problem/i)).toBeVisible();
    
    // Answer final question
    await responseInput.fill('I led a team migration from a legacy jQuery application to React. The main challenge was maintaining functionality while gradually replacing components. I implemented a micro-frontend approach with incremental migration strategy.');
    await page.click('button:text("Submit Response")');
    
    // Wait for final follow-up
    await expect(page.getByText(/migration.*strategy/i)).toBeVisible({ timeout: 10000 });
    
    // Try to move to "next question" - should complete interview
    await page.click('button:text("Next Question")');
    
    // 🔴 WILL FAIL: Interview completion UI doesn't exist yet
    // Testing: src/server/api/routers/session.ts - interview completion logic
    await expect(page.getByText('Interview completed!')).toBeVisible();
    await expect(page.getByText('You have successfully answered 3 questions')).toBeVisible();
    
    // Verify navigation to report or completion state
    await expect(page.getByRole('link', { name: /view report|see results/i })).toBeVisible();
  });

  test('should show progress indicator throughout interview', async ({ page }) => {
    // 🔴 This test WILL FAIL - progress indicator UI doesn't exist yet
    // Testing: src/components/Sessions/InterviewUI/TextInterviewUI.tsx - progress tracking
    
    await page.goto(`/sessions/${E2E_SESSION_ID}`);
    
    // Check progress indicator on each question
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
    
    // Quick progression through questions to test progress updates
    await page.fill('textarea[data-testid="user-response-input"]', 'Quick answer 1');
    await page.click('button:text("Submit Response")');
    
    // Wait for AI response then move to next
    await page.waitForTimeout(2000); // Allow for AI response
    await page.click('button:text("Next Question")');
    
    await expect(page.getByText('Question 2 of 3')).toBeVisible();
    
    // Quick answer and move to next
    await page.fill('textarea[data-testid="user-response-input"]', 'Quick answer 2');
    await page.click('button:text("Submit Response")');
    await page.waitForTimeout(2000);
    await page.click('button:text("Next Question")');
    
    await expect(page.getByText('Question 3 of 3')).toBeVisible();
    
    // Complete final question
    await page.fill('textarea[data-testid="user-response-input"]', 'Quick answer 3');
    await page.click('button:text("Submit Response")');
    await page.waitForTimeout(2000);
    await page.click('button:text("Next Question")');
    
    // Should reach completion
    await expect(page.getByText('Interview completed!')).toBeVisible();
  });

  test('should handle voice interview mode with progress indicators', async ({ page }) => {
    // 🔴 This test WILL FAIL - voice UI progress indicators don't exist yet
    // Testing: src/components/Sessions/InterviewUI/LiveVoiceInterviewUI.tsx - progress in voice mode
    
    await page.goto(`/sessions/${E2E_SESSION_ID}`);
    
    // Switch to voice mode (if toggle exists)
    const voiceToggle = page.locator('button:text("Voice Mode"), [data-testid="voice-toggle"]');
    if (await voiceToggle.isVisible()) {
      await voiceToggle.click();
      
      // Should still show progress in voice mode
      await expect(page.getByText('Question 1 of 3')).toBeVisible();
      
      // Voice-specific elements should be present with progress
      await expect(page.getByText(/speak your answer|start recording/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /next question/i })).toBeVisible();
    } else {
      // Skip test if voice mode not available
      test.skip(true, 'Voice mode not available in current implementation');
    }
  });

  test('should maintain session state during page refresh', async ({ page }) => {
    // 🔴 This test WILL FAIL - session persistence with pre-generated questions doesn't exist yet
    // Testing: Session state persistence across page reloads
    
    await page.goto(`/sessions/${E2E_SESSION_ID}`);
    
    // Progress to question 2
    await page.fill('textarea[data-testid="user-response-input"]', 'First answer');
    await page.click('button:text("Submit Response")');
    await page.waitForTimeout(2000);
    await page.click('button:text("Next Question")');
    
    // Verify on question 2
    await expect(page.getByText('Question 2 of 3')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Should maintain position on question 2
    await expect(page.getByText('Question 2 of 3')).toBeVisible();
    await expect(page.getByText(/how.*do.*you.*handle.*complex.*state/i)).toBeVisible();
    
    // Should still be able to continue
    await page.fill('textarea[data-testid="user-response-input"]', 'Second answer after refresh');
    await page.click('button:text("Submit Response")');
    
    // Should work normally
    await expect(page.getByText(/redux|context|state/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show appropriate error states for incomplete sessions', async ({ page }) => {
    // 🔴 This test WILL FAIL - error handling UI doesn't exist yet
    // Testing: Error handling when pre-generated questions are missing or corrupted
    
    // Navigate to a session that might have incomplete data
    // This test may need a specially seeded broken session
    await page.goto(`/sessions/incomplete-session-id`);
    
    // Should show appropriate error message
    await expect(page.getByText(/session.*not.*found|unable.*to.*load|error.*loading/i)).toBeVisible();
    
    // Should provide recovery options
    await expect(page.getByRole('link', { name: /back.*to.*dashboard|start.*new.*session/i })).toBeVisible();
  });

  test('should handle network errors gracefully during question transitions', async ({ page }) => {
    // 🔴 This test WILL FAIL - network error handling doesn't exist yet
    // Testing: Offline/network error scenarios
    
    await page.goto(`/sessions/${E2E_SESSION_ID}`);
    
    // Answer first question
    await page.fill('textarea[data-testid="user-response-input"]', 'Network test answer');
    await page.click('button:text("Submit Response")');
    await page.waitForTimeout(2000);
    
    // Simulate network failure during transition
    await page.context().setOffline(true);
    
    await page.click('button:text("Next Question")');
    
    // Should show appropriate error message
    await expect(page.getByText(/network.*error|connection.*failed|offline/i)).toBeVisible();
    
    // Restore network
    await page.context().setOffline(false);
    
    // Should be able to retry
    const retryButton = page.getByRole('button', { name: /retry|try.*again/i });
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await expect(page.getByText('Question 2 of 3')).toBeVisible();
    }
  });
}); 