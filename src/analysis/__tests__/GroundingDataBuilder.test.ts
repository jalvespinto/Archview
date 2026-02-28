/**
 * Unit tests for GroundingDataBuilder
 * Tests conversion of Component[] and Relationship[] to GroundingData
 */

import { GroundingDataBuilder } from '../GroundingDataBuilder';
import {
  Component,
  ComponentType,
  Language,
  AbstractionLevel,
  Relationship,
  RelationshipType
} from '../../types';
import * as path from 'path';

describe('GroundingDataBuilder', () => {
  let builder: GroundingDataBuilder;
  const rootPath = '/test/project';

  beforeEach(() => {
    builder = new GroundingDataBuilder();
  });

  describe('buildDirectoryTree', () => {
    it('should build a simple directory tree', () => {
      const filePaths = [
        path.join(rootPath, 'src', 'main.ts'),
        path.join(rootPath, 'src', 'utils.ts'),
        path.join(rootPath, 'test', 'main.test.ts')
      ];

      const tree = builder.buildDirectoryTree(rootPath, filePaths);

      expect(tree.name).toBe('project');
      expect(tree.path).toBe(rootPath);
      expect(tree.children).toHaveLength(2);

      const srcDir = tree.children.find(c => c.name === 'src');
      expect(srcDir).toBeDefined();
      expect(srcDir!.files).toHaveLength(2);
      expect(srcDir!.files).toContain(path.join(rootPath, 'src', 'main.ts'));

      const testDir = tree.children.find(c => c.name === 'test');
      expect(testDir).toBeDefined();
      expect(testDir!.files).toHaveLength(1);
    });

    it('should handle nested directories', () => {
      const filePaths = [
        path.join(rootPath, 'src', 'api', 'routes', 'users.ts'),
        path.join(rootPath, 'src', 'api', 'middleware', 'auth.ts')
      ];

      const tree = builder.buildDirectoryTree(rootPath, filePaths);

      const srcDir = tree.children.find(c => c.name === 'src');
      expect(srcDir).toBeDefined();

      const apiDir = srcDir!.children.find(c => c.name === 'api');
      expect(apiDir).toBeDefined();
      expect(apiDir!.children).toHaveLength(2);

      const routesDir = apiDir!.children.find(c => c.name === 'routes');
      expect(routesDir).toBeDefined();
      expect(routesDir!.files).toContain(path.join(rootPath, 'src', 'api', 'routes', 'users.ts'));
    });

    it('should sort children and files alphabetically', () => {
      const filePaths = [
        path.join(rootPath, 'zebra.ts'),
        path.join(rootPath, 'alpha.ts'),
        path.join(rootPath, 'beta', 'file.ts')
      ];

      const tree = builder.buildDirectoryTree(rootPath, filePaths);

      expect(tree.files[0]).toBe(path.join(rootPath, 'alpha.ts'));
      expect(tree.files[1]).toBe(path.join(rootPath, 'zebra.ts'));
      expect(tree.children[0].name).toBe('beta');
    });

    it('should handle empty file list', () => {
      const tree = builder.buildDirectoryTree(rootPath, []);

      expect(tree.name).toBe('project');
      expect(tree.children).toHaveLength(0);
      expect(tree.files).toHaveLength(0);
    });
  });

  describe('buildGroundingData', () => {
    it('should build complete grounding data from components', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'main',
          type: ComponentType.Module,
          language: Language.TypeScript,
          filePaths: [path.join(rootPath, 'src', 'main.ts')],
          children: ['comp2'],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 50, exportedSymbols: ['MyClass'] }
        },
        {
          id: 'comp2',
          name: 'MyClass',
          type: ComponentType.Class,
          language: Language.TypeScript,
          filePaths: [path.join(rootPath, 'src', 'main.ts')],
          children: [],
          parent: 'comp1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 20, exportedSymbols: [] }
        }
      ];

      const relationships: Relationship[] = [];

      const groundingData = builder.buildGroundingData(rootPath, components, relationships);

      expect(groundingData.rootPath).toBe(rootPath);
      expect(groundingData.timestamp).toBeGreaterThan(0);
      expect(groundingData.directoryTree).toBeDefined();
      expect(groundingData.files).toHaveLength(1);
      expect(groundingData.importGraph).toHaveLength(0);
      expect(groundingData.inheritanceGraph).toHaveLength(0);
    });

    it('should extract file grounding data correctly', () => {
      const components: Component[] = [
        {
          id: 'mod1',
          name: 'utils',
          type: ComponentType.Module,
          language: Language.Python,
          filePaths: [path.join(rootPath, 'utils.py')],
          children: ['class1', 'func1'],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 100, exportedSymbols: [] }
        },
        {
          id: 'class1',
          name: 'Helper',
          type: ComponentType.Class,
          language: Language.Python,
          filePaths: [path.join(rootPath, 'utils.py')],
          children: ['method1'],
          parent: 'mod1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 30, exportedSymbols: [] }
        },
        {
          id: 'method1',
          name: 'Helper.process',
          type: ComponentType.Function,
          language: Language.Python,
          filePaths: [path.join(rootPath, 'utils.py')],
          children: [],
          parent: 'class1',
          abstractionLevel: AbstractionLevel.Detailed,
          metadata: { lineCount: 10, exportedSymbols: [] }
        },
        {
          id: 'func1',
          name: 'calculate',
          type: ComponentType.Function,
          language: Language.Python,
          filePaths: [path.join(rootPath, 'utils.py')],
          children: [],
          parent: 'mod1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 15, exportedSymbols: [] }
        }
      ];

      const relationships: Relationship[] = [];

      const groundingData = builder.buildGroundingData(rootPath, components, relationships);

      expect(groundingData.files).toHaveLength(1);
      
      const fileData = groundingData.files[0];
      expect(fileData.path).toBe(path.join(rootPath, 'utils.py'));
      expect(fileData.language).toBe(Language.Python);
      expect(fileData.exports).toContain('Helper');
      expect(fileData.exports).toContain('calculate');
      expect(fileData.classes).toHaveLength(1);
      expect(fileData.classes[0].name).toBe('Helper');
      expect(fileData.classes[0].methods).toContain('process');
      expect(fileData.topLevelFunctions).toHaveLength(1);
      expect(fileData.topLevelFunctions[0].name).toBe('calculate');
    });

    it('should handle multiple files', () => {
      const components: Component[] = [
        {
          id: 'mod1',
          name: 'file1',
          type: ComponentType.Module,
          language: Language.JavaScript,
          filePaths: [path.join(rootPath, 'file1.js')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 10, exportedSymbols: [] }
        },
        {
          id: 'mod2',
          name: 'file2',
          type: ComponentType.Module,
          language: Language.JavaScript,
          filePaths: [path.join(rootPath, 'file2.js')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 20, exportedSymbols: [] }
        }
      ];

      const relationships: Relationship[] = [];

      const groundingData = builder.buildGroundingData(rootPath, components, relationships);

      expect(groundingData.files).toHaveLength(2);
      expect(groundingData.files[0].path).toBe(path.join(rootPath, 'file1.js'));
      expect(groundingData.files[1].path).toBe(path.join(rootPath, 'file2.js'));
    });
  });

  describe('buildImportGraph', () => {
    it('should build import edges from import relationships', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'main',
          type: ComponentType.Module,
          language: Language.TypeScript,
          filePaths: [path.join(rootPath, 'main.ts')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 10, exportedSymbols: [] }
        },
        {
          id: 'comp2',
          name: 'utils',
          type: ComponentType.Module,
          language: Language.TypeScript,
          filePaths: [path.join(rootPath, 'utils.ts')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 20, exportedSymbols: [] }
        }
      ];

      const relationships: Relationship[] = [
        {
          id: 'rel1',
          source: 'comp1',
          target: 'comp2',
          type: RelationshipType.Import,
          strength: 0.8,
          metadata: { occurrences: 1, bidirectional: false }
        }
      ];

      const importGraph = builder.buildImportGraph(relationships, components);

      expect(importGraph).toHaveLength(1);
      expect(importGraph[0].sourceFile).toBe(path.join(rootPath, 'main.ts'));
      expect(importGraph[0].targetFile).toBe(path.join(rootPath, 'utils.ts'));
      expect(importGraph[0].symbols).toContain('utils');
    });

    it('should handle dependency relationships', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'service',
          type: ComponentType.Class,
          language: Language.Java,
          filePaths: [path.join(rootPath, 'Service.java')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 30, exportedSymbols: [] }
        },
        {
          id: 'comp2',
          name: 'repository',
          type: ComponentType.Class,
          language: Language.Java,
          filePaths: [path.join(rootPath, 'Repository.java')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 25, exportedSymbols: [] }
        }
      ];

      const relationships: Relationship[] = [
        {
          id: 'rel1',
          source: 'comp1',
          target: 'comp2',
          type: RelationshipType.Dependency,
          strength: 0.9,
          metadata: { occurrences: 3, bidirectional: false }
        }
      ];

      const importGraph = builder.buildImportGraph(relationships, components);

      expect(importGraph).toHaveLength(1);
      expect(importGraph[0].symbols).toContain('repository');
    });

    it('should skip relationships with missing components', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'main',
          type: ComponentType.Module,
          language: Language.TypeScript,
          filePaths: [path.join(rootPath, 'main.ts')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 10, exportedSymbols: [] }
        }
      ];

      const relationships: Relationship[] = [
        {
          id: 'rel1',
          source: 'comp1',
          target: 'missing_comp',
          type: RelationshipType.Import,
          strength: 0.5,
          metadata: { occurrences: 1, bidirectional: false }
        }
      ];

      const importGraph = builder.buildImportGraph(relationships, components);

      expect(importGraph).toHaveLength(0);
    });
  });

  describe('buildInheritanceGraph', () => {
    it('should build inheritance edges from inheritance relationships', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'BaseClass',
          type: ComponentType.Class,
          language: Language.Python,
          filePaths: [path.join(rootPath, 'base.py')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 20, exportedSymbols: [] }
        },
        {
          id: 'comp2',
          name: 'DerivedClass',
          type: ComponentType.Class,
          language: Language.Python,
          filePaths: [path.join(rootPath, 'derived.py')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 30, exportedSymbols: [] }
        }
      ];

      const relationships: Relationship[] = [
        {
          id: 'rel1',
          source: 'comp2',
          target: 'comp1',
          type: RelationshipType.Inheritance,
          strength: 1.0,
          metadata: { occurrences: 1, bidirectional: false }
        }
      ];

      const inheritanceGraph = builder.buildInheritanceGraph(relationships, components);

      expect(inheritanceGraph).toHaveLength(1);
      expect(inheritanceGraph[0].childClass).toBe('DerivedClass');
      expect(inheritanceGraph[0].parentClass).toBe('BaseClass');
      expect(inheritanceGraph[0].sourceFile).toBe(path.join(rootPath, 'derived.py'));
      expect(inheritanceGraph[0].type).toBe('extends');
    });

    it('should detect interface implementation', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'IService',
          type: ComponentType.Interface,
          language: Language.TypeScript,
          filePaths: [path.join(rootPath, 'IService.ts')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 10, exportedSymbols: [] }
        },
        {
          id: 'comp2',
          name: 'ServiceImpl',
          type: ComponentType.Class,
          language: Language.TypeScript,
          filePaths: [path.join(rootPath, 'ServiceImpl.ts')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 40, exportedSymbols: [] }
        }
      ];

      const relationships: Relationship[] = [
        {
          id: 'rel1',
          source: 'comp2',
          target: 'comp1',
          type: RelationshipType.Inheritance,
          strength: 1.0,
          metadata: { occurrences: 1, bidirectional: false }
        }
      ];

      const inheritanceGraph = builder.buildInheritanceGraph(relationships, components);

      expect(inheritanceGraph).toHaveLength(1);
      expect(inheritanceGraph[0].type).toBe('implements');
    });

    it('should skip non-class inheritance relationships', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'func1',
          type: ComponentType.Function,
          language: Language.JavaScript,
          filePaths: [path.join(rootPath, 'func1.js')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 5, exportedSymbols: [] }
        },
        {
          id: 'comp2',
          name: 'func2',
          type: ComponentType.Function,
          language: Language.JavaScript,
          filePaths: [path.join(rootPath, 'func2.js')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 8, exportedSymbols: [] }
        }
      ];

      const relationships: Relationship[] = [
        {
          id: 'rel1',
          source: 'comp1',
          target: 'comp2',
          type: RelationshipType.Inheritance,
          strength: 0.5,
          metadata: { occurrences: 1, bidirectional: false }
        }
      ];

      const inheritanceGraph = builder.buildInheritanceGraph(relationships, components);

      expect(inheritanceGraph).toHaveLength(0);
    });
  });

  describe('resolveImportPath', () => {
    it('should resolve relative paths to absolute', () => {
      const sourceFile = path.join(rootPath, 'src', 'main.ts');
      const targetFile = './utils';

      const resolved = builder.resolveImportPath(sourceFile, targetFile);

      expect(path.isAbsolute(resolved)).toBe(true);
      expect(resolved).toContain('utils');
    });

    it('should return absolute paths unchanged', () => {
      const sourceFile = path.join(rootPath, 'src', 'main.ts');
      const targetFile = path.join(rootPath, 'lib', 'helper.ts');

      const resolved = builder.resolveImportPath(sourceFile, targetFile);

      expect(resolved).toBe(targetFile);
    });

    it('should handle parent directory references', () => {
      const sourceFile = path.join(rootPath, 'src', 'api', 'routes.ts');
      const targetFile = '../utils';

      const resolved = builder.resolveImportPath(sourceFile, targetFile);

      expect(path.isAbsolute(resolved)).toBe(true);
    });
  });

  describe('validateGroundingData', () => {
    it('should validate correct grounding data', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'main',
          type: ComponentType.Module,
          language: Language.TypeScript,
          filePaths: [path.join(rootPath, 'main.ts')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 10, exportedSymbols: [] }
        }
      ];

      const groundingData = builder.buildGroundingData(rootPath, components, []);
      const validation = builder.validateGroundingData(groundingData);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing root path', () => {
      const groundingData = builder.buildGroundingData(rootPath, [], []);
      groundingData.rootPath = '';

      const validation = builder.validateGroundingData(groundingData);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing root path');
    });

    it('should detect duplicate file paths', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'main',
          type: ComponentType.Module,
          language: Language.TypeScript,
          filePaths: [path.join(rootPath, 'main.ts')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 10, exportedSymbols: [] }
        }
      ];

      const groundingData = builder.buildGroundingData(rootPath, components, []);
      // Manually add duplicate
      groundingData.files.push(groundingData.files[0]);

      const validation = builder.validateGroundingData(groundingData);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Duplicate file path'))).toBe(true);
    });

    it('should warn about missing language', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'main',
          type: ComponentType.Module,
          language: Language.Unknown,
          filePaths: [path.join(rootPath, 'main.ts')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 10, exportedSymbols: [] }
        }
      ];

      const groundingData = builder.buildGroundingData(rootPath, components, []);

      const validation = builder.validateGroundingData(groundingData);

      expect(validation.warnings.some(w => w.includes('Missing language'))).toBe(true);
    });

    it('should warn about import edges with no symbols', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'main',
          type: ComponentType.Module,
          language: Language.TypeScript,
          filePaths: [path.join(rootPath, 'main.ts')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 10, exportedSymbols: [] }
        }
      ];

      const groundingData = builder.buildGroundingData(rootPath, components, []);
      // Manually add invalid import edge
      groundingData.importGraph.push({
        sourceFile: path.join(rootPath, 'main.ts'),
        targetFile: path.join(rootPath, 'utils.ts'),
        symbols: []
      });

      const validation = builder.validateGroundingData(groundingData);

      expect(validation.warnings.some(w => w.includes('has no symbols'))).toBe(true);
    });

    it('should detect invalid inheritance type', () => {
      const components: Component[] = [
        {
          id: 'comp1',
          name: 'main',
          type: ComponentType.Module,
          language: Language.TypeScript,
          filePaths: [path.join(rootPath, 'main.ts')],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 10, exportedSymbols: [] }
        }
      ];

      const groundingData = builder.buildGroundingData(rootPath, components, []);
      // Manually add invalid inheritance edge
      groundingData.inheritanceGraph.push({
        childClass: 'Child',
        parentClass: 'Parent',
        sourceFile: path.join(rootPath, 'main.ts'),
        type: 'invalid' as any
      });

      const validation = builder.validateGroundingData(groundingData);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('Invalid inheritance type'))).toBe(true);
    });
  });
});
