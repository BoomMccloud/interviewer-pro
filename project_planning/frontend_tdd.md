# AI Interview Pro MVP - TDD Frontend Development Plan

This document integrates Test-Driven Development (TDD) principles into the Revised Frontend Staging Plan. For each phase and key task, we define the type of test(s) to be written *first*, ensuring that tests drive the development process and validate functionality iteratively.

**Testing Tools:**

*   **Test Runner/Framework:** Jest
*   **React Component Testing:** React Testing Library (`@testing-library/react`)
*   **API Mocking (Frontend):** Mock Service Worker (`msw`) for mocking API requests in integration tests.
*   **End-to-End (E2E) Testing:** Playwright (Optional but recommended for critical flows).
*   **Mocking:** Jest built-in mocks, `msw`.

**TDD Workflow:**

For each specific implementation task:

1.  **RED:** Write a test (Unit, Component, Integration, E2E) that describes the desired behavior. This test should **fail** because the code doesn't exist or isn't complete.
2.  **GREEN:** Write the **minimum** amount of code necessary to make the *new* test pass. Focus only on the current test requirement.
3.  **REFACTOR:** Improve the code you just wrote and the existing codebase. Clean up, simplify, optimize, improve readability, ensuring all tests (including previously passing ones) remain **green**.

---

## Phase 0: Foundation - Styling, Authentication Infrastructure, API Pattern - TDD

*   **Goal:** Establish testable infrastructure for styling, security, and backend communication.
*   **TDD Focus:** Unit tests for utilities and basic components, Integration tests for authentication middleware and core API calling pattern.

*   **Tasks & TDD Steps:**

    1.  **Styling Setup & Basic UI Components (`src/components/UI/`):**
        *   **TDD:** Write **Component Tests** using React Testing Library for `Button.tsx`, `Input.tsx`, `Spinner.tsx`, `Timer.tsx`.
            *   *For Button:* Test rendering children, asserting the correct HTML tag, testing the `onClick` prop is called when clicked. (RED -> GREEN -> REFACTOR)
            *   *For Input:* Test rendering with different props (`placeholder`, `value`), testing `onChange` prop is called on input change. (RED -> GREEN -> REFACTOR)
            *   *For Timer:* Test rendering the time format correctly, testing basic countdown logic (using Jest fake timers). (RED -> GREEN -> REFACTOR)
            *   *For Spinner:* Test rendering, potentially different sizes/styles via props. (RED -> GREEN -> REFACTOR)
        *   *Implementation:* Write the component code based on the tests.

    2.  **Authentication Setup (`lib/auth.ts`, `app/api/auth/...`, `middleware.ts`, `login/page.tsx`, `app/page.tsx`, `app/(protected)/layout.tsx`):**
        *   **TDD:**
            *   Write **Integration Tests** for `middleware.ts`. Simulate incoming requests to `/(protected)/dashboard` with and without a mock session token/cookie. Assert that the middleware redirects correctly to `/login` when not authenticated and allows access when authenticated. (RED -> GREEN -> REFACTOR)
            *   Write **Component Test** for `GoogleSignInButton.tsx`. Assert the button renders and clicking it calls `signIn` from `next-auth/react` (mock `signIn`). (RED -> GREEN -> REFACTOR)
            *   Write **Integration Test** (or simple function test) for `app/page.tsx`. Mock `useSession` to return authenticated/unauthenticated states. Assert the page redirects correctly (mock `next/navigation.router.push`). (RED -> GREEN -> REFACTOR)
            *   (Less critical for MVP, but good practice) Write **Unit Tests** for `lib/auth.ts` configuration details if any complex logic exists there (e.g., callbacks).
        *   *Implementation:* Implement the NextAuth configuration, middleware, login page, and layout files based on the tests.

    3.  **API Integration Pattern (`src/utils/api.ts`, `src/types/index.ts`):**
        *   **TDD:**
            *   Define TypeScript types in `src/types/index.ts` for expected API data shapes *before* writing the utility functions or components that use them. (This isn't a runtime test, but is part of the TDD preparation in a typed language).
            *   Write **Unit Tests** for `utils/api.ts` helper functions (`get...`, `post...`). Use Jest's global `fetch` mock or a library like `jest-fetch-mock`.
            *   *For `getMvpJdResumeText()`:* Mock `fetch` to return a specific JSON response. Assert the `getMvpJdResumeText` function calls `fetch` with the correct URL and headers, and correctly parses the JSON response and returns the data. Test error cases (non-200 response). (RED -> GREEN -> REFACTOR)
            *   *For `saveMvpJdResumeText(data)`:* Mock `fetch`. Assert the function calls `fetch` with the correct URL, HTTP method (POST), headers, and sends the `data` in the request body (JSON.stringify). Test error cases. (RED -> GREEN -> REFACTOR)
            *   Repeat for other necessary API utility functions (`createMvpSession`, `getSessionReport`, `continueSession`, `endSession`, `listMvpSessionsForCurrentText`).
        *   *Implementation:* Write the `utils/api.ts` functions based on the tests.

---

## Phase 1: Dashboard & Core Data Integration (MVP Specific) - TDD

*   **Goal:** Build and test the dashboard UI, verifying its interaction with the user and integration with mocked backend APIs.
*   **TDD Focus:** Integration Tests using `msw` to mock API calls and React Testing Library to interact with components and assert UI changes based on API responses.

*   **Tasks & TDD Steps:**

    1.  **Dashboard Page & Components (`app/(protected)/dashboard/page.tsx`, `MvpJdResumeInputForm.tsx`, `MvpSessionHistoryList.tsx`):**
        *   **TDD:** Write **Integration Tests** using `msw` and React Testing Library for `app/(protected)/dashboard/page.tsx`.
            *   *Loading State Test:* Mock `getMvpJdResumeText` and `listMvpSessionsForCurrentText` APIs to delay response or return specific data. Render the Dashboard page. Assert that loading indicators (`Spinner.tsx`) are visible initially. (RED -> GREEN -> REFACTOR)
            *   *Loaded State Test:* Mock the APIs to return sample JD/Resume text and an array of session history items. Render the Dashboard page. Assert that the `MvpJdResumeInputForm` is pre-filled with the mocked text and `MvpSessionHistoryList` displays the correct number of session items with expected text/links. (RED -> GREEN -> REFACTOR)
            *   *Saving Text Test:* Mock the `saveMvpJdResumeText` POST API. Render the Dashboard page. Type text into the input fields. Trigger the save action (e.g., blur, button click). Assert that the `saveMvpJdResumeText` utility function was called with the correct data. Assert UI state changes (e.g., button disabled, "Saving..." text). (RED -> GREEN -> REFACTOR)
            *   *Start Session Test:* Mock the `createMvpSession` POST API to return a session ID. Mock `next/navigation.router.push`. Render the Dashboard page. Ensure text fields have data (pre-fill or type). Click the "Start Session" button. Assert that `createMvpSession` utility function was called. Assert that `router.push` was called with the correct path including the mocked session ID. (RED -> GREEN -> REFACTOR)
            *   *History Link Test:* Mock `listMvpSessionsForCurrentText` to return sessions. Mock `next/navigation.router.push`. Render the Dashboard page. Assert session items are rendered. Click on a session item link. Assert `router.push` was called with the correct report path (`/sessions/[id]/report`). (RED -> GREEN -> REFACTOR)
            *   *Empty History Test:* Mock `listMvpSessionsForCurrentText` to return an empty array. Assert that the "No sessions yet" or similar empty state message is displayed. (RED -> GREEN -> REFACTOR)
        *   *Implementation:* Implement `app/(protected)/dashboard/page.tsx`, `MvpJdResumeInputForm.tsx`, and `MvpSessionHistoryList.tsx` based on the tests, using the `utils/api.ts` functions.

---

## Phase 2: Interview Simulation UI & Integration (MVP Specific) - TDD

*   **Goal:** Build and test the text-based interview UI, verifying its dynamic behavior and integration with the core session API via user interaction.
*   **TDD Focus:** Component Tests for the UI pieces, Integration Tests using `msw` to mock API calls and React Testing Library to simulate user input and assert dynamic UI updates.

*   **Tasks & TDD Steps:**

    1.  **Interview Simulation Page & Components (`app/(protected)/sessions/[id]/page.tsx`, `TextInterviewUI.tsx`):**
        *   **TDD:**
            *   Write **Unit Test** for `TextInterviewUI.tsx`. Test rendering different chat history arrays (user messages, AI messages). Test rendering the current question prop. Test that typing into the input field updates its value. Test that submitting the form (e.g., pressing Enter in the input, clicking a send button) calls the `onUserResponseSubmit` prop with the input text and clears the input field. (RED -> GREEN -> REFACTOR)
            *   Write **Integration Test** for `app/(protected)/sessions/[id]/page.tsx`. Use `msw`.
            *   *Initial Load Test:* Mock the initial `getSessionState` GET API call to return the first question and initial state. Render the page. Assert the `TextInterviewUI` component is rendered, the timer starts, and the first question text is displayed. (RED -> GREEN -> REFACTOR)
            *   *Dynamic Turn Test:* Mock the `continueSession` POST API call to return a specific next question and state update. Render the page (or reuse setup from previous test). Simulate typing a response into the `TextInterviewUI`'s input and submitting it (using RTL `fireEvent` or `userEvent`). Assert that the `continueSession` utility function was called with the correct session ID and user answer. Assert that after the mocked API returns, the `TextInterviewUI` updates to show the user's message in the history and the new AI question. Assert the input field is cleared. (RED -> GREEN -> REFACTOR)
            *   *Loading During Turn Test:* Mock `continueSession` to delay the response. Simulate typing and submitting. Assert that the UI shows a loading indicator (e.g., input disabled, spinner visible) while waiting for the response. (RED -> GREEN -> REFACTOR)
            *   *End Session Test:* Mock the `endSession` API call. Mock `next/navigation.router.push`. Render the page. Click the "End Session" button. Assert `endSession` utility was called. Assert `router.push` was called with the correct report page path. (RED -> GREEN -> REFACTOR)
            *   *Timer End Test:* Test the timer component integrates correctly. (Might require more complex setup with fake timers across API calls, or focus timer tests at the unit level). Assert that when the timer reaches zero (simulate using fake timers), the session ends (triggering the same logic as the "End Session" button, or a specific timer-end API call if implemented). Assert redirection to report. (RED -> GREEN -> REFACTOR)
        *   *Implementation:* Implement `app/(protected)/sessions/[id]/page.tsx` and `TextInterviewUI.tsx` based on the tests, handling state updates, API calls, and loading states.

---

## Phase 3: Report UI & Integration (MVP Specific) - TDD

*   **Goal:** Build and test the report viewer UI, verifying it correctly displays fetched report data.
*   **TDD Focus:** Component Tests for report components, Integration Tests using `msw` to mock API calls and React Testing Library to assert data display.

*   **Tasks & TDD Steps:**

    1.  **Report Page & Components (`app/(protected)/sessions/[id]/report/page.tsx`, `ReportViewer.tsx`, `QuestionFeedback.tsx`):**
        *   **TDD:**
            *   Define TypeScript types for the report data structure received from the backend.
            *   Write **Unit Test** for `QuestionFeedback.tsx`. Test rendering with sample props for question, answer, feedback points (as an array), and suggested alternative. Assert that all pieces of text are displayed correctly. (RED -> GREEN -> REFACTOR)
            *   Write **Unit Test** for `ReportViewer.tsx`. Test rendering with a sample report data object (containing overall summary and an array of Q&A turns). Assert that the overall summary is displayed. Assert that it iterates through the Q&A turns and renders a `QuestionFeedback` component for each turn, passing the correct data. Test empty history state. (RED -> GREEN -> REFACTOR)
            *   Write **Integration Test** for `app/(protected)/sessions/[id]/report/page.tsx`. Use `msw`.
            *   *Loading State Test:* Mock the `getSessionReport` GET API to delay response. Render the page. Assert a loading indicator (`Spinner.tsx`) is shown. (RED -> GREEN -> REFACTOR)
            *   *Loaded Report Test:* Mock the `getSessionReport` GET API to return a full sample report data object. Render the page. Assert that the `ReportViewer` component is rendered and receives the mocked data as props. Assert that key elements of the report (overall summary text, content from specific Q&A turns) are visible on the screen, indicating the data flowed correctly from the mock API -> page -> `ReportViewer` -> `QuestionFeedback`. (RED -> GREEN -> REFACTOR)
            *   *Navigation Test:* Mock `next/navigation.router.push`. Render the page with mock data. Click the "Back to Dashboard" button/link. Assert `router.push` was called with the correct path (`/dashboard`). (RED -> GREEN -> REFACTOR)
        *   *Implementation:* Implement `app/(protected)/sessions/[id]/report/page.tsx`, `ReportViewer.tsx`, and `QuestionFeedback.tsx` based on the tests, fetching data using `utils/api.ts`.

---

## Phase 4: UX Refinement & Polish (MVP Wide) - TDD

*   **Goal:** Enhance the user experience and handle edge cases, leveraging existing tests and potentially adding E2E tests.
*   **TDD Focus:** Adding tests for error states and validation, potentially E2E tests for full flows.

*   **Tasks & TDD Steps:**

    1.  **Error Handling:**
        *   **TDD:** Revisit relevant **Integration Tests** from previous phases (Dashboard load, Session continue, Report load). Add new test cases where you configure `msw` mocks to return API error responses (e.g., 400, 500). Assert that the UI displays appropriate error messages to the user and handles the state gracefully (e.g., input disabled, retry button shown). (RED -> GREEN -> REFACTOR for error handling logic).
        *   *Implementation:* Add `try...catch` blocks in API calling code in pages/components, manage error state variables, and display error messages in the UI.

    2.  **Validation (e.g., Empty Input on Dashboard):**
        *   **TDD:** Add **Integration Test** for the Dashboard page. Render the page. Assert that clicking the "Start Session" button *without* typing anything into the JD/Resume fields (or with empty mocks if loading) results in a validation message being displayed on the UI and the `createMvpSession` utility *not* being called. (RED -> GREEN -> REFACTOR for validation logic).
        *   *Implementation:* Add basic client-side validation logic to `MvpJdResumeInputForm.tsx`.

    3.  **E2E Tests (Optional but Recommended for critical flows):**
        *   **TDD:** If adding E2E tests (using Playwright):
            *   Write a Playwright test script for the core MVP flow: Navigate to root -> Login (mocking external Google Auth if needed) -> Redirect to Dashboard -> Type sample JD/Resume -> Click Start Session -> See Interview Page -> Type a few answers -> Click End Session -> See Report Page.
            *   Assert key UI elements are visible and interactions work at each step. (Initial RED test might just assert navigation works). Add more specific assertions as you go.
            *   *Implementation:* Write the Playwright test script.

    4.  **UI Refinement & Polish:**
        *   **TDD:** Primarily relies on existing tests staying green during refactoring. If adding significant new UI elements or complex styling, add component tests for those specific pieces.
        *   *Implementation:* Refine CSS, component structure, visual details.