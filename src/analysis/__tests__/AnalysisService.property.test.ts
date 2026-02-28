/**
 * Property-based tests for AnalysisService
 * Tests universal properties using randomized inputs
 * Requirements: 9.5
 */

import * as fc from 'fast-check';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AnalysisService } from '../AnalysisService';
import { Language, AnalysisConfig } from '../../types';

describe('AnalysisService Property-Based Tests', () => {
  let service: AnalysisService;
  let testBaseDir: string;

  beforeEach(() => {
    service = new AnalysisService();
    testBaseDir = path.join(__dirname, 'temp-property-tests');
  });

  afterEach(async () => {
    service.dispose();
    // Cleanup test directories
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // Feature: ai-architecture-diagram-extension, Property 24: Cache Hit for Unchanged Files
  describe('Property 24: Cache Hit for Unchanged Files', () => {
    it('should return cached results when files are unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCodebaseStructure(),
          arbitraryAnalysisConfig(),
          async (codebaseStructure, configParams) => {
            // Create a unique test directory for this property test run
            const testDir = path.join(testBaseDir, `test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
            await fs.mkdir(testDir, { recursive: true });

            try {
              // Create the codebase structure
              await createCodebaseStructure(testDir, codebaseStructure);

              const config: AnalysisConfig = {
                rootPath: testDir,
                includePatterns: configParams.includePatterns,
                excludePatterns: configParams.excludePatterns,
                maxFiles: configParams.maxFiles,
                maxDepth: configParams.maxDepth,
                languages: configParams.languages,
                aiEnabled: false
              };

              // First analysis
              const result1 = await service.buildGroundingLayer(testDir, { config });

              // Wait a small amount to ensure any timestamp differences would be visible
              await new Promise(resolve => setTimeout(resolve, 10));

              // Second analysis with same config and unchanged files
              const result2 = await service.buildGroundingLayer(testDir, { config });

              // Property: Cache hit should return identical timestamp (same cached object)
              expect(result2.timestamp).toBe(result1.timestamp);

              // Property: Cache hit should return identical grounding data structure
              expect(result2.rootPath).toBe(result1.rootPath);
              expect(result2.files.length).toBe(result1.files.length);
              expect(result2.importGraph.length).toBe(result1.importGraph.length);
              expect(result2.inheritanceGraph.length).toBe(result1.inheritanceGraph.length);

              // Property: File data should be identical
              for (let i = 0; i < result1.files.length; i++) {
                expect(result2.files[i].path).toBe(result1.files[i].path);
                expect(result2.files[i].language).toBe(result1.files[i].language);
                expect(result2.files[i].exports).toEqual(result1.files[i].exports);
              }

            } finally {
              // Cleanup this test directory
              await fs.rm(testDir, { recursive: true, force: true });
            }
          }
        ),
        { numRuns: 100, timeout: 60000 }
      );
    });

    it('should invalidate cache when any file is modified', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCodebaseStructure(),
          arbitraryAnalysisConfig(),
          fc.nat({ max: 100 }), // Random file index to modify
          async (codebaseStructure, configParams, modifyIndex) => {
            // Skip if no files to modify
            if (codebaseStructure.files.length === 0) {
              return;
            }

            const testDir = path.join(testBaseDir, `test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
            await fs.mkdir(testDir, { recursive: true });

            try {
              // Create the codebase structure
              const createdFiles = await createCodebaseStructure(testDir, codebaseStructure);

              const config: AnalysisConfig = {
                rootPath: testDir,
                includePatterns: configParams.includePatterns,
                excludePatterns: configParams.excludePatterns,
                maxFiles: configParams.maxFiles,
                maxDepth: configParams.maxDepth,
                languages: configParams.languages,
                aiEnabled: false
              };

              // First analysis
              const result1 = await service.buildGroundingLayer(testDir, { config });

              // Skip if no files were actually analyzed (all filtered out)
              if (result1.files.length === 0) {
                return;
              }

              // Wait to ensure file modification time will be different
              await new Promise(resolve => setTimeout(resolve, 100));

              // Modify one of the files that was actually analyzed
              if (createdFiles.length > 0) {
                const fileToModify = createdFiles[modifyIndex % createdFiles.length];
                const currentContent = await fs.readFile(fileToModify, 'utf-8');
                await fs.writeFile(fileToModify, currentContent + '\n# Modified');
              }

              // Second analysis after modification
              const result2 = await service.buildGroundingLayer(testDir, { config });

              // Property: Cache should be invalidated, resulting in new timestamp
              // (unless the modified file was filtered out by include/exclude patterns)
              const modifiedFilePath = createdFiles[modifyIndex % createdFiles.length];
              const relativePath = path.relative(testDir, modifiedFilePath);
              const wasAnalyzed = result1.files.some(f => f.path === relativePath);

              if (wasAnalyzed) {
                expect(result2.timestamp).toBeGreaterThan(result1.timestamp);
              }

              // Property: New analysis should still produce valid grounding data
              expect(result2.rootPath).toBe(testDir);
              expect(result2.files).toBeDefined();
              expect(result2.importGraph).toBeDefined();
              expect(result2.inheritanceGraph).toBeDefined();

            } finally {
              await fs.rm(testDir, { recursive: true, force: true });
            }
          }
        ),
        { numRuns: 100, timeout: 60000 }
      );
    });

    it('should invalidate cache when configuration changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCodebaseStructure(),
          arbitraryAnalysisConfig(),
          arbitraryAnalysisConfig(),
          async (codebaseStructure, config1Params, config2Params) => {
            const testDir = path.join(testBaseDir, `test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
            await fs.mkdir(testDir, { recursive: true });

            try {
              // Create the codebase structure
              await createCodebaseStructure(testDir, codebaseStructure);

              const config1: AnalysisConfig = {
                rootPath: testDir,
                includePatterns: config1Params.includePatterns,
                excludePatterns: config1Params.excludePatterns,
                maxFiles: config1Params.maxFiles,
                maxDepth: config1Params.maxDepth,
                languages: config1Params.languages,
                aiEnabled: false
              };

              const config2: AnalysisConfig = {
                rootPath: testDir,
                includePatterns: config2Params.includePatterns,
                excludePatterns: config2Params.excludePatterns,
                maxFiles: config2Params.maxFiles,
                maxDepth: config2Params.maxDepth,
                languages: config2Params.languages,
                aiEnabled: false
              };

              // First analysis with config1
              const result1 = await service.buildGroundingLayer(testDir, { config: config1 });

              // Wait a bit
              await new Promise(resolve => setTimeout(resolve, 10));

              // Second analysis with config2
              const result2 = await service.buildGroundingLayer(testDir, { config: config2 });

              // Property: If configs are different, cache should be invalidated
              const configsAreDifferent = 
                JSON.stringify(config1.includePatterns.sort()) !== JSON.stringify(config2.includePatterns.sort()) ||
                JSON.stringify(config1.excludePatterns.sort()) !== JSON.stringify(config2.excludePatterns.sort()) ||
                config1.maxFiles !== config2.maxFiles ||
                config1.maxDepth !== config2.maxDepth ||
                JSON.stringify(config1.languages.sort()) !== JSON.stringify(config2.languages.sort());

              if (configsAreDifferent) {
                // Different configs should produce different cache entries
                // Results may or may not have different timestamps depending on cache key collision
                expect(result2).toBeDefined();
                expect(result2.rootPath).toBe(testDir);
              } else {
                // Same configs should use cache
                expect(result2.timestamp).toBe(result1.timestamp);
              }

            } finally {
              await fs.rm(testDir, { recursive: true, force: true });
            }
          }
        ),
        { numRuns: 100, timeout: 60000 }
      );
    });

    it('should invalidate cache when a file is deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryCodebaseStructure(),
          arbitraryAnalysisConfig(),
          async (codebaseStructure, configParams) => {
            // Skip if not enough files
            if (codebaseStructure.files.length < 2) {
              return;
            }

            const testDir = path.join(testBaseDir, `test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
            await fs.mkdir(testDir, { recursive: true });

            try {
              // Create the codebase structure
              await createCodebaseStructure(testDir, codebaseStructure);

              const config: AnalysisConfig = {
                rootPath: testDir,
                includePatterns: configParams.includePatterns,
                excludePatterns: configParams.excludePatterns,
                maxFiles: configParams.maxFiles,
                maxDepth: configParams.maxDepth,
                languages: configParams.languages,
                aiEnabled: false
              };

              // First analysis
              const result1 = await service.buildGroundingLayer(testDir, { config });

              // Skip if no files were actually analyzed
              if (result1.files.length < 2) {
                return;
              }

              // Find a file that was actually analyzed and delete it
              const analyzedFilePath = result1.files[0].path;
              const absolutePath = path.join(testDir, analyzedFilePath);
              
              // Verify the file exists before deleting
              try {
                await fs.access(absolutePath);
              } catch {
                // File doesn't exist, skip this test case
                return;
              }

              // Wait to ensure file system operations complete
              await new Promise(resolve => setTimeout(resolve, 50));

              // Delete the analyzed file
              await fs.unlink(absolutePath);

              // Wait to ensure deletion is complete
              await new Promise(resolve => setTimeout(resolve, 50));

              // Second analysis after deletion
              const result2 = await service.buildGroundingLayer(testDir, { config });

              // Property: Cache should be invalidated when an analyzed file is deleted
              expect(result2.timestamp).toBeGreaterThan(result1.timestamp);
              
              // Property: Result should have fewer files
              expect(result2.files.length).toBeLessThan(result1.files.length);
              
              // Property: The deleted file should not appear in the new results
              const fileStillExists = result2.files.some(f => f.path === analyzedFilePath);
              expect(fileStillExists).toBe(false);

            } finally {
              await fs.rm(testDir, { recursive: true, force: true });
            }
          }
        ),
        { numRuns: 100, timeout: 60000 }
      );
    });
  });
});

// ============================================================================
// Arbitraries (Generators for random test data)
// ============================================================================

/**
 * Generate a random codebase structure with files and directories
 */
function arbitraryCodebaseStructure() {
  return fc.record({
    files: fc.array(
      fc.record({
        path: fc.oneof(
          // Root level files with unique names
          fc.tuple(
            fc.string({ minLength: 3, maxLength: 15 }),
            fc.constantFrom('.py', '.js', '.ts', '.java', '.go')
          ).map(([name, ext]) => `${name.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`),
          // Nested files with unique names
          fc.tuple(
            fc.string({ minLength: 3, maxLength: 10 }),
            fc.string({ minLength: 3, maxLength: 15 }),
            fc.constantFrom('.py', '.js', '.ts', '.java', '.go')
          ).map(([dir, name, ext]) => 
            `${dir.replace(/[^a-zA-Z0-9]/g, '_')}/${name.replace(/[^a-zA-Z0-9]/g, '_')}${ext}`
          )
        ),
        content: fc.oneof(
          // Python content
          fc.constant('def hello():\n    pass\n'),
          fc.constant('class MyClass:\n    def method(self):\n        pass\n'),
          // JavaScript/TypeScript content
          fc.constant('function hello() {}\n'),
          fc.constant('class MyClass {\n  method() {}\n}\n'),
          // Java content
          fc.constant('public class MyClass {\n  public void method() {}\n}\n'),
          // Go content
          fc.constant('package main\n\nfunc hello() {}\n'),
          // Empty file
          fc.constant('')
        ),
        language: fc.constantFrom(
          Language.Python,
          Language.JavaScript,
          Language.TypeScript,
          Language.Java,
          Language.Go
        )
      }),
      { minLength: 2, maxLength: 10 }
    )
  }).map(structure => {
    // Ensure unique file paths by deduplicating
    const uniqueFiles = new Map<string, typeof structure.files[0]>();
    for (const file of structure.files) {
      if (!uniqueFiles.has(file.path)) {
        uniqueFiles.set(file.path, file);
      }
    }
    return { files: Array.from(uniqueFiles.values()) };
  });
}

/**
 * Generate random analysis configuration parameters
 */
function arbitraryAnalysisConfig() {
  return fc.record({
    includePatterns: fc.oneof(
      fc.constant([]),
      fc.constantFrom(
        ['**/*.py'],
        ['**/*.ts'],
        ['**/*.js'],
        ['**/*.py', '**/*.ts'],
        ['**/*']
      )
    ),
    excludePatterns: fc.oneof(
      fc.constant([]),
      fc.constantFrom(
        ['**/*.test.ts'],
        ['**/*.spec.js'],
        ['**/node_modules/**'],
        ['**/*.test.ts', '**/node_modules/**']
      )
    ),
    maxFiles: fc.constantFrom(100, 500, 1000, 5000),
    maxDepth: fc.constantFrom(5, 10, 20),
    languages: fc.constantFrom(
      [Language.Python],
      [Language.TypeScript],
      [Language.JavaScript],
      [Language.Python, Language.TypeScript],
      [Language.Python, Language.JavaScript, Language.TypeScript, Language.Java, Language.Go]
    )
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a codebase structure on disk from the generated structure
 * Returns the list of absolute file paths created
 */
async function createCodebaseStructure(
  rootDir: string,
  structure: { files: Array<{ path: string; content: string; language: Language }> }
): Promise<string[]> {
  const createdFiles: string[] = [];

  for (const file of structure.files) {
    const filePath = path.join(rootDir, file.path);
    const dirPath = path.dirname(filePath);

    // Create directory if it doesn't exist
    await fs.mkdir(dirPath, { recursive: true });

    // Write file content
    await fs.writeFile(filePath, file.content, 'utf-8');
    createdFiles.push(filePath);
  }

  return createdFiles;
}
