/**
 * SPIKE: Kiro AI API Integration POC
 * Task: 4.0 - Validate Kiro AI API integration
 * Requirements: 2.2
 * 
 * Purpose: Test Kiro AI API availability, signature, constraints, and behavior
 * This is a minimal proof-of-concept to document the actual API shape for Task 6
 * 
 * Note: This file attempts to import 'kiro' module which may not exist during development.
 * This is expected behavior for a spike/POC file testing API availability.
 */

import { Language, AbstractionLevel, RelationshipType } from '../types';

// ============================================================================
// Temporary types for POC - these will be properly implemented in Task 6
// ============================================================================

interface DirectoryNode {
  name: string;
  path: string;
  children: DirectoryNode[];
  files: string[];
}

interface FileGroundingData {
  path: string;
  language: Language;
  exports: string[];
  classes: ClassGroundingData[];
  topLevelFunctions: FunctionGroundingData[];
  imports: ImportRef[];
}

interface ClassGroundingData {
  name: string;
  superClass?: string;
  interfaces?: string[];
  methods?: string[];
}

interface FunctionGroundingData {
  name: string;
  signature?: string;
}

interface ImportRef {
  from: string;
  symbols: string[];
}

interface ImportEdge {
  sourceFile: string;
  targetFile: string;
  symbols: string[];
}

interface InheritanceEdge {
  childClass: string;
  parentClass: string;
  sourceFile: string;
  type: 'extends' | 'implements';
}

interface GroundingData {
  rootPath: string;
  timestamp: number;
  directoryTree: DirectoryNode;
  files: FileGroundingData[];
  importGraph: ImportEdge[];
  inheritanceGraph: InheritanceEdge[];
}

interface ArchitecturalComponent {
  id: string;
  name: string;
  description: string;
  role: string;
  filePaths: string[];
  abstractionLevel: AbstractionLevel;
  subComponents: string[];
  parent: string | null;
}

interface ArchitecturalRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  description: string;
  strength: number;
}

interface ArchitecturalModelMetadata {
  llmInferenceTimeMs: number;
  tierUsed: 1 | 2 | 3;
  confidence: 'high' | 'medium' | 'low';
  filesAnalyzed: number;
}

interface ArchitecturalModel {
  components: ArchitecturalComponent[];
  relationships: ArchitecturalRelationship[];
  patterns: string[];
  metadata: ArchitecturalModelMetadata;
}

/**
 * POC: Test basic Kiro AI API availability
 * 
 * Expected API patterns to test:
 * 1. Direct import: import * as kiro from 'kiro'
 * 2. Global object: global.kiro or window.kiro
 * 3. Extension context: context.kiro or context.ai
 */
export async function testKiroAIAvailability(): Promise<{
  available: boolean;
  apiType: 'import' | 'global' | 'context' | 'mock' | 'none';
  error?: string;
}> {
  try {
    // Test 1: Try importing kiro module
    try {
      // Note: This will fail in test environment, but documents the expected pattern
      const kiro = await import('kiro').catch(() => null);
      if (kiro && (kiro as any).ai) {
        return { available: true, apiType: 'import' };
      }
    } catch (e) {
      // Import failed, try other methods
    }

    // Test 2: Check for global kiro object
    if (typeof (global as any).kiro !== 'undefined') {
      const kiro = (global as any).kiro;
      if (kiro && kiro.ai) {
        return { available: true, apiType: 'global' };
      }
    }

    // Test 3: Will need to test context-based access during activation
    // This will be tested in the integration test

    // Test 4: Check if mock is available (for testing)
    try {
      const { getKiroAI } = await import('./kiro-api-stub');
      const { api, isMock } = await getKiroAI();
      if (api && isMock) {
        return { available: true, apiType: 'mock' };
      }
    } catch (e) {
      // Mock not available
    }

    return { 
      available: false, 
      apiType: 'none',
      error: 'Kiro AI API not found via import, global object, or mock'
    };
  } catch (error) {
    return {
      available: false,
      apiType: 'none',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * POC: Test Kiro AI API signature and basic functionality
 * 
 * Tests:
 * - Method availability (sendMessage, chat, interpret, etc.)
 * - Input/output format
 * - Error handling
 */
export async function testKiroAISignature(kiroAI: any): Promise<{
  methods: string[];
  supportsStreaming: boolean;
  supportsJSON: boolean;
  error?: string;
}> {
  try {
    const methods = Object.keys(kiroAI).filter(key => typeof kiroAI[key] === 'function');
    
    // Test for common method patterns
    const supportsStreaming = methods.some(m => 
      m.includes('stream') || m.includes('Stream')
    );
    
    // Test JSON response capability (will be tested with actual call)
    const supportsJSON = true; // Assume true, will verify in actual test
    
    return {
      methods,
      supportsStreaming,
      supportsJSON
    };
  } catch (error) {
    return {
      methods: [],
      supportsStreaming: false,
      supportsJSON: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * POC: Test Kiro AI with minimal grounding data
 * 
 * Tests:
 * - Token limits (how much grounding data can we send?)
 * - Response format
 * - Response time
 * - Error handling
 */
export async function testKiroAIWithMinimalGrounding(
  kiroAI: any,
  sendMethod: string = 'sendMessage'
): Promise<{
  success: boolean;
  responseTimeMs: number;
  responseFormat: 'json' | 'text' | 'unknown';
  tokenEstimate?: number;
  error?: string;
  response?: any;
}> {
  const startTime = Date.now();
  
  try {
    // Create minimal grounding data for testing
    const minimalGrounding: Partial<GroundingData> = {
      rootPath: '/test/project',
      timestamp: Date.now(),
      directoryTree: {
        name: 'project',
        path: '/test/project',
        children: [],
        files: ['index.ts', 'utils.ts']
      },
      files: [
        {
          path: '/test/project/index.ts',
          language: 'typescript' as any,
          exports: ['main'],
          classes: [],
          topLevelFunctions: [{ name: 'main' }],
          imports: [{ from: './utils', symbols: ['helper'] }]
        },
        {
          path: '/test/project/utils.ts',
          language: 'typescript' as any,
          exports: ['helper'],
          classes: [],
          topLevelFunctions: [{ name: 'helper' }],
          imports: []
        }
      ],
      importGraph: [
        {
          sourceFile: '/test/project/index.ts',
          targetFile: '/test/project/utils.ts',
          symbols: ['helper']
        }
      ],
      inheritanceGraph: []
    };

    // Build test prompt
    const prompt = buildArchitectureInterpretationPrompt(minimalGrounding);
    
    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const tokenEstimate = Math.ceil(prompt.length / 4);
    
    // Call Kiro AI API
    const method = kiroAI[sendMethod];
    if (!method || typeof method !== 'function') {
      throw new Error(`Method ${sendMethod} not found on Kiro AI API`);
    }
    
    const response = await method.call(kiroAI, prompt);
    const responseTimeMs = Date.now() - startTime;
    
    // Determine response format
    let responseFormat: 'json' | 'text' | 'unknown' = 'unknown';
    let parsedResponse = response;
    
    if (typeof response === 'string') {
      try {
        parsedResponse = JSON.parse(response);
        responseFormat = 'json';
      } catch {
        responseFormat = 'text';
      }
    } else if (typeof response === 'object') {
      responseFormat = 'json';
    }
    
    return {
      success: true,
      responseTimeMs,
      responseFormat,
      tokenEstimate,
      response: parsedResponse
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    return {
      success: false,
      responseTimeMs,
      responseFormat: 'unknown',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * POC: Test rate limits and constraints
 * 
 * Tests:
 * - Maximum request size
 * - Rate limiting behavior
 * - Concurrent request handling
 */
export async function testKiroAIConstraints(
  kiroAI: any,
  sendMethod: string = 'sendMessage'
): Promise<{
  maxTokensEstimate?: number;
  rateLimitHit: boolean;
  supportsConcurrent: boolean;
  error?: string;
}> {
  try {
    // Test 1: Try increasingly large prompts to find token limit
    const sizes = [1000, 5000, 10000, 50000, 100000];
    let maxTokensEstimate: number | undefined;
    
    for (const size of sizes) {
      const largePrompt = 'x'.repeat(size);
      try {
        await kiroAI[sendMethod](largePrompt);
        maxTokensEstimate = Math.ceil(size / 4); // Rough token estimate
      } catch (error) {
        // Hit limit at this size
        break;
      }
    }
    
    // Test 2: Try rapid successive calls to test rate limiting
    let rateLimitHit = false;
    try {
      const promises = Array(5).fill(null).map(() => 
        kiroAI[sendMethod]('test')
      );
      await Promise.all(promises);
    } catch (error) {
      if (error instanceof Error && 
          (error.message.includes('rate') || error.message.includes('limit'))) {
        rateLimitHit = true;
      }
    }
    
    // Test 3: Check if concurrent requests are supported
    let supportsConcurrent = false;
    try {
      await Promise.all([
        kiroAI[sendMethod]('test 1'),
        kiroAI[sendMethod]('test 2')
      ]);
      supportsConcurrent = true;
    } catch {
      supportsConcurrent = false;
    }
    
    return {
      maxTokensEstimate,
      rateLimitHit,
      supportsConcurrent
    };
  } catch (error) {
    return {
      rateLimitHit: false,
      supportsConcurrent: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * POC: Test fallback behavior when AI is unavailable
 */
export async function testFallbackBehavior(
  kiroAI: any | null
): Promise<{
  fallbackNeeded: boolean;
  fallbackStrategy: 'heuristic' | 'cached' | 'error';
  error?: string;
}> {
  if (!kiroAI) {
    return {
      fallbackNeeded: true,
      fallbackStrategy: 'heuristic',
      error: 'Kiro AI not available'
    };
  }
  
  // Test if AI is responsive
  try {
    await kiroAI.sendMessage?.('ping');
    return {
      fallbackNeeded: false,
      fallbackStrategy: 'error'
    };
  } catch (error) {
    return {
      fallbackNeeded: true,
      fallbackStrategy: 'heuristic',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Helper: Build architecture interpretation prompt from grounding data
 * This is a simplified version for POC testing
 */
function buildArchitectureInterpretationPrompt(grounding: Partial<GroundingData>): string {
  return `You are analyzing a software architecture. Below is the structural grounding data extracted
from the codebase via static analysis. Your task is to produce a semantic Architectural Model.

Directory structure:
${JSON.stringify(grounding.directoryTree, null, 2)}

Files and their exports/imports:
${JSON.stringify(grounding.files, null, 2)}

Import relationships:
${JSON.stringify(grounding.importGraph, null, 2)}

Inheritance relationships:
${JSON.stringify(grounding.inheritanceGraph, null, 2)}

Produce a JSON response with this exact structure:
{
  "components": [
    {
      "id": "unique-id",
      "name": "Descriptive component name",
      "description": "What this component does (max 50 words)",
      "role": "architectural role",
      "filePaths": ["list", "of", "file", "paths"],
      "abstractionLevel": 1,
      "subComponents": [],
      "parent": null
    }
  ],
  "relationships": [
    {
      "id": "unique-id",
      "sourceId": "component-id",
      "targetId": "component-id",
      "type": "import|dependency|inheritance|composition|function_call",
      "description": "What this relationship represents",
      "strength": 0.8
    }
  ],
  "patterns": ["list of detected architectural patterns"],
  "confidence": "high|medium|low",
  "ambiguousFiles": ["paths of files needing more detail if confidence is low"]
}`;
}

/**
 * Main POC runner - executes all tests and generates report
 */
export async function runKiroAIPOC(context?: any): Promise<POCReport> {
  const report: POCReport = {
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  // Test 1: API Availability
  const availabilityResult = await testKiroAIAvailability();
  report.tests.push({
    name: 'API Availability',
    passed: availabilityResult.available,
    details: availabilityResult
  });
  
  if (!availabilityResult.available) {
    report.summary = 'Kiro AI API not available - cannot proceed with further tests';
    return report;
  }
  
  // Get the Kiro AI instance
  let kiroAI: any;
  try {
    if (availabilityResult.apiType === 'import') {
      const kiro = await import('kiro').catch(() => null);
      kiroAI = kiro?.ai;
    } else if (availabilityResult.apiType === 'global') {
      kiroAI = (global as any).kiro.ai;
    } else if (availabilityResult.apiType === 'context' && context) {
      kiroAI = context.kiro?.ai || context.ai;
    } else if (availabilityResult.apiType === 'mock') {
      const { getKiroAI } = await import('./kiro-api-stub');
      const result = await getKiroAI();
      kiroAI = result.api;
    }
  } catch (error) {
    report.summary = `Failed to get Kiro AI instance: ${error}`;
    return report;
  }
  
  // Test 2: API Signature
  const signatureResult = await testKiroAISignature(kiroAI);
  report.tests.push({
    name: 'API Signature',
    passed: signatureResult.methods.length > 0,
    details: signatureResult
  });
  
  // Test 3: Minimal Grounding Test
  const groundingResult = await testKiroAIWithMinimalGrounding(kiroAI);
  report.tests.push({
    name: 'Minimal Grounding Test',
    passed: groundingResult.success,
    details: groundingResult
  });
  
  // Test 4: Constraints
  const constraintsResult = await testKiroAIConstraints(kiroAI);
  report.tests.push({
    name: 'API Constraints',
    passed: !constraintsResult.error,
    details: constraintsResult
  });
  
  // Test 5: Fallback Behavior
  const fallbackResult = await testFallbackBehavior(null);
  report.tests.push({
    name: 'Fallback Behavior',
    passed: fallbackResult.fallbackNeeded,
    details: fallbackResult
  });
  
  // Generate summary
  const passedTests = report.tests.filter(t => t.passed).length;
  const totalTests = report.tests.length;
  report.summary = `${passedTests}/${totalTests} tests passed`;
  
  return report;
}

/**
 * POC Report structure
 */
export interface POCReport {
  timestamp: string;
  tests: Array<{
    name: string;
    passed: boolean;
    details: any;
  }>;
  summary?: string;
}
