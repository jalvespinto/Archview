/**
 * Property-based tests for ComponentExtractor
 * **Validates: Requirements 1.2**
 * 
 * Tests that ComponentExtractor identifies all architectural components
 * including modules, classes, services, and packages
 */

import * as fc from 'fast-check';
import { ComponentExtractor, ExtractionContext } from '../ComponentExtractor';
import { ParserManager } from '../ParserManager';
import { Language, ComponentType } from '../../types';

describe('ComponentExtractor Property-Based Tests', () => {
  let extractor: ComponentExtractor;
  let parserManager: ParserManager;

  beforeEach(async () => {
    extractor = new ComponentExtractor();
    parserManager = new ParserManager();
    await parserManager.initialize();
    extractor.resetIdCounter();
  });

  afterEach(() => {
    parserManager.dispose();
  });

  // Property 1: Component Detection Completeness
  // **Validates: Requirements 1.2**
  describe('Property 1: Component Detection Completeness', () => {
    it('should identify all components of supported types in Python code', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryPythonCodeWithComponents(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.py',
              codeSpec.sourceCode,
              Language.Python
            );

            const context: ExtractionContext = {
              rootPath: '/test',
              filePath: '/test/module.py',
              ast,
              parserManager
            };

            const result = await extractor.extractComponents(context);

            // Property: All expected classes should be detected
            for (const expectedClass of codeSpec.expectedClasses) {
              const found = result.components.some(
                c => c.type === ComponentType.Class && c.name === expectedClass
              );
              expect(found).toBe(true);
            }

            // Property: All expected functions should be detected
            for (const expectedFunc of codeSpec.expectedFunctions) {
              const found = result.components.some(
                c => c.type === ComponentType.Function && 
                (c.name === expectedFunc || c.name.endsWith(`.${expectedFunc}`))
              );
              expect(found).toBe(true);
            }

            // Property: Module component should always exist
            const moduleComponent = result.components.find(
              c => c.type === ComponentType.Module
            );
            expect(moduleComponent).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should identify all components of supported types in TypeScript code', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryTypeScriptCodeWithComponents(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.ts',
              codeSpec.sourceCode,
              Language.TypeScript
            );

            const context: ExtractionContext = {
              rootPath: '/test',
              filePath: '/test/module.ts',
              ast,
              parserManager
            };

            const result = await extractor.extractComponents(context);

            // Property: All expected classes should be detected
            for (const expectedClass of codeSpec.expectedClasses) {
              const found = result.components.some(
                c => c.type === ComponentType.Class && c.name === expectedClass
              );
              expect(found).toBe(true);
            }

            // Property: All expected interfaces should be detected
            for (const expectedInterface of codeSpec.expectedInterfaces) {
              const found = result.components.some(
                c => c.type === ComponentType.Interface && c.name === expectedInterface
              );
              expect(found).toBe(true);
            }

            // Property: All expected functions should be detected
            for (const expectedFunc of codeSpec.expectedFunctions) {
              const found = result.components.some(
                c => c.type === ComponentType.Function && 
                (c.name === expectedFunc || c.name.endsWith(`.${expectedFunc}`))
              );
              expect(found).toBe(true);
            }

            // Property: Module component should always exist
            const moduleComponent = result.components.find(
              c => c.type === ComponentType.Module
            );
            expect(moduleComponent).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should identify all components of supported types in Java code', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryJavaCodeWithComponents(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/Module.java',
              codeSpec.sourceCode,
              Language.Java
            );

            const context: ExtractionContext = {
              rootPath: '/test',
              filePath: '/test/Module.java',
              ast,
              parserManager
            };

            const result = await extractor.extractComponents(context);

            // Property: Package component should exist
            const packageComponent = result.components.find(
              c => c.type === ComponentType.Package
            );
            expect(packageComponent).toBeDefined();

            // Property: All expected classes should be detected
            for (const expectedClass of codeSpec.expectedClasses) {
              const found = result.components.some(
                c => c.type === ComponentType.Class && c.name === expectedClass
              );
              expect(found).toBe(true);
            }

            // Property: All expected interfaces should be detected
            for (const expectedInterface of codeSpec.expectedInterfaces) {
              const found = result.components.some(
                c => c.type === ComponentType.Interface && c.name === expectedInterface
              );
              expect(found).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should identify all components of supported types in Go code', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryGoCodeWithComponents(),
          async (codeSpec) => {
            const ast = await parserManager.parseFile(
              '/test/module.go',
              codeSpec.sourceCode,
              Language.Go
            );

            const context: ExtractionContext = {
              rootPath: '/test',
              filePath: '/test/module.go',
              ast,
              parserManager
            };

            const result = await extractor.extractComponents(context);

            // Property: Package component should exist
            const packageComponent = result.components.find(
              c => c.type === ComponentType.Package
            );
            expect(packageComponent).toBeDefined();

            // Property: All expected structs (as classes) should be detected
            for (const expectedStruct of codeSpec.expectedStructs) {
              const found = result.components.some(
                c => c.type === ComponentType.Class && c.name === expectedStruct
              );
              expect(found).toBe(true);
            }

            // Property: All expected functions should be detected
            for (const expectedFunc of codeSpec.expectedFunctions) {
              const found = result.components.some(
                c => c.type === ComponentType.Function && 
                (c.name === expectedFunc || c.name.endsWith(`.${expectedFunc}`))
              );
              expect(found).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Arbitraries (Generators for synthetic code with known components)
// ============================================================================

interface PythonCodeSpec {
  sourceCode: string;
  expectedClasses: string[];
  expectedFunctions: string[];
}

interface TypeScriptCodeSpec {
  sourceCode: string;
  expectedClasses: string[];
  expectedInterfaces: string[];
  expectedFunctions: string[];
}

interface JavaCodeSpec {
  sourceCode: string;
  expectedClasses: string[];
  expectedInterfaces: string[];
}

interface GoCodeSpec {
  sourceCode: string;
  expectedStructs: string[];
  expectedFunctions: string[];
}

/**
 * Generate Python code with known components
 */
function arbitraryPythonCodeWithComponents(): fc.Arbitrary<PythonCodeSpec> {
  return fc.record({
    classes: fc.array(
      fc.record({
        name: fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
        methods: fc.array(
          fc.stringMatching(/^[a-z_][a-z0-9_]*$/),
          { minLength: 0, maxLength: 3 }
        )
      }),
      { minLength: 0, maxLength: 3 }
    ),
    functions: fc.array(
      fc.stringMatching(/^[a-z_][a-z0-9_]*$/),
      { minLength: 0, maxLength: 3 }
    )
  }).map(spec => {
    const lines: string[] = [];
    const expectedClasses: string[] = [];
    const expectedFunctions: string[] = [];

    // Generate classes
    for (const cls of spec.classes) {
      expectedClasses.push(cls.name);
      lines.push(`class ${cls.name}:`);
      
      if (cls.methods.length === 0) {
        lines.push('    pass');
      } else {
        for (const method of cls.methods) {
          expectedFunctions.push(method);
          lines.push(`    def ${method}(self):`);
          lines.push('        pass');
        }
      }
      lines.push('');
    }

    // Generate top-level functions
    for (const func of spec.functions) {
      expectedFunctions.push(func);
      lines.push(`def ${func}():`);
      lines.push('    pass');
      lines.push('');
    }

    return {
      sourceCode: lines.join('\n'),
      expectedClasses,
      expectedFunctions
    };
  });
}

/**
 * Generate TypeScript code with known components
 */
function arbitraryTypeScriptCodeWithComponents(): fc.Arbitrary<TypeScriptCodeSpec> {
  return fc.record({
    classes: fc.array(
      fc.record({
        name: fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
        methods: fc.array(
          fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
          { minLength: 0, maxLength: 3 }
        )
      }),
      { minLength: 0, maxLength: 3 }
    ),
    interfaces: fc.array(
      fc.stringMatching(/^I[A-Z][a-zA-Z0-9]*$/),
      { minLength: 0, maxLength: 3 }
    ),
    functions: fc.array(
      fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
      { minLength: 0, maxLength: 3 }
    )
  }).map(spec => {
    const lines: string[] = [];
    const expectedClasses: string[] = [];
    const expectedInterfaces: string[] = [];
    const expectedFunctions: string[] = [];

    // Generate interfaces
    for (const iface of spec.interfaces) {
      expectedInterfaces.push(iface);
      lines.push(`interface ${iface} {`);
      lines.push('  id: number;');
      lines.push('}');
      lines.push('');
    }

    // Generate classes
    for (const cls of spec.classes) {
      expectedClasses.push(cls.name);
      lines.push(`class ${cls.name} {`);
      
      if (cls.methods.length === 0) {
        lines.push('  constructor() {}');
      } else {
        for (const method of cls.methods) {
          expectedFunctions.push(method);
          lines.push(`  ${method}() {`);
          lines.push('    return true;');
          lines.push('  }');
        }
      }
      lines.push('}');
      lines.push('');
    }

    // Generate top-level functions
    for (const func of spec.functions) {
      expectedFunctions.push(func);
      lines.push(`function ${func}() {`);
      lines.push('  return true;');
      lines.push('}');
      lines.push('');
    }

    return {
      sourceCode: lines.join('\n'),
      expectedClasses,
      expectedInterfaces,
      expectedFunctions
    };
  });
}

/**
 * Generate Java code with known components
 */
function arbitraryJavaCodeWithComponents(): fc.Arbitrary<JavaCodeSpec> {
  return fc.record({
    packageName: fc.constantFrom('com.example', 'org.test', 'io.app'),
    classes: fc.array(
      fc.record({
        name: fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
        methods: fc.array(
          fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
          { minLength: 0, maxLength: 2 }
        )
      }),
      { minLength: 1, maxLength: 2 }
    ),
    interfaces: fc.array(
      fc.stringMatching(/^I[A-Z][a-zA-Z0-9]*$/),
      { minLength: 0, maxLength: 2 }
    )
  }).map(spec => {
    const lines: string[] = [];
    const expectedClasses: string[] = [];
    const expectedInterfaces: string[] = [];

    // Package declaration
    lines.push(`package ${spec.packageName};`);
    lines.push('');

    // Generate interfaces
    for (const iface of spec.interfaces) {
      expectedInterfaces.push(iface);
      lines.push(`public interface ${iface} {`);
      lines.push('  void execute();');
      lines.push('}');
      lines.push('');
    }

    // Generate classes
    for (const cls of spec.classes) {
      expectedClasses.push(cls.name);
      lines.push(`public class ${cls.name} {`);
      
      if (cls.methods.length === 0) {
        lines.push('  public void dummy() {}');
      } else {
        for (const method of cls.methods) {
          lines.push(`  public void ${method}() {`);
          lines.push('    return;');
          lines.push('  }');
        }
      }
      lines.push('}');
      lines.push('');
    }

    return {
      sourceCode: lines.join('\n'),
      expectedClasses,
      expectedInterfaces
    };
  });
}

/**
 * Generate Go code with known components
 */
function arbitraryGoCodeWithComponents(): fc.Arbitrary<GoCodeSpec> {
  return fc.record({
    packageName: fc.constantFrom('main', 'utils', 'service', 'handler'),
    structs: fc.array(
      fc.record({
        name: fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
        methods: fc.array(
          fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
          { minLength: 0, maxLength: 2 }
        )
      }),
      { minLength: 0, maxLength: 2 }
    ),
    functions: fc.array(
      fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
      { minLength: 0, maxLength: 2 }
    )
  }).map(spec => {
    const lines: string[] = [];
    const expectedStructs: string[] = [];
    const expectedFunctions: string[] = [];

    // Package declaration
    lines.push(`package ${spec.packageName}`);
    lines.push('');

    // Generate structs
    for (const struct of spec.structs) {
      expectedStructs.push(struct.name);
      lines.push(`type ${struct.name} struct {`);
      lines.push('  value int');
      lines.push('}');
      lines.push('');

      // Generate methods for struct
      for (const method of struct.methods) {
        expectedFunctions.push(method);
        lines.push(`func (s *${struct.name}) ${method}() {`);
        lines.push('  return');
        lines.push('}');
        lines.push('');
      }
    }

    // Generate top-level functions
    for (const func of spec.functions) {
      expectedFunctions.push(func);
      lines.push(`func ${func}() {`);
      lines.push('  return');
      lines.push('}');
      lines.push('');
    }

    return {
      sourceCode: lines.join('\n'),
      expectedStructs,
      expectedFunctions
    };
  });
}
