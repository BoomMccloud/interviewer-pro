# Frontend-Backend API Mapping for QuestionSegments Migration

**Date**: December 18, 2024  
**Purpose**: Complete mapping of current frontend API usage and migration requirements to QuestionSegments structure

---

## **🔍 Current Frontend API Usage Analysis**

### **📱 Frontend Components Making API Calls**

#### **1. Session Page (`src/app/(protected)/sessions/[id]/page.tsx`)**
**Main orchestrator component - handles session lifecycle and tRPC hooks**

#### **2. TextInterviewUI (`src/components/Sessions/InterviewUI/TextInterviewUI.tsx`)**  
**Presentation component - receives handlers as props, doesn't make direct API calls**

#### **3. Dashboard (`src/app/(protected)/dashboard/page.tsx`)**
**Session history and JD/Resume management**

#### **4. MvpJdResumeInputForm (`src/components/MvpJdResumeInputForm.tsx`)**
**JD/Resume input and session creation**

---

## **📊 Complete API Call Mapping**

### **🎯 SESSION LIFECYCLE PROCEDURES**

| **Frontend Usage** | **Current Backend Procedure** | **Purpose** | **Input** | **Output** | **QuestionSegments Migration** |
|---|---|---|---|---|---|
| **Session Initialization** | `startInterviewSession` | Start new interview with first question | `{sessionId, personaId}` | `{sessionId, firstQuestion, keyPoints}` | ✅ **MIGRATED** - Now uses QuestionSegments |
| **Get Session Data** | `getActiveSession` | Retrieve current session state | `{sessionId}` | `{sessionId, isActive, currentQuestion, conversationHistory, etc.}` | ✅ **MIGRATED** - Now uses QuestionSegments |
| **Submit User Response** | `submitResponse` | Add user response + AI follow-up | `{sessionId, userResponse}` | `{conversationResponse, conversationHistory, canProceedToNextTopic}` | ✅ **MIGRATED** - Now uses QuestionSegments |
| **Topic Transition** | `getNextTopicalQuestion` | User-controlled topic change | `{sessionId}` | `{questionText, keyPoints, questionNumber, coveredTopics}` | ✅ **MIGRATED** - Now uses QuestionSegments |
| **Save Session** | `saveSession` | Save current state | `{sessionId, currentResponse?}` | `{saved: true, timestamp}` | ✅ **MIGRATED** - Now uses QuestionSegments |

### **🔄 LEGACY PROCEDURES (Still using `history` field - WILL FAIL)**

| **Frontend Usage** | **Legacy Procedure** | **Status** | **Migration Action** |
|---|---|---|---|
| **Old Submit Flow** | `getNextQuestion` | 🔴 **BROKEN** - Uses `history` field | **REPLACE** with `submitResponse` + `getNextTopicalQuestion` |
| **Session State Updates** | `updateSessionState` | 🔴 **BROKEN** - Uses `history` field | **REPLACE** with `saveSession` for save, keep for pause/end |
| **Session Reset** | `resetSession` | 🔴 **BROKEN** - Uses `history` field | **UPDATE** to use QuestionSegments |

### **📋 REPORT & ANALYTICS PROCEDURES** 

| **Frontend Usage** | **Current Procedure** | **Purpose** | **Migration Status** |
|---|---|---|---|
| **Session Report** | `getSessionReport` | Generate session summary | 🔴 **BROKEN** - Uses `history` field |
| **Session Analytics** | `getSessionAnalytics` | Calculate performance metrics | 🔴 **BROKEN** - Uses `history` field |
| **Session Feedback** | `getSessionFeedback` | Extract AI feedback points | 🔴 **BROKEN** - Uses `history` field |

### **💾 JD/RESUME & SESSION MANAGEMENT**

| **Frontend Usage** | **Current Procedure** | **Purpose** | **Migration Status** |
|---|---|---|---|
| **Create Session** | `createSession` | Create new session | 🔴 **BROKEN** - Uses `history` field |
| **List Sessions** | `listForCurrentText` | Get user's session history | 🔴 **BROKEN** - Uses `history` field |
| **Get JD/Resume** | `getJdResumeText` | Load user's JD/Resume | ✅ **NO CHANGE** - Not affected |
| **Save JD/Resume** | `saveJdResumeText` | Save JD/Resume text | ✅ **NO CHANGE** - Not affected |

---

## **🎯 Frontend Components API Integration Details**

### **1. Session Page (`/sessions/[id]/page.tsx`)**

**Current tRPC Hooks Used:**
```typescript
// ✅ MIGRATED - These work with QuestionSegments
const activeSession = api.session.getActiveSession.useQuery({ sessionId });
const startSession = api.session.startInterviewSession.useMutation();
const submitResponse = api.session.submitResponse.useMutation();
const getNextTopicalQuestion = api.session.getNextTopicalQuestion.useMutation();

// 🔴 LEGACY - These use old history field
const resetSession = api.session.resetSession.useMutation();
const updateSessionState = api.session.updateSessionState.useMutation();
const getNextQuestion = api.session.getNextQuestion.useMutation(); // Backward compatibility
```

**Handler Functions:**
```typescript
// ✅ WORKING - Uses migrated procedure
onSubmitResponse: (response: string) => {
  submitResponse.mutate({ sessionId, userResponse: response });
}

// ✅ WORKING - Uses migrated procedure  
onGetNextTopic: () => {
  getNextTopicalQuestion.mutate({ sessionId });
}

// 🔴 BROKEN - Uses legacy procedure
onSave: () => {
  updateSessionState.mutate({ sessionId, action: 'pause' });
}

// 🔴 BROKEN - Uses legacy procedure
onEnd: () => {
  updateSessionState.mutate({ sessionId, action: 'end' });
}
```

### **2. TextInterviewUI Component**

**Props Interface (Current):**
```typescript
interface TextInterviewUIProps {
  sessionData: {
    sessionId: string;
    history: ConversationMessage[];          // 🔄 NEEDS UPDATE to conversationHistory
    currentQuestion: string;                 // ✅ COMPATIBLE
    keyPoints: string[];                     // ✅ COMPATIBLE  
    status: 'active' | 'paused' | 'completed'; // ✅ COMPATIBLE
    startTime: Date;                         // ✅ COMPATIBLE
    personaName?: string;                    // ✅ COMPATIBLE
  };
  // Handler props are compatible ✅
  onSubmitResponse: (response: string) => Promise<void>;
  onGetNextTopic?: () => Promise<void>;
  onSave?: () => Promise<void>;
  onEnd?: () => Promise<void>;
}
```

**Required Changes:**
- Change `history: ConversationMessage[]` to `conversationHistory: ConversationTurn[]`
- Update message role types: `'user' | 'model'` → `'user' | 'ai'`
- Add timestamp as ISO string instead of Date object

### **3. Dashboard Page**

**Current tRPC Hooks:**
```typescript
// ✅ NO CHANGE NEEDED
const { data: jdResumeText } = api.jdResume.getJdResumeText.useQuery();

// 🔴 BROKEN - Uses history field
const { data: rawSessionHistory } = api.session.listForCurrentText.useQuery();
```

**Required Migration:**
- Update `listForCurrentText` to work with QuestionSegments
- Update session history parsing logic

### **4. Session Report Pages**

**Current tRPC Hooks:**
```typescript
// 🔴 ALL BROKEN - Use history field
const reportData = api.session.getSessionReport.useQuery({ sessionId });
const analyticsData = api.session.getSessionAnalytics.useQuery({ sessionId });
const feedbackData = api.session.getSessionFeedback.useQuery({ sessionId });
```

---

## **📋 Data Structure Migration Mapping**

### **Current vs. New Data Structures**

#### **Session History Structure**

**OLD (history field):**
```typescript
interface ConversationMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

// Stored as: { history: ConversationMessage[] }
```

**NEW (QuestionSegments):**
```typescript
interface ConversationTurn {
  role: 'ai' | 'user';
  content: string;
  timestamp: string; // ISO string
  messageType: 'question' | 'response';
}

interface QuestionSegment {
  questionId: string;
  questionNumber: number;
  questionType: 'opening' | 'technical' | 'behavioral' | 'followup';
  question: string;
  keyPoints: string[];
  startTime: string;
  endTime: string | null;
  conversation: ConversationTurn[];
}

// Stored as: { questionSegments: QuestionSegment[], currentQuestionIndex: number }
```

#### **Active Session Data Structure**

**OLD:**
```typescript
interface ActiveSessionData {
  sessionId: string;
  isActive: boolean;
  personaId: string;
  currentQuestion: string;
  keyPoints: string[];
  conversationHistory: ConversationMessage[];
  questionNumber: number;
  timeRemaining: number;
}
```

**NEW:**
```typescript
interface ActiveSessionData {
  sessionId: string;
  status: 'created' | 'active' | 'paused' | 'completed' | 'abandoned';
  personaId: string;
  currentQuestion: string;
  keyPoints: string[];                      // From current QuestionSegment
  questionNumber: number;
  totalQuestions: number;
  timeRemaining: number;
  conversationHistory: ConversationTurn[];  // Current question's conversation
  questionSegments: QuestionSegment[];      // All question segments
  currentQuestionIndex: number;             // Which question is active
  canProceedToNextTopic: boolean;           // Based on conversation length
}
```

---

## **🚀 Frontend Migration Action Plan**

### **✅ Phase 1: Update Props and Interfaces (IMMEDIATE)**

**Files to Update:**
1. `src/components/Sessions/InterviewUI/TextInterviewUI.tsx`
   - Update `ConversationMessage` interface
   - Change role types and field names
   - Update message rendering logic

2. `src/app/(protected)/sessions/[id]/page.tsx`
   - Update session data mapping  
   - Fix handler functions to use correct procedures
   - Remove legacy procedure calls

### **🔄 Phase 2: Fix Broken Procedures (HIGH PRIORITY)**

**Backend Procedures to Update:**
1. `resetSession` - Update to use QuestionSegments
2. `updateSessionState` - Update to use QuestionSegments  
3. `createSession` - Update to use QuestionSegments
4. `listForCurrentText` - Update to use QuestionSegments

### **📊 Phase 3: Fix Report Procedures (MEDIUM PRIORITY)**

**Backend Procedures to Update:**
1. `getSessionReport` - Parse QuestionSegments instead of history
2. `getSessionAnalytics` - Calculate metrics from QuestionSegments
3. `getSessionFeedback` - Extract feedback from QuestionSegments

### **🧹 Phase 4: Legacy Cleanup (LOW PRIORITY)**

**Remove Old Procedures:**
1. `getNextQuestion` - Replaced by `submitResponse` + `getNextTopicalQuestion`
2. Any other history-based legacy procedures

---

## **🎯 Migration Validation Checklist**

### **✅ Backend Procedures (COMPLETED)**
- [x] `startInterviewSession` uses QuestionSegments ✅
- [x] `getActiveSession` uses QuestionSegments ✅  
- [x] `submitResponse` uses QuestionSegments ✅
- [x] `getNextTopicalQuestion` uses QuestionSegments ✅
- [x] `saveSession` uses QuestionSegments ✅

### **🔄 Frontend Components (IN PROGRESS)**
- [ ] TextInterviewUI props and interfaces updated
- [ ] Session page handlers updated
- [ ] Dashboard session history updated
- [ ] Report pages updated

### **⏳ Integration Testing (PENDING)**
- [ ] User can start interview session
- [ ] User can submit responses and get AI follow-ups
- [ ] User can transition to next topic
- [ ] User can save session state
- [ ] Session data persists correctly
- [ ] Reports display correct data

---

## **💡 Key Migration Insights**

### **✅ What's Working**
1. **New QuestionSegments procedures are fully functional and tested**
2. **Database schema is correct and doesn't need migration**
3. **Type system supports new structure with Zod validation**
4. **Parallel implementation prevents breaking existing functionality**

### **🔄 What Needs Frontend Updates**
1. **Props interfaces** - Change field names and types
2. **Data mapping** - Convert between old and new structures  
3. **Handler functions** - Update to call correct procedures
4. **Message rendering** - Handle new conversation structure

### **🎯 Migration Benefits**
1. **Better topic organization** - Each question has its own conversation thread
2. **User-controlled flow** - Clear separation between responses and topic transitions
3. **Enhanced analytics** - Richer data structure for reporting
4. **Future-proof architecture** - Supports advanced interview features

---

## **🚀 Next Steps Summary**

### **IMMEDIATE (Phase 2A - Frontend TDD)**
1. **Create failing frontend tests** for TextInterviewUI with QuestionSegments
2. **Update TextInterviewUI props interface** to use new structure
3. **Update Session page handlers** to use migrated procedures
4. **Test user interaction flow** end-to-end

### **NEXT (Phase 2B - Legacy Migration)**  
1. **Update broken legacy procedures** to use QuestionSegments
2. **Fix Dashboard session history** display
3. **Update session creation flow** to use QuestionSegments

### **FINAL (Phase 3 - Reports & Cleanup)**
1. **Migrate report procedures** to use QuestionSegments
2. **Remove legacy code** and unused procedures
3. **Update documentation** and deployment guides

---

**🎯 CURRENT STATUS**: Backend migration complete, Frontend TDD phase ready to begin 