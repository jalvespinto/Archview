/**
 * Property-based tests for FileWatcher
 * Tests universal properties using randomized inputs
 */

import * as fc from 'fast-check';
import { minimatch } from 'minimatch';
import { FileWatcher, FileWatcherConfig, FileChangeEvent } from '../FileWatcher';

// Type guard to help TypeScript narrow types
function isFileChangeEvent(event: FileChangeEvent | undefined): event is FileChangeEvent {
  return event !== undefined;
}

describe('FileWatcher Property-Based Tests', () => {
  // Feature: ai-architecture-diagram-extension, Property 27: File Change Detection
  describe('Property 27: File Change Detection', () => {
    it('should detect file changes and mark diagram as out of sync when auto-refresh is enabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryFileWatcherConfig({ autoRefresh: true }),
          arbitraryFileChanges(),
          async (config, fileChanges) => {
            const watcher = new FileWatcher(config);
            const workspaceRoot = '/test-workspace';
            
            // Track callback invocations
            let callbackInvoked = false;
            let receivedEvent: FileChangeEvent | undefined = undefined;
            
            const callback = (event: FileChangeEvent) => {
              callbackInvoked = true;
              receivedEvent = event;
            };
            
            // Start watching
            watcher.start(workspaceRoot, callback);
            
            // Simulate file changes
            for (const filePath of fileChanges.files) {
              watcher.triggerFileChange(filePath);
            }
            
            // Flush pending changes immediately instead of waiting
            watcher.flushPendingChanges();
            
            // Property: If files changed and auto-refresh enabled, callback should be invoked
            if (fileChanges.files.length > 0) {
              const nonExcludedFiles = fileChanges.files.filter(f => 
                !shouldBeExcluded(f, config)
              );
              
              if (nonExcludedFiles.length > 0) {
                expect(callbackInvoked).toBe(true);
                expect(receivedEvent).toBeDefined();
                
                // Property: Event should contain all non-excluded changed files
                // Using non-null assertion since we've verified receivedEvent is defined
                const event = receivedEvent!;
                for (const file of nonExcludedFiles) {
                  expect(event.changedFiles.has(file)).toBe(true);
                }
                
                // Property: Event should not contain excluded files
                for (const file of fileChanges.files) {
                  if (shouldBeExcluded(file, config)) {
                    expect(event.changedFiles.has(file)).toBe(false);
                  }
                }
                
                // Property: Event timestamp should be recent
                const now = Date.now();
                expect(event.timestamp).toBeLessThanOrEqual(now);
                expect(event.timestamp).toBeGreaterThan(now - 5000); // Within 5 seconds
              }
            }
            
            // Cleanup
            watcher.stop();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should not invoke callback when auto-refresh is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryFileWatcherConfig({ autoRefresh: false }),
          arbitraryFileChanges(),
          async (config, fileChanges) => {
            const watcher = new FileWatcher(config);
            const workspaceRoot = '/test-workspace';
            
            let callbackInvoked = false;
            const callback = () => {
              callbackInvoked = true;
            };
            
            // Start watching (should not actually start due to autoRefresh: false)
            watcher.start(workspaceRoot, callback);
            
            // Simulate file changes
            for (const filePath of fileChanges.files) {
              watcher.triggerFileChange(filePath);
            }
            
            // Flush pending changes immediately
            watcher.flushPendingChanges();
            
            // Property: Callback should never be invoked when auto-refresh is disabled
            expect(callbackInvoked).toBe(false);
            
            // Cleanup
            watcher.stop();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should debounce multiple rapid file changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryFileWatcherConfig({ autoRefresh: true }),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 20 }),
          async (config, filePaths) => {
            const watcher = new FileWatcher(config);
            const workspaceRoot = '/test-workspace';
            
            let callbackCount = 0;
            const callback = () => {
              callbackCount++;
            };
            
            watcher.start(workspaceRoot, callback);
            
            // Trigger multiple file changes rapidly
            for (const filePath of filePaths) {
              watcher.triggerFileChange(filePath);
              // Small delay between changes (less than debounce period)
              await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Flush pending changes
            watcher.flushPendingChanges();
            
            // Property: Callback should be invoked at most once despite multiple changes
            // (debouncing should consolidate all changes into a single callback)
            // Note: May be 0 if all files are excluded by patterns
            const nonExcludedFiles = filePaths.filter(f => !shouldBeExcluded(f, config));
            if (nonExcludedFiles.length > 0) {
              expect(callbackCount).toBe(1);
            } else {
              expect(callbackCount).toBe(0);
            }
            
            // Cleanup
            watcher.stop();
          }
        ),
        { numRuns: 50 } // Fewer runs due to timing sensitivity
      );
    });
    
    it('should respect include and exclude patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryFileWatcherConfig({ autoRefresh: true }),
          arbitraryFileChangesWithPatterns(),
          async (config, fileChanges) => {
            const watcher = new FileWatcher(config);
            const workspaceRoot = '/test-workspace';
            
            let receivedEvent: FileChangeEvent | undefined = undefined;
            const callback = (event: FileChangeEvent) => {
              receivedEvent = event;
            };
            
            watcher.start(workspaceRoot, callback);
            
            // Trigger file changes
            for (const filePath of fileChanges.files) {
              watcher.triggerFileChange(filePath);
            }
            
            // Flush pending changes
            watcher.flushPendingChanges();
            
            if (receivedEvent) {
              const event: FileChangeEvent = receivedEvent; // Explicit type annotation
              // Property: Only files matching include patterns should be in the event
              for (const file of event.changedFiles) {
                if (config.includePatterns.length > 0) {
                  const matchesInclude = config.includePatterns.some(pattern =>
                    matchesPattern(file, pattern)
                  );
                  expect(matchesInclude).toBe(true);
                }
                
                // Property: No files matching exclude patterns should be in the event
                const matchesExclude = config.excludePatterns.some(pattern =>
                  matchesPattern(file, pattern)
                );
                expect(matchesExclude).toBe(false);
              }
            }
            
            // Cleanup
            watcher.stop();
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should clear changed files after callback', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryFileWatcherConfig({ autoRefresh: true }),
          arbitraryFileChanges(),
          async (config, fileChanges) => {
            const watcher = new FileWatcher(config);
            const workspaceRoot = '/test-workspace';
            
            const callback = () => {
              // Callback invoked
            };
            
            watcher.start(workspaceRoot, callback);
            
            // Trigger file changes
            for (const filePath of fileChanges.files) {
              watcher.triggerFileChange(filePath);
            }
            
            // Flush pending changes
            watcher.flushPendingChanges();
            
            // Property: Changed files should be cleared after callback
            const changedFiles = watcher.getChangedFiles();
            expect(changedFiles.size).toBe(0);
            
            // Cleanup
            watcher.stop();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ============================================================================
// Arbitraries (Generators for random test data)
// ============================================================================

/**
 * Generate random FileWatcher configuration
 */
function arbitraryFileWatcherConfig(overrides?: Partial<FileWatcherConfig>) {
  return fc.record({
    autoRefresh: overrides?.autoRefresh !== undefined 
      ? fc.constant(overrides.autoRefresh)
      : fc.boolean(),
    autoRefreshDebounce: fc.integer({ min: 100, max: 2000 }), // 100ms to 2s for testing
    includePatterns: fc.oneof(
      fc.constant([]),
      fc.constantFrom(
        ['**/*.ts'],
        ['**/*.js'],
        ['**/*.py'],
        ['**/*.ts', '**/*.js'],
        ['src/**/*.ts']
      )
    ),
    excludePatterns: fc.oneof(
      fc.constant([]),
      fc.constantFrom(
        ['**/*.test.ts'],
        ['**/node_modules/**'],
        ['**/*.test.ts', '**/node_modules/**'],
        ['**/dist/**', '**/build/**']
      )
    ),
  });
}

/**
 * Generate random file changes
 */
function arbitraryFileChanges() {
  return fc.record({
    files: fc.array(
      fc.oneof(
        // TypeScript files
        fc.string({ minLength: 1, maxLength: 20 }).map(s => `src/${s}.ts`),
        fc.string({ minLength: 1, maxLength: 20 }).map(s => `src/${s}.tsx`),
        
        // JavaScript files
        fc.string({ minLength: 1, maxLength: 20 }).map(s => `src/${s}.js`),
        fc.string({ minLength: 1, maxLength: 20 }).map(s => `src/${s}.jsx`),
        
        // Python files
        fc.string({ minLength: 1, maxLength: 20 }).map(s => `src/${s}.py`),
        
        // Test files (commonly excluded)
        fc.string({ minLength: 1, maxLength: 20 }).map(s => `src/${s}.test.ts`),
        fc.string({ minLength: 1, maxLength: 20 }).map(s => `src/${s}.spec.js`),
        
        // Node modules (commonly excluded)
        fc.string({ minLength: 1, maxLength: 20 }).map(s => `node_modules/${s}.js`),
        
        // Build artifacts (commonly excluded)
        fc.string({ minLength: 1, maxLength: 20 }).map(s => `dist/${s}.js`),
        fc.string({ minLength: 1, maxLength: 20 }).map(s => `build/${s}.js`)
      ),
      { minLength: 0, maxLength: 10 }
    ),
  });
}

/**
 * Generate file changes with specific patterns
 */
function arbitraryFileChangesWithPatterns() {
  return fc.record({
    files: fc.array(
      fc.oneof(
        fc.constant('src/index.ts'),
        fc.constant('src/utils.js'),
        fc.constant('src/component.tsx'),
        fc.constant('src/test.test.ts'),
        fc.constant('node_modules/package/index.js'),
        fc.constant('dist/bundle.js'),
        fc.constant('lib/helper.py')
      ),
      { minLength: 1, maxLength: 10 }
    ),
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if file should be excluded based on patterns
 */
function shouldBeExcluded(filePath: string, config: FileWatcherConfig): boolean {
  // Check exclude patterns
  for (const pattern of config.excludePatterns) {
    if (matchesPattern(filePath, pattern)) {
      return true;
    }
  }
  
  // Check include patterns (if specified, file must match at least one)
  if (config.includePatterns.length > 0) {
    let matchesInclude = false;
    for (const pattern of config.includePatterns) {
      if (matchesPattern(filePath, pattern)) {
        matchesInclude = true;
        break;
      }
    }
    if (!matchesInclude) {
      return true;
    }
  }
  
  return false;
}

function matchesPattern(filePath: string, pattern: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');
  return minimatch(normalizedPath, normalizedPattern, { dot: true });
}
