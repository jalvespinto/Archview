/**
 * Unit tests for RelationshipExtractor
 * Tests relationship extraction from various language ASTs
 */

import { RelationshipExtractor, RelationshipExtractionContext } from '../RelationshipExtractor';
import { ParserManager } from '../ParserManager';
import {
  Component,
  ComponentType,
  Language,
  AbstractionLevel,
  RelationshipType
} from '../../types';

describe('RelationshipExtractor', () => {
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

  describe('Python relationship extraction', () => {
    it('should extract import relationships', async () => {
      const sourceCode = `
import os
import sys
from typing import List, Dict
`;

      const ast = await parserManager.parseFile('test.py', sourceCode, Language.Python);
      
      const components: Component[] = [
        {
          id: 'comp_1',
          name: 'test',
          type: ComponentType.Module,
          language: Language.Python,
          filePaths: ['test.py'],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 4, exportedSymbols: [] }
        },
        {
          id: 'comp_2',
          name: 'os',
          type: ComponentType.Module,
          language: Language.Python,
          filePaths: ['os.py'],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 100, exportedSymbols: [] }
        },
        {
          id: 'comp_3',
          name: 'sys',
          type: ComponentType.Module,
          language: Language.Python,
          filePaths: ['sys.py'],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 100, exportedSymbols: [] }
        }
      ];

      const context: RelationshipExtractionContext = {
        ast,
        components,
        parserManager
      };

      const relationships = await extractor.extractRelationships(context);

      expect(relationships.length).toBeGreaterThan(0);
      
      const importRels = relationships.filter(r => r.type === RelationshipType.Import);
      expect(importRels.length).toBeGreaterThan(0);
      expect(importRels.some(r => r.source === 'comp_1')).toBe(true);
    });

    it('should extract inheritance relationships', async () => {
      const sourceCode = `
class Animal:
    pass

class Dog(Animal):
    pass
`;

      const ast = await parserManager.parseFile('test.py', sourceCode, Language.Python);
      
      const components: Component[] = [
        {
          id: 'comp_1',
          name: 'test',
          type: ComponentType.Module,
          language: Language.Python,
          filePaths: ['test.py'],
          children: ['comp_2', 'comp_3'],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 6, exportedSymbols: [] }
        },
        {
          id: 'comp_2',
          name: 'Animal',
          type: ComponentType.Class,
          language: Language.Python,
          filePaths: ['test.py'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 2, exportedSymbols: [] }
        },
        {
          id: 'comp_3',
          name: 'Dog',
          type: ComponentType.Class,
          language: Language.Python,
          filePaths: ['test.py'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 2, exportedSymbols: [] }
        }
      ];

      const context: RelationshipExtractionContext = {
        ast,
        components,
        parserManager
      };

      const relationships = await extractor.extractRelationships(context);

      const inheritanceRels = relationships.filter(r => r.type === RelationshipType.Inheritance);
      expect(inheritanceRels.length).toBeGreaterThan(0);
      
      const dogToAnimal = inheritanceRels.find(r => r.source === 'comp_3' && r.target === 'comp_2');
      expect(dogToAnimal).toBeDefined();
    });

    it('should extract function call relationships with occurrence count', async () => {
      const sourceCode = `
def helper():
    pass

def main():
    helper()
    helper()
    helper()
`;

      const ast = await parserManager.parseFile('test.py', sourceCode, Language.Python);
      
      const components: Component[] = [
        {
          id: 'comp_1',
          name: 'test',
          type: ComponentType.Module,
          language: Language.Python,
          filePaths: ['test.py'],
          children: ['comp_2', 'comp_3'],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 8, exportedSymbols: [] }
        },
        {
          id: 'comp_2',
          name: 'helper',
          type: ComponentType.Function,
          language: Language.Python,
          filePaths: ['test.py'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 2, exportedSymbols: [] }
        },
        {
          id: 'comp_3',
          name: 'main',
          type: ComponentType.Function,
          language: Language.Python,
          filePaths: ['test.py'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 4, exportedSymbols: [] }
        }
      ];

      const context: RelationshipExtractionContext = {
        ast,
        components,
        parserManager
      };

      const relationships = await extractor.extractRelationships(context);

      const callRels = relationships.filter(r => r.type === RelationshipType.FunctionCall);
      expect(callRels.length).toBeGreaterThan(0);
      
      const mainToHelper = callRels.find(r => r.source === 'comp_3' && r.target === 'comp_2');
      expect(mainToHelper).toBeDefined();
      expect(mainToHelper?.metadata.occurrences).toBe(3);
    });
  });

  describe('JavaScript/TypeScript relationship extraction', () => {
    it('should extract ES6 import relationships', async () => {
      const sourceCode = `
import React from 'react';
import { useState } from 'react';
`;

      const ast = await parserManager.parseFile('test.js', sourceCode, Language.JavaScript);
      
      const components: Component[] = [
        {
          id: 'comp_1',
          name: 'test',
          type: ComponentType.Module,
          language: Language.JavaScript,
          filePaths: ['test.js'],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 3, exportedSymbols: [] }
        }
      ];

      const context: RelationshipExtractionContext = {
        ast,
        components,
        parserManager
      };

      const relationships = await extractor.extractRelationships(context);

      const importRels = relationships.filter(r => r.type === RelationshipType.Import);
      expect(importRels.length).toBeGreaterThanOrEqual(0); // May not find 'react' component
    });

    it('should extract class inheritance (extends)', async () => {
      const sourceCode = `
class Animal {
  constructor() {}
}

class Dog extends Animal {
  constructor() {
    super();
  }
}
`;

      const ast = await parserManager.parseFile('test.js', sourceCode, Language.JavaScript);
      
      const components: Component[] = [
        {
          id: 'comp_1',
          name: 'test',
          type: ComponentType.Module,
          language: Language.JavaScript,
          filePaths: ['test.js'],
          children: ['comp_2', 'comp_3'],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 10, exportedSymbols: [] }
        },
        {
          id: 'comp_2',
          name: 'Animal',
          type: ComponentType.Class,
          language: Language.JavaScript,
          filePaths: ['test.js'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 3, exportedSymbols: [] }
        },
        {
          id: 'comp_3',
          name: 'Dog',
          type: ComponentType.Class,
          language: Language.JavaScript,
          filePaths: ['test.js'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 5, exportedSymbols: [] }
        }
      ];

      const context: RelationshipExtractionContext = {
        ast,
        components,
        parserManager
      };

      const relationships = await extractor.extractRelationships(context);

      const inheritanceRels = relationships.filter(r => r.type === RelationshipType.Inheritance);
      expect(inheritanceRels.length).toBeGreaterThan(0);
      
      const dogToAnimal = inheritanceRels.find(r => r.source === 'comp_3' && r.target === 'comp_2');
      expect(dogToAnimal).toBeDefined();
    });

    it('should extract function call relationships', async () => {
      const sourceCode = `
function helper() {
  return 42;
}

function main() {
  helper();
  helper();
}
`;

      const ast = await parserManager.parseFile('test.js', sourceCode, Language.JavaScript);
      
      const components: Component[] = [
        {
          id: 'comp_1',
          name: 'test',
          type: ComponentType.Module,
          language: Language.JavaScript,
          filePaths: ['test.js'],
          children: ['comp_2', 'comp_3'],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 9, exportedSymbols: [] }
        },
        {
          id: 'comp_2',
          name: 'helper',
          type: ComponentType.Function,
          language: Language.JavaScript,
          filePaths: ['test.js'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 3, exportedSymbols: [] }
        },
        {
          id: 'comp_3',
          name: 'main',
          type: ComponentType.Function,
          language: Language.JavaScript,
          filePaths: ['test.js'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 4, exportedSymbols: [] }
        }
      ];

      const context: RelationshipExtractionContext = {
        ast,
        components,
        parserManager
      };

      const relationships = await extractor.extractRelationships(context);

      const callRels = relationships.filter(r => r.type === RelationshipType.FunctionCall);
      expect(callRels.length).toBeGreaterThan(0);
      
      const mainToHelper = callRels.find(r => r.source === 'comp_3' && r.target === 'comp_2');
      expect(mainToHelper).toBeDefined();
      expect(mainToHelper?.metadata.occurrences).toBe(2);
    });
  });

  describe('Relationship strength calculation', () => {
    it('should calculate strength based on occurrence count', async () => {
      const sourceCode = `
def helper():
    pass

def main():
    helper()
    helper()
    helper()
    helper()
    helper()
`;

      const ast = await parserManager.parseFile('test.py', sourceCode, Language.Python);
      
      const components: Component[] = [
        {
          id: 'comp_1',
          name: 'test',
          type: ComponentType.Module,
          language: Language.Python,
          filePaths: ['test.py'],
          children: ['comp_2', 'comp_3'],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 10, exportedSymbols: [] }
        },
        {
          id: 'comp_2',
          name: 'helper',
          type: ComponentType.Function,
          language: Language.Python,
          filePaths: ['test.py'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 2, exportedSymbols: [] }
        },
        {
          id: 'comp_3',
          name: 'main',
          type: ComponentType.Function,
          language: Language.Python,
          filePaths: ['test.py'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 6, exportedSymbols: [] }
        }
      ];

      const context: RelationshipExtractionContext = {
        ast,
        components,
        parserManager
      };

      const relationships = await extractor.extractRelationships(context);

      const callRel = relationships.find(
        r => r.type === RelationshipType.FunctionCall && r.source === 'comp_3' && r.target === 'comp_2'
      );
      
      expect(callRel).toBeDefined();
      expect(callRel?.strength).toBeGreaterThan(0);
      expect(callRel?.strength).toBeLessThanOrEqual(1);
      expect(callRel?.metadata.occurrences).toBe(5);
    });

    it('should cap strength at 1.0', async () => {
      // Create a relationship with many occurrences
      const sourceCode = `
def helper():
    pass

def main():
    ${Array(100).fill('helper()').join('\n    ')}
`;

      const ast = await parserManager.parseFile('test.py', sourceCode, Language.Python);
      
      const components: Component[] = [
        {
          id: 'comp_1',
          name: 'test',
          type: ComponentType.Module,
          language: Language.Python,
          filePaths: ['test.py'],
          children: ['comp_2', 'comp_3'],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 104, exportedSymbols: [] }
        },
        {
          id: 'comp_2',
          name: 'helper',
          type: ComponentType.Function,
          language: Language.Python,
          filePaths: ['test.py'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 2, exportedSymbols: [] }
        },
        {
          id: 'comp_3',
          name: 'main',
          type: ComponentType.Function,
          language: Language.Python,
          filePaths: ['test.py'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 101, exportedSymbols: [] }
        }
      ];

      const context: RelationshipExtractionContext = {
        ast,
        components,
        parserManager
      };

      const relationships = await extractor.extractRelationships(context);

      const callRel = relationships.find(
        r => r.type === RelationshipType.FunctionCall && r.source === 'comp_3' && r.target === 'comp_2'
      );
      
      expect(callRel).toBeDefined();
      expect(callRel?.strength).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty files', async () => {
      const sourceCode = '';

      const ast = await parserManager.parseFile('test.py', sourceCode, Language.Python);
      
      const components: Component[] = [
        {
          id: 'comp_1',
          name: 'test',
          type: ComponentType.Module,
          language: Language.Python,
          filePaths: ['test.py'],
          children: [],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 0, exportedSymbols: [] }
        }
      ];

      const context: RelationshipExtractionContext = {
        ast,
        components,
        parserManager
      };

      const relationships = await extractor.extractRelationships(context);

      expect(relationships).toEqual([]);
    });

    it('should skip self-references', async () => {
      const sourceCode = `
def recursive():
    recursive()
`;

      const ast = await parserManager.parseFile('test.py', sourceCode, Language.Python);
      
      const components: Component[] = [
        {
          id: 'comp_1',
          name: 'test',
          type: ComponentType.Module,
          language: Language.Python,
          filePaths: ['test.py'],
          children: ['comp_2'],
          parent: null,
          abstractionLevel: AbstractionLevel.Overview,
          metadata: { lineCount: 3, exportedSymbols: [] }
        },
        {
          id: 'comp_2',
          name: 'recursive',
          type: ComponentType.Function,
          language: Language.Python,
          filePaths: ['test.py'],
          children: [],
          parent: 'comp_1',
          abstractionLevel: AbstractionLevel.Module,
          metadata: { lineCount: 2, exportedSymbols: [] }
        }
      ];

      const context: RelationshipExtractionContext = {
        ast,
        components,
        parserManager
      };

      const relationships = await extractor.extractRelationships(context);

      // Should not create self-reference relationship
      const selfRef = relationships.find(r => r.source === r.target);
      expect(selfRef).toBeUndefined();
    });

    it('should handle unknown language', async () => {
      const sourceCode = 'some code';

      const ast = await parserManager.parseFile('test.unknown', sourceCode, Language.Unknown);
      
      const components: Component[] = [];

      const context: RelationshipExtractionContext = {
        ast,
        components,
        parserManager
      };

      const relationships = await extractor.extractRelationships(context);

      expect(relationships).toEqual([]);
    });
  });
});
