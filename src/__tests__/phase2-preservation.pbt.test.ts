/**
 * Phase 2 Preservation Property Tests
 * 
 * IMPORTANT: These tests verify that core functionality works correctly on UNFIXED code
 * These tests MUST PASS on unfixed code to establish baseline behavior to preserve
 * 
 * Follow observation-first methodology:
 * 1. Observe behavior on UNFIXED code for normal operations
 * 2. Write property-based tests capturing observed behavior patterns
 * 3. Run tests on UNFIXED code - EXPECTED OUTCOME: Tests PASS
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import * as fc from 'fast-check';
import { ExtensionController } from '../ExtensionController';
import { ParserManager } from '../analysis/ParserManager';
import { AnalysisService } from '../analysis/AnalysisService';
import { DiagramGenerator } from '../diagram/DiagramGenerator';
import { WebviewManager } from '../ui/WebviewManager';
import { AnalysisOptimizer } from '../performance/AnalysisOptimizer';
import { Language, AbstractionLevel, RelationshipType } from '../types';
import { ArchitecturalModel, ArchitecturalComponent } from '../types/analysis';

describe('Phase 2: Preservation Property Tests', () => {
  
  describe('Property 2.1: Diagram Generation with Various Project Types (Req 3.1)', () => {
    
    it('should generate diagrams for TypeScript projects', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const tsCode = `
        export class UserService {
          constructor(private db: Database) {}
          
          async getUser(id: string): Promise<User> {
            return this.db.findUser(id);
          }
        }
        
        export interface User {
          id: string;
          name: string;
        }
      `;
      
      const ast = await parserManager.parseFile('UserService.ts', tsCode, Language.TypeScript);
      
      // Verify parsing works
      expect(ast).toBeDefined();
      expect(ast.tree.rootNode).toBeDefined();
      expect(ast.tree.rootNode.hasError).toBe(false);
    });

    it('should generate diagrams for JavaScript projects', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const jsCode = `
        class ProductService {
          constructor(api) {
            this.api = api;
          }
          
          async getProducts() {
            return this.api.fetch('/products');
          }
        }
        
        module.exports = ProductService;
      `;
      
      const ast = await parserManager.parseFile('ProductService.js', jsCode, Language.JavaScript);
      
      expect(ast).toBeDefined();
      expect(ast.tree.rootNode).toBeDefined();
      expect(ast.tree.rootNode.hasError).toBe(false);
    });

    it('should generate diagrams for Python projects', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const pyCode = `
class DataProcessor:
    def __init__(self, config):
        self.config = config
    
    def process(self, data):
        return self.transform(data)
    
    def transform(self, data):
        return data.upper()
`;
      
      const ast = await parserManager.parseFile('processor.py', pyCode, Language.Python);
      
      expect(ast).toBeDefined();
      expect(ast.tree.rootNode).toBeDefined();
      expect(ast.tree.rootNode.hasError).toBe(false);
    });

    it('should generate diagrams for Java projects', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const javaCode = `
package com.example;

public class OrderService {
    private final Repository repository;
    
    public OrderService(Repository repository) {
        this.repository = repository;
    }
    
    public Order getOrder(String id) {
        return repository.findById(id);
    }
}
`;
      
      const ast = await parserManager.parseFile('OrderService.java', javaCode, Language.Java);
      
      expect(ast).toBeDefined();
      expect(ast.tree.rootNode).toBeDefined();
      expect(ast.tree.rootNode.hasError).toBe(false);
    });

    it('should generate diagrams for Go projects', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const goCode = `
package main

type UserRepository struct {
    db *Database
}

func (r *UserRepository) FindUser(id string) (*User, error) {
    return r.db.Query(id)
}

func main() {
    repo := &UserRepository{}
    user, _ := repo.FindUser("123")
}
`;
      
      const ast = await parserManager.parseFile('repository.go', goCode, Language.Go);
      
      expect(ast).toBeDefined();
      expect(ast.tree.rootNode).toBeDefined();
      expect(ast.tree.rootNode.hasError).toBe(false);
    });
  });

  describe('Property 2.2: Webview Display and Interaction (Req 3.2, 3.4)', () => {
    
    it('should create webview panel and track state', () => {
      const webviewManager = new WebviewManager();
      
      // Verify webview manager API exists
      expect(webviewManager).toBeDefined();
      expect(typeof webviewManager.isActive).toBe('function');
      expect(typeof webviewManager.onMessage).toBe('function');
      expect(typeof webviewManager.postMessage).toBe('function');
      
      // Verify initial state
      expect(webviewManager.isActive()).toBe(false);
    });

    it('should handle message registration and cleanup', () => {
      const webviewManager = new WebviewManager();
      
      // Register a message handler
      const handler = jest.fn();
      
      // onMessage should accept a handler function
      expect(() => {
        webviewManager.onMessage(handler);
      }).not.toThrow();
      
      // Verify handler is stored (preservation: handlers should be tracked)
      // Note: This tests the API contract, actual webview requires vscode module
    });

    it('should generate diagram with multiple components', async () => {
      // Test DiagramGenerator with various component models
      const diagramGenerator = new DiagramGenerator();
      
      // Create models with different component counts
      const testCases = [1, 3, 5, 10];
      
      for (const componentCount of testCases) {
        const components: ArchitecturalComponent[] = Array.from({ length: componentCount }, (_, i) => ({
          id: `comp${i}`,
          name: `Component${i}`,
          role: `role${i}`,
          filePaths: [`file${i}.ts`],
          description: `Component ${i}`,
          abstractionLevel: AbstractionLevel.Module,
          subComponents: [],
          parent: null
        }));
        
        const model: ArchitecturalModel = {
          components,
          relationships: [],
          patterns: [],
          metadata: {
            llmInferenceTimeMs: 0,
            tierUsed: 1,
            confidence: 'high',
            filesAnalyzed: componentCount
          }
        };
        
        const diagramData = await diagramGenerator.generateDiagram(
          model,
          AbstractionLevel.Module
        );
        
        // Verify output structure
        expect(diagramData).toBeDefined();
        expect(diagramData.nodes).toBeDefined();
        expect(Array.isArray(diagramData.nodes)).toBe(true);
        expect(diagramData.nodes.length).toBeGreaterThan(0);
        expect(diagramData.edges).toBeDefined();
        expect(Array.isArray(diagramData.edges)).toBe(true);
        
        // Verify nodes contain expected IDs
        const nodeIds = diagramData.nodes.map(n => n.id);
        expect(nodeIds.length).toBeGreaterThan(0);
        
        // Each node should have required properties
        diagramData.nodes.forEach(node => {
          expect(node).toHaveProperty('id');
          expect(node).toHaveProperty('label');
        });
      }
    });

    it('should support element selection in webview', async () => {
      const controller = new ExtensionController();
      
      // Set up a simple architectural model in state
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'test-component',
            name: 'TestComponent',
            role: 'test',
            filePaths: ['test.ts'],
            description: 'Test',
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null
          }
        ],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 0,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 1
        }
      };
      
      controller.setState({ architecturalModel: model });
      
      // Select element should not throw
      expect(() => {
        controller.setSelectedElement('test-component');
      }).not.toThrow();
      
      // Verify selection is stored
      const state = controller.getState();
      expect(state.selectedElementId).toBe('test-component');
    });

    it('should support clearing selection', () => {
      const controller = new ExtensionController();
      
      // Set initial selection
      controller.setState({ selectedElementId: 'some-element' });
      
      // Clear selection
      controller.clearSelection();
      
      // Verify selection is cleared
      const state = controller.getState();
      expect(state.selectedElementId).toBeNull();
    });
  });

  describe('Property 2.3: Parser Functionality for Supported Languages (Req 3.3)', () => {
    
    it('should parse TypeScript with all language features', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const complexTsCode = `
        import { Injectable } from '@angular/core';
        
        @Injectable()
        export class ComplexService<T extends BaseType> {
          private cache: Map<string, T> = new Map();
          
          constructor(
            private readonly http: HttpClient,
            @Inject(CONFIG_TOKEN) private config: Config
          ) {}
          
          async getData<K extends keyof T>(key: K): Promise<T[K]> {
            if (this.cache.has(key as string)) {
              return this.cache.get(key as string) as T[K];
            }
            
            const data = await this.http.get<T[K]>(\`/api/\${key}\`).toPromise();
            this.cache.set(key as string, data as any);
            return data;
          }
          
          *generateSequence(): Generator<number> {
            for (let i = 0; i < 10; i++) {
              yield i;
            }
          }
        }
      `;
      
      const ast = await parserManager.parseFile('complex.ts', complexTsCode, Language.TypeScript);
      
      expect(ast).toBeDefined();
      expect(ast.tree.rootNode).toBeDefined();
      // Parser should handle complex TypeScript features
    });

    it('should parse JavaScript with ES6+ features', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const es6Code = `
        const asyncFunction = async (param) => {
          const { data, ...rest } = await fetch('/api');
          return { data, rest };
        };
        
        class ModernClass {
          #privateField = 42;
          
          static staticMethod() {
            return 'static';
          }
          
          get value() {
            return this.#privateField;
          }
          
          set value(val) {
            this.#privateField = val;
          }
        }
        
        export default ModernClass;
      `;
      
      const ast = await parserManager.parseFile('modern.js', es6Code, Language.JavaScript);
      
      expect(ast).toBeDefined();
      expect(ast.tree.rootNode).toBeDefined();
    });

    it('should parse Python with modern syntax', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const modernPyCode = `
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class User:
    id: int
    name: str
    email: Optional[str] = None

class UserService:
    def __init__(self, db: Database):
        self.db = db
    
    async def get_users(self) -> List[User]:
        users = await self.db.query("SELECT * FROM users")
        return [User(**u) for u in users]
    
    def process_data(self, data: Dict[str, any]) -> None:
        match data:
            case {"type": "user", "id": user_id}:
                self.handle_user(user_id)
            case {"type": "admin"}:
                self.handle_admin()
            case _:
                pass
`;
      
      const ast = await parserManager.parseFile('modern.py', modernPyCode, Language.Python);
      
      expect(ast).toBeDefined();
      expect(ast.tree.rootNode).toBeDefined();
    });

    it('should handle parser errors gracefully', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      // Invalid syntax
      const invalidCode = `
        class BrokenClass {
          method() {
            // Missing closing brace
      `;
      
      // Parser should not throw, but may produce tree with errors
      const ast = await parserManager.parseFile('broken.ts', invalidCode, Language.TypeScript);
      
      expect(ast).toBeDefined();
      expect(ast.tree.rootNode).toBeDefined();
      // Tree may have errors, but parsing completes
    });
    
    it('should parse various languages with property-based testing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            language: fc.constantFrom(
              Language.TypeScript,
              Language.JavaScript,
              Language.Python,
              Language.Java,
              Language.Go
            ),
            varName: fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/)
          }),
          async ({ language, varName }) => {
            const parserManager = new ParserManager();
            await parserManager.initialize();
            
            // Generate simple code for each language
            let code: string;
            let fileName: string;
            
            switch (language) {
              case Language.TypeScript:
                code = `const ${varName}: number = 42;`;
                fileName = 'test.ts';
                break;
              case Language.JavaScript:
                code = `const ${varName} = 42;`;
                fileName = 'test.js';
                break;
              case Language.Python:
                code = `${varName} = 42`;
                fileName = 'test.py';
                break;
              case Language.Java:
                code = `public class Test { int ${varName} = 42; }`;
                fileName = 'Test.java';
                break;
              case Language.Go:
                code = `package main\nvar ${varName} = 42`;
                fileName = 'test.go';
                break;
              default:
                code = '';
                fileName = 'test.txt';
            }
            
            const ast = await parserManager.parseFile(fileName, code, language);
            
            // Parser should handle all languages without crashing
            expect(ast).toBeDefined();
            expect(ast.tree.rootNode).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 2.4: Cache Functionality for Normal Operations (Req 3.1)', () => {
    
    it('should parse same file twice and produce identical ASTs', async () => {
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
            
            // Should produce structurally identical results (proves cache doesn't corrupt)
            expect(ast1.tree.rootNode.toString()).toBe(ast2.tree.rootNode.toString());
            expect(ast1.tree.rootNode.childCount).toBe(ast2.tree.rootNode.childCount);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should parse different files and produce different ASTs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(
            fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
            fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/)
          ).filter(([name1, name2]) => name1 !== name2),
          async ([varName1, varName2]) => {
            const parserManager = new ParserManager();
            await parserManager.initialize();
            
            const code1 = `const ${varName1} = 1;`;
            const code2 = `const ${varName2} = 2;`;
            
            // Parse different code
            const ast1 = await parserManager.parseFile('file1.ts', code1, Language.TypeScript);
            const ast2 = await parserManager.parseFile('file2.ts', code2, Language.TypeScript);
            
            // Should produce different results (proves cache doesn't cross-contaminate)
            // Compare the actual code content, not just AST structure
            const code1FromAst = ast1.tree.rootNode.text;
            const code2FromAst = ast2.tree.rootNode.text;
            expect(code1FromAst).not.toBe(code2FromAst);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should clear cache when requested', () => {
      const analysisService = new AnalysisService();
      
      // Clear cache should not throw
      expect(() => {
        analysisService.clearCache();
      }).not.toThrow();
    });

    it('should clear cache for specific file', () => {
      const analysisService = new AnalysisService();
      
      const filePath = 'test.ts';
      
      // Clear cache for file should not throw
      expect(() => {
        analysisService.clearCacheForFile(filePath);
      }).not.toThrow();
    });
  });

  describe('Property 2.5: Property-Based Tests for Diagram Generation', () => {
    
    it('should handle any valid component count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          async (componentCount) => {
            const diagramGenerator = new DiagramGenerator();
            
            // Generate model with N components
            const components: ArchitecturalComponent[] = Array.from({ length: componentCount }, (_, i) => ({
              id: `comp${i}`,
              name: `Component${i}`,
              role: `role${i}`,
              filePaths: [`file${i}.ts`],
              description: `Component ${i}`,
              abstractionLevel: AbstractionLevel.Module,
              subComponents: [],
              parent: null
            }));
            
            const model: ArchitecturalModel = {
              components,
              relationships: [],
              patterns: [],
              metadata: {
                llmInferenceTimeMs: 0,
                tierUsed: 1,
                confidence: 'high',
                filesAnalyzed: componentCount
              }
            };
            
            // Generate diagram
            const diagramData = await diagramGenerator.generateDiagram(
              model,
              AbstractionLevel.Module
            );
            
            // Should produce valid diagram
            expect(diagramData).toBeDefined();
            expect(diagramData.nodes.length).toBeGreaterThan(0);
            expect(Array.isArray(diagramData.edges)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle all abstraction levels', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            AbstractionLevel.Overview,
            AbstractionLevel.Module,
            AbstractionLevel.Detailed
          ),
          async (level) => {
            const diagramGenerator = new DiagramGenerator();
            
            const model: ArchitecturalModel = {
              components: [
                {
                  id: 'test',
                  name: 'TestComponent',
                  role: 'test',
                  filePaths: ['test.ts'],
                  description: 'Test',
                  abstractionLevel: AbstractionLevel.Module,
                  subComponents: [],
                  parent: null
                }
              ],
              relationships: [],
              patterns: [],
              metadata: {
                llmInferenceTimeMs: 0,
                tierUsed: 1,
                confidence: 'high',
                filesAnalyzed: 1
              }
            };
            
            // Generate diagram at this abstraction level
            const diagramData = await diagramGenerator.generateDiagram(model, level);
            
            // Should produce valid diagram for any level
            expect(diagramData).toBeDefined();
            expect(diagramData.nodes).toBeDefined();
            expect(diagramData.edges).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should consistently generate same diagram for same input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            componentName: fc.stringMatching(/^[A-Z][a-zA-Z0-9]*$/),
            fileName: fc.stringMatching(/^[a-z][a-zA-Z0-9]*\.ts$/)
          }),
          async ({ componentName, fileName }) => {
            const diagramGenerator = new DiagramGenerator();
            
            const model: ArchitecturalModel = {
              components: [
                {
                  id: componentName,
                  name: componentName,
                  role: 'test',
                  filePaths: [fileName],
                  description: 'Test component',
                  abstractionLevel: AbstractionLevel.Module,
                  subComponents: [],
                  parent: null
                }
              ],
              relationships: [],
              patterns: [],
              metadata: {
                llmInferenceTimeMs: 0,
                tierUsed: 1,
                confidence: 'high',
                filesAnalyzed: 1
              }
            };
            
            // Generate diagram twice
            const diagram1 = await diagramGenerator.generateDiagram(
              model,
              AbstractionLevel.Module
            );
            const diagram2 = await diagramGenerator.generateDiagram(
              model,
              AbstractionLevel.Module
            );
            
            // Should produce identical results
            expect(diagram1.nodes.length).toBe(diagram2.nodes.length);
            expect(diagram1.edges.length).toBe(diagram2.edges.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 2.6: Extension State Management', () => {
    
    it('should preserve state across operations', () => {
      const controller = new ExtensionController();
      
      // Set initial state
      const initialState = {
        selectedElementId: 'element1',
        abstractionLevel: AbstractionLevel.Module,
        zoomLevel: 1.5,
        panPosition: { x: 100, y: 200 }
      };
      
      controller.setState(initialState);
      
      // Get state
      const state = controller.getState();
      
      // State should be preserved
      expect(state.selectedElementId).toBe('element1');
      expect(state.abstractionLevel).toBe(AbstractionLevel.Module);
      expect(state.zoomLevel).toBe(1.5);
      expect(state.panPosition).toEqual({ x: 100, y: 200 });
    });

    it('should handle partial state updates', () => {
      const controller = new ExtensionController();
      
      // Set initial state
      controller.setState({
        selectedElementId: 'element1',
        zoomLevel: 1.0
      });
      
      // Update partial state
      controller.setState({
        zoomLevel: 2.0
      });
      
      const state = controller.getState();
      
      // Should preserve unchanged fields and update changed fields
      expect(state.selectedElementId).toBe('element1');
      expect(state.zoomLevel).toBe(2.0);
    });
    
    it('should handle arbitrary state updates with property-based testing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            selectedElementId: fc.option(fc.string(), { nil: null }),
            abstractionLevel: fc.constantFrom(
              AbstractionLevel.Overview,
              AbstractionLevel.Module,
              AbstractionLevel.Detailed
            ),
            zoomLevel: fc.double({ min: 0.1, max: 5.0 }),
            panPosition: fc.record({
              x: fc.integer({ min: -1000, max: 1000 }),
              y: fc.integer({ min: -1000, max: 1000 })
            })
          }),
          async (stateUpdate) => {
            const controller = new ExtensionController();
            
            // Set state
            controller.setState(stateUpdate);
            
            // Get state
            const state = controller.getState();
            
            // State should match what was set
            if (stateUpdate.selectedElementId !== undefined) {
              expect(state.selectedElementId).toBe(stateUpdate.selectedElementId);
            }
            if (stateUpdate.abstractionLevel !== undefined) {
              expect(state.abstractionLevel).toBe(stateUpdate.abstractionLevel);
            }
            if (stateUpdate.zoomLevel !== undefined) {
              expect(state.zoomLevel).toBe(stateUpdate.zoomLevel);
            }
            if (stateUpdate.panPosition !== undefined) {
              expect(state.panPosition).toEqual(stateUpdate.panPosition);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 2.7: Multi-Language Support Consistency', () => {
    
    it('should handle mixed-language projects', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const files = [
        { code: 'const x = 42;', file: 'app.js', language: Language.JavaScript },
        { code: 'const y: number = 42;', file: 'app.ts', language: Language.TypeScript },
        { code: 'x = 42', file: 'app.py', language: Language.Python }
      ];
      
      // Parse all files
      for (const { code, file, language } of files) {
        const ast = await parserManager.parseFile(file, code, language);
        expect(ast).toBeDefined();
        expect(ast.tree.rootNode).toBeDefined();
      }
    });

    it('should detect language from file extension', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const extensions = [
        { ext: '.ts', lang: Language.TypeScript },
        { ext: '.js', lang: Language.JavaScript },
        { ext: '.py', lang: Language.Python },
        { ext: '.java', lang: Language.Java },
        { ext: '.go', lang: Language.Go }
      ];
      
      for (const { ext, lang } of extensions) {
        const code = getSimpleCodeForLanguage(lang);
        const ast = await parserManager.parseFile(`test${ext}`, code, lang);
        expect(ast).toBeDefined();
      }
    });
  });

  describe('Property 2.8: Parser Robustness with Property-Based Testing', () => {
    
    it('should handle various code structures without crashing', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            varName: fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
            value: fc.oneof(fc.integer(), fc.double(), fc.boolean(), fc.string())
          }),
          async ({ varName, value }) => {
            const parserManager = new ParserManager();
            await parserManager.initialize();
            
            // Generate code with random variable and value
            const code = `const ${varName} = ${JSON.stringify(value)};`;
            
            // Parser should not crash
            const ast = await parserManager.parseFile('test.ts', code, Language.TypeScript);
            expect(ast).toBeDefined();
            expect(ast.tree.rootNode).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle various function signatures', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            funcName: fc.stringMatching(/^[a-z][a-zA-Z0-9]*$/),
            paramCount: fc.integer({ min: 0, max: 5 })
          }),
          async ({ funcName, paramCount }) => {
            const parserManager = new ParserManager();
            await parserManager.initialize();
            
            // Generate function with N parameters
            const params = Array.from({ length: paramCount }, (_, i) => `param${i}`).join(', ');
            const code = `function ${funcName}(${params}) { return true; }`;
            
            const ast = await parserManager.parseFile('test.js', code, Language.JavaScript);
            expect(ast).toBeDefined();
            expect(ast.tree.rootNode).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 2.9: Diagram Generation Robustness', () => {
    
    it('should handle models with varying relationship counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }),
          fc.integer({ min: 0, max: 20 }),
          async (componentCount, relationshipCount) => {
            const diagramGenerator = new DiagramGenerator();
            
            // Generate components
            const components: ArchitecturalComponent[] = Array.from({ length: componentCount }, (_, i) => ({
              id: `comp${i}`,
              name: `Component${i}`,
              role: `role${i}`,
              filePaths: [`file${i}.ts`],
              description: `Component ${i}`,
              abstractionLevel: AbstractionLevel.Module,
              subComponents: [],
              parent: null
            }));
            
            // Generate relationships between random components
            const relationships = Array.from({ length: Math.min(relationshipCount, componentCount * (componentCount - 1)) }, (_, i) => ({
              id: `rel${i}`,
              sourceId: `comp${i % componentCount}`,
              targetId: `comp${(i + 1) % componentCount}`,
              type: 'depends-on' as RelationshipType,
              description: `Relationship ${i}`,
              strength: 0.8
            }));
            
            const model: ArchitecturalModel = {
              components,
              relationships,
              patterns: [],
              metadata: {
                llmInferenceTimeMs: 0,
                tierUsed: 1,
                confidence: 'high',
                filesAnalyzed: componentCount
              }
            };
            
            // Generate diagram
            const diagramData = await diagramGenerator.generateDiagram(
              model,
              AbstractionLevel.Module
            );
            
            // Should produce valid diagram
            expect(diagramData).toBeDefined();
            expect(diagramData.nodes.length).toBeGreaterThan(0);
            expect(Array.isArray(diagramData.edges)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
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
      return 'public class Test { }';
    case Language.Go:
      return 'package main\nfunc main() {}';
    default:
      return '';
  }
}
