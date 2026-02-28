/**
 * Unit tests for AnalysisService
 * Tests the main orchestration logic and grounding layer construction
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { AnalysisService, createCancellationToken, TimeoutError, CancellationError } from '../AnalysisService';
import { Language, AnalysisConfig } from '../../types';

describe('AnalysisService', () => {
  let service: AnalysisService;
  let testDir: string;

  beforeEach(() => {
    service = new AnalysisService();
    testDir = path.join(__dirname, 'test-fixtures');
  });

  afterEach(() => {
    service.dispose();
  });

  describe('buildGroundingLayer', () => {
    it('should build grounding layer for a simple Python project', async () => {
      // Create a temporary test directory with Python files
      const tempDir = path.join(__dirname, 'temp-test-python');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        // Create a simple Python file
        const pythonFile = path.join(tempDir, 'main.py');
        await fs.writeFile(pythonFile, `
class Calculator:
    def add(self, a, b):
        return a + b

def main():
    calc = Calculator()
    print(calc.add(1, 2))
`);

        const config: AnalysisConfig = {
          rootPath: tempDir,
          includePatterns: [],
          excludePatterns: [],
          maxFiles: 1000,
          maxDepth: 10,
          languages: [Language.Python],
          aiEnabled: false
        };

        const result = await service.buildGroundingLayer(tempDir, { config });

        // Verify grounding data structure
        expect(result).toBeDefined();
        expect(result.rootPath).toBe(tempDir);
        expect(result.timestamp).toBeGreaterThan(0);
        expect(result.directoryTree).toBeDefined();
        expect(result.files).toHaveLength(1);
        expect(result.importGraph).toBeDefined();
        expect(result.inheritanceGraph).toBeDefined();

        // Verify file grounding data
        const fileData = result.files[0];
        expect(fileData.path).toContain('main.py');
        expect(fileData.language).toBe(Language.Python);
        expect(fileData.classes).toHaveLength(1);
        expect(fileData.classes[0].name).toBe('Calculator');
        expect(fileData.topLevelFunctions).toHaveLength(1);
        expect(fileData.topLevelFunctions[0].name).toBe('main');

      } finally {
        // Cleanup
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }, 30000);

    it('should report progress during analysis', async () => {
      const tempDir = path.join(__dirname, 'temp-test-progress');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const pythonFile = path.join(tempDir, 'test.py');
        await fs.writeFile(pythonFile, 'def test(): pass');

        const config: AnalysisConfig = {
          rootPath: tempDir,
          includePatterns: [],
          excludePatterns: [],
          maxFiles: 1000,
          maxDepth: 10,
          languages: [Language.Python],
          aiEnabled: false
        };

        const progressUpdates: Array<{ percentage: number; message: string }> = [];
        const progressCallback = (percentage: number, message: string) => {
          progressUpdates.push({ percentage, message });
        };

        await service.buildGroundingLayer(tempDir, { config, progressCallback });

        // Verify progress was reported
        expect(progressUpdates.length).toBeGreaterThan(0);
        // For quick analyses, only the final 100% may be reported due to throttling
        expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }, 30000);

    it('should support cancellation', async () => {
      const tempDir = path.join(__dirname, 'temp-test-cancel');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const pythonFile = path.join(tempDir, 'test.py');
        await fs.writeFile(pythonFile, 'def test(): pass');

        const config: AnalysisConfig = {
          rootPath: tempDir,
          includePatterns: [],
          excludePatterns: [],
          maxFiles: 1000,
          maxDepth: 10,
          languages: [Language.Python],
          aiEnabled: false
        };

        const cancellationToken = createCancellationToken();
        
        // Cancel immediately
        cancellationToken.cancel();

        await expect(
          service.buildGroundingLayer(tempDir, { config, cancellationToken })
        ).rejects.toThrow(CancellationError);

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }, 30000);

    it('should use cached results for unchanged files', async () => {
      const tempDir = path.join(__dirname, 'temp-test-cache');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const pythonFile = path.join(tempDir, 'test.py');
        await fs.writeFile(pythonFile, 'def test(): pass');

        const config: AnalysisConfig = {
          rootPath: tempDir,
          includePatterns: [],
          excludePatterns: [],
          maxFiles: 1000,
          maxDepth: 10,
          languages: [Language.Python],
          aiEnabled: false
        };

        // First analysis
        const result1 = await service.buildGroundingLayer(tempDir, { config });
        const timestamp1 = result1.timestamp;

        // Wait a bit to ensure timestamp would be different
        await new Promise(resolve => setTimeout(resolve, 10));

        // Second analysis - should use cache
        const result2 = await service.buildGroundingLayer(tempDir, { config });
        const timestamp2 = result2.timestamp;

        // Timestamps should be the same (from cache)
        expect(timestamp2).toBe(timestamp1);

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }, 30000);

    it('should invalidate cache when files are modified', async () => {
      const tempDir = path.join(__dirname, 'temp-test-cache-invalidate');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const pythonFile = path.join(tempDir, 'test.py');
        await fs.writeFile(pythonFile, 'def test(): pass');

        const config: AnalysisConfig = {
          rootPath: tempDir,
          includePatterns: [],
          excludePatterns: [],
          maxFiles: 1000,
          maxDepth: 10,
          languages: [Language.Python],
          aiEnabled: false
        };

        // First analysis
        const result1 = await service.buildGroundingLayer(tempDir, { config });
        const timestamp1 = result1.timestamp;

        // Wait a bit to ensure file modification time changes
        await new Promise(resolve => setTimeout(resolve, 100));

        // Modify the file
        await fs.writeFile(pythonFile, 'def test(): return 42');

        // Second analysis - should NOT use cache
        const result2 = await service.buildGroundingLayer(tempDir, { config });
        const timestamp2 = result2.timestamp;

        // Timestamps should be different (cache was invalidated)
        expect(timestamp2).toBeGreaterThan(timestamp1);

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }, 30000);

    it('should build directory tree correctly', async () => {
      const tempDir = path.join(__dirname, 'temp-test-tree');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        // Create nested directory structure
        await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
        await fs.mkdir(path.join(tempDir, 'src', 'utils'), { recursive: true });
        await fs.writeFile(path.join(tempDir, 'main.py'), 'pass');
        await fs.writeFile(path.join(tempDir, 'src', 'app.py'), 'pass');
        await fs.writeFile(path.join(tempDir, 'src', 'utils', 'helper.py'), 'pass');

        const config: AnalysisConfig = {
          rootPath: tempDir,
          includePatterns: [],
          excludePatterns: [],
          maxFiles: 1000,
          maxDepth: 10,
          languages: [Language.Python],
          aiEnabled: false
        };

        const result = await service.buildGroundingLayer(tempDir, { config });

        // Verify directory tree structure
        expect(result.directoryTree).toBeDefined();
        expect(result.directoryTree.files).toContain('main.py');
        
        const srcDir = result.directoryTree.children.find(c => c.name === 'src');
        expect(srcDir).toBeDefined();
        expect(srcDir!.files).toContain(path.join('src', 'app.py'));
        
        const utilsDir = srcDir!.children.find(c => c.name === 'utils');
        expect(utilsDir).toBeDefined();
        expect(utilsDir!.files).toContain(path.join('src', 'utils', 'helper.py'));

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }, 30000);

    it('should handle empty directories gracefully', async () => {
      const tempDir = path.join(__dirname, 'temp-test-empty');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const config: AnalysisConfig = {
          rootPath: tempDir,
          includePatterns: [],
          excludePatterns: [],
          maxFiles: 1000,
          maxDepth: 10,
          languages: [Language.Python],
          aiEnabled: false
        };

        const result = await service.buildGroundingLayer(tempDir, { config });

        expect(result).toBeDefined();
        expect(result.files).toHaveLength(0);
        expect(result.importGraph).toHaveLength(0);
        expect(result.inheritanceGraph).toHaveLength(0);

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }, 30000);
  });

  describe('cache management', () => {
    it('should clear cache when requested', async () => {
      const tempDir = path.join(__dirname, 'temp-test-clear-cache');
      await fs.mkdir(tempDir, { recursive: true });

      try {
        const pythonFile = path.join(tempDir, 'test.py');
        await fs.writeFile(pythonFile, 'def test(): pass');

        const config: AnalysisConfig = {
          rootPath: tempDir,
          includePatterns: [],
          excludePatterns: [],
          maxFiles: 1000,
          maxDepth: 10,
          languages: [Language.Python],
          aiEnabled: false
        };

        // First analysis
        const result1 = await service.buildGroundingLayer(tempDir, { config });
        const timestamp1 = result1.timestamp;

        // Clear cache
        service.clearCache();

        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 10));

        // Second analysis - should NOT use cache
        const result2 = await service.buildGroundingLayer(tempDir, { config });
        const timestamp2 = result2.timestamp;

        // Timestamps should be different
        expect(timestamp2).toBeGreaterThan(timestamp1);

      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }, 30000);
  });
});
