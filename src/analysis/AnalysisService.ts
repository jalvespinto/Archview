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
import {
  GroundingData,
  FileGroundingData
} from '../types/analysis';
import {
  AnalysisConfig,
  Component,
  Relationship
} from '../types';
import { FileScanner, ScanOptions } from './FileScanner';
import { ScannedFile } from './FileScanner';
import { ParserManager, ParsedAST } from './ParserManager';
import { ComponentExtractor } from './ComponentExtractor';
import { RelationshipExtractor } from './RelationshipExtractor';
import { MemoryManager, MemoryLimitExceededError } from '../performance/MemoryManager';
import { AnalysisOptimizer } from '../performance/AnalysisOptimizer';
import {
  buildDirectoryTreeFromFilePaths,
  buildFileGroundingDataFromComponents,
  buildImportGraphEdges,
  buildInheritanceGraphEdges,
  createEmptyGroundingDataForFile,
  generateAnalysisCacheKey,
  getTimedOutElapsedMs,
  isAnalysisCancelled,
  buildCancellationTokenState,
  getProgressUpdateTimestamp,
  cacheEntryMatchesFilePath,
  formatBuildGroundingLayerError,
  buildFileProcessingProgressUpdate,
  isCachedFileEntryStale,
  collectFileModificationTimes
} from './analysisGroundingHelpers';
import { processParsedFileResultForGrounding } from './analysisParsingHelpers';

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
    this.memoryManager.setBaseline();
    const stopMonitoring = this.memoryManager.startAnalysisMonitoring((usageMB) => {
      console.warn(`Memory limit exceeded during analysis: ${usageMB.toFixed(2)}MB > 500MB`);
      throw new MemoryLimitExceededError(`Analysis memory limit exceeded: ${usageMB.toFixed(2)}MB > 500MB`);
    });
    try {
      const cacheKey = generateAnalysisCacheKey(rootPath, config);
      const cachedResult = await this.checkCache(cacheKey, rootPath);
      if (cachedResult) {
        this.reportProgress(100, 'Using cached analysis results', progressCallback);
        return cachedResult;
      }
      await this.parserManager.initialize();
      if (isAnalysisCancelled(cancellationToken)) throw new CancellationError('Analysis was cancelled');
      const fileScanningElapsed = getTimedOutElapsedMs(startTime, timeoutMs);
      if (fileScanningElapsed !== null) throw new TimeoutError(`Analysis timeout exceeded during File scanning (${fileScanningElapsed}ms > ${timeoutMs}ms)`);
      this.reportProgress(0, 'Scanning file system...', progressCallback);
      const scanOptions: ScanOptions = { includePatterns: config.includePatterns, excludePatterns: config.excludePatterns, maxFiles: config.maxFiles, maxDepth: config.maxDepth, respectGitignore: true };
      const scanResult = await this.fileScanner.scan(rootPath, scanOptions);
      this.reportProgress(10, `Found ${scanResult.files.length} files`, progressCallback);
      const extractionAggregation = await this.parseAndExtractFiles(rootPath, scanResult.files, startTime, timeoutMs, progressCallback, cancellationToken);
      const groundingData = this.buildGroundingDataStructure(rootPath, scanResult.files.map((file) => file.path), extractionAggregation, startTime, timeoutMs, progressCallback, cancellationToken);
      await this.cacheResult(cacheKey, groundingData, rootPath, scanResult.files.map((file) => file.absolutePath));
      this.reportProgress(100, 'Analysis complete', progressCallback);
      return groundingData;
    } catch (error) {
      if (error instanceof TimeoutError || error instanceof CancellationError || error instanceof MemoryLimitExceededError) {
        throw error;
      }
      throw new Error(formatBuildGroundingLayerError(error));
    } finally {
      stopMonitoring();
    }
  }

  private async parseAndExtractFiles(
    rootPath: string,
    scannedFiles: ScannedFile[],
    startTime: number,
    timeoutMs: number,
    progressCallback?: ProgressCallback,
    cancellationToken?: CancellationToken
  ): Promise<ExtractionAggregation> {
    if (isAnalysisCancelled(cancellationToken)) throw new CancellationError('Analysis was cancelled');
    const fileParsingElapsedStart = getTimedOutElapsedMs(startTime, timeoutMs);
    if (fileParsingElapsedStart !== null) throw new TimeoutError(`Analysis timeout exceeded during File parsing (${fileParsingElapsedStart}ms > ${timeoutMs}ms)`);
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
      if (isAnalysisCancelled(cancellationToken)) throw new CancellationError('Analysis was cancelled');
      const fileParsingElapsedLoop = getTimedOutElapsedMs(startTime, timeoutMs);
      if (fileParsingElapsedLoop !== null) throw new TimeoutError(`Analysis timeout exceeded during File parsing (${fileParsingElapsedLoop}ms > ${timeoutMs}ms)`);
      const parseResult = parseResults[i];
      const progressUpdate = buildFileProcessingProgressUpdate(i, totalFiles, parseResult.scannedFile.path);
      if (progressUpdate) this.reportProgress(progressUpdate.percentage, progressUpdate.message, progressCallback);
      await processParsedFileResultForGrounding({ rootPath, parseResult, parserManager: this.parserManager, componentExtractor: this.componentExtractor, relationshipExtractor: this.relationshipExtractor, buildFileGroundingData: (filePath, language, components) => buildFileGroundingDataFromComponents(filePath, language, components), createEmptyFileGroundingData: createEmptyGroundingDataForFile, allComponents, allRelationships, fileGroundingDataMap });
    }
    return { allComponents, allRelationships, fileGroundingDataMap };
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
    if (isAnalysisCancelled(cancellationToken)) throw new CancellationError('Analysis was cancelled');
    const directoryTreeElapsed = getTimedOutElapsedMs(startTime, timeoutMs);
    if (directoryTreeElapsed !== null) throw new TimeoutError(`Analysis timeout exceeded during Building directory tree (${directoryTreeElapsed}ms > ${timeoutMs}ms)`);

    const directoryTree = buildDirectoryTreeFromFilePaths(rootPath, scannedPaths);
    this.reportProgress(80, 'Building import graph...', progressCallback);

    if (isAnalysisCancelled(cancellationToken)) throw new CancellationError('Analysis was cancelled');
    const relationshipGraphsElapsed = getTimedOutElapsedMs(startTime, timeoutMs);
    if (relationshipGraphsElapsed !== null) throw new TimeoutError(`Analysis timeout exceeded during Building relationship graphs (${relationshipGraphsElapsed}ms > ${timeoutMs}ms)`);

    const importGraph = buildImportGraphEdges(
      extractionAggregation.allRelationships,
      extractionAggregation.allComponents
    );
    this.reportProgress(85, 'Building inheritance graph...', progressCallback);

    const inheritanceGraph = buildInheritanceGraphEdges(
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
      const isStale = await isCachedFileEntryStale(
        rootPath,
        filePath,
        cachedModTime,
        async (absolutePath) => fs.stat(absolutePath)
      );
      if (isStale) {
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
    const fileModTimes = await collectFileModificationTimes(
      rootPath,
      filePaths,
      async (absolutePath) => fs.stat(absolutePath)
    );

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
      if (cacheEntryMatchesFilePath(value.fileModTimes.keys(), value.groundingData.rootPath, filePath)) {
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
    const nextTimestamp = getProgressUpdateTimestamp(
      now,
      this.lastProgressUpdate,
      this.progressUpdateIntervalMs,
      percentage
    );
    if (nextTimestamp !== null) {
      callback(percentage, message);
      this.lastProgressUpdate = nextTimestamp;
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
  return buildCancellationTokenState();
}
