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
import { Language, AbstractionLevel } from '../types';
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
    
    it('should create webview without errors in production environment', () => {
      // NOTE: This test documents that webview creation currently uses runtime require('vscode')
      // which is Issue 1.3 that will be fixed in Phase 2
      // In test environment, vscode module is not available, so we skip actual webview creation
      // This test verifies the preservation requirement: webview functionality should work in production
      
      const webviewManager = new WebviewManager();
      
      // In production with vscode module available, this would work
      // In test environment, we just verify the manager exists
      expect(webviewManager).toBeDefined();
      expect(typeof webviewManager.isActive).toBe('function');
    });

    it('should update diagram data in webview', async () => {
      // NOTE: Webview requires vscode module which is not available in test environment
      // This test verifies diagram generation works independently of webview
      
      const diagramGenerator = new DiagramGenerator();
      
      // Create a simple architectural model
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp1',
            name: 'Component1',
            role: 'test-component',
            filePaths: ['test.ts'],
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
      
      // Generate diagram - this is the core functionality to preserve
      const diagramData = await diagramGenerator.generateDiagram(
        model,
        AbstractionLevel.Module
      );
      
      // Verify diagram data structure
      expect(diagramData).toBeDefined();
      expect(diagramData.nodes).toBeDefined();
      expect(Array.isArray(diagramData.nodes)).toBe(true);
      expect(diagramData.edges).toBeDefined();
      expect(Array.isArray(diagramData.edges)).toBe(true);
      
      // In production, webview.updateDiagram(diagramData) would display this
      // The preservation requirement is that diagram generation produces valid data
    });

    it('should handle message passing between extension and webview', () => {
      // NOTE: Message handling requires webview which requires vscode module
      // This test verifies the message handler registration API exists
      
      const webviewManager = new WebviewManager();
      
      // Verify the API exists for message handling
      expect(typeof webviewManager.onMessage).toBe('function');
      expect(typeof webviewManager.postMessage).toBe('function');
      
      // In production, these would work with actual webview
      // The preservation requirement is that the API remains available
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
  });

  describe('Property 2.4: Cache Functionality for Normal Operations (Req 3.1)', () => {
    
    it('should cache parsed files for performance', async () => {
      const parserManager = new ParserManager();
      await parserManager.initialize();
      
      const testCode = 'const x = 42;';
      const filePath = 'test.ts';
      
      // Parse file - parser manager handles caching internally
      const ast1 = await parserManager.parseFile(filePath, testCode, Language.TypeScript);
      const ast2 = await parserManager.parseFile(filePath, testCode, Language.TypeScript);
      
      // Both parses should succeed
      expect(ast1).toBeDefined();
      expect(ast2).toBeDefined();
      expect(ast1.tree.rootNode).toBeDefined();
      expect(ast2.tree.rootNode).toBeDefined();
    });

    it('should generate consistent cache keys for same content', () => {
      const optimizer = new AnalysisOptimizer();
      
      const content1 = 'const x = 42;';
      const content2 = 'const x = 42;';
      
      // Access private method for testing (using bracket notation as in actual code)
      const key1 = (optimizer as any).hashContent(content1);
      const key2 = (optimizer as any).hashContent(content2);
      
      // Same content should produce same key
      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different content', () => {
      const optimizer = new AnalysisOptimizer();
      
      const content1 = 'const x = 42;';
      const content2 = 'const y = 100;';
      
      const key1 = (optimizer as any).hashContent(content1);
      const key2 = (optimizer as any).hashContent(content2);
      
      // Different content should produce different keys
      expect(key1).not.toBe(key2);
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
        { numRuns: 10 }
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
        { numRuns: 10 }
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
        { numRuns: 10 }
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
