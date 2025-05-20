# Project Outline: AI Interview Pro

## 5. High-Level Architecture

The application will be built using a modern web technology stack with a clear separation between frontend and backend concerns, leveraging Next.js App Router capabilities for routing and API endpoints.

*   **Frontend:**
    *   Framework: React (built with Next.js App Router).
    *   UI Libraries: (To be selected, e.g., Tailwind CSS, Material UI).
    *   State Management: (To be determined, could use React context or a library like Zustand/Redux if needed).
    *   Authentication: NextAuth for handling user sessions, authentication providers (like Google).
    *   User Interaction: Renders different UI components for Text, Voice, and Avatar modes.
*   **Backend:**
    *   Framework: Next.js API Routes (`/api/`).
    *   Core Services:
        *   **Authentication Service:** Handles user authentication and session management (leveraging NextAuth).
        *   **Document Processing Service:** Interfaces with a 3rd party tool for parsing PDF and link inputs (JD, Resume). Extracts structured data.
        *   **Analysis & Setup Service:** Analyzes processed JD/Resume data using NLP, generates default interview panels and initial questions, manages user panel adjustments.
        *   **Interview Simulation Service:** Orchestrates the interview session flow, manages state, timing, turn-taking, and routes user inputs to the AI Interaction Service.
        *   **AI Interaction Service:** The core AI engine. Interfaces with the Gemini Multi-modal API.
            *   Handles dynamic question generation based on user input and context.
            *   Performs response analysis (content, level, structure).
            *   Generates specific feedback points and alternative responses.
            *   Integrates with 3rd party Speech-to-Text (STT), Text-to-Speech (TTS), and Avatar generation services for Voice/Avatar modes.
            *   Includes a Pronunciation Analysis component (potentially integrated 3rd party or custom).
        *   **Reporting & History Service:** Processes completed session data, generates the structured Session Report (including feedback points, alternative responses, and pronunciation analysis), stores session history linked to JD Targets.
        *   **User & Subscription Service:** Manages user profiles, tracks subscription tiers, enforces usage limits (JDs, sessions).
*   **Database:**
    *   Stores user accounts, JD Target data (metadata, parsed key info, links/paths), Interview Session data (configuration, transcript, raw responses, processing results, generated report data), and potentially subscription/usage logs. (Specific database technology TBD, e.g., PostgreSQL, MongoDB).
*   **Storage:**
    *   Cloud storage (e.g., AWS S3, Google Cloud Storage) for storing uploaded PDF files and potentially audio/video recordings from sessions (depending on data retention policy).
*   **Third-Party Integrations:**
    *   NextAuth for authentication providers.
    *   Gemini Multi-modal API for core AI logic (NLP, generation).
    *   PDF/Link Parsing Tool.
    *   STT, TTS, Avatar Generation services (for Voice/Avatar modes).

## 6. User Flows & Key Pages

The user journey is centered around practicing interviews for specific job opportunities.

*   **Flow 1: Authentication**
    *   **Page: Login (`/login`)**: Presents options to sign in (e.g., "Sign in with Google"). Authenticated users are redirected to the Dashboard. Unauthenticated users attempting to access protected routes are redirected here (via Middleware).
*   **Flow 2: Managing JD Targets (Dashboard)**
    *   **Page: My JD Targets (`/(protected)/dashboard`)**: The main landing page after login. Displays a list/grid of JD Targets the user has added. Each entry shows key info (e.g., Job Title). Includes a clear call to action to "Add New Job Description".
*   **Flow 3: Adding a New JD Target**
    *   **Page: Add New JD Details (`/(protected)/jds/new`)**: A form where the user provides the Job Title and selects the input method (PDF Upload or Public Link) for both the JD and their Resume. After input, the user clicks an "Analyze & Create JD Target" button.
    *   **Page: JD Target Created / Review (`/(protected)/jds/[id]`)**: (Could be the same page as the JD Target Overview). Confirmation that the JD Target was successfully created and processed. Displays a summary of the parsed information. Call to action to "Configure Practice Session".
*   **Flow 4: Configuring a Practice Session**
    *   **(Accessed from the JD Target Overview page)**
    *   **Page: Configure Practice Session (`/(protected)/jds/[id]/configure-session`)**: Displays the AI-generated default interview panel based on the JD. The user can review and remove interviewers from this panel. They select the Interview Mode (Text, Voice, Avatar) from available options based on their subscription tier. They set the overall Session Duration. A "Start Session" button initiates the interview.
*   **Flow 5: Conducting the Interview Simulation**
    *   **Page: Interview Simulation (`/(protected)/sessions/[id]`)**: The dynamic interview experience.
        *   Layout adapts based on the selected mode (Chat UI for Text, Google Meets style UI for Voice/Avatar showing the AI interviewer).
        *   A prominent timer displays the remaining session duration.
        *   The current interviewer's name and perhaps a simple profile indicator are displayed.
        *   AI presents questions one at a time.
        *   User input area is provided (text box or microphone controls).
        *   After the user responds, the system processes the answer and the AI generates and presents the next dynamic question.
        *   The flow transitions between interviewers as the session progresses.
        *   An "End Session" button allows the user to stop early.
*   **Flow 6: Reviewing the Post-Interview Report**
    *   **(Accessed automatically after ending a session, or from the JD Target Overview page by selecting a past session)**
    *   **Page: Session Report (`/(protected)/sessions/[id]/report`)**: Displays the comprehensive analysis of the just-completed or past interview session.
        *   Includes an Overall Session Summary.
        *   Sections for each interviewer, showing the questions asked.
        *   Detailed Question-by-Question Analysis, clearly showing: Question, User Response, Specific Feedback (Content, Level, Structure), and a **Suggested Alternative Response**.
        *   A separate section or link for the Pronunciation Report (for Voice/Avatar sessions).
        *   Links to view the full Transcript and playback the Recording (for Voice/Avatar sessions).
        *   Calls to action like "Practice this JD again" or "Back to My JDs".
*   **Flow 7: Managing Account & Subscription**
    *   **(Accessed from a common UI element like a user menu)**
    *   **Page: Account Settings (`/(protected)/account`)**: Basic user profile management.
    *   **Page: Subscription (`/(protected)/subscription`)**: Displays the user's current subscription tier, the features included, and their current usage against plan limits. Options to upgrade to higher tiers are available.