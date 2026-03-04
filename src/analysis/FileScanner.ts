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
import type { Dirent } from 'fs';
import * as path from 'path';
import { minimatch } from 'minimatch';
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
    if (this.hasExceededMaxDepth(depth, options, result) || this.hasReachedMaxFiles(options, result)) {
      return;
    }

    const entries = await this.readDirectoryEntries(currentPath);
    if (!entries) {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath);

      if (this.shouldSkipEntry(entry, relativePath, options, excludePatterns, result)) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.scanDirectory(rootPath, fullPath, depth + 1, options, excludePatterns, result);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const shouldStopScan = this.processScannedFile(entry.name, relativePath, fullPath, depth, options, result);
      if (shouldStopScan) {
        return;
      }
    }
  }

  private hasExceededMaxDepth(depth: number, options: ScanOptions, result: ScanResult): boolean {
    if (depth <= options.maxDepth) {
      return false;
    }

    result.maxDepthReached = true;
    return true;
  }

  private hasReachedMaxFiles(options: ScanOptions, result: ScanResult): boolean {
    return result.files.length >= options.maxFiles;
  }

  private async readDirectoryEntries(currentPath: string): Promise<Dirent[] | undefined> {
    try {
      return await fs.readdir(currentPath, { withFileTypes: true });
    } catch (error) {
      // Directory not accessible - skip it
      return undefined;
    }
  }

  private shouldSkipEntry(
    entry: Dirent,
    relativePath: string,
    options: ScanOptions,
    excludePatterns: string[],
    result: ScanResult
  ): boolean {
    if (this.shouldExclude(relativePath, excludePatterns)) {
      this.markSkippedEntry(entry, result);
      return true;
    }

    if (options.respectGitignore && this.isGitignored(relativePath)) {
      this.markSkippedEntry(entry, result);
      return true;
    }

    return false;
  }

  private markSkippedEntry(entry: Dirent, result: ScanResult): void {
    if (entry.isFile()) {
      result.totalFiles++;
    }
    result.skippedFiles++;
  }

  private processScannedFile(
    fileName: string,
    relativePath: string,
    fullPath: string,
    depth: number,
    options: ScanOptions,
    result: ScanResult
  ): boolean {
    result.totalFiles++;

    const language = this.detectLanguage(fileName);
    if (language === Language.Unknown) {
      result.skippedFiles++;
      return false;
    }

    if (!this.shouldInclude(relativePath, options.includePatterns)) {
      result.skippedFiles++;
      return false;
    }

    if (this.hasReachedMaxFiles(options, result)) {
      return true;
    }

    result.files.push({
      path: relativePath,
      absolutePath: fullPath,
      language,
      depth,
    });
    return false;
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
   * Simple glob pattern matching using minimatch library
   * Supports: *, **, ?, and basic path matching
   */
  private matchGlobPattern(filePath: string, pattern: string): boolean {
    return minimatch(filePath, pattern, { dot: true });
  }
}
