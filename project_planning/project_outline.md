# Project Outline: AI Interview Pro

## 1. Project Vision & Goals

*   **Vision:** To be the premier AI platform offering highly realistic, personalized, and feedback-rich interview practice simulations that significantly improve user confidence and outcomes, especially during career transitions into/within Tech and Sales.
*   **Goals:**
    *   Enable dynamic, multi-interviewer practice sessions tailored to specific JDs and resumes.
    *   Provide nuanced, actionable post-interview feedback, including assessing the strategic level of answers and offering concrete alternative responses.
    *   Offer flexible interaction modes (Text, Voice, Avatar) accessible via a tiered subscription model.
    *   Empower users to effectively articulate their experience and tailor their message for different interviewer personas and industry contexts.
    *   Simplify the practice process by organizing history around target job descriptions.

## 2. Target Audience

*   Professionals in the Tech and Sales industries.
*   Primary focus on individuals looking to switch roles *within* these industries or *into* these industries from other fields.
*   Users seeking sophisticated, personalized, and realistic practice.

## 3. Core Features & Functionality

*   **JD & Resume Input & Processing:**
    *   User chooses *either* PDF upload *or* public link for Job Description.
    *   User chooses *either* PDF upload *or* public link for Resume. (Only one input method per document type per session).
    *   Integrated 3rd party tool for robust parsing of PDFs and extraction of key information from links (assume good parsing).
    *   Validation (assume inputs are complete and valid JD/Resume for v1 scope).
*   **Practice Session Setup:**
    *   User selects a previously created "JD Target" (a saved JD/Resume pair).
    *   AI generates a *default* interview panel (e.g., HR, Hiring Manager, Cross-functional) based on JD analysis.
    *   User can *adjust* the panel by removing interviewers from the default selection. (Adding other types is a future consideration).
    *   User selects Interview Mode (Text, Voice, Avatar - availability based on subscription tier).
    *   User sets overall Session Duration.
    *   Session configuration saved as a specific practice session instance linked to the JD Target.
*   **Interview Simulation Engine:**
    *   Initiates session with the first interviewer from the configured panel.
    *   Displays current interviewer name/profile and overall session timer.
    *   Presents the initial question.
    *   User provides response (text input or voice via microphone).
    *   AI *analyzes user response* using NLP.
    *   AI *generates a dynamic follow-up question* based on the user's response, the interviewer's persona, and the JD requirements.
    *   Presents the dynamic follow-up. This Q&A loop continues.
    *   Smooth transition to the next interviewer in the panel.
    *   UI adapts based on mode: Text (Chat UI), Voice/Avatar (Google Meets style UI).
    *   Session ends when all interviewers are complete or session duration is reached/exceeded (user can end early).
*   **Post-Interview Feedback & Reporting:**
    *   Upon session completion, process recorded data/transcript.
    *   Generate comprehensive **Session Report**.
    *   **Report Structure:**
        *   **Overall Session Summary:** High-level performance score/rating, key strengths, main areas for improvement.
        *   **Interviewer-by-Interviewer Review:** Section for each interviewer, listing questions asked.
        *   **Question-by-Question Detailed Analysis:**
            *   AI Question asked.
            *   User's verbatim Response (transcript/text).
            *   **Specific Feedback:** Content Relevance, Messaging Level Analysis (explicit feedback on appropriateness for interviewer persona), Structure & Organization.
            *   **Suggested Alternative Response:** Provide a concrete, well-structured example alternative.
        *   **Overall Thematic Feedback:** Synthesized feedback across the entire interview.
        *   **Pronunciation Report (Separate Component - for Voice/Avatar Tiers):** Detailed analysis, highlighting problem words/sounds, providing guidance.
    *   Full transcript and recording playback option (for Voice/Avatar).
*   **User Dashboard & History:**
    *   Primary view is "My JD Targets". Each JD Target shows: uploaded JD/Resume info, list of practice sessions conducted for this JD, summary stats for this JD.
    *   Clicking a session entry loads the detailed Session Report.
*   **Account & Subscription Management:**
    *   User profile management.
    *   Manage Subscription Tier (Text, Voice, Avatar access; Feedback level; Feature access).
    *   Monitor usage against tier limits.
    *   **Free Tier Specifics:** Text Only, 1 active JD Target, 3 practice interviews per JD per month, Content Feedback only (No Pronunciation), No Panel Customization.