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
    
    // Create JdResumeText for the dev user
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
        personaId: 'swe-interviewer-standard',
        jdResumeTextId: jdResumeText.id,
        durationInSeconds: 1800,
        history: [],
      }
    });
    
    console.log('✅ Created test session:', testSession.id);
    console.log('🌐 URL to test: http://localhost:3000/sessions/' + testSession.id);
    console.log('💡 This session matches the DEV_BYPASS_AUTH user ID (dev-user-123)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

void createDevSession(); 