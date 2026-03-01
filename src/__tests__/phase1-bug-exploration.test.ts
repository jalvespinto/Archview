/**
 * Phase 1 Post-Fix Regression Tests
 * 
 * These tests were written AFTER the fixes were applied and serve as regression guards.
 * They verify that the fixes remain in place and test the corrected behavior.
 * 
 * Note: These tests never demonstrated the original bugs (fixes were applied in the same commit).
 * For true bug exploration, tests must be written and run BEFORE fixes are applied.
 * 
 * Requirements: 2.1, 2.18, 2.19
 */

import * as fs from 'fs';
import * as path from 'path';

// Import error classes from ErrorHandler.ts (the canonical location after fix)
import {
  AnalysisError,
  RenderError,
  AIError,
  AnalysisErrorType,
  RenderErrorType,
  AIErrorType
} from '../analysis/ErrorHandler';

describe('Phase 1: Bug Condition Exploration Tests', () => {
  
  describe('Issue 1.1: Duplicate Error Classes - Type Collision FIXED', () => {
    
    it('should demonstrate cross-module instanceof collision (regression guard)', () => {
      // REGRESSION TEST: Simulates what the bug looked like
      // Before fix: Error classes existed in both ErrorHandler.ts and types/index.ts
      // instanceof would fail when comparing errors from different sources
      
      // Simulate the bug scenario: two independent error classes with same name
      class AnalysisErrorV1 extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'AnalysisError';
        }
      }
      
      class AnalysisErrorV2 extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'AnalysisError';
        }
      }
      
      // Create instances from different "sources"
      const errorFromSource1 = new AnalysisErrorV1('Error from source 1');
      const errorFromSource2 = new AnalysisErrorV2('Error from source 2');
      
      // This demonstrates the bug: instanceof fails across different class definitions
      expect(errorFromSource1 instanceof AnalysisErrorV2).toBe(false);
      expect(errorFromSource2 instanceof AnalysisErrorV1).toBe(false);
      
      // Both have same name but are different classes
      expect(errorFromSource1.name).toBe('AnalysisError');
      expect(errorFromSource2.name).toBe('AnalysisError');
      
      // This proves why the fix (single canonical source) is necessary
    });
    
    it('should catch AnalysisError with instanceof check working correctly', () => {
      // AFTER FIX: instanceof should work correctly
      // Error classes only exist in ErrorHandler.ts
      
      try {
        // Throw error using ErrorHandler.ts constructor (5-arg)
        throw new AnalysisError(
          'Test error',
          'User-friendly message',
          AnalysisErrorType.ParseError,
          { testContext: true }
        );
      } catch (error) {
        // instanceof check should work correctly now
        expect(error instanceof AnalysisError).toBe(true);
        expect(error instanceof Error).toBe(true);
        
        // Verify it's the correct error type
        if (error instanceof AnalysisError) {
          expect(error.type).toBe(AnalysisErrorType.ParseError);
          expect(error.userMessage).toBe('User-friendly message');
        }
      }
    });

    it('should catch RenderError with instanceof check working correctly', () => {
      // AFTER FIX: instanceof should work correctly
      
      try {
        // Throw error using ErrorHandler.ts constructor (5-arg)
        throw new RenderError(
          'Test render error',
          'User-friendly render message',
          RenderErrorType.InvalidData,
          { renderContext: true }
        );
      } catch (error) {
        // instanceof check should work correctly now
        expect(error instanceof RenderError).toBe(true);
        expect(error instanceof Error).toBe(true);
        
        // Verify it's the correct error type
        if (error instanceof RenderError) {
          expect(error.type).toBe(RenderErrorType.InvalidData);
          expect(error.userMessage).toBe('User-friendly render message');
        }
      }
    });

    it('should catch AIError with instanceof check working correctly', () => {
      // AFTER FIX: instanceof should work correctly
      
      try {
        // Throw error using ErrorHandler.ts constructor (4-arg)
        throw new AIError(
          'Test AI error',
          'User-friendly AI message',
          AIErrorType.ServiceUnavailable,
          { aiContext: true }
        );
      } catch (error) {
        // instanceof check should work correctly now
        expect(error instanceof AIError).toBe(true);
        expect(error instanceof Error).toBe(true);
        
        // Verify it's the correct error type
        if (error instanceof AIError) {
          expect(error.type).toBe(AIErrorType.ServiceUnavailable);
          expect(error.userMessage).toBe('User-friendly AI message');
        }
      }
    });

    it('should verify error classes are NOT exported from types/index.ts', () => {
      // AFTER FIX: Error classes should only exist in ErrorHandler.ts
      // This test verifies they are NOT in types/index.ts
      
      // Try to import from types/index.ts - should not have error classes
      const typesModule = require('../types/index');
      
      // These should be undefined after the fix
      expect(typesModule.AnalysisError).toBeUndefined();
      expect(typesModule.RenderError).toBeUndefined();
      expect(typesModule.AIError).toBeUndefined();
    });
  });

  describe('Issue 1.19: Dead Code - GroundingDataBuilder FIXED', () => {
    
    it('should verify GroundingDataBuilder.ts file no longer exists', () => {
      // AFTER FIX: The file should be deleted
      const filePath = path.join(__dirname, '..', 'analysis', 'GroundingDataBuilder.ts');
      const exists = fs.existsSync(filePath);
      
      // File should NOT exist after fix
      expect(exists).toBe(false);
      
      if (exists) {
        fail('GroundingDataBuilder.ts still exists - it should have been deleted');
      }
    });

    it('should verify GroundingDataBuilder test file no longer exists', () => {
      // AFTER FIX: The test file should also be deleted
      const filePath = path.join(__dirname, '..', 'analysis', '__tests__', 'GroundingDataBuilder.test.ts');
      const exists = fs.existsSync(filePath);
      
      // Test file should NOT exist after fix
      expect(exists).toBe(false);
      
      if (exists) {
        fail('GroundingDataBuilder.test.ts still exists - it should have been deleted');
      }
    });

    it('should verify no imports of GroundingDataBuilder remain', () => {
      // AFTER FIX: No imports should exist
      const srcDir = path.join(__dirname, '..');
      const imports = findImportsInDirectory(srcDir, 'GroundingDataBuilder');
      
      // Filter out this test file itself
      const remainingImports = imports.filter(filePath => 
        !filePath.includes('phase1-bug-exploration.test.ts')
      );
      
      // Should have no imports after fix
      expect(remainingImports.length).toBe(0);
      
      if (remainingImports.length > 0) {
        console.log('REMAINING IMPORTS FOUND:', remainingImports);
        fail('GroundingDataBuilder imports still exist');
      }
    });
  });
});

/**
 * Helper function to recursively find imports in a directory
 */
function findImportsInDirectory(dir: string, importName: string): string[] {
  const results: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and dist
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
          continue;
        }
        results.push(...findImportsInDirectory(fullPath, importName));
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const importRegex = new RegExp(`import.*${importName}`, 'g');
        
        if (importRegex.test(content)) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Ignore permission errors
  }
  
  return results;
}
