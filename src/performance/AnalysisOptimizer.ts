/**
 * AnalysisOptimizer - Optimize analysis performance
 * Requirements: 1.5, 9.3
 *
 * Responsibilities:
 * - Use async batching for parallel file parsing
 * - Implement incremental parsing for file updates
 * - Batch file system operations
 * - Optimize AST traversal algorithms
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * File batch for processing
 */
export interface FileBatch {
  files: string[];
  batchIndex: number;
}

/**
 * Parse result from worker
 */
export interface ParseResult {
  filePath: string;
  success: boolean;
  ast?: any;
  error?: string;
}

/**
 * Incremental parse cache entry
 */
interface IncrementalCacheEntry {
  filePath: string;
  content: string;
  contentHash: string;
  ast: any;
  timestamp: number;
}

/**
 * Analysis optimizer for performance improvements
 */
export class AnalysisOptimizer {
  private incrementalCache: Map<string, IncrementalCacheEntry> = new Map();
  private readonly DEFAULT_BATCH_SIZE = 10;

  constructor() {
    // Worker thread support removed - using async batching only
  }

  /**
   * Parse files in parallel using async batching
   * Requirements: 9.3
   * 
   * @param files Array of file paths to parse
   * @param parseFunction Function to parse a single file
   * @returns Array of parse results
   */
  async parseFilesInParallel<T>(
    files: string[],
    parseFunction: (filePath: string) => Promise<T>
  ): Promise<T[]> {
    // Use async batching for all file parsing
    return this.parseWithAsyncBatching(files, parseFunction);
  }

  /**
   * Parse files using async batching (fallback when workers not available)
   * Requirements: 9.3
   */
  private async parseWithAsyncBatching<T>(
    files: string[],
    parseFunction: (filePath: string) => Promise<T>
  ): Promise<T[]> {
    const results: T[] = [];
    const batches = this.createBatches(files, this.DEFAULT_BATCH_SIZE);

    for (const batch of batches) {
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.files.map(file => parseFunction(file))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Create batches from file list
   */
  private createBatches(files: string[], batchSize: number): FileBatch[] {
    const batches: FileBatch[] = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push({
        files: files.slice(i, i + batchSize),
        batchIndex: Math.floor(i / batchSize)
      });
    }

    return batches;
  }

  /**
   * Implement incremental parsing for file updates
   * Requirements: 9.3
   * 
   * @param filePath Path to file
   * @param content File content
   * @param parseFunction Function to parse file content
   * @returns Parse result (from cache if unchanged)
   */
  async parseIncremental<T>(
    filePath: string,
    content: string,
    parseFunction: (content: string) => Promise<T>
  ): Promise<T> {
    const contentHash = this.hashContent(content);
    const cached = this.incrementalCache.get(filePath);

    // Check if content unchanged
    if (cached && cached.contentHash === contentHash) {
      return cached.ast as T;
    }

    // Parse file
    const ast = await parseFunction(content);

    // Cache result
    this.incrementalCache.set(filePath, {
      filePath,
      content,
      contentHash,
      ast,
      timestamp: Date.now()
    });

    return ast;
  }

  /**
   * Hash content for incremental parsing
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Batch file system operations
   * Requirements: 9.3
   * 
   * @param filePaths Array of file paths to read
   * @returns Map of file path to content
   */
  async batchReadFiles(filePaths: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const batches = this.createBatches(filePaths, this.DEFAULT_BATCH_SIZE);

    for (const batch of batches) {
      // Read batch in parallel
      const batchResults = await Promise.all(
        batch.files.map(async (filePath) => {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            return { filePath, content, success: true };
          } catch (error) {
            console.error(`Failed to read ${filePath}:`, error);
            return { filePath, content: '', success: false };
          }
        })
      );

      // Add successful reads to results
      for (const result of batchResults) {
        if (result.success) {
          results.set(result.filePath, result.content);
        }
      }
    }

    return results;
  }

  /**
   * Batch file stat operations
   * Requirements: 9.3
   * 
   * @param filePaths Array of file paths to stat
   * @returns Map of file path to stats
   */
  async batchStatFiles(filePaths: string[]): Promise<Map<string, { mtimeMs: number; size: number }>> {
    const results = new Map<string, { mtimeMs: number; size: number }>();
    const batches = this.createBatches(filePaths, this.DEFAULT_BATCH_SIZE);

    for (const batch of batches) {
      // Stat batch in parallel
      const batchResults = await Promise.all(
        batch.files.map(async (filePath) => {
          try {
            const stats = await fs.stat(filePath);
            return {
              filePath,
              stats: { mtimeMs: stats.mtimeMs, size: stats.size },
              success: true
            };
          } catch (error) {
            return { filePath, stats: null, success: false };
          }
        })
      );

      // Add successful stats to results
      for (const result of batchResults) {
        if (result.success && result.stats) {
          results.set(result.filePath, result.stats);
        }
      }
    }

    return results;
  }

  /**
   * Optimize AST traversal by caching node lookups
   * Requirements: 9.3
   */
  createASTTraversalCache(): ASTTraversalCache {
    return new ASTTraversalCache();
  }

  /**
   * Clear incremental cache
   */
  clearIncrementalCache(): void {
    this.incrementalCache.clear();
  }

  /**
   * Clear incremental cache for specific file
   */
  clearIncrementalCacheForFile(filePath: string): void {
    this.incrementalCache.delete(filePath);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    incrementalCacheSize: number;
    incrementalCacheEntries: number;
  } {
    let totalSize = 0;
    for (const entry of this.incrementalCache.values()) {
      totalSize += entry.content.length;
    }

    return {
      incrementalCacheSize: totalSize,
      incrementalCacheEntries: this.incrementalCache.size
    };
  }

  /**
   * Dispose and clean up resources
   */
  dispose(): void {
    this.incrementalCache.clear();
  }
}

/**
 * AST traversal cache for optimizing node lookups
 */
export class ASTTraversalCache {
  private nodesByType: Map<string, any[]> = new Map();
  private nodesByName: Map<string, any[]> = new Map();

  /**
   * Index AST nodes by type and name
   */
  indexAST(ast: any): void {
    this.nodesByType.clear();
    this.nodesByName.clear();

    if (!ast || !ast.rootNode) {
      return;
    }

    this.traverseAndIndex(ast.rootNode);
  }

  /**
   * Traverse AST and build indexes
   */
  private traverseAndIndex(node: any): void {
    if (!node) return;

    // Index by type
    const type = node.type;
    if (!this.nodesByType.has(type)) {
      this.nodesByType.set(type, []);
    }
    this.nodesByType.get(type)!.push(node);

    // Index by name if available
    if (node.text) {
      const name = node.text;
      if (!this.nodesByName.has(name)) {
        this.nodesByName.set(name, []);
      }
      this.nodesByName.get(name)!.push(node);
    }

    // Traverse children
    if (node.children) {
      for (const child of node.children) {
        this.traverseAndIndex(child);
      }
    }
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type: string): any[] {
    return this.nodesByType.get(type) || [];
  }

  /**
   * Get nodes by name
   */
  getNodesByName(name: string): any[] {
    return this.nodesByName.get(name) || [];
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.nodesByType.clear();
    this.nodesByName.clear();
  }
}
