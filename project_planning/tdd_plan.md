# AI Interview Pro MVP - TDD Instrumentation Plan

This document outlines how to apply Test-Driven Development (TDD) principles to the revised MVP phasing plan. The focus is on writing tests *before* implementation and testing at appropriate levels (Unit, Integration, End-to-End) for each phase.

**Recommended Testing Tools:**

*   **Test Runner/Framework:** Jest (Standard for Next.js/React)
*   **React Component Testing:** React Testing Library (`@testing-library/react`)
*   **API Route Testing:** Use `fetch` in test environment or `next-test-api-route-handler` with mocks.
*   **End-to-End (E2E) Testing:** Playwright (Good support for Next.js and realistic browser interaction).
*   **Mocking:** Jest built-in mocks, `msw` (Mock Service Worker) for frontend API mocking, or manual mocking.
*   **Database Testing:** A dedicated test database instance (e.g., using Docker) or mocking the Prisma client in tests. **Recommendation: Use a test database.** Mocking the DB too heavily reduces the value of integration tests.

**TDD Workflow:**

For each small feature or unit within a phase:

1.  **RED:** Write a test that defines the desired behavior and **fails** because the code doesn't exist yet.
2.  **GREEN:** Write the **minimum** amount of code required to make the new test pass.
3.  **REFACTOR:** Improve the code you just wrote and the existing code (e.g., clean up, optimize, simplify) while ensuring all tests remain **green**.

---

## Phase 1 (Revised): Core Backend Logic, AI Validation & Data Persistence - Testing

**Goal:** Rigorously test the core backend logic, especially the interaction with the AI and the persistence of session state. This phase relies heavily on **Unit** and **Integration** tests.

**Testing Focus:**

1.  **Database Models & Basic CRUD:**
    *   **Type:** Integration Tests
    *   **Target:** `prisma/schema.prisma`, `lib/db.ts` (via basic Prisma client operations).
    *   **Instrumentation:** Write tests using your Prisma client instance pointed at a **test database**. Test that you can create, read, update, and delete records for `User`, `MvpJdResumeText`, and `MvpSessionData` models correctly. Verify data types and relationships.
    *   **De-risking:** Ensures your database setup and models are correct and interacting properly with Prisma *before* complex logic is built on top.
    *   **Status: DONE**

2.  **Persona Service:**
    *   **Type:** Unit Tests
    *   **Target:** `lib/personaService.ts`.
    *   **Instrumentation:** Write tests that assert `getPersona('technical-lead')` returns the expected hardcoded persona object with all required fields (id, name, systemPrompt). Assert that requesting an invalid ID returns null or throws an expected error.
    *   **De-risking:** Verifies the service reliably provides the persona data structure needed by other services.
    *   **Status: NOT STARTED**

3.  **AI Logic Helpers (Prompting/Parsing):**
    *   **Type:** Unit Tests
    *   **Target:** `lib/gemini.ts` helper functions (`buildSystemInstruction`, `buildConversationHistory` (as part of `buildPromptContents`), `parseAiResponse`).
    *   **Instrumentation:**
        *   Test `buildSystemInstruction` with sample JD/Resume/Persona data – assert the output string contains expected elements and formatting. **Status: NOT STARTED**
        *   Test `buildPromptContents` (which uses `buildSystemInstruction` and formats history similar to `buildConversationHistory`) with sample session history arrays – assert the output is in the correct format for the Gemini API (`[{ role, parts: [{ text }] }]`). **Status: NOT STARTED (Though `getFirstQuestion` and `continueInterview` tests implicitly cover parts of its usage)**
        *   Test `parseAiResponse` with sample AI raw text strings (using your defined delimiters) – assert the function correctly extracts `nextQuestion`, `analysis`, `feedbackPoints` (as an array), and `suggestedAlternative` into the `MvpAiResponse` structure. Test edge cases (missing delimiters). **Status: DONE (Covered by `tests/parseAIResponse.test.ts`)**
    *   **De-risking:** Isolates the logic that prepares input for and processes output from the AI, which is often complex string manipulation.

4.  **Core AI Interaction Functions (`gemini.ts` main functions):**
    *   **Type:** Unit Tests (with Mocks) & Integration Tests (with Real AI - the spike)
    *   **Target:** `lib/gemini.ts` main functions (`getFirstQuestion`, `continueInterview`).
    *   **Instrumentation (Unit Tests with Mocks):**
        *   Use Jest mocks (`jest.mock('@google/genai')`) to **mock the actual API calls** made by `gemini.ts`.
        *   Mock the `generateContentStream` method to return predefined "fake" AI responses (raw text strings that *match your expected delimiter format*).
        *   Test `getFirstQuestion`: Call the function with sample inputs, assert that the mocked API method was called with the expected prompt, and that the function correctly parses the *mocked* response and returns the extracted question. **Status: DONE (Covered by `tests/gemini-single.test.ts`)**
        *   Test `continueInterview`: Call the function with sample inputs (history, user response), assert that the mocked API method was called with the correct history and prompt (including system instructions), and that the function correctly parses the *mocked* AI response and returns the structured `MvpAiResponse`. **Status: DONE (Covered by `tests/gemini-continueInterview.test.ts`)**
    *   **Instrumentation (Integration Test / Spike):**
        *   Write separate tests or a dedicated test suite that calls `lib/gemini.ts` functions *without mocking the API*.
        *   Use controlled, simple inputs (short JD/Resume, basic history).
        *   **The assertion here is qualitative/plausible, not deterministic.** You can't assert the AI will give *exactly* one answer, but you can assert:
            *   The call doesn't throw an error.
            *   The response structure from `parseAiResponse` is valid (contains keys).
            *   The generated text *appears* to be a question/feedback based on keywords or length (basic checks).
        *   **This validates that the AI client setup is correct and the prompt structure is *likely* working, despite AI non-determinism.** This is the "Spike Test" mentioned previously, formalized as an integration test suite that uses a real API key (use a separate, restricted key for testing if possible).
        *   **Status: NOT STARTED**
    *   **De-risking:** Unit tests confirm your code's logic when dealing with AI inputs/outputs. The Integration/Spike test confirms connectivity and basic prompt viability with the actual AI.

5.  **Session API Route Logic:**
    *   **Type:** Integration Tests
    *   **Target:** `app/api/mvp-sessions/[id]/route.ts` (GET and POST handlers).
    *   **Instrumentation:**
        *   Use a test setup that allows you to make HTTP requests to your API route handlers in isolation (libraries like `next-test-api-route-handler` help, or manually construct request/response objects).
        *   **Mock `lib/gemini.ts` and `lib/personaService.ts` calls** within these API tests. This isolates the API's logic (handling HTTP requests, interacting with the DB) from the AI complexity.
        *   Test the POST handler: Simulate receiving user input. Assert that the API route:
            *   Loads the correct session/JD/Resume from the database.
            *   Calls `personaService.getPersona` with the expected ID.
            *   Calls `gemini.ts.continueInterview` with the correct context (history including user input, persona, JD/Resume).
            *   **Saves the updated session state, including the AI's full structured response (next question, feedback, alternative) returned by the *mocked* `gemini.ts` call, back to the database.**
            *   Returns the correct HTTP status code and response body (the next question text).
        *   Test the GET handler: Simulate a GET request. Assert that it loads the correct session state from the database and returns it.
    *   **De-risking:** Validates the orchestration logic of the API route, ensuring it correctly calls dependencies and manages persistent session state in the database upon receiving user input.
    *   **Status: NOT STARTED**

---

## Phase 2 (Revised): Backend API Completion - Testing

**Goal:** Implement integration tests for the remaining backend APIs that handle JD/Resume text and session creation/reporting.

**Testing Focus:**

1.  **JD/Resume Text API:**
    *   **Type:** Integration Tests
    *   **Target:** `app/api/mvp-jd-resume/route.ts` (GET and POST handlers).
    *   **Instrumentation:**
        *   Use a test database.
        *   Simulate POST requests to save JD/Resume text for a user (use a dummy user ID). Assert the data is saved correctly in the database.
        *   Simulate GET requests. Assert that the API returns the correct text for the given user ID. Test edge cases (user with no saved text).
    *   **De-risking:** Ensures the text saving/loading functionality is reliable.

2.  **Session Creation API:**
    *   **Type:** Integration Tests
    *   **Target:** `app/api/mvp-sessions/route.ts` (POST handler).
    *   **Instrumentation:**
        *   Use a test database.
        *   **Mock `lib/gemini.ts.getFirstQuestion` and `lib/personaService.getPersona` calls.**
        *   Simulate a POST request to create a session (provide necessary user ID).
        *   Assert that the API route:
            *   Retrieves the correct JD/Resume text for the user.
            *   Calls `personaService.getPersona` and `gemini.ts.getFirstQuestion` with the correct inputs.
            *   Creates a new `MvpSessionData` record in the database, linked to the user and JD/Resume text, with initial state and the first question returned by the *mocked* `gemini.ts` call.
            *   Returns the new session ID and the first question.
    *   **De-risking:** Validates the entry point for starting a new session and its initial state setup in the database.

3.  **Report Data API:**
    *   **Type:** Integration Tests
    *   **Target:** `app/api/mvp-sessions/[id]/report/route.ts` (GET handler).
    *   **Instrumentation:**
        *   Use a test database.
        *   Manually set up a `MvpSessionData` record in the test database representing a completed session with history (including saved feedback/alternatives).
        *   Simulate a GET request to the report endpoint with the ID of the pre-configured session.
        *   Assert that the API fetches the correct data and formats it into the structure expected by the frontend `ReportViewer`.
    *   **De-risking:** Confirms the backend can correctly retrieve and format all necessary data for the report.

---

## Phase 3 (Revised): Frontend Interview UI & Reporting - Testing

**Goal:** Test the frontend components and pages that handle the user interface for the interview and reporting. Focus on **Unit** tests for components and **Integration** or **E2E** tests for pages/flows.

**Testing Focus:**

1.  **UI Components:**
    *   **Type:** Unit Tests
    *   **Target:** `TextInterviewUI.tsx`, `ReportViewer.tsx`, `QuestionFeedback.tsx`, `UI/Timer.tsx`.
    *   **Instrumentation:** Use React Testing Library.
        *   Test rendering with different props (e.g., empty history, history with multiple turns, long text, different feedback data).
        *   Test user interactions (e.g., typing in `TextInterviewUI`, clicking buttons). Use mocks (`jest.fn()`) for callback props (like the submit handler). Assert callbacks are called with correct arguments.
        *   Test `UI/Timer.tsx` renders time correctly and updates over time (might require Jest fake timers).
    *   **De-risking:** Ensures individual UI pieces look and behave correctly in isolation.

2.  **Frontend Pages (Interview & Report):**
    *   **Type:** Integration Tests (Page + Mocked APIs) or E2E Tests
    *   **Target:** `app/(protected)/sessions/[id]/page.tsx`, `app/(protected)/sessions/[id]/report/page.tsx`.
    *   **Instrumentation (Integration Tests):**
        *   Use React Testing Library and `msw` (Mock Service Worker) or manual mocks to **mock the backend API endpoints** (`/api/mvp-sessions/[id]`, `/api/mvp-sessions/[id]/report`).
        *   Test `/sessions/[id]/page.tsx`: Mock the initial GET response. Assert the correct component (`TextInterviewUI`) is rendered with the initial data. Simulate user input and mock the subsequent POST API call response. Assert the UI updates correctly with the next question. Test the "End Session" button triggers the mocked API call and redirection.
        *   Test `/sessions/[id]/report/page.tsx`: Mock the GET report API response. Assert the `ReportViewer` component is rendered with the mocked data and displays content correctly. Assert the "Back to Dashboard" link works.
    *   **Instrumentation (E2E Tests - Higher Value but Slower):**
        *   Use Playwright. This tests the *entire* flow: Browser -> Frontend -> Backend API -> Database -> Backend Response -> Frontend Update.
        *   Write scenarios like: Start session -> Type answers -> End session -> View report.
        *   Assert key elements are visible on pages, user interactions work, and navigation is correct. **Mocking external services like Gemini is still recommended here** to make tests faster and deterministic regarding AI content, focusing E2E on the application plumbing.
    *   **De-risking:** Integration tests verify the page logic consuming APIs. E2E tests verify the complete user experience through the application layers. Prioritize integration tests first due to speed/ease, add E2E for critical paths.

---

## Phase 4 (Revised): Dashboard, Basic History & Authentication - Testing

**Goal:** Test user authentication, route protection, and the dashboard functionality using user context. Relies on **Integration** and **E2E** tests.

**Testing Focus:**

1.  **Authentication Middleware & Pages:**
    *   **Type:** Integration Tests (Middleware) & E2E Tests
    *   **Target:** `middleware.ts`, `app/api/auth/...`, `app/login/page.tsx`, protected pages (`/(protected)/...`).
    *   **Instrumentation (Middleware):** Use Next.js middleware testing capabilities. Simulate requests to protected paths with and without a valid session cookie/token. Assert correct redirects (`/login`) occur.
    *   **Instrumentation (E2E):** Use Playwright.
        *   Test accessing a protected page (`/dashboard`) while not logged in – assert redirection to `/login`.
        *   Test the login flow (mocking the actual Google auth provider response). Assert successful login redirects to `/dashboard`.
        *   Test accessing protected pages *after* logging in – assert successful access.
        *   Test logging out and verifying you can no longer access protected pages.
    *   **De-risking:** Ensures your security layer is functional and users are correctly routed based on their authentication status.

2.  **Backend APIs with User Context:**
    *   **Type:** Integration Tests
    *   **Target:** Revisit API tests from Phases 1 & 2 (`app/api/mvp-jd-resume`, `app/api/mvp-sessions/*`).
    *   **Instrumentation:** Modify existing integration tests to include a user ID in the request context (simulating an authenticated request).
        *   Test saving JD/Resume text for `userA`, then saving for `userB`. Assert that retrieving text for `userA` does *not* return `userB`'s text, and vice-versa.
        *   Test creating a session for `userA`, then for `userB`. Assert that listing sessions for `userA` only shows `userA`'s sessions.
        *   Test accessing a session report ID belonging to `userA` while authenticated as `userB`. Assert a forbidden or not found error.
    *   **De-risking:** Guarantees data isolation between users, a critical security requirement.

3.  **Dashboard Functionality:**
    *   **Type:** Integration Tests (Page + Mocked APIs) or E2E Tests
    *   **Target:** `app/(protected)/dashboard/page.tsx`, `MvpJdResumeInputForm.tsx`, `MvpSessionHistoryList.tsx`.
    *   **Instrumentation (Integration Tests):** Use React Testing Library and `msw` to mock the dashboard APIs (`/api/mvp-jd-resume`, `/api/mvp-sessions/list`).
        *   Mock the response for loading existing JD/Resume text and session history. Assert the form is pre-filled correctly and the history list displays the mocked data.
        *   Simulate typing text and clicking "Start Session". Mock the API calls and assert the correct API endpoints are called with the expected data, and the user is redirected.
    *   **Instrumentation (E2E Tests):** Use Playwright.
        *   Test the full dashboard flow: Login -> See dashboard -> Paste text -> Start session -> Complete session -> Return to dashboard -> See new session in history.
        *   Test pasting new text and starting a new session – verify history updates correctly.
    *   **De-risking:** Validates the main entry point and its core features function correctly for an authenticated user, managing their specific data.

---

By following this plan, you will apply TDD across your application layers, ensuring that your core AI logic and data handling are robust (Phase 1 & 2), your frontend accurately reflects the backend state (Phase 3), and your application is secure and user-aware (Phase 4). Remember to commit to the Red-Green-Refactor cycle for each small piece of functionality you add within these phases.