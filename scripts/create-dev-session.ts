/**
 * Development script to create a test session with mock data
 * Creates a dev user, JdResumeText, and SessionData for testing
 * Run with: npx tsx scripts/create-dev-session.ts
 */

import { db } from '../src/server/db.js';

async function createDevSession() {
  try {
    // Use the development user ID that matches auth bypass
    const DEV_USER_ID = 'dev-user-123';
    
    // Check if the dev user exists, create if not
    let user = await db.user.findUnique({
      where: { id: DEV_USER_ID }
    });
    
    if (!user) {
      console.log('🔧 Creating dev user to match auth bypass...');
      user = await db.user.create({
        data: {
          id: DEV_USER_ID,
          email: 'dev@example.com',
          name: 'Dev User',
        }
      });
      console.log('✅ Created dev user:', user.id);
    } else {
      console.log('✅ Found dev user:', user.id);
    }

    // Check existing sessions
    console.log('\n🔍 Checking existing sessions...');
    const existingSessions = await db.sessionData.findMany({
      where: { userId: DEV_USER_ID },
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
    console.log('💡 This session matches the DEV_BYPASS_AUTH user ID (dev-user-123)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

void createDevSession(); 