/**
 * Property-based tests for FileScanner
 * Tests universal properties using randomized inputs
 */

import * as fc from 'fast-check';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileScanner, ScanOptions } from '../FileScanner';
import { Language } from '../../types';

// Mock fs module
jest.mock('fs/promises');

describe('FileScanner Property-Based Tests', () => {
  let scanner: FileScanner;
  const mockFs = fs as jest.Mocked<typeof fs>;
  
  beforeEach(() => {
    scanner = new FileScanner();
    jest.clearAllMocks();
  });
  
  // Feature: ai-architecture-diagram-extension, Property 23: File Pattern Filtering
  describe('Property 23: File Pattern Filtering', () => {
    it('should analyze only files matching include patterns and not matching exclude patterns', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryFileSet(),
          arbitraryPatterns(),
          async (fileSet, patterns) => {
            const rootPath = '/test-project';
            
            // Mock file system with generated files
            mockFs.readdir.mockImplementation(async (dirPath: any) => {
              if (dirPath === rootPath) {
                return fileSet.files.map(f => ({
                  name: f.name,
                  isFile: () => true,
                  isDirectory: () => false,
                })) as any;
              }
              return [];
            });
            
            const options: ScanOptions = {
              includePatterns: patterns.include,
              excludePatterns: patterns.exclude,
              maxFiles: 1000,
              maxDepth: 10,
              respectGitignore: false,
            };
            
            const result = await scanner.scan(rootPath, options);
            
            // Property: Every file in result should match include patterns (if specified)
            if (patterns.include.length > 0) {
              for (const scannedFile of result.files) {
                const matchesInclude = patterns.include.some(pattern =>
                  matchesGlobPattern(scannedFile.path, pattern)
                );
                expect(matchesInclude).toBe(true);
              }
            }
            
            // Property: No file in result should match exclude patterns
            for (const scannedFile of result.files) {
              const matchesExclude = patterns.exclude.some(pattern =>
                matchesGlobPattern(scannedFile.path, pattern)
              );
              expect(matchesExclude).toBe(false);
            }
            
            // Property: Files excluded by patterns should not appear in results
            for (const file of fileSet.files) {
              const shouldBeExcluded = patterns.exclude.some(pattern =>
                matchesGlobPattern(file.name, pattern)
              );
              
              const shouldBeIncluded = patterns.include.length === 0 ||
                patterns.include.some(pattern =>
                  matchesGlobPattern(file.name, pattern)
                );
              
              const isInResults = result.files.some(f => f.path === file.name);
              
              if (shouldBeExcluded || !shouldBeIncluded) {
                expect(isInResults).toBe(false);
              }
            }
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
 * Generate a random set of files with various extensions
 */
function arbitraryFileSet() {
  return fc.record({
    files: fc.array(
      fc.record({
        name: fc.oneof(
          // Python files
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.py`),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.pyw`),
          
          // JavaScript files
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.js`),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.jsx`),
          
          // TypeScript files
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.ts`),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.tsx`),
          
          // Java files
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.java`),
          
          // Go files
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.go`),
          
          // Test files (common pattern to exclude)
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.test.ts`),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.spec.js`),
          
          // Build artifacts (common pattern to exclude)
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.min.js`),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => `${s}.bundle.js`)
        ),
        language: fc.constantFrom(
          Language.Python,
          Language.JavaScript,
          Language.TypeScript,
          Language.Java,
          Language.Go
        ),
      }),
      { minLength: 1, maxLength: 50 }
    ),
  });
}

/**
 * Generate random include/exclude patterns
 */
function arbitraryPatterns() {
  return fc.record({
    include: fc.oneof(
      // No include patterns (include everything)
      fc.constant([]),
      
      // Single language patterns
      fc.constantFrom(
        ['**/*.py'],
        ['**/*.ts'],
        ['**/*.js'],
        ['**/*.java'],
        ['**/*.go']
      ),
      
      // Multiple language patterns
      fc.constantFrom(
        ['**/*.py', '**/*.ts'],
        ['**/*.js', '**/*.jsx'],
        ['**/*.ts', '**/*.tsx']
      ),
      
      // Specific file patterns
      fc.array(
        fc.oneof(
          fc.constant('*.py'),
          fc.constant('*.ts'),
          fc.constant('*.js'),
          fc.constant('src/**/*.ts'),
          fc.constant('lib/**/*.js')
        ),
        { maxLength: 3 }
      )
    ),
    
    exclude: fc.oneof(
      // No exclude patterns
      fc.constant([]),
      
      // Common exclude patterns
      fc.constantFrom(
        ['**/*.test.ts'],
        ['**/*.spec.js'],
        ['**/*.min.js'],
        ['**/*.bundle.js'],
        ['**/test/**'],
        ['**/tests/**']
      ),
      
      // Multiple exclude patterns
      fc.array(
        fc.oneof(
          fc.constant('**/*.test.ts'),
          fc.constant('**/*.spec.js'),
          fc.constant('**/*.min.js'),
          fc.constant('**/node_modules/**'),
          fc.constant('**/dist/**'),
          fc.constant('**/build/**')
        ),
        { minLength: 1, maxLength: 5 }
      )
    ),
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple glob pattern matching for validation
 * Matches the logic in FileScanner.matchGlobPattern
 */
function matchesGlobPattern(filePath: string, pattern: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const normalizedPattern = pattern.replace(/\\/g, '/');
  
  // Handle leading **/ - should match zero or more path segments
  if (normalizedPattern.startsWith('**/')) {
    const rest = normalizedPattern.substring(3);
    return matchesGlobPattern(normalizedPath, rest) || 
           (normalizedPath.includes('/') && 
            matchesGlobPattern(normalizedPath.substring(normalizedPath.indexOf('/') + 1), normalizedPattern));
  }
  
  // Handle trailing /** - should match the directory and everything under it
  if (normalizedPattern.endsWith('/**')) {
    const prefix = normalizedPattern.substring(0, normalizedPattern.length - 3);
    return normalizedPath === prefix || normalizedPath.startsWith(prefix + '/');
  }
  
  // Convert glob pattern to regex
  let regexPattern = normalizedPattern
    // Escape special regex characters except * and ?
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // Replace ** with placeholder
    .replace(/\*\*/g, '__DOUBLESTAR__')
    // Replace * with regex for any characters except /
    .replace(/\*/g, '[^/]*')
    // Replace ? with regex for single character
    .replace(/\?/g, '[^/]')
    // Replace placeholder with regex for any characters including /
    .replace(/__DOUBLESTAR__/g, '.*');
  
  // Add anchors
  regexPattern = `^${regexPattern}$`;
  
  const regex = new RegExp(regexPattern);
  return regex.test(normalizedPath);
}
