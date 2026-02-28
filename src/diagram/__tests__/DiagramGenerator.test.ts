/**
 * Unit tests for DiagramGenerator
 * Tests specific scenarios and edge cases
 */

import { DiagramGenerator } from '../DiagramGenerator';
import { AbstractionLevel, Language, ComponentType } from '../../types';
import { ArchitecturalModel } from '../../types/analysis';

describe('DiagramGenerator Unit Tests', () => {
  let generator: DiagramGenerator;

  beforeEach(() => {
    generator = new DiagramGenerator();
  });

  describe('Basic Diagram Generation', () => {
    it('should generate a diagram from a simple architectural model', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'AuthModule',
            description: 'Handles authentication',
            role: 'auth module',
            filePaths: ['src/auth/index.ts'],
            abstractionLevel: AbstractionLevel.Overview,
            subComponents: [],
            parent: null,
          },
          {
            id: 'comp-2',
            name: 'DataLayer',
            description: 'Manages data access',
            role: 'data access layer',
            filePaths: ['src/data/index.ts'],
            abstractionLevel: AbstractionLevel.Overview,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [
          {
            id: 'rel-1',
            sourceId: 'comp-1',
            targetId: 'comp-2',
            type: 'dependency' as any,
            description: 'Auth depends on data layer',
            strength: 0.8,
          },
        ],
        patterns: ['layered'],
        metadata: {
          llmInferenceTimeMs: 1000,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 2,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.nodes).toHaveLength(2);
      expect(diagram.edges).toHaveLength(1);
      expect(diagram.abstractionLevel).toBe(AbstractionLevel.Overview);
    });

    it('should handle empty architectural model', async () => {
      const model: ArchitecturalModel = {
        components: [],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 100,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 0,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.nodes).toHaveLength(0);
      expect(diagram.edges).toHaveLength(0);
    });

    it('should handle model with components but no relationships', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'Module1',
            description: 'First module',
            role: 'module',
            filePaths: ['src/module1.ts'],
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 500,
          tierUsed: 1,
          confidence: 'medium',
          filesAnalyzed: 1,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.nodes).toHaveLength(1);
      expect(diagram.edges).toHaveLength(0);
    });
  });

  describe('Language Inference', () => {
    it('should infer TypeScript from .ts files', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'TypeScriptModule',
            description: 'A TypeScript module',
            role: 'module',
            filePaths: ['src/module.ts', 'src/utils.ts'],
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 500,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 2,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.nodes[0].language).toBe(Language.TypeScript);
    });

    it('should infer Python from .py files', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'PythonModule',
            description: 'A Python module',
            role: 'module',
            filePaths: ['src/module.py', 'src/utils.py'],
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 500,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 2,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.nodes[0].language).toBe(Language.Python);
    });

    it('should handle mixed language files', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'MixedModule',
            description: 'A mixed language module',
            role: 'module',
            filePaths: ['src/module.ts', 'src/utils.py'],
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 500,
          tierUsed: 1,
          confidence: 'medium',
          filesAnalyzed: 2,
        },
      };

      const diagram = await generator.generateDiagram(model);

      // Should pick the most common language (or first if tied)
      expect([Language.TypeScript, Language.Python]).toContain(
        diagram.nodes[0].language
      );
    });

    it('should return Unknown for files with no extension', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'UnknownModule',
            description: 'A module with unknown language',
            role: 'module',
            filePaths: ['Makefile', 'README'],
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 500,
          tierUsed: 1,
          confidence: 'low',
          filesAnalyzed: 2,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.nodes[0].language).toBe(Language.Unknown);
    });
  });

  describe('Component Type Inference', () => {
    it('should infer Service type from role', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'AuthService',
            description: 'Authentication service',
            role: 'auth service',
            filePaths: ['src/auth.ts'],
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 500,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 1,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.nodes[0].type).toBe(ComponentType.Service);
    });

    it('should infer Module type from role', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'DataModule',
            description: 'Data access module',
            role: 'data access layer',
            filePaths: ['src/data.ts'],
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 500,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 1,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.nodes[0].type).toBe(ComponentType.Module);
    });

    it('should use abstraction level as fallback for type inference', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'Component',
            description: 'A component',
            role: 'generic',
            filePaths: ['src/component.ts'],
            abstractionLevel: AbstractionLevel.Overview,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 500,
          tierUsed: 1,
          confidence: 'medium',
          filesAnalyzed: 1,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.nodes[0].type).toBe(ComponentType.Package);
    });
  });

  describe('Abstraction Level', () => {
    it('should set abstraction level in diagram data', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'Module',
            description: 'A module',
            role: 'module',
            filePaths: ['src/module.ts'],
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 500,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 1,
        },
      };

      const overviewDiagram = await generator.generateDiagram(
        model,
        AbstractionLevel.Overview
      );
      expect(overviewDiagram.abstractionLevel).toBe(AbstractionLevel.Overview);

      const moduleDiagram = await generator.generateDiagram(
        model,
        AbstractionLevel.Module
      );
      expect(moduleDiagram.abstractionLevel).toBe(AbstractionLevel.Module);

      const detailedDiagram = await generator.generateDiagram(
        model,
        AbstractionLevel.Detailed
      );
      expect(detailedDiagram.abstractionLevel).toBe(AbstractionLevel.Detailed);
    });

    it('should default to Overview level if not specified', async () => {
      const model: ArchitecturalModel = {
        components: [],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 100,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 0,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.abstractionLevel).toBe(AbstractionLevel.Overview);
    });
  });

  describe('Layout Configuration', () => {
    it('should set default layout configuration', async () => {
      const model: ArchitecturalModel = {
        components: [],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 100,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 0,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.layout.algorithm).toBe('dagre');
      expect(diagram.layout.spacing).toBe(50);
      expect(diagram.layout.direction).toBe('TB');
    });
  });

  describe('Node and Edge Styling', () => {
    it('should apply styles to nodes', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'Module',
            description: 'A module',
            role: 'module',
            filePaths: ['src/module.ts'],
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 500,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 1,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.nodes[0].style).toBeDefined();
      expect(diagram.nodes[0].style.color).toBeDefined();
      expect(diagram.nodes[0].style.shape).toBeDefined();
      expect(diagram.nodes[0].style.size).toBeGreaterThan(0);
      expect(diagram.nodes[0].style.borderWidth).toBeGreaterThan(0);
    });

    it('should apply styles to edges', async () => {
      const model: ArchitecturalModel = {
        components: [
          {
            id: 'comp-1',
            name: 'Module1',
            description: 'First module',
            role: 'module',
            filePaths: ['src/module1.ts'],
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null,
          },
          {
            id: 'comp-2',
            name: 'Module2',
            description: 'Second module',
            role: 'module',
            filePaths: ['src/module2.ts'],
            abstractionLevel: AbstractionLevel.Module,
            subComponents: [],
            parent: null,
          },
        ],
        relationships: [
          {
            id: 'rel-1',
            sourceId: 'comp-1',
            targetId: 'comp-2',
            type: 'import' as any,
            description: 'Module1 imports Module2',
            strength: 0.5,
          },
        ],
        patterns: [],
        metadata: {
          llmInferenceTimeMs: 500,
          tierUsed: 1,
          confidence: 'high',
          filesAnalyzed: 2,
        },
      };

      const diagram = await generator.generateDiagram(model);

      expect(diagram.edges[0].style).toBeDefined();
      expect(diagram.edges[0].style.color).toBeDefined();
      expect(diagram.edges[0].style.width).toBeGreaterThan(0);
      expect(diagram.edges[0].style.lineStyle).toBeDefined();
      expect(diagram.edges[0].style.arrow).toBe(true);
    });
  });
});
