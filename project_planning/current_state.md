# AI Interview Pro MVP - Current Development State

This document tracks the current progress and detailed tasks for the active development phase.

## Phase 1: Dashboard & Core Data Integration (MVP Specific)

**Goal:** Build the user's main dashboard, allowing them to input JD/Resume text and view basic session history, fully integrated with the MVP backend APIs developed in MVP Backend Phases 1 & 2.

**Current Status:**
We have completed writing the Integration Tests for `app/(protected)/dashboard/page.tsx`. The test file `tests/frontend/app/(protected)/dashboard/page.test.tsx` now covers the following scenarios:
- Initial loading states (spinners).
- Rendering with loaded JD/Resume text and session history.
- Saving JD/Resume text via the form's callback.
- Starting a new session via the form's callback and redirecting.
- Redirecting to a session report when a history item is clicked.
- Displaying an empty state for session history.

**Next Step (GREEN):** Write the minimum amount of code necessary to make the tests in `tests/frontend/app/(protected)/dashboard/page.test.tsx` pass. This involves implementing the following files:
- `src/app/(protected)/dashboard/page.tsx`
- `src/components/MvpJdResumeInputForm.tsx`
- `src/components/MvpSessionHistoryList.tsx`

**Detailed Tasks (from frontend_plan.md Phase 1):**
1.  Implement the dashboard page: `src/app/(protected)/dashboard/page.tsx`. This page will orchestrate displaying the input form and session history.
2.  Implement the copy/paste input form component: `src/components/MvpJdResumeInputForm.tsx`.
    *   Use a state management approach (e.g., `useState`, `react-hook-form`) for the text area values.
    *   **Integrate Loading Existing Text:** On mount, within the component or the parent page that renders it, call `utils/api.ts.getMvpJdResumeText()`. Display a `Spinner.tsx` or loading state while fetching. Populate the text areas with the fetched data. Handle loading errors.
    *   **Integrate Saving Text:** Implement a save mechanism (e.g., on blur, debounce, or explicit save button). Call `utils/api.ts.saveMvpJdResumeText(data)`. Indicate saving progress or disable the form during the API call. Handle save errors.
    *   Add the "Start Technical Lead Session" button. On click, call `utils/api.ts.createMvpSession()`. Handle the loading state for starting the session. Upon success, redirect the user to the new session page (`/sessions/[id]`, using the session ID returned by the API). Handle errors during session creation.
3.  Implement the session history list component: `src/components/MvpSessionHistoryList.tsx`.
    *   **Integrate Loading History:** On mount, call a new `utils/api.ts` function (e.g., `listMvpSessionsForCurrentText()`) which hits your backend API for listing sessions for the current user and current text. Display a spinner while loading. Handle empty states ("No sessions yet") and loading errors.
    *   Render the list of past sessions fetched from the API.
    *   For each session entry, create a link or button that navigates to the session report page (`/sessions/[id]/report`).
4.  Update `app/(protected)/dashboard/page.tsx` to fetch both the JD/Resume text and the session history list (potentially in parallel) and render `MvpJdResumeInputForm.tsx` and `MvpSessionHistoryList.tsx`, passing the fetched data and necessary callbacks.

**Detailed TDD Steps (from frontend_tdd.md Phase 1):**
Write **Integration Tests** using `msw` and React Testing Library for `app/(protected)/dashboard/page.tsx`. (Completed - see test file for specifics)

*   *Loading State Test:* Mock `getMvpJdResumeText` and `listMvpSessionsForCurrentText` APIs to delay response or return specific data. Render the Dashboard page. Assert that loading indicators (`Spinner.tsx`) are visible initially. (RED -> GREEN -> REFACTOR)
*   *Loaded State Test:* Mock the APIs to return sample JD/Resume text and an array of session history items. Render the Dashboard page. Assert that the `MvpJdResumeInputForm` is pre-filled with the mocked text and `MvpSessionHistoryList` displays the correct number of session items with expected text/links. (RED -> GREEN -> REFACTOR)
*   *Saving Text Test:* Mock the `saveMvpJdResumeText` POST API. Render the Dashboard page. Type text into the input fields. Trigger the save action (e.g., blur, button click). Assert that the `saveMvpJdResumeText` utility function was called with the correct data. Assert UI state changes (e.g., button disabled, "Saving..." text). (RED -> GREEN -> REFACTOR)
*   *Start Session Test:* Mock the `createMvpSession` POST API to return a session ID. Mock `next/navigation.router.push`. Render the Dashboard page. Ensure text fields have data (pre-fill or type). Click the "Start Session" button. Assert that `createMvpSession` utility function was called. Assert that `router.push` was called with the correct path including the mocked session ID. (RED -> GREEN -> REFACTOR)
*   *History Link Test:* Mock `listMvpSessionsForCurrentText` to return sessions. Mock `next/navigation.router.push`. Render the Dashboard page. Assert session items are rendered. Click on a session item link. Assert `router.push` was called with the correct report path (`/sessions/[id]/report`). (RED -> GREEN -> REFACTOR)
*   *Empty History Test:* Mock `listMvpSessionsForCurrentText` to return an empty array. Assert that the "No sessions yet" or similar empty state message is displayed. (RED -> GREEN -> REFACTOR)

*   *Implementation:* Implement `app/(protected)/dashboard/page.tsx`, `MvpJdResumeInputForm.tsx`, and `MvpSessionHistoryList.tsx` based on the tests, using the `utils/api.ts` functions. (This is the current step we are on - GREEN). 