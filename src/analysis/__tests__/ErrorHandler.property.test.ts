/**
 * Property-Based Tests for ErrorHandler
 * 
 * Property 5: Error Message Display
 * For any error condition (analysis failure, diagram generation failure, 
 * unanalyzable codebase), the Extension should display a descriptive 
 * error message to the user.
 * 
 * Validates: Requirements 1.6, 10.1, 10.2, 10.5
 */

import * as fc from 'fast-check';
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
  IOutputChannel,
  IUserNotifier
} from '../ErrorHandler';

describe('ErrorHandler - Property-Based Tests', () => {
  describe('Property 5: Error Message Display', () => {
    /**
     * Property: For any error condition, a descriptive error message 
     * should be displayed to the user
     */
    it('should display descriptive error message for any AnalysisError', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary analysis errors
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            userMessage: fc.string({ minLength: 1, maxLength: 200 }),
            type: fc.constantFrom(...Object.values(AnalysisErrorType)),
            context: fc.option(
              fc.dictionary(
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.oneof(
                  fc.string(),
                  fc.integer(),
                  fc.boolean()
                )
              ),
              { nil: undefined }
            )
          }),
          (errorData) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            const error = new AnalysisError(
              errorData.message,
              errorData.userMessage,
              errorData.type as AnalysisErrorType,
              errorData.context
            );

            // Act
            errorHandler.handleAnalysisError(error);

            // Assert: Error message should be displayed to user
            expect(mockNotifier.showErrorMessage).toHaveBeenCalled();
            
            // Assert: Message should contain the user-friendly message
            const displayedMessage = (mockNotifier.showErrorMessage as jest.Mock).mock.calls[0][0];
            expect(displayedMessage).toContain(errorData.userMessage);
            
            // Assert: Message should be descriptive (non-empty)
            expect(displayedMessage.length).toBeGreaterThan(0);
            
            // Assert: Error should be logged for debugging
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display warning message for any AIError', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary AI errors
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            userMessage: fc.string({ minLength: 1, maxLength: 200 }),
            type: fc.constantFrom(...Object.values(AIErrorType))
          }),
          (errorData) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            const error = new AIError(
              errorData.message,
              errorData.userMessage,
              errorData.type as AIErrorType
            );

            // Act
            errorHandler.handleAIError(error);

            // Assert: Warning message should be displayed (non-blocking)
            expect(mockNotifier.showWarningMessage).toHaveBeenCalled();
            
            // Assert: Message should be descriptive
            const displayedMessage = (mockNotifier.showWarningMessage as jest.Mock).mock.calls[0][0];
            expect(displayedMessage.length).toBeGreaterThan(0);
            
            // Assert: Message should indicate fallback behavior
            expect(displayedMessage.toLowerCase()).toMatch(/ai|fallback|basic|still/);
            
            // Assert: Error should be logged
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display descriptive error message for any RenderError', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary render errors
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            userMessage: fc.string({ minLength: 1, maxLength: 200 }),
            type: fc.constantFrom(...Object.values(RenderErrorType))
          }),
          (errorData) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            const error = new RenderError(
              errorData.message,
              errorData.userMessage,
              errorData.type as RenderErrorType
            );

            // Act
            errorHandler.handleRenderError(error);

            // Assert: Error message should be displayed
            expect(mockNotifier.showErrorMessage).toHaveBeenCalled();
            
            // Assert: Message should contain user-friendly message
            const displayedMessage = (mockNotifier.showErrorMessage as jest.Mock).mock.calls[0][0];
            expect(displayedMessage).toContain(errorData.userMessage);
            
            // Assert: Message should be descriptive
            expect(displayedMessage.length).toBeGreaterThan(0);
            
            // Assert: Error should be logged
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display descriptive error message for any IDEError', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary IDE errors
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            userMessage: fc.string({ minLength: 1, maxLength: 200 }),
            type: fc.constantFrom(...Object.values(IDEErrorType))
          }),
          (errorData) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            const error = new IDEError(
              errorData.message,
              errorData.userMessage,
              errorData.type as IDEErrorType
            );

            // Act
            errorHandler.handleIDEError(error);

            // Assert: Error message should be displayed
            expect(mockNotifier.showErrorMessage).toHaveBeenCalled();
            
            // Assert: Message should contain user-friendly message
            const displayedMessage = (mockNotifier.showErrorMessage as jest.Mock).mock.calls[0][0];
            expect(displayedMessage).toContain(errorData.userMessage);
            
            // Assert: Message should be descriptive
            expect(displayedMessage.length).toBeGreaterThan(0);
            
            // Assert: Error should be logged
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Error messages should always include actionable items
     */
    it('should provide actionable items with every error message', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Generate various error types
            fc.record({
              type: fc.constant('analysis'),
              errorType: fc.constantFrom(...Object.values(AnalysisErrorType)),
              message: fc.string({ minLength: 1, maxLength: 100 }),
              userMessage: fc.string({ minLength: 1, maxLength: 100 })
            }),
            fc.record({
              type: fc.constant('render'),
              errorType: fc.constantFrom(...Object.values(RenderErrorType)),
              message: fc.string({ minLength: 1, maxLength: 100 }),
              userMessage: fc.string({ minLength: 1, maxLength: 100 })
            }),
            fc.record({
              type: fc.constant('ide'),
              errorType: fc.constantFrom(...Object.values(IDEErrorType)),
              message: fc.string({ minLength: 1, maxLength: 100 }),
              userMessage: fc.string({ minLength: 1, maxLength: 100 })
            })
          ),
          (errorData) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            // Act
            if (errorData.type === 'analysis') {
              const error = new AnalysisError(
                errorData.message,
                errorData.userMessage,
                errorData.errorType as AnalysisErrorType
              );
              errorHandler.handleAnalysisError(error);
            } else if (errorData.type === 'render') {
              const error = new RenderError(
                errorData.message,
                errorData.userMessage,
                errorData.errorType as RenderErrorType
              );
              errorHandler.handleRenderError(error);
            } else {
              const error = new IDEError(
                errorData.message,
                errorData.userMessage,
                errorData.errorType as IDEErrorType
              );
              errorHandler.handleIDEError(error);
            }

            // Assert: Error message should include action items
            expect(mockNotifier.showErrorMessage).toHaveBeenCalled();
            
            const callArgs = (mockNotifier.showErrorMessage as jest.Mock).mock.calls[0];
            const actions = callArgs.slice(1); // All arguments after the message
            
            // Assert: At least one action should be provided
            expect(actions.length).toBeGreaterThan(0);
            
            // Assert: Actions should be non-empty strings
            actions.forEach((action: string) => {
              expect(typeof action).toBe('string');
              expect(action.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: All errors should be logged with sufficient detail
     */
    it('should log detailed information for any error', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            userMessage: fc.string({ minLength: 1, maxLength: 200 }),
            type: fc.constantFrom(...Object.values(AnalysisErrorType)),
            context: fc.option(
              fc.dictionary(
                fc.string({ minLength: 1, maxLength: 50 }),
                fc.string({ minLength: 1, maxLength: 100 })
              ),
              { nil: undefined }
            )
          }),
          (errorData) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            const error = new AnalysisError(
              errorData.message,
              errorData.userMessage,
              errorData.type as AnalysisErrorType,
              errorData.context
            );

            // Act
            errorHandler.handleAnalysisError(error);

            // Assert: Error should be logged
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();
            
            // Collect all log output
            const logOutput = (mockOutputChannel.appendLine as jest.Mock).mock.calls
              .map(call => call[0])
              .join('\n');
            
            // Assert: Log should contain error level indicator
            expect(logOutput).toMatch(/\[ERROR\]/);
            
            // Assert: Log should contain timestamp
            expect(logOutput).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
            
            // Assert: Log should contain internal message
            expect(logOutput).toContain(errorData.message);
            
            // Assert: Log should contain user message
            expect(logOutput).toContain(errorData.userMessage);
            
            // Assert: Log should contain error category
            expect(logOutput).toContain('analysis');
            
            // Assert: If context exists, it should be logged
            if (errorData.context) {
              expect(logOutput).toContain('Context:');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Error messages should be consistent in format
     */
    it('should format all error messages consistently', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              message: fc.string({ minLength: 1, maxLength: 100 }),
              userMessage: fc.string({ minLength: 1, maxLength: 100 }),
              type: fc.constantFrom(...Object.values(AnalysisErrorType))
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (errorDataArray) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            const displayedMessages: string[] = [];

            // Act: Handle multiple errors
            errorDataArray.forEach(errorData => {
              const error = new AnalysisError(
                errorData.message,
                errorData.userMessage,
                errorData.type as AnalysisErrorType
              );
              errorHandler.handleAnalysisError(error);
              
              const lastCall = (mockNotifier.showErrorMessage as jest.Mock).mock.calls.slice(-1)[0];
              displayedMessages.push(lastCall[0]);
            });

            // Assert: All messages should follow consistent format
            displayedMessages.forEach(message => {
              // Should start with consistent prefix
              expect(message).toMatch(/^Failed to analyze codebase:/);
              
              // Should be non-empty
              expect(message.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * Property: No error should be silently swallowed
     */
    it('should never silently swallow errors without notification', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.record({
              type: fc.constant('analysis'),
              errorType: fc.constantFrom(...Object.values(AnalysisErrorType)),
              message: fc.string({ minLength: 1 }),
              userMessage: fc.string({ minLength: 1 })
            }),
            fc.record({
              type: fc.constant('ai'),
              errorType: fc.constantFrom(...Object.values(AIErrorType)),
              message: fc.string({ minLength: 1 }),
              userMessage: fc.string({ minLength: 1 })
            }),
            fc.record({
              type: fc.constant('render'),
              errorType: fc.constantFrom(...Object.values(RenderErrorType)),
              message: fc.string({ minLength: 1 }),
              userMessage: fc.string({ minLength: 1 })
            }),
            fc.record({
              type: fc.constant('ide'),
              errorType: fc.constantFrom(...Object.values(IDEErrorType)),
              message: fc.string({ minLength: 1 }),
              userMessage: fc.string({ minLength: 1 })
            })
          ),
          (errorData) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            // Act
            if (errorData.type === 'analysis') {
              const error = new AnalysisError(
                errorData.message,
                errorData.userMessage,
                errorData.errorType as AnalysisErrorType
              );
              errorHandler.handleAnalysisError(error);
            } else if (errorData.type === 'ai') {
              const error = new AIError(
                errorData.message,
                errorData.userMessage,
                errorData.errorType as AIErrorType
              );
              errorHandler.handleAIError(error);
            } else if (errorData.type === 'render') {
              const error = new RenderError(
                errorData.message,
                errorData.userMessage,
                errorData.errorType as RenderErrorType
              );
              errorHandler.handleRenderError(error);
            } else {
              const error = new IDEError(
                errorData.message,
                errorData.userMessage,
                errorData.errorType as IDEErrorType
              );
              errorHandler.handleIDEError(error);
            }

            // Assert: Error must be either shown to user OR logged (or both)
            const userNotified = 
              (mockNotifier.showErrorMessage as jest.Mock).mock.calls.length > 0 ||
              (mockNotifier.showWarningMessage as jest.Mock).mock.calls.length > 0;
            
            const logged = (mockOutputChannel.appendLine as jest.Mock).mock.calls.length > 0;

            // At least one notification method must be called
            expect(userNotified || logged).toBe(true);
            
            // In practice, both should be called for proper error handling
            expect(userNotified).toBe(true);
            expect(logged).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 26: Error Logging
   * 
   * For any error that occurs during extension operation, 
   * detailed error information should be logged to the IDE console.
   * 
   * Validates: Requirements 10.4
   */
  describe('Property 26: Error Logging', () => {
    it('should log detailed error information for any error type', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Generate various error types
            fc.record({
              errorType: fc.constant('analysis'),
              message: fc.string({ minLength: 1, maxLength: 200 }),
              userMessage: fc.string({ minLength: 1, maxLength: 200 }),
              specificType: fc.constantFrom(...Object.values(AnalysisErrorType)),
              context: fc.option(
                fc.dictionary(
                  fc.string({ minLength: 1, maxLength: 50 }),
                  fc.oneof(fc.string(), fc.integer(), fc.boolean())
                ),
                { nil: undefined }
              )
            }),
            fc.record({
              errorType: fc.constant('ai'),
              message: fc.string({ minLength: 1, maxLength: 200 }),
              userMessage: fc.string({ minLength: 1, maxLength: 200 }),
              specificType: fc.constantFrom(...Object.values(AIErrorType)),
              context: fc.option(
                fc.dictionary(
                  fc.string({ minLength: 1, maxLength: 50 }),
                  fc.oneof(fc.string(), fc.integer(), fc.boolean())
                ),
                { nil: undefined }
              )
            }),
            fc.record({
              errorType: fc.constant('render'),
              message: fc.string({ minLength: 1, maxLength: 200 }),
              userMessage: fc.string({ minLength: 1, maxLength: 200 }),
              specificType: fc.constantFrom(...Object.values(RenderErrorType)),
              context: fc.option(
                fc.dictionary(
                  fc.string({ minLength: 1, maxLength: 50 }),
                  fc.oneof(fc.string(), fc.integer(), fc.boolean())
                ),
                { nil: undefined }
              )
            }),
            fc.record({
              errorType: fc.constant('ide'),
              message: fc.string({ minLength: 1, maxLength: 200 }),
              userMessage: fc.string({ minLength: 1, maxLength: 200 }),
              specificType: fc.constantFrom(...Object.values(IDEErrorType)),
              context: fc.option(
                fc.dictionary(
                  fc.string({ minLength: 1, maxLength: 50 }),
                  fc.oneof(fc.string(), fc.integer(), fc.boolean())
                ),
                { nil: undefined }
              )
            })
          ),
          (errorData) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            // Act: Create and handle the appropriate error type
            let error: AnalysisError | AIError | RenderError | IDEError;
            
            if (errorData.errorType === 'analysis') {
              error = new AnalysisError(
                errorData.message,
                errorData.userMessage,
                errorData.specificType as AnalysisErrorType,
                errorData.context
              );
              errorHandler.handleAnalysisError(error);
            } else if (errorData.errorType === 'ai') {
              error = new AIError(
                errorData.message,
                errorData.userMessage,
                errorData.specificType as AIErrorType,
                errorData.context
              );
              errorHandler.handleAIError(error);
            } else if (errorData.errorType === 'render') {
              error = new RenderError(
                errorData.message,
                errorData.userMessage,
                errorData.specificType as RenderErrorType,
                errorData.context
              );
              errorHandler.handleRenderError(error);
            } else {
              error = new IDEError(
                errorData.message,
                errorData.userMessage,
                errorData.specificType as IDEErrorType,
                errorData.context
              );
              errorHandler.handleIDEError(error);
            }

            // Assert: Error information should be logged to IDE console
            expect(mockOutputChannel.appendLine).toHaveBeenCalled();

            // Collect all logged output
            const loggedLines = (mockOutputChannel.appendLine as jest.Mock).mock.calls
              .map(call => call[0]);
            const fullLog = loggedLines.join('\n');

            // Assert: Log should contain error level indicator
            expect(fullLog).toMatch(/\[ERROR\]|\[WARN\]/);

            // Assert: Log should contain timestamp (ISO format)
            expect(fullLog).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

            // Assert: Log should contain the internal error message
            expect(fullLog).toContain(errorData.message);

            // Assert: Log should contain the user-friendly message (except for AI errors which use warning level)
            if (errorData.errorType !== 'ai') {
              expect(fullLog).toContain(errorData.userMessage);
            }

            // Assert: Log should contain error category
            expect(fullLog.toLowerCase()).toMatch(/category:|analysis|ai|rendering|ide/);

            // Assert: If context exists, it should be logged (except for AI errors which use warning level)
            if (errorData.context && Object.keys(errorData.context).length > 0 && errorData.errorType !== 'ai') {
              expect(fullLog).toContain('Context:');
            }

            // Assert: Log should be detailed (multiple lines for comprehensive info)
            expect(loggedLines.length).toBeGreaterThan(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log errors with stack traces when available', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            userMessage: fc.string({ minLength: 1, maxLength: 200 }),
            type: fc.constantFrom(...Object.values(AnalysisErrorType))
          }),
          (errorData) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            // Create error with stack trace
            const error = new AnalysisError(
              errorData.message,
              errorData.userMessage,
              errorData.type as AnalysisErrorType
            );

            // Act
            errorHandler.handleAnalysisError(error);

            // Assert: Stack trace should be logged
            const fullLog = (mockOutputChannel.appendLine as jest.Mock).mock.calls
              .map(call => call[0])
              .join('\n');

            // Stack trace should be present (errors automatically have stack traces)
            expect(fullLog).toContain('Stack:');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log errors with cause chain when available', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            userMessage: fc.string({ minLength: 1, maxLength: 200 }),
            type: fc.constantFrom(...Object.values(AnalysisErrorType)),
            causeMessage: fc.string({ minLength: 1, maxLength: 200 })
          }),
          (errorData) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            // Create error with cause
            const causeError = new Error(errorData.causeMessage);
            const error = new AnalysisError(
              errorData.message,
              errorData.userMessage,
              errorData.type as AnalysisErrorType,
              undefined,
              causeError
            );

            // Act
            errorHandler.handleAnalysisError(error);

            // Assert: Cause should be logged
            const fullLog = (mockOutputChannel.appendLine as jest.Mock).mock.calls
              .map(call => call[0])
              .join('\n');

            expect(fullLog).toContain('Cause:');
            expect(fullLog).toContain(errorData.causeMessage);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log all errors consistently regardless of type', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.oneof(
              fc.record({
                type: fc.constant('analysis'),
                specificType: fc.constantFrom(...Object.values(AnalysisErrorType)),
                message: fc.string({ minLength: 1, maxLength: 100 }),
                userMessage: fc.string({ minLength: 1, maxLength: 100 })
              }),
              fc.record({
                type: fc.constant('ai'),
                specificType: fc.constantFrom(...Object.values(AIErrorType)),
                message: fc.string({ minLength: 1, maxLength: 100 }),
                userMessage: fc.string({ minLength: 1, maxLength: 100 })
              }),
              fc.record({
                type: fc.constant('render'),
                specificType: fc.constantFrom(...Object.values(RenderErrorType)),
                message: fc.string({ minLength: 1, maxLength: 100 }),
                userMessage: fc.string({ minLength: 1, maxLength: 100 })
              })
            ),
            { minLength: 2, maxLength: 5 }
          ),
          (errorDataArray) => {
            // Arrange
            const mockOutputChannel: jest.Mocked<IOutputChannel> = {
              appendLine: jest.fn(),
              show: jest.fn()
            };

            const mockNotifier: jest.Mocked<IUserNotifier> = {
              showErrorMessage: jest.fn().mockResolvedValue(undefined),
              showWarningMessage: jest.fn().mockResolvedValue(undefined)
            };

            const errorHandler = new ErrorHandler(mockOutputChannel, mockNotifier);

            // Act: Handle multiple errors of different types
            errorDataArray.forEach(errorData => {
              if (errorData.type === 'analysis') {
                const error = new AnalysisError(
                  errorData.message,
                  errorData.userMessage,
                  errorData.specificType as AnalysisErrorType
                );
                errorHandler.handleAnalysisError(error);
              } else if (errorData.type === 'ai') {
                const error = new AIError(
                  errorData.message,
                  errorData.userMessage,
                  errorData.specificType as AIErrorType
                );
                errorHandler.handleAIError(error);
              } else {
                const error = new RenderError(
                  errorData.message,
                  errorData.userMessage,
                  errorData.specificType as RenderErrorType
                );
                errorHandler.handleRenderError(error);
              }
            });

            // Assert: All errors should be logged
            const callCount = (mockOutputChannel.appendLine as jest.Mock).mock.calls.length;
            expect(callCount).toBeGreaterThan(0);

            // Assert: Each error should have consistent log format
            const fullLog = (mockOutputChannel.appendLine as jest.Mock).mock.calls
              .map(call => call[0])
              .join('\n');

            // All errors should have timestamps
            const timestampMatches = fullLog.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g);
            expect(timestampMatches).not.toBeNull();
            expect(timestampMatches!.length).toBeGreaterThanOrEqual(errorDataArray.length);

            // All errors should have level indicators
            const levelMatches = fullLog.match(/\[ERROR\]|\[WARN\]/g);
            expect(levelMatches).not.toBeNull();
            expect(levelMatches!.length).toBeGreaterThanOrEqual(errorDataArray.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

