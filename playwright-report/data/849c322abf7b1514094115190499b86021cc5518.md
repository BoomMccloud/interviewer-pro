# Test info

- Name: Authentication E2E Tests - Logged Out >> Scenario 2: Accessing Root While Logged Out redirects to Login
- Location: /Users/jasonbxu/Documents/GitHub/interviewer-pro/tests/e2e/auth.spec.ts:24:3

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).toHaveURL(expected)

Locator: locator(':root')
Expected string: "http://localhost:3000/login"
Received string: "http://localhost:3000/dashboard"
Call log:
  - expect.toHaveURL with timeout 5000ms
  - waiting for locator(':root')
    8 × locator resolved to <html lang="en">…</html>
      - unexpected value "http://localhost:3000/dashboard"

    at /Users/jasonbxu/Documents/GitHub/interviewer-pro/tests/e2e/auth.spec.ts:26:24
```

# Page snapshot

```yaml
- button "Switch to Dark Mode"
- main:
  - heading "Interview Dashboard" [level=1]
  - heading "Prepare for your Interview" [level=2]
  - paragraph: Paste your Job Description and Resume below to get started.
  - text: Job Description
  - textbox "Job Description"
  - text: Your Resume
  - textbox "Your Resume"
  - button "Start Technical Lead Session"
  - heading "Session History" [level=2]
  - paragraph: Your past interview sessions for the current JD/Resume will appear here.
  - list:
    - listitem: Session 1 - Technical Lead - Completed 2024-07-30 (View Report)
    - listitem: Session 2 - Technical Lead - In Progress (Resume)
- alert
- button "Open Next.js Dev Tools":
  - img
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | // import dotenv from 'dotenv'; // No longer needed here for session mocking
   3 | // import { SignJWT } from 'jose'; // No longer needed here
   4 | // import { TextEncoder } from 'util'; // No longer needed here
   5 |
   6 | // // Load environment variables from .env file (if you had client-side specific env vars for tests)
   7 | // dotenv.config();
   8 |
   9 | test.describe('Authentication E2E Tests - Logged Out', () => {
  10 |   const PROTECTED_ROUTE = '/dashboard';
  11 |   const LOGIN_ROUTE = '/login';
  12 |   const ROOT_ROUTE = '/';
  13 |
  14 |   test.beforeEach(async ({ context }) => {
  15 |     await context.clearCookies();
  16 |   });
  17 |
  18 |   test('Scenario 1: Accessing Protected Route While Logged Out redirects to Login', async ({ page }) => {
  19 |     await page.goto(PROTECTED_ROUTE);
  20 |     await expect(page).toHaveURL(LOGIN_ROUTE);
  21 |     await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
  22 |   });
  23 |
  24 |   test('Scenario 2: Accessing Root While Logged Out redirects to Login', async ({ page }) => {
  25 |     await page.goto(ROOT_ROUTE);
> 26 |     await expect(page).toHaveURL(LOGIN_ROUTE);
     |                        ^ Error: Timed out 5000ms waiting for expect(locator).toHaveURL(expected)
  27 |     await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
  28 |   });
  29 | });
  30 |
  31 | test.describe('Authentication E2E Tests - Logged In (Requires server with E2E_TESTING=true)', () => {
  32 |   const PROTECTED_ROUTE = '/dashboard';
  33 |   const LOGIN_ROUTE = '/login';
  34 |   // const MOCKED_USER_EMAIL = 'testuser@example.com'; // No longer needed for client-side mock creation
  35 |   // const AUTH_SECRET = process.env.AUTH_SECRET; // No longer needed for client-side mock creation
  36 |
  37 |   // console.log('AUTH_SECRET loaded in test:', AUTH_SECRET ? '****** (loaded)' : 'NOT LOADED');
  38 |   // const cookieName = process.env.NEXTAUTH_URL?.startsWith('https')
  39 |   //   ? '__Secure-next-auth.session-token'
  40 |   //   : 'next-auth.session-token';
  41 |   // console.log('Determined cookie name:', cookieName);
  42 |   // console.log('NEXTAUTH_URL from env:', process.env.NEXTAUTH_URL);
  43 |
  44 |   // if (!AUTH_SECRET) { // This check is not relevant if not creating cookie on client
  45 |   //   throw new Error('AUTH_SECRET environment variable is not set. Please ensure it is available in your .env file.');
  46 |   // }
  47 |
  48 |   // beforeEach is no longer setting cookies here; server provides mock session via E2E_TESTING=true
  49 |   test.beforeEach(async ({ context }) => {
  50 |     // Clear cookies to ensure a clean slate even for logged-in tests, 
  51 |     // relying on server-side mock via E2E_TESTING=true
  52 |     await context.clearCookies(); 
  53 |   });
  54 |
  55 |   test('Scenario 4: Accessing Protected Route While Logged In stays on Protected Route', async ({ page }) => {
  56 |     await page.goto(PROTECTED_ROUTE);
  57 |     await expect(page).toHaveURL(PROTECTED_ROUTE);
  58 |     await expect(page.getByRole('heading', { name: 'Interview Dashboard' })).toBeVisible();
  59 |   });
  60 |
  61 |   test('Scenario 5: Accessing Login Page While Logged In redirects to Protected Route', async ({ page }) => {
  62 |     await page.goto(LOGIN_ROUTE);
  63 |     await expect(page).toHaveURL(PROTECTED_ROUTE);
  64 |     await expect(page.getByRole('heading', { name: 'Interview Dashboard' })).toBeVisible();
  65 |   });
  66 | }); 
```