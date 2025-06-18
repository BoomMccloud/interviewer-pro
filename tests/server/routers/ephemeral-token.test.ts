/**
 * Ephemeral Token Generation Tests - TDD Red Phase
 * 
 * Tests for generating ephemeral tokens for secure client-side Live API access.
 * This eliminates the need to expose NEXT_PUBLIC_GEMINI_API_KEY in the frontend.
 */

import type { User } from 'next-auth';
import { db } from '~/server/db';
import { createCaller } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { TRPCError } from '@trpc/server';

// Mock GoogleGenAI with proper Jest hoisting - create function in mock
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

// Import after mocking
import { GoogleGenAI } from '@google/genai';
const MockedGoogleGenAI = GoogleGenAI as jest.MockedClass<typeof GoogleGenAI>;

describe('🔴 RED: Ephemeral Token Generation - TDD', () => {
  let testUser: User;
  let testSession: { id: string };
  let testJdResume: { id: string };
  let mockCreateAuthToken: jest.MockedFunction<any>;

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
    // Get the mock function from the mocked instance
    const mockInstance = new MockedGoogleGenAI() as any;
    mockCreateAuthToken = mockInstance.authTokens.create;

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
        userId: testUser.id!, // Use non-null assertion since we know it exists
        jdText: 'Senior Software Engineer position',
        resumeText: 'Experienced developer with React and Node.js',
      },
    });
    testJdResume = jdResume;

    // Create test session
    const session = await db.sessionData.create({
      data: {
        userId: testUser.id!, // Use non-null assertion since we know it exists
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

  describe('🔴 RED: generateEphemeralToken procedure', () => {
    it('should generate ephemeral token with 35 minute default expiry', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      const mockTokenResponse = {
        name: 'ephemeral_token_abc123',
      };

      mockCreateAuthToken.mockResolvedValue(mockTokenResponse);

      // Act - This will fail because procedure doesn't exist yet
      const result = await caller.session.generateEphemeralToken({
        sessionId: testSession.id,
      });

      // Assert
      expect(result).toMatchObject({
        token: 'ephemeral_token_abc123',
        expiresAt: expect.any(String),
      });

      // Verify token expiry is approximately 35 minutes from now
      const expiresAt = new Date(result.expiresAt);
      const now = new Date();
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
      expect(diffMinutes).toBeCloseTo(35, 1); // Within 1 minute tolerance

      // Verify GoogleGenAI was called with correct parameters
      expect(mockCreateAuthToken).toHaveBeenCalledWith({
        config: {
          uses: 1,
          expireTime: expect.any(String),
          newSessionExpireTime: expect.any(String),
          httpOptions: { apiVersion: 'v1alpha' }
        }
      });
    });

    it('should allow custom TTL minutes', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      const customTtl = 15;
      const mockTokenResponse = {
        name: 'ephemeral_token_custom_ttl',
      };

      mockCreateAuthToken.mockResolvedValue(mockTokenResponse);

      // Act - This will fail because procedure doesn't exist yet
      const result = await caller.session.generateEphemeralToken({
        sessionId: testSession.id,
        ttlMinutes: customTtl,
      });

      // Assert
      expect(result).toMatchObject({
        token: 'ephemeral_token_custom_ttl',
        expiresAt: expect.any(String),
      });

      // Verify custom TTL was applied
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

      // Act & Assert - This will fail because procedure doesn't exist yet
      await expect(
        caller.session.generateEphemeralToken({
          sessionId: otherSession.id,
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should throw error for non-existent session', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);

      // Act & Assert - This will fail because procedure doesn't exist yet
      await expect(
        caller.session.generateEphemeralToken({
          sessionId: 'non-existent-session-id',
        })
      ).rejects.toThrow(TRPCError);
    });

    it('should set newSessionExpireTime to 1 minute for token usage window', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      const mockTokenResponse = {
        name: 'ephemeral_token_session_window',
      };

      mockCreateAuthToken.mockResolvedValue(mockTokenResponse);

      // Act - This will fail because procedure doesn't exist yet
      await caller.session.generateEphemeralToken({
        sessionId: testSession.id,
      });

      // Assert - Verify newSessionExpireTime is approximately 1 minute from now
      expect(mockCreateAuthToken).toHaveBeenCalledWith({
        config: expect.objectContaining({
          newSessionExpireTime: expect.any(String)
        })
      });

      const callArgs = mockCreateAuthToken.mock.calls[0][0];
      const newSessionExpireTime = new Date(callArgs.config.newSessionExpireTime);
      const now = new Date();
      const diffSeconds = (newSessionExpireTime.getTime() - now.getTime()) / 1000;
      expect(diffSeconds).toBeCloseTo(60, 5); // Within 5 seconds tolerance
    });

    it('should handle GoogleGenAI API errors gracefully', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      const apiError = new Error('Gemini API quota exceeded');
      
      mockCreateAuthToken.mockRejectedValue(apiError);

      // Act & Assert - This will fail because procedure doesn't exist yet
      await expect(
        caller.session.generateEphemeralToken({
          sessionId: testSession.id,
        })
      ).rejects.toThrow('Gemini API quota exceeded');
    });
  });

  describe('🔴 RED: Integration with existing session workflow', () => {
    it('should work with sessions created by createSession procedure', async () => {
      // Arrange
      const caller = await getTestCaller(testUser);
      
      // Create session using existing procedure
      const sessionResult = await caller.session.createSession({
        personaId: 'swe-interviewer-standard',
        durationInSeconds: 1800,
      });

      const mockTokenResponse = {
        name: 'ephemeral_token_integration',
      };
      mockCreateAuthToken.mockResolvedValue(mockTokenResponse);

      // Act - This will fail because procedure doesn't exist yet
      const tokenResult = await caller.session.generateEphemeralToken({
        sessionId: sessionResult.sessionId,
      });

      // Assert
      expect(tokenResult.token).toBe('ephemeral_token_integration');
      expect(tokenResult.expiresAt).toBeDefined();
    });
  });
}); 