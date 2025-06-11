/**
 * Development script to create a test session with mock data
 * Creates a dev user, JdResumeText, and SessionData for testing
 * Run with: npx tsx scripts/create-dev-session.ts
 */

import 'dotenv/config';
import { db } from '../src/server/db.js';
import { MOCK_USER_ID, MOCK_USER_EMAIL, MOCK_USER_NAME } from '../src/lib/test-auth-utils.js';

async function createDevSession() {
  try {
    // Use the development user that matches auth bypass
    console.log(`🔧 Ensuring dev user (${MOCK_USER_EMAIL}) exists...`);
    const user = await db.user.upsert({
      where: { email: MOCK_USER_EMAIL },
      update: {
        id: MOCK_USER_ID,
        name: MOCK_USER_NAME,
      },
      create: {
        id: MOCK_USER_ID,
        email: MOCK_USER_EMAIL,
        name: MOCK_USER_NAME,
      },
    });
    console.log('✅ Found/Created dev user:', user.id);

    // Check existing sessions
    console.log('\n🔍 Checking existing sessions...');
    const existingSessions = await db.sessionData.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        jdResumeText: {
          select: {
            id: true,
            jdText: true,
            resumeText: true,
          }
        }
      }
    });

    if (existingSessions.length > 0) {
      console.log(`\nFound ${existingSessions.length} recent sessions for dev user:`);
      existingSessions.forEach((session, index) => {
        console.log(`\n${index + 1}. ID: ${session.id}`);
        console.log(`   Status: ${session.endTime ? 'Completed' : 'Active'}`);
        console.log(`   Created: ${session.createdAt.toISOString()}`);
        console.log(`   Persona: ${session.personaId}`);
        console.log(`   URL: http://localhost:3000/sessions/${session.id}`);
      });

      const activeSessions = existingSessions.filter(s => !s.endTime);
      if (activeSessions.length > 0) {
        console.log('\n⚠️  You have active sessions. Consider using one of these instead of creating a new one.');
        return;
      }
    }
    
    // Create JdResumeText for the dev user
    console.log('\n🔧 Creating new session resources...');
    const jdResumeText = await db.jdResumeText.create({
      data: {
        userId: user.id,
        jdText: 'Software Engineer - Full Stack Developer\n\nWe are looking for an experienced full-stack developer to join our team. The ideal candidate will have experience with React, Node.js, TypeScript, and modern web development practices.',
        resumeText: 'John Doe - Software Engineer\n\n5+ years of experience in full-stack development with expertise in React, Node.js, TypeScript, and PostgreSQL. Previously worked at tech startups building scalable web applications.'
      }
    });
    console.log('✅ Created JdResumeText:', jdResumeText.id);
    
    const testSession = await db.sessionData.create({
      data: {
        userId: user.id,
        personaId: 'hr-recruiter-general',
        jdResumeTextId: jdResumeText.id,
        durationInSeconds: 1800,
        questionSegments: [],
        currentQuestionIndex: 0,
      }
    });
    
    console.log('\n✅ Created new test session!');
    console.log('🔗 Session URL: http://localhost:3000/sessions/' + testSession.id);
    console.log(`💡 This session matches the DEV_BYPASS_AUTH user (${MOCK_USER_EMAIL})`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

void createDevSession(); 