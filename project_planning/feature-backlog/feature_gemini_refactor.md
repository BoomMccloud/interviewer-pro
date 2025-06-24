# Feature Spec: Gemini.ts Refactoring - TDD Implementation Plan

> **Status**: **Planning Phase - TDD Development Plan**
> **Phase 1**: 🔴 RED - Write failing tests for modular architecture
> **Phase 2**: 🟢 GREEN - Implement modular file structure
> **Phase 3**: 🔵 REFACTOR - Optimize imports and remove duplications
> **Related Documents**: [Voice Modality Feature](./feature_voice_modality.md), [Pre-generated Questions](./feature_pregenerated_questions.md)
> **Jira Ticket**: REFACTOR-14

---

## 1. Objective

Refactor the monolithic `gemini.ts` file (1,297 lines) into **focused, single-responsibility modules** following the 300-line rule and TDD methodology. This will improve maintainability, testability, and code organization while maintaining all existing functionality.

### Current Pain Points ❌
- **Massive file size**: 1,297 lines violates 300-line workspace rule
- **Multiple responsibilities**: Core AI, live voice, assessments, utilities all mixed
- **Hard to test**: Difficult to mock specific functionality in isolation
- **Maintenance burden**: Changes require understanding entire large file
- **Import complexity**: Importing entire file for single functions

### Target Benefits ✅
- **Modular architecture** - Single responsibility per file
- **Easier testing** - Mock individual modules independently
- **Better maintainability** - Changes isolated to specific modules
- **Cleaner imports** - Import only what you need
- **300-line compliance** - All files under workspace limit
- **Type safety** - Better TypeScript experience with focused modules

---

## 2. TDD Implementation Phases

### Phase 1: 🔴 RED - Write Failing Tests for Modular Architecture

#### 2.1 Module Structure Tests (Write First - Should Fail)

**File**: `tests/lib/gemini/core.test.ts` (NEW)
```typescript
describe('Gemini Core Module - TDD', () => {
  describe('getFirstQuestion', () => {
    it('should be importable from core module', async () => {
      // Test import that doesn't exist yet - will fail
      const { getFirstQuestion } = await import('~/lib/gemini/core');
      expect(typeof getFirstQuestion).toBe('function');
    });

    it('should generate first question with persona and JD', async () => {
      const { getFirstQuestion } = await import('~/lib/gemini/core');
      const result = await getFirstQuestion(mockJdResume, mockPersona, []);
      expect(result.questionText).toBeTruthy();
      expect(result.keyPoints).toHaveLength.toBeGreaterThan(2);
    });
  });

  describe('continueConversation', () => {
    it('should be importable from core module', async () => {
      const { continueConversation } = await import('~/lib/gemini/core');
      expect(typeof continueConversation).toBe('function');
    });
  });
});
```

**File**: `tests/lib/gemini/live.test.ts` (NEW)
```typescript
describe('Gemini Live Module - TDD', () => {
  describe('openLiveInterviewSession', () => {
    it('should be importable from live module', async () => {
      // Test import that doesn't exist yet - will fail
      const { openLiveInterviewSession } = await import('~/lib/gemini/live');
      expect(typeof openLiveInterviewSession).toBe('function');
    });

    it('should create live session with system prompt', async () => {
      const { openLiveInterviewSession } = await import('~/lib/gemini/live');
      const session = await openLiveInterviewSession('Test prompt');
      expect(session.sendAudioChunk).toBeDefined();
      expect(session.stopTurn).toBeDefined();
    });
  });

  describe('transcribeAudioOnce', () => {
    it('should be importable from live module', async () => {
      const { transcribeAudioOnce } = await import('~/lib/gemini/live');
      expect(typeof transcribeAudioOnce).toBe('function');
    });
  });
});
```

**File**: `tests/lib/gemini/assessment.test.ts` (NEW)
```typescript
describe('Gemini Assessment Module - TDD', () => {
  describe('getOverallAssessmentFromLLM', () => {
    it('should be importable from assessment module', async () => {
      // Test import that doesn't exist yet - will fail
      const { getOverallAssessmentFromLLM } = await import('~/lib/gemini/assessment');
      expect(typeof getOverallAssessmentFromLLM).toBe('function');
    });

    it('should generate assessment with score', async () => {
      const { getOverallAssessmentFromLLM } = await import('~/lib/gemini/assessment');
      const result = await getOverallAssessmentFromLLM(mockJdResume, mockPersona, mockSegments);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });
  });
});
```

**File**: `tests/lib/gemini/tokens.test.ts` (NEW)
```typescript
describe('Gemini Tokens Module - TDD', () => {
  describe('generateEphemeralToken', () => {
    it('should be importable from tokens module', async () => {
      // Test import that doesn't exist yet - will fail
      const { generateEphemeralToken } = await import('~/lib/gemini/tokens');
      expect(typeof generateEphemeralToken).toBe('function');
    });

    it('should generate token with expiration', async () => {
      const { generateEphemeralToken } = await import('~/lib/gemini/tokens');
      const result = await generateEphemeralToken({ ttlMinutes: 30 });
      expect(result.token).toBeTruthy();
      expect(result.expiresAt).toBeTruthy();
    });
  });
});
```

**File**: `tests/lib/gemini/utils.test.ts` (NEW)
```typescript
describe('Gemini Utils Module - TDD', () => {
  describe('parseStructuredResponse', () => {
    it('should be importable from utils module', async () => {
      // Test import that doesn't exist yet - will fail
      const { parseStructuredResponse } = await import('~/lib/gemini/utils');
      expect(typeof parseStructuredResponse).toBe('function');
    });

    it('should parse XML-like response structure', () => {
      const { parseStructuredResponse } = await import('~/lib/gemini/utils');
      const mockResponse = `<QUESTION>Test question?</QUESTION><KEY_POINTS>- Point 1\n- Point 2</KEY_POINTS>`;
      const result = parseStructuredResponse(mockResponse);
      expect(result.questionText).toBe('Test question?');
      expect(result.keyPoints).toHaveLength(2);
    });
  });
});
```

**File**: `tests/lib/gemini/index.test.ts` (NEW)
```typescript
describe('Gemini Index Barrel File - TDD', () => {
  it('should export all functions from main index', async () => {
    // Test that main index re-exports everything - will fail initially
    const geminiModule = await import('~/lib/gemini');
    
    // Core functions
    expect(geminiModule.getFirstQuestion).toBeDefined();
    expect(geminiModule.continueConversation).toBeDefined();
    
    // Live functions
    expect(geminiModule.openLiveInterviewSession).toBeDefined();
    expect(geminiModule.transcribeAudioOnce).toBeDefined();
    
    // Assessment functions
    expect(geminiModule.getOverallAssessmentFromLLM).toBeDefined();
    
    // Token functions
    expect(geminiModule.generateEphemeralToken).toBeDefined();
    
    // Utils
    expect(geminiModule.parseStructuredResponse).toBeDefined();
  });

  it('should maintain existing import compatibility', async () => {
    // Existing imports should still work - will fail until index is created
    const { getFirstQuestion, continueConversation } = await import('~/lib/gemini');
    expect(typeof getFirstQuestion).toBe('function');
    expect(typeof continueConversation).toBe('function');
  });
});
```

#### 2.2 Backward Compatibility Tests (Write First - Should Fail)

**File**: `tests/lib/gemini/index.test.ts` (NEW)
```typescript
describe('Gemini Index Barrel File - TDD', () => {
  it('should export all functions from main index', async () => {
    // Test that main index re-exports everything - will fail initially
    const geminiModule = await import('~/lib/gemini');
    
    // Core functions
    expect(geminiModule.getFirstQuestion).toBeDefined();
    expect(geminiModule.continueConversation).toBeDefined();
    
    // Live functions
    expect(geminiModule.openLiveInterviewSession).toBeDefined();
    expect(geminiModule.transcribeAudioOnce).toBeDefined();
    
    // Assessment functions
    expect(geminiModule.getOverallAssessmentFromLLM).toBeDefined();
    
    // Token functions
    expect(geminiModule.generateEphemeralToken).toBeDefined();
    
    // Utils
    expect(geminiModule.parseStructuredResponse).toBeDefined();
  });

  it('should maintain existing import compatibility', async () => {
    // Existing imports should still work - will fail until index is created
    const { getFirstQuestion, continueConversation } = await import('~/lib/gemini');
    expect(typeof getFirstQuestion).toBe('function');
    expect(typeof continueConversation).toBe('function');
  });
});
```

#### 2.3 Integration Tests for Module Boundaries (Write First - Should Fail)

**File**: `tests/lib/gemini/integration.test.ts` (NEW)
```typescript
describe('Gemini Module Integration - TDD', () => {
  it('should allow core to use utils without circular dependencies', async () => {
    // Test module dependency structure - will fail initially
    const { getFirstQuestion } = await import('~/lib/gemini/core');
    const { parseStructuredResponse } = await import('~/lib/gemini/utils');
    
    // Core should be able to use utils
    const result = await getFirstQuestion(mockJdResume, mockPersona, []);
    expect(result).toBeDefined();
  });

  it('should allow assessment to use core functions', async () => {
    const { getOverallAssessmentFromLLM } = await import('~/lib/gemini/assessment');
    const result = await getOverallAssessmentFromLLM(mockJdResume, mockPersona, mockSegments);
    expect(result.score).toBeGreaterThan(0);
  });

  it('should prevent circular dependencies between modules', () => {
    // Static analysis test - modules should not import each other circularly
    expect(true).toBe(true); // Placeholder for dependency analysis
  });
});
```

### Phase 2: 🟢 GREEN - Make Tests Pass with Modular Implementation

#### 2.1 Create Module Structure

**Proposed Module Breakdown:**

1. **`src/lib/gemini/core.ts`** (~250 lines) - Core interview functions
2. **`src/lib/gemini/live.ts`** (~300 lines) - Live voice functionality  
3. **`src/lib/gemini/assessment.ts`** (~200 lines) - Assessment functions
4. **`src/lib/gemini/prompts.ts`** (~150 lines) - Prompt utilities
5. **`src/lib/gemini/utils.ts`** (~100 lines) - Parsing utilities
6. **`src/lib/gemini/fallbacks.ts`** (~150 lines) - Fallback logic
7. **`src/lib/gemini/tokens.ts`** (~75 lines) - Token management
8. **`src/lib/gemini/index.ts`** (~50 lines) - Barrel exports

#### 2.2 Implementation Steps

**Step 1**: Create `core.ts` with main interview functions:
- `getFirstQuestion`
- `continueConversation` 
- `getNewTopicalQuestion`

**Step 2**: Create `live.ts` with voice functionality:
- `streamVoiceConversation`
- `transcribeAudioOnce`
- `openLiveInterviewSession`
- `SimpleEmitter` class

**Step 3**: Create `assessment.ts` with feedback functions:
- `getOverallAssessmentFromLLM`
- `getQuestionFeedbackFromLLM`
- `getChatResponse`

**Step 4**: Create `utils.ts` with helper functions:
- `parseStructuredResponse`
- `processStream`

**Step 5**: Create `prompts.ts` with prompt builders:
- `buildSystemInstruction`
- `buildPromptContents`
- `buildNaturalConversationPrompt`
- `buildTopicalPrompt`

**Step 6**: Create `fallbacks.ts` with error handling:
- `generateBetterContextualFollowUp`
- `extractInsightsFromResponse`
- `generateFallbackQuestion`
- `getFallbackKeyPoints`

**Step 7**: Create `tokens.ts` with ephemeral tokens:
- `generateEphemeralToken`
- Related interfaces

**Step 8**: Create `index.ts` barrel file for backward compatibility

#### 2.3 Update Import Statements

**Maintain backward compatibility** through barrel exports while allowing more specific imports:

```typescript
// Still works (backward compatible)
import { getFirstQuestion, continueConversation } from '~/lib/gemini';

// Also now possible (more specific)
import { getFirstQuestion } from '~/lib/gemini/core';
import { generateEphemeralToken } from '~/lib/gemini/tokens';
```

### Phase 3: 🔵 REFACTOR - Optimize and Clean Implementation

#### 3.1 Dependency Optimization
- Analyze and optimize imports between modules
- Remove unused dependencies from individual modules
- Ensure no circular dependencies exist
- Split shared types into separate type files if needed

#### 3.2 Performance Optimization
- Lazy load non-critical modules
- Optimize client initialization per module
- Cache frequently used configurations
- Reduce bundle size with tree-shaking

#### 3.3 Documentation Enhancement
- Add comprehensive JSDoc to each module
- Document module boundaries and responsibilities
- Create architecture diagrams for new structure
- Update README with new import patterns

---

## 3. File Impact Analysis

### 🔴 High Impact (Major Changes Required)

**New Module Files:**
- `src/lib/gemini/core.ts` - Core interview functions (~250 lines)
- `src/lib/gemini/live.ts` - Live voice functionality (~300 lines)
- `src/lib/gemini/assessment.ts` - Assessment functions (~200 lines)
- `src/lib/gemini/prompts.ts` - Prompt utilities (~150 lines)
- `src/lib/gemini/utils.ts` - Parsing utilities (~100 lines)
- `src/lib/gemini/fallbacks.ts` - Fallback logic (~150 lines)
- `src/lib/gemini/tokens.ts` - Token management (~75 lines)
- `src/lib/gemini/index.ts` - Barrel exports (~50 lines)

**Deleted Files:**
- `src/lib/gemini.ts` - Original monolithic file (DELETE after migration)

### 🟡 Medium Impact (Import Updates Optional)

**Files That Import Gemini:**
- `src/server/api/routers/session.ts` - Can keep same imports (barrel compatibility)
- `src/components/Sessions/InterviewUI/LiveVoiceInterviewUI.tsx` - Option for specific imports
- `src/lib/speechService.ts` - Could use more specific import

### 🟢 Low Impact (Test Updates Only)

**Test Files:**
- Existing gemini tests need module-specific imports
- Some tests benefit from more targeted mocking

### ❌ No Impact (Unchanged)

**All Other Files:**
- Public APIs remain exactly the same
- Database schema unchanged
- User experience unchanged
- Type definitions unchanged

---

## 4. Implementation Timeline

### Week 1: 🔴 RED Phase (Write Failing Tests)
- **Day 1**: Write failing tests for core module structure
- **Day 2**: Write failing tests for live voice modules
- **Day 3**: Write failing tests for assessment and utility modules  
- **Day 4**: Write failing tests for barrel exports and compatibility
- **Day 5**: Write integration tests for module boundaries

### Week 2: 🟢 GREEN Phase (Make Tests Pass)
- **Day 1**: Create core.ts and prompts.ts modules
- **Day 2**: Create live.ts and utils.ts modules
- **Day 3**: Create assessment.ts and fallbacks.ts modules
- **Day 4**: Create tokens.ts and index.ts barrel file
- **Day 5**: Update imports and verify all tests pass

### Week 3: 🔵 REFACTOR Phase (Optimize)
- **Day 1**: Optimize module dependencies and imports
- **Day 2**: Performance optimization and bundle analysis
- **Day 3**: Documentation and architecture updates
- **Day 4**: Final testing and migration verification
- **Day 5**: Delete original file and cleanup

---

## 5. Success Criteria

### 5.1 Functional Requirements ✅
- [ ] All existing functionality works identically
- [ ] All existing tests pass with new module structure
- [ ] New modular tests achieve >95% coverage
- [ ] Backward compatibility maintained through barrel exports
- [ ] No circular dependencies between modules

### 5.2 Architecture Requirements ✅
- [ ] All modules under 300 lines (comply with workspace rules)
- [ ] Single responsibility per module
- [ ] Clear separation of concerns
- [ ] Optimal import tree-shaking support
- [ ] Type safety maintained or improved

### 5.3 Performance Requirements ✅
- [ ] No performance regressions
- [ ] Bundle size same or smaller
- [ ] Module lazy loading possible
- [ ] Faster test execution with targeted mocking
- [ ] Improved development experience

---

## 6. Risk Mitigation

### 6.1 Technical Risks
**Risk**: Breaking existing imports during refactor
**Mitigation**: Barrel export file maintains backward compatibility

**Risk**: Circular dependencies between modules
**Mitigation**: Careful dependency analysis and shared utilities module

**Risk**: Type import issues
**Mitigation**: Comprehensive type testing and gradual migration

### 6.2 Development Risks
**Risk**: Complex refactor introduces bugs
**Mitigation**: TDD approach with comprehensive testing before changes

**Risk**: Performance regression
**Mitigation**: Before/after performance testing and bundle analysis

---

## 7. Migration Strategy

### 7.1 Zero-Risk Migration Approach
1. **Phase 1**: Create new modules with TDD (original file still exists)
2. **Phase 2**: Barrel export ensures all imports still work
3. **Phase 3**: Gradual migration to specific imports (optional)
4. **Phase 4**: Delete original file after full verification

### 7.2 Instant Rollback Plan
- Keep original `gemini.ts` file until final verification
- Barrel export ensures all existing code continues working
- Any issues = immediate rollback by restoring original file
- Zero deployment risk

---

## Summary

This TDD refactoring plan transforms the monolithic 1,297-line `gemini.ts` file into **8 focused, maintainable modules** following the Red-Green-Refactor methodology and workspace 300-line rule.

**Key Benefits:**
- 🏗️ **Modular Architecture** - Single responsibility per file
- 🧪 **Better Testability** - Mock individual modules independently  
- 🔧 **Easier Maintenance** - Changes isolated to specific modules
- 📦 **Cleaner Imports** - Import only what you need
- ✅ **Compliance** - All files under 300-line workspace rule

**Zero-Risk Implementation:**
1. 🔴 **RED**: Comprehensive failing tests define modular structure
2. 🟢 **GREEN**: Minimal implementation to make all tests pass
3. 🔵 **REFACTOR**: Optimization with full test coverage

The barrel export file maintains **complete backward compatibility**, making this a zero-risk refactor with instant rollback capability. 