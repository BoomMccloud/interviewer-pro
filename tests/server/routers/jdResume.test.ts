/**
 * Integration tests for the jdResume tRPC router.
 */
import { type inferProcedureInput } from '@trpc/server';
import { createCallerFactory } from '~/server/api/trpc';
import { appRouter, type AppRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { db } from '~/server/db';
import type { User, JdResumeText as PrismaJdResumeText } from '@prisma/client';

// Define the expected type for the session object more explicitly
interface MockSession {
  user: User;
  expires: string;
}

// Mock NextAuth.js
jest.mock('~/server/auth', () => ({
  __esModule: true,
  // Ensure the mock factory returns a jest.fn() with the correct signature
  auth: jest.fn<Promise<MockSession | null>, []>(), 
}));

// Import 'auth' after the mock is defined. This 'auth' is now the mock itself.
import { auth } from '~/server/auth';
const mockedAuth = auth as jest.Mock<Promise<MockSession | null>, []>;


// Helper to create a tRPC caller with an optional authenticated user
const createTestCaller = async (userParam: User | null = null) => {
  mockedAuth.mockResolvedValue(userParam ? { user: userParam, expires: 'any-date' } : null);
  const context = await createTRPCContext({
    headers: new Headers(), // Minimal headers for context creation
  });
  const createCaller = createCallerFactory(appRouter);
  return createCaller(context);
};


describe('JdResume tRPC Router', () => {
  let user: User;
  type JdResumeInput = inferProcedureInput<AppRouter['jdResume']['saveJdResumeText']>;

  beforeAll(async () => {
    // Optional: Seed any global test data if necessary
  });

  beforeEach(async () => {
    user = await db.user.create({
      data: {
        email: `testuser-jd-${Date.now()}@example.com`,
        name: 'Test User JD',
      },
    });
  });

  afterEach(async () => {
    await db.jdResumeText.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  });

  afterAll(async () => {
    await db.jdResumeText.deleteMany({});
    await db.user.deleteMany({});
    await db.$disconnect();
  });

  describe('saveJdResumeText procedure', () => {
    const validInput: JdResumeInput = {
      jdText: 'Sample JD Text',
      resumeText: 'Sample Resume Text',
    };

    it('should require authentication', async () => {
      const caller = await createTestCaller(null); // No user
      await expect(caller.jdResume.saveJdResumeText(validInput))
        .rejects.toThrowError(/UNAUTHORIZED/);
    });

    it('should create a new JdResumeText record if one does not exist', async () => {
      const caller = await createTestCaller(user);
      
      const result = await caller.jdResume.saveJdResumeText(validInput);
      expect(result).toBeDefined();
      expect(result.userId).toBe(user.id);
      expect(result.jdText).toBe(validInput.jdText);
      expect(result.resumeText).toBe(validInput.resumeText);

      const dbRecord = await db.jdResumeText.findFirst({ where: { userId: user.id } });
      expect(dbRecord).toEqual(result);
    });

    it('should update an existing JdResumeText record if one exists', async () => {
      const caller = await createTestCaller(user);
      // First, create an initial record
      await caller.jdResume.saveJdResumeText(validInput);

      const updatedInput: JdResumeInput = {
        jdText: 'Updated JD Text',
        resumeText: 'Updated Resume Text',
      };
      const updatedResult = await caller.jdResume.saveJdResumeText(updatedInput);
      expect(updatedResult).toBeDefined();
      expect(updatedResult.userId).toBe(user.id);
      expect(updatedResult.jdText).toBe(updatedInput.jdText);
      expect(updatedResult.resumeText).toBe(updatedInput.resumeText);

      const dbRecord = await db.jdResumeText.findFirst({ where: { userId: user.id } });
      expect(dbRecord).toEqual(updatedResult);
      expect(dbRecord?.jdText).not.toBe(validInput.jdText); // Ensure it actually updated
    });
  });

  describe('getJdResumeText procedure', () => {
    it('should require authentication', async () => {
      const caller = await createTestCaller(null); // No user
      await expect(caller.jdResume.getJdResumeText())
        .rejects.toThrowError(/UNAUTHORIZED/);
    });

    it('should return the JdResumeText record if one exists for the user', async () => {
      const caller = await createTestCaller(user);
      const inputData: JdResumeInput = {
        jdText: 'My JD',
        resumeText: 'My Resume',
      };
      // First, save some data for the user
      const savedRecord = await caller.jdResume.saveJdResumeText(inputData);

      const result = await caller.jdResume.getJdResumeText();
      expect(result).toBeDefined();
      expect(result).toEqual(savedRecord);
      expect(result?.userId).toBe(user.id);
      expect(result?.jdText).toBe(inputData.jdText);
      expect(result?.resumeText).toBe(inputData.resumeText);
    });

    it('should return null if no JdResumeText record exists for the user', async () => {
      const caller = await createTestCaller(user);
      // Ensure no record exists for this user initially (beforeEach creates user, afterEach cleans JdResumeText)
      
      const result = await caller.jdResume.getJdResumeText();
      expect(result).toBeNull();
    });
  });

}); 