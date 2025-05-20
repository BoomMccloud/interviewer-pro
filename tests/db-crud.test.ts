// tests/db-crud.test.ts

// Attempt to import Prisma client - this will guide creation of lib/db.ts
import { prisma } from '../src/lib/db'; // Assuming prisma is the exported client
import type { User, JdResumeText } from '@prisma/client'; // Import User and JdResumeText types

// Placeholder for a real Prisma client type if available, or use 'any' initially for mocks/stubs.
// As lib/db.ts and schema are built, this type can be refined.
// let prisma: any; // This line is now replaced by the import above

// Environment setup for test database (important!)
// This typically involves setting a different DATABASE_URL for the test environment.
// For example, via a .env.test file loaded by your test script, or Jest's globalSetup.
// Ensure your test DATABASE_URL is configured to avoid using your development database for tests.

describe('Database CRUD Operations', () => {
  beforeAll(async () => {
    // For a real test setup, you would ensure your test database is migrated.
    // e.g., by running migrations programmatically or ensuring they are run via a script.
    // Since `prisma db push` was run manually before this test, we'll assume the schema is current.
    // console.log("Connect to test database and run migrations if necessary.");
    // Prisma client lazy connects, so explicit connect isn't strictly needed here
    // but can be good for catching connection issues early.
    // await prisma.$connect(); // Optional: explicit connect
    console.log("Ensuring test database is ready (schema assumed up-to-date).");
  });

  afterAll(async () => {
    await prisma.$disconnect();
    console.log("Disconnected from test database.");
  });

  // --- User Model Tests ---
  describe('User Model', () => {
    beforeEach(async () => {
      // Clean up User table before each test in this suite
      await prisma.user.deleteMany({});
      // console.log("TODO: Clear User table in test database.");
    });

    it('should create a new user', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          // id: will be auto-generated
          // image: can be null or a string if provided
        },
      });
      expect(user).toHaveProperty('id');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      // expect(true).toBe(true); // Placeholder assertion
    });

    it('should read a user', async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: 'readtest@example.com',
          name: 'Read Test User',
        },
      });

      const foundUser = await prisma.user.findUniqueOrThrow({
        where: { id: createdUser.id },
      });

      expect(foundUser).toBeDefined();
      expect(foundUser.id).toBe(createdUser.id);
      expect(foundUser.email).toBe('readtest@example.com');
      expect(foundUser.name).toBe('Read Test User');
    });

    it('should update a user', async () => {
      const userToUpdate = await prisma.user.create({
        data: {
          email: 'updatetest@example.com',
          name: 'Original Name',
        },
      });

      const updatedUser = await prisma.user.update({
        where: { id: userToUpdate.id },
        data: { name: 'Updated Name' },
      });

      expect(updatedUser.name).toBe('Updated Name');

      const fetchedUser = await prisma.user.findUniqueOrThrow({
          where: { id: userToUpdate.id },
      });
      expect(fetchedUser.name).toBe('Updated Name');
    });

    it('should delete a user', async () => {
      const userToDelete = await prisma.user.create({
        data: {
          email: 'deletetest@example.com',
          name: 'Delete Test User',
        },
      });

      await prisma.user.delete({
        where: { id: userToDelete.id },
      });

      const foundUser = await prisma.user.findUnique({
        where: { id: userToDelete.id },
      });
      expect(foundUser).toBeNull();
    });
  });

  // --- MvpJdResumeText Model Tests (Placeholders) ---
  describe('JdResumeText Model', () => {
    let testUser: User;

    beforeAll(async () => {
      testUser = await prisma.user.create({ 
        data: { email: 'jdresume-user@example.com', name: 'JDResume User' }
      });
    });

    afterAll(async () => {
      if (testUser) {
        await prisma.user.deleteMany({ where: { email: 'jdresume-user@example.com' } });
      }
    });

    beforeEach(async () => {
      await prisma.jdResumeText.deleteMany({});
    });

    it('should create an JdResumeText entry', async () => {
      const jdResume = await prisma.jdResumeText.create({
        data: {
          userId: testUser.id, 
          jdText: 'Sample JD Text',
          resumeText: 'Sample Resume Text',
        },
      });
      expect(jdResume).toHaveProperty('id');
      expect(jdResume.userId).toBe(testUser.id);
      expect(jdResume.jdText).toBe('Sample JD Text');
      expect(jdResume.resumeText).toBe('Sample Resume Text');
    });

    it('should read a JdResumeText entry', async () => {
      const createdEntry = await prisma.jdResumeText.create({
        data: {
          userId: testUser.id,
          jdText: 'Readable JD Text',
          resumeText: 'Readable Resume Text',
        },
      });

      const foundEntry = await prisma.jdResumeText.findUniqueOrThrow({
        where: { id: createdEntry.id },
      });

      expect(foundEntry).toBeDefined();
      expect(foundEntry.id).toBe(createdEntry.id);
      expect(foundEntry.userId).toBe(testUser.id);
      expect(foundEntry.jdText).toBe('Readable JD Text');
      expect(foundEntry.resumeText).toBe('Readable Resume Text');
    });

    it('should update a JdResumeText entry', async () => {
      const entryToUpdate = await prisma.jdResumeText.create({
        data: {
          userId: testUser.id,
          jdText: 'Original JD Text',
          resumeText: 'Original Resume Text',
        },
      });

      const updatedEntry = await prisma.jdResumeText.update({
        where: { id: entryToUpdate.id },
        data: { jdText: 'Updated JD Text' },
      });

      expect(updatedEntry.jdText).toBe('Updated JD Text');

      const fetchedEntry = await prisma.jdResumeText.findUniqueOrThrow({
        where: { id: entryToUpdate.id },
      });
      expect(fetchedEntry.jdText).toBe('Updated JD Text');
    });

    it('should delete a JdResumeText entry', async () => {
      const entryToDelete = await prisma.jdResumeText.create({
        data: {
          userId: testUser.id,
          jdText: 'Deletable JD Text',
          resumeText: 'Deletable Resume Text',
        },
      });

      await prisma.jdResumeText.delete({
        where: { id: entryToDelete.id },
      });

      const foundEntry = await prisma.jdResumeText.findUnique({
        where: { id: entryToDelete.id },
      });
      expect(foundEntry).toBeNull();
    });
  });

  // --- SessionData Model Tests (Placeholders) ---
  describe('SessionData Model', () => {
    let testUser: User;
    let testJdResumeText: JdResumeText; // Use imported JdResumeText type

    beforeAll(async () => {
      testUser = await prisma.user.create({
        data: { email: 'session-user@example.com', name: 'Session User' },
      });
      testJdResumeText = await prisma.jdResumeText.create({
        data: {
          userId: testUser.id,
          jdText: 'Session JD Text',
          resumeText: 'Session Resume Text',
        },
      });
    });

    afterAll(async () => {
      if (testUser) {
          await prisma.user.deleteMany({ where: { email: 'session-user@example.com' } });
      }
    });

    beforeEach(async () => {
      await prisma.sessionData.deleteMany({});
    });

    it('should create an SessionData entry', async () => {
      const session = await prisma.sessionData.create({
        data: {
          userId: testUser.id,
          jdResumeTextId: testJdResumeText.id,
          personaId: 'technical-lead',
          durationInSeconds: 1200,
          history: [], 
        },
      });
      expect(session).toHaveProperty('id');
      expect(session.userId).toBe(testUser.id);
      expect(session.jdResumeTextId).toBe(testJdResumeText.id);
      expect(session.personaId).toBe('technical-lead');
      expect(session.durationInSeconds).toBe(1200);
    });

    it('should read a SessionData entry', async () => {
      const createdSession = await prisma.sessionData.create({
        data: {
          userId: testUser.id,
          jdResumeTextId: testJdResumeText.id,
          personaId: 'readable-persona',
          durationInSeconds: 300,
          history: [{ role: 'user', parts: [{text: "Hello"}] }],
        },
      });

      const foundSession = await prisma.sessionData.findUniqueOrThrow({
        where: { id: createdSession.id },
      });

      expect(foundSession).toBeDefined();
      expect(foundSession.id).toBe(createdSession.id);
      expect(foundSession.personaId).toBe('readable-persona');
      expect(JSON.stringify(foundSession.history)).toBe(JSON.stringify([{ role: 'user', parts: [{text: "Hello"}] }]));
    });

    it('should update a SessionData entry', async () => {
      const sessionToUpdate = await prisma.sessionData.create({
        data: {
          userId: testUser.id,
          jdResumeTextId: testJdResumeText.id,
          personaId: 'original-persona',
          durationInSeconds: 600,
          history: [],
        },
      });

      const updatedSession = await prisma.sessionData.update({
        where: { id: sessionToUpdate.id },
        data: { personaId: 'updated-persona', durationInSeconds: 601 },
      });

      expect(updatedSession.personaId).toBe('updated-persona');
      expect(updatedSession.durationInSeconds).toBe(601);

      const fetchedSession = await prisma.sessionData.findUniqueOrThrow({
        where: { id: sessionToUpdate.id },
      });
      expect(fetchedSession.personaId).toBe('updated-persona');
      expect(fetchedSession.durationInSeconds).toBe(601);
    });

    it('should delete a SessionData entry', async () => {
      const sessionToDelete = await prisma.sessionData.create({
        data: {
          userId: testUser.id,
          jdResumeTextId: testJdResumeText.id,
          personaId: 'deletable-persona',
          durationInSeconds: 900,
          history: [],
        },
      });

      await prisma.sessionData.delete({
        where: { id: sessionToDelete.id },
      });

      const foundSession = await prisma.sessionData.findUnique({
        where: { id: sessionToDelete.id },
      });
      expect(foundSession).toBeNull();
    });
  });
}); 