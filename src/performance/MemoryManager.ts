/**
 * MemoryManager - Monitor and manage memory usage
 * Requirements: 9.1, 9.2, 9.4
 * 
 * Responsibilities:
 * - Monitor memory usage during analysis (500MB limit)
 * - Monitor memory usage during rendering (200MB limit)
 * - Release memory within 2 seconds when diagram closed
 * - Support streaming for large file processing
 */

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

/**
 * Memory limit configuration
 */
export interface MemoryLimits {
  analysisLimitMB: number;  // Default: 500MB
  renderingLimitMB: number; // Default: 200MB
}

/**
 * Memory manager for monitoring and controlling memory usage
 */
export class MemoryManager {
  private limits: MemoryLimits;
  private baselineMemory: MemorySnapshot | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly MONITORING_INTERVAL_MS = 1000; // Check every second

  constructor(limits?: Partial<MemoryLimits>) {
    this.limits = {
      analysisLimitMB: limits?.analysisLimitMB ?? 500,
      renderingLimitMB: limits?.renderingLimitMB ?? 200
    };
  }

  /**
   * Get current memory usage snapshot
   * Requirements: 9.1, 9.2
   */
  getMemorySnapshot(): MemorySnapshot {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      timestamp: Date.now()
    };
  }

  /**
   * Get memory usage in MB
   */
  getMemoryUsageMB(): number {
    const snapshot = this.getMemorySnapshot();
    return snapshot.heapUsed / (1024 * 1024);
  }

  /**
   * Set baseline memory before operation
   */
  setBaseline(): void {
    this.baselineMemory = this.getMemorySnapshot();
  }

  /**
   * Get memory increase since baseline in MB
   */
  getMemoryIncreaseMB(): number {
    if (!this.baselineMemory) {
      return this.getMemoryUsageMB();
    }

    const current = this.getMemorySnapshot();
    const increase = (current.heapUsed - this.baselineMemory.heapUsed) / (1024 * 1024);
    return Math.max(0, increase);
  }

  /**
   * Check if memory usage exceeds limit
   * Requirements: 9.1, 9.2
   */
  checkMemoryLimit(limitMB: number): boolean {
    const currentMB = this.getMemoryIncreaseMB();
    return currentMB > limitMB;
  }

  /**
   * Start monitoring memory usage during analysis
   * Requirements: 9.1
   * 
   * @param onLimitExceeded Callback when memory limit is exceeded
   * @returns Stop function to stop monitoring
   */
  startAnalysisMonitoring(onLimitExceeded?: (usageMB: number) => void): () => void {
    this.setBaseline();
    
    this.monitoringInterval = setInterval(() => {
      const usageMB = this.getMemoryIncreaseMB();
      
      if (usageMB > this.limits.analysisLimitMB) {
        if (onLimitExceeded) {
          onLimitExceeded(usageMB);
        }
        this.stopMonitoring();
      }
    }, this.MONITORING_INTERVAL_MS);

    return () => this.stopMonitoring();
  }

  /**
   * Start monitoring memory usage during rendering
   * Requirements: 9.2
   * 
   * @param onLimitExceeded Callback when memory limit is exceeded
   * @returns Stop function to stop monitoring
   */
  startRenderingMonitoring(onLimitExceeded?: (usageMB: number) => void): () => void {
    this.setBaseline();
    
    this.monitoringInterval = setInterval(() => {
      const usageMB = this.getMemoryIncreaseMB();
      
      if (usageMB > this.limits.renderingLimitMB) {
        if (onLimitExceeded) {
          onLimitExceeded(usageMB);
        }
        this.stopMonitoring();
      }
    }, this.MONITORING_INTERVAL_MS);

    return () => this.stopMonitoring();
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Force garbage collection if available
   * Note: Requires --expose-gc flag
   */
  forceGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Release memory
   * Requirements: 9.4
   * 
   * @param cleanup Cleanup function to release resources
   * @returns Promise that resolves when memory is released
   */
  async releaseMemory(cleanup: () => void | Promise<void>): Promise<void> {
    // Execute cleanup
    await cleanup();
    
    // Force garbage collection if available
    this.forceGarbageCollection();
  }

  /**
   * Create a streaming file reader for large files
   * Requirements: 9.4
   * 
   * @param filePath Path to file
   * @param chunkSize Size of each chunk in bytes (default: 64KB)
   * @returns Async generator yielding file chunks
   */
  async *streamFile(filePath: string, chunkSize: number = 64 * 1024): AsyncGenerator<string> {
    const fs = await import('fs');
    const stream = fs.createReadStream(filePath, {
      encoding: 'utf-8',
      highWaterMark: chunkSize
    });

    for await (const chunk of stream) {
      yield chunk as string;
    }
  }

  /**
   * Process large file in chunks to avoid memory issues
   * Requirements: 9.4
   * 
   * @param filePath Path to file
   * @param processor Function to process each chunk
   * @param chunkSize Size of each chunk in bytes
   */
  async processFileInChunks(
    filePath: string,
    processor: (chunk: string, index: number) => void | Promise<void>,
    chunkSize: number = 64 * 1024
  ): Promise<void> {
    let index = 0;
    
    for await (const chunk of this.streamFile(filePath, chunkSize)) {
      await processor(chunk, index);
      index++;
      
      // Check memory usage periodically
      if (index % 10 === 0) {
        const usageMB = this.getMemoryIncreaseMB();
        if (usageMB > this.limits.analysisLimitMB) {
          throw new MemoryLimitExceededError(
            `Memory limit exceeded during file processing: ${usageMB.toFixed(2)}MB > ${this.limits.analysisLimitMB}MB`
          );
        }
      }
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    current: MemorySnapshot;
    baseline: MemorySnapshot | null;
    increaseMB: number;
    limits: MemoryLimits;
  } {
    return {
      current: this.getMemorySnapshot(),
      baseline: this.baselineMemory,
      increaseMB: this.getMemoryIncreaseMB(),
      limits: this.limits
    };
  }

  /**
   * Dispose and clean up resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.baselineMemory = null;
  }
}

/**
 * Error thrown when memory limit is exceeded
 */
export class MemoryLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryLimitExceededError';
  }
}
