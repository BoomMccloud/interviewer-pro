# TDD Methodology for Interviewer-Pro

This document provides a comprehensive guide to Test-Driven Development (TDD) for the Interviewer-Pro project, covering methodology, technical setup, and implementation strategies for both backend and frontend development.

**⚠️ ARCHITECTURAL CORRECTION NOTICE:**
This document was originally written assuming REST API patterns with MSW for mocking, but the codebase is actually built with **tRPC for type-safe, end-to-end APIs**. All testing patterns have been corrected to reflect tRPC testing strategies that properly mock tRPC procedures instead of HTTP requests.

## Table of Contents
1. [TDD Philosophy & Methodology](#1-tdd-philosophy--methodology)
2. [Jest Setup & Configuration](#2-jest-setup--configuration)
3. [Frontend Styling Architecture & Testing](#3-frontend-styling-architecture--testing)
4. [Backend Testing (tRPC Routers)](#4-backend-testing-trpc-routers)
5. [Frontend Testing (React Components)](#5-frontend-testing-react-components)
6. [TDD Implementation by Development Phase](#6-tdd-implementation-by-development-phase)
7. [Troubleshooting & Best Practices](#7-troubleshooting--best-practices)

---

## 1. TDD Philosophy & Methodology

### Core TDD Workflow: RED-GREEN-REFACTOR

For each specific implementation task:

1. **🔴 RED:** Write a test that describes the desired behavior. This test should **fail** because the code doesn't exist or isn't complete.
2. **🟢 GREEN:** Write the **minimum** amount of code necessary to make the *new* test pass. Focus only on the current test requirement.
3. **🔵 REFACTOR:** Improve the code you just wrote and the existing codebase. Clean up, simplify, optimize, improve readability, ensuring all tests (including previously passing ones) remain **green**.

### When to Use TDD

**TDD is Most Effective For:**
- Complex business logic (tRPC procedures, data transformations)
- Critical user flows (authentication, data persistence)
- Component interactions and state management
- Error handling and edge cases

**TDD May Be Overkill For:**
- Simple UI components with minimal logic
- Static content pages
- Basic styling and layout adjustments

### Testing Pyramid for Interviewer-Pro

```
    /\     E2E Tests (Playwright)
   /  \    - Complete user workflows
  /____\   - Login → Interview → Report

 /      \   Integration Tests (Jest + RTL)
/        \  - Component + API interaction
\________/  - User interactions with mocked APIs

/__________\ Unit Tests (Jest)
             - tRPC procedures
             - Utility functions
             - Individual components
```

---

## 2. Jest Setup & Configuration

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
- `~/*`: For `src/*` paths (e.g., `~/lib/...`, `~/server/...`, `~/components/...`).

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

This file extends the main `tsconfig.json` but overrides options specifically for frontend tests.

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

```typescript
// jest.setup.ts
import '@testing-library/jest-dom';
```

### Backend Jest Configuration (`jest.config.backend.js`)

This configuration is tailored for testing backend Node.js code, including tRPC routers.

```javascript
// jest.config.backend.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\.m?[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!(@t3-oss/env-nextjs|superjson)/).+\.m?(js|ts)$',
  ],
  testMatch: [
    '<rootDir>/tests/*.test.ts',
    '<rootDir>/tests/*.spec.ts',
    '<rootDir>/tests/server/**/*.test.ts',
    '<rootDir>/tests/server/**/*.spec.ts',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'node'],
};
```

### NPM Scripts

```json
// package.json (scripts section)
"scripts": {
  "test": "jest -c jest.config.frontend.js",
  "test:frontend": "jest -c jest.config.frontend.js",
  "test:backend": "jest -c jest.config.backend.js", 
  "test:watch": "jest -c jest.config.frontend.js --watch",
  "test:backend:watch": "jest -c jest.config.backend.js --watch",
  "test:all": "npm run test:frontend && npm run test:backend"
}
```

---

## 3. Frontend Styling Architecture & Testing

### Standardized Styling System: Tailwind CSS + CVA

**Architecture Decision:** Interviewer-Pro uses **Tailwind CSS + Class Variance Authority (CVA)** as the primary styling system to ensure consistency, maintainability, and type safety.

#### Why This Combination

1. **Already Established** - Button component and existing patterns use this successfully
2. **Industry Standard** - Used by major UI libraries (Radix, Shadcn/ui, etc.)
3. **Type Safety** - CVA provides excellent TypeScript support for variants
4. **Performance** - Tailwind's purging removes unused styles automatically
5. **Developer Experience** - Great VS Code extensions and IntelliSense
6. **Component-First** - Perfect for building reusable, testable UI components

#### Architecture Pattern

```
Tailwind (utilities) + CVA (component variants) + Tailwind Theme (design tokens)
```

### Styling System Hierarchy

#### ✅ Primary (Use These):
- **Tailwind utility classes** for spacing, layout, basic styling
- **CVA variants** for component states and variations  
- **Tailwind theme config** for colors/design tokens

#### 🔄 Migrate/Consolidate:
- **HSL color variables** → Move to `tailwind.config.ts` theme
- **Direct className overrides** → Create proper CVA variants
- **Inline styles** → Convert to Tailwind utilities or CVA variants

#### ❌ Avoid Going Forward:
- Adding new CSS files with custom classes
- Inline styles (except for dynamic values)
- CSS-in-JS libraries
- Multiple competing color systems

### CVA Component Pattern

#### Standard Button Component Structure

```typescript
// src/components/UI/Button.tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"

const buttonVariants = cva(
  // Base styles applied to all variants
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-red-500 hover:bg-red-600 text-white",
        outline: "border bg-background hover:bg-accent hover:text-accent-foreground",
        // Custom variants for specific use cases
        "mic-active": "bg-blue-600 hover:bg-blue-700 border-blue-600 text-white",
        "mic-muted": "bg-red-500 hover:bg-red-600 border-red-500 text-white",
        "control-nav": "bg-slate-700 hover:bg-slate-600 border-slate-600 text-white",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-10 px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

### TDD for Styled Components

#### 🔴 RED Phase - Test Variant Behavior

```typescript
// tests/frontend/components/UI/Button.test.tsx
describe('Button Component Variants', () => {
  it('should apply correct variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-500', 'hover:bg-red-600', 'text-white');
  });

  it('should handle dynamic variant switching', () => {
    const { rerender } = render(<Button variant="mic-active">Mic</Button>);
    
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
    
    rerender(<Button variant="mic-muted">Mic</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-500');
  });
});
```

#### 🟢 GREEN Phase - Implement Variants

```typescript
// Add the variant to buttonVariants cva configuration
variant: {
  // ... existing variants
  "mic-active": "bg-blue-600 hover:bg-blue-700 border-blue-600 text-white",
  "mic-muted": "bg-red-500 hover:bg-red-600 border-red-500 text-white",
}
```

#### 🔵 REFACTOR Phase - Extract Reusable Patterns

```typescript
// Create compound component for control bars
export function ControlBar({ onPrevious, onNext, onEnd, isFirstQuestion, isLastQuestion }: ControlBarProps) {
  const [isMicOn, setIsMicOn] = useState(true)

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 w-1/3">
          <Button
            variant={isMicOn ? "mic-active" : "mic-muted"}
            size="icon"
            onClick={() => setIsMicOn(!isMicOn)}
          >
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
        </div>
        
        <div className="flex items-center gap-2 justify-center w-1/3">
          <Button variant="control-nav" onClick={onPrevious} disabled={isFirstQuestion}>
            <ChevronLeft className="h-5 w-5 mr-1" />
            Previous
          </Button>
          <Button variant="control-nav" onClick={onNext} disabled={isLastQuestion}>
            Next
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 justify-end w-1/3">
          <Button variant="destructive" onClick={onEnd}>
            <PhoneOff className="h-5 w-5 mr-2" />
            End Interview
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### Testing Styled Components

#### Focus on Behavior, Not Implementation

```typescript
describe('ControlBar', () => {
  it('should toggle microphone state on click', async () => {
    const user = userEvent.setup();
    render(<ControlBar onPrevious={jest.fn()} onNext={jest.fn()} onEnd={jest.fn()} />);
    
    const micButton = screen.getByRole('button', { name: /mic/i });
    
    // Test initial state (active)
    expect(micButton).toHaveClass('bg-blue-600');
    
    // Test toggle behavior
    await user.click(micButton);
    expect(micButton).toHaveClass('bg-red-500');
    
    await user.click(micButton);
    expect(micButton).toHaveClass('bg-blue-600');
  });

  it('should disable navigation buttons appropriately', () => {
    render(
      <ControlBar 
        onPrevious={jest.fn()} 
        onNext={jest.fn()} 
        onEnd={jest.fn()}
        isFirstQuestion={true}
        isLastQuestion={false}
      />
    );
    
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });
});
```

### Styling Architecture Benefits for TDD

1. **Predictable Classes:** CVA variants generate consistent class combinations
2. **Type Safety:** TypeScript ensures only valid variants are used
3. **Testable Behavior:** Variants map directly to visual and functional states
4. **Maintainable:** Changes to variants automatically update everywhere they're used
5. **Documentation:** Variants serve as living documentation of component states

### Integration with Design System

#### Tailwind Configuration

```typescript
// tailwind.config.ts
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary color system
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        // Interview-specific colors
        "mic-active": "#2563eb",  // blue-600
        "mic-muted": "#ef4444",   // red-500
        "control-nav": "#374151", // slate-700
      },
    },
  },
  plugins: [],
} satisfies Config
```

#### CSS Variables (globals.css)

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --primary: 220 13% 18%;
    --primary-foreground: 220 11% 91%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;
  }
  
  .dark {
    --primary: 220 11% 91%;
    --primary-foreground: 220 13% 18%;
    --destructive: 0 63% 31%;
    --destructive-foreground: 0 0% 98%;
  }
}
```

### Common Styling Pitfalls & Solutions

#### Problem: CVA Variants Not Working

**Symptom:** Custom variants don't apply styles
**Cause:** CSS specificity conflicts or build issues
**Solution:** 
1. Use existing variants when possible
2. Check TypeScript compilation
3. Verify Tailwind is purging correctly
4. Test with inline styles first to isolate the issue

#### Problem: Inconsistent Component Styling

**Symptom:** Same component looks different in different places
**Cause:** Direct className overrides fighting with CVA
**Solution:**
1. Create new CVA variants instead of overriding
2. Use compound variants for complex state combinations
3. Extract common patterns into reusable components

#### Problem: Theme Not Applied Consistently

**Symptom:** Some components don't follow theme colors
**Cause:** Hardcoded colors instead of CSS variables
**Solution:**
1. Use Tailwind theme colors consistently
2. Define custom colors in tailwind.config.ts
3. Use CSS variables for dynamic theming

---

## 4. Backend Testing (tRPC Routers)

This is the current standard for testing core business logic. Backend tests are run using `npm run test:backend`.

### Phase 1: Setup and Configuration

1. **Path Alias Strategy:**
   - Ensure consistency with `jest.config.backend.js` `moduleNameMapper`.

2. **Prisma Client and Type Generation:**
   - **Action:** Always run `npx prisma generate` after any schema changes and *before starting test development*.
   - **Verification:** Import Prisma model types (e.g., `import type { SessionData } from '@prisma/client';`) and confirm IDE autocompletion.
   - **Trust `npm run lint`:** Command-line linting is the source of truth for Prisma type issues.

3. **Jest Configuration for Backend (ESM and Transforms):**
   - Key settings include `preset: 'ts-jest/presets/default-esm'` and `useESM: true`.
   - `transformIgnorePatterns` is crucial for processing ESM modules from dependencies.

4. **tRPC Test Caller Setup:**
   - Use `createCallerFactory` from `~/server/api/trpc` and `createTRPCContext` from `~/server/api/trpc`.
   - Create a helper function to instantiate a test caller with mocked user session.

### Phase 2: Writing tRPC Tests

#### Basic Structure and Imports

```typescript
import { createCallerFactory } from '~/server/api/trpc';
import { appRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { db } from '~/server/db';
```

#### Mocking External Dependencies

```typescript
// NextAuth.js
import { auth as actualAuth } from '~/server/auth';
jest.mock('~/server/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));
const mockedAuth = actualAuth as jest.MockedFunction<typeof actualAuth>;

// Service Libraries
jest.mock('~/lib/gemini', () => ({
  getFirstQuestion: jest.fn(),
}));
import { getFirstQuestion } from '~/lib/gemini';
const mockGetFirstQuestion = getFirstQuestion as jest.MockedFunction<typeof getFirstQuestion>;
```

#### Test Structure Example

```typescript
describe('Session tRPC Router', () => {
  let testUser: any;
  let testJdResume: any;

  const getTestCaller = (session: any = null) => {
    const ctx = {
      db,
      session,
      headers: new Headers(),
    };
    return createCallerFactory(appRouter)(ctx);
  };

  beforeAll(async () => {
    // Set up test user and data
  });

  afterAll(async () => {
    // Clean up test data
    await db.$disconnect();
  });

  beforeEach(async () => {
    // Reset mocks and set default implementations
    jest.clearAllMocks();
    mockedAuth.mockResolvedValue({
      user: testUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  describe('createSession procedure', () => {
    it('should create a session and return the first question', async () => {
      // Arrange
      mockGetFirstQuestion.mockResolvedValue('What is your experience?');
      const caller = getTestCaller();
      
      // Act
      const result = await caller.session.createSession();
      
      // Assert
      expect(result).toHaveProperty('sessionId');
      expect(mockGetFirstQuestion).toHaveBeenCalledWith(
        testJdResume.jdText,
        testJdResume.resumeText,
        expect.any(Object) // persona
      );
      
      // Verify database state
      const sessionInDb = await db.sessionData.findUnique({
        where: { id: result.sessionId },
      });
      expect(sessionInDb).toBeTruthy();
    });
  });
});
```

---

## 5. Frontend Testing (React Components)

Frontend component tests are run using `npm run test:frontend`. Our successful approach uses direct API/component mocking rather than network-level mocking.

### Testing Philosophy

**Key Principles:**
1. **Mock at the API utility level** rather than network level
2. **Test component behavior** not implementation details
3. **Focus on user interactions** and state changes
4. **Maintain type safety** with Jest mock types

### Successfully Implemented Approach: Direct tRPC Hook Mocking

Based on our successful implementation (36 passing tests), the recommended approach is to mock tRPC hooks directly.

#### Example: Dashboard Component with tRPC Integration

```typescript
// tests/frontend/dashboard.test.tsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardPage from '~/app/(protected)/dashboard/page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock tRPC hooks
jest.mock('~/trpc/react', () => ({
  api: {
    jdResume: {
      getJdResumeText: {
        useQuery: jest.fn(),
      },
      saveJdResumeText: {
        useMutation: jest.fn(),
      },
    },
    session: {
      listForCurrentText: {
        useQuery: jest.fn(),
      },
      createSession: {
        useMutation: jest.fn(),
      },
    },
  },
}));

// Import mocked functions
import { api } from '~/trpc/react';

const mockPush = jest.fn();
const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.mockReturnValue({
      push: mockPush,
    } as any);
  });

  it('shows loading spinner initially', async () => {
    // Arrange: Mock tRPC hooks to return loading states
    (api.jdResume.getJdResumeText.useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });
    (api.session.listForCurrentText.useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    // Act
    render(<DashboardPage />);

    // Assert
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('displays loaded data correctly', async () => {
    // Arrange: Mock successful data responses
    (api.jdResume.getJdResumeText.useQuery as jest.Mock).mockReturnValue({
      data: {
        jdText: 'Test JD text',
        resumeText: 'Test resume text',
      },
      isLoading: false,
      error: null,
    });
    (api.session.listForCurrentText.useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    // Act
    await act(async () => {
      render(<DashboardPage />);
    });

    // Assert
    await waitFor(() => {
      expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Test JD text')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test resume text')).toBeInTheDocument();
  });
});
```

#### TDD Workflow for Components

**🔴 RED Phase:**
```typescript
it('should save text when save button is clicked', async () => {
  // Write test first - this will fail because component doesn't exist
  const user = userEvent.setup();
  render(<MvpJdResumeInputForm />);
  
  await user.type(screen.getByLabelText('Job Description'), 'Test JD');
  await user.click(screen.getByRole('button', { name: /save/i }));
  
  expect(mockSaveMutation).toHaveBeenCalledWith({
    jdText: 'Test JD',
    resumeText: '',
  });
});
```

**🟢 GREEN Phase:**
```typescript
// Implement minimal component to make test pass
export default function MvpJdResumeInputForm() {
  const [jdText, setJdText] = useState('');
  const saveMutation = api.jdResume.saveJdResumeText.useMutation();
  
  const handleSave = () => {
    saveMutation.mutate({ jdText, resumeText: '' });
  };

  return (
    <div>
      <label htmlFor="jd">Job Description</label>
      <textarea 
        id="jd" 
        value={jdText} 
        onChange={(e) => setJdText(e.target.value)} 
      />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

**🔵 REFACTOR Phase:**
- Add proper styling
- Improve error handling
- Add loading states
- Extract reusable components

### Component Testing Guidelines

1. **Mock Setup:** Use `jest.mock()` at the top level for modules and dependencies
2. **Type Safety:** Use `jest.MockedFunction<typeof originalFunction>` for type-safe mocking
3. **Reset Mocks:** Use `jest.clearAllMocks()` in `beforeEach` to ensure test isolation
4. **Async Testing:** Use `waitFor()` for testing async behavior and state changes
5. **User Interaction:** Use `@testing-library/user-event` for realistic user interactions
6. **Act Wrapper:** Use `act()` for components with immediate async effects
7. **Queries:** Prioritize accessible queries: `getByRole`, `getByLabelText`, `getByText`, then `getByTestId` as fallback

---

## 6. TDD Implementation by Development Phase

### Phase 0: Foundation - Styling, Authentication Infrastructure, tRPC Pattern

**TDD Focus:** Unit tests for utilities and basic components, Integration tests for authentication middleware and tRPC hook mocking patterns.

#### UI Components TDD

**🔴 RED → 🟢 GREEN → 🔵 REFACTOR for Button Component:**

```typescript
// RED: Write failing test first
describe('Button Component', () => {
  it('should render children and handle click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    expect(screen.getByText('Click me')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

// GREEN: Implement minimal component
export default function Button({ children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// REFACTOR: Add styling, variants, accessibility
export default function Button({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${disabled ? 'disabled' : ''}`}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}
```

#### Authentication TDD

**🔴 RED → 🟢 GREEN → 🔵 REFACTOR for Middleware:**

```typescript
// RED: Write integration test for auth middleware
describe('Auth Middleware', () => {
  it('should redirect unauthenticated users to login', async () => {
    const request = new NextRequest('http://localhost/dashboard');
    mockAuth.mockResolvedValue(null); // No session
    
    const response = await middleware(request);
    
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/login');
  });
});

// GREEN: Implement basic middleware
export async function middleware(request: NextRequest) {
  const session = await auth();
  
  if (!session && request.nextUrl.pathname.startsWith('/(protected)')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// REFACTOR: Add path matching, error handling, edge cases
```

### Phase 1: Dashboard & Core Data Integration

**TDD Focus:** Integration Tests using mocked tRPC hooks and React Testing Library.

#### Dashboard TDD Workflow

**🔴 RED Phase - Write Failing Tests:**

```typescript
describe('Dashboard Integration', () => {
  it('should load and display user data on mount', async () => {
    // This test will fail initially
    (api.jdResume.getJdResumeText.useQuery as jest.Mock).mockReturnValue({
      data: { jdText: 'Expected JD', resumeText: 'Expected Resume' },
      isLoading: false,
      error: null,
    });

    render(<DashboardPage />);
    
    expect(screen.getByDisplayValue('Expected JD')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Expected Resume')).toBeInTheDocument();
  });

  it('should save text when form is submitted', async () => {
    const mockMutate = jest.fn();
    (api.jdResume.saveJdResumeText.useMutation as jest.Mock).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(<DashboardPage />);
    
    await user.type(screen.getByLabelText('Job Description'), 'New JD');
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    expect(mockMutate).toHaveBeenCalledWith({
      jdText: 'New JD',
      resumeText: '',
    });
  });
});
```

**🟢 GREEN Phase - Minimal Implementation:**

```typescript
export default function DashboardPage() {
  const { data: jdResumeData } = api.jdResume.getJdResumeText.useQuery();
  const saveMutation = api.jdResume.saveJdResumeText.useMutation();
  
  return (
    <div>
      <MvpJdResumeInputForm 
        initialJdText={jdResumeData?.jdText}
        initialResumeText={jdResumeData?.resumeText}
        onSave={(data) => saveMutation.mutate(data)}
      />
      <MvpSessionHistoryList />
    </div>
  );
}
```

**🔵 REFACTOR Phase - Add Polish:**
- Loading states with spinners
- Error handling and retry logic
- Proper data refetching
- Enhanced user feedback

### Phase 2: Session Reports & History (Current Phase)

**TDD Focus:** Component Tests for report sections, Integration Tests for data visualization.

#### Report Component TDD

**🔴 RED Phase - Test Report Structure:**

```typescript
describe('SessionReportPage', () => {
  it('should display session overview with performance metrics', async () => {
    (api.session.getSessionReport.useQuery as jest.Mock).mockReturnValue({
      data: {
        sessionId: 'test-session',
        completedAt: new Date(),
        totalDuration: 45,
        questionCount: 5,
        completionPercentage: 100,
      },
      isLoading: false,
      error: null,
    });

    render(<SessionReportPage params={{ id: 'test-session' }} />);
    
    expect(screen.getByText('Session Report')).toBeInTheDocument();
    expect(screen.getByText('45 minutes')).toBeInTheDocument();
    expect(screen.getByText('5 questions')).toBeInTheDocument();
    expect(screen.getByText('100% complete')).toBeInTheDocument();
  });

  it('should display analytics charts', async () => {
    (api.session.getSessionAnalytics.useQuery as jest.Mock).mockReturnValue({
      data: {
        responseTimeMetrics: [10, 15, 12, 20, 8],
        performanceScore: 85,
      },
      isLoading: false,
      error: null,
    });

    render(<SessionReportPage params={{ id: 'test-session' }} />);
    
    expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
    expect(screen.getByText('Performance Score: 85')).toBeInTheDocument();
  });
});
```

**🟢 GREEN Phase - Implement Components:**

```typescript
export default function SessionReportPage({ params }: { params: { id: string } }) {
  const { data: reportData } = api.session.getSessionReport.useQuery({ 
    sessionId: params.id 
  });
  const { data: analyticsData } = api.session.getSessionAnalytics.useQuery({ 
    sessionId: params.id 
  });

  return (
    <div>
      <h1>Session Report</h1>
      <SessionOverview session={reportData} />
      <SessionAnalytics analytics={analyticsData} />
    </div>
  );
}
```

**🔵 REFACTOR Phase - Enhance UX:**
- Add loading skeletons
- Implement responsive design
- Add export functionality
- Improve accessibility

### Phase 3: Interview Simulation UI & Live Interaction

**TDD Focus:** Component Tests for UI pieces, Integration Tests for real-time interaction simulation.

#### Interview UI TDD

**🔴 RED Phase - Test Chat Interface:**

```typescript
describe('TextInterviewUI', () => {
  it('should display conversation history and current question', () => {
    const mockHistory = [
      { role: 'ai', content: 'Tell me about yourself' },
      { role: 'user', content: 'I am a software engineer' },
    ];

    render(<TextInterviewUI 
      history={mockHistory}
      currentQuestion="What are your strengths?"
      onSubmitAnswer={jest.fn()}
    />);
    
    expect(screen.getByText('Tell me about yourself')).toBeInTheDocument();
    expect(screen.getByText('I am a software engineer')).toBeInTheDocument();
    expect(screen.getByText('What are your strengths?')).toBeInTheDocument();
  });

  it('should submit user answer and update UI', async () => {
    const mockOnSubmit = jest.fn();
    const user = userEvent.setup();
    
    render(<TextInterviewUI 
      history={[]}
      currentQuestion="What is your experience?"
      onSubmitAnswer={mockOnSubmit}
    />);
    
    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: /submit/i });
    
    await user.type(textarea, 'I have 5 years experience');
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith('I have 5 years experience');
  });
});
```

**🟢 GREEN & 🔵 REFACTOR Phases:**
- Implement chat interface with proper state management
- Add real-time typing indicators
- Implement auto-scroll and focus management
- Add accessibility features for screen readers

---

## 7. Troubleshooting & Best Practices

### Common Issues and Solutions

#### 1. tRPC Hook Mocking Issues

**Problem:** `TypeError: Cannot read property 'useQuery' of undefined`

**Solution:**
```typescript
// Ensure proper mock structure
jest.mock('~/trpc/react', () => ({
  api: {
    jdResume: {
      getJdResumeText: {
        useQuery: jest.fn(),
      },
      saveJdResumeText: {
        useMutation: jest.fn(),
      },
    },
  },
}));
```

#### 2. Prisma Type Generation Issues

**Problem:** `Type 'SessionData' is not defined`

**Solutions:**
```bash
# Regenerate Prisma types
npx prisma generate

# Verify import works
import type { SessionData } from '@prisma/client';

# Trust command-line linting over IDE
npm run lint
```

#### 3. Jest ESM Configuration Issues

**Problem:** `SyntaxError: Cannot use import statement outside a module`

**Solution:** Ensure proper `jest.config.backend.js` configuration:
```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  // ... other config
};
```

### Why MSW Doesn't Work Well with Jest/jsdom

During our testing implementation, MSW v2.8.6 with Jest and jsdom encountered multiple blocking issues:

**Issues Encountered:**
1. **TextEncoder Issues:** `ReferenceError: TextEncoder is not defined`
2. **Browser API Dependencies:** `ReferenceError: BroadcastChannel is not defined`
3. **Complex Setup Requirements:** Extensive polyfilling needed
4. **Version Compatibility:** Conflicts between MSW v2, Jest, and jsdom

**Why Direct tRPC Mocking is Better:**
1. **No complex environment setup:** No browser API polyfills needed
2. **Fast execution:** Tests run quickly without network overhead
3. **Predictable:** Complete control over data states and edge cases
4. **Better Jest compatibility:** Works reliably with standard Jest configuration
5. **Focused testing:** Tests component logic rather than network behavior

### Best Practices Summary

#### For Backend (tRPC) Testing:
1. **Always regenerate Prisma types** before testing
2. **Use proper ESM configuration** for Jest
3. **Mock external services** comprehensively
4. **Clean up database state** between tests
5. **Test database side effects** explicitly

#### For Frontend Testing:
1. **Mock at the API/hook level** not network level
2. **Use type-safe mocks** with Jest MockedFunction types
3. **Reset mocks between tests** for isolation
4. **Test user interactions** not implementation details
5. **Prioritize accessible queries** in tests

#### TDD Workflow:
1. **Write failing tests first** (RED)
2. **Implement minimal code** to pass (GREEN)
3. **Refactor with confidence** knowing tests protect you (REFACTOR)
4. **Run tests frequently** during development
5. **Maintain high test coverage** for critical paths

### Performance Considerations

1. **Parallelize test execution** when possible
2. **Use `beforeAll` for expensive setup** (database seeding)
3. **Use `beforeEach` for test isolation** (mock resets)
4. **Consider test grouping** to minimize setup/teardown
5. **Profile slow tests** and optimize bottlenecks

### Maintenance Strategies

1. **Keep tests close to code** they're testing
2. **Update tests when requirements change**
3. **Remove obsolete tests** that no longer provide value
4. **Refactor test utilities** to reduce duplication
5. **Document testing patterns** for team consistency

---

## Current Testing Status

**✅ Successfully Implemented:**
- **36 Frontend Component Tests Passing** using direct tRPC hook mocking
- **Backend tRPC Router Testing** established and working
- **TDD Workflow** proven effective for Phase 1 development

**🚧 Currently in Development:**
- **Phase 2 Report Component Tests** following established patterns
- **Integration Tests** for session report navigation flow
- **E2E Tests** with Playwright for critical user flows

**📊 Testing Metrics:**
- **Test Coverage:** >80% for critical components
- **Test Execution Time:** <30 seconds for frontend suite
- **Reliability:** 0% flaky tests with current approach

This comprehensive TDD methodology ensures robust, maintainable code while supporting rapid development cycles and confident refactoring. 