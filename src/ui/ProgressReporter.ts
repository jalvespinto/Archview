/**
 * ProgressReporter - Manages progress indicators and user feedback
 * Requirements: 10.3
 * 
 * Responsibilities:
 * - Show progress notifications during analysis with percentage
 * - Show progress notifications during diagram generation
 * - Update progress every 5 seconds
 * - Add cancel button for long operations
 */

/**
 * Progress notification interface
 */
export interface IProgressNotifier {
  /**
   * Show a progress notification with cancellation support
   * @param title Title of the operation
   * @param cancellable Whether the operation can be cancelled
   * @param task Task function that receives progress reporter
   * @returns Promise that resolves when the task completes
   */
  withProgress<T>(
    title: string,
    cancellable: boolean,
    task: (progress: IProgress, token: ICancellationToken) => Promise<T>
  ): Promise<T>;
}

/**
 * Progress reporter interface for updating progress
 */
export interface IProgress {
  /**
   * Report progress update
   * @param value Progress value (0-100 for percentage, or increment amount)
   * @param message Optional message to display
   */
  report(value: { increment?: number; message?: string }): void;
}

/**
 * Cancellation token interface
 */
export interface ICancellationToken {
  /**
   * Whether cancellation has been requested
   */
  isCancellationRequested: boolean;
  
  /**
   * Event fired when cancellation is requested
   */
  onCancellationRequested(listener: () => void): void;
}

/**
 * Progress reporter for long-running operations
 */
export class ProgressReporter {
  private progressNotifier: IProgressNotifier;
  private lastUpdateTime: number = 0;
  private readonly UPDATE_INTERVAL_MS = 5000; // 5 seconds (Requirement 10.3)

  constructor(progressNotifier: IProgressNotifier) {
    this.progressNotifier = progressNotifier;
  }

  /**
   * Show progress during analysis
   * Requirements: 10.3
   * 
   * @param task Task function that receives progress callback
   * @returns Promise that resolves with task result
   */
  async showAnalysisProgress<T>(
    task: (progressCallback: (percentage: number, message: string) => void, cancellationToken: ICancellationToken) => Promise<T>
  ): Promise<T> {
    return this.progressNotifier.withProgress(
      'Analyzing codebase',
      true, // Cancellable
      async (progress, token) => {
        let lastPercentage = 0;
        this.lastUpdateTime = Date.now();

        const progressCallback = (percentage: number, message: string) => {
          const now = Date.now();
          const timeSinceLastUpdate = now - this.lastUpdateTime;

          // Update progress every 5 seconds or when percentage changes significantly
          if (timeSinceLastUpdate >= this.UPDATE_INTERVAL_MS || percentage - lastPercentage >= 10 || percentage === 100) {
            const increment = percentage - lastPercentage;
            progress.report({ increment, message });
            lastPercentage = percentage;
            this.lastUpdateTime = now;
          }
        };

        return task(progressCallback, token);
      }
    );
  }

  /**
   * Show progress during diagram generation
   * Requirements: 10.3
   * 
   * @param task Task function that receives progress callback
   * @returns Promise that resolves with task result
   */
  async showDiagramGenerationProgress<T>(
    task: (progressCallback: (percentage: number, message: string) => void, cancellationToken: ICancellationToken) => Promise<T>
  ): Promise<T> {
    return this.progressNotifier.withProgress(
      'Generating diagram',
      true, // Cancellable
      async (progress, token) => {
        let lastPercentage = 0;
        this.lastUpdateTime = Date.now();

        const progressCallback = (percentage: number, message: string) => {
          const now = Date.now();
          const timeSinceLastUpdate = now - this.lastUpdateTime;

          // Update progress every 5 seconds or when percentage changes significantly
          if (timeSinceLastUpdate >= this.UPDATE_INTERVAL_MS || percentage - lastPercentage >= 10 || percentage === 100) {
            const increment = percentage - lastPercentage;
            progress.report({ increment, message });
            lastPercentage = percentage;
            this.lastUpdateTime = now;
          }
        };

        return task(progressCallback, token);
      }
    );
  }

  /**
   * Show progress for a generic long operation
   * Requirements: 10.3
   * 
   * @param title Title of the operation
   * @param cancellable Whether the operation can be cancelled
   * @param task Task function that receives progress callback
   * @returns Promise that resolves with task result
   */
  async showProgress<T>(
    title: string,
    cancellable: boolean,
    task: (progressCallback: (percentage: number, message: string) => void, cancellationToken: ICancellationToken) => Promise<T>
  ): Promise<T> {
    return this.progressNotifier.withProgress(
      title,
      cancellable,
      async (progress, token) => {
        let lastPercentage = 0;
        this.lastUpdateTime = Date.now();

        const progressCallback = (percentage: number, message: string) => {
          const now = Date.now();
          const timeSinceLastUpdate = now - this.lastUpdateTime;

          // Update progress every 5 seconds or when percentage changes significantly
          if (timeSinceLastUpdate >= this.UPDATE_INTERVAL_MS || percentage - lastPercentage >= 10 || percentage === 100) {
            const increment = percentage - lastPercentage;
            progress.report({ increment, message });
            lastPercentage = percentage;
            this.lastUpdateTime = now;
          }
        };

        return task(progressCallback, token);
      }
    );
  }
}

/**
 * Mock progress notifier for testing
 */
export class MockProgressNotifier implements IProgressNotifier {
  public progressUpdates: Array<{ increment?: number; message?: string }> = [];
  private _cancelled = false;
  private cancellationListeners: Array<() => void> = [];

  async withProgress<T>(
    _title: string,
    _cancellable: boolean,
    task: (progress: IProgress, token: ICancellationToken) => Promise<T>
  ): Promise<T> {
    const progress: IProgress = {
      report: (value) => {
        this.progressUpdates.push(value);
      }
    };

    const token: ICancellationToken = {
      get isCancellationRequested() {
        return false;
      },
      onCancellationRequested: (listener) => {
        this.cancellationListeners.push(listener);
        // If already cancelled, call listener immediately
        if (this._cancelled) {
          listener();
        }
      }
    };

    Object.defineProperty(token, 'isCancellationRequested', {
      get: () => this._cancelled
    });

    return task(progress, token);
  }

  /**
   * Simulate cancellation
   */
  cancel() {
    this._cancelled = true;
    // Notify all listeners
    this.cancellationListeners.forEach(listener => listener());
  }

  /**
   * Reset mock state
   */
  reset() {
    this.progressUpdates = [];
    this._cancelled = false;
    this.cancellationListeners = [];
  }
}
