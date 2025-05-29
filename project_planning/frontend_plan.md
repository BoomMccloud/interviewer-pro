# AI Interview Pro MVP - Revised Frontend Staging Plan

This document outlines a revised staging plan for frontend development, prioritizing core infrastructure and iterative integration with the backend MVP APIs to minimize disruption and ensure a solid foundation.

**⚠️ ARCHITECTURAL CORRECTION NOTICE:**
This document was originally written assuming REST API patterns, but the codebase is actually built with **tRPC for type-safe, end-to-end APIs**. The patterns described below have been corrected to reflect the tRPC architecture that is actually implemented in the codebase.

**Revised Phasing Overview:**

This plan intertwines the goals of establishing look, consistent CSS, UX flow, authentication, and backend integration by tackling cross-cutting concerns early and integrating features as their UI is built.

---

## Phase 0: Foundation - Styling, Authentication Infrastructure, tRPC Pattern

*   **Goal:** Establish the core technical plumbing for visual consistency, security, and reliable backend communication using tRPC from day one.
*   **Tasks:**
    1.  **Styling Setup:**
        *   [x] Choose your CSS approach (e.g., Tailwind CSS, CSS Modules). (Assumed Tailwind based on project files)
        *   [x] Set up global styles (`globals.css` or equivalent). (Assumed complete)
        *   [x] Create a directory for reusable UI components (`src/components/UI/`). (Completed)
        *   [x] Implement basic, generic components within `components/UI/`: `Button.tsx`, `Input.tsx`, `Spinner.tsx`, `Timer.tsx`. Focus purely on presentation, basic props (e.g., `children`, `onClick`), and styling. (Completed)
    2.  **Authentication Setup:**
        *   [x] Implement the NextAuth configuration in `src/lib/auth.ts`. (Completed)
        *   [x] Set up the NextAuth API route handler: `src/app/api/auth/[...nextauth]/route.ts`. (Completed)
        *   [x] Implement the Next.js middleware (`src/middleware.ts`) to protect the `/(protected)` route group, redirecting unauthenticated users to the login page. (Completed)
        *   [x] Create the simple login page: `src/app/login/page.tsx`, using a component like `src/components/Auth/GoogleSignInButton.tsx` to initiate login. (Completed)
        *   [x] Create the root landing page: `src/app/page.tsx`. Add logic to check authentication status and redirect authenticated users to `/dashboard` (or `/(protected)/dashboard`) and unauthenticated users to `/login`. (Completed)
        *   [x] Create the protected layout: `src/app/(protected)/layout.tsx`. Wrap children with `src/components/Auth/SessionProvider.tsx` to provide session context. This layout will be used by all pages requiring authentication. (Completed)
    3.  **tRPC Integration Pattern:**
        *   [x] **tRPC Setup:** The project uses tRPC for type-safe API communication. The setup includes `src/trpc/react.tsx` for client-side hooks, `src/server/api/` for router definitions, and `TRPCReactProvider` in the layout. (Completed)
        *   [x] **tRPC Routers:** Backend procedures are defined in `src/server/api/routers/` (e.g., `jdResume.ts`, `session.ts`) and exported through `src/server/api/root.ts`. (Completed)
        *   [x] **Type Safety:** tRPC provides automatic type inference from backend procedures to frontend hooks, eliminating the need for manual type definitions for API responses. (Completed)
        *   [x] **Hook Exports:** Create a utility file `src/utils/api.ts` that exports tRPC hooks for common use: `export const useGetJdResumeText = api.jdResume.getJdResumeText.useQuery;` (Completed)
*   **Rationale:**
    *   **CSS Early:** Ensures visual consistency across *all* subsequent pages by establishing a design system foundation and core component library. Prevents style drift.
    *   **Auth Early:** Secures your application from the start and simplifies development of protected routes by making the user's authentication state (`useSession`) readily available and required for protected areas. Avoids major refactoring later.
    *   **tRPC Pattern Early:** Establishes a type-safe, consistent layer for interacting with the backend. tRPC provides automatic loading states, error handling, and type inference, making feature integration much more predictable than manual fetch calls.
*   **Minimal Disruption?** This phase requires upfront investment but significantly *reduces* disruption in later phases by resolving cross-cutting concerns before feature development gets deep.

---

## Phase 1: Dashboard & Core Data Integration (tRPC Specific)

*   **Goal:** Build the user's main dashboard, allowing them to input JD/Resume text and view basic session history, fully integrated with the tRPC backend procedures developed in MVP Backend Phases 1 & 2.
*   **Tasks:**
    1.  Implement the dashboard page: `src/app/(protected)/dashboard/page.tsx`. This page will orchestrate displaying the input form and session history using tRPC hooks.
    2.  Implement the copy/paste input form component: `src/components/MvpJdResumeInputForm.tsx`.
        *   Use tRPC hooks for data management: `const { data, isLoading, error, refetch } = api.jdResume.getJdResumeText.useQuery();`
        *   **Integrate Loading Existing Text:** Use `api.jdResume.getJdResumeText.useQuery()` hook which automatically handles loading states, errors, and data updates. Populate text areas with `data?.jdText` and `data?.resumeText`.
        *   **Integrate Saving Text:** Use `api.jdResume.saveJdResumeText.useMutation()` hook with `onSuccess`, `onError` callbacks. Call `mutate({ jdText, resumeText })` to save data.
        *   Add the "Start Technical Interview" button. On click, use `api.session.createSession.useMutation()` hook. Upon success, redirect to the new session page using the returned session ID.
    3.  Implement the session history list component: `src/components/MvpSessionHistoryList.tsx`.
        *   **Integrate Loading History:** Use `api.session.listForCurrentText.useQuery()` hook which automatically handles loading, errors, and data fetching. Display spinner during `isLoading`, handle empty states when `data` is empty array.
        *   Render the list of past sessions from the tRPC query data.
        *   For each session entry, create a link or button that navigates to the session page (`/sessions/[id]`).
    4.  Update `app/(protected)/dashboard/page.tsx` to use multiple tRPC hooks in parallel and render `MvpJdResumeInputForm.tsx` and `MvpSessionHistoryList.tsx`, leveraging tRPC's automatic state management.
*   **Rationale:** Builds the primary entry point for user interaction. By using tRPC hooks immediately, you get automatic type safety, loading states, error handling, and cache management without manual implementation.

---

## Phase 2: Interview Simulation UI & tRPC Integration

*   **Goal:** Build the text-based interview simulation UI and integrate it with the core session interaction tRPC procedures, allowing users to conduct a dynamic text interview.
*   **Tasks:**
    1.  Implement the interview simulation page: `src/app/(protected)/sessions/[id]/page.tsx`. This page is the main container and state manager for the active interview using tRPC hooks.
    2.  **Integrate Loading Initial Session State:** Use `api.session.getSessionById.useQuery({ sessionId })` hook to load session data. The hook automatically handles loading, errors, and data updates.
    3.  Implement the text interview UI component: `src/components/Sessions/InterviewUI/TextInterviewUI.tsx`.
        *   Receive the current conversation history and latest question as props from the tRPC query data.
        *   Display the history in a chat-like interface.
        *   Display the current AI question prominently.
        *   Provide a text input area for user responses.
        *   **Integrate Sending Answers:** Use `api.session.submitAnswerToSession.useMutation()` hook. On form submission, call `mutate({ sessionId, userAnswer })`. The mutation automatically handles loading states and error handling.
    4.  In `src/app/(protected)/sessions/[id]/page.tsx`, use the mutation's `onSuccess` callback to handle the AI response and update the UI state.
    5.  Render the `UI/Timer.tsx` component on the interview page, using session data from the tRPC query.
    6.  Add an "End Session" button using `api.session.endSession.useMutation()` (if implemented) or navigation logic to redirect to the report page.
*   **Rationale:** Builds the core feature's interactive interface using tRPC's automatic state management, type safety, and optimistic updates for a smooth user experience.

---

## Phase 3: Report UI & tRPC Integration

*   **Goal:** Build the UI for displaying the post-interview report, fully integrated with the tRPC backend report procedures.
*   **Tasks:**
    1.  Implement the session report page: `src/app/(protected)/sessions/[id]/report/page.tsx`. This page uses tRPC hooks to fetch and display report data.
    2.  **Integrate Loading Report Data:** Use `api.session.getReportBySessionId.useQuery({ sessionId })` (or similar procedure) hook to load report data with automatic loading states and error handling.
    3.  Implement the main report viewer component: `src/components/Sessions/ReportViewer.tsx`. This component receives the tRPC query data as props.
    4.  Implement the component for displaying feedback for a single Q&A turn: `src/components/Sessions/QuestionFeedback.tsx`. This component receives data for one turn from the tRPC query result.
    5.  In `ReportViewer.tsx`, display the overall session summary and iterate through Q&A history data to render `QuestionFeedback.tsx` components.
    6.  Add navigation back to `/dashboard`.
*   **Rationale:** Builds the output display using tRPC's type-safe data flow, ensuring the UI components correctly consume the backend data structure.

---

## Phase 4: UX Refinement & Polish (tRPC Optimized)

*   **Goal:** Enhance the user experience leveraging tRPC's built-in features for optimal performance and user experience.
*   **Tasks:**
    1.  Review and refine the entire user flow, ensuring smooth transitions and leveraging tRPC's optimistic updates where appropriate.
    2.  Implement tRPC-specific optimizations:
        *   Use `enabled` option in queries to conditionally fetch data
        *   Implement optimistic updates for mutations where appropriate
        *   Leverage tRPC's automatic retry and error handling features
    3.  Conduct styling pass and improve responsiveness.
    4.  Add robust error boundaries and user-friendly error messages for tRPC errors.
    5.  Add empty states and client-side validation.
    6.  Perform thorough testing of the complete tRPC-powered MVP flow.