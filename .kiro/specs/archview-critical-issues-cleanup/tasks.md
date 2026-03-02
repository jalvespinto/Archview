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

  - [x] 7.3 Issue 1.3 - Replace runtime require with static imports
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

  - [x] 7.4 Issue 1.4 - Fix private method access
    - In KiroAIService.ts: Change buildHeuristicModel from private to public (Option A - simpler)
    - In ExtensionController.ts line 439: Change from `this.aiService['buildHeuristicModel'](...)` to `this.aiService.buildHeuristicModel(...)`
    - Alternative Option B: Extract to HeuristicModelBuilder service with dependency injection (if method should stay private)
    - _Bug_Condition: isBugCondition(input) where input.methodAccess AND usesBracketNotationForPrivate(input)_
    - _Expected_Behavior: Proper access modifiers and method calls without bracket notation_
    - _Preservation: Heuristic model building produces identical results_
    - _Requirements: 2.4_

  - [x] 7.5 Issue 1.5 - Fix parser initialization
    - NOTE: createEmptyTree() IS used at lines 133, 148, 173 as fallback - cannot be deleted
    - Fix lines 367-370 in ParserManager.ts to call `parser.setLanguage(this.getDefaultLanguage())` before `parser.parse('')`
    - Add getDefaultLanguage() helper method that returns a default language grammar
    - _Bug_Condition: isBugCondition(input) where input.parserCreation AND NOT hasLanguageSet(input)_
    - _Expected_Behavior: Parser has language set before parsing_
    - _Preservation: All other parser functionality remains unchanged_
    - _Requirements: 2.5_

  - [x] 7.6 Issue 1.6 - Remove dead worker thread code
    - In AnalysisOptimizer.ts: Delete parseWithWorkerThreads method (lines 106-114)
    - Remove Worker support check (lines 63-65)
    - Update any callers to use parseWithAsyncBatching directly
    - Remove worker-related imports
    - _Bug_Condition: isBugCondition(input) where input.workerThreadUsage AND isDeadCode(input)_
    - _Expected_Behavior: Dead code removed, async batching works correctly_
    - _Preservation: Parsing produces identical results using async batching_
    - _Requirements: 2.6_

  - [x] 7.7 Issue 1.7 - Use secure hash function
    - In AnalysisOptimizer.ts: Add `import * as crypto from 'crypto'` at top
    - Replace custom hash at lines 196-205 with `return crypto.createHash('sha256').update(content).digest('hex')`
    - Remove old 32-bit hash implementation
    - _Bug_Condition: isBugCondition(input) where input.hashFunction AND hasCollisionRisk(input)_
    - _Expected_Behavior: SHA-256 hash with no collision risk_
    - _Preservation: Cache functionality works correctly with new hash_
    - _Requirements: 2.7_

  - [x] 7.8 Verify Phase 2 exploration tests now pass
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

  - [x] 7.9 Verify Phase 2 preservation tests still pass
    - **Property 2: Preservation** - Core Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 6 - do NOT write new tests
    - Run preservation property tests from step 6
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm diagram generation still works
    - Confirm webview display still works
    - Confirm parser functionality still works
    - Confirm cache functionality still works

- [x] 8. Phase 2 Checkpoint - Ensure all tests pass
  - Run full test suite for Phase 2 (`npm test`)
  - Verify no regressions in core functionality
  - Ask user if questions arise before proceeding to Phase 3


## Phase 3: Medium Severity Fixes (Issues 1.8-1.14, 1.18)

These medium severity fixes address reliability, performance, security issues, and code deduplication. They are mostly independent and can be done in any order. Issue 1.18 is moved here after import fixes are complete.

### Exploratory Tests (Phase 3)

- [x] 9. Write bug condition exploration tests for Phase 3 issues
  - **Property 1: Fault Condition** - Medium Severity Issues
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failures confirm the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **METHODOLOGY**: Tests use a state-machine comment stripper + brace-counting method extraction so that TODO comments are not mistaken for real code
  - Test Issue 1.8: Read FileWatcher.ts, strip comments, verify setupWatchers() has executable code (will fail — body is empty after comment removal)
  - Test Issue 1.9: Read ExtensionController.ts, strip comments, verify loadState() calls globalState.get and saveState() calls globalState.update (will fail — only in comments; actual code hardcodes `undefined` and logs `'State saved'`)
  - Test Issue 1.10: Read ExtensionController.ts, strip comments, verify getWorkspaceRoot() uses workspaceFolders and does not solely return process.cwd() (will fail — only process.cwd())
  - Test Issue 1.11: Read ExtensionController.ts, strip comments, verify getAnalysisConfig() calls getConfiguration and registerConfigurationListener() uses onDidChangeConfiguration (will fail — both are no-ops). Also verify package.json config schema exists (will pass — prerequisite already present).
  - Test Issue 1.12: Read MemoryManager.ts, verify releaseMemory() does not use setInterval or RELEASE_TIMEOUT_MS; also measure runtime < 500ms (will fail — has polling loop, takes ~2000ms)
  - Test Issue 1.13: Read WebviewManager.ts, verify setupMessageHandling() disposes old handlers, onMessage() returns a disposable, and a public dispose() method exists (will fail — no disposal mechanism)
  - Test Issue 1.14: Read FileScanner.ts, verify matchGlobPattern() uses minimatch/picomatch instead of custom `new RegExp()` construction (will fail — uses custom regex)
  - **NOTE**: Issue 1.18 (findNodeInTree deduplication) is not tested here — add tests before implementing 11.8
  - Run tests on UNFIXED code
  - **ACTUAL OUTCOME**: 18 FAIL, 1 PASS (package.json schema check) — all 7 bugs confirmed
  - Counterexamples documented in `src/__tests__/phase3-bug-exploration-results.md`
  - _Requirements: 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14_

- [x] 10. Write preservation property tests for Phase 3 (BEFORE implementing fixes)
  - **Property 2: Preservation** - Core Functionality Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for normal operations
  - Test workspace detection: returns valid absolute path, consistent across calls (2 tests)
  - Test configuration reading: valid shape with reasonable defaults, deterministic, common patterns included (3 tests)
  - Test memory cleanup: sync/async callbacks execute, completes without hanging, sequential cleanups work (4 tests)
  - Test glob pattern matching: wildcards, excludes, multiple patterns, maxFiles, maxDepth, empty dirs (6 tests)
  - Test FileWatcher: triggerFileChange tracking, debounce, include-pattern filtering, clearChangedFiles, autoRefresh=false, stop/cleanup, flushPendingChanges (7 tests)
  - Test WebviewManager: handler registration, multiple handlers, isActive when no webview (3 tests)
  - Test configuration change detection: registerConfigurationListener and handleConfigurationChange don't throw (2 tests)
  - Test MemoryManager monitoring: snapshots, baseline tracking, start/stop monitoring, dispose (4 tests)
  - **NOTE**: Issue 1.18 (findNodeInTree deduplication) is not tested here — add preservation tests before implementing 11.8
  - Run tests on UNFIXED code
  - **ACTUAL OUTCOME**: 31/31 PASS in ~11s (baseline captured)
  - Results documented in `src/__tests__/phase3-preservation-results.md`
  - _Requirements: 3.5, 3.8, 3.10_


### Implementation (Phase 3)

- [ ] 11. Fix Phase 3 issues - Medium severity fixes

  - [x] 11.1 Issue 1.8 - Implement FileWatcher setupWatchers()
    - DECISION: Implement (not remove). FileWatcher is deeply integrated into ExtensionController — imported (line 31), instantiated (line 291), started/stopped in activate/deactivate, wired to handleFileChanges via initializeFileWatcher() (line 268). Removing it means ripping out 12+ lines across ExtensionController. The debounce, filtering, and lifecycle logic already work correctly — only setupWatchers() is empty.
    - PREREQUISITE: Add `import * as vscode from 'vscode';` to FileWatcher.ts (currently has NO vscode import)
    - Fix setupWatchers() at lines 127-140 in FileWatcher.ts (body is comment-only, no executable code)
    - Use `vscode.workspace.createFileSystemWatcher()` to create watchers for each include pattern from `this.config.includePatterns`
    - Add handlers for onDidChange, onDidCreate, onDidDelete events that call `this.handleFileChange(uri.fsPath)`
    - Retype `private watchers: any[]` (line 30) to `private watchers: vscode.FileSystemWatcher[]`
    - Store watchers in the array for disposal (stop() already iterates and disposes them)
    - _Bug_Condition: isBugCondition(input) where input.fileWatcherSetup AND isEmptyImplementation(input)_
    - _Expected_Behavior: Actual file watching via vscode.workspace.createFileSystemWatcher_
    - _Preservation: Debounce, filtering, and lifecycle behavior must be preserved_
    - _Requirements: 2.8_

  - [x] 11.2 Issue 1.9 - Implement state persistence
    - DECISION: Implement (not remove). saveState() is called from 5 places in ExtensionController (activate line 128, deactivate line 140/155, generateDiagram line 471, and after analysis line 623). loadState() is called on activate (line 128). Removing them means hunting down and deleting all call sites. The fix is a 2-line swap.
    - Fix loadState() at lines 779-793 in ExtensionController.ts
      - Replace `const savedState = undefined as Partial<ExtensionState> | undefined` with `const savedState = this.context.globalState.get<Partial<ExtensionState>>('archview.state')`
    - Fix saveState() at lines 799-809 in ExtensionController.ts
      - Replace `console.log('State saved')` with `await this.context.globalState.update('archview.state', this.state)`
    - NOTE: ExtensionState interface ALREADY EXISTS at lines 50-61 — do NOT re-create it
    - NOTE: ExtensionController already imports vscode (line 14) — no new import needed
    - _Bug_Condition: isBugCondition(input) where input.stateManagement AND isStubImplementation(input)_
    - _Expected_Behavior: State persisted via globalState API across sessions_
    - _Preservation: All existing saveState/loadState call sites continue to work_
    - _Requirements: 2.9_

  - [x] 11.3 Issue 1.10 - Fix workspace root detection
    - In ExtensionController.ts: Change getWorkspaceRoot() at lines 666-670
    - Current signature: `private async getWorkspaceRoot(): Promise<string | null>`
    - Replace `return process.cwd()` with `return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd()`
    - NOTE: With the fallback to process.cwd(), the method can never return null. Keep the return type as `Promise<string | null>` for now to avoid touching all call sites that have null checks — a return type narrowing can be done in a separate cleanup pass.
    - NOTE: ExtensionController already imports vscode (line 14) — no new import needed
    - _Bug_Condition: isBugCondition(input) where input.workspaceRoot AND returnsWrongDirectory(input)_
    - _Expected_Behavior: Returns actual workspace folder path, falls back to process.cwd()_
    - _Preservation: Workspace detection returns a valid absolute path for normal cases_
    - _Requirements: 2.10_

  - [x] 11.4 Issue 1.11 - Implement configuration reading
    - NOTE: package.json already has complete configuration schema — do NOT add it again
    - NOTE: handleConfigurationChange() ALREADY EXISTS at lines 250-262 and works correctly (invalidates cache, reinitializes watcher) — do NOT re-create it
    - In ExtensionController.ts: Fix getAnalysisConfig() at lines 692-730
      - Replace the hardcoded object literal with calls to VS Code configuration API
      - Use `const config = vscode.workspace.getConfiguration('archview')`
      - Read each config value: `config.get<string[]>('includePatterns', ['**/*.ts', ...])` etc.
      - Preserve the `this.mapLanguageStrings()` call for the languages field
      - Keep the same defaults as fallback values in each `config.get()` call
    - Fix registerConfigurationListener() at lines 236-244 (NOT 733-745)
      - Replace the `console.log('Configuration listener registered')` no-op with:
      - `vscode.workspace.onDidChangeConfiguration(e => { if (e.affectsConfiguration('archview')) { this.handleConfigurationChange(); } })`
      - Store the disposable for cleanup
    - _Bug_Condition: isBugCondition(input) where input.configurationAccess AND usesHardcodedDefaults(input)_
    - _Expected_Behavior: Configuration read from VS Code settings with same defaults_
    - _Preservation: Default values remain the same, now user-configurable_
    - _Requirements: 2.11_

  - [x] 11.5 Issue 1.12 - Remove artificial delay
    - In MemoryManager.ts: Fix releaseMemory() at lines 175-195
    - Current code: executes cleanup, calls forceGarbageCollection(), then creates a setInterval polling loop (line 186) that waits until `RELEASE_TIMEOUT_MS` (2000ms, defined at line 39) has elapsed
    - Fix: Remove the `return new Promise(...)` wrapping the setInterval polling loop (lines 185-194)
    - After cleanup and forceGarbageCollection(), return immediately (the method is already async)
    - Remove the now-dead `RELEASE_TIMEOUT_MS` constant (line 39) — dead code should not be kept for documentation
    - Keep the `forceGarbageCollection()` call — it's harmless and potentially useful
    - _Bug_Condition: isBugCondition(input) where input.memoryRelease AND hasArtificialDelay(input)_
    - _Expected_Behavior: Returns immediately after cleanup (< 100ms instead of ~2000ms)_
    - _Preservation: Cleanup callback still executed, forceGC still called, just no artificial wait_
    - _Requirements: 2.12_

  - [x] 11.6 Issue 1.13 - Fix message handler memory leak
    - In WebviewManager.ts (already imports vscode at line 7):
    - Current state: `messageHandlers` is a `Map<string, (message: WebviewMessage) => void>` (line 15) — this tracks user-registered handlers but NOT the vscode onDidReceiveMessage disposable
    - The actual leak: `setupMessageHandling()` (lines 145-158, NOT "setupWebviewMessageHandling" or line 89) calls `this.panel.webview.onDidReceiveMessage()` which returns a disposable, but the disposable is never stored or disposed. Calling setupMessageHandling() multiple times leaks listeners.
    - Fix setupMessageHandling() at lines 145-158:
      - Add a `private messageListenerDisposable: vscode.Disposable | undefined` property
      - Before creating a new listener, dispose the existing one: `this.messageListenerDisposable?.dispose()`
      - Store the return value: `this.messageListenerDisposable = this.panel.webview.onDidReceiveMessage(...)`
    - Fix onMessage() at lines 72-75:
      - Currently returns void — change to return an unregister function: `return { dispose: () => this.messageHandlers.delete(handlerId) }`
      - This lets callers clean up individual handlers and follows the VS Code Disposable pattern
    - Add a public `dispose()` method following the VS Code Disposable pattern:
      - Dispose `messageListenerDisposable`
      - Clear the `messageHandlers` map
      - Dispose the panel if active
    - _Bug_Condition: isBugCondition(input) where input.messageHandlers AND hasMemoryLeak(input)_
    - _Expected_Behavior: Handlers properly disposed, no accumulated listeners_
    - _Preservation: Message handling registration and delivery work identically_
    - _Requirements: 2.13_

  - [x] 11.7 Issue 1.14 - Replace custom glob with minimatch
    - DECISION: Use minimatch library (not patch custom regex). Both FileScanner.ts and FileWatcher.ts have custom glob-to-regex implementations (6 references each). A single `npm install minimatch` replaces both with a battle-tested library, eliminating ReDoS risk and edge-case mismatches.
    - PREREQUISITE: Run `npm install minimatch` and `npm install -D @types/minimatch` (minimatch is NOT currently a dependency)
    - In FileScanner.ts:
      - Add `import minimatch from 'minimatch';` at top of file
      - Replace matchGlobPattern() body (lines 320-353) with `return minimatch(filePath, pattern, { dot: true })`
    - In FileWatcher.ts:
      - Add `import minimatch from 'minimatch';` at top of file (alongside the new vscode import from 11.1)
      - Replace matchesPattern() + matchesSimplePattern() (lines 223-266) with a single method using `return minimatch(filePath, pattern, { dot: true })`
    - _Bug_Condition: isBugCondition(input) where input.globPattern AND hasRegexInjectionRisk(input)_
    - _Expected_Behavior: Glob patterns safely matched via vetted minimatch library_
    - _Preservation: Normal glob patterns produce identical match results_
    - _Requirements: 2.14_

  - [x] 11.8 Issue 1.18 - Deduplicate findNodeInTree()
    - Both ComponentExtractor.ts (line 747) and RelationshipExtractor.ts (line 775) contain identical `private findNodeInTree()` implementations
    - Create `src/utils/astUtils.ts` with a shared `findNodeInTree()` function:
      - `export function findNodeInTree(root: Parser.SyntaxNode, target: any): Parser.SyntaxNode | null`
      - Copy implementation from either file (they are identical)
    - Update ComponentExtractor.ts:
      - Remove the private findNodeInTree() method (line 747+)
      - Add `import { findNodeInTree } from '../utils/astUtils'`
      - Update all call sites (lines 122, 225, 357) from `this.findNodeInTree(...)` to `findNodeInTree(...)`
    - Update RelationshipExtractor.ts:
      - Remove the private findNodeInTree() method (line 775+)
      - Add `import { findNodeInTree } from '../utils/astUtils'`
      - Update all call sites (lines 104, 176, 196, 226, 279, 310, 364) from `this.findNodeInTree(...)` to `findNodeInTree(...)`
    - NOTE: Only extract findNodeInTree. Do NOT extract graph functions (buildDirectoryTree, buildImportGraph, buildInheritanceGraph) — they only exist in AnalysisService.ts after GroundingDataBuilder.ts was deleted in Phase 1. Extracting single-use functions is premature abstraction.
    - _Bug_Condition: isBugCondition(input) where input.codebaseFiles AND hasDuplicateImplementation(input)_
    - _Expected_Behavior: Single findNodeInTree() in shared utils, imported by both extractors_
    - _Preservation: findNodeInTree() behavior identical — same implementation, just shared_
    - _Requirements: 2.18_

  - [x] 11.9 Verify Phase 3 exploration tests now pass
    - **Property 1: Expected Behavior** - Medium Severity Issues Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 9 — do NOT write new tests
    - NOTE: Task 9 tests use comment-stripping before checking for code patterns, so fixes must be real executable code, not just rearranged comments
    - Run bug condition exploration tests from step 9
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - Verify file watching works or is removed
    - Verify state persistence works or is removed
    - Verify workspace root detection works
    - Verify configuration reading works
    - Verify memory release is fast (< 500ms)
    - Verify handlers don't leak
    - Verify glob patterns use vetted library
    - _Requirements: 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14_

  - [x] 11.10 Verify Phase 3 preservation tests still pass
    - **Property 2: Preservation** - Core Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 10 — do NOT write new tests
    - Run preservation property tests from step 10
    - **EXPECTED OUTCOME**: All 31 tests PASS (confirms no regressions)
    - Confirm workspace detection returns valid absolute path
    - Confirm configuration returns valid defaults with correct shape
    - Confirm memory cleanup executes callbacks correctly
    - Confirm glob pattern matching works for normal patterns
    - Confirm FileWatcher debounce, filtering, and lifecycle work
    - Confirm WebviewManager handler registration works
    - Confirm MemoryManager monitoring and stats work

- [x] 12. Phase 3 Checkpoint - Ensure all tests pass
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
  - **METHODOLOGY**: Reuse Phase 3's `stripComments()` helper for Issues 1.15 and 1.17 to avoid false positives from commented-out code. Use `fs.readFileSync()` to read source files and `fs.readdirSync()` for file listing. For Issue 1.20, read WebviewManager.ts source and extract the CSP meta tag string.
  - **OUTPUT**: Create `src/__tests__/phase4-bug-exploration.test.ts` and document results in `src/__tests__/phase4-bug-exploration-results.md`
  - Test Issue 1.15: Read all production .ts/.js files under src/ (excluding __tests__), strip comments, search for `console.log` statements — assert zero found. Files affected: ExtensionController.ts (35), webview.js (20), WebviewMessageHandler.ts (9), spike/kiro-ai-poc.ts (5), extension.ts (4), WebviewManager.ts (4), KiroAIService.ts (3), FileHighlighter.ts (2), AnalysisOptimizer.ts (1). Will fail — 83+ console.log statements across 9 production files. NOTE: task 15.1 currently only targets ExtensionController.ts; scope of 15.1 should be expanded to cover all 9 files or this test should be scoped to match 15.1's final scope.
  - Test Issue 1.16: Read repository root directory, filter out legitimate docs (README.md, CHANGELOG.md, CONTRIBUTING.md), assert no other .md or debug .txt files remain. Will fail — 12 troubleshooting artifacts found: COMMANDS_FIXED.md, DEBUG_LOGGING_ADDED.md, FIX_APPLIED.md, HOW_TO_TEST.md, QUICK_FIX.md, TEST_COMMAND_REGISTRATION.md, TESTING_GUIDE.md, TEST_ON_THIS_REPO.md, TROUBLESHOOTING_COMMAND_NOT_FOUND.md, WEBVIEW_FIX_SUMMARY.md, WEBVIEW_ISSUE_REPORT.md (11 .md files) + test-output.txt (1 .txt file).
  - Test Issue 1.17: Read target production files, strip comments, grep for explicit `any` type patterns (`: any`, `as any`, `any[]`, `<any>`, `(...args: any`). Do NOT run tsc — strict mode is already enabled and does not flag explicit `any` annotations. Target files and counts: WebviewManager.ts (3: panel property line 14, return types lines 23/142), FileHighlighter.ts (2: decorationProvider line 19, kiroAPI line 20), ExtensionController.ts (5: Memento interface line 38, subscriptions line 42, Command callback line 49, type assertions lines 325/391). Will fail — 10 explicit `any` annotations across 3 critical files. NOTE: FileWatcher.ts (mentioned in 15.3) has no `any` types — verify before implementing fix.
  - Test Issue 1.20: Read WebviewManager.ts source, extract the CSP meta tag at line 207 from getWebviewContent() (lines 199-251), assert it uses nonce-based `script-src 'nonce-...'` and `style-src 'nonce-...'` directives. Also verify `<style>` tag (line 209) and `<script>` tag (line 246) have `nonce=` attributes. Will fail — current CSP is `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'` with no nonce generation anywhere in the file.
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found in `src/__tests__/phase4-bug-exploration-results.md`
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

  - [ ] 15.1 Issue 1.15 - Remove debug statements from all production files
    - Remove ALL console.log debug statements across all 9 affected production files (83+ total):
    - **ExtensionController.ts (35 statements)**: Remove all `console.log('===...')` debug markers (lines 188, 194, 203, 213, 222, 406, 488), progress/status logs (lines 152, 180, 234, 235, 258, 275, 315, 348, 394, 409, 411, 423, 427, 430, 432, 443, 446, 453, 459, 462, 475, 478, 539, 569, 619, 756), and the fake OutputChannel at lines 118-119. Fix test command at lines 186-192: delete test command registration entirely (Option B).
    - **webview.js (20 statements)**: Remove all console.log calls — these are debug logs for rendering, zoom, selection, messaging, export, etc. (lines 22, 64, 67, 70, 73, 76, 79, 82, 85, 89, 93, 96, 106, 134, 169, 199, 208, 216, 287, 311)
    - **WebviewMessageHandler.ts (9 statements)**: Remove message handling debug logs (lines 71, 105, 116, 133, 150, 166, 188, 203, 226)
    - **spike/kiro-ai-poc.ts (5 statements)**: Remove test logging (lines 485, 519, 528, 537, 546). Consider if entire spike/ can be excluded or deleted.
    - **extension.ts (4 statements)**: Remove activation/deactivation logs (lines 16, 21, 29, 36)
    - **WebviewManager.ts (4 statements)**: Remove zoom/init debug logs (lines 422, 425, 428, 448)
    - **KiroAIService.ts (3 statements)**: Remove cache hit/miss logs (lines 102, 106, 135)
    - **FileHighlighter.ts (2 statements)**: Remove highlight debug logs (lines 119, 121)
    - **AnalysisOptimizer.ts (1 statement)**: Remove incremental cache log (line 129)
    - NOTE: Where logging is operationally useful (e.g., activation, errors), consider replacing with VS Code OutputChannel logging instead of silent removal
    - _Bug_Condition: isBugCondition(input) where input.codeExecution AND hasDebugStatements(input)_
    - _Expected_Behavior: No console.log debug statements in any production code_
    - _Preservation: Core functionality unchanged, just cleaner output_
    - _Requirements: 2.15_

  - [ ] 15.2 Issue 1.16 - Remove troubleshooting files
    - Review each troubleshooting file to verify it's not actual documentation
    - Delete 12 troubleshooting/debug artifacts from repository root:
      - COMMANDS_FIXED.md
      - DEBUG_LOGGING_ADDED.md
      - FIX_APPLIED.md
      - HOW_TO_TEST.md
      - QUICK_FIX.md
      - TEST_COMMAND_REGISTRATION.md
      - TESTING_GUIDE.md
      - TEST_ON_THIS_REPO.md
      - TROUBLESHOOTING_COMMAND_NOT_FOUND.md
      - WEBVIEW_FIX_SUMMARY.md
      - WEBVIEW_ISSUE_REPORT.md
      - test-output.txt (876K debug output file)
    - Keep legitimate documentation: README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE, docs/ folder
    - _Bug_Condition: isBugCondition(input) where input.repositoryRoot AND hasTroubleshootingFiles(input)_
    - _Expected_Behavior: 12 troubleshooting artifacts deleted, clean repository root_
    - _Preservation: Actual documentation preserved_
    - _Requirements: 2.16_

  - [ ] 15.3 Issue 1.17 - Add proper type annotations
    - Fix 10 explicit `any` annotations across 3 critical files:
    - **WebviewManager.ts (3 instances)**:
      - Line 14: Change `private panel: any = null` to `private panel: vscode.WebviewPanel | undefined`
      - Line 23: Change `createWebview(): any` return type to proper WebviewPanel type
      - Line 142: Change `private createWebviewPanel(): any` return type to proper WebviewPanel type
    - **FileHighlighter.ts (2 instances)**:
      - Line 19: Change `private decorationProvider: any = null` to `private decorationProvider: vscode.TextEditorDecorationType | null`
      - Line 20: Change `private kiroAPI: any = null` — add a KiroAPI interface and type properly
    - **ExtensionController.ts (5 instances)**:
      - Line 38: Change Memento interface `update(key: string, value: any)` — use `unknown` or generic
      - Line 42: Change `subscriptions: any[]` to `subscriptions: vscode.Disposable[]`
      - Line 49: Change Command `callback: (...args: any[]) => any` — use `unknown` or proper types
      - Lines 325, 391: Replace `as any` type assertions with proper message types
    - NOTE: FileWatcher.ts has NO `any` types (already typed correctly) — remove from this task's scope
    - NOTE: Do NOT enable noImplicitAny globally — it would cause hundreds of compilation errors. Fix these 10 critical `any` types manually.
    - NOTE: tsconfig.json already has "strict": true enabled (catches implicit any, not explicit)
    - _Bug_Condition: isBugCondition(input) where input.typeAnnotations AND usesExplicitAnyType(input)_
    - _Expected_Behavior: 10 critical any types replaced with proper annotations_
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
    - Verify no console.log statements remain in any of the 9 production files
    - Verify all 12 troubleshooting artifacts are deleted from repository root
    - Verify 10 critical `any` types are properly annotated across 3 files
    - Verify webview uses nonce-based CSP instead of unsafe-inline
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
