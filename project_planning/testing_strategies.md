# Testing Strategies for Interviewer-Pro

This document outlines structured approaches to creating tests for both backend and frontend logic in the Interviewer-Pro project. It incorporates lessons learned during development and establishes patterns for using Jest with separate configurations for different parts of the application.

## 0. General Jest Setup for Frontend and Backend

To accommodate the different requirements of testing Node.js backend code (often ESM-centric) and frontend React components (requiring a DOM environment and specific JSX handling), Interviewer-Pro uses two separate Jest configuration files.

### Key Dependencies

Ensure the following `devDependencies` are installed in your `package.json`:
- `jest`
- `ts-jest`
- `@types/jest`
- `jest-environment-jsdom` (for frontend tests)
- `@testing-library/react` (for frontend tests)
- `@testing-library/jest-dom` (for frontend tests)
- `@testing-library/user-event` (recommended for frontend tests)

### Path Aliases

Consistent path aliases are used across the project:
*   `~/*`: For `src/*` paths (e.g., `~/lib/...`, `~/server/...`, `~/components/...`).
This is configured in `tsconfig.json` (`compilerOptions.paths`) and mirrored in each Jest config's `moduleNameMapper`.

### Frontend Jest Configuration (`jest.config.frontend.js`)

This configuration is tailored for testing React components.

```javascript
// jest.config.frontend.js
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // For @testing-library/jest-dom
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
    // '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // If importing CSS modules
  },
  transform: {
    '^.+\.m?[tj]sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json', // Crucial for frontend-specific TS settings
      },
    ],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@t3-oss/env-core|@t3-oss/env-nextjs|superjson|@babel/runtime|next)/).+\.m?(js|ts)$',
  ],
  testMatch: [ // Defines where frontend tests are located
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
    '<rootDir>/tests/frontend/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/tests/frontend/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'node'],
};
```

### Frontend TypeScript Configuration for Jest (`tsconfig.jest.json`)

This file extends the main `tsconfig.json` but overrides options specifically for frontend tests to ensure correct JSX and module handling.

```json
// tsconfig.jest.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS", // Ensures compatibility with Jest's environment
    "jsx": "react-jsx"     // Ensures JSX is transformed correctly for React 17+
  }
}
```

### Jest Setup File (`jest.setup.ts`)

This file is used by the frontend Jest configuration to extend Jest matchers.

```typescript
// jest.setup.ts
import '@testing-library/jest-dom';
```

### Backend Jest Configuration (`jest.config.backend.js`)

This configuration is tailored for testing backend Node.js code, including tRPC routers, and supports ES Modules.

```javascript
// jest.config.backend.js
export default {
  preset: 'ts-jest/presets/default-esm', // ESM preset
  testEnvironment: 'node',
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\.m?[tj]sx?$': [
      'ts-jest',
      {
        useESM: true, // Enable ESM support
        tsconfig: '<rootDir>/tsconfig.json', // Uses the main tsconfig
      },
    ],
  },
  transformIgnorePatterns: [
    // Carefully manage for backend ESM dependencies
    '/node_modules/(?!(@t3-oss/env-nextjs|superjson)/).+\.m?(js|ts)$',
  ],
  testMatch: [ // Defines where backend tests are located
    '<rootDir>/tests/*.test.ts',             // For tests directly in /tests (like db-crud)
    '<rootDir>/tests/*.spec.ts',             // For tests directly in /tests
    '<rootDir>/tests/server/**/*.test.ts',
    '<rootDir>/tests/server/**/*.spec.ts',
    // Add other backend test locations if necessary
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'node'],
};
```

### NPM Scripts

The `package.json` provides scripts to run these configurations:

```json
// package.json (scripts section)
"scripts": {
  // ... other scripts
  "test": "jest -c jest.config.frontend.js", // Default test runs frontend tests
  "test:frontend": "jest -c jest.config.frontend.js",
  "test:backend": "jest -c jest.config.backend.js",
  "test:watch": "jest -c jest.config.frontend.js --watch",
  "test:backend:watch": "jest -c jest.config.backend.js --watch",
  "test:all": "npm run test:frontend && npm run test:backend"
  // ...
}
```
To run a specific test file:
- Frontend: `npm run test:frontend -- <path_to_frontend_test_file>`
- Backend: `npm run test:backend -- <path_to_backend_test_file>`

---

## 1. Testing tRPC Routers (Backend - Primary Approach)

This is the current standard for testing core business logic, as implemented for `session.ts`. Backend tests are run using `npm run test:backend`.

### Phase 1: Setup and Configuration (Before writing test code)

1.  **Path Alias Strategy:**
    *   Ensure consistency as described in "General Jest Setup" (mirrored in `jest.config.backend.js` `moduleNameMapper`).

2.  **Prisma Client and Type Generation:**
    *   **Action:** Always run `npx prisma generate` after any schema changes and *before starting test development or if type errors appear*.
    *   **Verification (IDE & Linting):**
        *   Attempt to import Prisma model types (e.g., `import type { SessionData } from '@prisma/client';`) in your test file.
        *   Confirm IDE autocompletion. If issues persist, try reloading the IDE window or restarting the TypeScript language server.
        *   **Trust `npm run lint`:** Command-line linting has proven to be the source of truth for Prisma type issues. IDEs might sometimes show stale errors.

3.  **Jest Configuration for Backend (ESM and Transforms):**
    *   **Action:** The backend Jest setup is defined in `jest.config.backend.js`. Key settings include:
        *   `preset: 'ts-jest/presets/default-esm'` and `useESM: true` in the `ts-jest` transform options.
        *   `testEnvironment: 'node'`.
        *   `transformIgnorePatterns` is crucial for allowing `ts-jest` to process ESM modules from dependencies (e.g., `@t3-oss/env-nextjs`, `superjson`).
            ```javascript
            // Example from jest.config.backend.js
            transformIgnorePatterns: [
              '/node_modules/(?!(@t3-oss/env-nextjs|superjson)/).+\.m?(js|ts)$', // Adjust as needed
            ],
            ```
    *   **Troubleshooting:** Errors like `SyntaxError: Cannot use import statement outside a module` or `SyntaxError: Unexpected token 'export'` usually point to issues with this ESM configuration for backend tests.

4.  **tRPC Test Caller Setup:**
    *   **Key Components:**
        *   `createCallerFactory` from `~/server/api/trpc` (or `createCaller` from `~/server/api/root` if that's your pattern).
        *   `createTRPCContext` from `~/server/api/trpc`.
    *   **Pattern:** Create a helper function in your test suite to instantiate a test caller, often injecting a mocked user session.

### Phase 2: Writing the tRPC Test File (e.g., `tests/server/routers/session.test.ts`)

(This section remains largely the same as your original document, as the principles of writing the tests themselves haven't changed, just the config used to run them)

1.  **Basic Structure and Imports:**
    *   Import necessary tRPC utilities, the router being tested, Prisma client (`db`), and relevant types.
        ```typescript
        // Example:
        // import { createCallerFactory } from '~/server/api/trpc';
        // import { appRouter, type AppRouter } from '~/server/api/root';
        // import { createTRPCContext } from '~/server/api/trpc';
        import { db } from '~/server/db';
        // ... other imports
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
            // Example:
            // jest.mock('~/lib/gemini', () => ({ /* ... mocked functions ... */ }));
            // import { getFirstQuestion } from '~/lib/gemini';
            // const mockGetFirstQuestionFn = getFirstQuestion as jest.MockedFunction<typeof getFirstQuestion>;
            ```
    *   **Mock Initialization:** If you encounter `ReferenceError: Cannot access '...' before initialization`, ensure your `jest.mock` factory correctly returns `jest.fn()` for each mocked function, and then import those functions to get your typed mock references.

3.  **Test Lifecycle Hooks (`beforeAll`, `afterAll`, `beforeEach`, `afterEach`):**
    *   **`afterAll`:** Essential for cleaning up all test data from the database to prevent state leakage. Disconnect Prisma client.
    *   **`beforeEach`:** Reset mocks, set up default mock implementations, seed common data.
    *   **`afterEach`:** Clean up data created specifically for a test to ensure isolation.

4.  **Writing Test Cases (`describe` for procedures, then `it` blocks):**
    *   **Clear Descriptions:** Use descriptive `it('should ... when ...')` messages.
    *   **AAA Pattern (Arrange, Act, Assert):**
        *   **Arrange:** Instantiate tRPC caller, prepare input, override mock behaviors.
        *   **Act:** Call the tRPC procedure.
        *   **Assert:** Verify mock calls, check returned results, assert database state.
    *   **Database Assertions:** Crucial for verifying side effects.
    *   **Prisma `Json` Fields:** Parse with Zod schemas for type safety.

5.  **Error Handling Tests:** Test for expected errors.

(The conceptual example snippet for `createSession` tRPC test would remain relevant here, as in the original document)

```typescript
// Conceptual tRPC test example (condensed from original)
describe('Session tRPC Router', () => {
  // ... setup user, jdResume, mocks, getTestCaller helper ...
  beforeEach(async () => {
    // ... reset mocks, seed data ...
  });
  // ... afterAll, afterEach ...
  describe('createSession procedure', () => {
    it('should create a session and return the first question', async () => {
      // Arrange, Act, Assert ...
    });
  });
});
```

---

## 2. Testing Frontend React Components

Frontend component tests are run using `npm run test:frontend` which utilizes `jest.config.frontend.js` and `tsconfig.jest.json`.

### Key Principles & Tools:

1.  **Location:** Test files (e.g., `Button.test.tsx`) can reside in `tests/frontend/` or alongside their components in `src/` (e.g., `src/components/UI/Button.test.tsx`). The `jest.config.frontend.js` `testMatch` pattern accommodates both.
2.  **Libraries:**
    *   `@testing-library/react`: For rendering components and querying the DOM.
    *   `@testing-library/jest-dom`: For custom DOM matchers (e.g., `.toBeInTheDocument()`, `.toHaveClass()`). Imported via `jest.setup.ts`.
    *   `@testing-library/user-event`: (Recommended) For simulating user interactions more realistically than `fireEvent`.
    *   **`msw` (Mock Service Worker):** **Recommended approach for mocking network requests (API calls)**. It intercepts actual HTTP requests made by your code (`fetch`, `axios`, etc.) at the network level, providing a more realistic and less brittle way to simulate API responses compared to mocking the API utility functions directly with `jest.mock()`.
3.  **Imports:**
    *   Use path aliases like `~/*` for importing components into test files (e.g., `import Button from '~/components/UI/Button';`).
4.  **Mocking Dependencies:**
    *   **Network Requests (`msw`):** For components that fetch data from your backend APIs or external services, set up `msw` request handlers before your tests run. This allows your component code to call your API utility functions normally (e.g., `utils/api.ts`), and `msw` will intercept the underlying `fetch` or HTTP request to return your defined mock data or simulate errors. This approach is generally preferred for APIs over mocking the utility functions directly.
    *   **Other Dependencies (`jest.mock()`):** For mocking other types of dependencies (e.g., React Context providers, specific hooks, non-network utility functions, third-party modules that don't make network requests), continue to use `jest.mock()` at the top level of your test file and manage mock implementations as needed.
5.  **Test Structure:**
    ```typescript
    import React from 'react';
    import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // Added waitFor for async
    // import userEvent from '@testing-library/user-event'; // If using user-event
    import '@testing-library/jest-dom'; // Usually not needed here if jest.setup.ts is configured
    import MyComponent from '~/components/MyComponent';

    // Example MSW setup (needs to be configured before tests run, e.g., in setupFilesAfterEnv or per describe block)
    // import { server } from '~/tests/msw/server'; // Assuming you have an MSW setup file

    // describe('MyComponent', () => {
    //   beforeAll(() => server.listen());
    //   afterEach(() => server.resetHandlers());
    //   afterAll(() => server.close());

    //   it('should render data fetched from API', async () => {
    //     // Arrange: Set up MSW handler for this specific test
    //     server.use(
    //       rest.get('/api/my-data', (req, res, ctx) => {
    //         return res(ctx.json({ message: 'Mocked Data' }));
    //       })
    //     );
    //     render(<MyComponent />);

    //     // Act: Rendering triggers the fetch

    //     // Assert: Wait for the data to appear in the DOM
    //     await waitFor(() => {
    //        expect(screen.getByText('Mocked Data')).toBeInTheDocument();
    //     });
    //   });

    //   it('should handle button click', async () => {
    //     // Arrange
    //     // const user = userEvent.setup(); // For user-event
    //     const handleClickMock = jest.fn();
    //     render(<MyComponent onButtonClick={handleClickMock} />);
    //     const button = screen.getByRole('button', { name: /Click Me/i });

    //     // Act
    //     // await user.click(button); // Using user-event
    //     fireEvent.click(button); // Using fireEvent

    //     // Assert
    //     expect(handleClickMock).toHaveBeenCalledTimes(1);
    //   });

    //   // More tests for different states, interactions, etc.
    // });
    ```
6.  **Querying Elements:**
    *   Prioritize accessible queries: `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByDisplayValue`.
    *   Use `getByTestId` as a last resort if accessible queries are not feasible.
7.  **Assertions:** Use `expect` with matchers from Jest and `@testing-library/jest-dom`. For asynchronous actions like data fetching, use `waitFor` or `findBy*` queries from React Testing Library to wait for elements to appear after the async operation completes.

---

## 3. Testing Next.js App Router API Routes (Backend - Legacy/Alternative)

This section refers to older style Next.js API routes if any exist. These tests would also use the `jest.config.backend.js` via `npm run test:backend`.

While tRPC is preferred for complex backend logic, simple API routes might still exist. The `next-test-api-route-handler` package can be used for these.

### Key Considerations (Condensed from original document):

1.  **Handler Import:** For App Router, import the specific method handlers (GET, POST, etc.) directly.
    ```typescript
    // Assuming path alias `@/` is mapped in jest.config.backend.js if used, or use `~/`
    // import { GET, POST } from '@/app/api/my-route/[id]/route'; 
    // ...
    // await testApiHandler({ handler: GET, params: { id: '...' } /* ... */ });
    ```
2.  **Path Aliases & Prisma Setup:** Same principles as for tRPC testing apply (`moduleNameMapper` in `jest.config.backend.js`).
3.  **Mocking:** Use `jest.mock()` for external dependencies.
4.  **Test Lifecycle:** Use `beforeAll`, `afterAll`, `beforeEach`, `afterEach` for setup and teardown, including database cleaning.
5.  **AAA Pattern:** Structure tests with Arrange, Act (call `testApiHandler`), Assert (check response status, JSON body, DB state, mock calls).

**When to use this approach:**
*   For existing simple RESTful API routes.
*   If a route doesn't fit well into the tRPC model (e.g., webhook handlers).

This updated guide should provide a more accurate reflection of our current testing practices and the lessons learned.