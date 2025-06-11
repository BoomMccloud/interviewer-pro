# Project Plan: Interactive Conversational Interview Report

**1. Feature Purpose & Vision**

This document outlines the design, implementation, and testing strategy for a new **Interactive Conversational Interview Report**. The goal is to evolve the current static report page into a dynamic, AI-powered coaching tool.

**Key User Stories:**
*   As a user, I want to see a high-level summary of my interview performance against the role's key competencies.
*   As a user, I want to drill down into each question to get specific feedback on my performance regarding **Content, Clarity, and Confidence**.
*   As a user, I want to have a stateful, text-based conversation with an AI coach for each question, allowing me to ask follow-up questions, try alternative answers, and receive iterative feedback.
*   As a user, I want my coaching conversations to be saved so I can review them later.

This feature will be implemented following the **RED-GREEN-REFACTOR** TDD cycle as defined in `project_planning/tdd_methodology.md`.

---

**2. Architectural Design**

The architecture will be progressively generated to ensure a fast initial page load and efficient on-demand processing, consisting of three main parts: Database, Backend (tRPC), and Frontend (React).

**2.1. Database Schema (`prisma/schema.prisma`)**

*   **Model:** A new `FeedbackConversation` model will be added.
*   **Purpose:** To store the chat history for each question a user interacts with on the report page. This makes the coaching conversation stateful and persistent.
*   **Key Fields:**
    *   `sessionDataId`: Links to the parent `SessionData` report.
    *   `questionId`: A string (`"q1_opening"`, etc.) that identifies the specific question segment this conversation is about.
    *   `history`: A JSON field storing the array of chat turns (`[{ role: 'user' | 'ai', content: '...' }]`).
    *   `userId`: For data ownership and security rules.

*(This database change has already been defined in a previous step).*

**2.2. Backend API (tRPC)**

We will create a new router, `report.ts`, or add to the existing `session.ts` router with the following procedures:

1.  **`getOverallAssessment` (Query):**
    *   **Input:** `{ sessionId: string }`
    *   **Action:** Fetches session data, sends a summarized transcript to the LLM, and asks for a high-level analysis against the persona's competencies.
    *   **Output:** `{ persona, duration, overallFit: { competency, assessment, score }[] }`

2.  **`getQuestionInitialFeedback` (Query):**
    *   **Input:** `{ sessionId: string, questionId: string }`
    *   **Action:** Fetches the specific question and answer from the `questionSegments`. Sends only this pair to the LLM, asking for an initial analysis on **Content, Clarity, and Confidence**.
    *   **Output:** `{ contentFeedback, clarityFeedback, confidenceFeedback }`

3.  **`startOrGetFeedbackConversation` (Query):**
    *   **Input:** `{ sessionId: string, questionId: string }`
    *   **Action:** First, attempts to find an existing `FeedbackConversation` in the DB. If not found, it creates a new one with an empty `history` array.
    *   **Output:** The full `FeedbackConversation` object, including its `id` and `history`.

4.  **`postToFeedbackConversation` (Mutation):**
    *   **Input:** `{ feedbackConversationId: string, userMessage: string }`
    *   **Action:**
        1.  Loads the conversation `history` from the database.
        2.  Appends the `userMessage`.
        3.  Sends the full history to the LLM for a context-aware response.
        4.  Appends the LLM's response to the `history`.
        5.  Saves the updated `history` back to the database.
    *   **Output:** The complete, updated `FeedbackConversation` object.

**2.3. Frontend Architecture (React Components)**

1.  **`ReportPage` (Container):**
    *   Fetches the high-level summary using the `getOverallAssessment` hook.
    *   Renders the `OverallAssessment` component.
    *   Renders a list of `QuestionFeedbackSection` components, one for each question in the interview.

2.  **`OverallAssessment` (Display Component):**
    *   Receives and displays the persona, duration, and competency ratings.

3.  **`QuestionFeedbackSection` (Stateful Component):**
    *   Represents a single question from the interview.
    *   Initially shows just the question and a "Get Feedback" button.
    *   On button click, it calls the `getQuestionInitialFeedback` hook and displays the result.
    *   After getting initial feedback, it then calls `startOrGetFeedbackConversation` to get the `feedbackConversationId` and history, then renders the `InteractiveCoach`.

4.  **`InteractiveCoach` (Stateful Component):**
    *   Manages the state of the chat history for one question.
    *   Renders the chat messages.
    *   Provides an input field and a "Send" button, which triggers the `postToFeedbackConversation` mutation.
    *   Handles loading and error states for the conversation.

---

**3. TDD Implementation Plan: RED-GREEN-REFACTOR**

We will follow the testing pyramid and strategies from `tdd_methodology.md`.

**3.1. Phase 1: Backend tRPC Procedures (Integration & Unit Tests) - ✅ Complete**

*   **Testing Strategy:** Backend integration tests using a **real database** and a **mocked LLM service** (`~/lib/gemini`). This ensures our database logic is correct without incurring AI costs during tests.

1.  **`getOverallAssessment`**
    *   **🔴 RED:** Write a failing integration test that calls `report.getOverallAssessment` and asserts that the mocked LLM function was called with the correct payload.
    *   **🟢 GREEN:** Implement the minimal tRPC procedure logic to fetch data and call the (mocked) LLM service.
    *   **🔵 REFACTOR:** Clean up the prompt engineering and data transformation logic.

2.  **`startOrGetFeedbackConversation`**
    *   **🔴 RED:** Write a failing test that calls the procedure for a new question and asserts that a `FeedbackConversation` record was created in the database.
    *   **🟢 GREEN:** Implement the logic to `findUnique` and then `create` a record if it doesn't exist.
    *   **🔴 RED:** Write another test that calls the procedure a second time and asserts that the *existing* record is returned and a new one is *not* created.
    *   **🟢 GREEN:** Ensure the `findUnique` logic correctly returns the existing record.
    *   **🔵 REFACTOR:** Optimize database queries.

3.  **`postToFeedbackConversation`**
    *   **🔴 RED:** Write a failing test that calls the mutation and asserts that the database record's `history` field was updated with both the user's message and the mocked AI's response.
    *   **🟢 GREEN:** Implement the logic to read history, append turns, call the mock LLM, and save the updated history.
    *   **🔵 REFACTOR:** Add validation and error handling (e.g., for a non-existent `feedbackConversationId`).

**3.2. Phase 2: Frontend Components (Integration & Unit Tests)**

*   **Testing Strategy:** Frontend integration tests using **React Testing Library** and **mocked tRPC hooks**, as established in the project.

1.  **`ReportPage` & `OverallAssessment`**
    *   **🔴 RED:** Write a failing test for `ReportPage` that mocks `api.report.getOverallAssessment.useQuery` to be in a loading state and asserts that a spinner is rendered.
    *   **🟢 GREEN:** Implement the component to show a spinner.
    *   **🔴 RED:** Update the test to mock a successful data response and assert that the `OverallAssessment` component is rendered with the correct data props.
    *   **🟢 GREEN:** Pass the data to the `OverallAssessment` component.

2.  **`QuestionFeedbackSection`**
    *   **🔴 RED:** Write a test that renders the component and asserts that the "Get Feedback" button is visible.
    *   **🟢 GREEN:** Implement the component with the button.
    *   **🔴 RED:** Write a test that simulates a user clicking the button and asserts that `api.report.getQuestionInitialFeedback.useQuery` and `api.report.startOrGetFeedbackConversation.useQuery` are triggered.
    *   **🟢 GREEN:** Implement the `onClick` handler to enable the queries.

3.  **`InteractiveCoach`**
    *   **🔴 RED:** Write a test that mocks the `postToFeedbackConversation` mutation, simulates a user typing and clicking "Send", and asserts that the mutation was called with the correct text.
    *   **🟢 GREEN:** Implement the input, state management, and `onClick` handler for the form.
    *   **🔴 RED:** Write a test to ensure the chat history (passed as a prop) is rendered correctly.
    *   **🟢 GREEN:** Implement the message rendering logic.
    *   **🔵 REFACTOR:** Add loading indicators for when the mutation is pending and handle error states gracefully.

**3.3. Phase 3: End-to-End Manual Verification**

*   **Testing Strategy:** Following the `real-interview-flow.integration.test.ts` pattern, we will add manual E2E testing steps to our integration test suite.
*   **Manual Test Plan:**
    1.  Log in and complete a short interview.
    2.  Navigate to the generated report page.
    3.  **Verify:** The overall assessment loads and displays correctly.
    4.  Click "Get Feedback" on a question.
    5.  **Verify:** The initial feedback for that question loads correctly.
    6.  Type a message into the coach chatbox and send it.
    7.  **Verify:** An AI response appears, and the conversation is rendered.
    8.  Reload the page.
    9.  **Verify:** The chat history for that question is still present, loaded from the database. 