/**
 * Playwright Global Setup
 * 
 * This script runs once before all E2E tests. It's responsible for preparing
 * the testing environment, primarily by seeding the database with a consistent,
 * predictable state. This approach is more robust than seeding via an API
 * endpoint because it's not dependent on the server being fully available
 * and bypasses any potential environment variable issues with the web server process.
 * 
 * @see https://playwright.dev/docs/test-global-setup-teardown
 */

import { PrismaClient } from '@prisma/client';

const E2E_SESSION_ID = 'clxnt1o60000008l3f9j6g9z7';
const E2E_USER_ID = 'e2e-test-user-id-123';
const E2E_USER_EMAIL = 'e2e-test@example.com';
const E2E_USER_NAME = 'E2E Test User';
const E2E_PERSONA_ID = 'swe-interviewer-standard';

async function setup() {
  const prisma = new PrismaClient();
  try {
    console.log('🌱 [Global Setup] Seeding database for Playwright tests...');

    // Clean up previous E2E data to ensure a fresh start.
    // This is more robust than the previous implementation. We delete in reverse order of creation,
    // targeting known static IDs to prevent unique constraint errors from previous failed runs.

    // 1. Delete SessionData using its known ID.
    await prisma.sessionData.deleteMany({
      where: { id: E2E_SESSION_ID },
    });

    // 2. Delete the user and all their associated records.
    // We find any user that could be our test user by its static ID or email.
    const usersToDelete = await prisma.user.findMany({
      where: {
        OR: [{ id: E2E_USER_ID }, { email: E2E_USER_EMAIL }],
      },
    });

    if (usersToDelete.length > 0) {
      const userIds = usersToDelete.map((u) => u.id);
      // Delete all associated JD/Resume texts first to satisfy foreign key constraints.
      await prisma.jdResumeText.deleteMany({ where: { userId: { in: userIds } } });
      // Finally, delete all found test users.
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    // 1. Create the E2E test user
    const newUser = await prisma.user.create({
      data: {
        id: E2E_USER_ID,
        email: E2E_USER_EMAIL,
        name: E2E_USER_NAME,
      },
    });

    // 2. Create a JD/Resume entry for the user
    const jdResume = await prisma.jdResumeText.create({
      data: {
        userId: newUser.id,
        jdText: 'E2E Test JD',
        resumeText: 'E2E Test Resume',
      },
    });

    // 3. Create the specific session data for the report test
    const assessment = {
      summary: 'This is a summary of the interview for our E2E test.',
      strengths: ['Excellent problem-solving skills demonstrated.'],
      improvements: ['Could be more concise in explanations.'],
      score: 8,
    };
    
    const questionSegments = [
        {
          questionId: 'q1_opening',
          questionNumber: 1,
          questionType: 'opening',
          question: 'Question 1: Initial question',
          keyPoints: ['Focus on experience'],
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          conversation: [
            { role: 'ai', content: 'Initial question', timestamp: new Date().toISOString(), messageType: 'question' },
            { role: 'user', content: 'Here is my answer.', timestamp: new Date().toISOString(), messageType: 'response' }
          ]
        },
        {
            questionId: 'q2_technical',
            questionNumber: 2,
            questionType: 'technical',
            question: 'Question 2: Technical question',
            keyPoints: ['Data structures'],
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            conversation: [
              { role: 'ai', content: 'Technical question', timestamp: new Date().toISOString(), messageType: 'question' },
              { role: 'user', content: 'Here is my technical answer.', timestamp: new Date().toISOString(), messageType: 'response' }
            ]
          }
    ];

    await prisma.sessionData.create({
      data: {
        id: E2E_SESSION_ID,
        userId: newUser.id,
        jdResumeTextId: jdResume.id,
        personaId: E2E_PERSONA_ID,
        durationInSeconds: 600,
        currentQuestionIndex: 2,
        endTime: new Date(),
        overallAssessment: assessment,
        questionSegments: questionSegments,
      },
    });

    console.log('✅ [Global Setup] Database seeded successfully.');
  } catch (error) {
    console.error('❌ [Global Setup] Failed to seed database:', error);
    // Re-throw the error to fail the test run
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default setup; 