# TDD Methodology for Interviewer-Pro

This document provides a comprehensive guide to Test-Driven Development (TDD) for the Interviewer-Pro project, covering methodology, technical setup, and implementation strategies for both backend and frontend development.

**⚠️ ARCHITECTURAL CORRECTION NOTICE:**
This document was originally written assuming REST API patterns with MSW for mocking, but the codebase is actually built with **tRPC for type-safe, end-to-end APIs**. All testing patterns have been corrected to reflect tRPC testing strategies that properly mock tRPC procedures instead of HTTP requests.

## Table of Contents
1. [TDD Philosophy & Methodology](#1-tdd-philosophy--methodology)
2. [When to Use Real Services vs Mocking](#2-when-to-use-real-services-vs-mocking)
3. [Jest Setup & Configuration](#3-jest-setup--configuration)
4. [Backend Testing (tRPC Routers)](#4-backend-testing-trpc-routers)
5. [UI Testing: Playwright E2E and Component Isolation](#5-ui-testing-playwright-e2e-and-component-isolation)
6. [Integration & End-to-End (E2E) Testing](#6-integration--end-to-end-e2e-testing)
7. [TDD Implementation by Development Phase](#7-tdd-implementation-by-development-phase)
8. [Troubleshooting & Best Practices](#8-troubleshooting--best-practices)

---

## 1. TDD Philosophy & Methodology

### Core TDD Workflow: RED-GREEN-REFACTOR

For each specific implementation task:

1. **🔴 RED:** Write a test that describes the desired behavior. This test should **fail** because the code doesn't exist or isn't complete.
2. **🟢 GREEN:** Write the **minimum** amount of code necessary to make the *new* test pass. Focus only on the current test requirement.
3. **🔵 REFACTOR:** Improve the code you just wrote and the existing codebase. Clean up, simplify, optimize, improve readability, ensuring all tests (including previously passing ones) remain **green**.

### When to Use TDD

**TDD is Most Effective For:**
- Complex business logic (tRPC procedures, data transformations)
- Critical user flows (authentication, data persistence)
- Component interactions and state management
- Error handling and edge cases

**TDD May Be Overkill For:**
- Simple UI components with minimal logic
- Static content pages
- Basic styling and layout adjustments

### Testing Pyramid for Interviewer-Pro (Updated)

Our testing pyramid has evolved to prioritize E2E testing for the frontend.

```
    /\     E2E Tests (Playwright)
   /  \    - Covers all frontend user flows
  /____\   - Login → Interview → Report

 /      \  Unit Tests (Jest)
/        \ - Backend: tRPC procedures, utils
\________/ - Frontend: Isolated, stateless components

```
**Note:** The "Integration Test" layer has been merged into E2E Tests for frontend development. We favor comprehensive E2E tests with a real database over mocked integration tests for UI components.

---

## 2. When to Use Real Services vs Mocking

### 🎯 Testing Strategy Decision Matrix

Based on practical experience with integration testing, here's when to use real services versus mocking:

#### ✅ Use Real Services When:

**1. Playwright E2E Tests**
```typescript
// ✅ GOOD: Real database, real server, real user interactions
test('should complete full workflow', async ({ page }) => {
  // Real browser actions
  await page.goto('/login');
  await page.fill('input[name="email"]', 'user@test.com');
  await page.click('button:text("Sign In")');

  // Real navigation and interaction
  await page.click('a:text("New Session")');
  // ... continues until report is viewed
});
```
**Benefits:**
- Highest confidence: Tests the actual user experience.
- Catches integration issues across the entire stack (UI, API, DB).
- Resilient to refactoring of implementation details.

**2. Backend Unit/Integration Tests against a Database**
```typescript
// ✅ GOOD: Test tRPC procedures against a real test database
it('should save QuestionSegments correctly', async () => {
  const session = await db.sessionData.create({
    data: { ... }
  });
  // Real Prisma operations verify schema and logic correctness.
});
```

#### 🎭 Use Mocking When:

**1. Backend Unit Tests (Isolating Logic)**
```typescript
// ✅ GOOD: Mock external dependencies (e.g., AI service) for backend unit tests
jest.mock('~/lib/gemini');
const mockGetFirstQuestion = jest.mocked(getFirstQuestion);

it('should call the AI service with correct parameters', () => {
  // Arrange
  mockGetFirstQuestion.mockResolvedValue('Mocked question');
  // Act
  // ... call procedure
  // Assert
  expect(mockGetFirstQuestion).toHaveBeenCalled();
});
```

**2. Testing Specific Error Scenarios**
```typescript
// ✅ GOOD: Mock to test error handling
it('should handle AI service failures gracefully', async () => {
  mockGetFirstQuestion.mockRejectedValue(new Error('API timeout'));
  await expect(startInterview()).rejects.toThrow('AI service unavailable');
});
```

**3. Isolated Frontend Component Unit Tests**
```typescript
// ✅ GOOD: For a simple, stateless component, props can be mocked.
it('renders a button with a label', () => {
    render(<Button label="Click Me" />);
    expect(screen.getByRole('button', {name: /click me/i})).toBeInTheDocument();
});
```
---

## 3. Jest Setup & Configuration

Jest is configured for two distinct environments:
- **Backend:** `jest.config.backend.js` using the Node.js environment.
- **Frontend:** `jest.config.frontend.js` using the JSDOM environment (for isolated component tests only).

Key scripts in `package.json`:
- `test:backend`: Runs tests for tRPC routers and server-side logic.
- `test:frontend`: Runs unit tests for isolated UI components.

---

## 4. Backend Testing (tRPC Routers)

Backend testing remains a critical part of our TDD process, focusing on the correctness of our tRPC procedures.

### Testing Philosophy
- **Use a real test database.** This is the most significant lesson learned; it validates our Prisma schema and ensures queries/mutations work as expected.
- **Mock at the boundaries.** We mock external services (like the Gemini API) and the authentication session to isolate our procedure's logic.

### Successfully Implemented Pattern: `getTestCaller`

We use a test helper (`getTestCaller`) that creates a tRPC caller instance with a mocked session.

```typescript
// tests/server/routers/example.test.ts
import { getTestCaller, testUser, testJdResume } from '~/server/api/routers/test-helpers';
import { db } from '~/server/db';
import { getFirstQuestion } from '~/lib/gemini';

// Mock external dependencies
jest.mock('~/lib/gemini');
const mockGetFirstQuestion = jest.mocked(getFirstQuestion);

describe('session router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up test data from the real database
    await db.sessionData.deleteMany({ where: { ... } });
  });

  it('should create a session and call the AI service', async () => {
    // Arrange
    mockGetFirstQuestion.mockResolvedValue('What is your greatest strength?');
    const caller = await getTestCaller();
    
    // Act
    const result = await caller.session.createSession({
      jdText: testJdResume.jdText,
      resumeText: testJdResume.resumeText,
    });
    
    // Assert
    expect(result).toHaveProperty('sessionId');
    expect(mockGetFirstQuestion).toHaveBeenCalled();
    
    // Verify database state
    const sessionInDb = await db.sessionData.findUnique({ where: { id: result.sessionId } });
    expect(sessionInDb).not.toBeNull();
  });
});
```
---

## 5. UI Testing: Playwright E2E and Component Isolation

Our primary strategy for testing UI components, especially those with backend data dependencies, has shifted from Jest/React Testing Library (RTL) to **Playwright End-to-End (E2E) tests**.

### 🏛️ Architectural Decision: Playwright over Jest for Integrated Components

Based on practical experience during development, we have found that writing Jest/RTL tests for components that use tRPC hooks is **brittle, complex, and provides low-confidence assurance**. The key challenges encountered were:
- **Complex Mocking:** Mocking tRPC hooks and their various states (loading, data, error) is verbose and prone to implementation-detail coupling.
- **Environment Issues:** Running tests in a JSDOM environment led to numerous configuration hurdles and missing browser APIs (`TextEncoder`, `fetch`, etc.).
- **Low Confidence:** Mocked tests verify that the component *can* render data if the hook provides it, but they do not verify that the hook, the tRPC procedure, the database schema, and the component are all correctly integrated.

**Therefore, the official strategy is:**
1.  **For components with backend dependencies (tRPC queries/mutations):** Test them using **Playwright E2E tests** that run against a real, seeded database. This is the standard.
2.  **For purely presentational/isolated components (no hooks):** Jest and RTL remain a viable option for testing visual states and simple interactions in isolation.

### TDD Workflow for UI with Playwright

**🔴 RED Phase:**
1.  Create a new `*.test.ts` file in `tests/e2e`.
2.  Write a Playwright test describing a user flow for a new feature.
3.  Run `npm run test:e2e`. The test **fails** because the UI elements or routes don't exist.

**🟢 GREEN Phase:**
1.  Implement the minimum React components, pages, and API routes required to make the Playwright test pass.
2.  Focus on making the E2E scenario work.

**🔵 REFACTOR Phase:**
1.  Clean up the React code (styling, component extraction).
2.  Refactor backend logic if necessary.
3.  Ensure all Playwright tests remain green.

### Unit Testing for Isolated Components (When Applicable)

For simple, stateless components without tRPC hooks, Jest/RTL can still be used.

```typescript
// tests/frontend/components/UI/Button.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '~/components/UI/Button'; // A simple component

describe('Button', () => {
  it('should render and handle clicks', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    
    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```
---

## 6. Integration & End-to-End (E2E) Testing

Our integration and E2E testing strategy is unified under **Playwright**. This approach provides the highest confidence by testing the full application stack, from the frontend rendering in a real browser to the backend logic and database operations.

### Core Philosophy: Test Real User Flows

We test the application just as a user would. This means our tests perform actions like:
- Logging in.
- Navigating between pages.
- Filling out forms.
- Clicking buttons.
- Verifying that the UI updates correctly in response to these actions.

### The E2E Testing Stack

1.  **Playwright:** The test runner and browser automation framework.
2.  **Live Dev Server:** Tests run against a `next dev` server instance.
3.  **Real Database:** A separate test database is used, which is programmatically seeded before tests run.
4.  **`globalSetup`:** A critical script (`tests/e2e/global-setup.ts`) that runs once before all tests to prepare the environment.

### The `globalSetup` Pattern

To ensure our tests are reliable and deterministic, we use a `globalSetup` file with the following responsibilities:

1.  **Authenticate a Test User:** It programmatically logs in a test user and saves the authentication state (cookies, local storage) to a file. The tests then load this state to start in a logged-in context.
2.  **Seed the Database:** It connects directly to the test database (`prisma`) to delete any pre-existing test data and create a consistent set of records (users, sessions, etc.) for the tests to run against. This avoids test pollution and ensures a predictable starting state.

#### Example `global-setup.ts` and Test

```typescript
// tests/e2e/global-setup.ts
import { chromium, type FullConfig } from '@playwright/test';
import { prisma } from '~/server/db';

export const TEST_USER_EMAIL = 'test-user@example.com';
export const TEST_SESSION_ID = 'cl-test-session-123';

async function globalSetup(config: FullConfig) {
  // 1. Authenticate and save state
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login'); 
  await page.getByLabel('Email').fill(TEST_USER_EMAIL);
  await page.getByRole('button', { name: 'Sign in with Email' }).click();
  await page.waitForURL('**/dashboard');
  
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });

  // 2. Seed the database
  await prisma.user.deleteMany({ where: { email: TEST_USER_EMAIL } });
  const user = await prisma.user.create({ data: { id: 'test-user-id-123', email: TEST_USER_EMAIL } });
  await prisma.sessionData.create({ data: { id: TEST_SESSION_ID, userId: user.id, ... } });

  await browser.close();
}
export default globalSetup;

// tests/e2e/report-page.test.ts
import { test, expect } from '@playwright/test';
import { TEST_SESSION_ID } from './global-setup';

test.describe('Session Report Page', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('should display the overall assessment', async ({ page }) => {
    await page.goto(`/sessions/${TEST_SESSION_ID}/report`);
    await expect(page.getByRole('heading', { name: 'Overall Assessment' })).toBeVisible();
    await expect(page.getByText('Recommendation: Strong Hire')).toBeVisible();
  });
});
```

### Running E2E Tests

1.  **Start the dev server:** `npm run dev`
2.  **Run the tests:** `npm run test:e2e`

---

## 7. TDD Implementation by Development Phase

This section outlines the TDD process for different types of features.

### Feature: New tRPC Procedure

1.  **🔴 RED:** In `tests/server/routers/`, add a new test for the procedure. Assert its output and any database side-effects. Test fails as procedure doesn't exist.
2.  **🟢 GREEN:** In `src/server/api/routers/`, create the procedure. Write minimal code to pass the test.
3.  **🔵 REFACTOR:** Clean up the procedure logic.

### Feature: New UI Component with Backend Data

1.  **🔴 RED:** In `tests/e2e/`, write a Playwright test for the new user story. Test fails as routes/pages don't exist.
2.  **🟢 GREEN:**
    - Create the necessary page/component in `src/app`.
    - If needed, create new tRPC procedures (following the backend TDD flow first).
    - Add UI elements until the Playwright test passes.
3.  **🔵 REFACTOR:**
    - Improve component styling and structure.
    - Extract reusable components.
    - Add comments and ensure code clarity.

---

## 8. Troubleshooting & Best Practices

- **Slow E2E Tests:** Use Playwright's UI mode (`npx playwright test --ui`) to debug tests step-by-step.
- **Flaky Tests:** Ensure your `globalSetup` script is fully idempotent, meaning it correctly cleans up and resets state every single time it's run.
- **Database Errors in Tests:** Ensure your test database schema is synced with `schema.prisma`. Run `npx prisma db push --schema=./prisma/schema.prisma` if you see discrepancies.
- **Authentication:** The `E2E_TESTING=true` environment variable must be set for the dev server to enable the test authentication flow used by `globalSetup`.

``` 