# Bugfix Requirements Document

## Introduction

The ArchView VS Code extension contains multiple critical issues identified through comprehensive code inspection that impact functionality, performance, security, and maintainability. These issues range from type system conflicts and performance bottlenecks to security vulnerabilities and code quality problems. This bugfix addresses 20 identified issues across three priority levels: Critical/Red Flags (7 issues), Medium Severity (7 issues), and Code Quality (6 issues).

The most critical issues include duplicate error class definitions causing type collisions, eager extension activation impacting VS Code startup time, runtime require() calls bypassing TypeScript type checking, and security vulnerabilities in hash functions and glob pattern matching.

## Bug Analysis

### Current Behavior (Defect)

#### Priority 1: Critical/Red Flags

1.1 WHEN ExtensionController imports AnalysisError from src/analysis/ErrorHandler.ts BUT other code may import from src/types/index.ts THEN instanceof checks silently fail because THREE error classes are duplicated with different signatures: AnalysisError (types/index.ts: 3-arg constructor message, userMessage, context vs ErrorHandler.ts: 5-arg with type, context, cause), RenderError (duplicated in both files), and AIError (duplicated in both files), causing type collisions where catch blocks cannot properly identify error types

1.2 WHEN VS Code starts THEN package.json line 15 has `activationEvents: ["*"]` which loads the extension on every VS Code event (file open, window focus, etc.) instead of only when archview commands are invoked, impacting startup time for all users even if they never use ArchView

1.3 WHEN ExtensionController.ts:182 executes `const vscode = require('vscode')` inside the registerCommands() method AND ExtensionController.ts:481 executes `const vscode = require('vscode')` inside the generateDiagram() catch block AND WebviewManager.ts:123 executes `const vscode = require('vscode')` inside the createWebviewPanel() method THEN TypeScript type checking is bypassed (everything becomes any) and the module is dynamically loaded multiple times instead of using top-level imports

1.4 WHEN ExtensionController.ts:439 needs to call buildHeuristicModel THEN the code uses `this.aiService['buildHeuristicModel'](...)` with bracket notation to access a private method, bypassing TypeScript access control and making refactoring unsafe

1.5 WHEN ParserManager.ts:367-370 calls createEmptyTree() THEN the code executes `new Parser().parse('')` without calling `parser.setLanguage()` first, creating a non-functional parser that cannot parse any code because tree-sitter requires a language grammar to be set

1.6 WHEN AnalysisOptimizer.ts:106-114 calls parseWithWorkerThreads THEN the method always falls back to parseWithAsyncBatching because the worker support check at lines 63-65 only verifies Worker class exists but the actual implementation is a no-op, making the entire worker thread code path dead code

1.7 WHEN AnalysisOptimizer.ts:196-205 computes cache keys using the custom hash function THEN the code uses a 32-bit hash with high collision risk (comment at line 203 says "in production, use crypto.createHash") while AnalysisService.ts:495 correctly uses crypto.createHash('md5'), creating inconsistent hashing and potential cache key collisions

#### Priority 2: Medium Severity

1.8 WHEN FileWatcher.ts:127-140 calls setupWatchers() THEN the method body is entirely empty with no actual file watching implementation, making the FileWatcher class non-functional despite being instantiated in ExtensionController

1.9 WHEN ExtensionController.ts:780-810 calls loadState() or saveState() THEN the methods are stubs that perform no actual persistence (loadState returns early with no log, saveState only logs "State saved" at line 806) instead of using VS Code's globalState or workspaceState API, losing all extension state between sessions

1.10 WHEN ExtensionController.ts:667-671 calls getWorkspaceRoot() THEN the method returns `process.cwd()` which is the VS Code installation directory instead of `vscode.workspace.workspaceFolders?.[0]?.uri.fsPath` which is the actual workspace folder being analyzed

1.11 WHEN ExtensionController.ts:693-731 calls getAnalysisConfig() THEN the method returns hardcoded defaults (includePatterns, excludePatterns, maxFiles: 1000, maxDepth: 10, languages, aiEnabled, autoRefresh, autoRefreshDebounce) and ignores VS Code configuration API, while registerConfigurationListener() at lines 733-745 is also a no-op that never reads vscode.workspace.getConfiguration('archview'). Note: package.json already defines a complete contributes.configuration section with all these properties

1.12 WHEN MemoryManager.ts:183-195 calls releaseMemory() THEN the method executes cleanup immediately but uses a setInterval polling loop that checks elapsed time every 100ms until 2 seconds have passed, even after cleanup completes, adding artificial delay to every memory release operation

1.13 WHEN WebviewManager.ts:71-73 calls onMessage() THEN the method generates unique handler IDs (`handler_${Date.now()}_${Math.random()}`) but never unregisters them, so every setupWebviewMessageHandling() call at line 89 adds handlers without cleanup, causing a memory leak that grows with each diagram generation

1.14 WHEN FileScanner.ts:336-352 converts glob patterns to regex using custom globToRegex() THEN the code doesn't properly escape backslash characters, allowing user-provided patterns like `**/*.{js,ts}` to be constructed into regex without proper escaping, creating regex injection risk and potential ReDoS attacks

#### Priority 3: Code Quality

1.15 WHEN ExtensionController.ts is executed THEN the code contains 10+ debug statements like `console.log('=== registerCommands called ===')` at line 182, `console.log('=== generateDiagram called ===')` at line 436, and throughout the file, and the test command at lines 186-192 only shows "ArchView test command works!" instead of running actual tests

1.16 WHEN the repository root is inspected THEN 13 troubleshooting markdown files exist (COMMANDS_FIXED.md, DEBUG_LOGGING_ADDED.md, FIX_APPLIED.md, QUICK_FIX.md, TROUBLESHOOTING_COMMAND_NOT_FOUND.md, WEBVIEW_ISSUE_REPORT.md, etc.) that clutter the repository and should be in a docs/ folder or removed

1.17 WHEN TypeScript analyzes the code THEN WebviewManager.panel is typed as any, FileHighlighter.kiroAPI is any, FileHighlighter.decorationProvider is any, FileWatcher.watchers is any[], ExtensionContext.subscriptions is any[], and multiple AST-related parameters are any, bypassing type safety

1.18 WHEN ComponentExtractor.ts and RelationshipExtractor.ts are analyzed THEN both files contain identical findNodeInTree() implementations, and AnalysisService.ts and GroundingDataBuilder.ts both contain buildDirectoryTree(), buildImportGraph(), and buildInheritanceGraph() with duplicated logic

1.19 WHEN the codebase is analyzed THEN GroundingDataBuilder.ts at 847 lines duplicates AnalysisService.ts functionality but is never imported or used anywhere in the codebase, adding 847 lines of dead code

1.20 WHEN WebviewManager.ts:183 generates webview HTML THEN the Content-Security-Policy uses `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'` instead of generating nonces and using `script-src 'nonce-{random}'`, allowing arbitrary script execution if XSS vulnerabilities exist

### Expected Behavior (Correct)

#### Priority 1: Critical/Red Flags

2.1 WHEN ExtensionController imports error classes THEN the system SHALL have single definitions for AnalysisError, RenderError, and AIError (remove all three from src/types/index.ts and keep ErrorHandler.ts versions) with consistent constructor signatures used throughout the codebase, allowing instanceof checks to work correctly

2.2 WHEN VS Code starts THEN package.json SHALL use `activationEvents: ["onCommand:archview.generateDiagram", "onCommand:archview.refreshDiagram", "onCommand:archview.exportDiagram"]` instead of `["*"]` so the extension only loads when users invoke archview commands

2.3 WHEN ExtensionController.ts (lines 182, 481) and WebviewManager.ts (line 123) need the vscode module THEN the code SHALL use top-level `import * as vscode from 'vscode'` at the file beginning instead of runtime require() calls, enabling TypeScript type checking and single module load. PREREQUISITE: Install @types/vscode in devDependencies first to avoid compilation errors

2.4 WHEN ExtensionController.ts:439 needs to call buildHeuristicModel THEN the code SHALL either make the method public or refactor to use proper dependency injection instead of `this.aiService['buildHeuristicModel']` bracket notation access

2.5 WHEN ParserManager.ts:367-370 implements createEmptyTree() THEN the code SHALL call `parser.setLanguage(someLanguage)` before `parser.parse('')` to create a functional parser. NOTE: This method IS used at lines 133, 148, and 173 as fallback for error cases and serves a real purpose (graceful degradation), so it cannot be deleted

2.6 WHEN AnalysisOptimizer.ts:106-114 provides parseWithWorkerThreads THEN the code SHALL either implement actual worker thread support with proper Worker instantiation and message passing OR remove the method and worker support check at lines 63-65 entirely

2.7 WHEN AnalysisOptimizer.ts:196-205 computes cache keys THEN the code SHALL use `crypto.createHash('sha256').update(content).digest('hex')` like AnalysisService.ts:495 does, replacing the custom 32-bit hash function to eliminate collision risk

#### Priority 2: Medium Severity

2.8 WHEN FileWatcher.ts:127-140 implements setupWatchers() THEN the code SHALL either implement actual file watching using `vscode.workspace.createFileSystemWatcher()` OR remove the FileWatcher class entirely if file watching is not needed

2.9 WHEN ExtensionController.ts:780-810 implements loadState() and saveState() THEN the code SHALL use `this.context.globalState.get()` and `this.context.globalState.update()` to actually persist state OR remove the methods if state persistence is not needed

2.10 WHEN ExtensionController.ts:667-671 implements getWorkspaceRoot() THEN the code SHALL return `vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd()` instead of just `process.cwd()` to get the actual workspace folder

2.11 WHEN ExtensionController.ts:693-731 implements getAnalysisConfig() THEN the code SHALL read configuration using `const config = vscode.workspace.getConfiguration('archview')` and return `config.get('includePatterns')`, `config.get('excludePatterns')`, `config.get('maxFiles')`, `config.get('maxDepth')`, `config.get('languages')`, `config.get('aiEnabled')`, `config.get('autoRefresh')`, `config.get('autoRefreshDebounce')` instead of hardcoded values, and registerConfigurationListener() SHALL use `vscode.workspace.onDidChangeConfiguration()`. NOTE: package.json already has complete configuration schema defined

2.12 WHEN MemoryManager.ts:183-195 implements releaseMemory() THEN the code SHALL remove the setInterval polling loop (that checks elapsed time every 100ms until 2 seconds pass) and return immediately after cleanup completes

2.13 WHEN WebviewManager.ts:71-73 registers message handlers THEN the code SHALL store handler disposables in an array and implement a dispose() method that calls `disposable.dispose()` on all handlers, and setupWebviewMessageHandling() SHALL clear old handlers before registering new ones

2.14 WHEN FileScanner.ts:336-352 implements globToRegex() THEN the code SHALL properly escape backslashes and other regex special characters OR replace the custom implementation with the minimatch library using `minimatch.makeRe(pattern)`

#### Priority 3: Code Quality

2.15 WHEN ExtensionController.ts is deployed THEN the code SHALL remove all `console.log('===...')` debug statements throughout the file (e.g., line 182, 436, etc.) and replace the test command at lines 186-192 with actual test execution or remove it entirely

2.16 WHEN the repository is maintained THEN the code SHALL delete all 13 troubleshooting markdown files (COMMANDS_FIXED.md, DEBUG_LOGGING_ADDED.md, FIX_APPLIED.md, QUICK_FIX.md, TROUBLESHOOTING_COMMAND_NOT_FOUND.md, WEBVIEW_ISSUE_REPORT.md, etc.) from the repository root

2.17 WHEN TypeScript analyzes the code THEN WebviewManager.panel SHALL be typed as `vscode.WebviewPanel | undefined`, FileHighlighter.kiroAPI SHALL have a proper interface type, FileHighlighter.decorationProvider SHALL be typed as the correct provider type, FileWatcher.watchers SHALL be `vscode.FileSystemWatcher[]`, and all AST parameters SHALL use proper tree-sitter types instead of any

2.18 WHEN ComponentExtractor.ts and RelationshipExtractor.ts need findNodeInTree THEN the code SHALL extract the function to a shared utils/astUtils.ts file. NOTE: After deleting GroundingDataBuilder.ts (issue 1.19), the graph building functions (buildDirectoryTree, buildImportGraph, buildInheritanceGraph) only exist in AnalysisService.ts and should remain there - creating utils for single-use functions is premature abstraction

2.19 WHEN the codebase is analyzed THEN the code SHALL delete the entire src/analysis/GroundingDataBuilder.ts file (847 lines) since it is never imported or used anywhere

2.20 WHEN WebviewManager.ts:183 generates webview HTML THEN the code SHALL generate a random nonce using `crypto.randomBytes(16).toString('base64')`, pass it to the HTML template, and use `Content-Security-Policy: script-src 'nonce-{nonce}'; style-src 'nonce-{nonce}'` instead of 'unsafe-inline'

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the extension provides core functionality THEN the system SHALL CONTINUE TO generate architecture diagrams from codebases using AI and tree-sitter

3.2 WHEN users interact with diagrams THEN the system SHALL CONTINUE TO support element selection, hover, abstraction level changes, and export functionality

3.3 WHEN analysis is performed THEN the system SHALL CONTINUE TO support TypeScript, JavaScript, Python, Java, and Go languages

3.4 WHEN diagrams are displayed THEN the system SHALL CONTINUE TO use Cytoscape.js for interactive visualization

3.5 WHEN files are analyzed THEN the system SHALL CONTINUE TO respect include/exclude patterns from configuration

3.6 WHEN AI is enabled THEN the system SHALL CONTINUE TO use Kiro AI service for architecture interpretation

3.7 WHEN errors occur THEN the system SHALL CONTINUE TO provide user-friendly error messages through the ErrorHandler

3.8 WHEN memory management is needed THEN the system SHALL CONTINUE TO use MemoryManager for resource cleanup

3.9 WHEN file highlighting is needed THEN the system SHALL CONTINUE TO use FileHighlighter to show related files in the IDE

3.10 WHEN configuration changes THEN the system SHALL CONTINUE TO invalidate cache and offer to refresh diagrams
