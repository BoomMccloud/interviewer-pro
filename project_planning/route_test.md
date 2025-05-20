# Approach for Building `route.test.ts` From Scratch (Avoiding Past Issues)

This outlines a structured approach to creating integration tests for Next.js App Router API routes using `next-test-api-route-handler`, Prisma, and Jest, aiming to prevent common pitfalls related to path aliases, Prisma types, and test handler configuration.

## Phase 1: Setup and Configuration (Before writing test code)

1.  **Define and Confirm Path Alias Strategy:**
    *   **Decision:**
        *   `@/*`: For project root paths (e.g., `@/app/...`, `@/prisma/...`)
        *   `~/*`: For `src/*` paths (e.g., `~/lib/...`, `~/server/...`)
    *   **Action:** Ensure consistency in:
        *   `tsconfig.json` (`compilerOptions.paths`)
        *   `jest.config.js` (`moduleNameMapper`)

2.  **Prisma Client and Type Generation:**
    *   **Action:** Execute `npx prisma generate` *before starting any test development*.
    *   **Verification (IDE):**
        *   Open the (even empty) test file.
        *   Attempt to import a Prisma model type (e.g., `import type { SessionData } from '@prisma/client';`).
        *   Confirm IDE autocompletion and type recognition.
        *   If issues persist, try reloading the IDE window or restarting the TypeScript language server.

3.  **Jest Configuration for ESM and Transforms:**
    *   **Action:** Verify `jest.config.js` is correctly configured for:
        *   ES Modules (e.g., `preset: 'ts-jest/presets/default-esm'`, `useESM: true` in `ts-jest` options).
        *   Transforming necessary ESM `node_modules` (e.g., `@t3-oss/env-nextjs` via `transformIgnorePatterns`).

4.  **`next-test-api-route-handler` Usage for App Router:**
    *   **Action:** Review its documentation or examples for **App Router** handlers.
    *   **Key Insight:** Typically involves passing the imported route handler function directly to the `handler` option.
        ```typescript
        // Example:
        import { GET } from '@/app/api/my-route/[id]/route';
        // ...
        await testApiHandler({
          handler: GET, // Pass the imported handler
          // ... other options
        });
        ```

## Phase 2: Writing the Test File (`route.test.ts`)

1.  **Basic Structure and Imports:**
    *   Create `tests/api/mvp-sessions/[id]/route.test.ts` (or your target test file).
    *   Add a top-level `describe` block for the API route.
    *   **Import with Correct Aliases:**
        *   `import { testApiHandler } from 'next-test-api-route-handler';`
        *   `import { GET, POST } from '@/app/api/mvp-sessions/[id]/route';` (or your specific route handlers)
        *   `import { db } from '~/server/db';` (Prisma client)
        *   `import type { SessionData, JdResumeText, User } from '@prisma/client';` (Prisma model types)
        *   `import type { JsonValue } from '@prisma/client/runtime/library';` (for direct manipulation of JSON fields)
        *   Define or import any custom interfaces (e.g., `MvpSessionTurn`).

2.  **Mocking External Dependencies:**
    *   Identify external services (e.g., `gemini.ts`, `personaService.ts`).
    *   Use `jest.mock()` at the top level of the file (outside any `describe` blocks).
        ```typescript
        const mockMyFunction = jest.fn();
        jest.mock('~/lib/myService', () => ({
          myFunction: mockMyFunction,
        }));

        // Example with a mock implementation for a service
        const MOCK_PERSONA_OBJECT = { id: 'test-persona', name: 'Test Persona', systemPrompt: '...' };
        const mockGetPersona = jest.fn().mockResolvedValue(MOCK_PERSONA_OBJECT);
        jest.mock('~/lib/personaService', () => ({
          getPersona: mockGetPersona,
        }));
        ```
    *   Define types for complex mock return values if needed.

3.  **Test Lifecycle Hooks (`beforeAll`, `afterAll`, `beforeEach`, `afterEach`):**
    *   **`beforeAll` / `afterAll`:**
        *   `beforeAll`: For one-time global setup (if any).
        *   `afterAll`: Crucial for cleanup. Delete data from all tables involved in tests to prevent state leakage between test file runs. Ensure deletion order respects foreign key constraints.
            ```typescript
            afterAll(async () => {
              await db.sessionData.deleteMany({});
              await db.jdResumeText.deleteMany({});
              await db.user.deleteMany({});
              // ... any other models
            });
            ```
    *   **`beforeEach` / `afterEach`:**
        *   `beforeEach`:
            *   Reset mock functions: `mockMyFunction.mockReset();`
            *   Seed minimal, common data required by most tests (e.g., a test `User`, `JdResumeText`, base `SessionData`). Store their IDs/objects in variables accessible within the `describe` block.
            *   Set default mock behaviors for common success cases.
        *   `afterEach`: Clean up data created *specifically within that `beforeEach` or the `it` block itself* to ensure test isolation.

4.  **Writing Test Cases (`describe` for GET/POST, then `it` blocks):**
    *   **Clear Descriptions:** Use descriptive `it('should ...')` messages.
    *   **Isolate Logic:** Each `it` block should test one specific aspect or scenario.
    *   **Follow Arrange, Act, Assert (AAA) Pattern:**
        *   **Arrange:** Set up specific mock behaviors for *this test* (if different from `beforeEach`). Create any unique data needed only for this test.
        *   **Act:** Call `testApiHandler` with the correct `handler` (e.g., `handler: GET`), `params`, `body` (if applicable), and `headers`.
        *   **Assert:**
            *   Check `res.status`.
            *   Check `await res.json()` content.
            *   Verify database state changes (fetch records and assert).
            *   Verify mock calls (`expect(mockMyFunction).toHaveBeenCalledWith(...)`).
    *   **Type Safety:** Use `as` for `res.json()` when the type is known, e.g., `const data = await res.json() as SessionData;`.
    *   **Database Assertions:** For operations that modify data, always fetch the record(s) from the database post-API call and assert the changes.
    *   **JSON Field Assertions:** For JSON fields (like `history`), ensure assertions check the structure and types against your defined interfaces. `expect.objectContaining({...})` can be helpful.

5.  **Incremental Testing and Linting:**
    *   Run tests frequently for the specific file being worked on: `npm test path/to/your/route.test.ts` (escape/quote special characters in the path if your shell requires it).
    *   Continuously monitor IDE linter feedback. If Prisma types are not recognized, revisit Phase 1, Step 2.

## Example Snippet (Conceptual for a POST test)

```typescript
// At the top of tests/api/mvp-sessions/[id]/route.test.ts
// ... (imports, mocks as described)

describe('POST /api/mvp-sessions/[id]', () => {
  let testUser: User;
  let testJdResume: JdResumeText;
  let baseSession: SessionData;
  const MOCK_PERSONA_ID = 'test-persona-id'; // Assume this is defined

  beforeEach(async () => {
    // Reset mocks
    mockContinueInterview.mockReset(); // Assuming this is a relevant mock

    // Seed data
    testUser = await db.user.create({ data: { email: `user-${Date.now()}@test.com`, name: 'Test User' } });
    testJdResume = await db.jdResumeText.create({ data: { userId: testUser.id, jdText: 'JD', resumeText: 'Resume' } });
    baseSession = await db.sessionData.create({
      data: {
        userId: testUser.id,
        jdResumeTextId: testJdResume.id,
        personaId: MOCK_PERSONA_ID, // Make sure MOCK_PERSONA_ID matches your personaService mock
        history: [],
        startTime: new Date(),
        // ... other required fields for SessionData
      },
    });

    // Default mock implementation for happy path
    mockContinueInterview.mockResolvedValue({
      question: 'Default AI Question',
      // ... other AI response fields
      rawAiResponseText: '<QUESTION>Default AI Question</QUESTION>',
    });
  });

  afterEach(async () => {
    // Clean up data created in beforeEach
    await db.sessionData.deleteMany({ where: { userId: testUser.id } });
    await db.jdResumeText.deleteMany({ where: { userId: testUser.id } });
    await db.user.deleteMany({ where: { id: testUser.id } });
  });

  it('should update session history and return AI reply on valid user response', async () => {
    const userResponse = "This is my answer.";
    const specificAiReply = { question: 'Specific AI question', rawAiResponseText: '...', score: 80 };
    mockContinueInterview.mockResolvedValue(specificAiReply); // Override for this test

    await testApiHandler({
      handler: POST, // Use the imported POST handler
      params: { id: baseSession.id },
      body: JSON.stringify({ userResponse }),
      headers: { 'Content-Type': 'application/json' },
      test: async ({ fetch }) => {
        const res = await fetch();
        expect(res.status).toBe(200);
        const responseJson = await res.json(); // Type assertion as needed
        expect(responseJson.question).toBe(specificAiReply.question);
      },
    });

    expect(mockContinueInterview).toHaveBeenCalledWith(
      [], // Initial history from baseSession
      userResponse,
      expect.objectContaining({ id: MOCK_PERSONA_ID }) // Ensure persona object is passed if needed
    );

    const updatedSession = await db.sessionData.findUnique({ where: { id: baseSession.id } });
    expect(updatedSession).toBeTruthy();
    const history = updatedSession!.history as JsonValue as MvpSessionTurn[]; // Your custom turn interface
    expect(history).toHaveLength(1);
    expect(history[0].userProvidedAnswer).toBe(userResponse);
    expect(history[0].aiQuestion).toBe(specificAiReply.question);
    // ... more assertions on history items
  });

  // ... other POST tests (e.g., 404 if session not found, 400 for bad input, 500 for AI service error)
});
```

By adhering to these steps, particularly around initial configuration, alias consistency, and correct `testApiHandler` usage, the development of