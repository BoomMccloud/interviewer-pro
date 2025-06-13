# Feature: Save and Unify Overall Assessment in Interview Reports

## TDD Implementation Steps

All changes for this feature should follow the Test-Driven Development (TDD) methodology as outlined in the project's `tdd_methodology.md`. This ensures robust, maintainable, and well-tested code.

### 1. RED: Write Failing Tests First

#### a. Backend (tRPC)
- Write unit/integration tests for the `getOverallAssessment` procedure:
  - Test that if `overallAssessment` exists, it is returned as-is.
  - Test that if it does not exist, it is generated, saved, and then returned.
  - Test error handling (e.g., session not found, unauthorized).
- If a data migration is needed, write a test to ensure old `overallSummary` data is migrated correctly.

#### b. Frontend
- Write component tests for the report page:
  - Test that the report displays the assessment (summary, strengths, improvements, score) from the API.
  - Test loading, error, and edge cases (e.g., missing assessment).
  - If a "regenerate" button is added, test its behavior.

### 2. GREEN: Implement Minimal Code to Pass Tests

#### a. Data Model
- Update the Prisma schema: replace `overallSummary` with `overallAssessment` (Json?).
- Run `npx prisma migrate dev --name overall-assessment-json`.

#### b. Backend
- Update the `getOverallAssessment` procedure to:
  - Check for and return `overallAssessment` if present.
  - Otherwise, generate, save, and return the assessment.
- Update all references from `overallSummary` to `overallAssessment`.

#### c. Frontend
- Update the report page and related components to expect and render the full assessment object.
- Update API calls and prop types as needed.

### 3. REFACTOR: Clean Up and Optimize
- Refactor backend and frontend code for clarity and maintainability.
- Remove any obsolete code related to `overallSummary`.
- Ensure all tests (including pre-existing ones) remain green.
- Update documentation and type definitions for the new structure.

### 4. Integration & Manual Testing
- Run integration tests (using real DB and services as per your methodology).
- Manually verify the full workflow: create session, complete interview, view report, reload report, etc.

### 5. Best Practices from TDD Methodology
- Mock external dependencies in unit tests, but use real DB/services for integration.
- Reset mocks between tests for isolation.
- Test user interactions and API behavior, not just implementation details.
- Document any new testing patterns or utilities you introduce.

---

## 1. Data Model Changes

- **Replace** `overallSummary` (String?) with `overallAssessment` (Json?) in the `SessionData` model.
- **Prisma schema update:**
  ```prisma
  model SessionData {
    // ... other fields ...
    overallAssessment Json?
    // ... other fields ...
  }
  ```
- **Migration:**
  - Run: `npx prisma migrate dev --name overall-assessment-json`
- **Update** all TypeScript types and usages to reference `overallAssessment` instead of `overallSummary`.

---

## 2. Backend Logic Changes

- In `src/server/api/routers/report.ts`:
  - In the `getOverallAssessment` procedure:
    - **Check** if `session.overallAssessment` exists:
      - If **yes**, return it (parse as needed).
      - If **no**, generate it, save it to `overallAssessment`, and return it.
  - **Update** any code that previously used `overallSummary` to use the new field and structure.
- **Update** any other backend code that references or expects `overallSummary`.

---

## 3. Frontend Logic Changes

- In `src/app/(protected)/sessions/[id]/report/report-content.tsx` (and related files):
  - **Update** logic to expect the full assessment object (with summary, strengths, improvements, score) from the API.
  - **Update** any code that previously used `overallSummary` to use the new structure.
  - **Ensure** components like `OverallAssessment` receive the correct props and render all fields (summary, strengths, improvements, score).
- **If** the UI allows "regenerating" the assessment, ensure it updates the stored value.

---

## 4. (Optional) Data Migration

- If existing data in `overallSummary` should be preserved, write a migration script to convert those strings into the new JSON format:
  ```json
  {
    "summary": "...",
    "strengths": [],
    "improvements": [],
    "score": 0
  }
  ```

---

## 5. Testing

- Test creating a new session and viewing the report.
- Test reloading the report to ensure the assessment is loaded from the database, not regenerated.
- Test edge cases (no assessment, corrupted data, etc.).

---

## Field Name Decision
- The unified field will be named: `overallAssessment` (type: `Json?`). 