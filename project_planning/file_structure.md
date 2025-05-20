.
├── node_modules/
├── public/           # Static assets (images, fonts, etc.)
├── src/              # Main application source code
│   ├── app/          # App Router routes and UI
│   │   ├── api/      # API Routes
│   │   │   ├── auth/   # NextAuth API route handler
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts   # Handles auth requests (login, logout, session)
│   │   │   ├── jds/    # API for managing Job Description Targets
│   │   │   │   ├── route.ts       # GET (list), POST (create) JDs
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts   # GET (single), DELETE JD
│   │   │   ├── sessions/ # API for managing interview sessions
│   │   │   │   ├── route.ts       # POST (create session)
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts   # GET (session state), POST (submit user answer, get next question)
│   │   │   │       └── report/
│   │   │   │           └── route.ts # GET (session report data)
│   │   ├── (protected)/ # Grouping for routes requiring authentication (optional, but good practice)
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
│   ├── components/   # Reusable React components
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
│   ├── lib/            # Backend-specific libraries or helpers used by API routes
│   │   ├── auth.ts         # NextAuth configuration
│   │   ├── db.ts           # Database connection/client setup (if using a DB)
│   │   ├── gemini.ts       # Wrapper/client for interacting with the Gemini API
│   │   ├── parsingService.ts # Client for the 3rd party PDF/Link parsing service
│   │   └── utils.ts        # Backend utility functions (not exposed to frontend)
│   ├── utils/          # Frontend utility functions and helpers
│   │   ├── api.ts          # Functions to make API calls to /api routes
│   │   ├── constants.ts    # Application-wide constants (e.g., subscription tiers, route paths)
│   │   └── formatters.ts   # Data formatting functions (e.g., dates)
│   ├── types/          # TypeScript type definitions
│   │   └── index.ts        # Central file for interface/type exports
│   ├── middleware.ts   # Next.js middleware (e.g., for auth protection)
│   └── globals.css     # Global styles
├── .env.local        # Environment variables (API keys, DB connection, etc.)
├── next.config.js    # Next.js configuration
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json


src/app/ (Routes & Pages)
app/api/auth/[...nextauth]/route.ts: Configures and initializes NextAuth. This is where you define authentication providers (like Google), callbacks, etc. Handles all /api/auth/* requests.
app/api/jds/route.ts: Defines API endpoints for fetching a list of the user's JD targets (GET) and creating a new JD target (POST). The POST request would trigger the parsing process using the lib/parsingService.ts.
app/api/jds/[id]/route.ts: Defines API endpoints for fetching a specific JD target (GET) and deleting one (DELETE).
app/api/sessions/route.ts: Defines the API endpoint for creating a new interview session instance based on a JD target and configuration (POST). This would likely call the backend logic to generate initial questions.
app/api/sessions/[id]/route.ts: The core API for the active interview. Handles fetching the current session state (GET), receiving a user's answer (POST), sending the answer to the AI logic (lib/gemini.ts), receiving the AI's dynamic follow-up question, and potentially handling session termination.
app/api/sessions/[id]/report/route.ts: API endpoint to fetch the data needed to render the post-interview report for a completed session (GET). The backend would process the session data and generate the structured report content.
app/(protected)/dashboard/page.tsx: The main dashboard page components. Fetches the list of JD targets using utils/api.ts and renders them using components/Jds/JdList.tsx and JdCard.tsx.
app/(protected)/jds/new/page.tsx: Renders the form (components/Jds/JdForm.tsx) for users to input JD/Resume details (upload or link). Handles form submission calling utils/api.ts.
app/(protected)/jds/[id]/page.tsx: Renders the overview for a specific JD target. Fetches JD details and a list of past sessions for this JD. Includes a button to navigate to the configure session page.
app/(protected)/jds/[id]/configure-session/page.tsx: Renders the form (components/Sessions/SessionConfigForm.tsx) for the user to select interviewers, mode, and duration. Handles submission to create a session via utils/api.ts and redirects to the session page.
app/(protected)/sessions/[id]/page.tsx: The dynamic page where the interview simulation takes place. Based on the session mode, it renders components/Sessions/InterviewUI/TextInterviewUI.tsx, VoiceInterviewUI.tsx, or AvatarInterviewUI.tsx. Manages the session state (current question, user input) and calls the /api/sessions/[id] endpoint to get the next question after a user response. Displays the timer (components/UI/Timer.tsx).
app/(protected)/sessions/[id]/report/page.tsx: Renders the post-interview report. Fetches report data from /api/sessions/[id]/report and uses components/Sessions/ReportViewer.tsx to display it.
app/(protected)/account/page.tsx: User account settings page.
app/(protected)/subscription/page.tsx: Displays current subscription tier and options to upgrade (based on plan data, maybe fetched from /api/account/subscription - this API route would be added).
app/login/page.tsx: Simple page with a "Sign in with Google" button (components/Auth/GoogleSignInButton.tsx) that uses NextAuth's client-side signIn function.
app/layout.tsx: The root layout. Wraps the entire application with necessary providers like NextAuth's SessionProvider (components/Auth/SessionProvider.tsx) and potentially state management providers. Includes global styles (globals.css).
app/page.tsx: The main entry point. Could be a simple landing page or contain logic to redirect authenticated users to /dashboard and unauthenticated users to /login.
src/components/ (Reusable UI Components)
Auth/SessionProvider.tsx: A client component that wraps parts of your application (typically in app/layout.tsx) to make the session context available via useSession().
Auth/GoogleSignInButton.tsx: A simple button component that, when clicked, calls signIn('google') from next-auth/react.
UI/: Contains basic, presentational components used throughout the app (e.g., a styled button, input field, modal wrapper, loading spinner, a timer display).
Jds/JdCard.tsx: Displays a summary view of a single JD Target on the dashboard (e.g., Job Title, date added, link to view/practice).
Jds/JdForm.tsx: A form component handling the input fields for JD/Resume details (file upload inputs, link text inputs). Manages local form state and validation.
Sessions/SessionConfigForm.tsx: A form allowing the user to review and adjust the generated panel (basic removal), select the interview mode, and set the duration.
Sessions/InterviewUI/: Subdirectory containing the specific UI components for each interview mode. These components receive the current question and session state and handle rendering the specific interface and capturing user input (text, voice). They communicate user input back up to the parent session page.
Sessions/ReportViewer.tsx: This component takes the structured report data fetched from the API and renders it in a user-friendly format, utilizing QuestionFeedback.tsx and PronunciationReport.tsx components.
Sessions/QuestionFeedback.tsx: Renders the details for a single question, including the question, user answer, specific feedback points (content, level, structure), and the suggested alternative response.
Sessions/PronunciationReport.tsx: Renders the dedicated pronunciation analysis section of the report.
Layout/AppShell.tsx: An optional component used within pages to provide consistent structural elements like a header or main content wrapper (can also be handled directly in layouts).
src/lib/ (Backend Libraries/Services)
lib/auth.ts: Contains the core NextAuth configuration object, defining providers, secret, etc. Used by app/api/auth/[...nextauth]/route.ts.
lib/db.ts: Placeholder for database connection logic. API routes would use this to interact with your database (saving JDs, sessions, reports).
lib/gemini.ts: A service or class to encapsulate calls to the Gemini Multi-modal API for generating questions, analyzing answers, determining answer level, and generating alternative responses. This logic is complex and should reside on the backend, called by your API routes (/api/sessions/[id]/route.ts).
lib/parsingService.ts: A client or function to call your assumed 3rd party service responsible for taking PDF or link inputs and returning structured data (extracted JD requirements, resume details). Used by the /api/jds route when a new JD is added.
lib/utils.ts: Any backend-specific helper functions that don't fit into the other lib categories.
src/utils/ (Frontend Utility Functions)
utils/api.ts: Contains functions that wrap fetch or a library like Axios to make clean, type-safe calls to your own /api endpoints from frontend components/pages. (e.g., getJds(), createJd(data), getSessionReport(sessionId)).
utils/constants.ts: Defines application-wide constants used on the frontend, like route paths, subscription tier names, interview modes, default limits for the free tier UI.
utils/formatters.ts: Pure functions for formatting data for display (e.g., formatDate(date), formatDuration(seconds)).
src/types/ (TypeScript Definitions)
types/index.ts: Contains TypeScript interface and type definitions used across the frontend and potentially shared with the backend API contract (e.g., interface JdTarget { ... }, interface Session { ... }, interface ReportData { ... }, interface QuestionFeedback { ... }).
src/middleware.ts:
A Next.js middleware file to protect routes under the (protected) group, ensuring only authenticated users can access them. It would check the session using getToken from next-auth/jwt and redirect unauthenticated users to the /login page.