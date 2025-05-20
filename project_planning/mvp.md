# AI Interview Pro MVP Definition

## 1. Introduction

This document outlines the Minimum Viable Product (MVP) for AI Interview Pro. The goal of this MVP is to validate the core value proposition: providing a dynamic, text-based interview simulation with a single, predefined interviewer persona, based on user-provided job description and resume text, and generating basic post-interview feedback.

This MVP deliberately cuts dependencies on complex parsing tools, voice/avatar features, multiple interviewer types, and detailed subscription tiers to focus development effort on the core AI interaction and text-based user experience.

## 2. Minimal Features

*   **User Authentication:** Simple user login (e.g., via Google using NextAuth).
*   **Copy/Paste JD & Resume Input:** User can paste the raw text content of a Job Description and their Resume into dedicated text areas on a dashboard page. This text is stored for the user. Only one active JD/Resume text pair is managed per user in this MVP.
*   **Single Stock Interviewer:** The system uses a single, predefined "Technical Lead" persona for all interviews. This persona's instructions/prompt are hardcoded into the backend AI logic.
*   **Text-Only Interview Simulation:** Users conduct the interview entirely via a chat-like text interface.
    *   The AI (simulating the Technical Lead) asks questions based on the pasted JD/Resume text.
    *   User types text responses.
    *   The AI generates dynamic follow-up questions based on user responses, the persona, and the initial JD/Resume text.
    *   A session timer runs (fixed duration, e.g., 15-20 mins, TBD).
    *   User can end the session early.
*   **Basic Post-Interview Report:**
    *   Upon session completion, a report is generated and displayed.
    *   Includes the full transcript of the text conversation.
    *   Provides question-by-question feedback, showing:
        *   AI Question Asked
        *   User's Verbatim Text Response
        *   Basic Feedback (e.g., content relevance to JD/Role, clarity, structure - simplified for MVP)
        *   A **Suggested Alternative Response** (a concrete, AI-generated example for improvement).
*   **Basic History:** A simple list on the dashboard showing past interview sessions conducted with the current copy/pasted JD/Resume text, allowing the user to view the report again.
*   **Free Tier Only:** No subscription management or tiering logic implemented. All features are available to authenticated users.

## 3. MVP File Structure (`src/` directory)

This is a slimmed-down version of the long-term plan, focusing only on necessary components.
src/
├── app/
│   ├── api/
│   │   ├── auth/ # NextAuth API route handler
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts # Handles auth requests (login, logout, session)
│   │   ├── trpc/ # tRPC handler for exposing tRPC router
│   │   │   └── [trpc]/
│   │   │       └── route.ts # Main tRPC API endpoint handler
│   ├── (protected)/ # Grouping for routes requiring authentication
│   │   ├── dashboard/ # User's main dashboard - Contains copy/paste inputs and session history list
│   │   │   └── page.tsx # Renders the input form and history list
│   │   ├── sessions/ # Interview session pages
│   │   │   └── [id]/ # Dynamic route for an active or completed MVP session
│   │   │       ├── page.tsx # The text-only interview simulation page (MVP UI)
│   │   │       └── report/
│   │   │           └── page.tsx # Page displaying the basic post-interview report
│   │   ├── layout.tsx # Root layout for protected routes (handles auth check)
│   ├── login/ # Login page
│   │   └── page.tsx
│   ├── layout.tsx # Root layout for the entire application
│   └── page.tsx # Root landing page (redirects based on auth)
├── components/ # Reusable React components (Consider co-locating under src/app/_components or feature directories)
│   ├── Auth/ # Auth-related components
│   │   ├── GoogleSignInButton.tsx # Button to initiate Google login
│   │   └── SessionProvider.tsx # NextAuth session provider wrapper
│   ├── UI/ # Basic, general-purpose UI components (Button, Input, Spinner, Timer)
│   │   └── ... (Button.tsx, Input.tsx, Timer.tsx, etc.)
│   ├── MvpJdResumeInputForm.tsx # Component containing the copy/paste text areas and 'Start Session' button
│   ├── MvpSessionHistoryList.tsx # Component to display a list of past MVP sessions for the current text input
│   ├── Sessions/ # Components specific to interview sessions and reports
│   │   ├── InterviewUI/
│   │   │   └── TextInterviewUI.tsx # The chat-based interface component for text interviews
│   │   ├── ReportViewer.tsx # Main component to display the report structure
│   │   └── QuestionFeedback.tsx # Displays question, answer, basic feedback, and suggested alternative
│   └── Layout/ # Basic layout components (optional)
│       └── ...
├── lib/ # Backend-specific libraries or helpers used by API routes and tRPC procedures
│   ├── auth.ts # NextAuth configuration details (Potentially more in src/server/auth)
│   ├── gemini.ts # Wrapper/client for interacting with the Gemini API.
│   ├── personaService.ts # Handles providing the hardcoded "Technical Lead" persona definition.
│   └── utils.ts # Backend utility functions (if any, distinct from frontend utils)
├── server/ # Server-side specific code, esp. for tRPC
│   ├── api/
│   │   ├── root.ts # Main tRPC router merging all sub-routers
│   │   └── routers/
│   │       ├── jdResume.ts # tRPC router for JD/Resume text management
│   │       └── session.ts  # tRPC router for interview session management
│   ├── auth/ # Core server-side NextAuth logic (e.g., callbacks, adapter config if not in lib/auth.ts)
│   └── db.ts # Prisma client instance (re-exported from here)
├── utils/ # Frontend utility functions and helpers
│   ├── api.ts # Functions to make API calls to tRPC procedures using the tRPC client
│   ├── constants.ts # Application-wide constants
│   └── formatters.ts # Data formatting functions
├── types/ # TypeScript type definitions
│   └── index.ts # Central file for interface/type exports
├── middleware.ts # Next.js middleware (for protected route authentication)
└── globals.css # Global styles


**Key File Responsibilities (MVP):**

*   `src/server/api/routers/jdResume.ts` (tRPC Router):
    *   `saveJdResumeText` procedure: Stores or updates the single current copy/pasted JD/Resume text for the logged-in user in the database.
    *   `getJdResumeText` procedure: Retrieves the user's current JD/Resume text.
*   `src/server/api/routers/session.ts` (tRPC Router):
    *   `createSession` procedure: Creates a new session record in the database linked to the user and their current JD/Resume text. Initializes session state, retrieves the Technical Lead persona prompt, and calls `lib/gemini.ts` to get the first question.
    *   `submitAnswerToSession` procedure: Receives user input for a session, adds it to history, calls `lib/gemini.ts` with context to get the AI's response (next question, feedback, alternative), updates session state in DB, and returns data to frontend.
    *   `getSessionById` procedure: Retrieves session state from DB. The frontend will use this data to construct the report view.
    *   `getReportBySessionId` procedure: **OUT OF SCOPE FOR MVP.** The report will be constructed by the frontend using data primarily from `getSessionById`.

*   `app/(protected)/dashboard/page.tsx`: Renders `MvpJdResumeInputForm.tsx` and `MvpSessionHistoryList.tsx`. Handles calling tRPC procedures via `utils/api.ts` to save/load the text and start sessions.
*   `app/(protected)/sessions/[id]/page.tsx`: Renders `Sessions/InterviewUI/TextInterviewUI.tsx`. Manages client-side session state display (timer, current question) and sends user responses by calling tRPC procedures via `utils/api.ts`.
*   `app/(protected)/sessions/[id]/report/page.tsx`: Fetches session data using tRPC procedures (primarily `getSessionById`) via `utils/api.ts` and renders it using `Sessions/ReportViewer.tsx`.
*   `src/server/db.ts`: Exports the Prisma client instance (initialized from environment variables). Database models defined in `prisma/schema.prisma` include `User`, `JdResumeText`, and `SessionData`.

## 4. User Flow (MVP)

1.  User lands on the site (`/`).
2.  User is redirected to `/login` if not authenticated (handled by `middleware.ts`).
3.  User signs in via Google (handled by `app/api/auth/...`, `login/page.tsx`, `components/Auth/`).
4.  User is redirected to `/dashboard` upon successful login.
5.  On `/dashboard`, user sees two large text areas for "Job Description" and "Resume" and a button "Start Technical Lead Session" (rendered by `app/(protected)/dashboard/page.tsx` using `MvpJdResumeInputForm.tsx`). A list of past sessions is shown below (rendered by `MvpSessionHistoryList.tsx`).
6.  User pastes JD text into the first box.
7.  User pastes Resume text into the second box.
8.  (Behind the scenes: The page might save this text using a tRPC call to `jdResume.saveJdResumeText` as the user types or when they click the button, linking it to their user ID in the database).
9.  User clicks "Start Technical Lead Session".
10. The frontend calls a tRPC procedure (e.g., `session.createSession`) which uses the current JD/Resume text.
11. The backend creates a new session instance in the database, retrieves the Technical Lead persona prompt, and calls `lib/gemini.ts` to get the first question.
12. The backend returns the new session ID and the first question.
13. The frontend redirects the user to `/sessions/[session_id]`.
14. On the interview page (`/sessions/[session_id]`), the user sees the Technical Lead persona's first question in a chat UI (`Sessions/InterviewUI/TextInterviewUI.tsx`). A timer is visible (`UI/Timer.tsx`).
15. User types their answer into the text input area and submits.
16. The frontend sends the user's response to a tRPC procedure (e.g., `session.submitAnswerToSession` with `session_id`).
17. The backend receives the response, adds it to the session history, calls `lib/gemini.ts` with the updated history, JD/Resume text, and persona prompt to get the next question, feedback points, and suggested alternative for the just-submitted answer.
18. The backend updates the session state and related data in the database and returns the next question data.
19. This Q&A loop continues until the timer runs out or the user clicks "End Session".
20. When the session ends, the backend finalizes the session record.
21. The frontend redirects the user to `/sessions/[session_id]/report`.
22. On the report page (`/sessions/[session_id]/report`), the frontend fetches the report data using a tRPC procedure (e.g., `session.getSessionById`) and displays the transcript, overall summary, and question-by-question feedback with suggested alternatives (`Sessions/ReportViewer.tsx` using `QuestionFeedback.tsx`).
23. A button on the report page links back to the `/dashboard`.
24. On the `/dashboard`, the list of past sessions (`MvpSessionHistoryList.tsx`) now includes the just-completed session.

## 5. Test Cases (MVP)

*   **Auth:**
    *   Successfully sign in with Google.
    *   Verify redirection to `/dashboard` after login.
    *   Attempt to access `/dashboard`, `/sessions/*` (any protected route) while logged out – verify redirection to `/login`.
*   **JD/Resume Input & Session Start (via tRPC backend):**
    *   Paste text into both fields on `/dashboard`.
    *   Click "Start Technical Lead Session". Verify redirection to a new session page (`/sessions/[id]`).
    *   Verify tRPC calls for saving text and creating session are successful.
    *   Leave one or both fields empty and click "Start Session" – verify appropriate validation/error message (can be client-side or server-side via tRPC error).
    *   Paste very long text into fields (basic stability check for tRPC calls).
    *   Log out and log back in – verify the last saved JD/Resume text is still displayed on the dashboard (fetched via tRPC).
*   **Interview Simulation (Text, via tRPC backend):**
    *   Verify the first question appears after session starts (data from `createSession` tRPC call).
    *   Verify the session timer is visible and counting down.
    *   Submit a text answer – verify a dynamic follow-up question appears (data from `submitAnswerToSession` tRPC call).
    *   Submit a series of answers – verify the conversation flows dynamically.
    *   Submit a very short/minimal answer. Verify the AI attempts a follow-up.
    *   Submit an answer irrelevant to the question/JD. Verify the AI's response.
    *   Let the timer run out – verify the session ends and redirects to the report page.
    *   Click the "End Session" button – verify the session ends early and redirects to the report page.
    *   Verify the current interviewer name/title ("Technical Lead") is displayed during the session.
*   **Post-Interview Report (Data via tRPC backend):**
    *   Verify the report page loads after a session ends.
    *   Verify the full text transcript of the Q&A is visible (data from `getSessionById` tRPC call).
    *   Verify an overall summary section is present (if implemented in MVP from session data).
    *   For each question asked:
        *   Verify the AI question is displayed.
        *   Verify the user's exact text response is displayed.
        *   Verify the "Basic Feedback" section is present and contains some relevant text.
        *   Verify the "Suggested Alternative Response" section is present and contains a plausible alternative answer.
*   **Basic History (Data via tRPC backend):**
    *   Complete at least one session.
    *   Return to the dashboard.
    *   Verify the completed session appears in the session history list for the current JD/Resume text (fetched via tRPC).
    *   Click on a session in the history list – verify it loads the correct report page for that session.

This MVP provides a solid foundation to test the core AI-driven interview mechanics before adding the significant complexity of file parsing, multiple dynamic personas, voice/avatar, and advanced subscription features.

## 6. Development Phases (Proposed)

Based on the MVP definition and prioritizing core functionality.

**Phase 0: Project Setup & Core Dependencies**
*   Ensure the T3 boilerplate is set up correctly.
*   Configure database (e.g., Prisma).
*   Integrate the Gemini API client (`lib/gemini.ts`).
*   Set up environment variables (`.env`).
*   Basic project structure setup.
*   **Status: DONE**

**Phase 1: Core Backend Logic, AI Validation & Data Persistence (tRPC)**

**Goal:** Validate the fundamental AI interaction logic (`lib/gemini.ts`) and establish persistent storage for session state using tRPC procedures.

**Key Features Implemented:** Core AI response generation, basic session state saving/loading via tRPC, Persona service.

**Progress Update:**
*   Core helper functions in `lib/gemini.ts` (`buildSystemInstruction`, `buildPromptContents`, `parseAiResponse`) implemented and unit tested.
*   `getFirstQuestion` and `continueInterview` in `lib/gemini.ts` implemented, unit tested, and integration tested with live Gemini API.
*   `lib/personaService.ts` implemented and unit tested.
*   `src/server/db.ts` (Prisma client) setup and CRUD operations for core models (`User`, `JdResumeText`, `SessionData`) tested.
*   `src/server/api/routers/session.ts` tRPC router for `createSession`, `getSessionById`, `submitAnswerToSession` implemented and integration tested (mocking AI services).
*   **Status: DONE**

**Phase 2: Backend API Completion (tRPC)**

**Goal:** Implement the remaining backend tRPC procedures required for the MVP flow.

**Key Features Implemented:** Saving/Retrieving JD/Resume text via tRPC.

**Progress Update:**
*   `src/server/api/routers/jdResume.ts` tRPC router for `saveJdResumeText` and `getJdResumeText` implemented and integration tested.
*   Full-flow backend integration test (`tests/server/routers/full-flow.integration.test.ts`) successfully implemented, testing `jdResumeRouter` and `sessionRouter` (with live AI calls) in sequence.
*   `getReportBySessionId` procedure confirmed as **OUT OF SCOPE FOR MVP.**
*   **Status: DONE**

---

**Phase 3: Frontend Interview UI & Reporting**

**Goal:** Build the client-side interface for conducting text interviews and viewing reports, connecting them to the backend tRPC procedures.

**Key Features Implemented:** Text chat UI, Timer display, Report display (transcript, feedback, alternatives).

**Files to Create/Modify:**
*   `components/UI/Timer.tsx`
*   `components/Sessions/InterviewUI/TextInterviewUI.tsx`
*   `components/Sessions/QuestionFeedback.tsx`
*   `components/Sessions/ReportViewer.tsx`
*   `app/(protected)/sessions/[id]/page.tsx`
*   `app/(protected)/sessions/[id]/report/page.tsx`
*   `utils/api.ts` (tRPC client setup and typed helper functions)
*   **Status: NOT STARTED**

---

**Phase 4: Dashboard, Basic History & Authentication**

**Goal:** Implement user authentication, secure the application, and build the dashboard as the entry point for managing JD/Resume text and viewing past sessions.

**Key Features Implemented:** User Authentication (Google), Protected Routes, Copy/Paste Input Form, Session History List.

**Files to Create/Modify:**
*   `lib/auth.ts` / `src/server/auth/` (NextAuth config)
*   `app/api/auth/[...nextauth]/route.ts`
*   `middleware.ts`
*   `components/Auth/GoogleSignInButton.tsx`
*   `components/Auth/SessionProvider.tsx`
*   `app/login/page.tsx`
*   `app/(protected)/layout.tsx`
*   `app/page.tsx` (auth redirection)
*   `components/MvpJdResumeInputForm.tsx`
*   `components/MvpSessionHistoryList.tsx`
*   `app/(protected)/dashboard/page.tsx`
*   **Status: NOT STARTED**