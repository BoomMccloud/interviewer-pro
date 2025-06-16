# Feature Spec: Voice Modality - Phase 1 Frontend Alignment

> **Status**: **Completed – Phase 1 Delivered**
> **Related Document**: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
> **Jira Ticket**: FEAT-12

---

## 1. Objective

Refactor the session UI components (`VoiceInterviewUI` and `TextInterviewUI`) to correctly handle the data provided by the `getActiveSession` tRPC procedure. This will fix a critical rendering bug that currently blocks the implementation of the voice interview modality.

## 2. Problem Statement & Root Cause

Currently, the main session page (`/sessions/[id]`) fails to render the correct UI component when the `mode=voice` query parameter is present (this is now fixed).

-   **Problem:** The frontend UI components (`TextInterviewUI`, `VoiceInterviewUI`) expect a data structure (`ActiveSessionData`) where properties like `startTime` are non-nullable (`Date`).
-   **Root Cause:** Our backend API correctly returns a `startTime` that can be `null` (e.g., for a session that has been created but not yet started). This type mismatch between the backend's source of truth and the frontend's static type definitions causes a fatal rendering error.

## 3. Alignment with `SYSTEM_ARCHITECTURE.md`

This task is a **critical prerequisite** for the **"Phase 3C: Multi-Modal Support"** initiative outlined in our system architecture document. The current bug prevents us from even scaffolding the voice UI, let alone implementing the planned voice architecture.

By making the frontend components "malleable" and resilient to the actual data shapes provided by our API, we unblock all future development on voice and other real-time modalities.

## 4. Step-by-Step Implementation Plan

> **✅ NOTE** – Steps 2–4 have already been implemented in the code-base. They remain here for historic context but are now marked *Done*.

### Step 1: Verify the Source of Truth (Backend) **(Done)**

-   **File**: `src/server/api/routers/session.ts`
-   **Action**: Inspect the `getActiveSession` procedure. Confirm that its return object's `startTime` property can be `null`, as it reflects the database schema (`DateTime?`).
-   **Expected Outcome**: No changes are needed on the backend. The goal is to confirm its behavior.

### Step 2: Align the Frontend Type Definition **(Done)**

-   **File**: `src/types/index.ts`
-   **Action**: Locate the `ActiveSessionData` interface, which is currently misaligned with the API's actual return type.
-   **Required Change**:
    ```typescript
    // Before:
    // startTime: Date;

    // After:
    startTime: Date | null;
    ```
-   **Also**: Ensure all other properties on this type (`status`, `timeRemaining`, etc.) precisely match the return type of the `getActiveSession` procedure.

### Step 3: Make UI Components Resilient to Null Data **(Done)**

The UI components must now be updated to gracefully handle the corrected, potentially-null data types.

#### 3a. Update TextInterviewUI

-   **File**: `src/components/Sessions/InterviewUI/TextInterviewUI.tsx`
-   **Action**:
    1.  Ensure the `sessionData` prop uses the updated `ActiveSessionData` type.
    2.  Locate where `sessionData.startTime` is used (e.g., in a `new Date()` constructor or a formatting function).
    3.  Add a null check. If `startTime` is null, render a sensible fallback state, such as "Session has not started." or disable timing-related UI elements.

#### 3b. Update VoiceInterviewUI

-   **File**: `src/components/Sessions/InterviewUI/VoiceInterviewUI.tsx`
-   **Action**:
    1.  Ensure its `sessionData` prop is also using the updated `ActiveSessionData` type from `src/types/index.ts`.
    2.  Even if this component doesn't display the start time directly, making the prop type consistent is critical for preventing future errors and ensuring it can be rendered.

### Step 4: Simplify the Parent Component (`SessionPage`) **(Done)**

With the UI components now capable of accepting the API data directly, we can remove the brittle and unnecessary "glue" code in the parent page.

-   **File**: `src/app/(protected)/sessions/[id]/page.tsx`
-   **Action**:
    1.  Locate the main render logic (likely a function named `renderInterviewMode` or similar).
    2.  **Delete** any complex data mapping, type guards (`isSessionDataReady`), or prop transformation logic that was attempting to "fix" the data from the `activeSession.useQuery` hook.
    3.  Simplify the logic to its essentials:
        -   If `activeSession.isLoading`, show a loading indicator.
        -   If `!activeSession.data`, show an error or "not found" state.
        -   If `activeSession.data` exists, pass it **directly** into the `sessionData` prop of both `<VoiceInterviewUI />` and `<TextInterviewUI />`.

-   **Expected Result**: The component becomes cleaner, more readable, and free of the TypeScript errors that were blocking development.

---

### Remaining Work

1. **Low-priority TODO** – `Timer` currently starts from 0 on mount; future work will pass `startTime` so elapsed time is correct.

---

## 5. Acceptance Criteria (Updated)

1. **Build Success**: `npm run build` passes.
2. **Linter Pass**: `npm run lint` passes.
3. **Text Modality Works**: Navigate to `/sessions/[id]` → `TextInterviewUI` visible.
4. **Voice Modality Works**: Navigate to `/sessions/[id]?mode=voice` → `VoiceInterviewUI` visible.
5. **Functionality Unblocked**: Both interview modes render; future voice features are unblocked.

---

## 6. Testing Plan (TDD Approach)

### E2E Test – Session Page Mode Switching

**File**: `tests/e2e/session-mode.test.ts`

```typescript
import { test, expect } from '@playwright/test';

// NOTE: Hard-coded seed ID aligns with other E2E suites.
const TEST_SESSION_ID = 'clxnt1o60000008l3f9j6g9z7';

test.describe('Session Page Mode Switching', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test('renders TextInterviewUI by default', async ({ page }) => {
    await page.goto(`/sessions/${TEST_SESSION_ID}`);
    await expect(page.getByTestId('text-interview-ui')).toBeVisible();
  });

  test('renders VoiceInterviewUI when mode=voice', async ({ page }) => {
    await page.goto(`/sessions/${TEST_SESSION_ID}?mode=voice`);
    await expect(page.getByTestId('voice-interview-ui')).toBeVisible();
  });
});
```

> **Note**: No failing "Red" state expected because the implementation already matches behaviour; the test simply guards against regressions. 

---

## 7. Updated Voice User Journey (Preview of Phase 2)

> The next phase extends the work delivered here to a fully **hands-free voice interview**.  The candidate answers verbally; the application records, transcribes, and evaluates each response without showing a transcript.

1. Candidate opens a session with `?mode=voice`.
2. AI presents Question 1 (displayed on screen, optionally spoken in future).
3. Candidate speaks their answer while a **Recording…** indicator and timer run.
4. System detects end-of-speech → silently uploads audio → server transcribes → feeds transcript into the same evaluation path used for text answers.
5. AI immediately asks Question 2; cycle repeats until interview ends.
6. When finished, stored transcripts are used to generate the final report; the user never interacts with raw transcript text.

_All implementation details and TDD plan live in `feature_voice_modality_phase2.md`._ 