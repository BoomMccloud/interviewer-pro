# Phase 2A TDD Tests: Session Reports & Analytics Backend

This document outlines the **failing tests** written for Phase 2A following TDD methodology. These tests define the expected behavior of the three new tRPC procedures before implementation begins.

## TDD Approach Summary

Following the **RED-GREEN-REFACTOR** methodology:

- **🔴 RED Phase (Current)**: We've written comprehensive failing tests that define expected behavior
- **🟢 GREEN Phase (Next)**: Implement minimal code to make tests pass
- **🔵 REFACTOR Phase (Later)**: Improve and optimize the implementation

## Tests Written

### Location: `tests/server/routers/session.test.ts`

Added **3 new test suites** with **12 total test cases** covering all Phase 2A requirements:

## 1. `getSessionReport` Procedure Tests (4 tests)

**Purpose**: Return comprehensive session data with full history for report viewing

**Test Cases:**
1. ✅ **should return comprehensive session data with full history for authorized user**
   - Tests complete data structure with calculated metrics
   - Verifies `questionCount`, `completionPercentage`, `averageResponseTime`
   - Ensures proper data transformation from database to API response

2. ✅ **should throw error for session not owned by user**
   - Tests authorization and data ownership validation
   - Verifies proper error handling for unauthorized access

3. ✅ **should throw error for non-existent session**
   - Tests edge case handling for invalid session IDs
   - Ensures proper error messages

4. ✅ **Authorization tests with cleanup**
   - Tests that users can only access their own sessions
   - Includes proper database cleanup after tests

**Expected Return Type:**
```typescript
interface SessionReportData {
  sessionId: string;
  durationInSeconds: number;
  history: MvpSessionTurn[];
  questionCount: number;
  completionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
  averageResponseTime: number;
  personaId: string;
  jdResumeTextId: string;
}
```

## 2. `getSessionAnalytics` Procedure Tests (3 tests)

**Purpose**: Calculate performance metrics and analytics from session history

**Test Cases:**
1. ✅ **should calculate performance metrics from session history**
   - Tests response time calculations (90s, 60s → avg 75s)
   - Verifies completion percentage calculation
   - Tests performance score generation (0-100 range)

2. ✅ **should handle sessions with no responses gracefully**
   - Tests edge case of incomplete sessions
   - Ensures graceful handling when user hasn't answered questions
   - Verifies default values (0 for metrics with no data)

3. ✅ **should throw error for unauthorized session access**
   - Tests authorization validation
   - Ensures users can only access analytics for their sessions

**Expected Return Type:**
```typescript
interface SessionAnalyticsData {
  sessionId: string;
  totalQuestions: number;
  totalAnswers: number;
  averageResponseTime: number;
  responseTimeMetrics: number[];
  completionPercentage: number;
  sessionDurationMinutes: number;
  performanceScore: number;
}
```

## 3. `getSessionFeedback` Procedure Tests (5 tests)

**Purpose**: Generate or retrieve AI-powered feedback analysis

**Test Cases:**
1. ✅ **should return AI-generated feedback for completed session**
   - Tests comprehensive feedback structure
   - Verifies all required fields: strengths, improvements, recommendations
   - Tests score validation (0-100 range)

2. ✅ **should generate feedback even for incomplete sessions**
   - Tests graceful handling of minimal interaction sessions
   - Verifies appropriate messaging for limited data
   - Tests fallback feedback when analysis is limited

3. ✅ **should throw error for non-existent session**
   - Tests proper error handling for invalid sessions
   - Ensures consistent error messages

4. ✅ **should handle sessions with parsing errors gracefully**
   - Tests robustness when session history is malformed
   - Verifies proper error handling for data corruption

**Expected Return Type:**
```typescript
interface SessionFeedbackData {
  sessionId: string;
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  detailedAnalysis: string;
  skillAssessment: Record<string, number>;
}
```

## Key Testing Patterns Established

### 1. **Database Setup & Cleanup**
- Tests create realistic session data with proper timestamps
- Each test includes proper cleanup to avoid interference
- Uses existing test user and JD/Resume data patterns

### 2. **Authorization Testing**
- Every procedure tests ownership validation
- Consistent error messages: "Session not found or not authorized"
- Tests prevent users from accessing other users' data

### 3. **Edge Case Coverage**
- Empty/incomplete sessions handled gracefully
- Malformed data parsing errors caught and handled
- Invalid input validation with proper error responses

### 4. **Realistic Test Data**
- Session histories with proper timestamps for response time calculation
- Multiple conversation turns with AI analysis and feedback
- Varied session durations and completion states

### 5. **Type Safety**
- All test expectations match TypeScript interfaces
- Uses `satisfies` operator for type-safe test data
- Validates both data structure and content

## Implementation Requirements

Based on these tests, the **GREEN phase** implementation must provide:

### 1. Session Router Extensions
```typescript
// In src/server/api/routers/session.ts
export const sessionRouter = createTRPCRouter({
  // ... existing procedures ...
  
  getSessionReport: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Implementation needed
    }),

  getSessionAnalytics: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Implementation needed
    }),

  getSessionFeedback: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Implementation needed
    }),
});
```

### 2. Analytics Calculation Logic
- **Response Time Calculation**: Parse timestamps from session history
- **Completion Percentage**: Calculate based on questions asked vs answered
- **Performance Scoring**: Algorithm to generate 0-100 scores
- **Question Counting**: Count AI questions vs user responses

### 3. Feedback Generation Logic
- **AI Analysis Parsing**: Extract feedback from existing session history
- **Fallback Logic**: Generate appropriate feedback for incomplete sessions
- **Skill Assessment**: Create categorized skill scoring
- **Recommendation Engine**: Generate actionable improvement suggestions

### 4. Error Handling
- **Authorization Validation**: Ensure users only access their own sessions
- **Data Validation**: Handle malformed session history gracefully
- **Not Found Handling**: Proper errors for non-existent sessions
- **Parsing Error Recovery**: Graceful handling of corrupted data

## Test Execution Status

**Current Status**: 🔴 **RED - Tests are failing** (as expected in TDD)

**Reason**: The three new procedures (`getSessionReport`, `getSessionAnalytics`, `getSessionFeedback`) don't exist yet.

**Next Step**: Implement the procedures to make tests pass (GREEN phase).

## Benefits of This TDD Approach

1. **Clear Requirements**: Tests define exactly what each procedure should do
2. **Edge Case Coverage**: All error conditions and edge cases identified upfront
3. **Type Safety**: Return types and data structures clearly defined
4. **Authorization**: Security requirements built into tests from the start
5. **Realistic Data**: Tests use actual session scenarios we expect in production
6. **Regression Protection**: Future changes won't break expected behavior

## Development Workflow

1. **Current**: All 12 tests are failing ✅
2. **Next**: Implement `getSessionReport` procedure until its 4 tests pass
3. **Then**: Implement `getSessionAnalytics` procedure until its 3 tests pass  
4. **Finally**: Implement `getSessionFeedback` procedure until its 5 tests pass
5. **Refactor**: Improve implementation while keeping all tests green

This comprehensive test suite ensures that Phase 2A backend implementation will be robust, secure, and fully functional from the start. 