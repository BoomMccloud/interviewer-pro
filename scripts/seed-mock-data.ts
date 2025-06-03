/**
 * Seed script to populate database with mock JD/Resume data for development
 * Run with: npx tsx scripts/seed-mock-data.ts
 */

import { db } from '~/server/db';

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

    // First, check if there's already a user to associate the data with
    const existingUser = await db.user.findFirst();
    
    if (!existingUser) {
      console.log('❌ No users found in database. Please sign in first to create a user account.');
      console.log('💡 After signing in, run this script again to seed mock data.');
      return;
    }

    console.log(`✅ Found user: ${existingUser.email ?? existingUser.name ?? existingUser.id}`);

    // Check if this user already has JD/Resume data
    const existingJdResume = await db.jdResumeText.findFirst({
      where: { userId: existingUser.id }
    });

    if (existingJdResume) {
      console.log('📄 User already has JD/Resume data:');
      console.log(`   - JD Text: ${existingJdResume.jdText.substring(0, 50)}...`);
      console.log(`   - Resume Text: ${existingJdResume.resumeText.substring(0, 50)}...`);
      console.log('');
      console.log('🤔 Do you want to replace the existing data? (This will also delete associated sessions)');
      console.log('   To proceed, delete the existing data manually or modify this script.');
      return;
    }

    // Create mock JD/Resume data
    const mockJdResume = await db.jdResumeText.create({
      data: {
        userId: existingUser.id,
        jdText: MOCK_JD_TEXT,
        resumeText: MOCK_RESUME_TEXT,
      }
    });

    console.log('✅ Successfully created mock JD/Resume data!');
    console.log(`   - JD/Resume ID: ${mockJdResume.id}`);
    console.log(`   - Created at: ${mockJdResume.createdAt.toISOString()}`);
    console.log('');
    console.log('🎉 Mock data seeded successfully!');
    console.log('💡 You can now test the application with pre-populated data.');
    console.log('🚀 Visit /dashboard to see the mock data in action.');

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