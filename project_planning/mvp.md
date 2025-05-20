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
│ ├── api/
│ │ ├── auth/ # NextAuth API route handler
│ │ │ └── [...nextauth]/
│ │ │ └── route.ts # Handles auth requests (login, logout, session)
│ │ ├── mvp-jd-resume/ # API to handle saving/retrieving the current MVP copy-pasted JD/Resume text for the user
│ │ │ └── route.ts # GET (retrieve current text), POST (save/update current text)
│ │ ├── mvp-sessions/ # API for managing MVP interview sessions
│ │ │ ├── route.ts # POST (create session instance using current MVP JD/Resume text)
│ │ │ └── [id]/
│ │ │ ├── route.ts # GET (session state), POST (submit user answer, get next question from AI)
│ │ │ └── report/
│ │ │ └── route.ts # GET (session report data)
│ │ ├── route.ts # (Optional) Catch-all for other API calls or redirects
│ ├── (protected)/ # Grouping for routes requiring authentication
│ │ ├── dashboard/ # User's main dashboard - Contains copy/paste inputs and session history list
│ │ │ └── page.tsx # Renders the input form and history list
│ │ ├── sessions/ # Interview session pages
│ │ │ └── [id]/ # Dynamic route for an active or completed MVP session
│ │ │ ├── page.tsx # The text-only interview simulation page (MVP UI)
│ │ │ └── report/
│ │ │ └── page.tsx # Page displaying the basic post-interview report
│ │ ├── layout.tsx # Root layout for protected routes (handles auth check)
│ │ └── route.ts # (Optional) Catch-all for protected pages
│ ├── login/ # Login page
│ │ └── page.tsx
│ ├── layout.tsx # Root layout for the entire application
│ └── page.tsx # Root landing page (redirects based on auth)
├── components/ # Reusable React components
│ ├── Auth/ # Auth-related components
│ │ ├── GoogleSignInButton.tsx # Button to initiate Google login
│ │ └── SessionProvider.tsx # NextAuth session provider wrapper
│ ├── UI/ # Basic, general-purpose UI components (Button, Input, Spinner, Timer)
│ │ └── ... (Button.tsx, Input.tsx, Timer.tsx, etc.)
│ ├── MvpJdResumeInputForm.tsx # Component containing the copy/paste text areas and 'Start Session' button
│ ├── MvpSessionHistoryList.tsx # Component to display a list of past MVP sessions for the current text input
│ ├── Sessions/ # Components specific to interview sessions and reports
│ │ ├── InterviewUI/
│ │ │ └── TextInterviewUI.tsx # The chat-based interface component for text interviews
│ │ ├── ReportViewer.tsx # Main component to display the report structure
│ │ └── QuestionFeedback.tsx # Displays question, answer, basic feedback, and suggested alternative
│ └── Layout/ # Basic layout components (optional)
│ └── ...
├── lib/ # Backend-specific libraries or helpers used by API routes
│ ├── auth.ts # NextAuth configuration details
│ ├── db.ts # Database connection/client setup (Needed to store user, JD/Resume text, session history, report data)
│ ├── gemini.ts # Wrapper/client for interacting with the Gemini API. Contains core AI logic for dynamic questioning, response analysis, feedback points, and alternative response generation. Receives necessary context (JD/Resume text, persona prompt, history) from calling API route.
│ ├── personaService.ts # Handles providing the hardcoded "Technical Lead" persona definition (prompt, name). Used by the session API.
│ └── utils.ts # Backend utility functions
├── utils/ # Frontend utility functions and helpers
│ ├── api.ts # Functions to make API calls to /api/mvp-... routes
│ ├── constants.ts # Application-wide constants (e.g., session duration, API paths)
│ └── formatters.ts # Data formatting functions
├── types/ # TypeScript type definitions
│ └── index.ts # Central file for interface/type exports (MvpUser, MvpJdResumeText, MvpSessionData, MvpReportData, etc.)
├── middleware.ts # Next.js middleware (for protected route authentication)
└── globals.css # Global styles


**Key File Responsibilities (MVP):**

*   `app/api/mvp-jd-resume/route.ts`: Stores and retrieves the single current copy-pasted JD/Resume text for the logged-in user in the database.
*   `app/api/mvp-sessions/route.ts`: Creates a new session record in the database linked to the user and their current JD/Resume text. Initializes session state.
*   `app/api/mvp-sessions/[id]/route.ts`: Receives user input, retrieves the "Technical Lead" persona prompt from `personaService.ts`, calls `gemini.ts` with the necessary context (JD/Resume text, history, persona prompt, user input), gets the AI's response (next question, feedback hints), updates the session state in the database, and returns data to the frontend.
*   `app/api/mvp-sessions/[id]/report/route.ts`: Fetches the completed session data (including transcript and stored AI results/feedback) from the database and formats it for the report viewer.
*   `app/(protected)/dashboard/page.tsx`: Renders `MvpJdResumeInputForm.tsx` and `MvpSessionHistoryList.tsx`. Handles calling `utils/api.ts` to save/load the text and start sessions.
*   `app/(protected)/sessions/[id]/page.tsx`: Renders `Sessions/InterviewUI/TextInterviewUI.tsx`. Manages client-side session state display (timer, current question) and sends user responses to `/api/mvp-sessions/[id]`.
*   `app/(protected)/sessions/[id]/report/page.tsx`: Fetches report data using `utils/api.ts` and renders it using `Sessions/ReportViewer.tsx`.
*   `lib/db.ts`: Handles connecting to your chosen database to store `MvpUser`, `MvpJdResumeText` (storing the raw text), `MvpSessionData` (storing session state, transcript, Q&A history, and the basic feedback/alternative response data generated by the AI), and `MvpReportData` (summary/structured feedback).
*   `lib/gemini.ts`: Contains the core AI logic. Receives the relevant context (JD text, Resume text, full conversation history array, the *current* persona's system prompt, user's last message) and uses the Gemini API to: 1) Generate the next dynamic question, 2) Analyze the user's last response in the context of the JD/Resume/Persona, 3) Generate basic feedback points *about that response*, and 4) Generate a suggested alternative response for that specific Q&A turn.
*   `lib/personaService.ts`: A simple service that exposes the hardcoded data for the "Technical Lead" persona (e.g., `{ id: 'technical-lead', name: 'Technical Lead', systemPrompt: 'Act as an experienced technical lead interviewing a candidate for an engineering role...'}`). The session API route will call this to get the prompt to pass to `gemini.ts`.

## 4. User Flow (MVP)

1.  User lands on the site (`/`).
2.  User is redirected to `/login` if not authenticated (handled by `middleware.ts`).
3.  User signs in via Google (handled by `app/api/auth/...`, `login/page.tsx`, `components/Auth/`).
4.  User is redirected to `/dashboard` upon successful login.
5.  On `/dashboard`, user sees two large text areas for "Job Description" and "Resume" and a button "Start Technical Lead Session" (rendered by `app/(protected)/dashboard/page.tsx` using `MvpJdResumeInputForm.tsx`). A list of past sessions is shown below (rendered by `MvpSessionHistoryList.tsx`).
6.  User pastes JD text into the first box.
7.  User pastes Resume text into the second box.
8.  (Behind the scenes: The page might save this text using `/api/mvp-jd-resume` as the user types or when they click the button, linking it to their user ID in the database).
9.  User clicks "Start Technical Lead Session".
10. The frontend calls `/api/mvp-sessions` with the current JD/Resume text (or just the user ID if text is already saved).
11. The backend creates a new session instance in the database, retrieves the Technical Lead persona prompt, and calls `lib/gemini.ts` to get the first question.
12. The backend returns the new session ID and the first question.
13. The frontend redirects the user to `/sessions/[session_id]`.
14. On the interview page (`/sessions/[session_id]`), the user sees the Technical Lead persona's first question in a chat UI (`Sessions/InterviewUI/TextInterviewUI.tsx`). A timer is visible (`UI/Timer.tsx`).
15. User types their answer into the text input area and submits.
16. The frontend sends the user's response to `/api/mvp-sessions/[session_id]`.
17. The backend receives the response, adds it to the session history, calls `lib/gemini.ts` with the updated history, JD/Resume text, and persona prompt to get the next question, feedback points, and suggested alternative for the just-submitted answer.
18. The backend updates the session state and related data in the database and returns the next question data (and potentially the feedback/alternative response for the *previous* turn, though the report view is the main place for feedback).
19. This Q&A loop continues until the timer runs out or the user clicks "End Session".
20. When the session ends, the backend finalizes the session record and calculates any final summary report data.
21. The frontend redirects the user to `/sessions/[session_id]/report`.
22. On the report page (`/sessions/[session_id]/report`), the frontend fetches the report data from `/api/mvp-sessions/[session_id]/report` and displays the transcript, overall summary, and question-by-question feedback with suggested alternatives (`Sessions/ReportViewer.tsx` using `QuestionFeedback.tsx`).
23. A button on the report page links back to the `/dashboard`.
24. On the `/dashboard`, the list of past sessions (`MvpSessionHistoryList.tsx`) now includes the just-completed session.

## 5. Test Cases (MVP)

*   **Auth:**
    *   Successfully sign in with Google.
    *   Verify redirection to `/dashboard` after login.
    *   Attempt to access `/dashboard`, `/sessions/*`, `/account`, `/subscription` (any protected route) while logged out – verify redirection to `/login`.
*   **JD/Resume Input & Session Start:**
    *   Paste text into both fields on `/dashboard`.
    *   Click "Start Technical Lead Session". Verify redirection to a new session page (`/sessions/[id]`).
    *   Leave one or both fields empty and click "Start Session" – verify appropriate validation/error message.
    *   Paste very long text into fields (basic stability check).
    *   Log out and log back in – verify the last saved JD/Resume text is still displayed on the dashboard.
*   **Interview Simulation (Text):**
    *   Verify the first question appears after session starts.
    *   Verify the session timer is visible and counting down.
    *   Submit a text answer – verify a dynamic follow-up question appears.
    *   Submit a series of answers – verify the conversation flows dynamically.
    *   Submit a very short/minimal answer. Verify the AI attempts a follow-up.
    *   Submit an answer irrelevant to the question/JD. Verify the AI's response (e.g., tries to redirect, asks for clarification).
    *   Let the timer run out – verify the session ends and redirects to the report page.
    *   Click the "End Session" button – verify the session ends early and redirects to the report page.
    *   Verify the current interviewer name/title ("Technical Lead") is displayed during the session.
*   **Post-Interview Report:**
    *   Verify the report page loads after a session ends.
    *   Verify the full text transcript of the Q&A is visible.
    *   Verify an overall summary section is present.
    *   For each question asked:
        *   Verify the AI question is displayed.
        *   Verify the user's exact text response is displayed.
        *   Verify the "Basic Feedback" section is present and contains some relevant text.
        *   Verify the "Suggested Alternative Response" section is present and contains a plausible alternative answer.
*   **Basic History:**
    *   Complete at least one session.
    *   Return to the dashboard.
    *   Verify the completed session appears in the session history list for the current JD/Resume text.
    *   Click on a session in the history list – verify it loads the correct report page for that session.
    *   (Optional but good): Modify the JD/Resume text after completing a session, then complete *another* session. Verify the history list for the *first* text entry still shows the original session, and the history for the *new* text entry shows the second session (requires basic association of sessions with the saved text entry).

This MVP provides a solid foundation to test the core AI-driven interview mechanics before adding the significant complexity of file parsing, multiple dynamic personas, voice/avatar, and advanced subscription features.

## 6. Development Phases (Proposed)

Based on the MVP definition and prioritizing core functionality before authentication, here is a possible breakdown into iterative development phases or sprints:

**Phase 0: Project Setup & Core Dependencies**
*   Ensure the T3 boilerplate is set up correctly.
*   Configure database (e.g., Prisma).
*   Integrate the Gemini API client (`lib/gemini.ts`).
*   Set up environment variables (`.env`).
*   Basic project structure setup as outlined in section 3.

## Phase 1: Core Backend Logic, AI Validation & Data Persistence

**Goal:** Validate the fundamental AI interaction logic (`lib/gemini.ts`) and establish persistent storage for session state from the outset. This is the highest-risk phase.

**Key Features Implemented:** Core AI response generation (questions, feedback, alternatives), basic session state saving/loading.

**Files to Create/Modify:**

*   `prisma/schema.prisma`: Define database models for `User`, `MvpJdResumeText`, and `MvpSessionData`. `MvpSessionData` must include fields to store the conversation transcript (user input, AI question), and for each AI turn, the generated basic feedback points and suggested alternative response.
*   `lib/db.ts`: Implement or finalize the database connection using Prisma client.
*   `lib/personaService.ts`: Implement the service to provide the hardcoded definition for the "Technical Lead" persona (including its system prompt).
*   `lib/gemini.ts`: Implement the core functions:
    *   `buildSystemInstructions(jdResumeText, persona)`: Helper to combine context and persona prompt.
    *   `buildConversationHistory(history)`: Helper to format history for Gemini API.
    *   `parseAiResponse(rawText)`: Helper to extract structured data (question, feedback, alternative) from Gemini's raw text response based on defined delimiters.
    *   `getFirstQuestion(jdResumeText, persona)`: Calls Gemini, builds prompt, parses response, returns just the first question text.
    *   `continueInterview(jdResumeText, persona, history, currentUserResponse)`: Calls Gemini with full context, parses response, returns structured data (`MvpAiResponse` containing next question, feedback points, alternative).
*   `app/api/mvp-sessions/[id]/route.ts`: Implement the backend API route for active sessions.
    *   **GET:** Load existing session state (timer, last question) from the database by ID and return it to the frontend.
    *   **POST:**
        *   Receive user's text response from the frontend.
        *   Load the session state, associated `MvpJdResumeText`, and current `PersonaId` (from session data) from the database.
        *   Call `lib/personaService.getPersona(currentPersonaId)`.
        *   Call `lib/gemini.ts.continueInterview(jdResumeText, persona, history, currentUserResponse)`.
        *   **Crucially, update the `MvpSessionData` in the database:** Add the user's response and the *full structured response* from `gemini.ts` (AI question, feedback, alternative) to the session's history/turns array. Update timer/status.
        *   Return the *next question text* and perhaps basic immediate feedback hints to the frontend.
*   *(Spike/Testing)*: Add temporary script or internal endpoint to manually test `lib/gemini.ts` functions with various inputs (sample JD/Resume, different user responses, varying history lengths) to evaluate the quality and relevance of generated questions, feedback, and alternative responses *before* connecting the frontend.

**User Flow & Test Cases (Covered in this phase):**

*   Backend processing of JD/Resume text (via parameters).
*   Backend generation of initial and dynamic follow-up questions.
*   Backend analysis of user responses and generation of feedback/alternatives (logic exists, but validation done via spike).
*   Backend persistent storage of session state and conversation history (including generated feedback/alternatives per turn).
*   Backend retrieval of basic session state.

---

## Phase 2: Backend API Completion

**Goal:** Implement the remaining backend APIs required for the MVP flow, leveraging the database setup and core AI logic from Phase 1.

**Key Features Implemented:** Saving/Retrieving JD/Resume text, Session creation API, Report Data API.

**Files to Create/Modify:**

*   `app/api/mvp-jd-resume/route.ts`: Implement API endpoints to save (POST) and retrieve (GET) the user's current copy-pasted JD/Resume text in the `MvpJdResumeText` table in the database, linked to the user ID (initial link, full auth linking in Phase 4).
*   `app/api/mvp-sessions/route.ts`: Implement the API endpoint to create a new session.
    *   **POST:** Receive request to start a new session.
        *   Retrieve the current `MvpJdResumeText` for the user.
        *   Create a new record in the `MvpSessionData` table in the database, linking it to the user and `MvpJdResumeText`. Initialize state (timer, empty history).
        *   Retrieve the "Technical Lead" persona using `lib/personaService`.
        *   Call `lib/gemini.ts.getFirstQuestion(...)` to get the first question.
        *   Update the new session record in the DB with the first question.
        *   Return the new session ID and the first question text to the frontend.
*   `app/api/mvp-sessions/[id]/report/route.ts`: Implement the API endpoint to provide data for the report.
    *   **GET:** Receive session ID.
        *   Fetch the complete `MvpSessionData` record from the database by ID (which includes the full history with user answers, AI questions, AI feedback, and AI alternatives per turn, saved in Phase 1).
        *   Format this data into the structure expected by the frontend `ReportViewer` component.
        *   Return the formatted report data.

**User Flow & Test Cases (Covered in this phase):**

*   Saving and retrieving user's copy/pasted text on the backend.
*   Backend creation of a new session instance in the database upon request.
*   Backend fetching of all data needed to display the report from the database.

---

## Phase 3: Frontend Interview UI & Reporting

**Goal:** Build the client-side interface for conducting text interviews and viewing reports, connecting them to the backend APIs.

**Key Features Implemented:** Text chat UI, Timer display, Report display (transcript, feedback, alternatives).

**Files to Create/Modify:**

*   `components/UI/Timer.tsx`: Simple React component to display a countdown timer.
*   `components/Sessions/InterviewUI/TextInterviewUI.tsx`: React component for the chat interface.
    *   Displays the conversation history (user and AI turns).
    *   Displays the current AI question.
    *   Provides a text input area for user responses.
    *   Manages local UI state related to the chat (e.g., input text, loading state).
    *   Calls the `/api/mvp-sessions/[id]` POST endpoint when the user submits an answer.
    *   Receives and displays the next question from the API response.
*   `components/Sessions/QuestionFeedback.tsx`: React component to display one Q&A pair from the report, including the AI question, user answer, basic feedback, and suggested alternative.
*   `components/Sessions/ReportViewer.tsx`: React component to structure and display the full report.
    *   Receives formatted report data (from `/api/mvp-sessions/[id]/report`) as props.
    *   Displays the overall summary (simple placeholder for MVP).
    *   Iterates through the Q&A history and renders `QuestionFeedback.tsx` for each turn.
*   `app/(protected)/sessions/[id]/page.tsx`: Frontend page for the interview simulation.
    *   Fetches initial session state (current question, timer start time) from `/api/mvp-sessions/[id]` GET endpoint on load.
    *   Manages the session timer using `UI/Timer.tsx`.
    *   Renders `TextInterviewUI.tsx`, passing necessary data and handlers (like the submit function that calls the backend API).
    *   Implements the "End Session" button, calling the backend `/api/mvp-sessions/[id]` endpoint to signal termination and then redirecting to the report page.
*   `app/(protected)/sessions/[id]/report/page.tsx`: Frontend page for viewing the report.
    *   Fetches the report data from `/api/mvp-sessions/[id]/report` GET endpoint on load.
    *   Renders `ReportViewer.tsx`, passing the fetched data.
    *   Includes a button/link to navigate back to the dashboard.

**User Flow & Test Cases (Covered in this phase):**

*   Seeing the interview simulation page load with the first question.
*   Interacting with the chat interface (typing answers, submitting).
*   Seeing dynamic follow-up questions appear in the chat.
*   Observing the timer counting down.
*   Ending the session via button or timer timeout.
*   Seeing the report page load correctly after a session.
*   Viewing the transcript, basic feedback, and suggested alternatives in the report.
*   Navigating from the report back to the dashboard (though dashboard content is minimal until Phase 4).

---

## Phase 4: Dashboard, Basic History & Authentication

**Goal:** Implement user authentication, secure the application, and build the dashboard as the entry point for managing JD/Resume text and viewing past sessions.

**Key Features Implemented:** User Authentication (Google), Protected Routes, Copy/Paste Input Form, Session History List (linked to current text and user).

**Files to Create/Modify:**

*   `lib/auth.ts`: Configure NextAuth with Google Provider. Define session callbacks to include user ID.
*   `app/api/auth/[...nextauth]/route.ts`: Implement the NextAuth API route handler.
*   `middleware.ts`: Implement Next.js middleware to protect the `/(protected)` route group, redirecting unauthenticated users to `/login`.
*   `components/Auth/GoogleSignInButton.tsx`: Simple component to initiate Google OAuth flow.
*   `components/Auth/SessionProvider.tsx`: Client component to wrap the app/layout and provide session context via `useSession`.
*   `app/login/page.tsx`: Frontend login page rendering `GoogleSignInButton.tsx`.
*   `app/(protected)/layout.tsx`: Layout file for protected routes, using `SessionProvider` and potentially checking session status to display loading/access denied states or trigger middleware.
*   `app/page.tsx`: Root landing page. Add logic to check authentication status (e.g., using `useSession` or server-side check) and redirect to `/dashboard` if authenticated, or `/login` otherwise.
*   **Update all backend APIs (`mvp-jd-resume`, `mvp-sessions`, `mvp-sessions/[id]`, `mvp-sessions/[id]/report`):** Modify these APIs to retrieve the authenticated user's ID from the session (`auth().userId` or similar depending on NextAuth setup) and use this ID to filter database queries and associate new data (JD/Resume text, sessions) with the correct user. Data is now scoped per user.
*   **Update all frontend pages/components calling APIs:** Modify `utils/api.ts` calls and the pages/components that use them (`app/(protected)/dashboard/page.tsx`, `app/(protected)/sessions/[id]/page.tsx`, `app/(protected)/sessions/[id]/report/page.tsx`) to correctly pass/handle user context, typically implicitly handled by NextAuth headers/cookies when calling `/api` routes.
*   `components/MvpJdResumeInputForm.tsx`: React component for the copy/paste text areas and "Start Session" button. Calls `utils/api.ts` functions (`saveMvpJdResumeText`, `createMvpSession`). Should load existing text using `loadMvpJdResumeText` on mount.
*   `components/MvpSessionHistoryList.tsx`: React component to display the list of past sessions. Calls a new `utils/api.ts` function (`listMvpSessions`) which calls a new or modified backend API endpoint (e.g., add GET to `/api/mvp-sessions` or a new `/api/mvp-sessions/list`) to fetch sessions *for the current user* associated with their *current* JD/Resume text. Displays session entries and links to the report pages.
*   `app/(protected)/dashboard/page.tsx`: Frontend dashboard page. Fetches user's current JD/Resume text and list of past sessions using the updated `utils/api.ts` functions. Renders `MvpJdResumeInputForm.tsx` and `MvpSessionHistoryList.tsx`.

**User Flow & Test Cases (Covered in this phase):**

*   Successfully signing in with Google.
*   Being redirected to `/dashboard` after sign-in.
*   Being redirected to `/login` if trying to access protected routes while logged out.
*   Copying/pasting JD/Resume text and saving it.
*   Seeing the last saved JD/Resume text persist after logging out and back in.
*   Starting a session from the dashboard using the current text.
*   Seeing completed sessions listed in the history on the dashboard.
*   Clicking a history item to view the session report.
*   Verifying that sessions and JD/Resume text are specific to the logged-in user and not visible to others.