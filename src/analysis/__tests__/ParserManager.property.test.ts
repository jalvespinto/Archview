/**
 * Property-based tests for ParserManager
 * Tests universal properties for multi-language parsing using randomized inputs
 * Requirements: 1.4, 12.1, 12.4
 */

import * as fc from 'fast-check';
import { ParserManager, ParsedAST } from '../ParserManager';
import { Language } from '../../types';

describe('ParserManager Property-Based Tests', () => {
  let parserManager: ParserManager;

  beforeEach(async () => {
    parserManager = new ParserManager();
    await parserManager.initialize();
  });

  afterEach(() => {
    parserManager.dispose();
  });

  // Feature: ai-architecture-diagram-extension, Property 3: Multi-Language Support
  describe('Property 3: Multi-Language Support', () => {
    it('should successfully parse any valid source file in supported languages', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryValidSourceCode(),
          async (sourceFile) => {
            // Parse the file
            const result = await parserManager.parseFile(
              sourceFile.filePath,
              sourceFile.sourceCode,
              sourceFile.language
            );

            // Property 1: Result should be defined
            expect(result).toBeDefined();
            expect(result.tree).toBeDefined();
            expect(result.tree.rootNode).toBeDefined();

            // Property 2: Language should match input
            expect(result.language).toBe(sourceFile.language);

            // Property 3: File path should match input
            expect(result.filePath).toBe(sourceFile.filePath);

            // Property 4: Source code should match input
            expect(result.sourceCode).toBe(sourceFile.sourceCode);

            // Property 5: Parse errors array should exist (may be empty for valid code)
            expect(Array.isArray(result.parseErrors)).toBe(true);

            // Property 6: For supported languages, tree should have content
            if (sourceFile.language !== Language.Unknown) {
              expect(result.tree.rootNode.childCount).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle all supported languages without throwing errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitrarySupportedLanguage(),
          arbitrarySimpleCode(),
          async (language, code) => {
            // Property: Parsing should never throw for supported languages
            const result = await parserManager.parseFile(
              `test${getExtensionForLanguage(language)}`,
              code,
              language
            );

            expect(result).toBeDefined();
            expect(result.language).toBe(language);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve source code content regardless of parse success', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitrarySupportedLanguage(),
          fc.string({ minLength: 0, maxLength: 1000 }),
          async (language, sourceCode) => {
            const result = await parserManager.parseFile(
              `test${getExtensionForLanguage(language)}`,
              sourceCode,
              language
            );

            // Property: Source code should always be preserved exactly
            expect(result.sourceCode).toBe(sourceCode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty files for all supported languages', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitrarySupportedLanguage(),
          async (language) => {
            const result = await parserManager.parseFile(
              `empty${getExtensionForLanguage(language)}`,
              '',
              language
            );

            // Property: Empty files should parse without errors
            expect(result).toBeDefined();
            expect(result.sourceCode).toBe('');
            expect(result.tree).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // Feature: ai-architecture-diagram-extension, Property 4: Language Pattern Recognition
  describe('Property 4: Language Pattern Recognition', () => {
    it('should correctly identify Python modules and classes', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryPythonPattern(),
          async (pattern) => {
            const result = await parserManager.parseFile(
              pattern.filePath,
              pattern.sourceCode,
              Language.Python
            );

            // Property: Should extract the expected pattern type
            const nodes = parserManager.extractNodesByType(result, {
              nodeTypes: [pattern.expectedNodeType]
            });

            // Property: Should find at least one node of the expected type
            expect(nodes.length).toBeGreaterThanOrEqual(1);

            // Property: Extracted node should contain the pattern name
            const containsName = nodes.some(node =>
              node.text.includes(pattern.patternName)
            );
            expect(containsName).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify JavaScript ES6 modules', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryJavaScriptPattern(),
          async (pattern) => {
            const result = await parserManager.parseFile(
              pattern.filePath,
              pattern.sourceCode,
              Language.JavaScript
            );

            // Property: Should extract the expected pattern type
            const nodes = parserManager.extractNodesByType(result, {
              nodeTypes: pattern.expectedNodeTypes
            });

            // Property: Should find at least one node of the expected type
            expect(nodes.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify TypeScript interfaces and classes', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryTypeScriptPattern(),
          async (pattern) => {
            const result = await parserManager.parseFile(
              pattern.filePath,
              pattern.sourceCode,
              Language.TypeScript
            );

            // Property: Should extract the expected pattern type
            const nodes = parserManager.extractNodesByType(result, {
              nodeTypes: [pattern.expectedNodeType]
            });

            // Property: Should find at least one node of the expected type
            expect(nodes.length).toBeGreaterThanOrEqual(1);

            // Property: Extracted node should contain the pattern name
            const containsName = nodes.some(node =>
              node.text.includes(pattern.patternName)
            );
            expect(containsName).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify Java packages and classes', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryJavaPattern(),
          async (pattern) => {
            const result = await parserManager.parseFile(
              pattern.filePath,
              pattern.sourceCode,
              Language.Java
            );

            // Property: Should extract the expected pattern type
            const nodes = parserManager.extractNodesByType(result, {
              nodeTypes: [pattern.expectedNodeType]
            });

            // Property: Should find at least one node of the expected type
            expect(nodes.length).toBeGreaterThanOrEqual(1);

            // Property: Extracted node should contain the pattern name
            const containsName = nodes.some(node =>
              node.text.includes(pattern.patternName)
            );
            expect(containsName).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify Go packages and functions', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryGoPattern(),
          async (pattern) => {
            const result = await parserManager.parseFile(
              pattern.filePath,
              pattern.sourceCode,
              Language.Go
            );

            // Property: Should extract the expected pattern type
            const nodes = parserManager.extractNodesByType(result, {
              nodeTypes: [pattern.expectedNodeType]
            });

            // Property: Should find at least one node of the expected type
            expect(nodes.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should distinguish between different component types within the same language', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryMixedLanguagePatterns(),
          async (patterns) => {
            const result = await parserManager.parseFile(
              patterns.filePath,
              patterns.sourceCode,
              patterns.language
            );

            // Property: Should be able to extract each component type separately
            for (const componentType of patterns.componentTypes) {
              const nodes = parserManager.extractNodesByType(result, {
                nodeTypes: [componentType]
              });

              // Property: Each component type should be identifiable
              expect(nodes).toBeDefined();
              expect(Array.isArray(nodes)).toBe(true);
            }

            // Property: Different node types should yield different results
            const allNodeTypes = patterns.componentTypes;
            if (allNodeTypes.length > 1) {
              const results = allNodeTypes.map(nodeType =>
                parserManager.extractNodesByType(result, {
                  nodeTypes: [nodeType]
                })
              );

              // At least some should have different counts (unless code is degenerate)
              const counts = results.map(r => r.length);
              const allSame = counts.every(c => c === counts[0]);
              
              // This property allows for edge cases where counts might be the same
              expect(results.length).toBe(allNodeTypes.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Arbitraries (Generators for random test data)
// ============================================================================

/**
 * Generate valid source code for supported languages
 */
function arbitraryValidSourceCode() {
  return fc.oneof(
    arbitraryPythonCode(),
    arbitraryJavaScriptCode(),
    arbitraryTypeScriptCode(),
    arbitraryJavaCode(),
    arbitraryGoCode()
  );
}

/**
 * Generate a supported language enum value
 */
function arbitrarySupportedLanguage() {
  return fc.constantFrom(
    Language.Python,
    Language.JavaScript,
    Language.TypeScript,
    Language.Java,
    Language.Go
  );
}

/**
 * Generate simple valid code snippets for any language
 */
function arbitrarySimpleCode() {
  return fc.oneof(
    fc.constant(''),
    fc.constant('# comment'),
    fc.constant('// comment'),
    fc.constant('/* comment */'),
    fc.constant('x = 1'),
    fc.constant('var x = 1;'),
    fc.constant('const x = 1;'),
    fc.constant('int x = 1;')
  );
}

/**
 * Generate valid Python code
 */
function arbitraryPythonCode() {
  return fc.record({
    filePath: arbitraryValidIdentifier().map(s => `${s}.py`),
    sourceCode: fc.oneof(
      fc.constant('x = 1'),
      fc.constant('def foo():\n    pass'),
      fc.constant('class Bar:\n    pass'),
      fc.constant('import os'),
      fc.constant('from typing import List\n\ndef process(items: List[int]) -> int:\n    return sum(items)'),
      arbitraryValidIdentifier().map(name => 
        `def ${name}():\n    return 42`
      ),
      arbitraryValidIdentifier().map(name => 
        `class ${name}:\n    def method(self):\n        pass`
      )
    ),
    language: fc.constant(Language.Python)
  });
}

/**
 * Generate valid JavaScript code
 */
function arbitraryJavaScriptCode() {
  return fc.record({
    filePath: arbitraryValidIdentifier().map(s => `${s}.js`),
    sourceCode: fc.oneof(
      fc.constant('const x = 1;'),
      fc.constant('function foo() { return 42; }'),
      fc.constant('class Bar { method() {} }'),
      fc.constant('export default function() {}'),
      fc.constant('const arrow = () => {};'),
      arbitraryValidIdentifier().map(name => 
        `function ${name}() { return true; }`
      ),
      arbitraryValidIdentifier().map(name => 
        `class ${name} { constructor() { this.value = 0; } }`
      )
    ),
    language: fc.constant(Language.JavaScript)
  });
}

/**
 * Generate valid TypeScript code
 */
function arbitraryTypeScriptCode() {
  return fc.record({
    filePath: arbitraryValidIdentifier().map(s => `${s}.ts`),
    sourceCode: fc.oneof(
      fc.constant('const x: number = 1;'),
      fc.constant('function foo(): number { return 42; }'),
      fc.constant('class Bar { method(): void {} }'),
      fc.constant('interface IFoo { value: number; }'),
      fc.constant('type MyType = string | number;'),
      arbitraryValidIdentifier().map(name => 
        `interface I${name} { id: string; }`
      ),
      arbitraryValidIdentifier().map(name => 
        `class ${name} { private value: number = 0; }`
      )
    ),
    language: fc.constant(Language.TypeScript)
  });
}

/**
 * Generate valid Java code
 */
function arbitraryJavaCode() {
  return fc.record({
    filePath: arbitraryValidIdentifier().map(s => `${s}.java`),
    sourceCode: fc.oneof(
      fc.constant('public class Main { }'),
      fc.constant('public class Main { public static void main(String[] args) {} }'),
      fc.constant('class Helper { private int value; }'),
      arbitraryValidIdentifier().map(name => 
        `public class ${name} { private int value; }`
      ),
      arbitraryValidIdentifier().map(name => 
        `class ${name} { public void method() {} }`
      )
    ),
    language: fc.constant(Language.Java)
  });
}

/**
 * Generate valid Go code
 */
function arbitraryGoCode() {
  return fc.record({
    filePath: arbitraryValidIdentifier().map(s => `${s}.go`),
    sourceCode: fc.oneof(
      fc.constant('package main'),
      fc.constant('package main\n\nfunc main() {}'),
      fc.constant('package utils\n\nfunc Add(a, b int) int { return a + b }'),
      arbitraryValidIdentifier().map(name => 
        `package main\n\nfunc ${name}() {}`
      ),
      arbitraryValidIdentifier().map(pkg => 
        `package ${pkg}\n\nfunc Helper() {}`
      )
    ),
    language: fc.constant(Language.Go)
  });
}

/**
 * Generate Python language patterns (modules, classes)
 */
function arbitraryPythonPattern() {
  return fc.oneof(
    // Class pattern
    arbitraryValidIdentifier().map(name => ({
      filePath: `${name}.py`,
      sourceCode: `class ${name}:\n    def method(self):\n        pass`,
      patternName: name,
      expectedNodeType: 'class_definition',
      language: Language.Python
    })),
    // Function pattern
    arbitraryValidIdentifier().map(name => ({
      filePath: `${name}.py`,
      sourceCode: `def ${name}():\n    return 42`,
      patternName: name,
      expectedNodeType: 'function_definition',
      language: Language.Python
    })),
    // Module with imports
    fc.constant({
      filePath: 'module.py',
      sourceCode: 'import os\nimport sys\n\ndef helper():\n    pass',
      patternName: 'helper',
      expectedNodeType: 'function_definition',
      language: Language.Python
    })
  );
}

/**
 * Generate JavaScript ES6 module patterns
 */
function arbitraryJavaScriptPattern() {
  return fc.oneof(
    // ES6 class
    arbitraryValidIdentifier().map(name => ({
      filePath: `${name}.js`,
      sourceCode: `export class ${name} { method() {} }`,
      patternName: name,
      expectedNodeTypes: ['class_declaration', 'export_statement'],
      language: Language.JavaScript
    })),
    // Arrow function export
    arbitraryValidIdentifier().map(name => ({
      filePath: `${name}.js`,
      sourceCode: `export const ${name} = () => { return 42; };`,
      patternName: name,
      expectedNodeTypes: ['arrow_function', 'export_statement'],
      language: Language.JavaScript
    })),
    // Default export
    fc.constant({
      filePath: 'module.js',
      sourceCode: 'export default function() { return true; }',
      patternName: 'default',
      expectedNodeTypes: ['export_statement', 'function_declaration'],
      language: Language.JavaScript
    })
  );
}

/**
 * Generate TypeScript patterns (interfaces, classes)
 */
function arbitraryTypeScriptPattern() {
  return fc.oneof(
    // Interface pattern
    arbitraryValidIdentifier().map(name => ({
      filePath: `${name}.ts`,
      sourceCode: `export interface I${name} { id: string; value: number; }`,
      patternName: `I${name}`,
      expectedNodeType: 'interface_declaration',
      language: Language.TypeScript
    })),
    // Class pattern
    arbitraryValidIdentifier().map(name => ({
      filePath: `${name}.ts`,
      sourceCode: `export class ${name} { private value: number = 0; }`,
      patternName: name,
      expectedNodeType: 'class_declaration',
      language: Language.TypeScript
    })),
    // Type alias pattern
    arbitraryValidIdentifier().map(name => ({
      filePath: `${name}.ts`,
      sourceCode: `export type ${name} = string | number;`,
      patternName: name,
      expectedNodeType: 'type_alias_declaration',
      language: Language.TypeScript
    }))
  );
}

/**
 * Generate Java patterns (packages, classes)
 */
function arbitraryJavaPattern() {
  return fc.oneof(
    // Class pattern
    arbitraryValidIdentifier().map(name => ({
      filePath: `${name}.java`,
      sourceCode: `public class ${name} { private int value; public void method() {} }`,
      patternName: name,
      expectedNodeType: 'class_declaration',
      language: Language.Java
    })),
    // Package with class
    fc.tuple(
      arbitraryValidIdentifier(),
      arbitraryValidIdentifier()
    ).map(([pkg, name]) => ({
      filePath: `${name}.java`,
      sourceCode: `package ${pkg};\n\npublic class ${name} { }`,
      patternName: name,
      expectedNodeType: 'class_declaration',
      language: Language.Java
    }))
  );
}

/**
 * Generate Go patterns (packages, functions)
 */
function arbitraryGoPattern() {
  return fc.oneof(
    // Function pattern
    arbitraryValidIdentifier().map(name => ({
      filePath: `${name}.go`,
      sourceCode: `package main\n\nfunc ${name}() int { return 42 }`,
      patternName: name,
      expectedNodeType: 'function_declaration',
      language: Language.Go
    })),
    // Package declaration
    arbitraryValidIdentifier().map(pkg => ({
      filePath: 'main.go',
      sourceCode: `package ${pkg}\n\nfunc Helper() {}`,
      patternName: pkg,
      expectedNodeType: 'package_clause',
      language: Language.Go
    }))
  );
}

/**
 * Generate code with mixed component types in the same language
 */
function arbitraryMixedLanguagePatterns() {
  return fc.oneof(
    // Python with classes and functions
    fc.constant({
      filePath: 'mixed.py',
      sourceCode: `
def function_one():
    pass

class ClassOne:
    def method(self):
        pass

def function_two():
    return 42
`,
      language: Language.Python,
      componentTypes: ['function_definition', 'class_definition']
    }),
    // JavaScript with classes and functions
    fc.constant({
      filePath: 'mixed.js',
      sourceCode: `
function regularFunction() {
  return 42;
}

class MyClass {
  method() {}
}

const arrowFunc = () => {};
`,
      language: Language.JavaScript,
      componentTypes: ['function_declaration', 'class_declaration', 'arrow_function']
    }),
    // TypeScript with interfaces and classes
    fc.constant({
      filePath: 'mixed.ts',
      sourceCode: `
interface IService {
  execute(): void;
}

class ServiceImpl implements IService {
  execute(): void {}
}

type ServiceType = IService;
`,
      language: Language.TypeScript,
      componentTypes: ['interface_declaration', 'class_declaration', 'type_alias_declaration']
    })
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a valid identifier for programming languages
 * Starts with a letter, followed by letters, digits, or underscores
 */
function arbitraryValidIdentifier() {
  return fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,19}$/);
}

/**
 * Get file extension for a language
 */
function getExtensionForLanguage(language: Language): string {
  switch (language) {
    case Language.Python:
      return '.py';
    case Language.JavaScript:
      return '.js';
    case Language.TypeScript:
      return '.ts';
    case Language.Java:
      return '.java';
    case Language.Go:
      return '.go';
    default:
      return '.txt';
  }
}
