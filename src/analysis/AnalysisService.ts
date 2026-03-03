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
  FunctionGroundingData
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
import { ScannedFile } from './FileScanner';
import { ParserManager, ParsedAST } from './ParserManager';
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

interface ParseTaskResult {
  scannedFile: ScannedFile;
  ast: ParsedAST;
}

interface ExtractionAggregation {
  allComponents: Component[];
  allRelationships: Relationship[];
  fileGroundingDataMap: Map<string, FileGroundingData>;
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
  private readonly progressUpdateIntervalMs = 5000; // 5 seconds
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
    const { config, progressCallback, cancellationToken, timeoutMs = 120000 } = options;
    const startTime = Date.now();
    this.lastProgressUpdate = startTime;
    const stopMonitoring = this.startMemoryMonitoring();
    try {
      const cacheKey = this.generateCacheKey(rootPath, config);
      const cachedResult = await this.getCachedGroundingData(cacheKey, rootPath, progressCallback);
      if (cachedResult) return cachedResult;
      await this.parserManager.initialize();
      const scanResult = await this.scanProjectFiles(rootPath, config, startTime, timeoutMs, progressCallback, cancellationToken);
      const extractionAggregation = await this.parseAndExtractFiles(rootPath, scanResult.files, startTime, timeoutMs, progressCallback, cancellationToken);
      const groundingData = this.buildGroundingDataStructure(rootPath, scanResult.files.map((file) => file.path), extractionAggregation, startTime, timeoutMs, progressCallback, cancellationToken);
      await this.cacheResult(cacheKey, groundingData, rootPath, scanResult.files.map((file) => file.absolutePath));
      this.reportProgress(100, 'Analysis complete', progressCallback);
      return groundingData;
    } catch (error) {
      this.rethrowBuildGroundingError(error);
    } finally {
      stopMonitoring();
    }
  }

  private startMemoryMonitoring(): () => void {
    this.memoryManager.setBaseline();
    return this.memoryManager.startAnalysisMonitoring((usageMB) => {
      console.warn(`Memory limit exceeded during analysis: ${usageMB.toFixed(2)}MB > 500MB`);
      throw new MemoryLimitExceededError(
        `Analysis memory limit exceeded: ${usageMB.toFixed(2)}MB > 500MB`
      );
    });
  }

  private async getCachedGroundingData(
    cacheKey: string,
    rootPath: string,
    progressCallback?: ProgressCallback
  ): Promise<GroundingData | null> {
    const cachedResult = await this.checkCache(cacheKey, rootPath);
    if (!cachedResult) {
      return null;
    }

    this.reportProgress(100, 'Using cached analysis results', progressCallback);
    return cachedResult;
  }

  private async scanProjectFiles(
    rootPath: string,
    config: AnalysisConfig,
    startTime: number,
    timeoutMs: number,
    progressCallback?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<{ files: ScannedFile[] }> {
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
    return scanResult;
  }

  private async parseAndExtractFiles(
    rootPath: string,
    scannedFiles: ScannedFile[],
    startTime: number,
    timeoutMs: number,
    progressCallback?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<ExtractionAggregation> {
    this.checkCancellation(cancellationToken);
    this.checkTimeout(startTime, timeoutMs, 'File parsing');
    const allComponents: Component[] = [];
    const allRelationships: Relationship[] = [];
    const fileGroundingDataMap = new Map<string, FileGroundingData>();
    const totalFiles = scannedFiles.length;
    const filePaths = scannedFiles.map((file) => file.absolutePath);
    const fileContents = await this.optimizer.batchReadFiles(filePaths);
    const parseResults = await this.optimizer.parseFilesInParallel<ParseTaskResult>(
      scannedFiles.map((file) => file.path),
      async (filePath) => {
        const scannedFile = scannedFiles.find((file) => file.path === filePath);
        if (!scannedFile) {
          throw new Error(`File not found: ${filePath}`);
        }
        const sourceCode = fileContents.get(scannedFile.absolutePath) || '';
        const ast = await this.optimizer.parseIncremental(
          scannedFile.path,
          sourceCode,
          async (content) =>
            this.parserManager.parseFile(
              scannedFile.path,
              content,
              scannedFile.language
            )
        );
        return { scannedFile, ast };
      }
    );
    for (let i = 0; i < parseResults.length; i++) {
      this.checkCancellation(cancellationToken);
      this.checkTimeout(startTime, timeoutMs, 'File parsing');
      const parseResult = parseResults[i];
      this.reportFileProcessingProgress(i, totalFiles, parseResult.scannedFile.path, progressCallback);
      await this.processParsedFileResult(rootPath, parseResult, allComponents, allRelationships, fileGroundingDataMap);
    }
    return { allComponents, allRelationships, fileGroundingDataMap };
  }

  private reportFileProcessingProgress(
    index: number,
    totalFiles: number,
    filePath: string,
    progressCallback?: ProgressCallback
  ): void {
    const progressPercentage = 10 + Math.floor((index / totalFiles) * 60);
    if (index % Math.max(1, Math.floor(totalFiles / 10)) !== 0) {
      return;
    }

    this.reportProgress(
      progressPercentage,
      `Processing file ${index + 1}/${totalFiles}: ${filePath}`,
      progressCallback
    );
  }

  private async processParsedFileResult(
    rootPath: string,
    parseResult: ParseTaskResult,
    allComponents: Component[],
    allRelationships: Relationship[],
    fileGroundingDataMap: Map<string, FileGroundingData>
  ): Promise<void> {
    const { scannedFile, ast } = parseResult;

    if (this.parserManager.hasErrors(ast) && ast.parseErrors.length > 0) {
      fileGroundingDataMap.set(scannedFile.path, this.createEmptyFileGroundingData(scannedFile.path, scannedFile.language));
      return;
    }

    const extractionResult = await this.componentExtractor.extractComponents({
      rootPath,
      filePath: scannedFile.path,
      ast,
      parserManager: this.parserManager
    });
    allComponents.push(...extractionResult.components);

    const relationships = await this.relationshipExtractor.extractRelationships({
      ast,
      components: extractionResult.components,
      parserManager: this.parserManager
    });
    allRelationships.push(...relationships);

    const fileGrounding = this.buildFileGroundingData(
      scannedFile.path,
      scannedFile.language,
      extractionResult.components,
      ast.sourceCode
    );
    fileGroundingDataMap.set(scannedFile.path, fileGrounding);
  }

  private buildGroundingDataStructure(
    rootPath: string,
    scannedPaths: string[],
    extractionAggregation: ExtractionAggregation,
    startTime: number,
    timeoutMs: number,
    progressCallback?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): GroundingData {
    this.reportProgress(70, 'Building grounding data structure...', progressCallback);
    this.checkCancellation(cancellationToken);
    this.checkTimeout(startTime, timeoutMs, 'Building directory tree');

    const directoryTree = this.buildDirectoryTree(rootPath, scannedPaths);
    this.reportProgress(80, 'Building import graph...', progressCallback);

    this.checkCancellation(cancellationToken);
    this.checkTimeout(startTime, timeoutMs, 'Building relationship graphs');

    const importGraph = this.buildImportGraph(
      extractionAggregation.allRelationships,
      extractionAggregation.allComponents
    );
    this.reportProgress(85, 'Building inheritance graph...', progressCallback);

    const inheritanceGraph = this.buildInheritanceGraph(
      extractionAggregation.allRelationships,
      extractionAggregation.allComponents
    );
    this.reportProgress(90, 'Finalizing grounding data...', progressCallback);

    return {
      rootPath,
      timestamp: Date.now(),
      directoryTree,
      files: Array.from(extractionAggregation.fileGroundingDataMap.values()),
      importGraph,
      inheritanceGraph
    };
  }

  private rethrowBuildGroundingError(error: unknown): never {
    if (
      error instanceof TimeoutError ||
      error instanceof CancellationError ||
      error instanceof MemoryLimitExceededError
    ) {
      throw error;
    }

    throw new Error(`Failed to build grounding layer: ${error instanceof Error ? error.message : String(error)}`);
  }

  /**
   * Build file grounding data from extracted components
   */
  private buildFileGroundingData(
    filePath: string,
    language: Language,
    components: Component[],
    _sourceCode: string
  ): FileGroundingData {
    const moduleComponent = this.findModuleComponent(filePath, components);
    if (!moduleComponent) {
      return this.createEmptyFileGroundingData(filePath, language);
    }

    const exports: string[] = [];
    const classes: ClassGroundingData[] = [];
    const topLevelFunctions: FunctionGroundingData[] = [];

    if (moduleComponent.metadata.exportedSymbols) {
      exports.push(...moduleComponent.metadata.exportedSymbols);
    }

    this.collectClasses(moduleComponent.id, components, classes, exports);
    this.collectTopLevelFunctions(moduleComponent.id, components, topLevelFunctions, exports);
    this.collectInterfaceExports(moduleComponent.id, components, exports);

    return {
      path: filePath,
      language,
      exports,
      classes,
      topLevelFunctions,
      imports: [] // Will be populated from relationships in a future enhancement
    };
  }

  private findModuleComponent(filePath: string, components: Component[]): Component | undefined {
    return components.find((component) =>
      component.filePaths.includes(filePath) &&
      (component.type === ComponentType.Module || component.type === ComponentType.Package)
    );
  }

  private createEmptyFileGroundingData(filePath: string, language: Language): FileGroundingData {
    return {
      path: filePath,
      language,
      exports: [],
      classes: [],
      topLevelFunctions: [],
      imports: []
    };
  }

  private collectClasses(
    moduleComponentId: string,
    components: Component[],
    classes: ClassGroundingData[],
    exports: string[]
  ): void {
    const moduleClasses = components.filter(
      (component) => component.type === ComponentType.Class && component.parent === moduleComponentId
    );

    for (const classComponent of moduleClasses) {
      const methods = components
        .filter((component) => component.parent === classComponent.id && component.type === ComponentType.Function)
        .map((methodComponent) => methodComponent.name.split('.').pop() || methodComponent.name);

      classes.push({
        name: classComponent.name,
        superClass: undefined,
        interfaces: [],
        methods
      });
      exports.push(classComponent.name);
    }
  }

  private collectTopLevelFunctions(
    moduleComponentId: string,
    components: Component[],
    topLevelFunctions: FunctionGroundingData[],
    exports: string[]
  ): void {
    const moduleFunctions = components.filter(
      (component) => component.type === ComponentType.Function && component.parent === moduleComponentId
    );

    for (const functionComponent of moduleFunctions) {
      topLevelFunctions.push({ name: functionComponent.name });
      exports.push(functionComponent.name);
    }
  }

  private collectInterfaceExports(
    moduleComponentId: string,
    components: Component[],
    exports: string[]
  ): void {
    const moduleInterfaces = components.filter(
      (component) => component.type === ComponentType.Interface && component.parent === moduleComponentId
    );
    for (const interfaceComponent of moduleInterfaces) {
      exports.push(interfaceComponent.name);
    }
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
      const normalizedInput = path.normalize(filePath);
      const hasMatchingPath = Array.from(value.fileModTimes.keys()).some((cachedPath) => {
        // Cache keys are relative paths; incoming file paths are often absolute.
        if (path.normalize(cachedPath) === normalizedInput) {
          return true;
        }

        const absoluteCachedPath = path.normalize(path.join(value.groundingData.rootPath, cachedPath));
        return absoluteCachedPath === normalizedInput;
      });

      if (hasMatchingPath) {
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
    if (now - this.lastProgressUpdate >= this.progressUpdateIntervalMs || percentage === 100) {
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
