/**
 * Unit tests for ErrorHandler
 * 
 * Tests error handling, logging, retry logic, and graceful degradation
 */

import {
  ErrorHandler,
  AnalysisError,
  AnalysisErrorType,
  AIError,
  AIErrorType,
  RenderError,
  RenderErrorType,
  IDEError,
  IDEErrorType,
  ErrorCategory,
  IOutputChannel,
  IUserNotifier
} from '../ErrorHandler';

describe('ErrorHandler', () => {
  let mockOutputChannel: jest.Mocked<IOutputChannel>;
  let mockNotifier: jest.Mocked<IUserNotifier>;
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    // Create mock output channel
    mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn()
    };

    // Create mock notifier
    mockNotifier = {
      showErrorMessage: jest.fn().mockResolvedValue(undefined),
      showWarningMessage: jest.fn().mockResolvedValue(undefined)
    };

    // Create error handler with fast retry config for testing
    errorHandler = new ErrorHandler(
      mockOutputChannel,
      mockNotifier,
      {
        maxAttempts: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2
      }
    );

    // Clear mocks
    jest.clearAllMocks();
  });

  describe('Error Classes', () => {
    it('should create AnalysisError with correct properties', () => {
      const error = new AnalysisError(
        'Internal message',
        'User message',
        AnalysisErrorType.Timeout,
        { fileCount: 1000 }
      );

      expect(error.message).toBe('Internal message');
      expect(error.userMessage).toBe('User message');
      expect(error.category).toBe(ErrorCategory.Analysis);
      expect(error.type).toBe(AnalysisErrorType.Timeout);
      expect(error.context).toEqual({ fileCount: 1000 });
    });

    it('should create AIError with correct properties', () => {
      const error = new AIError(
        'Internal message',
        'User message',
        AIErrorType.ServiceUnavailable
      );

      expect(error.message).toBe('Internal message');
      expect(error.userMessage).toBe('User message');
      expect(error.category).toBe(ErrorCategory.AI);
      expect(error.type).toBe(AIErrorType.ServiceUnavailable);
    });

    it('should create RenderError with correct properties', () => {
      const error = new RenderError(
        'Internal message',
        'User message',
        RenderErrorType.InvalidData
      );

      expect(error.message).toBe('Internal message');
      expect(error.userMessage).toBe('User message');
      expect(error.category).toBe(ErrorCategory.Rendering);
      expect(error.type).toBe(RenderErrorType.InvalidData);
    });

    it('should create IDEError with correct properties', () => {
      const error = new IDEError(
        'Internal message',
        'User message',
        IDEErrorType.WorkspaceUnavailable
      );

      expect(error.message).toBe('Internal message');
      expect(error.userMessage).toBe('User message');
      expect(error.category).toBe(ErrorCategory.IDE);
      expect(error.type).toBe(IDEErrorType.WorkspaceUnavailable);
    });

    it('should capture stack trace', () => {
      const error = new AnalysisError(
        'Test error',
        'User message',
        AnalysisErrorType.ParseError
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AnalysisError');
    });

    it('should include cause error', () => {
      const cause = new Error('Original error');
      const error = new AnalysisError(
        'Wrapped error',
        'User message',
        AnalysisErrorType.ParseError,
        undefined,
        cause
      );

      expect(error.cause).toBe(cause);
    });
  });

  describe('handleAnalysisError', () => {
    it('should log error details', () => {
      const error = new AnalysisError(
        'Analysis failed',
        'Could not analyze codebase',
        AnalysisErrorType.Timeout,
        { fileCount: 1000 }
      );

      errorHandler.handleAnalysisError(error);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logOutput = (mockOutputChannel.appendLine as jest.Mock).mock.calls
        .map(call => call[0])
        .join('\n');

      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('Analysis failed');
      expect(logOutput).toContain('Could not analyze codebase');
      expect(logOutput).toContain('analysis');
      expect(logOutput).toContain('fileCount');
    });

    it('should show error message to user', () => {
      const error = new AnalysisError(
        'Analysis failed',
        'Could not analyze codebase',
        AnalysisErrorType.FileSystemAccess
      );

      errorHandler.handleAnalysisError(error);

      expect(mockNotifier.showErrorMessage).toHaveBeenCalledWith(
        'Failed to analyze codebase: Could not analyze codebase',
        expect.any(String),
        expect.any(String)
      );
    });

    it('should offer partial analysis for timeout errors', () => {
      const error = new AnalysisError(
        'Analysis timed out',
        'Analysis took too long',
        AnalysisErrorType.Timeout
      );

      errorHandler.handleAnalysisError(error);

      expect(mockNotifier.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Partial Analysis',
        'Retry',
        'View Logs'
      );
    });

    it('should offer retry for parse errors', () => {
      const error = new AnalysisError(
        'Parse failed',
        'Could not parse file',
        AnalysisErrorType.ParseError
      );

      errorHandler.handleAnalysisError(error);

      expect(mockNotifier.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Retry',
        'View Logs'
      );
    });
  });

  describe('handleAIError', () => {
    it('should log warning for AI errors', () => {
      const error = new AIError(
        'AI service unavailable',
        'AI features not available',
        AIErrorType.ServiceUnavailable
      );

      errorHandler.handleAIError(error);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logOutput = (mockOutputChannel.appendLine as jest.Mock).mock.calls
        .map(call => call[0])
        .join('\n');

      expect(logOutput).toContain('[WARN]');
      expect(logOutput).toContain('AI enhancement failed');
    });

    it('should show non-blocking warning to user', () => {
      const error = new AIError(
        'AI service unavailable',
        'AI features not available',
        AIErrorType.ServiceUnavailable
      );

      errorHandler.handleAIError(error);

      expect(mockNotifier.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('AI features unavailable'),
        'View Logs'
      );
    });

    it('should indicate fallback will be used', () => {
      const error = new AIError(
        'Malformed response',
        'Invalid AI response',
        AIErrorType.MalformedResponse
      );

      errorHandler.handleAIError(error);

      expect(mockNotifier.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Diagram will still be generated'),
        'View Logs'
      );
    });
  });

  describe('handleRenderError', () => {
    it('should log error details', () => {
      const error = new RenderError(
        'Rendering failed',
        'Could not render diagram',
        RenderErrorType.LayoutFailure
      );

      errorHandler.handleRenderError(error);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logOutput = (mockOutputChannel.appendLine as jest.Mock).mock.calls
        .map(call => call[0])
        .join('\n');

      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('Rendering failed');
    });

    it('should show error message to user', () => {
      const error = new RenderError(
        'Rendering failed',
        'Could not render diagram',
        RenderErrorType.WebviewCreation
      );

      errorHandler.handleRenderError(error);

      expect(mockNotifier.showErrorMessage).toHaveBeenCalledWith(
        'Failed to render diagram: Could not render diagram',
        expect.any(String),
        expect.any(String)
      );
    });

    it('should offer export data for invalid data errors', () => {
      const error = new RenderError(
        'Invalid data',
        'Diagram data is invalid',
        RenderErrorType.InvalidData
      );

      errorHandler.handleRenderError(error);

      expect(mockNotifier.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Export Data',
        'View Logs'
      );
    });

    it('should offer retry for layout failures', () => {
      const error = new RenderError(
        'Layout failed',
        'Could not compute layout',
        RenderErrorType.LayoutFailure
      );

      errorHandler.handleRenderError(error);

      expect(mockNotifier.showErrorMessage).toHaveBeenCalledWith(
        expect.any(String),
        'Retry',
        'View Logs'
      );
    });
  });

  describe('handleIDEError', () => {
    it('should log error details', () => {
      const error = new IDEError(
        'IDE API unavailable',
        'Could not access IDE features',
        IDEErrorType.APIUnavailable
      );

      errorHandler.handleIDEError(error);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logOutput = (mockOutputChannel.appendLine as jest.Mock).mock.calls
        .map(call => call[0])
        .join('\n');

      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('IDE integration failed');
    });

    it('should show error message to user', () => {
      const error = new IDEError(
        'Workspace unavailable',
        'No workspace open',
        IDEErrorType.WorkspaceUnavailable
      );

      errorHandler.handleIDEError(error);

      expect(mockNotifier.showErrorMessage).toHaveBeenCalledWith(
        'IDE integration error: No workspace open',
        'View Logs'
      );
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.withRetry(
        operation,
        'test operation'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockRejectedValueOnce(new Error('Attempt 2 failed'))
        .mockResolvedValue('success');

      const result = await errorHandler.withRetry(
        operation,
        'test operation'
      );

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        errorHandler.withRetry(operation, 'test operation')
      ).rejects.toThrow('Operation failed');

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await errorHandler.withRetry(operation, 'test operation');
      const duration = Date.now() - startTime;

      // Should wait at least 10ms + 20ms = 30ms
      expect(duration).toBeGreaterThanOrEqual(30);
    });

    it('should not retry non-retriable errors', async () => {
      const error = new Error('Non-retriable error');
      const operation = jest.fn().mockRejectedValue(error);
      const isRetriable = jest.fn().mockReturnValue(false);

      await expect(
        errorHandler.withRetry(operation, 'test operation', isRetriable)
      ).rejects.toThrow('Non-retriable error');

      expect(operation).toHaveBeenCalledTimes(1);
      expect(isRetriable).toHaveBeenCalledWith(error);
    });

    it('should log retry attempts', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockResolvedValue('success');

      await errorHandler.withRetry(operation, 'test operation');

      const logOutput = (mockOutputChannel.appendLine as jest.Mock).mock.calls
        .map(call => call[0])
        .join('\n');

      expect(logOutput).toContain('Attempting test operation (attempt 1/3)');
      expect(logOutput).toContain('Attempting test operation (attempt 2/3)');
      expect(logOutput).toContain('[WARN]');
      expect(logOutput).toContain('retrying');
    });

    it('should log final failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Failed'));

      await expect(
        errorHandler.withRetry(operation, 'test operation')
      ).rejects.toThrow();

      const logOutput = (mockOutputChannel.appendLine as jest.Mock).mock.calls
        .map(call => call[0])
        .join('\n');

      expect(logOutput).toContain('[ERROR]');
      expect(logOutput).toContain('failed after 3 attempts');
    });
  });

  describe('Logging', () => {
    it('should include timestamp in logs', () => {
      const error = new AnalysisError(
        'Test error',
        'User message',
        AnalysisErrorType.ParseError
      );

      errorHandler.handleAnalysisError(error);

      const logOutput = (mockOutputChannel.appendLine as jest.Mock).mock.calls[0][0];
      expect(logOutput).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should log error context', () => {
      const error = new AnalysisError(
        'Test error',
        'User message',
        AnalysisErrorType.ParseError,
        { filePath: '/test/file.ts', lineNumber: 42 }
      );

      errorHandler.handleAnalysisError(error);

      const logOutput = (mockOutputChannel.appendLine as jest.Mock).mock.calls
        .map(call => call[0])
        .join('\n');

      expect(logOutput).toContain('Context:');
      expect(logOutput).toContain('filePath');
      expect(logOutput).toContain('/test/file.ts');
      expect(logOutput).toContain('lineNumber');
      expect(logOutput).toContain('42');
    });

    it('should log cause error', () => {
      const cause = new Error('Original error');
      cause.stack = 'Original stack trace';
      
      const error = new AnalysisError(
        'Wrapped error',
        'User message',
        AnalysisErrorType.ParseError,
        undefined,
        cause
      );

      errorHandler.handleAnalysisError(error);

      const logOutput = (mockOutputChannel.appendLine as jest.Mock).mock.calls
        .map(call => call[0])
        .join('\n');

      expect(logOutput).toContain('Cause: Original error');
      expect(logOutput).toContain('Cause Stack: Original stack trace');
    });

    it('should log stack trace', () => {
      const error = new AnalysisError(
        'Test error',
        'User message',
        AnalysisErrorType.ParseError
      );

      errorHandler.handleAnalysisError(error);

      const logOutput = (mockOutputChannel.appendLine as jest.Mock).mock.calls
        .map(call => call[0])
        .join('\n');

      expect(logOutput).toContain('Stack:');
    });
  });
});
