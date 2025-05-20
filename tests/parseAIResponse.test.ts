// src/lib/gemini.test.ts

// Import the function to be tested
import { parseAiResponse } from '../src/lib/gemini';

// Import types (assuming they are defined in your types file)
import type { MvpAiResponse } from '../src/types';

// Describe the test suite for the parseAiResponse function
describe('parseAiResponse', () => {

  // Test case 1: Correctly parse a valid response string with all tags
  it('should correctly parse a valid AI response string with all expected tags and content', () => {
    // Arrange: Define the input string simulating a typical AI response
    const rawAiResponse = `
      Okay, let's dive into that project. Here's a follow-up.

      <QUESTION>Could you describe a time you had to make a difficult technical decision?</QUESTION>

      <ANALYSIS>Your previous answer covered the project details well, but didn't highlight a specific technical challenge or decision point.</ANALYSIS>
      <FEEDBACK>
      - Focus on the technical aspects of the decision.
      - Explain the trade-offs you considered.
      - Describe the outcome and impact of your decision.
      </FEEDBACK>
      <SUGGESTED_ALTERNATIVE>When asked about projects, identify a specific technical decision point within it and structure your answer around the challenge, options, your choice, and result.</SUGGESTED_ALTERNATIVE>

      Looking forward to hearing about it.
    `;

    // Arrange: Define the expected output object based on the input string
    const expectedOutput: MvpAiResponse = {
      nextQuestion: 'Could you describe a time you had to make a difficult technical decision?',
      analysis: 'Your previous answer covered the project details well, but didn\'t highlight a specific technical challenge or decision point.',
      feedbackPoints: [
        '- Focus on the technical aspects of the decision.',
        '- Explain the trade-offs you considered.',
        '- Describe the outcome and impact of your decision.',
      ],
      suggestedAlternative: 'When asked about projects, identify a specific technical decision point within it and structure your answer around the challenge, options, your choice, and result.',
    };

    // Act: Call the function with the input string
    const actualOutput = parseAiResponse(rawAiResponse);

    // Assert: Compare the actual output object with the expected output object
    expect(actualOutput).toEqual(expectedOutput);
  });

  // Test case 2: Handle missing tags gracefully
  it('should handle missing tags gracefully and return default or empty values', () => {
    // Arrange: Define an input string missing some tags
    const rawAiResponseMissingTags = `
      Here's a question.

      <QUESTION>What's your favorite programming language and why?</QUESTION>

      Some other text.

      <SUGGESTED_ALTERNATIVE>Mentioning the language's strengths and how they align with your work is key.</SUGGESTED_ALTERNATIVE>
    `;

    // Arrange: Define the expected output. Analysis and Feedback should be default/empty.
    const expectedOutputMissingTags: MvpAiResponse = {
      nextQuestion: "What's your favorite programming language and why?",
      analysis: 'No analysis provided for this answer.', // Or whatever your function's default is
      feedbackPoints: ["No specific feedback provided."], // Or whatever your function's default is for an empty array
      suggestedAlternative: 'Mentioning the language\'s strengths and how they align with your work is key.',
    };

    // Act: Call the function with the input string missing tags
    const actualOutputMissingTags = parseAiResponse(rawAiResponseMissingTags);

    // Assert: Compare the actual output with the expected output
    expect(actualOutputMissingTags).toEqual(expectedOutputMissingTags);
  });

    // Test case 3: Handle empty input string
    it('should handle an empty or null input string gracefully', () => {
        // Arrange: Define empty/null input strings
        const rawAiResponseEmpty = '';
        const rawAiResponseNull = null as any; // Test with null if your function might receive it

        // Arrange: Define the expected output for empty/null
        const expectedOutputEmpty: MvpAiResponse = {
            nextQuestion: "Error: Could not extract next question. Please try again.", // Or your defined error message
            analysis: 'No analysis provided for this answer.',
            feedbackPoints: ["No specific feedback provided."],
            suggestedAlternative: 'No suggested alternative provided for this answer.',
        };

        // Act & Assert for empty string
        const actualOutputEmpty = parseAiResponse(rawAiResponseEmpty);
        expect(actualOutputEmpty).toEqual(expectedOutputEmpty);

        // Act & Assert for null (if applicable based on your function's expected input)
        const actualOutputNull = parseAiResponse(rawAiResponseNull);
        expect(actualOutputNull).toEqual(expectedOutputEmpty); // Assuming it behaves like empty
    });

    // Add more test cases as needed, e.g.,
    // - Text before the first tag
    // - Text after the last tag
    // - Tags with empty content (e.g., <FEEDBACK></FEEDBACK>)
    // - Malformed tags (e.g., missing closing tag) - depending on how robust you need parsing to be
    // - Feedback with mixed line breaks (\n, \r\n)
});