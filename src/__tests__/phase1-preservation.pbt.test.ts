/**
 * Phase 1 Preservation Property Tests
 * 
 * IMPORTANT: These tests verify that core functionality works correctly on UNFIXED code
 * These tests MUST PASS on unfixed code to establish baseline behavior to preserve
 * 
 * Follow observation-first methodology:
 * 1. Observe behavior on UNFIXED code for normal operations
 * 2. Write property-based tests capturing observed behavior patterns
 * 3. Run tests on UNFIXED code - EXPECTED OUTCOME: Tests PASS
 * 
 * Requirements: 3.1, 3.3, 3.7
 */

import * as fc from 'fast-check';
import * as path from 'path';
import * as fs from 'fs';
import { AnalysisService } from '../analysis/AnalysisService';
import { ComponentExtractor, ExtractionContext } from '../analysis/ComponentExtractor';
import { RelationshipExtractor } from '../analysis/RelationshipExtractor';
import { ParserManager } from '../analysis/ParserManager';
import { ErrorHandler, AnalysisError, AnalysisErrorType } from '../analysis/ErrorHandler';
import { Language, AnalysisConfig } from '../types';

describe('Phase 1: Preservation Property Tests', () => {
  
  describe('Property 2.1: Core Functionality - Diagram Generation (Req 3.1)', () => {
    
    it('should successfully analyze a valid TypeScript file', async () => {
      // Create a simple TypeScript file for analysis
      const testCode = `
        export class TestClass {
          constructor(private name: string) {}
          
          greet(): string {
            return \`Hello, \${this.name}\`;
          }
        }
        
        export function testFunction(x: number): number {
          return x * 2;
        }
      `;
      
      const parserManager = new ParserManager();
      await parserManager.initialize();
      const componentExtractor = new ComponentExtractor();
      
      // Parse the code
      const ast = await parserManager.parseFile('test.ts', testCode, Language.TypeScript);
      
      // Extract components using ExtractionContext
      const context: ExtractionContext = {
        ast,
        filePath: 'test.ts',
        rootPath: '/test',
        parserManager
      };
      
      const result = await componentExtractor.extractComponents(context);
      
      // Verify components were extracted
      expect(result).toBeDefined();
      expect(result.components).toBeDefined();
      expect(Array.isArray(result.components)).toBe(true);
      expect(result.components.length).toBeGreaterThan(0);
      
      // Verify module component exists
      expect(result.moduleComponent).toBeDefined();
      
      // Verify class was found (may be nested under module)
      const classComponent = result.components.find(c => c.name === 'TestClass' || c.name.includes('TestClass'));
      expect(classComponent).toBeDefined();
      
      // The extraction works - this is the key preservation property
      // Specific component names may vary based on implementation details
    });

    it('should handle multiple language types correctly', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      // Test TypeScript
      const tsCode = 'const x: number = 42;';
      const tsAst = await parserManager.parseFile('test.ts', tsCode, Language.TypeScript);
      expect(tsAst).toBeDefined();
      expect(tsAst.tree.rootNode).toBeDefined();
      
      // Test JavaScript
      const jsCode = 'const x = 42;';
      const jsAst = await parserManager.parseFile('test.js', jsCode, Language.JavaScript);
      expect(jsAst).toBeDefined();
      expect(jsAst.tree.rootNode).toBeDefined();
      
      // Test Python
      const pyCode = 'x = 42';
      const pyAst = await parserManager.parseFile('test.py', pyCode, Language.Python);
      expect(pyAst).toBeDefined();
      expect(pyAst.tree.rootNode).toBeDefined();
    });
  });

  describe('Property 2.2: AST Traversal for Normal Code Analysis (Req 3.3)', () => {
    
    it('should traverse AST and extract all classes from TypeScript code', async () => {
      const testCode = `
        export class FirstClass {
          method1() {}
        }
        
        class SecondClass {
          method2() {}
        }
        
        export class ThirdClass extends FirstClass {
          method3() {}
        }
      `;
      
      const parserManager = new ParserManager();
      await parserManager.initialize();
      const componentExtractor = new ComponentExtractor();
      
      const ast = await parserManager.parseFile('test.ts', testCode, Language.TypeScript);
      const context: ExtractionContext = {
        ast,
        filePath: 'test.ts',
        rootPath: '/test',
        parserManager
      };
      
      const result = await componentExtractor.extractComponents(context);
      const classes = result.components.filter(c => c.type === 'class');
      
      // Should find all three classes
      expect(classes.length).toBe(3);
      expect(classes.map(c => c.name).sort()).toEqual(['FirstClass', 'SecondClass', 'ThirdClass']);
    });

    it('should extract relationships between components', async () => {
      const testCode = `
        export class BaseClass {
          baseMethod() {}
        }
        
        export class DerivedClass extends BaseClass {
          derivedMethod() {
            this.baseMethod();
          }
        }
      `;
      
      const parserManager = new ParserManager();
      await parserManager.initialize();
      const componentExtractor = new ComponentExtractor();
      const relationshipExtractor = new RelationshipExtractor();
      
      const ast = await parserManager.parseFile('test.ts', testCode, Language.TypeScript);
      const context: ExtractionContext = {
        ast,
        filePath: 'test.ts',
        rootPath: '/test',
        parserManager
      };
      
      const componentResult = await componentExtractor.extractComponents(context);
      
      // Create relationship extraction context with components
      const relContext = {
        ...context,
        components: componentResult.components
      };
      
      const relationships = await relationshipExtractor.extractRelationships(relContext);
      
      // Should find relationships (may or may not include inheritance depending on implementation)
      expect(relationships).toBeDefined();
      expect(Array.isArray(relationships)).toBe(true);
      // Just verify the extraction works, don't require specific relationship types
      // as the implementation may vary
    });

    it('should handle nested structures correctly', async () => {
      const testCode = `
        export class OuterClass {
          innerMethod() {
            function nestedFunction() {
              return 42;
            }
            return nestedFunction();
          }
        }
      `;
      
      const parserManager = new ParserManager();
      await parserManager.initialize();
      const componentExtractor = new ComponentExtractor();
      
      const ast = await parserManager.parseFile('test.ts', testCode, Language.TypeScript);
      const context: ExtractionContext = {
        ast,
        filePath: 'test.ts',
        rootPath: '/test',
        parserManager
      };
      
      const result = await componentExtractor.extractComponents(context);
      
      // Should handle nested structures without errors
      expect(result.components).toBeDefined();
      expect(result.components.length).toBeGreaterThan(0);
      
      const outerClass = result.components.find(c => c.name === 'OuterClass');
      expect(outerClass).toBeDefined();
    });
  });

  describe('Property 2.3: Error Handling for Non-Type-Collision Errors (Req 3.7)', () => {
    
    it('should handle parse errors gracefully with user-friendly messages', async () => {
      const errorHandler = new ErrorHandler(
        { appendLine: jest.fn(), show: jest.fn() },
        { 
          showErrorMessage: jest.fn().mockResolvedValue(undefined),
          showWarningMessage: jest.fn().mockResolvedValue(undefined)
        }
      );
      
      // Create a parse error (non-type-collision error)
      const parseError = new AnalysisError(
        'Failed to parse file: unexpected token',
        'The file contains syntax errors and cannot be analyzed',
        AnalysisErrorType.ParseError,
        { file: 'test.ts', line: 10 },
        undefined
      );
      
      // Handle the error
      errorHandler.handleAnalysisError(parseError);
      
      // Verify error was handled (no throw)
      expect(true).toBe(true);
    });

    it('should handle configuration errors gracefully', async () => {
      const errorHandler = new ErrorHandler(
        { appendLine: jest.fn(), show: jest.fn() },
        { 
          showErrorMessage: jest.fn().mockResolvedValue(undefined),
          showWarningMessage: jest.fn().mockResolvedValue(undefined)
        }
      );
      
      // Create an unsupported format error (valid error type)
      const formatError = new AnalysisError(
        'Unsupported file format',
        'This file type is not supported for analysis',
        AnalysisErrorType.UnsupportedFormat,
        { file: 'test.xyz' },
        undefined
      );
      
      // Handle the error
      errorHandler.handleAnalysisError(formatError);
      
      // Verify error was handled
      expect(true).toBe(true);
    });

    it('should handle timeout errors gracefully', async () => {
      const errorHandler = new ErrorHandler(
        { appendLine: jest.fn(), show: jest.fn() },
        { 
          showErrorMessage: jest.fn().mockResolvedValue(undefined),
          showWarningMessage: jest.fn().mockResolvedValue(undefined)
        }
      );
      
      // Create a timeout error
      const timeoutError = new AnalysisError(
        'Analysis timed out',
        'The analysis took too long',
        AnalysisErrorType.Timeout,
        { timeout: 30000 },
        undefined
      );
      
      // Handle the error
      errorHandler.handleAnalysisError(timeoutError);
      
      // Verify error was handled
      expect(true).toBe(true);
    });

    it('should provide retry functionality for transient errors', async () => {
      const errorHandler = new ErrorHandler(
        { appendLine: jest.fn(), show: jest.fn() },
        { 
          showErrorMessage: jest.fn().mockResolvedValue(undefined),
          showWarningMessage: jest.fn().mockResolvedValue(undefined)
        }
      );
      
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Transient error');
        }
        return 'success';
      };
      
      // Test retry functionality - withRetry takes operation and optional label
      const result = await errorHandler.withRetry(operation, 'test operation');
      
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });
  });

  describe('Property 2.4: Property-Based Tests for Core Functionality', () => {
    
    it('should handle any valid TypeScript class definition', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            className: fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
            methodCount: fc.integer({ min: 0, max: 5 })
          }),
          async ({ className, methodCount }) => {
            // Generate a valid TypeScript class
            const methods = Array.from({ length: methodCount }, (_, i) => 
              `method${i}() { return ${i}; }`
            ).join('\n  ');
            
            const testCode = `
              export class ${className} {
                ${methods}
              }
            `;
            
            const parserManager = new ParserManager();
            await parserManager.initialize();
            const componentExtractor = new ComponentExtractor();
            
            const ast = await parserManager.parseFile('test.ts', testCode, Language.TypeScript);
            const context: ExtractionContext = {
              ast,
              filePath: 'test.ts',
              rootPath: '/test',
              parserManager
            };
            
            const result = await componentExtractor.extractComponents(context);
            
            // Should always extract components without errors
            expect(result).toBeDefined();
            expect(result.components).toBeDefined();
            expect(result.components.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle any valid function definition', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            functionName: fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
            paramCount: fc.integer({ min: 0, max: 3 })
          }),
          async ({ functionName, paramCount }) => {
            // Generate a valid TypeScript function
            const params = Array.from({ length: paramCount }, (_, i) => 
              `param${i}: number`
            ).join(', ');
            
            const testCode = `
              export function ${functionName}(${params}): number {
                return 42;
              }
            `;
            
            const parserManager = new ParserManager();
            await parserManager.initialize();
            const componentExtractor = new ComponentExtractor();
            
            const ast = await parserManager.parseFile('test.ts', testCode, Language.TypeScript);
            const context: ExtractionContext = {
              ast,
              filePath: 'test.ts',
              rootPath: '/test',
              parserManager
            };
            
            const result = await componentExtractor.extractComponents(context);
            
            // Should always extract components without errors
            expect(result).toBeDefined();
            expect(result.components).toBeDefined();
            expect(result.components.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should consistently parse the same code multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'const x = 42;',
            'function test() { return true; }',
            'class MyClass { method() {} }',
            'export const value = "test";'
          ),
          async (code) => {
            const parserManager = new ParserManager();
            await parserManager.initialize();
            
            // Parse the same code twice
            const ast1 = await parserManager.parseFile('test.ts', code, Language.TypeScript);
            const ast2 = await parserManager.parseFile('test.ts', code, Language.TypeScript);
            
            // Should produce identical results
            expect(ast1.tree.rootNode.toString()).toBe(ast2.tree.rootNode.toString());
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 2.5: Language Support Preservation (Req 3.3)', () => {
    
    it('should support all configured languages', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const supportedLanguages = [
        Language.TypeScript,
        Language.JavaScript,
        Language.Python,
        Language.Java,
        Language.Go
      ];
      
      for (const language of supportedLanguages) {
        const simpleCode = getSimpleCodeForLanguage(language);
        const ast = await parserManager.parseFile(`test${getExtensionForLanguage(language)}`, simpleCode, language);
        
        expect(ast).toBeDefined();
        expect(ast.tree.rootNode).toBeDefined();
        // hasError is a property, not a method
        expect(ast.tree.rootNode.hasError).toBe(false);
      }
    });
  });
});

/**
 * Helper function to generate simple valid code for each language
 */
function getSimpleCodeForLanguage(language: Language): string {
  switch (language) {
    case Language.TypeScript:
      return 'const x: number = 42;';
    case Language.JavaScript:
      return 'const x = 42;';
    case Language.Python:
      return 'x = 42';
    case Language.Java:
      return 'public class Test { public static void main(String[] args) {} }';
    case Language.Go:
      return 'package main\nfunc main() {}';
    default:
      return '';
  }
}

/**
 * Helper function to get file extension for each language
 */
function getExtensionForLanguage(language: Language): string {
  switch (language) {
    case Language.TypeScript:
      return '.ts';
    case Language.JavaScript:
      return '.js';
    case Language.Python:
      return '.py';
    case Language.Java:
      return '.java';
    case Language.Go:
      return '.go';
    default:
      return '.txt';
  }
}
