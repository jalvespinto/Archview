/**
 * Error Handler for AI Architecture Diagram Extension
 * 
 * Provides centralized error handling with:
 * - Categorized error types
 * - Graceful degradation strategies
 * - Detailed logging
 * - Retry logic with exponential backoff
 * 
 * Requirements: 1.6, 10.1, 10.4
 */

/**
 * Output channel interface for logging
 */
export interface IOutputChannel {
  appendLine(value: string): void;
  show(): void;
}

/**
 * User notification interface
 */
export interface IUserNotifier {
  showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
  showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
}

/**
 * Base error class for extension errors
 */
export class ExtensionError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly category: ErrorCategory,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  Analysis = 'analysis',
  AI = 'ai',
  Rendering = 'rendering',
  IDE = 'ide',
  Configuration = 'configuration',
  FileSystem = 'filesystem',
  Network = 'network',
  Validation = 'validation'
}

/**
 * Analysis-specific errors
 */
export class AnalysisError extends ExtensionError {
  constructor(
    message: string,
    userMessage: string,
    public readonly type: AnalysisErrorType,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, userMessage, ErrorCategory.Analysis, context, cause);
  }
}

export enum AnalysisErrorType {
  FileSystemAccess = 'filesystem_access',
  UnsupportedFormat = 'unsupported_format',
  ParseError = 'parse_error',
  MemoryExhaustion = 'memory_exhaustion',
  Timeout = 'timeout',
  NoFilesFound = 'no_files_found'
}

/**
 * AI integration errors
 */
export class AIError extends ExtensionError {
  constructor(
    message: string,
    userMessage: string,
    public readonly type: AIErrorType,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, userMessage, ErrorCategory.AI, context, cause);
  }
}

export enum AIErrorType {
  ServiceUnavailable = 'service_unavailable',
  MalformedResponse = 'malformed_response',
  Timeout = 'timeout',
  RateLimitExceeded = 'rate_limit_exceeded'
}

/**
 * Rendering errors
 */
export class RenderError extends ExtensionError {
  constructor(
    message: string,
    userMessage: string,
    public readonly type: RenderErrorType,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, userMessage, ErrorCategory.Rendering, context, cause);
  }
}

export enum RenderErrorType {
  InvalidData = 'invalid_data',
  WebviewCreation = 'webview_creation',
  LayoutFailure = 'layout_failure',
  ExportFailure = 'export_failure'
}

/**
 * IDE integration errors
 */
export class IDEError extends ExtensionError {
  constructor(
    message: string,
    userMessage: string,
    public readonly type: IDEErrorType,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, userMessage, ErrorCategory.IDE, context, cause);
  }
}

export enum IDEErrorType {
  APIUnavailable = 'api_unavailable',
  InvalidFilePath = 'invalid_file_path',
  WorkspaceUnavailable = 'workspace_unavailable'
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

/**
 * Central error handler with logging and recovery strategies
 */
export class ErrorHandler {
  private _outputChannel: IOutputChannel;
  private _notifier: IUserNotifier;
  private _retryConfig: RetryConfig;

  constructor(
    outputChannel: IOutputChannel,
    notifier: IUserNotifier,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    this._outputChannel = outputChannel;
    this._notifier = notifier;
    this._retryConfig = retryConfig;
  }

  /**
   * Handle analysis errors with graceful degradation
   * Requirements: 1.6, 10.1
   */
  handleAnalysisError(error: AnalysisError): void {
    // Log detailed error for debugging
    this._logError('Analysis failed', error);

    // Show user-friendly message with actions
    const actions = this._getAnalysisErrorActions(error);
    this._notifier.showErrorMessage(
      `Failed to analyze codebase: ${error.userMessage}`,
      ...actions
    ).then(action => {
      if (action === 'Retry') {
        this._handleRetryAction();
      } else if (action === 'View Logs') {
        this._outputChannel.show();
      } else if (action === 'Partial Analysis') {
        this._handlePartialAnalysisAction();
      }
    });
  }

  /**
   * Handle AI errors with fallback strategy
   * Requirements: 10.1, 10.2
   */
  handleAIError(error: AIError): void {
    // Log warning (AI errors are non-critical)
    this._logWarning('AI enhancement failed, using fallback', error);

    // Notify user with non-blocking warning
    this._notifier.showWarningMessage(
      'AI features unavailable, using basic analysis. Diagram will still be generated.',
      'View Logs'
    ).then(action => {
      if (action === 'View Logs') {
        this._outputChannel.show();
      }
    });
  }

  /**
   * Handle rendering errors
   * Requirements: 10.1, 10.2
   */
  handleRenderError(error: RenderError): void {
    // Log detailed error
    this._logError('Rendering failed', error);

    // Show error with recovery options
    const actions = this._getRenderErrorActions(error);
    this._notifier.showErrorMessage(
      `Failed to render diagram: ${error.userMessage}`,
      ...actions
    ).then(action => {
      if (action === 'Retry') {
        this._handleRetryAction();
      } else if (action === 'Export Data') {
        this._handleExportDataAction();
      } else if (action === 'View Logs') {
        this._outputChannel.show();
      }
    });
  }

  /**
   * Handle IDE integration errors
   * Requirements: 10.1
   */
  handleIDEError(error: IDEError): void {
    // Log detailed error
    this._logError('IDE integration failed', error);

    // Show error message
    this._notifier.showErrorMessage(
      `IDE integration error: ${error.userMessage}`,
      'View Logs'
    ).then(action => {
      if (action === 'View Logs') {
        this._outputChannel.show();
      }
    });
  }

  /**
   * Execute operation with retry logic and exponential backoff
   * Requirements: 10.4
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    isRetriable: (error: Error) => boolean = () => true
  ): Promise<T> {
    let lastError: Error | undefined;
    let delayMs = this._retryConfig.initialDelayMs;

    for (let attempt = 1; attempt <= this._retryConfig.maxAttempts; attempt++) {
      try {
        this._log(`Attempting ${operationName} (attempt ${attempt}/${this._retryConfig.maxAttempts})`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retriable
        if (!isRetriable(lastError)) {
          this._logError(`${operationName} failed with non-retriable error`, lastError);
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === this._retryConfig.maxAttempts) {
          break;
        }

        // Log retry attempt
        this._logWarning(
          `${operationName} failed, retrying in ${delayMs}ms`,
          lastError
        );

        // Wait with exponential backoff
        await this._delay(delayMs);
        delayMs = Math.min(
          delayMs * this._retryConfig.backoffMultiplier,
          this._retryConfig.maxDelayMs
        );
      }
    }

    // All retries exhausted
    this._logError(`${operationName} failed after ${this._retryConfig.maxAttempts} attempts`, lastError!);
    throw lastError!;
  }

  /**
   * Log detailed error information
   * Requirements: 10.4
   */
  private _logError(message: string, error: Error | ExtensionError): void {
    const timestamp = new Date().toISOString();
    this._outputChannel.appendLine(`[ERROR] ${timestamp} - ${message}`);
    this._outputChannel.appendLine(`  Message: ${error.message}`);
    
    if (error instanceof ExtensionError) {
      this._outputChannel.appendLine(`  Category: ${error.category}`);
      this._outputChannel.appendLine(`  User Message: ${error.userMessage}`);
      
      if (error.context) {
        this._outputChannel.appendLine(`  Context: ${JSON.stringify(error.context, null, 2)}`);
      }
      
      if (error.cause) {
        this._outputChannel.appendLine(`  Cause: ${error.cause.message}`);
        if (error.cause.stack) {
          this._outputChannel.appendLine(`  Cause Stack: ${error.cause.stack}`);
        }
      }
    }
    
    if (error.stack) {
      this._outputChannel.appendLine(`  Stack: ${error.stack}`);
    }
    
    this._outputChannel.appendLine('');
  }

  /**
   * Log warning information
   */
  private _logWarning(message: string, error?: Error): void {
    const timestamp = new Date().toISOString();
    this._outputChannel.appendLine(`[WARN] ${timestamp} - ${message}`);
    
    if (error) {
      this._outputChannel.appendLine(`  Message: ${error.message}`);
      if (error.stack) {
        this._outputChannel.appendLine(`  Stack: ${error.stack}`);
      }
    }
    
    this._outputChannel.appendLine('');
  }

  /**
   * Log informational message
   */
  private _log(message: string): void {
    const timestamp = new Date().toISOString();
    this._outputChannel.appendLine(`[INFO] ${timestamp} - ${message}`);
  }

  /**
   * Get appropriate actions for analysis errors
   */
  private _getAnalysisErrorActions(error: AnalysisError): string[] {
    const actions: string[] = ['View Logs'];
    
    switch (error.type) {
      case AnalysisErrorType.Timeout:
        actions.unshift('Partial Analysis', 'Retry');
        break;
      case AnalysisErrorType.FileSystemAccess:
      case AnalysisErrorType.ParseError:
        actions.unshift('Retry');
        break;
      default:
        actions.unshift('Retry');
    }
    
    return actions;
  }

  /**
   * Get appropriate actions for render errors
   */
  private _getRenderErrorActions(error: RenderError): string[] {
    const actions: string[] = ['View Logs'];
    
    switch (error.type) {
      case RenderErrorType.InvalidData:
        actions.unshift('Export Data');
        break;
      case RenderErrorType.LayoutFailure:
      case RenderErrorType.WebviewCreation:
        actions.unshift('Retry');
        break;
      default:
        actions.unshift('Retry');
    }
    
    return actions;
  }

  /**
   * Handle retry action (placeholder for extension controller integration)
   */
  private _handleRetryAction(): void {
    this._log('User requested retry');
    // This will be implemented by the extension controller
  }

  /**
   * Handle partial analysis action
   */
  private _handlePartialAnalysisAction(): void {
    this._log('User requested partial analysis');
    // This will be implemented by the extension controller
  }

  /**
   * Handle export data action
   */
  private _handleExportDataAction(): void {
    this._log('User requested data export');
    // This will be implemented by the extension controller
  }

  /**
   * Delay helper for retry backoff
   */
  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
