/**
 * AnalysisService - Main orchestrator for codebase analysis
 * Requirements: 1.1, 1.5, 9.3, 9.5, 10.3
 * 
 * Responsibilities:
 * - Orchestrate the analysis pipeline: scan → parse → extract → build GroundingData
 * - Produce compact GroundingData structure for LLM consumption
 * - Manage progress tracking with percentage updates
 * - Handle timeout management (120 second max for static analysis)
 * - Support cancellation of long-running operations
 * - Implement result caching keyed by file modification times
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  GroundingData,
  DirectoryNode,
  FileGroundingData,
  ImportEdge,
  InheritanceEdge,
  ClassGroundingData,
  FunctionGroundingData,
  ImportRef
} from '../types/analysis';
import {
  Language,
  AnalysisConfig,
  Component,
  ComponentType,
  Relationship,
  RelationshipType
} from '../types';
import { FileScanner, ScanOptions } from './FileScanner';
import { ParserManager } from './ParserManager';
import { ComponentExtractor } from './ComponentExtractor';
import { RelationshipExtractor } from './RelationshipExtractor';
import { MemoryManager, MemoryLimitExceededError } from '../performance/MemoryManager';
import { AnalysisOptimizer } from '../performance/AnalysisOptimizer';

/**
 * Progress callback for tracking analysis progress
 */
export type ProgressCallback = (percentage: number, message: string) => void;

/**
 * Cancellation token for aborting long-running operations
 */
export interface CancellationToken {
  isCancelled: boolean;
  cancel(): void;
}

/**
 * Cache entry for analysis results
 */
interface CacheEntry {
  groundingData: GroundingData;
  fileModTimes: Map<string, number>;
  timestamp: number;
}

/**
 * Options for building grounding layer
 */
export interface BuildGroundingOptions {
  config: AnalysisConfig;
  progressCallback?: ProgressCallback;
  cancellationToken?: CancellationToken;
  timeoutMs?: number;
}

/**
 * Main analysis service orchestrating the analysis pipeline
 */
export class AnalysisService {
  private fileScanner: FileScanner;
  private parserManager: ParserManager;
  private componentExtractor: ComponentExtractor;
  private relationshipExtractor: RelationshipExtractor;
  private cache: Map<string, CacheEntry>;
  private lastProgressUpdate: number = 0;
  private readonly PROGRESS_UPDATE_INTERVAL_MS = 5000; // 5 seconds
  private memoryManager: MemoryManager;
  private optimizer: AnalysisOptimizer;

  constructor() {
    this.fileScanner = new FileScanner();
    this.parserManager = new ParserManager();
    this.componentExtractor = new ComponentExtractor();
    this.relationshipExtractor = new RelationshipExtractor();
    this.cache = new Map();
    this.memoryManager = new MemoryManager();
    this.optimizer = new AnalysisOptimizer();
  }

  /**
   * Build the Grounding Layer from a codebase
   * Orchestrates: scan → parse → extract → build GroundingData
   * Requirements: 1.1, 1.5, 9.3, 9.5, 10.3
   * 
   * @param rootPath Root directory of the codebase
   * @param options Build options including config, progress callback, cancellation token
   * @returns Compact GroundingData structure ready for LLM consumption
   */
  async buildGroundingLayer(
    rootPath: string,
    options: BuildGroundingOptions
  ): Promise<GroundingData> {
    const {
      config,
      progressCallback,
      cancellationToken,
      timeoutMs = 120000 // 120 seconds default
    } = options;

    const startTime = Date.now();
    this.lastProgressUpdate = startTime;

    // Start memory monitoring (Requirements: 9.1)
    this.memoryManager.setBaseline();
    const stopMonitoring = this.memoryManager.startAnalysisMonitoring((usageMB) => {
      console.warn(`Memory limit exceeded during analysis: ${usageMB.toFixed(2)}MB > 500MB`);
      throw new MemoryLimitExceededError(
        `Analysis memory limit exceeded: ${usageMB.toFixed(2)}MB > 500MB`
      );
    });

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(rootPath, config);
      const cachedResult = await this.checkCache(cacheKey, rootPath);
      if (cachedResult) {
        this.reportProgress(100, 'Using cached analysis results', progressCallback);
        return cachedResult;
      }

      // Initialize parser manager
      await this.parserManager.initialize();

      // Phase 1: Scan file system (10% of progress)
      this.checkCancellation(cancellationToken);
      this.checkTimeout(startTime, timeoutMs, 'File scanning');
      this.reportProgress(0, 'Scanning file system...', progressCallback);

      const scanOptions: ScanOptions = {
        includePatterns: config.includePatterns,
        excludePatterns: config.excludePatterns,
        maxFiles: config.maxFiles,
        maxDepth: config.maxDepth,
        respectGitignore: true
      };

      const scanResult = await this.fileScanner.scan(rootPath, scanOptions);
      this.reportProgress(10, `Found ${scanResult.files.length} files`, progressCallback);

      // Phase 2: Parse files and extract components (10% - 70% of progress)
      this.checkCancellation(cancellationToken);
      this.checkTimeout(startTime, timeoutMs, 'File parsing');

      const allComponents: Component[] = [];
      const allRelationships: Relationship[] = [];
      const fileGroundingDataMap = new Map<string, FileGroundingData>();
      const totalFiles = scanResult.files.length;

      // Batch read files for better performance (Requirements: 9.3)
      const filePaths = scanResult.files.map(f => f.absolutePath);
      const fileContents = await this.optimizer.batchReadFiles(filePaths);

      // Parse files using parallel processing (Requirements: 9.3)
      interface ParseTaskResult {
        scannedFile: any;
        sourceCode: string;
        ast: any;
      }

      const parseResults = await this.optimizer.parseFilesInParallel<ParseTaskResult>(
        scanResult.files.map(f => f.path),
        async (filePath) => {
          const scannedFile = scanResult.files.find(f => f.path === filePath);
          if (!scannedFile) {
            throw new Error(`File not found: ${filePath}`);
          }

          const sourceCode = fileContents.get(scannedFile.absolutePath) || '';
          
          // Use incremental parsing (Requirements: 9.3)
          const ast = await this.optimizer.parseIncremental(
            scannedFile.path,
            sourceCode,
            async (content) => {
              return this.parserManager.parseFile(
                scannedFile.path,
                content,
                scannedFile.language
              );
            }
          );

          return { scannedFile, sourceCode, ast };
        }
      );

      // Process parse results
      for (let i = 0; i < parseResults.length; i++) {
        this.checkCancellation(cancellationToken);
        this.checkTimeout(startTime, timeoutMs, 'File parsing');

        const { scannedFile, sourceCode, ast } = parseResults[i];
        
        // Report progress every 5 seconds or every 10% of files
        const progressPercentage = 10 + Math.floor((i / totalFiles) * 60);
        if (i % Math.max(1, Math.floor(totalFiles / 10)) === 0) {
          this.reportProgress(
            progressPercentage,
            `Processing file ${i + 1}/${totalFiles}: ${scannedFile.path}`,
            progressCallback
          );
        }

        // Skip files with critical parse errors
        if (this.parserManager.hasErrors(ast) && ast.parseErrors.length > 0) {
          // Still create minimal grounding data for the file
          fileGroundingDataMap.set(scannedFile.path, {
            path: scannedFile.path,
            language: scannedFile.language,
            exports: [],
            classes: [],
            topLevelFunctions: [],
            imports: []
          });
          continue;
        }

        // Extract components
        const extractionResult = await this.componentExtractor.extractComponents({
          rootPath,
          filePath: scannedFile.path,
          ast,
          parserManager: this.parserManager
        });

        allComponents.push(...extractionResult.components);

        // Extract relationships
        const relationships = await this.relationshipExtractor.extractRelationships({
          ast,
          components: extractionResult.components,
          parserManager: this.parserManager
        });

        allRelationships.push(...relationships);

        // Build file grounding data
        const fileGrounding = this.buildFileGroundingData(
          scannedFile.path,
          scannedFile.language,
          extractionResult.components,
          ast.sourceCode
        );
        fileGroundingDataMap.set(scannedFile.path, fileGrounding);
      }

      this.reportProgress(70, 'Building grounding data structure...', progressCallback);

      // Phase 3: Build directory tree (70% - 80% of progress)
      this.checkCancellation(cancellationToken);
      this.checkTimeout(startTime, timeoutMs, 'Building directory tree');

      const directoryTree = this.buildDirectoryTree(rootPath, scanResult.files.map(f => f.path));
      this.reportProgress(80, 'Building import graph...', progressCallback);

      // Phase 4: Build import and inheritance graphs (80% - 90% of progress)
      this.checkCancellation(cancellationToken);
      this.checkTimeout(startTime, timeoutMs, 'Building relationship graphs');

      const importGraph = this.buildImportGraph(allRelationships, allComponents);
      this.reportProgress(85, 'Building inheritance graph...', progressCallback);

      const inheritanceGraph = this.buildInheritanceGraph(allRelationships, allComponents);
      this.reportProgress(90, 'Finalizing grounding data...', progressCallback);

      // Phase 5: Assemble final GroundingData (90% - 100% of progress)
      const groundingData: GroundingData = {
        rootPath,
        timestamp: Date.now(),
        directoryTree,
        files: Array.from(fileGroundingDataMap.values()),
        importGraph,
        inheritanceGraph
      };

      // Cache the result
      await this.cacheResult(cacheKey, groundingData, rootPath, scanResult.files.map(f => f.absolutePath));
      this.reportProgress(100, 'Analysis complete', progressCallback);

      return groundingData;

    } catch (error) {
      if (error instanceof TimeoutError) {
        throw error;
      }
      if (error instanceof CancellationError) {
        throw error;
      }
      if (error instanceof MemoryLimitExceededError) {
        throw error;
      }
      throw new Error(`Failed to build grounding layer: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Stop memory monitoring
      stopMonitoring();
    }
  }

  /**
   * Build file grounding data from extracted components
   */
  private buildFileGroundingData(
    filePath: string,
    language: Language,
    components: Component[],
    sourceCode: string
  ): FileGroundingData {
    const exports: string[] = [];
    const classes: ClassGroundingData[] = [];
    const topLevelFunctions: FunctionGroundingData[] = [];
    const imports: ImportRef[] = [];

    // Find the module component (top-level)
    const moduleComponent = components.find(
      c => c.filePaths.includes(filePath) && 
           (c.type === ComponentType.Module || c.type === ComponentType.Package)
    );

    if (!moduleComponent) {
      return { path: filePath, language, exports, classes, topLevelFunctions, imports };
    }

    // Extract exports from module metadata
    if (moduleComponent.metadata.exportedSymbols) {
      exports.push(...moduleComponent.metadata.exportedSymbols);
    }

    // Extract classes and their methods
    for (const component of components) {
      if (component.type === ComponentType.Class && component.parent === moduleComponent.id) {
        const classData: ClassGroundingData = {
          name: component.name,
          superClass: undefined,
          interfaces: [],
          methods: []
        };

        // Find methods of this class
        const methods = components.filter(c => c.parent === component.id && c.type === ComponentType.Function);
        classData.methods = methods.map(m => m.name.split('.').pop() || m.name);

        classes.push(classData);
        exports.push(component.name);
      }
    }

    // Extract top-level functions
    for (const component of components) {
      if (component.type === ComponentType.Function && component.parent === moduleComponent.id) {
        topLevelFunctions.push({
          name: component.name
        });
        exports.push(component.name);
      }
    }

    // Extract interfaces (TypeScript/Java)
    for (const component of components) {
      if (component.type === ComponentType.Interface && component.parent === moduleComponent.id) {
        exports.push(component.name);
      }
    }

    return {
      path: filePath,
      language,
      exports,
      classes,
      topLevelFunctions,
      imports // Will be populated from relationships in a future enhancement
    };
  }

  /**
   * Build directory tree from file paths
   */
  private buildDirectoryTree(rootPath: string, filePaths: string[]): DirectoryNode {
    const root: DirectoryNode = {
      name: path.basename(rootPath),
      path: '',
      children: [],
      files: []
    };

    for (const filePath of filePaths) {
      const parts = filePath.split(path.sep);
      let currentNode = root;

      // Navigate/create directory structure
      for (let i = 0; i < parts.length - 1; i++) {
        const dirName = parts[i];
        let childNode = currentNode.children.find(c => c.name === dirName);

        if (!childNode) {
          childNode = {
            name: dirName,
            path: parts.slice(0, i + 1).join(path.sep),
            children: [],
            files: []
          };
          currentNode.children.push(childNode);
        }

        currentNode = childNode;
      }

      // Add file to the current directory
      currentNode.files.push(filePath);
    }

    return root;
  }

  /**
   * Build import graph from relationships
   */
  private buildImportGraph(relationships: Relationship[], components: Component[]): ImportEdge[] {
    const importEdges: ImportEdge[] = [];
    const componentMap = new Map(components.map(c => [c.id, c]));

    for (const rel of relationships) {
      if (rel.type === RelationshipType.Import || rel.type === RelationshipType.Dependency) {
        const sourceComp = componentMap.get(rel.source);
        const targetComp = componentMap.get(rel.target);

        if (sourceComp && targetComp && sourceComp.filePaths[0] && targetComp.filePaths[0]) {
          importEdges.push({
            sourceFile: sourceComp.filePaths[0],
            targetFile: targetComp.filePaths[0],
            symbols: [] // Simplified for now - could extract specific imported symbols
          });
        }
      }
    }

    return importEdges;
  }

  /**
   * Build inheritance graph from relationships
   */
  private buildInheritanceGraph(relationships: Relationship[], components: Component[]): InheritanceEdge[] {
    const inheritanceEdges: InheritanceEdge[] = [];
    const componentMap = new Map(components.map(c => [c.id, c]));

    for (const rel of relationships) {
      if (rel.type === RelationshipType.Inheritance) {
        const sourceComp = componentMap.get(rel.source);
        const targetComp = componentMap.get(rel.target);

        if (sourceComp && targetComp && sourceComp.filePaths[0]) {
          inheritanceEdges.push({
            childClass: sourceComp.name,
            parentClass: targetComp.name,
            sourceFile: sourceComp.filePaths[0],
            type: 'extends' // Simplified - could distinguish extends vs implements
          });
        }
      }
    }

    return inheritanceEdges;
  }

  /**
   * Generate cache key from root path and config
   */
  private generateCacheKey(rootPath: string, config: AnalysisConfig): string {
    const configStr = JSON.stringify({
      includePatterns: config.includePatterns.sort(),
      excludePatterns: config.excludePatterns.sort(),
      maxFiles: config.maxFiles,
      maxDepth: config.maxDepth,
      languages: config.languages.sort()
    });
    
    const hash = crypto.createHash('md5').update(rootPath + configStr).digest('hex');
    return hash;
  }

  /**
   * Check cache for existing analysis results
   * Validates that cached files haven't been modified
   */
  private async checkCache(cacheKey: string, rootPath: string): Promise<GroundingData | null> {
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    // Check if any files have been modified
    for (const [filePath, cachedModTime] of entry.fileModTimes.entries()) {
      try {
        const absolutePath = path.join(rootPath, filePath);
        const stats = await fs.stat(absolutePath);
        const currentModTime = stats.mtimeMs;

        if (currentModTime !== cachedModTime) {
          // File has been modified - invalidate cache
          this.cache.delete(cacheKey);
          return null;
        }
      } catch (error) {
        // File no longer exists - invalidate cache
        this.cache.delete(cacheKey);
        return null;
      }
    }

    return entry.groundingData;
  }

  /**
   * Cache analysis result with file modification times
   */
  private async cacheResult(
    cacheKey: string,
    groundingData: GroundingData,
    rootPath: string,
    filePaths: string[]
  ): Promise<void> {
    const fileModTimes = new Map<string, number>();

    // Record modification times for all analyzed files
    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        const relativePath = path.relative(rootPath, filePath);
        fileModTimes.set(relativePath, stats.mtimeMs);
      } catch (error) {
        // Skip files that can't be stat'd
      }
    }

    this.cache.set(cacheKey, {
      groundingData,
      fileModTimes,
      timestamp: Date.now()
    });
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.cache.clear();
  }
  /**
   * Clear cache for a specific file
   * Requirements: 11.5
   */
  clearCacheForFile(filePath: string): void {
    // Remove entries from cache that include this file
    for (const [key, value] of this.cache.entries()) {
      if (value.fileModTimes.has(filePath)) {
        this.cache.delete(key);
      }
    }
    
    // Clear incremental cache for this file
    this.optimizer.clearIncrementalCacheForFile(filePath);
  }


  /**
   * Report progress with throttling (every 5 seconds)
   */
  private reportProgress(
    percentage: number,
    message: string,
    callback?: ProgressCallback
  ): void {
    if (!callback) {
      return;
    }

    const now = Date.now();
    if (now - this.lastProgressUpdate >= this.PROGRESS_UPDATE_INTERVAL_MS || percentage === 100) {
      callback(percentage, message);
      this.lastProgressUpdate = now;
    }
  }

  /**
   * Check if operation has been cancelled
   */
  private checkCancellation(token?: CancellationToken): void {
    if (token && token.isCancelled) {
      throw new CancellationError('Analysis was cancelled');
    }
  }

  /**
   * Check if operation has exceeded timeout
   */
  private checkTimeout(startTime: number, timeoutMs: number, phase: string): void {
    const elapsed = Date.now() - startTime;
    if (elapsed > timeoutMs) {
      throw new TimeoutError(`Analysis timeout exceeded during ${phase} (${elapsed}ms > ${timeoutMs}ms)`);
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.parserManager.dispose();
    this.cache.clear();
    this.memoryManager.dispose();
    this.optimizer.dispose();
  }
}

/**
 * Error thrown when analysis times out
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Error thrown when analysis is cancelled
 */
export class CancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CancellationError';
  }
}

/**
 * Create a cancellation token
 */
export function createCancellationToken(): CancellationToken {
  const token = {
    isCancelled: false,
    cancel() {
      this.isCancelled = true;
    }
  };
  return token;
}
