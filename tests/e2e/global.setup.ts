/**
 * This global setup file is executed once before all E2E tests.
 *
 * It's responsible for two main things in order:
 * 1. Seeding the database with a consistent, predictable state.
 * 2. Performing a programmatic login to get a valid session, and saving
 *    that session state to a file for all tests to use.
 */
import { chromium, type FullConfig } from '@playwright/test';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

export const STORAGE_STATE = path.resolve('./tests/e2e/storageState.json');

// --- Seeding Constants (from original setup) ---
const E2E_SESSION_ID = 'clxnt1o60000008l3f9j6g9z7';
const E2E_USER_ID = 'e2e-test-user-id-123';
const E2E_USER_EMAIL = 'e2e-test@example.com';
const E2E_USER_NAME = 'E2E Test User';
const E2E_PERSONA_ID = 'swe-interviewer-standard';


async function seedDatabase() {
  const prisma = new PrismaClient();
  try {
    console.log('🌱 [Global Setup] Seeding database for Playwright tests...');

    // Clean up previous E2E data to ensure a fresh start.
    await prisma.sessionData.deleteMany({
      where: { id: E2E_SESSION_ID },
    });
    const usersToDelete = await prisma.user.findMany({
      where: { OR: [{ id: E2E_USER_ID }, { email: E2E_USER_EMAIL }] },
    });
    if (usersToDelete.length > 0) {
      const userIds = usersToDelete.map((u) => u.id);
      await prisma.jdResumeText.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    // 1. Create the E2E test user
    const newUser = await prisma.user.create({
      data: { id: E2E_USER_ID, email: E2E_USER_EMAIL, name: E2E_USER_NAME },
    });

    // 2. Create a JD/Resume entry
    const jdResume = await prisma.jdResumeText.create({
      data: { userId: newUser.id, jdText: 'E2E Test JD', resumeText: 'E2E Test Resume' },
    });

    // 3. Create session data
    await prisma.sessionData.create({
      data: {
        id: E2E_SESSION_ID,
        userId: newUser.id,
        jdResumeTextId: jdResume.id,
        personaId: E2E_PERSONA_ID,
        durationInSeconds: 600,
        currentQuestionIndex: 2,
        endTime: null,
        overallAssessment: {
          summary: 'This is a summary.',
          strengths: ['Problem-solving'],
          improvements: ['Conciseness'],
          score: 8,
        },
        questionSegments: [
          // Simplified for brevity
        ],
      },
    });

    console.log('✅ [Global Setup] Database seeded successfully.');
  } catch (error) {
    console.error('❌ [Global Setup] Failed to seed database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}


interface ErrorResponse {
  message: string;
}

async function globalSetup(config: FullConfig) {
  // 1. Seed the database before doing anything else.
  await seedDatabase();

  // 2. Now, perform the programmatic login.
  if (!config.projects || config.projects.length === 0) {
    throw new Error('No projects found in the Playwright config');
  }
  const projectConfig = config.projects[0];
  if (!projectConfig) {
    throw new Error('First project configuration is undefined.');
  }
  const { baseURL } = projectConfig.use;
  if (!baseURL) {
    throw new Error('baseURL is not defined in the Playwright config');
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    const response = await page.request.post(`${baseURL}/api/e2e-auth/login`);
    if (!response.ok()) {
      const errorBody = (await response.json()) as ErrorResponse;
      throw new Error(`E2E login failed: ${errorBody.message}`);
    }

    await page.context().storageState({ path: STORAGE_STATE });
    console.log(`✅ Authentication state saved to ${STORAGE_STATE}`);
  } catch (error) {
    console.error('❌ Error in global setup login phase:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup; 