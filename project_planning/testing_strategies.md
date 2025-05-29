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

## 2. Testing Frontend React Components (Successfully Implemented Approach)

Frontend component tests are run using `npm run test:frontend` which utilizes `jest.config.frontend.js` and `tsconfig.jest.json`.

### Key Principles & Tools:

1.  **Location:** Test files (e.g., `dashboard.test.tsx`) can reside in `tests/frontend/` or alongside their components in `src/` (e.g., `src/components/UI/Button.test.tsx`). The `jest.config.frontend.js` `testMatch` pattern accommodates both. *Note: Encountered issues with Jest resolving paths containing parentheses like `(protected)`. Renaming test directories to remove such characters (e.g., `tests/frontend/protected/dashboard`) was necessary to get tests running reliably.*
2.  **Libraries:**
    *   `@testing-library/react`: For rendering components and querying the DOM.
    *   `@testing-library/jest-dom`: For custom DOM matchers (e.g., `.toBeInTheDocument()`, `.toHaveClass()`). Imported via `jest.setup.ts`.
    *   `@testing-library/user-event`: (Recommended) For simulating user interactions more realistically than `fireEvent`.
    *   `jest-fetch-mock`: For mocking fetch calls in API utility functions.
3.  **Imports:**
    *   Use path aliases like `~/*` for importing components into test files (e.g., `import Button from '~/components/UI/Button';`).
4.  **Mocking Strategy:** **Mock at the API utility and component integration level** rather than at the network level. This includes:
    *   **API Utility Functions**: Mock `~/utils/api` functions directly to control data states
    *   **Next.js Components**: Mock `next/navigation`, `next/image`, etc. as needed
    *   **Custom Components**: Mock UI components like Spinner for consistent testing
    *   **Third-party Libraries**: Mock external dependencies as needed

### Successfully Implemented Testing Approach: Direct API/Component Mocking

Based on our successful implementation for the dashboard and form components, the recommended approach for frontend testing is to mock dependencies directly rather than intercepting network requests.

#### Example: Testing a Dashboard Page with API Integration

```typescript
// tests/frontend/dashboard.test.tsx - Real example from our implementation
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import DashboardPage from '~/app/(protected)/dashboard/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock the Spinner component
jest.mock('~/components/UI/Spinner', () => {
  return function MockSpinner() {
    return <div data-testid="spinner">Loading...</div>;
  };
});

// Mock the API utility functions
jest.mock('~/utils/api', () => ({
  getMvpJdResumeText: jest.fn(),
  listMvpSessionsForCurrentText: jest.fn(),
  saveMvpJdResumeText: jest.fn(),
  createMvpSession: jest.fn(),
}));

// Import the mocked functions
import { getMvpJdResumeText, listMvpSessionsForCurrentText } from '~/utils/api';

const mockPush = jest.fn();
const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockGetMvpJdResumeText = getMvpJdResumeText as jest.MockedFunction<typeof getMvpJdResumeText>;
const mockListMvpSessionsForCurrentText = listMvpSessionsForCurrentText as jest.MockedFunction<typeof listMvpSessionsForCurrentText>;

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.mockReturnValue({
      push: mockPush,
    } as unknown as AppRouterInstance);
  });

  it('shows loading spinner initially', async () => {
    // Setup mocks to return data after delay
    mockGetMvpJdResumeText.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(null), 100))
    );
    mockListMvpSessionsForCurrentText.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    render(<DashboardPage />);

    // Should show spinner initially
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('displays the real form components when loaded', async () => {
    // Setup mocks to return data
    mockGetMvpJdResumeText.mockResolvedValue({
      id: 'test-id',
      userId: 'test-user',
      jdText: 'Test JD text',
      resumeText: 'Test resume text',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockListMvpSessionsForCurrentText.mockResolvedValue([]);

    await act(async () => {
      render(<DashboardPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });
    
    // Check real form components are rendered
    expect(screen.getByLabelText('Job Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Resume')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start technical interview/i })).toBeInTheDocument();
    
    // Check session history
    expect(screen.getByText('No interview sessions yet')).toBeInTheDocument();
  });

  it('displays error message when API calls fail', async () => {
    // Setup mocks to reject
    mockGetMvpJdResumeText.mockRejectedValue(new Error('API Error'));
    mockListMvpSessionsForCurrentText.mockRejectedValue(new Error('API Error'));

    await act(async () => {
      render(<DashboardPage />);
    });

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/API Error/)).toBeInTheDocument();
    });
  });
});
```

#### Example: Testing Complex Form Component Interactions

```typescript
// tests/frontend/components/MvpJdResumeInputForm.test.tsx - Real example from our implementation
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MvpJdResumeInputForm from '~/components/MvpJdResumeInputForm';

// Mock the API functions
jest.mock('~/utils/api', () => ({
  saveMvpJdResumeText: jest.fn(),
  createMvpSession: jest.fn(),
}));

// Mock the Spinner component
jest.mock('~/components/UI/Spinner', () => {
  return function MockSpinner() {
    return <div data-testid="spinner">Loading...</div>;
  };
});

import { saveMvpJdResumeText, createMvpSession } from '~/utils/api';

const mockSaveMvpJdResumeText = saveMvpJdResumeText as jest.MockedFunction<typeof saveMvpJdResumeText>;
const mockCreateMvpSession = createMvpSession as jest.MockedFunction<typeof createMvpSession>;

describe('MvpJdResumeInputForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveMvpJdResumeText.mockResolvedValue({
      id: 'test-id',
      userId: 'test-user',
      jdText: 'Test JD',
      resumeText: 'Test Resume',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockCreateMvpSession.mockResolvedValue({ sessionId: 'test-session-id' });
  });

  it('calls saveMvpJdResumeText when save button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnSave = jest.fn();

    render(<MvpJdResumeInputForm onSave={mockOnSave} />);

    const jdTextarea = screen.getByLabelText('Job Description');
    const resumeTextarea = screen.getByLabelText('Resume');
    const saveButton = screen.getByRole('button', { name: /save text/i });

    await user.type(jdTextarea, 'Test JD');
    await user.type(resumeTextarea, 'Test Resume');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockSaveMvpJdResumeText).toHaveBeenCalledWith({
        jdText: 'Test JD',
        resumeText: 'Test Resume',
      });
    });

    expect(mockOnSave).toHaveBeenCalledWith({
      jdText: 'Test JD',
      resumeText: 'Test Resume',
    });
  });

  it('shows loading state when saving', async () => {
    const user = userEvent.setup();
    mockSaveMvpJdResumeText.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        id: 'test-id',
        userId: 'test-user',
        jdText: 'Test JD',
        resumeText: 'Test Resume',
        createdAt: new Date(),
        updatedAt: new Date(),
      }), 100))
    );

    render(<MvpJdResumeInputForm />);

    const jdTextarea = screen.getByLabelText('Job Description');
    const resumeTextarea = screen.getByLabelText('Resume');
    const saveButton = screen.getByRole('button', { name: /save text/i });

    await user.type(jdTextarea, 'Test JD');
    await user.type(resumeTextarea, 'Test Resume');
    await user.click(saveButton);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('✓ Text saved successfully')).toBeInTheDocument();
    });
  });
});
```

### Test Structure Guidelines:

1.  **Mock Setup:** Use `jest.mock()` at the top level for modules and dependencies
2.  **Type Safety:** Use `jest.MockedFunction<typeof originalFunction>` for type-safe mocking
3.  **Reset Mocks:** Use `jest.clearAllMocks()` in `beforeEach` to ensure test isolation
4.  **Async Testing:** Use `waitFor()` for testing async behavior and state changes
5.  **User Interaction:** Use `@testing-library/user-event` for realistic user interactions
6.  **Act Wrapper:** Use `act()` for components with immediate async effects
7.  **Queries:** Prioritize accessible queries: `getByRole`, `getByLabelText`, `getByText`, then `getByTestId` as fallback

### Advantages of This Approach:

1. **No complex environment setup**: No browser API polyfills needed
2. **Fast execution**: Tests run quickly without network overhead
3. **Predictable**: Complete control over data states and edge cases
4. **Better Jest compatibility**: Works reliably with standard Jest configuration
5. **Focused testing**: Tests component logic rather than network behavior
6. **Easy debugging**: Clear, direct mocking with good error messages
7. **Real component testing**: Tests actual components with real interactions

### Successfully Tested Components:

Our approach has been successfully implemented and tested for:
- **Dashboard Page** (`src/app/(protected)/dashboard/page.tsx`) - 5 tests passing
- **Form Component** (`src/components/MvpJdResumeInputForm.tsx`) - 11 tests passing  
- **Session History List** (`src/components/MvpSessionHistoryList.tsx`) - 13 tests passing
- **All UI Components** - Button, Input, Spinner, Timer tests passing

Total: **36 component tests passing** with this approach.

### Issues with Alternative Approaches:

**MSW (Mock Service Worker) - Not Recommended for Jest/jsdom:**
During our testing implementation, MSW v2.8.6 with Jest and jsdom encountered multiple blocking issues that prevented successful test execution:

1. **TextEncoder Issues**: 
   - `ReferenceError: TextEncoder is not defined` - Even with polyfills (`text-encoding-utf-8`, Node.js built-in TextEncoder)
   - Polyfills failed to resolve the issue in MSW's internal dependencies

2. **Browser API Dependencies**:
   - `ReferenceError: BroadcastChannel is not defined` - Missing browser APIs in Node.js environment
   - MSW v2 has increased browser API dependencies that don't exist in Jest/jsdom

3. **Complex Setup Requirements**:
   - Requires extensive polyfilling and environment configuration
   - Conflicts between Node.js environment (Jest) and browser APIs (MSW)
   - Version compatibility issues between MSW v2, Jest, and jsdom

4. **Development Experience**:
   - Poor error messages and debugging experience
   - Time-consuming setup that doesn't provide significant testing benefits over direct mocking
   - Adds complexity without improving test reliability or maintainability

**Attempted Solutions That Failed**:
- Installing `text-encoding-utf-8` polyfill
- Using Node.js built-in TextEncoder/TextDecoder
- Importing polyfills in test files and Jest setup
- Updating MSW version and configuration

**Conclusion**: MSW may work better in browser-based testing environments (like Playwright), but for unit/integration tests with Jest and jsdom, direct API mocking is more reliable, faster, and easier to maintain. Our successful implementation proves this approach works well for comprehensive React component testing.

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