.
├── node_modules/                                                    ✅ Exists
├── public/           # Static assets (images, fonts, etc.)            ✅ Exists
├── src/              # Main application source code                     ✅ Exists
│   ├── app/          # App Router routes and UI                       ✅ Exists
│   │   ├── api/      # API Routes                                     ✅ Exists
│   │   │   ├── auth/   # NextAuth API route handler                   ✅ Exists
│   │   │   │   └── [...nextauth]/                                   ✅ Exists
│   │   │   │       └── route.ts   # Handles auth requests (login, logout, session) ✅ Exists
│   │   │   ├── trpc/   # tRPC handler                                 ✅ Exists
│   │   │   │   └── [trpc]/                                          ✅ Exists
│   │   │   │       └── route.ts   # Main tRPC API endpoint handler    ✅ Exists
│   │   ├── (protected)/ # Grouping for routes requiring authentication ✅ Exists
│   │   │   ├── dashboard/ # User's main dashboard - Contains copy/paste inputs and session history list
│   │   │   │   └── page.tsx       # Renders the input form and history list
│   │   │   ├── sessions/ # Interview session pages
│   │   │   │   └── [id]/  # Dynamic route for an active or completed MVP session
│   │   │   │       ├── page.tsx   # The text-only interview simulation page (MVP UI)
│   │   │   │       └── report/
│   │   │   │           └── page.tsx # Page displaying the basic post-interview report
│   │   │   └── layout.tsx # Root layout for protected routes (handles auth check)
│   │   ├── login/    # Login page (handles unauthenticated users)
│   │   │   └── page.tsx
│   │   ├── layout.tsx # Root layout for the entire application (sets up providers, handles global styles)
│   │   └── page.tsx   # Root landing page (could redirect based on auth status)
│   │   └── _components/ # Components co-located with routes/pages    ✅ Exists (May contain some MVP components)
│   ├── components/   # Reusable React components (Global or common components for MVP)
│   │   ├── Auth/           # Auth-related components
│   │   │   ├── GoogleSignInButton.tsx # Button to initiate Google login
│   │   │   └── SessionProvider.tsx    # NextAuth session provider wrapper component
│   │   ├── UI/             # Basic, general-purpose UI components (Button, Input, Timer)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Timer.tsx       # Component to display/manage countdown
│   │   ├── MvpJdResumeInputForm.tsx # Component for JD/Resume text input
│   │   ├── MvpSessionHistoryList.tsx # Component for displaying past MVP session list
│   │   ├── Sessions/       # Components specific to MVP interview sessions and reports
│   │   │   ├── InterviewUI/
│   │   │   │   └── TextInterviewUI.tsx    # Chat-based interface component for text interviews
│   │   │   ├── ReportViewer.tsx      # Main component to display the report structure
│   │   │   ├── QuestionFeedback.tsx  # Displays question, answer, basic feedback, and suggested alternative
│   │   │   ├── SessionOverview.tsx   # Session metadata, duration, and performance summary 🆕 Phase 2
│   │   │   ├── SessionTimeline.tsx   # Chronological Q&A display with timestamps 🆕 Phase 2
│   │   │   ├── SessionAnalytics.tsx  # Performance charts and visual metrics 🆕 Phase 2
│   │   │   ├── SessionFeedback.tsx   # AI-generated feedback and recommendations 🆕 Phase 2
│   │   │   ├── QuestionAnswerCard.tsx # Individual Q&A display component 🆕 Phase 2
│   │   │   ├── PerformanceChart.tsx  # Chart visualization for performance data 🆕 Phase 2
│   │   │   └── FeedbackCard.tsx      # Individual feedback section display 🆕 Phase 2
│   │   └── Layout/         # Basic layout components (optional)
│   │       └── ...
│   ├── lib/            # Backend-specific libraries or helpers         ✅ Exists
│   │   ├── auth.ts         # NextAuth configuration details (Potentially more in src/server/auth)
│   │   ├── gemini.ts       # Wrapper/client for interacting with the Gemini API. ✅ Exists
│   │   ├── personaService.ts # Handles providing the hardcoded "Technical Lead" persona definition. ✅ Exists
│   │   └── utils.ts        # Backend utility functions (if any, distinct from frontend utils)
│   ├── server/         # Server-side specific code, esp. for tRPC     ✅ Exists
│   │   ├── api/          # tRPC API structure                         ✅ Exists
│   │   │   ├── root.ts   # Main tRPC router merging all sub-routers ✅ Exists
│   │   │   └── routers/  # tRPC routers defining API procedures       ✅ Exists
│   │   │       ├── jdResume.ts # tRPC router for JD/Resume text management ✅ Exists
│   │   │       └── session.ts  # tRPC router for interview session management ✅ Exists
│   │   ├── auth/         # Core server-side NextAuth logic (e.g., callbacks, adapter config if not in lib/auth.ts) ✅ Exists
│   │   └── db.ts         # Prisma client instance (re-exported from here) ✅ Exists
│   ├── utils/          # Frontend utility functions and helpers       ✅ Exists
│   │   ├── api.ts          # Functions to make API calls to tRPC procedures using the tRPC client
│   │   ├── constants.ts    # Application-wide constants
│   │   └── formatters.ts   # Data formatting functions
│   ├── types/          # TypeScript type definitions                  ✅ Exists
│   │   └── index.ts        # Central file for interface/type exports
│   ├── middleware.ts   # Next.js middleware (for protected route authentication)
│   └── globals.css     # Global styles                                ✅ Exists
├── .env.local        # Environment variables (API keys, DB connection, etc.) ✅ Exists (or .env)
├── .env              # Actual environment file used                   ✅ Exists
├── .env.example      # Example environment file                       ✅ Exists
├── .gitignore        # Specifies intentionally untracked files        ✅ Exists
├── eslint.config.js  # ESLint configuration                           ✅ Exists
├── jest.config.js    # Jest test runner configuration                 ✅ Exists
├── next-env.d.ts     # Next.js TypeScript declarations                ✅ Exists
├── next.config.js    # Next.js configuration                          ✅ Exists
├── package.json                                                       ✅ Exists
├── postcss.config.js # PostCSS configuration                          ✅ Exists
├── prettier.config.js # Prettier code formatter configuration         ✅ Exists
├── README.md         # Project README                                 ✅ Exists
├── tailwind.config.js # Tailwind CSS configuration (if used)
└── tsconfig.json     # TypeScript configuration                       ✅ Exists


### MVP Key File Descriptions:

**`src/app/` (Routes & Pages - MVP Focus)**

*   `app/api/auth/[...nextauth]/route.ts`: Handles auth requests (login, logout, session) via NextAuth.
*   `app/api/trpc/[trpc]/route.ts`: Main tRPC API endpoint handler.
*   `app/(protected)/dashboard/page.tsx`: Renders `MvpJdResumeInputForm.tsx` and `MvpSessionHistoryList.tsx`. Handles calling tRPC procedures to save/load JD/Resume text and start sessions.
*   `app/(protected)/sessions/[id]/page.tsx`: Renders `Sessions/InterviewUI/TextInterviewUI.tsx`. Manages client-side session state display (timer, current question) and sends user responses by calling tRPC procedures.
*   `app/(protected)/sessions/[id]/report/page.tsx`: Fetches session data using tRPC procedures (primarily `session.getSessionById`) and renders it using `Sessions/ReportViewer.tsx`.
*   `app/(protected)/layout.tsx`: Root layout for protected routes, handles authentication checks.
*   `app/login/page.tsx`: Page for user login, likely with `GoogleSignInButton.tsx`.
*   `app/layout.tsx`: The root layout for the entire application. Wraps the application with providers like `SessionProvider.tsx` and tRPC Provider.
*   `app/page.tsx`: Root landing page, typically handles redirection based on authentication status.
*   `src/app/_components/`: Can be used for components specific to a route or shared within `app/`.

**`src/components/` (Reusable UI Components - MVP Focus)**

*   `Auth/GoogleSignInButton.tsx`: Button to initiate Google Sign-In.
*   `Auth/SessionProvider.tsx`: NextAuth session provider to wrap the app.
*   `UI/Button.tsx`, `UI/Input.tsx`, `UI/Timer.tsx`: Basic UI elements.
*   `MvpJdResumeInputForm.tsx`: Form for users to paste JD and Resume text.
*   `MvpSessionHistoryList.tsx`: Component to list past interview sessions for the current JD/Resume.
*   `Sessions/InterviewUI/TextInterviewUI.tsx`: The text-based chat interface for the interview.
*   `Sessions/ReportViewer.tsx`: Displays the post-interview report.
*   `Sessions/QuestionFeedback.tsx`: Component to display a single question, its answer, feedback, and suggested alternative.

**`src/lib/` (Backend Libraries/Services - MVP Focus)**

*   `lib/auth.ts` (or `src/server/auth/`): Contains NextAuth configuration options.
*   `lib/gemini.ts`: Service to interact with the Google Gemini API for generating questions and feedback.
*   `lib/personaService.ts`: Provides the hardcoded "Technical Lead" persona for the MVP.
*   `lib/utils.ts`: General backend utility functions.

**`src/server/` (Server-side tRPC Logic - MVP Focus)**

*   `src/server/api/root.ts`: The main tRPC router that merges all other routers.
*   `src/server/api/routers/jdResume.ts`: tRPC router with procedures:
    *   `saveJdResumeText`: Saves/updates the user's current JD/Resume text.
    *   `getJdResumeText`: Retrieves the user's current JD/Resume text.
*   `src/server/api/routers/session.ts`: tRPC router with procedures:
    *   `createSession`: Creates a new interview session, gets the first question from Gemini.
    *   `submitAnswerToSession`: Submits user's answer, gets next question/feedback from Gemini, updates session.
    *   `getSessionById`: Retrieves session data for display (e.g., for the report).
*   `src/server/auth/`: Server-side NextAuth logic if not fully in `lib/auth.ts`.
*   `src/server/db.ts`: Exports the Prisma client instance.

**`src/utils/` (Frontend Utility Functions - MVP Focus)**

*   `utils/api.ts`: Contains typed helper functions for calling tRPC procedures from the client.
*   `utils/constants.ts`: Application-wide constants (e.g., route paths).
*   `utils/formatters.ts`: Data formatting functions.

**`src/types/` (TypeScript Definitions - MVP Focus)**

*   `types/index.ts`: Central place for common TypeScript interfaces and types used across the MVP.

**`src/middleware.ts`**
*   Next.js middleware used for protecting routes, redirecting unauthenticated users to the login page.

This structure is focused on delivering the MVP features as defined in `project_planning/mvp.md`.
As the project evolves, this file can be updated to reflect new features and architectural changes.
(Ensure to remove or comment out any detailed descriptions of non-MVP features below this point if they exist from the previous version).