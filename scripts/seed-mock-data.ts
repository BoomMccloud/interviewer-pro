/**
 * Seed script to populate database with mock JD/Resume data for development
 * Run with: npx tsx scripts/seed-mock-data.ts
 * 
 * This script is idempotent. It will find or create a specific test user,
 * clean up any existing data for that user, and then seed fresh mock data,
 * including a completed interview session ready for report testing.
 */

import { db } from '~/server/db';
import { type QuestionSegment } from '~/types';
import { Prisma } from '@prisma/client';
import { MOCK_USER_ID, MOCK_USER_EMAIL, MOCK_USER_NAME } from '~/lib/test-auth-utils';

const MOCK_JD_TEXT = `Software Engineer - Full Stack Developer

We are looking for a talented Full Stack Developer to join our growing engineering team. You will work on building scalable web applications using modern technologies and best practices.

**Responsibilities:**
- Develop and maintain full-stack web applications using React, Node.js, and TypeScript
- Design and implement RESTful APIs and GraphQL endpoints
- Work with databases (PostgreSQL, MongoDB) and optimize query performance
- Collaborate with cross-functional teams including design, product, and QA
- Write clean, maintainable code with comprehensive test coverage
- Participate in code reviews and technical discussions
- Debug and resolve complex technical issues

**Required Qualifications:**
- 3+ years of experience in full-stack development
- Strong proficiency in JavaScript/TypeScript, React, and Node.js
- Experience with database design and SQL/NoSQL databases
- Knowledge of version control systems (Git) and CI/CD pipelines
- Understanding of software engineering best practices and design patterns
- Experience with testing frameworks (Jest, Cypress, etc.)
- Strong problem-solving skills and attention to detail

**Preferred Qualifications:**
- Experience with cloud platforms (AWS, Azure, GCP)
- Knowledge of Docker and containerization
- Familiarity with microservices architecture
- Experience with performance optimization and monitoring tools
- Background in agile development methodologies

**What We Offer:**
- Competitive salary and equity package
- Comprehensive health, dental, and vision insurance
- Flexible work arrangements and remote-friendly culture
- Professional development budget and learning opportunities
- Collaborative and innovative work environment

Join our team and help build the next generation of web applications that will impact millions of users worldwide.`;

const MOCK_RESUME_TEXT = `John Doe - Software Engineer

📧 john.doe@email.com | 📱 (555) 123-4567 | 🌐 linkedin.com/in/johndoe | 💻 github.com/johndoe

**PROFESSIONAL SUMMARY**
Experienced Full Stack Software Engineer with 5+ years of expertise in building scalable web applications using modern JavaScript frameworks and cloud technologies. Proven track record of delivering high-quality solutions in fast-paced startup environments.

**TECHNICAL SKILLS**
• **Languages:** JavaScript, TypeScript, Python, SQL, HTML5, CSS3
• **Frontend:** React, Next.js, Vue.js, Tailwind CSS, Material-UI, Redux
• **Backend:** Node.js, Express.js, FastAPI, REST APIs, GraphQL
• **Databases:** PostgreSQL, MongoDB, Redis, Prisma ORM
• **Cloud & DevOps:** AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, CI/CD
• **Testing:** Jest, Cypress, React Testing Library, Playwright
• **Tools:** Git, Jira, Figma, Postman, DataDog

**PROFESSIONAL EXPERIENCE**

**Senior Software Engineer** | TechStart Inc. | San Francisco, CA | 2021 - Present
• Led development of customer-facing dashboard serving 10K+ daily active users using React and Node.js
• Architected and implemented microservices backend reducing API response times by 40%
• Built real-time notification system using WebSockets and Redis, improving user engagement by 25%
• Mentored 3 junior developers and established code review processes that reduced bugs by 30%
• Collaborated with product and design teams to deliver 15+ features using agile methodologies

**Software Engineer** | InnovateTech Solutions | Austin, TX | 2019 - 2021
• Developed and maintained e-commerce platform handling $2M+ in monthly transactions
• Implemented automated testing suite achieving 85% code coverage and reducing QA time by 50%
• Optimized database queries and implemented caching strategies, improving page load times by 60%
• Integrated third-party payment systems (Stripe, PayPal) and shipping APIs
• Participated in on-call rotation and resolved production incidents with 99.9% uptime

**Junior Software Developer** | CodeCraft LLC | Remote | 2018 - 2019
• Built responsive web applications for small to medium businesses using React and Express
• Developed RESTful APIs and integrated with various third-party services
• Implemented user authentication and authorization systems using JWT
• Participated in daily standups and sprint planning sessions

**EDUCATION**
**Bachelor of Science in Computer Science** | University of California, Berkeley | 2018
• Relevant Coursework: Data Structures, Algorithms, Database Systems, Software Engineering
• Senior Project: Built a social media analytics platform using React and Python

**PROJECTS**
**TaskFlow - Project Management Tool** (2023)
• Full-stack application built with Next.js, Prisma, and PostgreSQL
• Implemented real-time collaboration features using Socket.io
• Deployed on AWS with Docker containerization

**WeatherWise - Mobile Weather App** (2022)
• React Native application with 5K+ downloads on App Store
• Integrated with OpenWeather API and implemented offline data caching
• Used Redux for state management and AsyncStorage for persistence

**CERTIFICATIONS**
• AWS Certified Developer - Associate (2022)
• Google Cloud Professional Cloud Developer (2021)

Passionate about building user-centric applications and staying current with emerging technologies in the rapidly evolving tech landscape.`;

async function seedMockData() {
  try {
    console.log('🌱 Starting to seed mock data...');

    // 1. Find or create the mock user
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

    console.log(`✅ Using user: ${user.email} (ID: ${user.id})`);

    // 2. Clean up ALL existing interview-related data to ensure a clean slate
    console.log('🧹 Cleaning up old interview data...');
    await db.feedbackConversation.deleteMany({});
    await db.sessionData.deleteMany({});
    await db.jdResumeText.deleteMany({});
    console.log('🧼 Old data cleaned.');


    // 3. Create mock JD/Resume data
    console.log('📄 Creating new JD/Resume text...');
    const mockJdResume = await db.jdResumeText.create({
      data: {
        userId: user.id,
        jdText: MOCK_JD_TEXT,
        resumeText: MOCK_RESUME_TEXT,
      }
    });
    console.log(`✅ JD/Resume text created (ID: ${mockJdResume.id})`);

    // 4. Create a mock completed session
    console.log('🎙️ Creating mock completed interview session...');
    const mockQuestionSegments: QuestionSegment[] = [
      {
        questionId: 'q1_opening',
        questionNumber: 1,
        questionType: 'opening',
        question: 'Tell me about a time you had to learn a new technology quickly.',
        keyPoints: ['Be specific', 'Mention the outcome'],
        startTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        conversation: [
          { role: 'ai', content: 'Tell me about a time you had to learn a new technology quickly.', timestamp: new Date().toISOString(), messageType: 'question' },
          { role: 'user', content: 'I had to learn Vue.js for a project with a tight deadline. I focused on the core concepts and was able to contribute to the project within a week.', timestamp: new Date().toISOString(), messageType: 'response' },
        ],
      },
      {
        questionId: 'q2_technical',
        questionNumber: 2,
        questionType: 'technical',
        question: 'How would you optimize a slow database query?',
        keyPoints: ['Indexing', 'Query analysis', 'Caching'],
        startTime: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        conversation: [
          { role: 'ai', content: 'How would you optimize a slow database query?', timestamp: new Date().toISOString(), messageType: 'question' },
          { role: 'user', content: 'I would first analyze the query execution plan to identify bottlenecks. Then I would check for missing indexes and consider caching strategies for frequently accessed data.', timestamp: new Date().toISOString(), messageType: 'response' },
        ],
      },
    ];

    const mockSession = await db.sessionData.create({
      data: {
        userId: user.id,
        jdResumeTextId: mockJdResume.id,
        personaId: 'swe-interviewer-standard',
        durationInSeconds: 10 * 60, // 10 minutes
        startTime: new Date(Date.now() - 10 * 60 * 1000),
        endTime: new Date(),
        questionSegments: mockQuestionSegments as unknown as Prisma.InputJsonValue,
        currentQuestionIndex: mockQuestionSegments.length - 1,
      }
    });
    console.log(`✅ Mock session created (ID: ${mockSession.id})`);

    console.log('');
    console.log('🎉 Mock data seeded successfully!');
    console.log('💡 You can now test the application with pre-populated data.');
    console.log(`🚀 Visit /sessions/${mockSession.id}/report to see the report for the mock session.`);

  } catch (error) {
    console.error('❌ Error seeding mock data:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the seeding function
seedMockData()
  .then(() => {
    console.log('🏁 Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }); 