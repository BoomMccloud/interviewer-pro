.
├── node_modules/                                                    ✅ Exists
├── public/           # Static assets (images, fonts, etc.)            ✅ Exists
├── src/              # Main application source code                     ✅ Exists
│   ├── app/          # App Router routes and UI                       ✅ Exists
│   │   ├── api/      # API Routes                                     ✅ Exists
│   │   │   ├── auth/   # NextAuth API route handler                   ✅ Exists
│   │   │   │   └── [...nextauth]/                                   ✅ Exists
│   │   │   │       └── route.ts   # Handles auth requests (login, logout, session) ✅ Exists
│   │   │   ├── trpc/   # tRPC handler                                 ✅ Exists (Deviation: Using tRPC)
│   │   │   │   └── [trpc]/                                          ✅ Exists
│   │   │   │       └── route.ts   # Main tRPC API endpoint handler    ✅ Exists
│   │   │   ├── jds/    # API for managing Job Description Targets (Likely handled by tRPC routers now)
│   │   │   │   ├── route.ts       # GET (list), POST (create) JDs
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts   # GET (single), DELETE JD
│   │   │   ├── sessions/ # API for managing interview sessions (Likely handled by tRPC routers now)
│   │   │   │   ├── route.ts       # POST (create session)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts   # GET (session state), POST (submit user answer, get next question)
│   │   │   │       └── report/
│   │   │   │           └── route.ts # GET (session report data)
│   │   ├── (protected)/ # Grouping for routes requiring authentication (Good practice)
│   │   │   ├── dashboard/ # User's main dashboard - My JDs list
│   │   │   │   └── page.tsx       # Renders the list of JD Targets
│   │   │   ├── jds/     # JD Target management pages
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx   # Page for adding a new JD Target (input form)
│   │   │   │   └── [id]/  # Dynamic route for a specific JD Target
│   │   │   │       ├── page.tsx   # JD Target Overview (shows past sessions, start new session button)
│   │   │   │       └── configure-session/
│   │   │   │           └── page.tsx # Page to configure panel, mode, duration for a session
│   │   │   ├── sessions/ # Interview session pages
│   │   │   │   └── [id]/  # Dynamic route for an active or completed session
│   │   │   │       ├── page.tsx   # The actual interview simulation page (Text, Voice, Avatar UI)
│   │   │   │       └── report/
│   │   │   │           └── page.tsx # Page displaying the post-interview report
│   │   │   ├── account/ # User account settings page
│   │   │   │   └── page.tsx
│   │   │   └── subscription/ # Subscription management page
│   │   │       └── page.tsx
│   │   ├── login/    # Login page (handles unauthenticated users)
│   │   │   └── page.tsx
│   │   ├── layout.tsx # Root layout for the entire application (sets up providers, handles global styles)
│   │   └── page.tsx   # Root landing page (could redirect based on auth status)
│   │   └── _components/ # Components co-located with routes/pages    ✅ Exists (Alternative to global src/components)
│   ├── components/   # Reusable React components (Global or common components)
│   │   ├── Auth/           # Auth-related components
│   │   │   ├── GoogleSignInButton.tsx # Button to initiate Google login
│   │   │   └── SessionProvider.tsx    # NextAuth session provider wrapper component
│   │   ├── UI/             # Basic, general-purpose UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── Timer.tsx       # Component to display/manage countdown
│   │   ├── Jds/            # Components specific to JD Target management
│   │   │   ├── JdCard.tsx        # Displays a single JD Target in the list
│   │   │   └── JdForm.tsx        # Form for adding/editing JD details (upload/link input)
│   │   ├── Sessions/       # Components specific to interview sessions and reports
│   │   │   ├── SessionConfigForm.tsx # Form for configuring panel, mode, duration
│   │   │   ├── InterviewUI/      # Components for different interview modes
│   │   │   │   ├── TextInterviewUI.tsx    # Chat-based interface
│   │   │   │   ├── VoiceInterviewUI.tsx   # Video-call style with audio input
│   │   │   │   └── AvatarInterviewUI.tsx  # Video-call style with avatar
│   │   │   ├── ReportViewer.tsx      # Main component to display the report structure
│   │   │   ├── QuestionFeedback.tsx  # Displays feedback and alternative response for one question
│   │   │   └── PronunciationReport.tsx # Displays pronunciation analysis (separate component)
│   │   └── Layout/         # Layout components used within pages (optional, could be in app)
│   │       └── AppShell.tsx    # Basic structural layout (Header placeholder, main content area)
│   ├── lib/            # Backend-specific libraries or helpers         ✅ Exists
│   │   ├── auth.ts         # NextAuth configuration helper or core logic (see also src/server/auth and app/api/auth)
│   │   ├── db.ts           # Database connection/client setup (if using a DB) ✅ Created
│   │   ├── gemini.ts       # Core AI Engine and API Client for Gemini.   ✅ Exists
│   │   │   # Encapsulates interaction with the Gemini API.
│   │   │   # Handles prompt construction using JD/Resume text, session history, and persona details.
│   │   │   # Provides functions to generate initial questions, dynamic follow-up questions,
│   │   │   # analyze user responses, generate basic feedback points, and suggest alternative answers.
│   │   │   # (Future: Will also handle integration with STT/TTS/streaming for voice mode).
│   │   │   # Called by backend API routes (e.g., /api/mvp-sessions/[id] or tRPC procedures).
│   |   ├── personaService.ts
│   │   # Handles retrieving interviewer persona definitions (system prompts, names, descriptions, asset URLs).
│   │   # Acts as the source of truth for persona data, potentially loading from config files or a database.
│   │   # Used by backend services/APIs (like session handling or tRPC procedures) to get persona details needed for AI interaction.
│   │   ├── parsingService.ts # Client for the 3rd party PDF/Link parsing service
│   │   └── utils.ts        # Backend utility functions (not exposed to frontend)
│   ├── server/         # Server-side specific code, esp. for tRPC     ✅ Exists (Deviation: Using tRPC)
│   │   ├── api/          # tRPC API structure                         ✅ Exists
│   │   │   ├── root.ts   # Root tRPC router merging all sub-routers (ensure this exists or is index.ts)
│   │   │   └── routers/  # tRPC routers defining API procedures       ✅ Exists
│   │   │       # Example: root.ts, jdRouters.ts, sessionRouters.ts (Actual structure to be defined here)
│   │   │       ├── user.ts # Optional: for user-specific procedures if not in a general router
│   │   │       ├── jdResume.ts # tRPC router for Job Description & Resume text management
│   │   │       ├── session.ts  # tRPC router for interview session management (create, get, submit answer, report)
│   │   │       └── index.ts    # Typically aggregates and exports routers, or acts as the root router
│   │   ├── auth/         # Core authentication logic/config             ✅ Exists
│   │   ├── db.ts         # Prisma client instance (could be re-exported from /lib or defined here)
│   │   └── api.ts        # Functions to make API calls (e.g., to tRPC procedures if using tRPC client)
│   ├── utils/          # Frontend utility functions and helpers       ✅ Exists (but may be empty)
│   │   ├── api.ts          # Functions to make API calls (e.g., to tRPC procedures if using tRPC client)
│   │   ├── constants.ts    # Application-wide constants (e.g., subscription tiers, route paths)
│   │   └── formatters.ts   # Data formatting functions (e.g., dates)
│   ├── types/          # TypeScript type definitions                  ✅ Exists (but may be empty)
│   │   └── index.ts        # Central file for interface/type exports
│   ├── middleware.ts   # Next.js middleware (e.g., for auth protection)
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


src/app/ (Routes & Pages)
app/api/auth/[...nextauth]/route.ts: Configures and initializes NextAuth. ✅ Exists. This is where you define authentication providers (like Google), callbacks, etc. Handles all /api/auth/* requests.
app/api/trpc/[trpc]/route.ts: Main tRPC API endpoint handler. ✅ Exists. All tRPC procedure calls from the client will go through this route.

(Original descriptions for app/api/jds and app/api/sessions are now less relevant if using tRPC. API logic would be in tRPC routers under src/server/api/routers/)

app/(protected)/dashboard/page.tsx: The main dashboard page components. Fetches data (e.g., list of JD targets) likely using a tRPC client (if tRPC is used) and renders them.
app/(protected)/jds/new/page.tsx: Renders the form for users to input JD/Resume details. Handles form submission, likely calling a tRPC mutation.
app/(protected)/jds/[id]/page.tsx: Renders the overview for a specific JD target. Fetches JD details and past sessions for this JD (via tRPC). Includes a button to navigate to the configure session page.
app/(protected)/jds/[id]/configure-session/page.tsx: Renders the form for the user to select interviewers, mode, and duration. Handles submission to create a session (via tRPC) and redirects to the session page.
app/(protected)/sessions/[id]/page.tsx: The dynamic page where the interview simulation takes place. Manages session state and calls tRPC procedures for submitting answers and getting next questions. Displays the timer.
app/(protected)/sessions/[id]/report/page.tsx: Renders the post-interview report. Fetches report data (via tRPC) and uses components to display it.
app/(protected)/account/page.tsx: User account settings page.
app/(protected)/subscription/page.tsx: Displays current subscription tier and options to upgrade.
app/login/page.tsx: Simple page with a "Sign in with Google" button that uses NextAuth's client-side signIn function.
app/layout.tsx: The root layout. Wraps the entire application with necessary providers like NextAuth's SessionProvider and tRPC Provider. Includes global styles. ✅ Exists (implicitly)
app/page.tsx: The main entry point. Could be a simple landing page or contain logic to redirect. ✅ Exists (implicitly)
src/app/_components/: Directory for co-located or shared components within the app router. ✅ Exists.

src/components/ (Reusable UI Components - Global)
(This section describes a potential global component structure. If components are primarily in src/app/_components/ or feature-specific directories, this global dir might be less populated initially.)
Auth/SessionProvider.tsx: A client component that wraps parts of your application to make the session context available via useSession().
Auth/GoogleSignInButton.tsx: A simple button component that, when clicked, calls signIn('google') from next-auth/react.
UI/: Contains basic, presentational components used throughout the app.
Jds/JdCard.tsx: Displays a summary view of a single JD Target.
Jds/JdForm.tsx: A form component handling JD/Resume details.
Sessions/SessionConfigForm.tsx: A form allowing session configuration.
Sessions/InterviewUI/: Subdirectory containing UI for different interview modes.
Sessions/ReportViewer.tsx: Takes structured report data and renders it.
Sessions/QuestionFeedback.tsx: Renders details for a single question.
Sessions/PronunciationReport.tsx: Renders pronunciation analysis.
Layout/AppShell.tsx: Optional structural component.

src/lib/ (Backend Libraries/Services) ✅ Exists
lib/auth.ts: Contains core NextAuth configuration options or helpers used by `src/app/api/auth/[...nextauth]/route.ts` and/or `src/server/auth/`.
lib/db.ts: Database connection logic using Prisma client. ✅ Created.
lib/gemini.ts: Service to encapsulate calls to the Gemini API. ✅ Exists. Called by tRPC procedures.
lib/parsingService.ts: Client/function to call 3rd party parsing service. (Used by tRPC procedures if creating JDs).
lib/personaService.ts: Handles retrieving interviewer persona definitions. (Used by tRPC procedures).
lib/utils.ts: Backend-specific helper functions.

src/server/ (Server-side specific code) ✅ Exists
src/server/api/routers/: Contains tRPC router definitions. ✅ Exists. This is where backend API logic (procedures/resolvers) for JDs, sessions, reports, etc., will reside. Example: `root.ts` (or `index.ts` in this dir), `jdResume.ts`, `session.ts`.
src/server/auth/: Core NextAuth.js server-side logic, configurations, or callbacks. ✅ Exists. Works in conjunction with `src/app/api/auth/[...nextauth]/route.ts`.

src/utils/ (Frontend Utility Functions) ✅ Exists
utils/api.ts: Contains functions that wrap tRPC client calls to your backend API procedures.
utils/constants.ts: Defines application-wide constants.
utils/formatters.ts: Pure functions for formatting data.

src/types/ (TypeScript Definitions) ✅ Exists
types/index.ts: Contains TypeScript interface and type definitions.

src/middleware.ts:
A Next.js middleware file to protect routes.