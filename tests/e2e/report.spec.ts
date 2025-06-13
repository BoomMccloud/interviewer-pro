import { test, expect } from '@playwright/test';

test.describe('Interview Report E2E Tests', () => {
  // This is a hardcoded session ID that the global setup script uses to seed the DB.
  const E2E_SESSION_ID = 'clxnt1o60000008l3f9j6g9z7';
  const REPORT_ROUTE = `/sessions/${E2E_SESSION_ID}/report`;

  // The database is now seeded by the global-setup.ts file before any tests run.

  // Since the auth tests confirm that logged-in users can access protected routes,
  // these tests focus solely on the content of the report page itself.
  // The server's mock authentication (when E2E_TESTING=true) handles the login part.
  test('should display all elements of the overall assessment', async ({ page }) => {
    // Act: Navigate to the report page for our specific E2E session
    await page.goto(REPORT_ROUTE);

    // Assert: Check that the main heading is visible
    await expect(page.getByRole('heading', { name: 'Interview Report' })).toBeVisible();

    // Assert: Check for the presence of the Overall Assessment section and its key components
    await expect(page.getByRole('heading', { name: 'Overall Assessment' })).toBeVisible();
    
    // Check for specific, static text that the seeded data should contain
    await expect(page.getByText('This is a summary of the interview for our E2E test.')).toBeVisible();
    
    // Check for the "Strengths" section and one of its items
    await expect(page.getByRole('heading', { name: 'Strengths' })).toBeVisible();
    await expect(page.getByText('Excellent problem-solving skills demonstrated.')).toBeVisible();

    // Check for the "Areas for Improvement" section and one of its items
    await expect(page.getByRole('heading', { name: 'Areas for Improvement' })).toBeVisible();
    await expect(page.getByText('Could be more concise in explanations.')).toBeVisible();

    // Check for the score
    await expect(page.getByText('Overall Score')).toBeVisible();
    await expect(page.getByText('8/10')).toBeVisible();

    // Check for persona and duration
    await expect(page.getByText('Standard Software Engineering Interviewer')).toBeVisible();
    await expect(page.getByText('10 minutes')).toBeVisible();
  });

  test('should display feedback sections for each question', async ({ page }) => {
    // Act: Navigate to the report page
    await page.goto(REPORT_ROUTE);

    // Assert: Check for the first question's feedback section
    const question1Section = page.getByTestId('question-feedback-section-q1_opening');
    await expect(question1Section).toBeVisible();
    await expect(question1Section.getByRole('heading', { name: 'Question 1: Initial question' })).toBeVisible();
    
    // Check for the second question's feedback section
    const question2Section = page.getByTestId('question-feedback-section-q2_technical');
    await expect(question2Section).toBeVisible();
    await expect(question2Section.getByRole('heading', { name: 'Question 2: Technical question' })).toBeVisible();
  });
}); 