# AI Interview Pro MVP - TDD Frontend Development Plan

This document integrates Test-Driven Development (TDD) principles into the Revised Frontend Staging Plan. For each phase and key task, we define the type of test(s) to be written *first*, ensuring that tests drive the development process and validate functionality iteratively.

**⚠️ ARCHITECTURAL CORRECTION NOTICE:**
This document was originally written assuming REST API patterns with MSW for mocking, but the codebase is actually built with **tRPC for type-safe, end-to-end APIs**. The testing patterns described below have been corrected to reflect tRPC testing strategies that properly mock tRPC procedures instead of HTTP requests.

**Testing Tools:**

*   **Test Runner/Framework:** Jest
*   **React Component Testing:** React Testing Library (`@testing-library/react`)
*   **tRPC Mocking:** Direct mocking of tRPC procedures using Jest mocks instead of MSW
*   **End-to-End (E2E) Testing:** Playwright (Optional but recommended for critical flows)
*   **Mocking:** Jest built-in mocks for tRPC hooks and procedures

**TDD Workflow:**

For each specific implementation task:

1.  **RED:** Write a test (Unit, Component, Integration, E2E) that describes the desired behavior. This test should **fail** because the code doesn't exist or isn't complete.
2.  **GREEN:** Write the **minimum** amount of code necessary to make the *new* test pass. Focus only on the current test requirement.
3.  **REFACTOR:** Improve the code you just wrote and the existing codebase. Clean up, simplify, optimize, improve readability, ensuring all tests (including previously passing ones) remain **green**.

---

## Phase 0: Foundation - Styling, Authentication Infrastructure, tRPC Pattern - TDD

*   **Goal:** Establish testable infrastructure for styling, security, and backend communication using tRPC.
*   **TDD Focus:** Unit tests for utilities and basic components, Integration tests for authentication middleware and tRPC hook mocking patterns.

*   **Tasks & TDD Steps:**

    1.  **Styling Setup & Basic UI Components (`src/components/UI/`):**
        *   **TDD:** [x] Write **Component Tests** using React Testing Library for `Button.tsx`, `Input.tsx`, `Spinner.tsx`, `Timer.tsx`. (Completed)
            *   [x] *For Button:* Test rendering children, asserting the correct HTML tag, testing the `onClick` prop is called when clicked. (RED -> GREEN -> REFACTOR) (Completed)
            *   [x] *For Input:* Test rendering with different props (`placeholder`, `value`), testing `onChange` prop is called on input change. (RED -> GREEN -> REFACTOR) (Completed)
            *   [x] *For Timer:* Test rendering the time format correctly, testing basic countdown logic (using Jest fake timers). (RED -> GREEN -> REFACTOR) (Completed)
            *   [x] *For Spinner:* Test rendering, potentially different sizes/styles via props. (RED -> GREEN -> REFACTOR) (Completed)
        *   *Implementation:* [x] Write the component code based on the tests. (Completed)

    2.  **Authentication Setup (`lib/auth.ts`, `app/api/auth/...`, `middleware.ts`, `login/page.tsx`, `app/page.tsx`, `app/(protected)/layout.tsx`):**
        *   **TDD:**
            *   [x] Write **Integration Tests** for `middleware.ts`. Simulate incoming requests to `/(protected)/dashboard` with and without a mock session token/cookie. Assert that the middleware redirects correctly to `/login` when not authenticated and allows access when authenticated. (RED -> GREEN -> REFACTOR) (Completed)
            *   [x] Write **Component Test** for `GoogleSignInButton.tsx`. Assert the button renders and clicking it calls `signIn` from `next-auth/react` (mock `signIn`). (RED -> GREEN -> REFACTOR) (Completed)
            *   [x] Write **Integration Test** (or simple function test) for `app/page.tsx`. Mock `useSession` to return authenticated/unauthenticated states. Assert the page redirects correctly (mock `next/navigation.router.push`). (RED -> GREEN -> REFACTOR) (Completed)
            *   [x] (Less critical for MVP, but good practice) Write **Unit Tests** for `lib/auth.ts` configuration details if any complex logic exists there (e.g., callbacks). (Completed)
        *   *Implementation:* [x] Implement the NextAuth configuration, middleware, login page, and layout files based on the tests. (Completed)

    3.  **tRPC Integration Pattern (`src/utils/api.ts`, tRPC hook testing setup):**
        *   **TDD:**
            *   [x] Set up tRPC testing patterns by creating mock implementations of tRPC hooks. Example: `jest.mock('~/utils/api', () => ({ useGetJdResumeText: jest.fn(), useSaveJdResumeText: jest.fn() }));` (Completed)
            *   [x] Write **Unit Tests** for `utils/api.ts` hook exports to ensure they properly export the tRPC hooks. (Completed)
            *   [x] Establish testing patterns for mocking tRPC hooks in component tests:
                *   Mock successful data responses: `mockUseGetJdResumeText.mockReturnValue({ data: mockData, isLoading: false, error: null });`
                *   Mock loading states: `mockUseGetJdResumeText.mockReturnValue({ data: null, isLoading: true, error: null });`
                *   Mock error states: `mockUseGetJdResumeText.mockReturnValue({ data: null, isLoading: false, error: mockError });`
                *   Mock mutation hooks: `mockUseSaveJdResumeText.mockReturnValue({ mutate: jest.fn(), isPending: false });` (Completed)
        *   *Implementation:* [x] Write the `utils/api.ts` hook exports based on the tests. (Completed)

---

## Phase 1: Dashboard & Core Data Integration (tRPC Specific) - TDD

*   **Goal:** Build and test the dashboard UI, verifying its interaction with the user and integration with mocked tRPC hooks.
*   **TDD Focus:** Integration Tests using mocked tRPC hooks and React Testing Library to interact with components and assert UI changes based on hook responses.

*   **Tasks & TDD Steps:**

    1.  **Dashboard Page & Components (`app/(protected)/dashboard/page.tsx`, `MvpJdResumeInputForm.tsx`, `MvpSessionHistoryList.tsx`):**
        *   **TDD:** Write **Integration Tests** using mocked tRPC hooks and React Testing Library for `app/(protected)/dashboard/page.tsx`.
            *   *Loading State Test:* Mock `useGetJdResumeText` and `useListSessionsForCurrentText` hooks to return loading states. Render the Dashboard page. Assert that loading indicators (`Spinner.tsx`) are visible initially. (RED -> GREEN -> REFACTOR)
            *   *Loaded State Test:* Mock the hooks to return sample JD/Resume text and session history data. Render the Dashboard page. Assert that the `MvpJdResumeInputForm` is pre-filled with the mocked text and `MvpSessionHistoryList` displays the correct session items. (RED -> GREEN -> REFACTOR)
            *   *Saving Text Test:* Mock the `useSaveJdResumeText` mutation hook. Render the Dashboard page. Type text into the input fields. Trigger the save action. Assert that the mutation `mutate` function was called with the correct data. Assert UI state changes (e.g., button disabled, "Saving..." text). (RED -> GREEN -> REFACTOR)
            *   *Start Session Test:* Mock the `useCreateSession` mutation hook. Mock `next/navigation.router.push`. Render the Dashboard page. Ensure text fields have data. Click the "Start Session" button. Assert that the mutation `mutate` function was called. Assert that navigation occurs upon success. (RED -> GREEN -> REFACTOR)
            *   *History Link Test:* Mock `useListSessionsForCurrentText` to return sessions. Mock `next/navigation.router.push`. Render the Dashboard page. Click on a session item link. Assert navigation was called with the correct path. (RED -> GREEN -> REFACTOR)
            *   *Empty History Test:* Mock `useListSessionsForCurrentText` to return an empty array. Assert that the "No sessions yet" empty state message is displayed. (RED -> GREEN -> REFACTOR)
            *   *Error State Test:* Mock hooks to return error states. Assert that error messages are displayed and retry functionality works. (RED -> GREEN -> REFACTOR)
        *   *Implementation:* Implement `app/(protected)/dashboard/page.tsx`, `MvpJdResumeInputForm.tsx`, and `MvpSessionHistoryList.tsx` based on the tests, using the tRPC hooks from `utils/api.ts`.

---

## Phase 2: Interview Simulation UI & tRPC Integration - TDD

*   **Goal:** Build and test the text-based interview UI, verifying its dynamic behavior and integration with tRPC session procedures via user interaction.
*   **TDD Focus:** Component Tests for the UI pieces, Integration Tests using mocked tRPC hooks and React Testing Library to simulate user input and assert dynamic UI updates.

*   **Tasks & TDD Steps:**

    1.  **Interview Simulation Page & Components (`app/(protected)/sessions/[id]/page.tsx`, `TextInterviewUI.tsx`):**
        *   **TDD:**
            *   Write **Unit Test** for `TextInterviewUI.tsx`. Test rendering different chat history arrays, current question prop, input field interactions, and form submission callbacks. (RED -> GREEN -> REFACTOR)
            *   Write **Integration Test** for `app/(protected)/sessions/[id]/page.tsx`. Use mocked tRPC hooks.
            *   *Initial Load Test:* Mock the `useGetSessionById` hook to return session data with first question. Render the page. Assert the `TextInterviewUI` component renders correctly with the session data. (RED -> GREEN -> REFACTOR)
            *   *Dynamic Turn Test:* Mock the `useSubmitAnswerToSession` mutation hook. Render the page. Simulate typing a response and submitting it. Assert that the mutation `mutate` function was called with correct session ID and answer. Assert UI updates after successful mutation. (RED -> GREEN -> REFACTOR)
            *   *Loading During Turn Test:* Mock mutation hook to return pending state. Simulate submitting an answer. Assert that the UI shows loading indicators while `isPending` is true. (RED -> GREEN -> REFACTOR)
            *   *Error Handling Test:* Mock mutation hook to return error state. Assert that error messages are displayed appropriately. (RED -> GREEN -> REFACTOR)
        *   *Implementation:* Implement `app/(protected)/sessions/[id]/page.tsx` and `TextInterviewUI.tsx` based on the tests, handling state updates and tRPC hook integration.

---

## Phase 3: Report UI & tRPC Integration - TDD

*   **Goal:** Build and test the report viewer UI, verifying it correctly displays fetched report data using tRPC hooks.
*   **TDD Focus:** Component Tests for report components, Integration Tests using mocked tRPC hooks and React Testing Library to assert data display.

*   **Tasks & TDD Steps:**

    1.  **Report Page & Components (`app/(protected)/sessions/[id]/report/page.tsx`, `ReportViewer.tsx`, `QuestionFeedback.tsx`):**
        *   **TDD:**
            *   Write **Unit Test** for `QuestionFeedback.tsx`. Test rendering with sample props. Assert correct text display. (RED -> GREEN -> REFACTOR)
            *   Write **Unit Test** for `ReportViewer.tsx`. Test rendering with sample report data. Assert summary display and iteration through Q&A turns. (RED -> GREEN -> REFACTOR)
            *   Write **Integration Test** for `app/(protected)/sessions/[id]/report/page.tsx`. Use mocked tRPC hooks.
            *   *Loading State Test:* Mock the `useGetSessionReport` hook to return loading state. Render the page. Assert loading indicator is shown. (RED -> GREEN -> REFACTOR)
            *   *Loaded Report Test:* Mock the hook to return full report data. Render the page. Assert that `ReportViewer` receives correct data and key elements are visible. (RED -> GREEN -> REFACTOR)
            *   *Navigation Test:* Mock `next/navigation.router.push`. Test navigation back to dashboard. (RED -> GREEN -> REFACTOR)
            *   *Error State Test:* Mock hook to return error state. Assert error handling. (RED -> GREEN -> REFACTOR)
        *   *Implementation:* Implement report components and page based on the tests, using tRPC hooks for data fetching.

---

## Phase 4: UX Refinement & Polish (tRPC Optimized) - TDD

*   **Goal:** Enhance the user experience and handle edge cases, leveraging tRPC-specific testing patterns and potentially adding E2E tests.
*   **TDD Focus:** Adding tests for error states, validation, and tRPC-specific features like optimistic updates.

*   **Tasks & TDD Steps:**

    1.  **Error Handling:**
        *   **TDD:** Revisit relevant **Integration Tests** from previous phases. Add test cases where you mock tRPC hooks to return error states. Assert that the UI displays appropriate error messages and handles graceful fallbacks. (RED -> GREEN -> REFACTOR)
        *   *Implementation:* Add error boundaries, error state management, and user-friendly error messages.

    2.  **Validation (e.g., Empty Input on Dashboard):**
        *   **TDD:** Add **Integration Test** for the Dashboard page. Mock hooks appropriately. Assert that form validation prevents session creation with empty fields and displays validation messages. (RED -> GREEN -> REFACTOR)
        *   *Implementation:* Add client-side validation logic.

    3.  **tRPC-Specific Features:**
        *   **TDD:** Add tests for tRPC-specific features:
            *   Test conditional queries using `enabled` option
            *   Test optimistic updates in mutations
            *   Test automatic retry behavior
            *   Test cache invalidation and refetching patterns
        *   *Implementation:* Implement tRPC optimizations and advanced features.

    4.  **E2E Tests (Optional but Recommended for critical flows):**
        *   **TDD:** If adding E2E tests (using Playwright):
            *   Write Playwright test for the core MVP flow: Login -> Dashboard -> Start Session -> Interview -> Report
            *   Assert key UI elements and interactions work end-to-end
            *   Note: E2E tests will test the actual tRPC procedures, not mocked versions
        *   *Implementation:* Write Playwright test scripts.

**Key Differences from REST/MSW Testing:**
- **No MSW:** We don't mock HTTP requests; we mock tRPC hooks directly
- **Type Safety:** tRPC provides better type safety in tests through TypeScript inference
- **Simpler Setup:** No need to set up MSW server; just mock the hook functions
- **More Granular:** Can mock individual hook states (loading, error, data) more precisely
- **Better Integration:** Tests more closely match the actual usage patterns in components