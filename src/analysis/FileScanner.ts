/**
 * FileScanner - Scans file system for source files to analyze
 * Requirements: 1.1, 8.4, 12.1
 * 
 * Responsibilities:
 * - Scan directories with glob pattern support
 * - Detect programming language from file extensions
 * - Filter files based on include/exclude patterns
 * - Respect .gitignore files
 * - Enforce file count and depth limits
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Language } from '../types';

export interface ScanResult {
  files: ScannedFile[];
  totalFiles: number;
  skippedFiles: number;
  maxDepthReached: boolean;
}

export interface ScannedFile {
  path: string;
  absolutePath: string;
  language: Language;
  depth: number;
}

export interface ScanOptions {
  includePatterns: string[];
  excludePatterns: string[];
  maxFiles: number;
  maxDepth: number;
  respectGitignore: boolean;
}

/**
 * Maps file extensions to programming languages
 */
const EXTENSION_TO_LANGUAGE: Record<string, Language> = {
  // Python
  '.py': Language.Python,
  '.pyw': Language.Python,
  '.pyi': Language.Python,
  
  // JavaScript
  '.js': Language.JavaScript,
  '.jsx': Language.JavaScript,
  '.mjs': Language.JavaScript,
  '.cjs': Language.JavaScript,
  
  // TypeScript
  '.ts': Language.TypeScript,
  '.tsx': Language.TypeScript,
  '.mts': Language.TypeScript,
  '.cts': Language.TypeScript,
  
  // Java
  '.java': Language.Java,
  
  // Go
  '.go': Language.Go,
};

/**
 * Default patterns to exclude from scanning
 */
const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.venv/**',
  '**/venv/**',
  '**/__pycache__/**',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/coverage/**',
  '**/.next/**',
  '**/.nuxt/**',
];

export class FileScanner {
  private gitignorePatterns: Set<string> = new Set();
  
  /**
   * Scan a directory for source files
   * @param rootPath Root directory to scan
   * @param options Scan configuration options
   * @returns Scan results with discovered files
   */
  async scan(rootPath: string, options: ScanOptions): Promise<ScanResult> {
    const result: ScanResult = {
      files: [],
      totalFiles: 0,
      skippedFiles: 0,
      maxDepthReached: false,
    };
    
    // Load .gitignore if requested
    if (options.respectGitignore) {
      await this.loadGitignore(rootPath);
    }
    
    // Merge default and custom exclude patterns
    const excludePatterns = [
      ...DEFAULT_EXCLUDE_PATTERNS,
      ...options.excludePatterns,
    ];
    
    // Scan directory recursively
    await this.scanDirectory(
      rootPath,
      rootPath,
      0,
      options,
      excludePatterns,
      result
    );
    
    return result;
  }
  
  /**
   * Detect programming language from file extension
   * @param filePath Path to the file
   * @returns Detected language or Unknown
   */
  detectLanguage(filePath: string): Language {
    const ext = path.extname(filePath).toLowerCase();
    return EXTENSION_TO_LANGUAGE[ext] || Language.Unknown;
  }
  
  /**
   * Load .gitignore patterns from root directory
   */
  private async loadGitignore(rootPath: string): Promise<void> {
    this.gitignorePatterns.clear();
    
    const gitignorePath = path.join(rootPath, '.gitignore');
    
    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      const lines = content.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }
        
        this.gitignorePatterns.add(trimmed);
      }
    } catch (error) {
      // .gitignore doesn't exist or can't be read - continue without it
    }
  }
  
  /**
   * Recursively scan a directory
   */
  private async scanDirectory(
    rootPath: string,
    currentPath: string,
    depth: number,
    options: ScanOptions,
    excludePatterns: string[],
    result: ScanResult
  ): Promise<void> {
    // Check depth limit
    if (depth > options.maxDepth) {
      result.maxDepthReached = true;
      return;
    }
    
    // Check file count limit
    if (result.files.length >= options.maxFiles) {
      return;
    }
    
    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      // Directory not accessible - skip it
      return;
    }
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);
      
      // Check if path should be excluded (check early for directories)
      if (this.shouldExclude(relativePath, excludePatterns)) {
        if (entry.isFile()) {
          result.totalFiles++;
        }
        result.skippedFiles++;
        continue;
      }
      
      // Check gitignore patterns (check early for directories)
      if (options.respectGitignore && this.isGitignored(relativePath)) {
        if (entry.isFile()) {
          result.totalFiles++;
        }
        result.skippedFiles++;
        continue;
      }
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectory
        await this.scanDirectory(
          rootPath,
          fullPath,
          depth + 1,
          options,
          excludePatterns,
          result
        );
      } else if (entry.isFile()) {
        result.totalFiles++;
        
        // Detect language
        const language = this.detectLanguage(entry.name);
        
        // Check if language is supported
        if (language === Language.Unknown) {
          result.skippedFiles++;
          continue;
        }
        
        // Check include patterns
        if (!this.shouldInclude(relativePath, options.includePatterns)) {
          result.skippedFiles++;
          continue;
        }
        
        // Check file count limit
        if (result.files.length >= options.maxFiles) {
          return;
        }
        
        // Add file to results
        result.files.push({
          path: relativePath,
          absolutePath: fullPath,
          language,
          depth,
        });
      }
    }
  }
  
  /**
   * Check if a path should be excluded based on patterns
   */
  private shouldExclude(relativePath: string, patterns: string[]): boolean {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    for (const pattern of patterns) {
      const normalizedPattern = pattern.replace(/\\/g, '/');
      
      if (this.matchGlobPattern(normalizedPath, normalizedPattern)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a path should be included based on patterns
   */
  private shouldInclude(relativePath: string, patterns: string[]): boolean {
    // If no include patterns specified, include everything
    if (patterns.length === 0) {
      return true;
    }
    
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    for (const pattern of patterns) {
      const normalizedPattern = pattern.replace(/\\/g, '/');
      
      if (this.matchGlobPattern(normalizedPath, normalizedPattern)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a path matches a gitignore pattern
   */
  private isGitignored(relativePath: string): boolean {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    
    for (const pattern of this.gitignorePatterns) {
      const normalizedPattern = pattern.replace(/\\/g, '/');
      
      if (this.matchGlobPattern(normalizedPath, normalizedPattern)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Simple glob pattern matching
   * Supports: *, **, ?, and basic path matching
   */
  private matchGlobPattern(filePath: string, pattern: string): boolean {
    // Handle leading **/ - should match zero or more path segments
    if (pattern.startsWith('**/')) {
      const rest = pattern.substring(3);
      // Try matching with and without prefix
      return this.matchGlobPattern(filePath, rest) || 
             filePath.includes('/') && this.matchGlobPattern(filePath.substring(filePath.indexOf('/') + 1), pattern);
    }
    
    // Handle trailing /** - should match the directory and everything under it
    if (pattern.endsWith('/**')) {
      const prefix = pattern.substring(0, pattern.length - 3);
      return filePath === prefix || filePath.startsWith(prefix + '/');
    }
    
    // Convert glob pattern to regex
    let regexPattern = pattern
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
    return regex.test(filePath);
  }
}
