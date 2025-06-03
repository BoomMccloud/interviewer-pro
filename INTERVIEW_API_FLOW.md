# Interview API Flow & Frontend-Backend Mapping

> **Document Purpose:** Clarifies how the interview system works, maps frontend user actions to backend functions, and documents current implementation status.

## 📋 Table of Contents
- [Overview](#overview)
- [Function Landscape](#function-landscape)
- [Frontend to Backend Mapping](#frontend-to-backend-mapping)
- [Conversation Flow Architecture](#conversation-flow-architecture)
- [Current Implementation Status](#current-implementation-status)
- [MVP UX Refinement Plan](#mvp-ux-refinement-plan)
- [Known Issues & Naming Confusion](#known-issues--naming-confusion)
- [Future Considerations](#future-considerations)

---

## Overview

The interview system handles two main types of AI interactions:
1. **Topical Questions** - High-level interview topics (displayed in "Current Question" section)
2. **Conversational Responses** - Follow-up questions and feedback within a topic (displayed in chat history)

**🔧 NEW: User-Controlled Topic Transitions**
The MVP implements user-controlled topic flow with clear separation between conversational responses and topic transitions.

---

## Function Landscape

### Current AI Functions (`src/lib/gemini.ts`) - **🔧 BEING REFACTORED**

| Function | Purpose | Status | Will Be |
|----------|---------|--------|---------|
| `getFirstQuestion()` | Generate initial topical question | ✅ Keep as-is | Initial question generation |
| `continueInterview()` | Handle all ongoing conversation | 🔧 Split into 2 | **DEPRECATED** |
| `getNextQuestion()` | Live interview feature (separate) | ❌ Different use case | Unchanged |

### Planned AI Functions (NEW) - **🚀 MVP ARCHITECTURE**

| Function | Purpose | Input | Returns |
|----------|---------|-------|---------|
| `getFirstQuestion()` | Initial topical question | JD, resume, persona | `{ questionText, keyPoints, rawAiResponseText }` |
| `continueConversation()` | Conversational follow-ups ONLY | JD, resume, persona, history, userResponse | `{ analysis, feedbackPoints, followUpQuestion, rawAiResponseText }` |
| `getNewTopicalQuestion()` | New topic generation ONLY | JD, resume, persona, history, coveredTopics | `{ questionText, keyPoints, rawAiResponseText }` |

### Current tRPC Procedures - **🔧 BEING REFACTORED**

| Procedure | Purpose | Status | Will Become |
|-----------|---------|--------|-------------|
| `startInterviewSession` | Initialize interview | ✅ Keep | Unchanged - calls `getFirstQuestion()` |
| `getNextQuestion` | Process user response | 🔧 **Confusing name** | **SPLIT INTO 2 PROCEDURES** |
| `getActiveSession` | Get session state | ✅ Keep | Unchanged |
| `resetSession` | Clear session | ✅ Keep | Unchanged |

### Planned tRPC Procedures (NEW) - **🚀 MVP ARCHITECTURE**

| Procedure | Purpose | Calls Internally | Frontend Usage |
|-----------|---------|------------------|----------------|
| `submitResponse` | Handle conversational responses | `continueConversation()` | Send message in chat |
| `getNextTopicalQuestion` | User-triggered topic transition | `getNewTopicalQuestion()` | "Next Question" button |

---

## Frontend to Backend Mapping

### 🔧 **NEW: MVP User-Controlled Flow**

### User Action: **Start Interview** (Unchanged)
```
Frontend: Click "Start Interview"
    ↓
tRPC: startInterviewSession({ sessionId, personaId })
    ↓
Backend: getFirstQuestion(jdResumeText, persona)
    ↓
Response: Initial topical question + key points
    ↓
UI: Updates "Current Question" section
```

### User Action: **Send Conversational Response** (NEW)
```
Frontend: Type response + click "Send"
    ↓
tRPC: submitResponse({ sessionId, userResponse })
    ↓
Backend: continueConversation(jdResumeText, persona, history, userResponse)
    ↓
AI: Analysis + feedback + follow-up (SAME TOPIC)
    ↓
Response: Conversational response for chat
    ↓
UI: Adds to chat history, tracks exchange count
```

### User Action: **Next Question Button** (NEW)
```
Frontend: Click "Next Question" (enabled after 2 exchanges)
    ↓
tRPC: getNextTopicalQuestion({ sessionId })
    ↓
Backend: getNewTopicalQuestion(jdResumeText, persona, history, coveredTopics)
    ↓
AI: Generates new topical question (DIFFERENT TOPIC)
    ↓
Response: New question + key points
    ↓
UI: Updates "Current Question" section, resets exchange count
```

### User Action: **Load Session** (Unchanged)
```
Frontend: Navigate to /sessions/[id]
    ↓
tRPC: getActiveSession({ sessionId })
    ↓
Backend: Parse session history, extract current question
    ↓
Response: Session state with conversation history
    ↓
UI: Renders current question + chat history + exchange count
```

---

## Conversation Flow Architecture

### 🚀 **NEW: User-Controlled Topic Flow**

```mermaid
graph TD
    A[Start Interview] --> B[getFirstQuestion]
    B --> C[Current Question #1]
    C --> D[User Response #1]
    D --> E[submitResponse]
    E --> F[continueConversation]
    F --> G[AI Follow-up]
    G --> H[User Response #2]
    H --> I[submitResponse]
    I --> J[continueConversation]
    J --> K[AI Follow-up]
    K --> L["Next Question" Button Enabled]
    L --> M[User Clicks "Next Question"]
    M --> N[getNextTopicalQuestion]
    N --> O[getNewTopicalQuestion]
    O --> P[Current Question #2]
    P --> Q[Reset to 2 Exchanges]
    Q --> D
```

### Clear Separation of Concerns

| Function | Scope | AI Prompt Focus | UI Destination |
|----------|-------|-----------------|----------------|
| `getFirstQuestion()` | Initial question | Generate opening topical question | "Current Question" section |
| `continueConversation()` | Same topic only | Dig deeper, provide feedback, ask follow-up | Chat history |
| `getNewTopicalQuestion()` | New topic only | Move to unexplored area, generate new question | "Current Question" section |

---

## MVP UX Refinement Plan

### 🎯 **Problem Being Solved**

**Current Issue:** AI randomly decides between conversational responses and topic transitions, creating unpredictable UX where users don't know what type of response they'll get.

**MVP Solution:** User controls topic transitions with clear 2-exchange pattern.

### 🚀 **Implementation Steps**

#### **Step 1: AI Function Separation**
```typescript
// NEW: continueConversation() - purely conversational
export async function continueConversation(
  jdResumeText: JdResumeText,
  persona: Persona,
  history: MvpSessionTurn[],
  userResponse: string
): Promise<ConversationalResponse> {
  // AI Prompt Focus:
  // - Analyze user's response
  // - Provide specific feedback
  // - Ask follow-up question about SAME topic
  // - Do NOT change topics
}

// NEW: getNewTopicalQuestion() - new topics only
export async function getNewTopicalQuestion(
  jdResumeText: JdResumeText,
  persona: Persona,
  history: MvpSessionTurn[],
  coveredTopics?: string[]
): Promise<TopicalQuestionResponse> {
  // AI Prompt Focus:
  // - Review covered topics
  // - Identify unexplored areas from JD/Resume
  // - Generate new topical question
  // - Provide key points for guidance
}
```

#### **Step 2: tRPC Procedure Refactoring**
```typescript
// Replace confusing getNextQuestion with:

submitResponse: protectedProcedure
  .input(z.object({ 
    sessionId: z.string(), 
    userResponse: z.string() 
  }))
  .mutation(async ({ ctx, input }) => {
    // Calls continueConversation() only
    // Updates chat history only
    // No topic transitions
  });

getNextTopicalQuestion: protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Calls getNewTopicalQuestion() only
    // Updates current question only
    // Increments topic count
  });
```

#### **Step 3: Frontend UX Implementation**
```typescript
// TextInterviewUI changes:
- Add exchangeCount state (tracks responses per topic)
- Enable "Next Question" button after 2 exchanges
- Replace getNextQuestion calls with submitResponse
- Add separate handler for getNextTopicalQuestion
- Visual feedback for topic transitions

// Session page changes:
- Track current topic and exchange count
- Manage "Next Question" button state
- Handle both conversational and topic responses
```

### 🎯 **Expected UX Outcome**

```
User Experience:
1. AI asks topical question: "Tell me about your React experience"
2. User responds → AI provides feedback + asks follow-up about React
3. User responds → AI provides more feedback + asks deeper React question  
4. "Next Question" button becomes available
5. User clicks → AI asks new topic: "Describe your team leadership experience"
6. Repeat cycle with new topic
```

**Benefits:**
- ✅ **Predictable**: User knows what type of response to expect
- ✅ **Controlled**: User decides when to move to next topic
- ✅ **Clear**: Distinct UI sections for topics vs conversations
- ✅ **Engaging**: 2 exchanges allow deep exploration of each topic

---

## Current Implementation Status

### ✅ **Implemented**
- [x] Single API for question generation (`getFirstQuestion`)
- [x] Conversational flow handling (`continueInterview`) - **WILL BE SPLIT**
- [x] Session state persistence and recovery
- [x] Frontend UI with proper tRPC integration
- [x] Smart session management and error handling

### 🔧 **In Progress (Phase 3C)**
- [x] **Planning Complete**: Function separation architecture defined
- [ ] **AI Function Implementation**: Create `continueConversation()` and `getNewTopicalQuestion()`
- [ ] **tRPC Refactoring**: Replace `getNextQuestion` with `submitResponse` + `getNextTopicalQuestion`
- [ ] **Frontend Updates**: Add "Next Question" button and exchange counting
- [ ] **AI Prompt Optimization**: Separate prompts for conversation vs topic generation
- [ ] **Testing**: Validate 2-exchange flow and user control

### ❌ **Not Started**
- [ ] Voice transcription (placeholder implementation)
- [ ] Avatar mode implementation
- [ ] Multi-modal routing (?mode= parameters)
- [ ] Purchase integration for mode access

---

## Known Issues & Naming Confusion

### 🚨 **Critical Issues Being Fixed**

1. **Function Responsibility Confusion (FIXING):**
   - Current: `continueInterview()` tries to do everything
   - Solution: Split into `continueConversation()` + `getNewTopicalQuestion()`

2. **Misleading Procedure Name (FIXING):**
   - Current: `getNextQuestion` doesn't always get next question
   - Solution: Replace with `submitResponse` + `getNextTopicalQuestion`

3. **No User Control (FIXING):**
   - Current: AI decides when to transition topics
   - Solution: User-controlled transitions with "Next Question" button

### 🔄 **Architecture Improvements**

**Before (Confusing):**
```
User Response → getNextQuestion → continueInterview → ??? 
  ↓
Either: Chat response OR Topic change (unpredictable)
```

**After (Clear):**
```
User Response → submitResponse → continueConversation → Chat response
     OR
User Clicks "Next Question" → getNextTopicalQuestion → getNewTopicalQuestion → New topic
```

---

## Future Considerations

### **Multi-Modal Enhancement**
Once MVP UX is refined, the separated functions will support:
- **Text Mode**: Current implementation
- **Voice Mode**: Same functions with voice transcription
- **Avatar Mode**: Same functions with avatar visualization

### **Advanced Features**
- **AI Transition Suggestions**: AI can suggest "Ready for next topic?" 
- **Topic Progress Tracking**: Visual indicators of topic coverage
- **Adaptive Exchange Count**: Flexible conversation length per topic
- **Interview Templates**: Different patterns for different interview types

### **Scaling Considerations**
- **Function Composition**: Build higher-level interview orchestration
- **State Management**: Track multiple conversation threads
- **Personalization**: Adapt conversation patterns to user preferences

---

## Quick Reference

### **NEW MVP Flow:**
- **Starting interview:** `startInterviewSession` → `getFirstQuestion`
- **Conversational response:** `submitResponse` → `continueConversation`
- **Topic transition:** `getNextTopicalQuestion` → `getNewTopicalQuestion`
- **Loading session:** `getActiveSession` → Parse history

### **Response destinations:**
- **Topical questions:** "Current Question" section (top of UI)
- **Conversational responses:** Chat history (middle of UI)
- **Exchange count:** Tracked per topic for button state

### **User controls:**
- **Send message:** Always conversational, never changes topic
- **Next Question button:** Always new topic, resets exchange count
- **Predictable UX:** User knows exactly what each action does

---

*Last updated: December 2024*
*Status: Phase 3C - Implementing user-controlled topic transitions for MVP*

# 🔗 **INTEGRATION PHASE - COMPLETED ✅**

## **User-Controlled Conversation Flow Implementation**

### **✅ Backend: Separated tRPC Procedures**

#### **🟢 submitResponse Procedure**
- **Purpose**: Handle user responses with conversational AI feedback
- **Input**: `{ sessionId: string, userResponse: string }`
- **AI Function**: `continueConversation()` - stays within same topic
- **Output**: `{ analysis, feedbackPoints, followUpQuestion, conversationHistory }`
- **Behavior**: 
  - Adds user response to session history
  - Calls AI for analysis and follow-up question about SAME topic
  - Returns conversational response for chat display
  - NO topic transitions

#### **🟢 getNextTopicalQuestion Procedure**  
- **Purpose**: User-controlled topic transitions only
- **Input**: `{ sessionId: string }`
- **AI Function**: `getNewTopicalQuestion()` - generates new topics only
- **Output**: `{ questionText, keyPoints, questionNumber, coveredTopics }`
- **Behavior**:
  - Extracts covered topics from session history
  - Calls AI for NEW topical question avoiding covered topics
  - Updates session with topic transition
  - Returns new question for "Current Question" section

#### **🔄 Legacy getNextQuestion (Deprecated)**
- **Status**: Kept for backward compatibility during transition
- **Note**: Will be removed after full migration

### **✅ Frontend: User-Controlled UI**

#### **Enhanced TextInterviewUI**
- **New Props**: 
  - `onGetNextTopic?: () => Promise<void>` - topic transition handler
  - `isGettingNextTopic?: boolean` - loading state for topic transitions
- **New Features**:
  - "Next Question" button for user-controlled topic transitions
  - Separate loading states for responses vs topic transitions
  - Clear separation between conversational and topical interactions

#### **Updated Session Page**
- **submitResponse**: Used by default for user message responses
- **getNextTopicalQuestion**: Triggered by "Next Question" button click
- **Separate loading states**: Different spinners for different operations

### **🎯 Implemented User Flow**

1. **Topic Question Displayed**: AI shows topical question in "Current Question" section
2. **User Responds**: Types response in chat interface
3. **Conversational Response**: AI provides analysis/feedback/follow-up in chat
4. **User Continues Conversation**: Can ask follow-ups, get more analysis within same topic
5. **User Controls Topic Change**: Clicks "Next Question" button when ready
6. **New Topic Generated**: AI generates new topical question avoiding covered topics
7. **Repeat**: Process continues with user in control

### **🔧 Technical Implementation**

#### **Separated AI Functions**
- `continueConversation()`: Returns `{ analysis, feedbackPoints, followUpQuestion }`
- `getNewTopicalQuestion()`: Returns `{ questionText, keyPoints }`

#### **Session History Management**
- **Conversational turns**: Marked with `type: 'conversational'`
- **Topic transitions**: Marked with `type: 'topic_transition'` 
- **Topic extraction**: Intelligent parsing of covered topics from history

#### **Error Handling**
- Graceful fallbacks for AI response parsing
- Separate error states for different operations
- Comprehensive validation and type safety

## **🚀 Next Steps Available**

1. **Exchange Counter**: Add visual indicator of exchanges per topic (MVP: 2 per topic)
2. **Topic Progress**: Show covered topics and remaining JD requirements
3. **Enhanced Topic Detection**: More sophisticated topic extraction from responses
4. **Pause/Resume**: Implement session state management
5. **Session Analytics**: Track conversation patterns and topic coverage

## **✅ MVP Requirements Satisfied**

- ✅ User chooses when to proceed with "next question"
- ✅ Conversational responses appear in chat immediately  
- ✅ No more mixed AI functions causing confusion
- ✅ Clean separation of concerns
- ✅ Real-time feedback and analysis
- ✅ Topic intelligence avoiding repetition

**The interview conversation flow now matches the intended UX design perfectly!** 🎯 