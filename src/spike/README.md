# Kiro AI API Integration POC

**Task 4.0** - Validate Kiro AI API integration (SPIKE)

## Purpose

This spike validates the Kiro AI API for use in the AI Architecture Diagram Extension. The goal is to document the actual API shape, constraints, and behavior before implementing the full AI integration in Task 6.

## Files

### Core POC Implementation
- **`kiro-ai-poc.ts`** - Main POC implementation with test functions
- **`kiro-api-stub.ts`** - Mock Kiro AI API for testing
- **`kiro.d.ts`** - TypeScript type declarations for Kiro module

### Tests
- **`kiro-ai-poc.test.ts`** - Comprehensive test suite for POC validation

### Documentation
- **`KIRO_AI_API_FINDINGS.md`** - Detailed findings and recommendations
- **`README.md`** - This file

## Running the POC

```bash
# Run all POC tests
npm test -- src/spike/kiro-ai-poc.test.ts

# Run with verbose output
npm test -- src/spike/kiro-ai-poc.test.ts --verbose

# Run specific test
npm test -- src/spike/kiro-ai-poc.test.ts -t "API Availability"
```

## Key Findings

### ✅ What We Validated

1. **API Interface Design**
   - Defined expected interface: `sendMessage()`, `chat()`, `stream()`
   - Created TypeScript types for Kiro AI API
   - Validated response format matches ArchitecturalModel

2. **Response Format**
   - Confirmed JSON response structure
   - Validated all required fields present
   - Token estimation: ~488 tokens for 2-file grounding data

3. **Fallback Strategy**
   - Implemented heuristic-based interpretation
   - Tested fallback when AI unavailable
   - Validated graceful degradation

4. **Mock Implementation**
   - Created working mock for testing
   - Simulates expected API behavior
   - Enables development without real API

### ⚠️ Requires Production Testing

1. **Actual API Access Pattern**
   - Test import pattern: `import * as kiro from 'kiro'`
   - Test global pattern: `global.kiro.ai`
   - Test context pattern: `context.kiro.ai`

2. **Real Constraints**
   - Actual token limits (mock: ~25k)
   - Rate limiting behavior
   - Response times
   - Error codes and types

## API Interface

### Expected Interface

```typescript
interface KiroAIAPI {
  sendMessage(prompt: string, options?: AIRequestOptions): Promise<string>;
  chat?(messages: AIMessage[], options?: AIRequestOptions): Promise<string>;
  stream?(prompt: string, options?: AIRequestOptions): AsyncIterableIterator<string>;
}
```

### Usage Example

```typescript
import { getKiroAI } from './spike/kiro-api-stub';

// Get API (real or mock)
const { api, isMock } = await getKiroAI();

// Send grounding data for interpretation
const prompt = buildArchitectureInterpretationPrompt(groundingData);
const response = await api.sendMessage(prompt);

// Parse response
const architecturalModel = JSON.parse(response);
```

## Fallback Strategy

When Kiro AI is unavailable:

```typescript
function heuristicInterpretation(grounding: GroundingData): ArchitecturalModel {
  // 1. Group files by top-level directory
  const components = groupByDirectory(grounding.directoryTree);
  
  // 2. Use directory names as component names
  components.forEach(c => {
    c.name = c.path.split('/').pop() || 'unknown';
    c.description = `Component in ${c.path}`;
    c.role = 'module';
  });
  
  // 3. Derive relationships from import graph
  const relationships = grounding.importGraph.map(edge => ({
    sourceId: findComponentForFile(edge.sourceFile),
    targetId: findComponentForFile(edge.targetFile),
    type: 'import',
    description: 'Import relationship',
    strength: 0.5
  }));
  
  return {
    components,
    relationships,
    patterns: [],
    metadata: {
      llmInferenceTimeMs: 0,
      tierUsed: 1,
      confidence: 'low',
      filesAnalyzed: grounding.files.length
    }
  };
}
```

## Token Budget

**Estimated Token Usage per Tier:**

- **Tier 1:** ~100 tokens per file (path, exports, imports)
- **Tier 2:** ~300 tokens per file (+ signatures)
- **Tier 3:** ~1000 tokens per file (+ content excerpts)

**For 100 files:**
- Tier 1: ~10,000 tokens
- Tier 2: ~30,000 tokens
- Tier 3: ~100,000 tokens

**Strategy:** Start with Tier 1 for all files, selectively enrich only ambiguous files to higher tiers.

## Next Steps for Task 6

1. ✅ API interface defined
2. ✅ Mock implementation available
3. ✅ Fallback strategy implemented
4. ⏳ Test in real Kiro IDE environment
5. ⏳ Implement full AI service wrapper
6. ⏳ Add tiered enrichment logic
7. ⏳ Implement response caching
8. ⏳ Add error handling and retry logic

## Questions for Kiro Team

When testing in the real Kiro IDE environment:

1. What is the official API access pattern for extensions?
2. What are the actual token limits per request?
3. Are there rate limits we should be aware of?
4. Does the API support streaming responses?
5. What is the expected response format (string vs. object)?
6. Are there any caching mechanisms built into the API?
7. What error codes/types should we handle?
8. Is there a timeout for long-running requests?

## References

- **Design Document:** `.kiro/specs/ai-architecture-diagram-extension/design.md`
- **Requirements:** `.kiro/specs/ai-architecture-diagram-extension/requirements.md`
- **Task List:** `.kiro/specs/ai-architecture-diagram-extension/tasks.md`
- **Findings:** `./KIRO_AI_API_FINDINGS.md`
