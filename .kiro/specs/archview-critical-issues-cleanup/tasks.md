# Implementation Plan

## Overview

This implementation plan addresses 20 critical issues in the ArchView VS Code extension organized into 4 phases based on priority and dependencies. The workflow follows the exploratory bugfix methodology: write tests BEFORE fixes to understand bugs, then implement fixes, then verify fixes work and preserve existing functionality.

## Phase 1: Foundation Fixes (Issues 1.1, 1.19)

These foundational fixes establish clean code structure by resolving type system conflicts and removing dead code. They must be completed first as other fixes depend on them.

### Exploratory Tests (Phase 1)

- [x] 1. Write bug condition exploration tests for Phase 1 issues
  - **Property 1: Fault Condition** - Type System and Code Structure Issues
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failures confirm the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - Test Issue 1.1: Create test that throws AnalysisError from types/index.ts and catches with instanceof check using ErrorHandler.ts import - assert instanceof returns true (will fail on unfixed code due to type collision). Also test RenderError and AIError which are also duplicated.
  - Test Issue 1.19: Search for imports of GroundingDataBuilder - assert file is imported somewhere (will fail on unfixed code, no imports found)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 2.1, 2.18, 2.19_

- [x] 2. Write preservation property tests for Phase 1 (BEFORE implementing fixes)
  - **Property 2: Preservation** - Core Functionality Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for normal operations
  - Test diagram generation workflow with valid TypeScript project
  - Test error handling for non-type-collision errors
  - Test AST traversal for normal code analysis
  - Write property-based tests capturing observed behavior patterns
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.3, 3.7_


### Implementation (Phase 1)

- [x] 3. Fix Phase 1 issues - Foundation fixes

  - [x] 3.1 Issue 1.1 - Consolidate duplicate error classes (AnalysisError, RenderError, AIError)
    - Analyze all three error class definitions (types/index.ts vs ErrorHandler.ts)
    - Compare constructor signatures for AnalysisError, RenderError, and AIError
    - Choose canonical definition (keep ErrorHandler.ts versions as more complete with error categorization)
    - Delete AnalysisError, RenderError, and AIError from src/types/index.ts (lines 201-232)
    - Update all imports from `import { AnalysisError, RenderError, AIError } from '../types'` to import from ErrorHandler.ts
    - Search codebase for all error class imports and update them
    - _Bug_Condition: isBugCondition(input) where input.errorClassImport AND hasDuplicateErrorClass(input)_
    - _Expected_Behavior: Single definitions for all three error classes with consistent constructors, instanceof checks work correctly_
    - _Preservation: Error handling for non-type-collision errors remains unchanged_
    - _Requirements: 2.1_

  - [x] 3.2 Issue 1.19 - Delete dead code (GroundingDataBuilder.ts)
    - Verify no imports of GroundingDataBuilder exist in codebase
    - Delete src/analysis/GroundingDataBuilder.ts entirely (847 lines)
    - Verify TypeScript compilation succeeds without the file
    - _Bug_Condition: isBugCondition(input) where input.codebaseFiles AND hasDeadCode(input)_
    - _Expected_Behavior: File deleted, codebase compiles successfully_
    - _Preservation: All other analysis functionality remains unchanged_
    - _Requirements: 2.19_

  - [x] 3.3 Verify Phase 1 exploration tests now pass
    - **Property 1: Expected Behavior** - Type System Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - Verify instanceof checks work for AnalysisError, RenderError, and AIError
    - Verify GroundingDataBuilder.ts is deleted and codebase compiles
    - _Requirements: 2.1, 2.19_

  - [x] 3.4 Verify Phase 1 preservation tests still pass
    - **Property 2: Preservation** - Core Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm diagram generation still works
    - Confirm error handling still works for normal errors

- [x] 4. Phase 1 Checkpoint - Ensure all tests pass
  - Run full test suite for Phase 1 (`npm test`)
  - Verify no regressions in core functionality
  - Ask user if questions arise before proceeding to Phase 2


## Phase 2: Critical Fixes (Issues 1.2-1.7)

These critical fixes address security vulnerabilities, performance issues, and functionality problems. They depend on Phase 1 being complete.

### Exploratory Tests (Phase 2)

- [x] 5. Write bug condition exploration tests for Phase 2 issues
  - **Property 1: Fault Condition** - Critical Security and Performance Issues
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failures confirm the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - Test Issue 1.2: Measure extension activation time on VS Code startup without running archview commands - assert extension is NOT activated (will fail, extension loads immediately)
  - Test Issue 1.3: Analyze ExtensionController.ts (lines 182, 481) and WebviewManager.ts (line 123) for require() calls - assert all imports are at top level (will fail, require() found in 3 locations)
  - Test Issue 1.4: Search for bracket notation method access - assert no bracket notation used (will fail, found at line 439)
  - Test Issue 1.5: Call createEmptyTree() and try to parse code - assert parser can parse (will fail, no language set). NOTE: Method IS used at lines 133, 148, 173 as fallback.
  - Test Issue 1.6: Call parseWithWorkerThreads() and trace execution - assert worker threads are used (will fail, always falls back)
  - Test Issue 1.7: Generate cache keys for similar content - assert no collisions with 32-bit hash (may fail, collision risk)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 6. Write preservation property tests for Phase 2 (BEFORE implementing fixes)
  - **Property 2: Preservation** - Core Functionality Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for normal operations
  - Test diagram generation with various project types
  - Test webview display and interaction
  - Test parser functionality for supported languages
  - Test cache functionality for normal operations
  - Write property-based tests capturing observed behavior
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_


### Implementation (Phase 2)

- [ ] 7. Fix Phase 2 issues - Critical fixes

  - [x] 7.1 Issue 1.2 - Fix eager extension activation
    - Open package.json
    - Change line 15 from `"activationEvents": ["*"]` to `"activationEvents": ["onCommand:archview.generateDiagram", "onCommand:archview.refreshDiagram", "onCommand:archview.exportDiagram"]`
    - Verify all three commands are registered in ExtensionController.ts activate() method
    - _Bug_Condition: isBugCondition(input) where input.extensionActivation AND activationEvents == ["*"]_
    - _Expected_Behavior: Extension only activates when archview commands are invoked_
    - _Preservation: All commands continue to work when invoked_
    - _Requirements: 2.2_

  - [x] 7.2 PREREQUISITE - Install @types/vscode
    - Run `npm install --save-dev @types/vscode` to add TypeScript definitions
    - This is REQUIRED before Issue 7.3 to avoid compilation errors
    - Verify package.json devDependencies includes @types/vscode

  - [ ] 7.3 Issue 1.3 - Replace runtime require with static imports
    - In ExtensionController.ts: Add `import * as vscode from 'vscode'` at top of file
    - Remove line 182 in registerCommands(): `const vscode = require('vscode')`
    - Remove line 481 in generateDiagram() catch block: `const vscode = require('vscode')`
    - In WebviewManager.ts: Add `import * as vscode from 'vscode'` at top of file
    - Remove line 123 in createWebviewPanel(): `const vscode = require('vscode')`
    - Verify TypeScript type checking works for vscode module usage
    - _Bug_Condition: isBugCondition(input) where input.moduleImport AND usesRuntimeRequire(input)_
    - _Expected_Behavior: Top-level imports enable TypeScript type checking_
    - _Preservation: All vscode API usage continues to work identically_
    - _Requirements: 2.3_

  - [ ] 7.4 Issue 1.4 - Fix private method access
    - In KiroAIService.ts: Change buildHeuristicModel from private to public (Option A - simpler)
    - In ExtensionController.ts line 439: Change from `this.aiService['buildHeuristicModel'](...)` to `this.aiService.buildHeuristicModel(...)`
    - Alternative Option B: Extract to HeuristicModelBuilder service with dependency injection (if method should stay private)
    - _Bug_Condition: isBugCondition(input) where input.methodAccess AND usesBracketNotationForPrivate(input)_
    - _Expected_Behavior: Proper access modifiers and method calls without bracket notation_
    - _Preservation: Heuristic model building produces identical results_
    - _Requirements: 2.4_

  - [ ] 7.5 Issue 1.5 - Fix parser initialization
    - NOTE: createEmptyTree() IS used at lines 133, 148, 173 as fallback - cannot be deleted
    - Fix lines 367-370 in ParserManager.ts to call `parser.setLanguage(this.getDefaultLanguage())` before `parser.parse('')`
    - Add getDefaultLanguage() helper method that returns a default language grammar
    - _Bug_Condition: isBugCondition(input) where input.parserCreation AND NOT hasLanguageSet(input)_
    - _Expected_Behavior: Parser has language set before parsing_
    - _Preservation: All other parser functionality remains unchanged_
    - _Requirements: 2.5_

  - [ ] 7.6 Issue 1.6 - Remove dead worker thread code
    - In AnalysisOptimizer.ts: Delete parseWithWorkerThreads method (lines 106-114)
    - Remove Worker support check (lines 63-65)
    - Update any callers to use parseWithAsyncBatching directly
    - Remove worker-related imports
    - _Bug_Condition: isBugCondition(input) where input.workerThreadUsage AND isDeadCode(input)_
    - _Expected_Behavior: Dead code removed, async batching works correctly_
    - _Preservation: Parsing produces identical results using async batching_
    - _Requirements: 2.6_

  - [ ] 7.7 Issue 1.7 - Use secure hash function
    - In AnalysisOptimizer.ts: Add `import * as crypto from 'crypto'` at top
    - Replace custom hash at lines 196-205 with `return crypto.createHash('sha256').update(content).digest('hex')`
    - Remove old 32-bit hash implementation
    - _Bug_Condition: isBugCondition(input) where input.hashFunction AND hasCollisionRisk(input)_
    - _Expected_Behavior: SHA-256 hash with no collision risk_
    - _Preservation: Cache functionality works correctly with new hash_
    - _Requirements: 2.7_

  - [ ] 7.8 Verify Phase 2 exploration tests now pass
    - **Property 1: Expected Behavior** - Critical Issues Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 5 - do NOT write new tests
    - Run bug condition exploration tests from step 5
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - Verify extension only activates on commands
    - Verify static imports enable type checking
    - Verify method access works without bracket notation
    - Verify parser initialization works
    - Verify worker thread code is removed
    - Verify SHA-256 hash has no collisions
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 7.9 Verify Phase 2 preservation tests still pass
    - **Property 2: Preservation** - Core Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 6 - do NOT write new tests
    - Run preservation property tests from step 6
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm diagram generation still works
    - Confirm webview display still works
    - Confirm parser functionality still works
    - Confirm cache functionality still works

- [ ] 8. Phase 2 Checkpoint - Ensure all tests pass
  - Run full test suite for Phase 2 (`npm test`)
  - Verify no regressions in core functionality
  - Ask user if questions arise before proceeding to Phase 3


## Phase 3: Medium Severity Fixes (Issues 1.8-1.14, 1.18)

These medium severity fixes address reliability, performance, security issues, and code deduplication. They are mostly independent and can be done in any order. Issue 1.18 is moved here after import fixes are complete.

### Exploratory Tests (Phase 3)

- [ ] 9. Write bug condition exploration tests for Phase 3 issues
  - **Property 1: Fault Condition** - Medium Severity Issues
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failures confirm the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - Test Issue 1.8: Instantiate FileWatcher, call setupWatchers(), modify watched file - assert change detected (will fail, empty implementation)
  - Test Issue 1.9: Call saveState() with test data, restart extension, call loadState() - assert state persisted (will fail, stub implementation)
  - Test Issue 1.10: Call getWorkspaceRoot() in workspace - assert returns workspace folder path (will fail, returns process.cwd())
  - Test Issue 1.11: Set archview.maxFiles in settings, call getAnalysisConfig() - assert returns configured value (will fail, hardcoded default). NOTE: package.json already has configuration schema.
  - Test Issue 1.12: Measure time for releaseMemory() - assert completes in < 500ms (will fail, takes 2000ms due to polling loop)
  - Test Issue 1.13: Call setupWebviewMessageHandling() 100 times, check handler count - assert handlers cleaned up (will fail, accumulate)
  - Test Issue 1.14: Pass malicious glob pattern to globToRegex() - assert safely escaped (may fail, injection risk)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found
  - _Requirements: 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14_

- [ ] 10. Write preservation property tests for Phase 3 (BEFORE implementing fixes)
  - **Property 2: Preservation** - Core Functionality Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for normal operations
  - Test workspace detection for normal cases
  - Test configuration reading for default values
  - Test memory cleanup functionality (just timing changes)
  - Test glob pattern matching for normal patterns
  - Write property-based tests capturing observed behavior
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior)
  - _Requirements: 3.5, 3.8, 3.10_


### Implementation (Phase 3)

- [ ] 11. Fix Phase 3 issues - Medium severity fixes

  - [ ] 11.1 Issue 1.8 - Implement or remove FileWatcher
    - Analyze if file watching is a desired feature
    - Option A (implement): Fix lines 127-140 in FileWatcher.ts to use `vscode.workspace.createFileSystemWatcher()`
    - Option A: Add handlers for onDidChange, onDidCreate, onDidDelete events
    - Option A: Store watchers in array for disposal
    - Option B (remove): Delete src/analysis/FileWatcher.ts and remove from ExtensionController.ts
    - _Bug_Condition: isBugCondition(input) where input.fileWatcherSetup AND isEmptyImplementation(input)_
    - _Expected_Behavior: Actual file watching implemented or class removed_
    - _Preservation: If removed, no file watching was working anyway; if implemented, new feature_
    - _Requirements: 2.8_

  - [ ] 11.2 Issue 1.9 - Implement or remove state persistence
    - Analyze if state persistence is needed
    - Option A (implement): Fix lines 780-810 to use `this.context.globalState.get()` and `this.context.globalState.update()`
    - Option A: Add ExtensionState interface with state properties
    - Option A: Persist lastAnalysisTime, cachedDiagram, and other state
    - Option B (remove): Delete loadState() and saveState() methods entirely
    - _Bug_Condition: isBugCondition(input) where input.stateManagement AND isStubImplementation(input)_
    - _Expected_Behavior: State actually persisted or methods removed_
    - _Preservation: If removed, no state was persisting anyway; if implemented, new feature_
    - _Requirements: 2.9_

  - [ ] 11.3 Issue 1.10 - Fix workspace root detection
    - In ExtensionController.ts: Change getWorkspaceRoot() at lines 667-671
    - Replace `return process.cwd()` with `return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd()`
    - _Bug_Condition: isBugCondition(input) where input.workspaceRoot AND returnsWrongDirectory(input)_
    - _Expected_Behavior: Returns actual workspace folder path_
    - _Preservation: Workspace detection works correctly for normal cases_
    - _Requirements: 2.10_

  - [ ] 11.4 Issue 1.11 - Implement configuration reading
    - NOTE: package.json already has complete configuration schema - do NOT add it again
    - In ExtensionController.ts: Fix getAnalysisConfig() at lines 693-731
    - Use `const config = vscode.workspace.getConfiguration('archview')`
    - Read each config value with `config.get<type>('key', defaultValue)`
    - Fix registerConfigurationListener() at lines 733-745 to use `vscode.workspace.onDidChangeConfiguration()`
    - Add handleConfigurationChange() method to invalidate cache and offer refresh
    - _Bug_Condition: isBugCondition(input) where input.configurationAccess AND usesHardcodedDefaults(input)_
    - _Expected_Behavior: Configuration read from VS Code settings_
    - _Preservation: Default values remain the same, now user-configurable_
    - _Requirements: 2.11_

  - [ ] 11.5 Issue 1.12 - Remove artificial delay
    - In MemoryManager.ts: Fix releaseMemory() at lines 183-195
    - NOTE: Current code uses setInterval polling loop checking elapsed time every 100ms
    - Remove the polling loop that waits full 2 seconds even after cleanup completes
    - Return immediately after cleanup completes
    - _Bug_Condition: isBugCondition(input) where input.memoryRelease AND hasArtificialDelay(input)_
    - _Expected_Behavior: Returns immediately after cleanup_
    - _Preservation: Cleanup functionality identical, just faster_
    - _Requirements: 2.12_

  - [ ] 11.6 Issue 1.13 - Fix message handler memory leak
    - In WebviewManager.ts: Add `private messageHandlers: vscode.Disposable[] = []` property
    - Fix onMessage() at lines 71-73 to store disposables in messageHandlers array
    - Fix setupWebviewMessageHandling() at line 89 to dispose old handlers first
    - Add dispose() method to clean up all handlers
    - _Bug_Condition: isBugCondition(input) where input.messageHandlers AND hasMemoryLeak(input)_
    - _Expected_Behavior: Handlers properly disposed, no memory leak_
    - _Preservation: Message handling functionality identical_
    - _Requirements: 2.13_

  - [ ] 11.7 Issue 1.14 - Fix glob pattern security
    - In FileScanner.ts: Fix globToRegex() at lines 336-352
    - Option A (recommended): Replace with `import * as minimatch from 'minimatch'` and use `minimatch.makeRe(pattern)`
    - Option B: Properly escape special characters in custom implementation
    - _Bug_Condition: isBugCondition(input) where input.globPattern AND hasRegexInjectionRisk(input)_
    - _Expected_Behavior: Glob patterns safely converted to regex_
    - _Preservation: Normal glob patterns work identically_
    - _Requirements: 2.14_

  - [ ] 11.8 Verify Phase 3 exploration tests now pass
    - **Property 1: Expected Behavior** - Medium Severity Issues Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 9 - do NOT write new tests
    - Run bug condition exploration tests from step 9
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - Verify file watching works or is removed
    - Verify state persistence works or is removed
    - Verify workspace root detection works
    - Verify configuration reading works
    - Verify memory release is fast
    - Verify handlers don't leak
    - Verify glob patterns are safe
    - _Requirements: 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14_

  - [ ] 11.9 Verify Phase 3 preservation tests still pass
    - **Property 2: Preservation** - Core Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 10 - do NOT write new tests
    - Run preservation property tests from step 10
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm workspace detection still works
    - Confirm configuration defaults still work
    - Confirm memory cleanup still works
    - Confirm glob patterns still work

- [ ] 12. Phase 3 Checkpoint - Ensure all tests pass
  - Run full test suite for Phase 3 (`npm test`)
  - Verify no regressions in core functionality
  - Ask user if questions arise before proceeding to Phase 4


## Phase 4: Code Quality Fixes (Issues 1.15-1.17, 1.20)

These code quality fixes clean up debug statements, improve type safety, and enhance security. They are independent and can be done in any order.

### Exploratory Tests (Phase 4)

- [ ] 13. Write bug condition exploration tests for Phase 4 issues
  - **Property 1: Fault Condition** - Code Quality Issues
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failures confirm the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - Test Issue 1.15: Search codebase for console.log statements - assert no debug logs (will fail, 10+ found)
  - Test Issue 1.16: List files in repository root - assert no troubleshooting markdown files (will fail, 13 found)
  - Test Issue 1.17: Run TypeScript compiler with strict mode - assert no any types (will fail, multiple found)
  - Test Issue 1.20: Generate webview HTML, check CSP header - assert uses nonce-based CSP (will fail, uses unsafe-inline)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found
  - _Requirements: 2.15, 2.16, 2.17, 2.20_

- [ ] 14. Write preservation property tests for Phase 4 (BEFORE implementing fixes)
  - **Property 2: Preservation** - Core Functionality Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for normal operations
  - Test webview rendering and interaction
  - Test type checking for properly typed code
  - Test command execution
  - Write property-based tests capturing observed behavior
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior)
  - _Requirements: 3.1, 3.2, 3.4_


### Implementation (Phase 4)

- [ ] 15. Fix Phase 4 issues - Code quality fixes

  - [ ] 15.1 Issue 1.15 - Remove debug statements
    - In ExtensionController.ts: Remove all console.log debug statements
    - Delete console.log at line 181: `console.log('=== registerCommands called ===')`
    - Delete console.log at line 188: `console.log('=== TEST COMMAND WORKS ===')`
    - Delete console.log at line 197: `console.log('=== archview.generateDiagram command triggered ===')`
    - Delete console.log at line 207: `console.log('=== archview.refreshDiagram command triggered ===')`
    - Delete console.log at line 216: `console.log('=== archview.exportDiagram command triggered ===')`
    - Delete console.log at line 391: `console.log('=== generateDiagram called ===')`
    - Delete console.log at line 473: `console.log('=== Diagram generated successfully ===')`
    - Delete console.log at line 229: `console.log('Commands registered successfully')`
    - Delete console.log at line 229: `console.log('Try running: archview.test')`
    - Remove all other debug console.log statements throughout the file
    - Fix test command at lines 186-192: Either implement actual test execution or remove command
    - Option A: Run test suite via terminal
    - Option B: Delete test command registration entirely
    - _Bug_Condition: isBugCondition(input) where input.codeExecution AND hasDebugStatements(input)_
    - _Expected_Behavior: No debug statements in production code_
    - _Preservation: Core functionality unchanged, just cleaner output_
    - _Requirements: 2.15_

  - [ ] 15.2 Issue 1.16 - Remove troubleshooting files
    - Review each troubleshooting file to verify it's not actual documentation
    - Delete COMMANDS_FIXED.md from repository root
    - Delete DEBUG_LOGGING_ADDED.md from repository root
    - Delete FIX_APPLIED.md from repository root
    - Delete QUICK_FIX.md from repository root
    - Delete TROUBLESHOOTING_COMMAND_NOT_FOUND.md from repository root
    - Delete WEBVIEW_ISSUE_REPORT.md from repository root
    - Delete WEBVIEW_FIX_SUMMARY.md from repository root
    - Delete TEST_COMMAND_REGISTRATION.md from repository root
    - Delete TEST_ON_THIS_REPO.md from repository root
    - Delete test-output.txt from repository root
    - Delete any other troubleshooting markdown files (verify 13 total)
    - Keep proper documentation: README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE, docs/ folder
    - _Bug_Condition: isBugCondition(input) where input.repositoryRoot AND hasTroubleshootingFiles(input)_
    - _Expected_Behavior: Troubleshooting files deleted, clean repository_
    - _Preservation: Actual documentation preserved_
    - _Requirements: 2.16_

  - [ ] 15.3 Issue 1.17 - Add proper type annotations
    - In WebviewManager.ts: Change panel type to `private panel: vscode.WebviewPanel | undefined`
    - In FileHighlighter.ts: Add KiroAPI interface and type kiroAPI properly
    - In FileHighlighter.ts: Type decorationProvider as `vscode.TextEditorDecorationType`
    - In FileWatcher.ts: Type watchers as `private watchers: vscode.FileSystemWatcher[] = []`
    - In ExtensionController.ts: Type subscriptions as `private subscriptions: vscode.Disposable[] = []`
    - Replace all AST any parameters with proper tree-sitter types: `Parser.SyntaxNode`, `Parser.Tree`
    - Add `import * as Parser from 'tree-sitter'` where needed
    - NOTE: Do NOT enable noImplicitAny globally - it would cause hundreds of compilation errors. Fix critical any types manually instead.
    - NOTE: tsconfig.json already has "strict": true enabled
    - _Bug_Condition: isBugCondition(input) where input.typeAnnotations AND usesAnyType(input)_
    - _Expected_Behavior: Critical any types properly annotated_
    - _Preservation: Runtime behavior identical, compile-time safety improved_
    - _Requirements: 2.17_

  - [ ] 15.4 Issue 1.20 - Implement nonce-based CSP
    - In WebviewManager.ts: Add `import * as crypto from 'crypto'` at top
    - Add generateNonce() method: `return crypto.randomBytes(16).toString('base64')`
    - Update getWebviewContent() at line 183 to generate nonce
    - Update HTML template to use nonce in CSP header
    - Change CSP from `script-src 'unsafe-inline'` to `script-src 'nonce-${nonce}'`
    - Change CSP from `style-src 'unsafe-inline'` to `style-src 'nonce-${nonce}'`
    - Add nonce attribute to all <script> and <style> tags: `<script nonce="${nonce}">`
    - _Bug_Condition: isBugCondition(input) where input.webviewHTML AND usesUnsafeInlineCSP(input)_
    - _Expected_Behavior: Nonce-based CSP prevents XSS attacks_
    - _Preservation: Webview rendering and functionality identical_
    - _Requirements: 2.20_

  - [ ] 15.5 Verify Phase 4 exploration tests now pass
    - **Property 1: Expected Behavior** - Code Quality Issues Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 13 - do NOT write new tests
    - Run bug condition exploration tests from step 13
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - Verify no console.log statements remain
    - Verify troubleshooting files are deleted
    - Verify all types are properly annotated
    - Verify webview uses nonce-based CSP
    - _Requirements: 2.15, 2.16, 2.17, 2.20_

  - [ ] 15.6 Verify Phase 4 preservation tests still pass
    - **Property 2: Preservation** - Core Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 14 - do NOT write new tests
    - Run preservation property tests from step 14
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm webview rendering still works
    - Confirm type checking still works
    - Confirm commands still work

- [ ] 16. Phase 4 Checkpoint - Ensure all tests pass
  - Run full test suite for Phase 4 (`npm test`)
  - Verify no regressions in core functionality
  - Ask user if questions arise


## Final Validation

- [ ] 17. Run comprehensive integration tests
  - Test full diagram generation flow with all supported languages
  - Test configuration change flow
  - Test error handling flow
  - Test memory management flow
  - Test multi-language project analysis
  - Test AI integration flow
  - Test export functionality
  - Verify all 20 issues are resolved
  - Verify no regressions in core functionality

- [ ] 18. Final checkpoint - All tests pass
  - Run complete test suite across all phases
  - Verify all 20 bug condition tests pass (bugs are fixed)
  - Verify all preservation tests pass (no regressions)
  - Verify integration tests pass
  - Document any remaining issues or concerns
  - Ask user for final review and approval

## Summary

This implementation plan systematically addresses all 20 critical issues in the ArchView extension through a 4-phase approach:

- **Phase 1 (Foundation)**: Fixes type system conflicts, removes dead code, deduplicates implementations
- **Phase 2 (Critical)**: Addresses security vulnerabilities, performance issues, and activation problems
- **Phase 3 (Medium)**: Improves reliability, configuration, and resource management
- **Phase 4 (Quality)**: Enhances code quality, type safety, and security

Each phase follows the exploratory bugfix methodology:
1. Write tests BEFORE fixes to understand bugs and surface counterexamples
2. Implement fixes based on understanding from tests
3. Verify fixes work correctly (exploration tests pass)
4. Verify no regressions (preservation tests pass)

The dependency order ensures safe, incremental fixes without breaking existing functionality.
