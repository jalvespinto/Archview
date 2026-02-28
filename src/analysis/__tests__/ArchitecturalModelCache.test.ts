/**
 * Unit tests for ArchitecturalModelCache
 * Tests cache hit/miss, LRU eviction, and file modification invalidation
 * 
 * Requirements: 9.5
 * Task: 6.3
 */

import { ArchitecturalModelCache } from '../ArchitecturalModelCache';
import {
  GroundingData,
  ArchitecturalModel,
  DirectoryNode,
  FileGroundingData,
} from '../../types/analysis';
import { Language, AbstractionLevel, RelationshipType } from '../../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('ArchitecturalModelCache', () => {
  let cache: ArchitecturalModelCache;
  let tempDir: string;

  beforeEach(async () => {
    cache = new ArchitecturalModelCache();
    
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  /**
   * Helper to create test grounding data
   */
  function createGroundingData(
    filePaths: string[] = ['file1.ts', 'file2.ts']
  ): GroundingData {
    const directoryTree: DirectoryNode = {
      name: 'root',
      path: tempDir,
      children: [],
      files: filePaths,
    };

    const files: FileGroundingData[] = filePaths.map(filePath => ({
      path: path.join(tempDir, filePath),
      language: Language.TypeScript,
      exports: ['export1'],
      classes: [],
      topLevelFunctions: [],
      imports: [],
    }));

    return {
      rootPath: tempDir,
      timestamp: Date.now(),
      directoryTree,
      files,
      importGraph: [],
      inheritanceGraph: [],
    };
  }

  /**
   * Helper to create test architectural model
   */
  function createArchitecturalModel(): ArchitecturalModel {
    return {
      components: [
        {
          id: 'comp1',
          name: 'Component 1',
          description: 'Test component',
          role: 'test',
          filePaths: ['file1.ts'],
          abstractionLevel: AbstractionLevel.Overview,
          subComponents: [],
          parent: null,
        },
      ],
      relationships: [],
      patterns: ['test-pattern'],
      metadata: {
        llmInferenceTimeMs: 100,
        tierUsed: 1,
        confidence: 'high',
        filesAnalyzed: 2,
      },
    };
  }

  /**
   * Helper to create test files
   */
  async function createTestFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      const fullPath = path.join(tempDir, filePath);
      await fs.writeFile(fullPath, 'test content');
    }
  }

  describe('cache hit and miss', () => {
    it('should return null for cache miss', async () => {
      const grounding = createGroundingData();
      await createTestFiles(['file1.ts', 'file2.ts']);

      const result = await cache.get(grounding, 1);
      expect(result).toBeNull();
    });

    it('should return cached model for cache hit', async () => {
      const grounding = createGroundingData();
      await createTestFiles(['file1.ts', 'file2.ts']);
      const model = createArchitecturalModel();

      await cache.set(grounding, 1, model);
      const result = await cache.get(grounding, 1);

      expect(result).toEqual(model);
    });

    it('should cache tier-specific responses separately', async () => {
      const grounding = createGroundingData();
      await createTestFiles(['file1.ts', 'file2.ts']);
      const model1 = createArchitecturalModel();
      const model2 = { ...createArchitecturalModel(), patterns: ['different'] };

      await cache.set(grounding, 1, model1);
      await cache.set(grounding, 2, model2);

      const result1 = await cache.get(grounding, 1);
      const result2 = await cache.get(grounding, 2);

      expect(result1).toEqual(model1);
      expect(result2).toEqual(model2);
      expect(result1).not.toEqual(result2);
    });

    it('should differentiate between different grounding data', async () => {
      const grounding1 = createGroundingData(['file1.ts']);
      const grounding2 = createGroundingData(['file2.ts']);
      await createTestFiles(['file1.ts', 'file2.ts']);

      const model1 = createArchitecturalModel();
      const model2 = { ...createArchitecturalModel(), patterns: ['different'] };

      await cache.set(grounding1, 1, model1);
      await cache.set(grounding2, 1, model2);

      const result1 = await cache.get(grounding1, 1);
      const result2 = await cache.get(grounding2, 1);

      expect(result1).toEqual(model1);
      expect(result2).toEqual(model2);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entries when over limit', async () => {
      // Create 101 different grounding data entries
      const entries: Array<{ grounding: GroundingData; model: ArchitecturalModel }> = [];
      
      for (let i = 0; i < 101; i++) {
        const filePath = `file${i}.ts`;
        await fs.writeFile(path.join(tempDir, filePath), 'content');
        
        const grounding = createGroundingData([filePath]);
        const model = {
          ...createArchitecturalModel(),
          patterns: [`pattern-${i}`],
        };
        
        entries.push({ grounding, model });
        await cache.set(grounding, 1, model);
      }

      // First entry should be evicted (LRU)
      const firstResult = await cache.get(entries[0].grounding, 1);
      expect(firstResult).toBeNull();

      // Last entry should still be cached
      const lastResult = await cache.get(entries[100].grounding, 1);
      expect(lastResult).toEqual(entries[100].model);

      // Cache size should be at max
      const stats = cache.getStats();
      expect(stats.size).toBe(100);
      expect(stats.maxSize).toBe(100);
    });

    it('should update LRU order on cache hit', async () => {
      // Fill cache with 100 entries
      const entries: Array<{ grounding: GroundingData; model: ArchitecturalModel }> = [];
      
      for (let i = 0; i < 100; i++) {
        const filePath = `file${i}.ts`;
        await fs.writeFile(path.join(tempDir, filePath), 'content');
        
        const grounding = createGroundingData([filePath]);
        const model = {
          ...createArchitecturalModel(),
          patterns: [`pattern-${i}`],
        };
        
        entries.push({ grounding, model });
        await cache.set(grounding, 1, model);
      }

      // Access first entry (should move to end of LRU)
      await cache.get(entries[0].grounding, 1);

      // Add one more entry (should evict second entry, not first)
      const newFilePath = 'file-new.ts';
      await fs.writeFile(path.join(tempDir, newFilePath), 'content');
      const newGrounding = createGroundingData([newFilePath]);
      const newModel = { ...createArchitecturalModel(), patterns: ['new'] };
      await cache.set(newGrounding, 1, newModel);

      // First entry should still be cached (was accessed recently)
      const firstResult = await cache.get(entries[0].grounding, 1);
      expect(firstResult).toEqual(entries[0].model);

      // Second entry should be evicted
      const secondResult = await cache.get(entries[1].grounding, 1);
      expect(secondResult).toBeNull();
    });
  });

  describe('file modification invalidation', () => {
    it('should invalidate cache when file is modified', async () => {
      const grounding = createGroundingData(['file1.ts']);
      await createTestFiles(['file1.ts']);
      const model = createArchitecturalModel();

      await cache.set(grounding, 1, model);

      // Verify cache hit
      let result = await cache.get(grounding, 1);
      expect(result).toEqual(model);

      // Wait a bit to ensure different modification time
      await new Promise(resolve => setTimeout(resolve, 10));

      // Modify the file
      await fs.writeFile(path.join(tempDir, 'file1.ts'), 'modified content');

      // Cache should be invalidated
      result = await cache.get(grounding, 1);
      expect(result).toBeNull();
    });

    it('should invalidate cache when any file is modified', async () => {
      const grounding = createGroundingData(['file1.ts', 'file2.ts']);
      await createTestFiles(['file1.ts', 'file2.ts']);
      const model = createArchitecturalModel();

      await cache.set(grounding, 1, model);

      // Wait a bit to ensure different modification time
      await new Promise(resolve => setTimeout(resolve, 10));

      // Modify only file2
      await fs.writeFile(path.join(tempDir, 'file2.ts'), 'modified content');

      // Cache should be invalidated
      const result = await cache.get(grounding, 1);
      expect(result).toBeNull();
    });

    it('should invalidate cache when file is deleted', async () => {
      const grounding = createGroundingData(['file1.ts']);
      await createTestFiles(['file1.ts']);
      const model = createArchitecturalModel();

      await cache.set(grounding, 1, model);

      // Delete the file
      await fs.unlink(path.join(tempDir, 'file1.ts'));

      // Cache should be invalidated
      const result = await cache.get(grounding, 1);
      expect(result).toBeNull();
    });

    it('should invalidate cache when new files are added', async () => {
      const grounding1 = createGroundingData(['file1.ts']);
      await createTestFiles(['file1.ts']);
      const model = createArchitecturalModel();

      await cache.set(grounding1, 1, model);

      // Create grounding with additional file
      const grounding2 = createGroundingData(['file1.ts', 'file2.ts']);
      await createTestFiles(['file2.ts']);

      // Cache should miss (different grounding data)
      const result = await cache.get(grounding2, 1);
      expect(result).toBeNull();
    });
  });

  describe('cache management', () => {
    it('should clear all entries', async () => {
      const grounding = createGroundingData();
      await createTestFiles(['file1.ts', 'file2.ts']);
      const model = createArchitecturalModel();

      await cache.set(grounding, 1, model);
      
      let stats = cache.getStats();
      expect(stats.size).toBe(1);

      cache.clear();

      stats = cache.getStats();
      expect(stats.size).toBe(0);

      const result = await cache.get(grounding, 1);
      expect(result).toBeNull();
    });

    it('should report accurate statistics', async () => {
      let stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.maxSize).toBe(100);

      const grounding1 = createGroundingData(['file1.ts']);
      const grounding2 = createGroundingData(['file2.ts']);
      await createTestFiles(['file1.ts', 'file2.ts']);

      await cache.set(grounding1, 1, createArchitecturalModel());
      stats = cache.getStats();
      expect(stats.size).toBe(1);

      await cache.set(grounding2, 1, createArchitecturalModel());
      stats = cache.getStats();
      expect(stats.size).toBe(2);

      await cache.set(grounding1, 2, createArchitecturalModel());
      stats = cache.getStats();
      expect(stats.size).toBe(3);
    });
  });

  describe('hash stability', () => {
    it('should generate same hash for identical grounding data', async () => {
      const grounding1 = createGroundingData(['file1.ts']);
      const grounding2 = createGroundingData(['file1.ts']);
      await createTestFiles(['file1.ts']);

      const model = createArchitecturalModel();

      await cache.set(grounding1, 1, model);
      const result = await cache.get(grounding2, 1);

      // Should get cache hit even with different object instance
      expect(result).toEqual(model);
    });

    it('should ignore timestamp differences in hash', async () => {
      const grounding1 = createGroundingData(['file1.ts']);
      await createTestFiles(['file1.ts']);
      
      // Wait and create another grounding with different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      const grounding2 = createGroundingData(['file1.ts']);

      const model = createArchitecturalModel();

      await cache.set(grounding1, 1, model);
      const result = await cache.get(grounding2, 1);

      // Should get cache hit despite different timestamps
      expect(result).toEqual(model);
    });
  });
});
