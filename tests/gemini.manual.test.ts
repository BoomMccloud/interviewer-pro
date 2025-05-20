import dotenv from 'dotenv';
// Load environment variables (especially GEMINI_API_KEY)
dotenv.config({ path: '.env' }); // Adjust path if your .env is elsewhere relative to this script

import { getFirstQuestion, continueInterview } from '../src/lib/gemini';
import { getDefaultPersona } from '../src/lib/personaService';
import type { MvpJdResumeText, MvpSessionData, ConversationTurn } from '../src/types';


test('Gemini manual test', async () => {
  const persona = getDefaultPersona();
  if (!persona) {
    console.error("Could not load default persona.");
    return;
  }

  const sampleJdResume: MvpJdResumeText = {
    id: 'sample-jd-resume-1',
    userId: 'test-user-1',
    jdText: "We are looking for a Senior Software Engineer with 5+ years of experience in TypeScript, React, and Node.js. Experience with cloud platforms like AWS is a plus. The ideal candidate will be responsible for designing and implementing new features, mentoring junior engineers, and contributing to our microservices architecture.",
    resumeText: "Highly skilled Senior Software Engineer with 8 years of experience in developing scalable web applications using TypeScript, React, and Node.js. Proficient in AWS services (EC2, S3, Lambda). Proven track record of leading projects and mentoring team members. Bachelor's in Computer Science.",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  console.log("--- Testing getFirstQuestion ---");
  try {
    const firstQuestion = await getFirstQuestion(sampleJdResume, persona);
    console.log("First question:", firstQuestion);

    if (!firstQuestion || firstQuestion.includes("Error generating")) {
        console.error("Failed to get a valid first question.");
        return;
    }

    // Simulate a conversation
    const conversationHistory: ConversationTurn[] = [
      { role: 'model', text: `<QUESTION>${firstQuestion}</QUESTION><ANALYSIS>Initial question.</ANALYSIS><FEEDBACK>N/A</FEEDBACK><SUGGESTED_ALTERNATIVE>N/A</SUGGESTED_ALTERNATIVE>`, timestamp: new Date() },
    ];
    
    let currentUserResponse = "I have extensive experience with TypeScript and React, and I've worked with Node.js for several backend services. I'm also familiar with AWS, particularly S3 and Lambda for serverless functions.";

    console.log(`\n--- Testing continueInterview (Turn 1) ---`);
    console.log("User response:", currentUserResponse);

    let aiResponse = await continueInterview(sampleJdResume, persona, conversationHistory, currentUserResponse);
    console.log("AI response (Turn 1):", JSON.stringify(aiResponse, null, 2));

    if (!aiResponse.nextQuestion || aiResponse.nextQuestion.includes("Error generating")) {
        console.error("Failed to get a valid next question in Turn 1.");
        return;
    }

    conversationHistory.push({ role: 'user', text: currentUserResponse, timestamp: new Date() });
    conversationHistory.push({ role: 'model', text: `<QUESTION>${aiResponse.nextQuestion}</QUESTION><ANALYSIS>${aiResponse.analysis}</ANALYSIS><FEEDBACK>${(aiResponse.feedbackPoints || []).join('\\n')}</FEEDBACK><SUGGESTED_ALTERNATIVE>${aiResponse.suggestedAlternative}</SUGGESTED_ALTERNATIVE>`, timestamp: new Date() });

    // Second turn
    currentUserResponse = "For system design, I usually start by understanding the requirements thoroughly, then I think about breaking down the system into smaller, manageable components. I consider scalability, reliability, and maintainability from the outset.";
    console.log(`\n--- Testing continueInterview (Turn 2) ---`);
    console.log("User response:", currentUserResponse);
    
    aiResponse = await continueInterview(sampleJdResume, persona, conversationHistory, currentUserResponse);
    console.log("AI response (Turn 2):", JSON.stringify(aiResponse, null, 2));


  } catch (error) {
    console.error("Error during Gemini test:", error);
    throw error;
  }
});
