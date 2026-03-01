/**
 * Phase 3 Preservation Property-Based Tests
 *
 * CRITICAL: These tests MUST be written and run BEFORE implementing Phase 3 fixes.
 * They capture the baseline behavior on UNFIXED code to ensure no regressions.
 *
 * Property 2: Preservation - Core Functionality Unchanged
 *
 * Test Strategy: Observation-First Methodology
 * 1. Observe behavior on UNFIXED code for normal operations
 * 2. Write property-based tests capturing observed behavior patterns
 * 3. Run tests on UNFIXED code - EXPECTED OUTCOME: Tests PASS
 * 4. After fixes, re-run same tests - should still PASS (no regressions)
 *
 * Requirements: 3.5, 3.8, 3.10
 */

import * as fc from 'fast-check';
import { ExtensionController } from '../ExtensionController';
import { MemoryManager } from '../performance/MemoryManager';
import { FileScanner } from '../analysis/FileScanner';
import { FileWatcher, FileWatcherConfig, FileChangeEvent } from '../analysis/FileWatcher';
import { WebviewManager } from '../ui/WebviewManager';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

describe('Phase 3 Preservation Tests - Core Functionality Unchanged', () => {

  describe('Property: Workspace Detection for Normal Cases', () => {
    /**
     * Requirement 3.5: File analysis SHALL CONTINUE TO respect include/exclude patterns
     *
     * getWorkspaceRoot() currently returns process.cwd().
     * After fix it should return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
     * In either case the result must be a non-empty absolute path.
     */
    it('should return a valid, non-empty absolute path', async () => {
      const controller = new ExtensionController();
      const getWorkspaceRoot = (controller as any).getWorkspaceRoot.bind(controller);
      const root = await getWorkspaceRoot();

      expect(root).toBeTruthy();
      expect(typeof root).toBe('string');
      expect(root.length).toBeGreaterThan(0);
      expect(path.isAbsolute(root)).toBe(true);
    });

    it('should return consistent workspace root across multiple calls', async () => {
      const controller = new ExtensionController();
      const getWorkspaceRoot = (controller as any).getWorkspaceRoot.bind(controller);

      const root1 = await getWorkspaceRoot();
      const root2 = await getWorkspaceRoot();

      expect(root1).toBe(root2);
    });
  });

  describe('Property: Configuration Reading Returns Valid Defaults', () => {
    /**
     * Requirement 3.5, 3.10
     *
     * getAnalysisConfig() returns hardcoded defaults on unfixed code.
     * After fix it should read from VS Code settings but fall back to same defaults.
     * Either way, the shape and reasonable values must be preserved.
     */
    it('should return config with all required fields and reasonable defaults', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).map(s => `/tmp/${s}`),
          (rootPath) => {
            const controller = new ExtensionController();
            const getAnalysisConfig = (controller as any).getAnalysisConfig.bind(controller);
            const config = getAnalysisConfig(rootPath);

            // Shape
            expect(config).toBeDefined();
            expect(config.rootPath).toBe(rootPath);
            expect(Array.isArray(config.includePatterns)).toBe(true);
            expect(Array.isArray(config.excludePatterns)).toBe(true);
            expect(typeof config.maxFiles).toBe('number');
            expect(typeof config.maxDepth).toBe('number');
            expect(Array.isArray(config.languages)).toBe(true);
            expect(typeof config.aiEnabled).toBe('boolean');
            expect(typeof config.autoRefresh).toBe('boolean');
            expect(typeof config.autoRefreshDebounce).toBe('number');

            // Reasonable values
            expect(config.maxFiles).toBeGreaterThan(0);
            expect(config.maxDepth).toBeGreaterThan(0);
            expect(config.autoRefreshDebounce).toBeGreaterThan(0);
            expect(config.includePatterns.length).toBeGreaterThan(0);
            expect(config.excludePatterns.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return consistent configuration for same root path', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).map(s => `/tmp/${s}`),
          (rootPath) => {
            const controller = new ExtensionController();
            const getAnalysisConfig = (controller as any).getAnalysisConfig.bind(controller);

            const config1 = getAnalysisConfig(rootPath);
            const config2 = getAnalysisConfig(rootPath);

            expect(config1.includePatterns).toEqual(config2.includePatterns);
            expect(config1.excludePatterns).toEqual(config2.excludePatterns);
            expect(config1.maxFiles).toBe(config2.maxFiles);
            expect(config1.maxDepth).toBe(config2.maxDepth);
            expect(config1.aiEnabled).toBe(config2.aiEnabled);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should include common file patterns in defaults', () => {
      const controller = new ExtensionController();
      const getAnalysisConfig = (controller as any).getAnalysisConfig.bind(controller);
      const config = getAnalysisConfig('/test/path');

      const includeStr = config.includePatterns.join(',');
      expect(includeStr).toMatch(/\*\.ts/);
      expect(includeStr).toMatch(/\*\.js/);

      const excludeStr = config.excludePatterns.join(',');
      expect(excludeStr).toMatch(/node_modules/);
      expect(excludeStr).toMatch(/\.git/);
    });
  });

  describe('Property: Memory Cleanup Functionality Works (Timing Changes Only)', () => {
    /**
     * Requirement 3.8: Memory management SHALL CONTINUE TO use MemoryManager for cleanup
     *
     * The cleanup logic is correct — only the 2-second artificial delay is the bug.
     * After fix, cleanup should still execute the callback and resolve the promise,
     * just without the polling delay.
     */
    it('should execute sync cleanup function', async () => {
      const mgr = new MemoryManager();
      let executed = false;
      await mgr.releaseMemory(() => { executed = true; });
      expect(executed).toBe(true);
    });

    it('should execute async cleanup function', async () => {
      const mgr = new MemoryManager();
      let executed = false;
      await mgr.releaseMemory(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        executed = true;
      });
      expect(executed).toBe(true);
    });

    it('should complete memory release without hanging', async () => {
      const mgr = new MemoryManager();
      const start = Date.now();
      await mgr.releaseMemory(() => {});
      const elapsed = Date.now() - start;

      // On unfixed code this takes ~2000ms; after fix it should be <100ms.
      // Both are acceptable; the test just ensures it doesn't hang.
      expect(elapsed).toBeLessThan(5000);
    });

    it('should handle multiple sequential cleanups', async () => {
      const mgr = new MemoryManager();
      let count = 0;
      const numCleanups = 2;

      for (let i = 0; i < numCleanups; i++) {
        await mgr.releaseMemory(() => { count++; });
      }

      expect(count).toBe(numCleanups);
    }, 30000); // Tolerates 2s × 2 + overhead on unfixed code
  });

  describe('Property: Glob Pattern Matching for Normal Patterns', () => {
    /**
     * Requirement 3.5: File analysis SHALL CONTINUE TO respect include/exclude patterns
     *
     * Glob matching works correctly for normal, safe patterns.
     * After fix (minimatch or proper escaping), normal patterns must still work identically.
     */
    let tempDir: string;
    let scanner: FileScanner;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase3-test-'));
      scanner = new FileScanner();
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('should match files with wildcard patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('test.ts', 'app.js', 'main.py', 'util.go', 'App.java'),
          async (filename) => {
            await fs.writeFile(path.join(tempDir, filename), '// test content');

            const ext = path.extname(filename);
            const result = await scanner.scan(tempDir, {
              includePatterns: [`**/*${ext}`],
              excludePatterns: [],
              maxFiles: 100,
              maxDepth: 10,
              respectGitignore: false,
            });

            expect(result.files.length).toBeGreaterThan(0);
            expect(result.files.some(f => f.path === filename)).toBe(true);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should exclude files matching exclude patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('node_modules', 'dist', '.git', 'build'),
          async (dirName) => {
            const dirPath = path.join(tempDir, dirName);
            await fs.mkdir(dirPath, { recursive: true });
            await fs.writeFile(path.join(dirPath, 'test.ts'), '// test');

            const result = await scanner.scan(tempDir, {
              includePatterns: ['**/*.ts'],
              excludePatterns: [`**/${dirName}/**`],
              maxFiles: 100,
              maxDepth: 10,
              respectGitignore: false,
            });

            expect(result.files.every(f => !f.path.includes(dirName))).toBe(true);
          }
        ),
        { numRuns: 4 }
      );
    });

    it('should handle multiple include patterns', async () => {
      await fs.writeFile(path.join(tempDir, 'test.ts'), '// ts');
      await fs.writeFile(path.join(tempDir, 'test.js'), '// js');
      await fs.writeFile(path.join(tempDir, 'test.py'), '# py');

      const result = await scanner.scan(tempDir, {
        includePatterns: ['**/*.ts', '**/*.js'],
        excludePatterns: [],
        maxFiles: 100,
        maxDepth: 10,
        respectGitignore: false,
      });

      expect(result.files.some(f => f.path === 'test.ts')).toBe(true);
      expect(result.files.some(f => f.path === 'test.js')).toBe(true);
      expect(result.files.some(f => f.path === 'test.py')).toBe(false);
    });

    it('should respect maxFiles limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (maxFiles) => {
            for (let i = 0; i < maxFiles + 5; i++) {
              await fs.writeFile(path.join(tempDir, `file${i}.ts`), '// test');
            }

            const result = await scanner.scan(tempDir, {
              includePatterns: ['**/*.ts'],
              excludePatterns: [],
              maxFiles,
              maxDepth: 10,
              respectGitignore: false,
            });

            expect(result.files.length).toBeLessThanOrEqual(maxFiles);
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should respect maxDepth limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }),
          async (maxDepth) => {
            let currentPath = tempDir;
            for (let i = 0; i <= maxDepth + 2; i++) {
              currentPath = path.join(currentPath, `level${i}`);
              await fs.mkdir(currentPath, { recursive: true });
              await fs.writeFile(path.join(currentPath, 'test.ts'), '// test');
            }

            const result = await scanner.scan(tempDir, {
              includePatterns: ['**/*.ts'],
              excludePatterns: [],
              maxFiles: 100,
              maxDepth,
              respectGitignore: false,
            });

            expect(result.files.every(f => f.depth <= maxDepth)).toBe(true);
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should handle empty directories gracefully', async () => {
      const result = await scanner.scan(tempDir, {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFiles: 100,
        maxDepth: 10,
        respectGitignore: false,
      });

      expect(result.files).toEqual([]);
      expect(result.totalFiles).toBe(0);
    });
  });

  describe('Property: FileWatcher Debounce and Filtering Logic', () => {
    /**
     * FileWatcher's setupWatchers() is empty (Issue 1.8), but the debounce logic,
     * file change handling, and exclude pattern filtering are already implemented.
     * These must be preserved when setupWatchers() is fixed.
     */
    const defaultConfig: FileWatcherConfig = {
      autoRefresh: true,
      autoRefreshDebounce: 50, // Short debounce for testing
      includePatterns: ['**/*.ts', '**/*.js'],
      excludePatterns: ['**/node_modules/**', '**/.git/**'],
    };

    it('should track changed files when triggerFileChange is called', () => {
      const watcher = new FileWatcher(defaultConfig);
      const events: FileChangeEvent[] = [];
      watcher.start('/workspace', (event) => events.push(event));

      watcher.triggerFileChange('src/main.ts');

      const changed = watcher.getChangedFiles();
      expect(changed.has('src/main.ts')).toBe(true);

      watcher.stop();
    });

    it('should debounce rapid file changes into a single event', (done) => {
      const watcher = new FileWatcher({ ...defaultConfig, autoRefreshDebounce: 100 });
      const events: FileChangeEvent[] = [];
      watcher.start('/workspace', (event) => events.push(event));

      // Rapid changes
      watcher.triggerFileChange('src/a.ts');
      watcher.triggerFileChange('src/b.ts');
      watcher.triggerFileChange('src/c.ts');

      // After debounce period, should receive a single event with all 3 files
      setTimeout(() => {
        expect(events.length).toBe(1);
        expect(events[0].changedFiles.size).toBe(3);
        watcher.stop();
        done();
      }, 200);
    });

    it('should filter files that do not match any include pattern', () => {
      // Include patterns are ['**/*.ts', '**/*.js'] — a .css file should be excluded
      const watcher = new FileWatcher(defaultConfig);
      const events: FileChangeEvent[] = [];
      watcher.start('/workspace', (event) => events.push(event));

      watcher.triggerFileChange('styles/main.css');

      // .css doesn't match any include pattern, so it should be filtered out
      const changed = watcher.getChangedFiles();
      expect(changed.size).toBe(0);

      watcher.stop();
    });

    it('should clear changed files when clearChangedFiles is called', () => {
      const watcher = new FileWatcher(defaultConfig);
      watcher.start('/workspace', () => {});

      watcher.triggerFileChange('src/main.ts');
      expect(watcher.getChangedFiles().size).toBe(1);

      watcher.clearChangedFiles();
      expect(watcher.getChangedFiles().size).toBe(0);

      watcher.stop();
    });

    it('should not start watching when autoRefresh is false', () => {
      const watcher = new FileWatcher({ ...defaultConfig, autoRefresh: false });
      watcher.start('/workspace', () => {});

      expect(watcher.isActive()).toBe(false);
      watcher.stop();
    });

    it('should stop and clean up properly', () => {
      const watcher = new FileWatcher(defaultConfig);
      watcher.start('/workspace', () => {});

      expect(watcher.isActive()).toBe(true);
      watcher.stop();
      expect(watcher.isActive()).toBe(false);
    });

    it('should flush pending changes immediately', () => {
      const watcher = new FileWatcher({ ...defaultConfig, autoRefreshDebounce: 10000 });
      const events: FileChangeEvent[] = [];
      watcher.start('/workspace', (event) => events.push(event));

      watcher.triggerFileChange('src/main.ts');
      // Without flush, the debounce timer would still be pending
      watcher.flushPendingChanges();

      expect(events.length).toBe(1);
      expect(events[0].changedFiles.has('src/main.ts')).toBe(true);

      watcher.stop();
    });
  });

  describe('Property: WebviewManager Message Handler Registration', () => {
    /**
     * WebviewManager's onMessage() and handler tracking work for normal operations.
     * After fixing the memory leak (Issue 1.13), handler registration must still work.
     */
    it('should register message handlers without throwing', () => {
      const mgr = new WebviewManager();
      expect(() => {
        mgr.onMessage((msg) => { /* handler */ });
      }).not.toThrow();
    });

    it('should accept multiple handlers', () => {
      const mgr = new WebviewManager();
      expect(() => {
        mgr.onMessage((msg) => { /* handler 1 */ });
        mgr.onMessage((msg) => { /* handler 2 */ });
        mgr.onMessage((msg) => { /* handler 3 */ });
      }).not.toThrow();
    });

    it('should report inactive when no webview is created', () => {
      const mgr = new WebviewManager();
      expect(mgr.isActive()).toBe(false);
    });
  });

  describe('Property: Configuration Change Detection', () => {
    /**
     * Requirement 3.10: Configuration changes SHALL CONTINUE TO invalidate cache
     *
     * registerConfigurationListener() is currently a no-op.
     * handleConfigurationChange() invalidates cache and reinitializes watcher.
     * Both must remain callable without errors after fixes.
     */
    it('should register configuration listener without errors', () => {
      const controller = new ExtensionController();
      const registerConfigurationListener = (controller as any).registerConfigurationListener.bind(controller);

      expect(() => registerConfigurationListener()).not.toThrow();
    });

    it('should handle configuration change without errors', async () => {
      const controller = new ExtensionController();
      const handleConfigurationChange = (controller as any).handleConfigurationChange.bind(controller);

      await expect(handleConfigurationChange()).resolves.not.toThrow();
    });
  });

  describe('Property: MemoryManager Monitoring and Stats', () => {
    /**
     * MemoryManager has monitoring and stats functionality beyond releaseMemory().
     * These must be preserved after the releaseMemory timing fix.
     */
    it('should return valid memory snapshots', () => {
      const mgr = new MemoryManager();
      const snapshot = mgr.getMemorySnapshot();

      expect(snapshot.heapUsed).toBeGreaterThan(0);
      expect(snapshot.heapTotal).toBeGreaterThan(0);
      expect(snapshot.rss).toBeGreaterThan(0);
      expect(snapshot.timestamp).toBeGreaterThan(0);
    });

    it('should track memory increase from baseline', () => {
      const mgr = new MemoryManager();
      mgr.setBaseline();
      const increase = mgr.getMemoryIncreaseMB();

      // Increase should be a non-negative number
      expect(increase).toBeGreaterThanOrEqual(0);
    });

    it('should start and stop monitoring without errors', () => {
      const mgr = new MemoryManager();
      const stop = mgr.startAnalysisMonitoring();

      expect(typeof stop).toBe('function');
      stop();

      // Double-stop should not throw
      expect(() => mgr.stopMonitoring()).not.toThrow();
    });

    it('should dispose cleanly', () => {
      const mgr = new MemoryManager();
      mgr.setBaseline();
      const stop = mgr.startAnalysisMonitoring();

      expect(() => {
        stop();
        mgr.dispose();
      }).not.toThrow();
    });
  });
});
