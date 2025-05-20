# Project Outline: AI Interview Pro MVP

## 5. High-Level Architecture (MVP Focus)

The application will be built using a modern web technology stack, leveraging Next.js App Router capabilities for routing and tRPC for backend API communication.

*   **Frontend:**
    *   Framework: React (built with Next.js App Router).
    *   UI Libraries: (To be selected, e.g., Tailwind CSS or similar for basic styling).
    *   State Management: React context for simple state; tRPC for server state.
    *   Authentication: NextAuth for handling user sessions (Google provider for MVP).
    *   User Interaction: Renders UI components for text-based interview simulation and report viewing.
*   **Backend (using tRPC):**
    *   Framework: Next.js with tRPC for API endpoints.
    *   Core Services (implemented as tRPC routers and supporting library functions):
        *   **Authentication Service:** Handles user authentication and session management (leveraging NextAuth and its integration with tRPC context).
        *   **JD/Resume Text Service:** Manages storage and retrieval of user-provided job description and resume text.
        *   **Interview Simulation Service:** Orchestrates the text-based interview session flow:
            *   Manages session state (current question, history, timer).
            *   Interfaces with the AI Interaction Service for question generation and response processing.
        *   **AI Interaction Service (`src/lib/gemini.ts`):** The core AI engine.
            *   Interfaces with the Google Gemini API.
            *   Handles dynamic question generation based on user input, JD/Resume text, and the hardcoded "Technical Lead" persona.
            *   Performs basic analysis of user responses.
            *   Generates basic feedback points and suggested alternative responses for the MVP.
        *   **Reporting Service:** Primarily, the frontend constructs the report using session data. Backend tRPC procedures provide this data.
*   **Database (Prisma with PostgreSQL/SQLite - TBD):**
    *   Stores `User` accounts.
    *   `JdResumeText`: Stores the single active JD and Resume text pair per user.
    *   `SessionData`: Stores interview session configuration, full text transcript (history of AI questions and user answers), and basic feedback/alternatives generated during the session.
*   **Storage:**
    *   Not required for MVP (no file uploads).
*   **Third-Party Integrations:**
    *   NextAuth for Google authentication.
    *   Google Gemini API (`@google/genai`) for core AI logic.

## 6. User Flows & Key Pages (MVP Focus)

The MVP user journey focuses on a streamlined, text-based interview experience.

*   **Flow 1: Authentication**
    *   **Page: Login (`/login`)**: Presents "Sign in with Google". Authenticated users are redirected to the Dashboard. Unauthenticated users attempting to access protected routes are redirected here (via `middleware.ts`).
*   **Flow 2: Managing JD/Resume Text & Starting a Session (Dashboard)**
    *   **Page: Dashboard (`/(protected)/dashboard`)**:
        *   Main page after login.
        *   Displays text areas for pasting Job Description and Resume.
        *   Button: "Start Technical Lead Session".
        *   Displays a list of past interview sessions for the current JD/Resume text.
*   **Flow 3: Conducting the Text-Based Interview Simulation**
    *   **Page: Interview Simulation (`/(protected)/sessions/[id]`)**:
        *   Dynamic page for the text-based interview.
        *   Displays a simple chat UI for Q&A with the "Technical Lead" persona.
        *   A timer shows remaining session duration (e.g., 15-20 mins).
        *   User types responses.
        *   AI generates dynamic follow-up questions based on input, JD/Resume, and persona.
        *   An "End Session" button allows the user to stop early.
*   **Flow 4: Reviewing the Post-Interview Report**
    *   **(Accessed automatically after ending a session, or by clicking a past session on the Dashboard)**
    *   **Page: Session Report (`/(protected)/sessions/[id]/report`)**:
        *   Displays the analysis of the completed interview session.
        *   Includes the full text transcript.
        *   For each question: shows AI Question, User's Response, Basic Feedback, and a Suggested Alternative Response.
        *   Link/button to return to the Dashboard.

(Features like PDF/Link parsing, multiple interviewer panels, advanced session configuration, voice/avatar modes, account management, and subscription tiers are **OUT OF SCOPE** for the MVP).