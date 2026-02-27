/**
 * Property-based tests for RelationshipExtractor
 * **Validates: Requirements 1.3**
 * 
 * Property 2: Relationship Detection Completeness
 * For any codebase with relationships between components (dependencies, imports,
 * function calls, inheritance), the AI_Analyzer should detect and include all
 * relationships in the analysis result.
 */

import * as fc from 'fast-check';
import { RelationshipExtractor, RelationshipExtractionContext } from '../RelationshipExtractor';
import { ParserManager } from '../ParserManager';
import { Language, ComponentType, RelationshipType, Component, AbstractionLevel } from '../../types';

describe('RelationshipExtractor Property-Based Tests', () => {
  let extractor: RelationshipExtractor;
  let parserManager: ParserManager;

  beforeEach(async () => {
    extractor = new RelationshipExtractor();
    parserManager = new ParserManager();
    await parserManager.initialize();
    extractor.resetIdCounter();
  });

  afterEach(() => {
    parserManager.dispose();
  });

  // Property 2: Relationship Detection Completeness
  // **Validates: Requirements 1.3**
  describe('Property 2: Relationship Detection Completeness', () => {
    it('should detect import relationships when they exist in Python code', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryPythonCodeWithImports(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.py',
              codeSpec.sourceCode,
              Language.Python
            );

            const context: RelationshipExtractionContext = {
              ast,
              components: codeSpec.components,
              parserManager
            };

            const relationships = await extractor.extractRelationships(context);

            // Property: If imports exist in code, import relationships should be detected
            const importRels = relationships.filter(r => r.type === RelationshipType.Import);
            if (codeSpec.expectedImportCount > 0) {
              expect(importRels.length).toBeGreaterThan(0);
            }
            
            // Property: All detected relationships should have valid source and target
            for (const rel of importRels) {
              expect(rel.source).toBeDefined();
              expect(rel.target).toBeDefined();
              expect(rel.source).not.toBe(rel.target);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect inheritance relationships when they exist in Python code', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryPythonCodeWithInheritance(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.py',
              codeSpec.sourceCode,
              Language.Python
            );

            const context: RelationshipExtractionContext = {
              ast,
              components: codeSpec.components,
              parserManager
            };

            const relationships = await extractor.extractRelationships(context);

            // Property: If inheritance exists in code, inheritance relationships should be detected
            const inheritanceRels = relationships.filter(r => r.type === RelationshipType.Inheritance);
            if (codeSpec.expectedInheritanceCount > 0) {
              expect(inheritanceRels.length).toBeGreaterThan(0);
            }
            
            // Property: All detected relationships should have valid source and target
            for (const rel of inheritanceRels) {
              expect(rel.source).toBeDefined();
              expect(rel.target).toBeDefined();
              expect(rel.source).not.toBe(rel.target);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect function call relationships when they exist in Python code', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryPythonCodeWithFunctionCalls(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.py',
              codeSpec.sourceCode,
              Language.Python
            );

            const context: RelationshipExtractionContext = {
              ast,
              components: codeSpec.components,
              parserManager
            };

            const relationships = await extractor.extractRelationships(context);

            // Property: If function calls exist in code, call relationships should be detected
            const callRels = relationships.filter(r => r.type === RelationshipType.FunctionCall);
            if (codeSpec.expectedCallCount > 0) {
              expect(callRels.length).toBeGreaterThan(0);
            }

            // Property: All detected relationships should have valid source and target
            for (const rel of callRels) {
              expect(rel.source).toBeDefined();
              expect(rel.target).toBeDefined();
              expect(rel.source).not.toBe(rel.target);
            }
            
            // Property: Occurrence counts should be positive
            for (const rel of callRels) {
              expect(rel.metadata.occurrences).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect import relationships when they exist in JavaScript code', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryJavaScriptCodeWithImports(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.js',
              codeSpec.sourceCode,
              Language.JavaScript
            );

            const context: RelationshipExtractionContext = {
              ast,
              components: codeSpec.components,
              parserManager
            };

            const relationships = await extractor.extractRelationships(context);

            // Property: If imports exist in code, import relationships should be detected
            const importRels = relationships.filter(r => r.type === RelationshipType.Import);
            if (codeSpec.expectedImportCount > 0) {
              expect(importRels.length).toBeGreaterThan(0);
            }
            
            // Property: All detected relationships should have valid source and target
            for (const rel of importRels) {
              expect(rel.source).toBeDefined();
              expect(rel.target).toBeDefined();
              expect(rel.source).not.toBe(rel.target);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect inheritance relationships when they exist in JavaScript code', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryJavaScriptCodeWithInheritance(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.js',
              codeSpec.sourceCode,
              Language.JavaScript
            );

            const context: RelationshipExtractionContext = {
              ast,
              components: codeSpec.components,
              parserManager
            };

            const relationships = await extractor.extractRelationships(context);

            // Property: If inheritance exists in code, inheritance relationships should be detected
            const inheritanceRels = relationships.filter(r => r.type === RelationshipType.Inheritance);
            if (codeSpec.expectedInheritanceCount > 0) {
              expect(inheritanceRels.length).toBeGreaterThan(0);
            }
            
            // Property: All detected relationships should have valid source and target
            for (const rel of inheritanceRels) {
              expect(rel.source).toBeDefined();
              expect(rel.target).toBeDefined();
              expect(rel.source).not.toBe(rel.target);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect function call relationships when they exist in JavaScript code', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryJavaScriptCodeWithFunctionCalls(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.js',
              codeSpec.sourceCode,
              Language.JavaScript
            );

            const context: RelationshipExtractionContext = {
              ast,
              components: codeSpec.components,
              parserManager
            };

            const relationships = await extractor.extractRelationships(context);

            // Property: If function calls exist in code, call relationships should be detected
            const callRels = relationships.filter(r => r.type === RelationshipType.FunctionCall);
            if (codeSpec.expectedCallCount > 0) {
              expect(callRels.length).toBeGreaterThan(0);
            }

            // Property: All detected relationships should have valid source and target
            for (const rel of callRels) {
              expect(rel.source).toBeDefined();
              expect(rel.target).toBeDefined();
              expect(rel.source).not.toBe(rel.target);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate relationship strength between 0 and 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryPythonCodeWithFunctionCalls(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.py',
              codeSpec.sourceCode,
              Language.Python
            );

            const context: RelationshipExtractionContext = {
              ast,
              components: codeSpec.components,
              parserManager
            };

            const relationships = await extractor.extractRelationships(context);

            // Property: All relationships should have strength between 0 and 1
            for (const rel of relationships) {
              expect(rel.strength).toBeGreaterThanOrEqual(0);
              expect(rel.strength).toBeLessThanOrEqual(1);
            }

            // Property: Higher occurrence count should result in equal or higher strength
            const callRels = relationships.filter(r => r.type === RelationshipType.FunctionCall);
            if (callRels.length >= 2) {
              const sorted = [...callRels].sort((a, b) => 
                a.metadata.occurrences - b.metadata.occurrences
              );
              for (let i = 0; i < sorted.length - 1; i++) {
                if (sorted[i].metadata.occurrences < sorted[i + 1].metadata.occurrences) {
                  expect(sorted[i].strength).toBeLessThanOrEqual(sorted[i + 1].strength);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never create self-referencing relationships', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryPythonCodeWithFunctionCalls(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.py',
              codeSpec.sourceCode,
              Language.Python
            );

            const context: RelationshipExtractionContext = {
              ast,
              components: codeSpec.components,
              parserManager
            };

            const relationships = await extractor.extractRelationships(context);

            // Property: No relationship should have source === target
            for (const rel of relationships) {
              expect(rel.source).not.toBe(rel.target);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign unique IDs to all relationships', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryPythonCodeWithFunctionCalls(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.py',
              codeSpec.sourceCode,
              Language.Python
            );

            const context: RelationshipExtractionContext = {
              ast,
              components: codeSpec.components,
              parserManager
            };

            const relationships = await extractor.extractRelationships(context);

            // Property: All relationship IDs should be unique
            const ids = relationships.map(r => r.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Arbitraries (Generators for synthetic code with known relationships)
// ============================================================================

interface PythonCodeWithImports {
  sourceCode: string;
  components: Component[];
  expectedImportCount: number;
}

interface PythonCodeWithInheritance {
  sourceCode: string;
  components: Component[];
  expectedInheritanceCount: number;
}

interface PythonCodeWithFunctionCalls {
  sourceCode: string;
  components: Component[];
  expectedCallCount: number;
}

interface JavaScriptCodeWithImports {
  sourceCode: string;
  components: Component[];
  expectedImportCount: number;
}

interface JavaScriptCodeWithInheritance {
  sourceCode: string;
  components: Component[];
  expectedInheritanceCount: number;
}

interface JavaScriptCodeWithFunctionCalls {
  sourceCode: string;
  components: Component[];
  expectedCallCount: number;
}

/**
 * Generate Python code with import relationships
 */
function arbitraryPythonCodeWithImports(): fc.Arbitrary<PythonCodeWithImports> {
  return fc.record({
    imports: fc.array(
      fc.stringMatching(/^[a-z_][a-z0-9_]*$/),
      { minLength: 1, maxLength: 4 }
    )
  }).filter(spec => {
    // Ensure unique import names
    const uniqueNames = new Set(spec.imports);
    return uniqueNames.size === spec.imports.length;
  }).map(spec => {
    const lines: string[] = [];
    const components: Component[] = [];

    // Create source module component
    components.push({
      id: 'comp_source',
      name: 'test_module',
      type: ComponentType.Module,
      language: Language.Python,
      filePaths: ['/test/module.py'],
      children: [],
      parent: null,
      abstractionLevel: AbstractionLevel.Overview,
      metadata: { lineCount: spec.imports.length, exportedSymbols: [] }
    });

    // Create target module components and import statements
    spec.imports.forEach((moduleName, idx) => {
      components.push({
        id: `comp_${idx}`,
        name: moduleName,
        type: ComponentType.Module,
        language: Language.Python,
        filePaths: [`/test/${moduleName}.py`],
        children: [],
        parent: null,
        abstractionLevel: AbstractionLevel.Overview,
        metadata: { lineCount: 10, exportedSymbols: [] }
      });

      lines.push(`import ${moduleName}`);
    });

    return {
      sourceCode: lines.join('\n'),
      components,
      expectedImportCount: spec.imports.length
    };
  });
}

/**
 * Generate Python code with inheritance relationships
 */
function arbitraryPythonCodeWithInheritance(): fc.Arbitrary<PythonCodeWithInheritance> {
  return fc.record({
    baseClass: fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
    derivedClasses: fc.array(
      fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
      { minLength: 1, maxLength: 3 }
    )
  }).filter(spec => {
    // Ensure derived classes don't duplicate base class name
    const allNames = [spec.baseClass, ...spec.derivedClasses];
    const uniqueNames = new Set(allNames);
    return uniqueNames.size === allNames.length;
  }).map(spec => {
    const lines: string[] = [];
    const components: Component[] = [];

    // Create module component
    const allClasses = [spec.baseClass, ...spec.derivedClasses];
    components.push({
      id: 'comp_module',
      name: 'test_module',
      type: ComponentType.Module,
      language: Language.Python,
      filePaths: ['/test/module.py'],
      children: allClasses.map((_, idx) => `comp_${idx}`),
      parent: null,
      abstractionLevel: AbstractionLevel.Overview,
      metadata: { lineCount: allClasses.length * 3, exportedSymbols: [] }
    });

    // Create base class
    components.push({
      id: 'comp_0',
      name: spec.baseClass,
      type: ComponentType.Class,
      language: Language.Python,
      filePaths: ['/test/module.py'],
      children: [],
      parent: 'comp_module',
      abstractionLevel: AbstractionLevel.Module,
      metadata: { lineCount: 2, exportedSymbols: [] }
    });

    lines.push(`class ${spec.baseClass}:`);
    lines.push('    pass');
    lines.push('');

    // Create derived classes
    spec.derivedClasses.forEach((className, idx) => {
      components.push({
        id: `comp_${idx + 1}`,
        name: className,
        type: ComponentType.Class,
        language: Language.Python,
        filePaths: ['/test/module.py'],
        children: [],
        parent: 'comp_module',
        abstractionLevel: AbstractionLevel.Module,
        metadata: { lineCount: 2, exportedSymbols: [] }
      });

      lines.push(`class ${className}(${spec.baseClass}):`);
      lines.push('    pass');
      lines.push('');
    });

    return {
      sourceCode: lines.join('\n'),
      components,
      expectedInheritanceCount: spec.derivedClasses.length
    };
  });
}

/**
 * Generate Python code with function call relationships
 */
function arbitraryPythonCodeWithFunctionCalls(): fc.Arbitrary<PythonCodeWithFunctionCalls> {
  return fc.record({
    callee: fc.stringMatching(/^[a-z_][a-z0-9_]*$/),
    callers: fc.array(
      fc.record({
        name: fc.stringMatching(/^[a-z_][a-z0-9_]*$/),
        callCount: fc.integer({ min: 1, max: 5 })
      }),
      { minLength: 1, maxLength: 3 }
    )
  }).filter(spec => {
    // Ensure caller names don't duplicate callee name (avoid self-references)
    const allNames = [spec.callee, ...spec.callers.map(c => c.name)];
    const uniqueNames = new Set(allNames);
    return uniqueNames.size === allNames.length;
  }).map(spec => {
    const lines: string[] = [];
    const components: Component[] = [];

    // Create module component
    const allFunctions = [spec.callee, ...spec.callers.map(c => c.name)];
    components.push({
      id: 'comp_module',
      name: 'test_module',
      type: ComponentType.Module,
      language: Language.Python,
      filePaths: ['/test/module.py'],
      children: allFunctions.map((_, idx) => `comp_${idx}`),
      parent: null,
      abstractionLevel: AbstractionLevel.Overview,
      metadata: { lineCount: allFunctions.length * 3, exportedSymbols: [] }
    });

    // Create callee function
    components.push({
      id: 'comp_0',
      name: spec.callee,
      type: ComponentType.Function,
      language: Language.Python,
      filePaths: ['/test/module.py'],
      children: [],
      parent: 'comp_module',
      abstractionLevel: AbstractionLevel.Module,
      metadata: { lineCount: 2, exportedSymbols: [] }
    });

    lines.push(`def ${spec.callee}():`);
    lines.push('    pass');
    lines.push('');

    // Create caller functions
    spec.callers.forEach((caller, idx) => {
      components.push({
        id: `comp_${idx + 1}`,
        name: caller.name,
        type: ComponentType.Function,
        language: Language.Python,
        filePaths: ['/test/module.py'],
        children: [],
        parent: 'comp_module',
        abstractionLevel: AbstractionLevel.Module,
        metadata: { lineCount: caller.callCount + 2, exportedSymbols: [] }
      });

      lines.push(`def ${caller.name}():`);
      for (let i = 0; i < caller.callCount; i++) {
        lines.push(`    ${spec.callee}()`);
      }
      lines.push('');
    });

    return {
      sourceCode: lines.join('\n'),
      components,
      expectedCallCount: spec.callers.length
    };
  });
}

/**
 * Generate JavaScript code with import relationships
 */
function arbitraryJavaScriptCodeWithImports(): fc.Arbitrary<JavaScriptCodeWithImports> {
  return fc.record({
    imports: fc.array(
      fc.stringMatching(/^[a-z][a-z0-9]*$/),
      { minLength: 1, maxLength: 4 }
    )
  }).filter(spec => {
    // Ensure unique import names
    const uniqueNames = new Set(spec.imports);
    return uniqueNames.size === spec.imports.length;
  }).map(spec => {
    const lines: string[] = [];
    const components: Component[] = [];

    // Create source module component
    components.push({
      id: 'comp_source',
      name: 'test_module',
      type: ComponentType.Module,
      language: Language.JavaScript,
      filePaths: ['/test/module.js'],
      children: [],
      parent: null,
      abstractionLevel: AbstractionLevel.Overview,
      metadata: { lineCount: spec.imports.length, exportedSymbols: [] }
    });

    // Create target module components and import statements
    spec.imports.forEach((moduleName, idx) => {
      const importPath = `./${moduleName}`;
      
      components.push({
        id: `comp_${idx}`,
        name: importPath,
        type: ComponentType.Module,
        language: Language.JavaScript,
        filePaths: [`/test/${moduleName}.js`],
        children: [],
        parent: null,
        abstractionLevel: AbstractionLevel.Overview,
        metadata: { lineCount: 10, exportedSymbols: [] }
      });

      lines.push(`import ${moduleName} from '${importPath}';`);
    });

    return {
      sourceCode: lines.join('\n'),
      components,
      expectedImportCount: spec.imports.length
    };
  });
}

/**
 * Generate JavaScript code with inheritance relationships
 */
function arbitraryJavaScriptCodeWithInheritance(): fc.Arbitrary<JavaScriptCodeWithInheritance> {
  return fc.record({
    baseClass: fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
    derivedClasses: fc.array(
      fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
      { minLength: 1, maxLength: 3 }
    )
  }).filter(spec => {
    // Ensure derived classes don't duplicate base class name
    const allNames = [spec.baseClass, ...spec.derivedClasses];
    const uniqueNames = new Set(allNames);
    return uniqueNames.size === allNames.length;
  }).map(spec => {
    const lines: string[] = [];
    const components: Component[] = [];

    // Create module component
    const allClasses = [spec.baseClass, ...spec.derivedClasses];
    components.push({
      id: 'comp_module',
      name: 'test_module',
      type: ComponentType.Module,
      language: Language.JavaScript,
      filePaths: ['/test/module.js'],
      children: allClasses.map((_, idx) => `comp_${idx}`),
      parent: null,
      abstractionLevel: AbstractionLevel.Overview,
      metadata: { lineCount: allClasses.length * 4, exportedSymbols: [] }
    });

    // Create base class
    components.push({
      id: 'comp_0',
      name: spec.baseClass,
      type: ComponentType.Class,
      language: Language.JavaScript,
      filePaths: ['/test/module.js'],
      children: [],
      parent: 'comp_module',
      abstractionLevel: AbstractionLevel.Module,
      metadata: { lineCount: 3, exportedSymbols: [] }
    });

    lines.push(`class ${spec.baseClass} {`);
    lines.push('  constructor() {}');
    lines.push('}');
    lines.push('');

    // Create derived classes
    spec.derivedClasses.forEach((className, idx) => {
      components.push({
        id: `comp_${idx + 1}`,
        name: className,
        type: ComponentType.Class,
        language: Language.JavaScript,
        filePaths: ['/test/module.js'],
        children: [],
        parent: 'comp_module',
        abstractionLevel: AbstractionLevel.Module,
        metadata: { lineCount: 3, exportedSymbols: [] }
      });

      lines.push(`class ${className} extends ${spec.baseClass} {`);
      lines.push('  constructor() { super(); }');
      lines.push('}');
      lines.push('');
    });

    return {
      sourceCode: lines.join('\n'),
      components,
      expectedInheritanceCount: spec.derivedClasses.length
    };
  });
}

/**
 * Generate JavaScript code with function call relationships
 */
function arbitraryJavaScriptCodeWithFunctionCalls(): fc.Arbitrary<JavaScriptCodeWithFunctionCalls> {
  return fc.record({
    callee: fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
    callers: fc.array(
      fc.record({
        name: fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
        callCount: fc.integer({ min: 1, max: 5 })
      }),
      { minLength: 1, maxLength: 3 }
    )
  }).filter(spec => {
    // Ensure caller names don't duplicate callee name (avoid self-references)
    const allNames = [spec.callee, ...spec.callers.map(c => c.name)];
    const uniqueNames = new Set(allNames);
    return uniqueNames.size === allNames.length;
  }).map(spec => {
    const lines: string[] = [];
    const components: Component[] = [];

    // Create module component
    const allFunctions = [spec.callee, ...spec.callers.map(c => c.name)];
    components.push({
      id: 'comp_module',
      name: 'test_module',
      type: ComponentType.Module,
      language: Language.JavaScript,
      filePaths: ['/test/module.js'],
      children: allFunctions.map((_, idx) => `comp_${idx}`),
      parent: null,
      abstractionLevel: AbstractionLevel.Overview,
      metadata: { lineCount: allFunctions.length * 4, exportedSymbols: [] }
    });

    // Create callee function
    components.push({
      id: 'comp_0',
      name: spec.callee,
      type: ComponentType.Function,
      language: Language.JavaScript,
      filePaths: ['/test/module.js'],
      children: [],
      parent: 'comp_module',
      abstractionLevel: AbstractionLevel.Module,
      metadata: { lineCount: 3, exportedSymbols: [] }
    });

    lines.push(`function ${spec.callee}() {`);
    lines.push('  return true;');
    lines.push('}');
    lines.push('');

    // Create caller functions
    spec.callers.forEach((caller, idx) => {
      components.push({
        id: `comp_${idx + 1}`,
        name: caller.name,
        type: ComponentType.Function,
        language: Language.JavaScript,
        filePaths: ['/test/module.js'],
        children: [],
        parent: 'comp_module',
        abstractionLevel: AbstractionLevel.Module,
        metadata: { lineCount: caller.callCount + 3, exportedSymbols: [] }
      });

      lines.push(`function ${caller.name}() {`);
      for (let i = 0; i < caller.callCount; i++) {
        lines.push(`  ${spec.callee}();`);
      }
      lines.push('}');
      lines.push('');
    });

    return {
      sourceCode: lines.join('\n'),
      components,
      expectedCallCount: spec.callers.length
    };
  });
}
