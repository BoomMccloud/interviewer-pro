/**
 * Ephemeral Token Generation Tests - Cleaned Up
 * 
 * Tests for generating ephemeral tokens for secure client-side Live API access.
 * This eliminates the need to expose NEXT_PUBLIC_GEMINI_API_KEY in the frontend.
 * 
 * These tests focus on core business logic rather than mock infrastructure.
 */

import type { User } from 'next-auth';
import { db } from '~/server/db';
import { createCaller } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { TRPCError } from '@trpc/server';

// Mock GoogleGenAI with simple default behavior
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    authTokens: {
      create: jest.fn().mockResolvedValue({ name: 'mocked_token_name' })
    }
  }))
}));

// Mock auth from NextAuth.js
import { auth as actualAuth } from '~/server/auth';
jest.mock('~/server/auth', () => ({
  __esModule: true,
  auth: jest.fn(),
}));
const mockedAuth = actualAuth as jest.MockedFunction<typeof actualAuth>;

describe('✅ Ephemeral Token Generation - Core Business Logic', () => {
  let testUser: User;
  let testSession: { id: string };
  let testJdResume: { id: string };

  const getTestCaller = async (sessionUser: User | null = null) => {
    if (sessionUser) {
      const mockSession = {
        user: {
          id: sessionUser.id,
          name: sessionUser.name ?? null,
          email: sessionUser.email ?? null,
          image: null,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      mockedAuth.mockResolvedValueOnce(mockSession as any);
    } else {
      mockedAuth.mockResolvedValueOnce(null);
    }
    const ctx = await createTRPCContext({ headers: new Headers() });
    return createCaller(ctx);
  };

  beforeEach(async () => {
    // Clean up before each test
    await db.sessionData.deleteMany();
    await db.jdResumeText.deleteMany();
    await db.user.deleteMany();

    // Create test user
    const user = await db.user.create({
      data: {
        id: 'test-user-ephemeral',
        email: 'ephemeral@test.com',
        name: 'Ephemeral Test User',
      },
    });
    testUser = user;

    // Create test JD/Resume
    const jdResume = await db.jdResumeText.create({
      data: {
        userId: testUser.id!,
        jdText: 'Senior Software Engineer position',
        resumeText: 'Experienced developer with React and Node.js',
      },
    });
    testJdResume = jdResume;

    // Create test session
    const session = await db.sessionData.create({
      data: {
        userId: testUser.id!,
        jdResumeTextId: testJdResume.id,
        personaId: 'swe-interviewer-standard',
        durationInSeconds: 1800,
        questionSegments: [],
        currentQuestionIndex: 0,
      },
    });
    testSession = session;

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up after each test
    await db.sessionData.deleteMany();
    await db.jdResumeText.deleteMany();
    await db.user.deleteMany();
  });

  describe('✅ Core Functionality Tests', () => {
    it('should generate ephemeral token with default behavior', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);

      // Act
      const result = await caller.session.generateEphemeralToken({
        sessionId: testSession.id,
      });

      // Assert - Verify the response structure
      expect(result).toMatchObject({
        token: expect.any(String),
        expiresAt: expect.any(String),
        sessionWindowExpires: expect.any(String),
      });

      // Verify the token is returned
      expect(result.token).toBe('mocked_token_name');
      expect(result.expiresAt).toBeDefined();
      expect(result.sessionWindowExpires).toBeDefined();
    });

    it('should allow custom TTL minutes', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      const customTtl = 15;

      // Act
      const result = await caller.session.generateEphemeralToken({
        sessionId: testSession.id,
        ttlMinutes: customTtl,
      });

      // Assert - Verify response structure
      expect(result).toMatchObject({
        token: 'mocked_token_name',
        expiresAt: expect.any(String),
        sessionWindowExpires: expect.any(String),
      });

      // Verify custom TTL was applied (approximately)
      const expiresAt = new Date(result.expiresAt);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeCloseTo(customTtl, 1);
    });

    it('should validate user owns the session', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);

      // Create session owned by different user
      const otherUser = await db.user.create({
        data: {
          id: 'other-user',
          email: 'other@test.com',
          name: 'Other User',
        },
      });

      const otherSession = await db.sessionData.create({
        data: {
          userId: otherUser.id,
          jdResumeTextId: testJdResume.id,
          personaId: 'swe-interviewer-standard',
          durationInSeconds: 1800,
          questionSegments: [],
          currentQuestionIndex: 0,
        },
      });

      // Act & Assert
      await expect(
        caller.session.generateEphemeralToken({
          sessionId: otherSession.id,
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should throw error for non-existent session', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);

      // Act & Assert
      await expect(
        caller.session.generateEphemeralToken({
          sessionId: 'non-existent-session-id',
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  describe('✅ Integration Tests', () => {
    it('should work with sessions created by createSession procedure', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      
      // Create session using existing procedure
      const sessionResult = await caller.session.createSession({
        personaId: 'swe-interviewer-standard',
        durationInSeconds: 1800,
      });

      // Act
      const tokenResult = await caller.session.generateEphemeralToken({
        sessionId: sessionResult.sessionId,
      });

      // Assert
      expect(tokenResult.token).toBe('mocked_token_name');
      expect(tokenResult.expiresAt).toBeDefined();
      expect(tokenResult.sessionWindowExpires).toBeDefined();
    });
  });
}); 