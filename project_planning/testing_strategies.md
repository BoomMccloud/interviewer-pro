# Testing Strategies for Backend Logic in Interviewer-Pro

This document outlines structured approaches to creating integration tests for the backend logic in the Interviewer-Pro project, focusing primarily on tRPC routers and secondarily on Next.js App Router API routes. It incorporates lessons learned during development.

## 1. Testing tRPC Routers (Primary Approach)

This is the current standard for testing core business logic, as implemented for `session.ts`.

### Phase 1: Setup and Configuration (Before writing test code)

1.  **Define and Confirm Path Alias Strategy:**
    *   **Current Aliases:**
        *   `@/*`: For project root paths (rarely used directly in backend tests).
        *   `~/*`: For `src/*` paths (e.g., `~/lib/...`, `~/server/...`).
    *   **Action:** Ensure consistency in:
        *   `tsconfig.json` (`compilerOptions.paths`).
        *   `jest.config.js` (`moduleNameMapper`). This is crucial for Jest to resolve module paths correctly.

2.  **Prisma Client and Type Generation:**
    *   **Action:** Always run `npx prisma generate` after any schema changes and *before starting test development or if type errors appear*.
    *   **Verification (IDE & Linting):**
        *   Attempt to import Prisma model types (e.g., `import type { SessionData } from '@prisma/client';`) in your test file.
        *   Confirm IDE autocompletion. If issues persist, try reloading the IDE window or restarting the TypeScript language server.
        *   **Trust `npm run lint`:** Command-line linting has proven to be the source of truth for Prisma type issues. IDEs might sometimes show stale errors.

3.  **Jest Configuration for ESM and Transforms:**
    *   **Action:** `jest.config.js` must be correctly configured for:
        *   ES Modules: `ts-jest` preset (e.g., `'ts-jest/presets/default-esm'`) and `useESM: true`.
        *   Transforming `node_modules`: Critically, `transformIgnorePatterns` needs to be carefully set to allow `ts-jest` to process ESM modules from dependencies (e.g., `@t3-oss/env-nextjs`, `superjson`).
            ```javascript
            // Example from jest.config.js
            transformIgnorePatterns: [
              '/node_modules/(?!(@t3-oss/env-nextjs|superjson)/)', // Adjust as needed
            ],
            ```
    *   **Troubleshooting:** Errors like `SyntaxError: Cannot use import statement outside a module` or `SyntaxError: Unexpected token 'export'` usually point to issues here.

4.  **tRPC Test Caller Setup:**
    *   **Key Components:**
        *   `createCaller` from `~/server/api/root`.
        *   `createTRPCContext` from `~/server/api/trpc`.
    *   **Pattern:** Create a helper function in your test suite to instantiate a test caller, often injecting a mocked user session.

### Phase 2: Writing the tRPC Test File (e.g., `tests/server/routers/session.test.ts`)

1.  **Basic Structure and Imports:**
    *   Import necessary tRPC utilities, the router being tested, Prisma client (`db`), and relevant types.
        ```typescript
        import { createCaller } from '~/server/api/root';
        import { createTRPCContext } from '~/server/api/trpc';
        import { appRouter, type AppRouter } from '~/server/api/root'; // Import your main router
        import { db } from '~/server/db';
        import type { SessionData, JdResumeText, User, Prisma } from '@prisma/client';
        import type { MvpSessionTurn, Persona } from '~/types';
        import { zodMvpSessionTurnArray } from '~/types'; // For parsing Json fields
        ```

2.  **Mocking External Dependencies & Services:**
    *   **NextAuth.js (`~/server/auth`):**
        *   Mock `auth` to simulate user sessions or no session.
            ```typescript
            import { auth as actualAuth } from '~/server/auth';
            jest.mock('~/server/auth', () => ({
              __esModule: true,
              auth: jest.fn(),
            }));
            const mockedAuth = actualAuth as jest.MockedFunction<typeof actualAuth>;
            ```
    *   **Service Libraries (e.g., `~/lib/gemini`, `~/lib/personaService`):**
        *   Use `jest.mock()` at the top level.
        *   Import the mocked functions and cast them to `jest.MockedFunction` for type-safe control over mock implementations.
            ```typescript
            jest.mock('~/lib/gemini', () => ({ /* ... mocked functions ... */ }));
            jest.mock('~/lib/personaService', () => ({ /* ... mocked functions ... */ }));

            import { getFirstQuestion, continueInterview } from '~/lib/gemini';
            import { getPersona } from '~/lib/personaService';

            const mockGetFirstQuestionFn = getFirstQuestion as jest.MockedFunction<typeof getFirstQuestion>;
            // ... and so on
            ```
    *   **Mock Initialization:** If you encounter `ReferenceError: Cannot access '...' before initialization`, ensure your `jest.mock` factory correctly returns `jest.fn()` for each mocked function, and then import those functions to get your typed mock references.

3.  **Test Lifecycle Hooks (`beforeAll`, `afterAll`, `beforeEach`, `afterEach`):**
    *   **`afterAll`:** Essential for cleaning up all test data from the database to prevent state leakage. Delete in an order that respects foreign key constraints. Disconnect Prisma client.
        ```typescript
        afterAll(async () => {
          await db.sessionData.deleteMany({});
          await db.jdResumeText.deleteMany({});
          await db.user.deleteMany({});
          await db.$disconnect();
        });
        ```
    *   **`beforeEach`:**
        *   Reset all mocks: `mockGetPersonaFn.mockReset();`.
        *   Set up default successful mock implementations for common scenarios.
        *   Seed minimal, common data required by most tests (e.g., a test `User`, `JdResumeText`).
    *   **`afterEach`:** Clean up data created specifically within `beforeEach` or the test itself to ensure test isolation. This is often done by deleting records related to the `user` created in `beforeEach`.

4.  **Writing Test Cases (`describe` for procedures, then `it` blocks):**
    *   **Clear Descriptions:** Use descriptive `it('should ... when ...')` messages.
    *   **AAA Pattern (Arrange, Act, Assert):**
        *   **Arrange:**
            *   Instantiate the tRPC caller, potentially with a logged-in user: `const caller = await getTestCaller(testUser);`.
            *   Prepare input for the procedure.
            *   Override default mock behaviors for specific test scenarios.
        *   **Act:** Call the tRPC procedure: `const result = await caller.session.createSession(input);`.
        *   **Assert:**
            *   Verify mock calls: `expect(mockGetPersonaFn).toHaveBeenCalledWith(...)`.
            *   Check the returned `result` from the procedure.
            *   Fetch records from the database and assert their state/values.
    *   **Database Assertions:** Crucial for verifying side effects of mutations.
    *   **Prisma `Json` Fields:**
        *   When retrieving data that includes a Prisma `Json` field (e.g., `SessionData.history`), parse it using a Zod schema for type safety.
            ```typescript
            // In procedure:
            // historyPlaceholder = zodMvpSessionTurnArray.parse(currentSession.history);

            // In tests (after fetching from DB):
            // const history = zodMvpSessionTurnArray.parse(dbSession.history);
            // Or if confident and type is Prisma.JsonValue:
            // const history = dbSession.history as unknown as MvpSessionTurn[];
            ```
        *   This was key to resolving linter errors related to `any` types.

5.  **Error Handling Tests:**
    *   Test for expected errors (e.g., record not found, unauthorized access, validation errors from Zod schemas).
        ```typescript
        // await expect(caller.session.createSession(...)).rejects.toThrow(/Some error message/);
        ```

## Example Snippet (Conceptual for a `createSession` tRPC test)

```typescript
// (Imports and mocks as described above)

describe('Session tRPC Router', () => {
  let user: User;
  let jdResume: JdResumeText;
  // ... other shared test variables

  const getTestCaller = async (sessionUser: User | null = null) => {
    // ... (setup mockedAuth and createTRPCContext as shown in session.test.ts)
    const ctx = await createTRPCContext({ headers: new Headers() });
    return createCaller(ctx);
  };

  beforeEach(async () => {
    // Reset mocks
    mockGetPersonaFn.mockReset();
    mockGetFirstQuestionFn.mockReset();

    // Default mock implementations
    mockGetPersonaFn.mockResolvedValue({ id: 'test-persona', name: 'Test', systemPrompt: '...' });
    mockGetFirstQuestionFn.mockResolvedValue({ questionText: 'Hi?', rawAiResponseText: '<QUESTION>Hi?</QUESTION>' });

    // Seed common data
    user = await db.user.create({ data: { email: `user-${Date.now()}@test.com` } });
    jdResume = await db.jdResumeText.create({ data: { userId: user.id, jdText: 'JD', resumeText: 'Resume' } });
  });

  // ... (afterAll, afterEach for cleanup)

  describe('createSession procedure', () => {
    it('should create a session and return the first question', async () => {
      const caller = await getTestCaller(user);
      const input = { personaId: 'test-persona', durationInSeconds: 300 };

      const result = await caller.session.createSession(input);

      expect(result.sessionId).toBeDefined();
      expect(result.firstQuestion).toBe('Hi?');
      expect(mockGetPersonaFn).toHaveBeenCalledWith(input.personaId);
      expect(mockGetFirstQuestionFn).toHaveBeenCalledWith(
        expect.objectContaining({ id: jdResume.id }),
        expect.objectContaining({ id: input.personaId })
      );

      const dbSession = await db.sessionData.findUnique({ where: { id: result.sessionId } });
      expect(dbSession).toBeDefined();
      expect(dbSession?.userId).toBe(user.id);
      // ... more assertions on dbSession and its history (parsed with Zod)
    });
  });
});
```

## 2. Testing Next.js App Router API Routes (Legacy/Alternative)

While tRPC is preferred for complex backend logic, simple API routes might still exist. The `next-test-api-route-handler` package can be used for these.

### Key Considerations (Condensed from original document):

1.  **Handler Import:** For App Router, import the specific method handlers (GET, POST, etc.) directly.
    ```typescript
    import { GET, POST } from '@/app/api/my-route/[id]/route';
    // ...
    await testApiHandler({ handler: GET, params: { id: '...' } /* ... */ });
    ```
2.  **Path Aliases & Prisma Setup:** Same principles as for tRPC testing apply.
3.  **Mocking:** Use `jest.mock()` for external dependencies.
4.  **Test Lifecycle:** Use `beforeAll`, `afterAll`, `beforeEach`, `afterEach` for setup and teardown, including database cleaning.
5.  **AAA Pattern:** Structure tests with Arrange, Act (call `testApiHandler`), Assert (check response status, JSON body, DB state, mock calls).

**When to use this approach:**
*   For existing simple RESTful API routes.
*   If a route doesn't fit well into the tRPC model (e.g., webhook handlers).

This updated guide should provide a more accurate reflection of our current testing practices and the lessons learned.