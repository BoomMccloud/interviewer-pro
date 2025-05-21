# AI Interview Pro MVP - Revised Frontend Staging Plan

This document outlines a revised staging plan for frontend development, prioritizing core infrastructure and iterative integration with the backend MVP APIs to minimize disruption and ensure a solid foundation.

**Revised Phasing Overview:**

This plan intertwines the goals of establishing look, consistent CSS, UX flow, authentication, and backend integration by tackling cross-cutting concerns early and integrating features as their UI is built.

---

## Phase 0: Foundation - Styling, Authentication Infrastructure, API Pattern

*   **Goal:** Establish the core technical plumbing for visual consistency, security, and reliable backend communication from day one.
*   **Tasks:**
    1.  **Styling Setup:**
        *   [x] Choose your CSS approach (e.g., Tailwind CSS, CSS Modules). (Assumed Tailwind based on project files)
        *   [x] Set up global styles (`globals.css` or equivalent). (Assumed complete)
        *   [x] Create a directory for reusable UI components (`src/components/UI/`). (Completed)
        *   [x] Implement basic, generic components within `components/UI/`: `Button.tsx`, `Input.tsx`, `Spinner.tsx`, `Timer.tsx`. Focus purely on presentation, basic props (e.g., `children`, `onClick`), and styling. (Completed)
    2.  **Authentication Setup:**
        *   Implement the NextAuth configuration in `src/lib/auth.ts`.
        *   Set up the NextAuth API route handler: `src/app/api/auth/[...nextauth]/route.ts`.
        *   Implement the Next.js middleware (`src/middleware.ts`) to protect the `/(protected)` route group, redirecting unauthenticated users to the login page.
        *   Create the simple login page: `src/app/login/page.tsx`, using a component like `src/components/Auth/GoogleSignInButton.tsx` to initiate login.
        *   Create the root landing page: `src/app/page.tsx`. Add logic to check authentication status and redirect authenticated users to `/dashboard` (or `/(protected)/dashboard`) and unauthenticated users to `/login`.
        *   Create the protected layout: `src/app/(protected)/layout.tsx`. Wrap children with `src/components/Auth/SessionProvider.tsx` to provide session context. This layout will be used by all pages requiring authentication.
    3.  **API Integration Pattern:**
        *   Create a utility file for backend communication: `src/utils/api.ts`.
        *   Implement helper functions in `utils/api.ts` for making `fetch` requests to your MVP `/api` endpoints (e.g., `getMvpJdResumeText()`, `saveMvpJdResumeText(data)`, `createMvpSession()`, `getSessionReport(sessionId)`). These functions should handle request headers, parsing JSON responses, and basic error propagation.
        *   Define TypeScript types in `src/types/index.ts` for the data structures you expect to send to and receive from these MVP backend APIs.
*   **Rationale:**
    *   **CSS Early:** Ensures visual consistency across *all* subsequent pages by establishing a design system foundation and core component library. Prevents style drift.
    *   **Auth Early:** Secures your application from the start and simplifies development of protected routes by making the user's authentication state (`useSession`) readily available and required for protected areas. Avoids major refactoring later.
    *   **API Pattern Early:** Establishes a consistent, testable layer for interacting with the backend. This makes integrating individual features much more predictable and simplifies handling loading, error, and data transformation states within components.
*   **Minimal Disruption?** This phase requires upfront investment but significantly *reduces* disruption in later phases by resolving cross-cutting concerns before feature development gets deep.

---

## Phase 1: Dashboard & Core Data Integration (MVP Specific)

*   **Goal:** Build the user's main dashboard, allowing them to input JD/Resume text and view basic session history, fully integrated with the MVP backend APIs developed in MVP Backend Phases 1 & 2.
*   **Tasks:**
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
*   **Rationale:** Builds the primary entry point for user interaction. By integrating the backend APIs immediately when building the form and history list, you ensure the UI correctly handles displaying initial state, saving user input, initiating core actions (starting a session), and displaying dynamic lists based on real data from the start.

---

## Phase 2: Interview Simulation UI & Integration (MVP Specific)

*   **Goal:** Build the text-based interview simulation UI and integrate it with the core session interaction API (`/api/mvp-sessions/[id]`), allowing users to conduct a dynamic text interview.
*   **Tasks:**
    1.  Implement the interview simulation page: `src/app/(protected)/sessions/[id]/page.tsx`. This page is the main container and state manager for the active interview.
    2.  **Integrate Loading Initial Session State:** On mount, call `utils/api.ts.getSessionState(sessionId)` (this hits your `/api/mvp-sessions/[id]` GET endpoint). Display a spinner while loading. Handle errors. Use the returned data to initialize the conversation history and timer state.
    3.  Implement the text interview UI component: `src/components/Sessions/InterviewUI/TextInterviewUI.tsx`.
        *   Receive the current conversation history and latest question as props.
        *   Display the history in a chat-like interface.
        *   Display the current AI question prominently.
        *   Provide a text input area for user responses.
        *   **Integrate Sending Answers:** On form submission (user types and presses Enter/sends), call a callback function provided by the parent page (e.g., `onUserResponseSubmit`). Pass the user's text input to this callback. Clear the input field after submitting.
        *   Indicate when the system is waiting for the AI's response (e.g., disable input, show a small spinner in the chat).
    4.  In `src/app/(protected)/sessions/[id]/page.tsx`, implement the `onUserResponseSubmit` handler:
        *   This handler receives the user's text.
        *   Call `utils/api.ts.continueSession(sessionId, userAnswer)` (this hits your `/api/mvp-sessions/[id]` POST endpoint).
        *   Manage client-side loading state while waiting for the API response.
        *   Upon successful response from the API (which returns the next question), update the client-side session state (add the user's response and the new AI question to the conversation history array).
        *   Handle API errors during the turn.
    5.  Render the `UI/Timer.tsx` component on the interview page, passing the remaining session duration based on client-side state initialized from the API.
    6.  Add an "End Session" button. On click, call a new `utils/api.ts` function (e.g., `endSession(sessionId)` hitting a backend endpoint like `POST /api/mvp-sessions/[id]/end`). Handle loading/errors. Upon success, redirect the user to the report page (`/sessions/[id]/report`).
*   **Rationale:** Builds the core feature's interactive interface. Integrating with the session API immediately ensures that the chat UI component and the page logic correctly handle the dynamic, turn-based nature of the interview, including asynchronous API calls, loading states per turn, and managing the conversation history as it unfolds based on backend responses.

---

## Phase 3: Report UI & Integration (MVP Specific)

*   **Goal:** Build the UI for displaying the post-interview report, fully integrated with the backend report data API (`/api/mvp-sessions/[id]/report`).
*   **Tasks:**
    1.  Implement the session report page: `src/app/(protected)/sessions/[id]/report/page.tsx`. This page is the main container for the report view.
    2.  **Integrate Loading Report Data:** On mount, call `utils/api.ts.getSessionReport(sessionId)` (this hits your `/api/mvp-sessions/[id]/report` GET endpoint). Display a spinner while loading the report data. Handle loading errors.
    3.  Implement the main report viewer component: `src/components/Sessions/ReportViewer.tsx`. This component receives the full, structured report data fetched from the API as props.
    4.  Implement the component for displaying feedback for a single Q&A turn: `src/components/Sessions/QuestionFeedback.tsx`. This component receives data for one turn (AI question, user response, basic feedback, suggested alternative).
    5.  In `ReportViewer.tsx`, display the overall session summary (using the data from the API). Iterate through the Q&A history data received in the report and render `QuestionFeedback.tsx` for each turn, passing the relevant data for that turn.
    6.  Add a button or link on the report page to navigate back to the `/dashboard`.
    7.  In `src/app/(protected)/sessions/[id]/report/page.tsx`, fetch the report data using `utils/api.ts` and render `ReportViewer.tsx`, passing the fetched data.
*   **Rationale:** Builds the output display for the core feature. Integrating with the report API immediately ensures that the UI components (`ReportViewer`, `QuestionFeedback`) correctly consume and display the potentially complex, nested data structure provided by the backend, validating the API contract from the frontend perspective.

---

## Phase 4: UX Refinement & Polish (MVP Wide)

*   **Goal:** Enhance the overall user experience, refine styling, and handle edge cases identified during development.
*   **Tasks:**
    1.  Review and refine the entire user flow defined in the original project outline (Point 3) within the scope of the MVP. Ensure transitions between pages are smooth and intuitive (e.g., dashboard -> session config -> interview -> report -> dashboard).
    2.  Conduct a styling pass (Point 2, revisit). Ensure consistency across all pages and components. Improve responsiveness.
    3.  Implement more robust client-side error handling and display user-friendly messages for API failures, network issues, etc.
    4.  Add empty states where appropriate (e.g., "No sessions yet" on the dashboard).
    5.  Add basic client-side validation for inputs (e.g., ensuring text areas aren't empty before starting a session).
    6.  Perform thorough testing (manual and automated if adding frontend tests in parallel) of the complete MVP flow.