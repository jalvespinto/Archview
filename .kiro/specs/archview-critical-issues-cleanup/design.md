# ArchView Critical Issues Cleanup Bugfix Design

## Overview

This bugfix addresses 20 critical issues in the ArchView VS Code extension identified through comprehensive code inspection. The issues span three priority levels: Critical/Red Flags (7 issues), Medium Severity (7 issues), and Code Quality (6 issues). The fix strategy follows a systematic approach organized by priority and dependency relationships to ensure safe, incremental fixes without breaking existing functionality.

The most critical issues include duplicate error class definitions causing type collisions, eager extension activation impacting VS Code startup time, runtime require() calls bypassing TypeScript type checking, and security vulnerabilities in hash functions and glob pattern matching. The fix implementation will proceed in priority order, with dependency-aware sequencing to ensure that foundational fixes (like consolidating error classes) are completed before dependent fixes.

## Glossary

- **Bug_Condition (C)**: The condition that triggers each of the 20 identified bugs - ranging from type collisions to security vulnerabilities
- **Property (P)**: The desired behavior for each bug - correct type checking, proper activation, secure hashing, etc.
- **Preservation**: Existing core functionality (diagram generation, AI analysis, file watching, etc.) that must remain unchanged
- **AnalysisError**: Error class defined in both src/types/index.ts and src/analysis/ErrorHandler.ts causing type collisions
- **ExtensionController**: Main controller in src/ExtensionController.ts that orchestrates extension functionality
- **ParserManager**: Component in src/analysis/ParserManager.ts that manages tree-sitter parsers for code analysis
- **AnalysisOptimizer**: Component in src/performance/AnalysisOptimizer.ts that handles performance optimization
- **WebviewManager**: Component in src/ui/WebviewManager.ts that manages diagram display webviews
- **FileWatcher**: Component in src/analysis/FileWatcher.ts for monitoring file changes
- **MemoryManager**: Component in src/performance/MemoryManager.ts for resource cleanup
- **FileScanner**: Component in src/analysis/FileScanner.ts for scanning workspace files
- **Activation Events**: VS Code mechanism that determines when extensions load
- **Tree-sitter**: Parser library used for code analysis across multiple languages
- **CSP (Content-Security-Policy)**: Security header that restricts script execution in webviews

## Bug Details

### Fault Condition

The bugs manifest across 20 distinct conditions spanning type system conflicts, performance issues, security vulnerabilities, and code quality problems. Each bug has a specific trigger condition and impact on the extension's functionality.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type CodebaseState | RuntimeEvent | ConfigurationState
  OUTPUT: boolean
  
  RETURN (
    // Priority 1: Critical/Red Flags
    (input.errorClassImport AND hasDuplicateErrorClass(input)) OR
    (input.extensionActivation AND activationEvents == ["*"]) OR
    (input.moduleImport AND usesRuntimeRequire(input)) OR
    (input.methodAccess AND usesBracketNotationForPrivate(input)) OR
    (input.parserCreation AND NOT hasLanguageSet(input)) OR
    (input.workerThreadUsage AND isDeadCode(input)) OR
    (input.hashFunction AND hasCollisionRisk(input)) OR
    
    // Priority 2: Medium Severity
    (input.fileWatcherSetup AND isEmptyImplementation(input)) OR
    (input.stateManagement AND isStubImplementation(input)) OR
    (input.workspaceRoot AND returnsWrongDirectory(input)) OR
    (input.configurationAccess AND usesHardcodedDefaults(input)) OR
    (input.memoryRelease AND hasArtificialDelay(input)) OR
    (input.messageHandlers AND hasMemoryLeak(input)) OR
    (input.globPattern AND hasRegexInjectionRisk(input)) OR
    
    // Priority 3: Code Quality
    (input.codeExecution AND hasDebugStatements(input)) OR
    (input.repositoryRoot AND hasTroubleshootingFiles(input)) OR
    (input.typeAnnotations AND usesAnyType(input)) OR
    (input.codeAnalysis AND hasDuplicateCode(input)) OR
    (input.codebaseFiles AND hasDeadCode(input)) OR
    (input.webviewHTML AND usesUnsafeInlineCSP(input))
  )
END FUNCTION
```

### Examples

**Priority 1 Examples:**

- **Issue 1.1 (Duplicate Error Classes)**: ExtensionController.ts imports AnalysisError from ErrorHandler.ts and catches errors, but generateDiagram throws AnalysisError from types/index.ts with different constructor signature (3-arg vs different), causing `instanceof AnalysisError` to return false and error handling to fail silently
  - Expected: Single AnalysisError definition, instanceof checks work correctly
  - Actual: Two definitions, type collisions, silent failures

- **Issue 1.2 (Eager Activation)**: User opens VS Code with 50 extensions installed, ArchView loads immediately on startup even though user never uses it, adding 200ms to startup time
  - Expected: Extension loads only when user runs archview.generateDiagram command
  - Actual: Extension loads on every VS Code event

- **Issue 1.3 (Runtime Require)**: ExtensionController.ts:182 executes `const vscode = require('vscode')` inside showDiagram method, bypassing TypeScript type checking and loading module multiple times
  - Expected: Top-level `import * as vscode from 'vscode'` with full type checking
  - Actual: Runtime require with any types

**Priority 2 Examples:**

- **Issue 1.8 (Empty FileWatcher)**: FileWatcher.ts:127-140 setupWatchers() method has empty body, file changes are never detected, diagrams become stale
  - Expected: Actual file watching using vscode.workspace.createFileSystemWatcher()
  - Actual: No-op method, no file watching

- **Issue 1.12 (Artificial Delay)**: MemoryManager.ts:183-195 releaseMemory() completes cleanup in 50ms but waits 2000ms before returning, adding 1950ms unnecessary delay
  - Expected: Return immediately after cleanup
  - Actual: Always waits 2 seconds

**Priority 3 Examples:**

- **Issue 1.17 (Any Types)**: WebviewManager.panel typed as any, FileHighlighter.kiroAPI as any, bypassing type safety and allowing runtime errors
  - Expected: Proper types like `vscode.WebviewPanel | undefined`
  - Actual: any types throughout codebase

- **Issue 1.19 (Dead Code)**: GroundingDataBuilder.ts contains 847 lines of code but is never imported anywhere, adding maintenance burden
  - Expected: File deleted or properly integrated
  - Actual: 847 lines of unused code


## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Diagram generation from codebases using AI and tree-sitter must continue to work exactly as before
- Element selection, hover, abstraction level changes, and export functionality must remain unchanged
- Support for TypeScript, JavaScript, Python, Java, and Go languages must be preserved
- Cytoscape.js interactive visualization must continue to function
- Include/exclude pattern configuration must continue to be respected
- Kiro AI service integration for architecture interpretation must remain functional
- User-friendly error messages through ErrorHandler must continue to work
- MemoryManager resource cleanup functionality must be preserved (just faster)
- FileHighlighter IDE integration must continue to work
- Configuration change detection and cache invalidation must remain functional

**Scope:**
All inputs that do NOT involve the 20 specific bug conditions should be completely unaffected by this fix. This includes:
- Normal diagram generation workflows
- User interactions with generated diagrams
- AI-powered architecture analysis
- File pattern matching for non-malicious patterns
- Memory management for non-buggy cleanup scenarios
- All existing VS Code command registrations
- Extension configuration reading (after fix)
- Webview rendering (after CSP fix)


## Hypothesized Root Cause

Based on the bug analysis, the root causes fall into several categories:

1. **Architectural Debt from Rapid Development**: The duplicate error classes, dead code (GroundingDataBuilder.ts), and stub implementations (FileWatcher, state management) suggest the codebase evolved quickly with incomplete refactoring
   - Multiple developers may have created parallel implementations
   - Features were scaffolded but never completed
   - Refactoring was deferred and forgotten

2. **Lack of TypeScript Best Practices**: Runtime require() calls, bracket notation for private methods, and extensive any types indicate TypeScript was not fully leveraged
   - Developers may have come from JavaScript background
   - Type checking was bypassed for convenience
   - No strict TypeScript configuration enforced

3. **Performance Optimization Attempts Gone Wrong**: The worker thread dead code and artificial delays suggest performance work was started but abandoned
   - Worker thread implementation was scaffolded but never completed
   - Artificial delay may have been added for debugging and never removed
   - Performance optimization was deprioritized

4. **Security Knowledge Gaps**: The weak hash function, unsafe CSP, and regex injection vulnerability indicate security was not prioritized
   - Custom hash function was used instead of crypto library
   - CSP was set to permissive defaults
   - Glob-to-regex conversion didn't consider injection attacks

5. **Configuration Management Oversight**: Eager activation and hardcoded configuration suggest VS Code extension best practices were not followed
   - activationEvents: ["*"] is a common beginner mistake
   - Configuration API was not understood or prioritized
   - Hardcoded defaults were used as placeholders

6. **Code Quality Drift**: Debug statements, troubleshooting files, and duplicate code indicate lack of code review and cleanup processes
   - Debug code was committed to main branch
   - Troubleshooting files were created during debugging sessions
   - No automated linting or code quality checks enforced


## Correctness Properties

Property 1: Fault Condition - Type System Integrity

_For any_ code that imports and uses AnalysisError, the fixed codebase SHALL have exactly one AnalysisError definition with a consistent constructor signature, allowing instanceof checks to work correctly and error handling to function as intended.

**Validates: Requirements 2.1**

Property 2: Fault Condition - Lazy Extension Activation

_For any_ VS Code startup event, the fixed extension SHALL only activate when archview commands are explicitly invoked, reducing startup time impact and following VS Code best practices.

**Validates: Requirements 2.2**

Property 3: Fault Condition - Static Type Checking

_For any_ module import in the codebase, the fixed code SHALL use top-level import statements instead of runtime require() calls, enabling full TypeScript type checking and preventing any type pollution.

**Validates: Requirements 2.3**

Property 4: Fault Condition - Access Control Integrity

_For any_ method access in the codebase, the fixed code SHALL use proper access modifiers and dependency injection instead of bracket notation to bypass private access, maintaining encapsulation and refactoring safety.

**Validates: Requirements 2.4**

Property 5: Fault Condition - Parser Initialization

_For any_ tree-sitter parser creation, the fixed code SHALL either set a language grammar before parsing or remove non-functional parser creation, ensuring parsers can actually parse code.

**Validates: Requirements 2.5**

Property 6: Fault Condition - Dead Code Elimination

_For any_ code path that is unreachable or non-functional, the fixed codebase SHALL remove the dead code entirely, reducing maintenance burden and preventing confusion.

**Validates: Requirements 2.6, 2.19**

Property 7: Fault Condition - Cryptographic Hash Security

_For any_ cache key computation or hash generation, the fixed code SHALL use crypto.createHash with SHA-256 instead of custom 32-bit hash functions, eliminating collision risk and ensuring cache correctness.

**Validates: Requirements 2.7**

Property 8: Fault Condition - File Watching Implementation

_For any_ file watching setup, the fixed code SHALL either implement actual file watching using VS Code APIs or remove the FileWatcher class entirely, ensuring file changes are properly detected or the feature is explicitly not supported.

**Validates: Requirements 2.8**

Property 9: Fault Condition - State Persistence

_For any_ state management operation, the fixed code SHALL either use VS Code's globalState/workspaceState APIs to actually persist state or remove the methods entirely, ensuring state is not lost between sessions or the feature is explicitly not supported.

**Validates: Requirements 2.9**

Property 10: Fault Condition - Workspace Root Detection

_For any_ workspace root retrieval, the fixed code SHALL return the actual VS Code workspace folder path instead of the VS Code installation directory, ensuring analysis targets the correct codebase.

**Validates: Requirements 2.10**

Property 11: Fault Condition - Configuration Reading

_For any_ configuration access, the fixed code SHALL read from VS Code's configuration API instead of returning hardcoded defaults, allowing users to customize extension behavior.

**Validates: Requirements 2.11**

Property 12: Fault Condition - Memory Release Performance

_For any_ memory cleanup operation, the fixed code SHALL return immediately after cleanup completes instead of waiting artificially, eliminating unnecessary delays.

**Validates: Requirements 2.12**

Property 13: Fault Condition - Message Handler Lifecycle

_For any_ webview message handler registration, the fixed code SHALL properly dispose of old handlers before registering new ones, preventing memory leaks from accumulating handlers.

**Validates: Requirements 2.13**

Property 14: Fault Condition - Glob Pattern Security

_For any_ glob-to-regex conversion, the fixed code SHALL properly escape special characters or use a vetted library like minimatch, preventing regex injection and ReDoS attacks.

**Validates: Requirements 2.14**

Property 15: Fault Condition - Production Code Cleanliness

_For any_ production code execution, the fixed codebase SHALL have all debug console.log statements removed and test commands either implemented or removed, ensuring clean production output.

**Validates: Requirements 2.15**

Property 16: Fault Condition - Repository Organization

_For any_ repository root inspection, the fixed repository SHALL have all troubleshooting markdown files removed, reducing clutter and maintaining professional repository structure.

**Validates: Requirements 2.16**

Property 17: Fault Condition - Type Safety

_For any_ variable or parameter declaration, the fixed code SHALL use proper TypeScript types instead of any, enabling compile-time error detection and IDE autocomplete.

**Validates: Requirements 2.17**

Property 18: Fault Condition - Code Deduplication

_For any_ duplicated function implementation, the fixed code SHALL extract the function to a shared utility module, reducing maintenance burden and ensuring consistent behavior.

**Validates: Requirements 2.18**

Property 19: Fault Condition - Content Security Policy

_For any_ webview HTML generation, the fixed code SHALL use nonce-based CSP instead of unsafe-inline, preventing XSS attacks if vulnerabilities exist in the webview content.

**Validates: Requirements 2.20**

Property 20: Preservation - Core Functionality

_For any_ diagram generation, user interaction, language support, visualization, pattern matching, AI integration, error handling, memory management, file highlighting, or configuration change detection, the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**


## Fix Implementation

### Dependency Analysis

The fixes have the following dependencies that dictate implementation order:

**Dependency Graph:**
```
Issue 1.1 (Duplicate Error Classes)
  └─> Blocks: Issues 1.3, 1.4 (ExtensionController changes)
  
Issue 1.19 (Dead Code - GroundingDataBuilder)
  └─> Blocks: Issue 1.18 (Code deduplication)
  
Issue 1.3 (Static Imports)
  └─> Blocks: Issue 1.18 (Code deduplication - new files need proper imports)

Independent: Issues 1.2, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16, 1.17, 1.20
```

**Implementation Sequence:**
1. Phase 1: Foundation fixes (1.1, 1.19) - Resolve type system and remove dead code
2. Phase 2: Critical fixes (1.2, 1.3, 1.4, 1.5, 1.6, 1.7) - Fix security and functionality problems
3. Phase 3: Medium severity fixes (1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.18) - Fix medium issues and deduplication
4. Phase 4: Code quality fixes (1.15, 1.16, 1.17, 1.20) - Clean up code quality

### Changes Required

#### Phase 1: Foundation Fixes

**Issue 1.1 - Consolidate Duplicate Error Classes**

**Files**: 
- `src/types/index.ts`
- `src/analysis/ErrorHandler.ts`
- All files importing error classes

**Specific Changes**:
1. **Analyze All Three Error Classes**: Compare AnalysisError, RenderError, and AIError in types/index.ts vs ErrorHandler.ts
   - types/index.ts: AnalysisError (3-arg: message, userMessage, context), RenderError (3-arg), AIError (2-arg)
   - ErrorHandler.ts: AnalysisError (5-arg: message, userMessage, type, context, cause), RenderError (5-arg), AIError (4-arg)
2. **Choose Canonical Definition**: Keep the ErrorHandler.ts versions as they are more complete with error categorization and cause tracking
3. **Remove Duplicates**: Delete AnalysisError, RenderError, and AIError from src/types/index.ts (lines 201-232)
4. **Update Imports**: Search codebase for imports from types/index.ts and change to import from ErrorHandler.ts
5. **Verify instanceof**: Test that error catching with instanceof works correctly after consolidation

**Issue 1.19 - Delete Dead Code (GroundingDataBuilder)**

**Files**:
- `src/analysis/GroundingDataBuilder.ts` (DELETE)

**Specific Changes**:
1. **Verify No Imports**: Search codebase for any imports of GroundingDataBuilder (should be none)
2. **Delete File**: Remove src/analysis/GroundingDataBuilder.ts entirely (847 lines)
3. **Update Build**: Ensure TypeScript compilation succeeds without the file

**Issue 1.18 - Deduplicate Code**

**Files**:
- `src/utils/astUtils.ts` (CREATE)
- `src/analysis/ComponentExtractor.ts`
- `src/analysis/RelationshipExtractor.ts`

**Specific Changes**:
1. **Create astUtils.ts**: Extract findNodeInTree() from ComponentExtractor.ts and RelationshipExtractor.ts
   ```typescript
   export function findNodeInTree(tree: Parser.Tree, predicate: (node: Parser.SyntaxNode) => boolean): Parser.SyntaxNode | null {
     // Implementation from ComponentExtractor.ts
   }
   ```

2. **Update ComponentExtractor.ts**: Replace findNodeInTree implementation with `import { findNodeInTree } from '../utils/astUtils'`

3. **Update RelationshipExtractor.ts**: Replace findNodeInTree implementation with `import { findNodeInTree } from '../utils/astUtils'`

**NOTE**: After deleting GroundingDataBuilder.ts (issue 1.19), the graph building functions (buildDirectoryTree, buildImportGraph, buildInheritanceGraph) only exist in AnalysisService.ts. These should remain there - creating utils for single-use functions is premature abstraction.


#### Phase 2: Critical Fixes

**Issue 1.2 - Fix Eager Extension Activation**

**Files**:
- `package.json`

**Specific Changes**:
1. **Update activationEvents**: Change line 15 from:
   ```json
   "activationEvents": ["*"]
   ```
   to:
   ```json
   "activationEvents": [
     "onCommand:archview.generateDiagram",
     "onCommand:archview.refreshDiagram",
     "onCommand:archview.exportDiagram"
   ]
   ```

2. **Verify Commands**: Ensure all three commands are registered in ExtensionController.ts activate() method

**Issue 1.3 - Replace Runtime Require with Static Imports**

**Files**:
- `src/ExtensionController.ts`
- `src/ui/WebviewManager.ts`
- `package.json`

**Specific Changes**:
1. **PREREQUISITE - Install @types/vscode**: Run `npm install --save-dev @types/vscode` to add TypeScript definitions for VS Code API. This is required before adding top-level imports to avoid compilation errors.

2. **ExtensionController.ts**: 
   - Add at top of file: `import * as vscode from 'vscode'`
   - Remove line 182 in registerCommands(): `const vscode = require('vscode')`
   - Remove line 481 in generateDiagram() catch block: `const vscode = require('vscode')`
   - Use the imported vscode module directly in both locations

3. **WebviewManager.ts**:
   - Add at top of file: `import * as vscode from 'vscode'`
   - Remove line 123 in createWebviewPanel(): `const vscode = require('vscode')`
   - Use the imported vscode module directly

**Issue 1.4 - Fix Private Method Access**

**Files**:
- `src/ExtensionController.ts`
- `src/analysis/KiroAIService.ts`

**Specific Changes**:
1. **Option A - Make Method Public**: In KiroAIService.ts, change buildHeuristicModel from private to public:
   ```typescript
   public async buildHeuristicModel(...) { ... }
   ```

2. **Option B - Refactor to Dependency Injection**: Extract heuristic model building to a separate service and inject it
   - Create `src/analysis/HeuristicModelBuilder.ts`
   - Move buildHeuristicModel logic there
   - Inject into ExtensionController

3. **Update ExtensionController.ts line 439**: Change from:
   ```typescript
   this.aiService['buildHeuristicModel'](...)
   ```
   to:
   ```typescript
   this.aiService.buildHeuristicModel(...)  // Option A
   // OR
   this.heuristicModelBuilder.build(...)     // Option B
   ```

**Recommendation**: Use Option A for simplicity unless buildHeuristicModel should truly be private

**Issue 1.5 - Fix Parser Initialization**

**Files**:
- `src/analysis/ParserManager.ts`

**Specific Changes**:
1. **NOTE**: createEmptyTree() IS used at lines 133, 148, and 173 as fallback when no parser is available or parsing fails. It serves a real purpose (graceful degradation) and cannot be deleted.

2. **Fix Implementation**: Update lines 367-370:
   ```typescript
   private createEmptyTree(): Parser.Tree {
     const parser = new Parser();
     parser.setLanguage(this.getDefaultLanguage()); // Add language setting
     return parser.parse('');
   }
   ```

3. **Add getDefaultLanguage()**: Add helper method:
   ```typescript
   private getDefaultLanguage(): any {
     return require('tree-sitter-typescript').typescript; // Or appropriate default
   }
   ```

**Issue 1.6 - Remove Dead Worker Thread Code**

**Files**:
- `src/performance/AnalysisOptimizer.ts`

**Specific Changes**:
1. **Remove parseWithWorkerThreads**: Delete method at lines 106-114
2. **Remove Worker Support Check**: Delete lines 63-65 that check for Worker class
3. **Update Callers**: Change any calls to parseWithWorkerThreads to call parseWithAsyncBatching directly
4. **Remove Worker Imports**: Remove any worker-related imports at top of file

**Issue 1.7 - Use Secure Hash Function**

**Files**:
- `src/performance/AnalysisOptimizer.ts`

**Specific Changes**:
1. **Add Crypto Import**: At top of file:
   ```typescript
   import * as crypto from 'crypto';
   ```

2. **Replace Custom Hash**: Change lines 196-205 from:
   ```typescript
   private computeCacheKey(content: string): string {
     let hash = 0;
     for (let i = 0; i < content.length; i++) {
       const char = content.charCodeAt(i);
       hash = ((hash << 5) - hash) + char;
       hash = hash & hash; // Convert to 32-bit integer
     }
     return hash.toString(36); // in production, use crypto.createHash
   }
   ```
   to:
   ```typescript
   private computeCacheKey(content: string): string {
     return crypto.createHash('sha256').update(content).digest('hex');
   }
   ```


#### Phase 3: Medium Severity Fixes

**Issue 1.8 - Implement or Remove FileWatcher**

**Files**:
- `src/analysis/FileWatcher.ts`
- `src/ExtensionController.ts`

**Specific Changes**:
1. **Option A - Implement File Watching**: Fix lines 127-140 in FileWatcher.ts:
   ```typescript
   private setupWatchers(): void {
     const workspaceRoot = vscode.workspace.workspaceFolders?.[0];
     if (!workspaceRoot) return;
     
     const watcher = vscode.workspace.createFileSystemWatcher(
       new vscode.RelativePattern(workspaceRoot, '**/*.{ts,js,py,java,go}')
     );
     
     watcher.onDidChange(uri => this.handleFileChange(uri));
     watcher.onDidCreate(uri => this.handleFileChange(uri));
     watcher.onDidDelete(uri => this.handleFileChange(uri));
     
     this.watchers.push(watcher);
   }
   ```

2. **Option B - Remove FileWatcher**: 
   - Delete src/analysis/FileWatcher.ts
   - Remove FileWatcher instantiation from ExtensionController.ts
   - Remove any FileWatcher-related imports

**Recommendation**: Implement Option A if file watching is desired feature, otherwise Option B

**Issue 1.9 - Implement or Remove State Persistence**

**Files**:
- `src/ExtensionController.ts`

**Specific Changes**:
1. **Option A - Implement State Persistence**: Fix lines 780-810:
   ```typescript
   private async loadState(): Promise<void> {
     const state = this.context.globalState.get<ExtensionState>('archview.state');
     if (state) {
       this.lastAnalysisTime = state.lastAnalysisTime;
       this.cachedDiagram = state.cachedDiagram;
       // Restore other state properties
     }
   }
   
   private async saveState(): Promise<void> {
     const state: ExtensionState = {
       lastAnalysisTime: this.lastAnalysisTime,
       cachedDiagram: this.cachedDiagram,
       // Other state properties
     };
     await this.context.globalState.update('archview.state', state);
   }
   ```

2. **Option B - Remove State Methods**: Delete loadState() and saveState() methods entirely if state persistence is not needed

3. **Add State Interface**: If Option A, add:
   ```typescript
   interface ExtensionState {
     lastAnalysisTime?: number;
     cachedDiagram?: any;
     // Other state properties
   }
   ```

**Issue 1.10 - Fix Workspace Root Detection**

**Files**:
- `src/ExtensionController.ts`

**Specific Changes**:
1. **Fix getWorkspaceRoot()**: Change lines 667-671 from:
   ```typescript
   private getWorkspaceRoot(): string {
     return process.cwd();
   }
   ```
   to:
   ```typescript
   private getWorkspaceRoot(): string {
     return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
   }
   ```

**Issue 1.11 - Implement Configuration Reading**

**Files**:
- `src/ExtensionController.ts`

**NOTE**: package.json already has a complete `contributes.configuration` section with all properties defined (includePatterns, excludePatterns, maxFiles, maxDepth, languages, aiEnabled, autoRefresh, autoRefreshDebounce). No changes needed to package.json.

**Specific Changes**:
1. **Fix getAnalysisConfig()**: Change lines 693-731 from hardcoded defaults to:
   ```typescript
   private getAnalysisConfig(rootPath: string): AnalysisConfig {
     const config = vscode.workspace.getConfiguration('archview');
     return {
       rootPath,
       includePatterns: config.get<string[]>('includePatterns', ['**/*.ts', '**/*.js', '**/*.py', '**/*.java', '**/*.go']),
       excludePatterns: config.get<string[]>('excludePatterns', ['**/node_modules/**', '**/dist/**', '**/.git/**']),
       maxFiles: config.get<number>('maxFiles', 1000),
       maxDepth: config.get<number>('maxDepth', 10),
       languages: this.mapLanguageStrings(config.get<string[]>('languages', ['typescript', 'javascript', 'python', 'java', 'go'])),
       aiEnabled: config.get<boolean>('aiEnabled', true),
       autoRefresh: config.get<boolean>('autoRefresh', false),
       autoRefreshDebounce: config.get<number>('autoRefreshDebounce', 10000)
     };
   }
   ```

2. **Fix registerConfigurationListener()**: Change lines 733-745 from no-op to:
   ```typescript
   private registerConfigurationListener(): void {
     this.context.subscriptions.push(
       vscode.workspace.onDidChangeConfiguration(e => {
         if (e.affectsConfiguration('archview')) {
           this.handleConfigurationChange();
         }
       })
     );
   }
   
   private handleConfigurationChange(): void {
     // Invalidate cache
     this.cache.clear();
     // Offer to refresh diagram
     vscode.window.showInformationMessage(
       'ArchView configuration changed. Refresh diagram?',
       'Refresh'
     ).then(selection => {
       if (selection === 'Refresh') {
         vscode.commands.executeCommand('archview.refreshDiagram');
       }
     });
   }
   ```

**Issue 1.12 - Remove Artificial Delay**

**Files**:
- `src/performance/MemoryManager.ts`

**Specific Changes**:
1. **Fix releaseMemory()**: Change lines 183-195 from:
   ```typescript
   async releaseMemory(cleanup: () => void | Promise<void>): Promise<void> {
     const startTime = Date.now();
     
     // Execute cleanup
     await cleanup();
     
     // Force garbage collection if available
     this.forceGarbageCollection();
     
     // Wait for memory to be released (up to 2 seconds)
     return new Promise((resolve) => {
       const checkInterval = setInterval(() => {
         const elapsed = Date.now() - startTime;
         
         if (elapsed >= this.RELEASE_TIMEOUT_MS) {
           clearInterval(checkInterval);
           resolve();
         }
       }, 100);
     });
   }
   ```
   to:
   ```typescript
   async releaseMemory(cleanup: () => void | Promise<void>): Promise<void> {
     // Execute cleanup
     await cleanup();
     
     // Force garbage collection if available
     this.forceGarbageCollection();
     
     // Return immediately after cleanup
   }
   ```

**Issue 1.13 - Fix Message Handler Memory Leak**

**Files**:
- `src/ui/WebviewManager.ts`

**Specific Changes**:
1. **Add Handler Tracking**: Add property to class:
   ```typescript
   private messageHandlers: vscode.Disposable[] = [];
   ```

2. **Fix onMessage()**: Change lines 71-73 to store disposables:
   ```typescript
   private onMessage(handler: (message: any) => void): void {
     const handlerId = `handler_${Date.now()}_${Math.random()}`;
     const disposable = this.panel?.webview.onDidReceiveMessage(handler);
     if (disposable) {
       this.messageHandlers.push(disposable);
     }
   }
   ```

3. **Fix setupWebviewMessageHandling()**: Change line 89 to clear old handlers:
   ```typescript
   private setupWebviewMessageHandling(): void {
     // Dispose old handlers
     this.messageHandlers.forEach(h => h.dispose());
     this.messageHandlers = [];
     
     // Register new handlers
     this.onMessage(message => { ... });
   }
   ```

4. **Add dispose()**: Add cleanup method:
   ```typescript
   public dispose(): void {
     this.messageHandlers.forEach(h => h.dispose());
     this.messageHandlers = [];
     this.panel?.dispose();
   }
   ```

**Issue 1.14 - Fix Glob Pattern Security**

**Files**:
- `src/analysis/FileScanner.ts`

**Specific Changes**:
1. **Option A - Use minimatch**: Replace custom globToRegex at lines 336-352:
   ```typescript
   import * as minimatch from 'minimatch';
   
   private globToRegex(pattern: string): RegExp {
     const regex = minimatch.makeRe(pattern);
     if (!regex) {
       throw new Error(`Invalid glob pattern: ${pattern}`);
     }
     return regex;
   }
   ```

2. **Option B - Fix Custom Implementation**: Properly escape special characters:
   ```typescript
   private globToRegex(pattern: string): RegExp {
     // Escape all regex special characters except glob wildcards
     let regexPattern = pattern
       .replace(/[.+^${}()|[\]]/g, '\\$&')  // Escape regex chars
       .replace(/\*/g, '.*')                 // * -> .*
       .replace(/\?/g, '.');                 // ? -> .
     return new RegExp(`^${regexPattern}$`);
   }
   ```

**Recommendation**: Use Option A (minimatch) as it's battle-tested and handles edge cases


#### Phase 4: Code Quality Fixes

**Issue 1.15 - Remove Debug Statements**

**Files**:
- `src/ExtensionController.ts`

**Specific Changes**:
1. **Remove Debug Logs**: Delete all console.log debug statements throughout the file, including:
   - Line 182: `console.log('=== registerCommands called ===')`
   - Line 436: `console.log('=== generateDiagram called ===')`
   - And all other debug console.log statements with '===' markers

2. **Fix Test Command**: Change lines 186-192 from:
   ```typescript
   const testDisposable = vscode.commands.registerCommand(
     'archview.test',
     () => {
       console.log('=== TEST COMMAND WORKS ===');
       vscode.window.showInformationMessage('ArchView test command works!');
     }
   );
   ```
   to either:
   - **Option A - Implement Tests**: Run actual test suite
   ```typescript
   vscode.commands.registerCommand('archview.test', async () => {
     const terminal = vscode.window.createTerminal('ArchView Tests');
     terminal.show();
     terminal.sendText('npm test');
   });
   ```
   - **Option B - Remove Command**: Delete the test command registration entirely

**Issue 1.16 - Remove Troubleshooting Files**

**Files** (DELETE ALL):
- `COMMANDS_FIXED.md`
- `DEBUG_LOGGING_ADDED.md`
- `FIX_APPLIED.md`
- `QUICK_FIX.md`
- `TROUBLESHOOTING_COMMAND_NOT_FOUND.md`
- `WEBVIEW_ISSUE_REPORT.md`
- `WEBVIEW_FIX_SUMMARY.md`
- `TEST_COMMAND_REGISTRATION.md`
- `TEST_ON_THIS_REPO.md`
- `test-output.txt`
- `TESTING_GUIDE.md` (if it's a troubleshooting file, not actual guide)
- `HOW_TO_TEST.md` (if it's a troubleshooting file, not actual guide)

**Specific Changes**:
1. **Review Each File**: Verify it's a troubleshooting artifact and not documentation
2. **Delete Files**: Remove all 13 troubleshooting markdown files from repository root
3. **Keep Proper Docs**: Preserve README.md, CHANGELOG.md, CONTRIBUTING.md, LICENSE, and docs/ folder

**Issue 1.17 - Add Proper Type Annotations**

**Files**:
- `src/ui/WebviewManager.ts`
- `src/ui/FileHighlighter.ts`
- `src/analysis/FileWatcher.ts`
- `src/ExtensionController.ts`
- All files with any types

**Specific Changes**:
1. **WebviewManager.ts**: Change panel type:
   ```typescript
   private panel: vscode.WebviewPanel | undefined;
   ```

2. **FileHighlighter.ts**: Add proper interface types:
   ```typescript
   interface KiroAPI {
     // Define actual API shape
     analyzeCode: (code: string) => Promise<AnalysisResult>;
     // Other methods
   }
   
   private kiroAPI: KiroAPI | undefined;
   private decorationProvider: vscode.TextEditorDecorationType;
   ```

3. **FileWatcher.ts**: Fix watchers type:
   ```typescript
   private watchers: vscode.FileSystemWatcher[] = [];
   ```

4. **ExtensionController.ts**: Fix subscriptions type:
   ```typescript
   private subscriptions: vscode.Disposable[] = [];
   ```

5. **AST Parameters**: Replace any with proper tree-sitter types:
   ```typescript
   import * as Parser from 'tree-sitter';
   
   function processNode(node: Parser.SyntaxNode): void { ... }
   function traverseTree(tree: Parser.Tree): void { ... }
   ```

6. **NOTE**: Do NOT enable `noImplicitAny: true` globally in tsconfig.json - this will cause hundreds of compilation errors given how pervasive any types are in the codebase (tree-sitter types, Kiro API stubs, VS Code API types). Fix the critical any types manually as listed above. Note that `strict: true` is already enabled in tsconfig.json.

**Issue 1.20 - Implement Nonce-based CSP**

**Files**:
- `src/ui/WebviewManager.ts`

**Specific Changes**:
1. **Add Crypto Import**: At top of file:
   ```typescript
   import * as crypto from 'crypto';
   ```

2. **Generate Nonce**: Add method:
   ```typescript
   private generateNonce(): string {
     return crypto.randomBytes(16).toString('base64');
   }
   ```

3. **Update HTML Generation**: Change line 183 and HTML template:
   ```typescript
   private getWebviewContent(): string {
     const nonce = this.generateNonce();
     
     return `<!DOCTYPE html>
     <html lang="en">
     <head>
       <meta charset="UTF-8">
       <meta http-equiv="Content-Security-Policy" 
             content="default-src 'none'; 
                      script-src 'nonce-${nonce}'; 
                      style-src 'nonce-${nonce}'; 
                      img-src vscode-resource: https:; 
                      font-src vscode-resource:;">
       <title>ArchView Diagram</title>
       <style nonce="${nonce}">
         /* Styles here */
       </style>
     </head>
     <body>
       <div id="cy"></div>
       <script nonce="${nonce}">
         // Script here
       </script>
     </body>
     </html>`;
   }
   ```

4. **Update External Scripts**: If loading external scripts, use nonce:
   ```typescript
   <script nonce="${nonce}" src="${scriptUri}"></script>
   ```


### Implementation Strategy

**Phased Rollout:**
1. **Phase 1 (Foundation)**: Fix issues 1.1, 1.18, 1.19 first to establish clean code structure
2. **Phase 2 (Critical)**: Fix issues 1.2-1.7 to address security and functionality problems
3. **Phase 3 (Medium)**: Fix issues 1.8-1.14 to improve reliability and performance
4. **Phase 4 (Quality)**: Fix issues 1.15-1.17, 1.20 to clean up code quality

**Testing Between Phases:**
- Run full test suite after each phase (`npm test`)
- Manually test diagram generation workflow
- Verify no regressions in core functionality
- Check that all VS Code commands still work
- Run existing property-based tests to catch edge cases

**Rollback Plan:**
- Use git branches for each phase
- Tag working states after each phase
- Keep detailed commit messages for easy rollback
- Test each phase independently before merging

**Risk Mitigation:**
- Start with low-risk fixes (dead code removal, debug statements)
- Test high-risk fixes (error class consolidation, activation events) thoroughly
- Have backup of working extension before starting
- Deploy to test environment before production


## Testing Strategy

### Validation Approach

The testing strategy follows a multi-phase approach: first, create exploratory tests to understand current behavior and surface bugs, then implement fixes, and finally verify fixes work correctly while preserving existing functionality. Each of the 20 issues requires specific validation.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing fixes. Confirm or refute the root cause analysis for each issue.

**Test Plan**: Write tests that exercise each bug condition on the UNFIXED code to observe failures and understand root causes.

**Test Cases by Priority:**

**Priority 1 - Critical/Red Flags:**

1. **Issue 1.1 - Duplicate Error Classes Test**: 
   - Create test that throws AnalysisError from types/index.ts
   - Catch with instanceof check using ErrorHandler.ts import
   - Assert instanceof returns false (will fail on unfixed code)
   - Expected counterexample: Type collision causes instanceof to fail

2. **Issue 1.2 - Eager Activation Test**:
   - Measure extension activation time on VS Code startup
   - Open VS Code without running any archview commands
   - Assert extension is NOT activated (will fail on unfixed code)
   - Expected counterexample: Extension loads immediately on startup

3. **Issue 1.3 - Runtime Require Test**:
   - Analyze ExtensionController.ts and WebviewManager.ts
   - Check for require() calls inside methods
   - Assert all imports are at top level (will fail on unfixed code)
   - Expected counterexample: require() calls at lines 182 and 123

4. **Issue 1.4 - Private Method Access Test**:
   - Search codebase for bracket notation method access
   - Assert no bracket notation used for method calls (will fail on unfixed code)
   - Expected counterexample: `this.aiService['buildHeuristicModel']` at line 439

5. **Issue 1.5 - Parser Initialization Test**:
   - Call createEmptyTree() method
   - Try to parse code with returned parser
   - Assert parser can parse code (will fail on unfixed code)
   - Expected counterexample: Parser fails because no language set

6. **Issue 1.6 - Dead Worker Thread Code Test**:
   - Call parseWithWorkerThreads() method
   - Trace execution path
   - Assert worker threads are actually used (will fail on unfixed code)
   - Expected counterexample: Always falls back to parseWithAsyncBatching

7. **Issue 1.7 - Hash Collision Test**:
   - Generate cache keys for similar content
   - Check for collisions with 32-bit hash
   - Assert no collisions (may fail on unfixed code)
   - Expected counterexample: Hash collisions with similar strings

**Priority 2 - Medium Severity:**

8. **Issue 1.8 - Empty FileWatcher Test**:
   - Instantiate FileWatcher and call setupWatchers()
   - Modify a watched file
   - Assert file change is detected (will fail on unfixed code)
   - Expected counterexample: No file watching occurs

9. **Issue 1.9 - State Persistence Test**:
   - Call saveState() with test data
   - Restart extension
   - Call loadState() and check data
   - Assert state is persisted (will fail on unfixed code)
   - Expected counterexample: State is not saved or loaded

10. **Issue 1.10 - Workspace Root Test**:
    - Call getWorkspaceRoot() in a workspace
    - Assert returns workspace folder path (will fail on unfixed code)
    - Expected counterexample: Returns process.cwd() (VS Code install dir)

11. **Issue 1.11 - Configuration Test**:
    - Set archview.maxFileSize in VS Code settings
    - Call getAnalysisConfig()
    - Assert returns configured value (will fail on unfixed code)
    - Expected counterexample: Returns hardcoded default

12. **Issue 1.12 - Artificial Delay Test**:
    - Measure time for releaseMemory() to complete
    - Assert completes in < 500ms (will fail on unfixed code)
    - Expected counterexample: Takes 2000ms+ due to artificial delay

13. **Issue 1.13 - Memory Leak Test**:
    - Call setupWebviewMessageHandling() 100 times
    - Check number of registered handlers
    - Assert handlers are cleaned up (will fail on unfixed code)
    - Expected counterexample: 100+ handlers accumulate

14. **Issue 1.14 - Regex Injection Test**:
    - Pass malicious glob pattern with backslashes
    - Call globToRegex()
    - Assert pattern is safely escaped (may fail on unfixed code)
    - Expected counterexample: Regex injection or ReDoS possible

**Priority 3 - Code Quality:**

15. **Issue 1.15 - Debug Statements Test**:
    - Search codebase for console.log statements
    - Assert no debug logs in production code (will fail on unfixed code)
    - Expected counterexample: 10+ console.log statements found

16. **Issue 1.16 - Troubleshooting Files Test**:
    - List files in repository root
    - Assert no troubleshooting markdown files (will fail on unfixed code)
    - Expected counterexample: 13 troubleshooting files present

17. **Issue 1.17 - Any Types Test**:
    - Run TypeScript compiler with strict mode
    - Assert no any types (will fail on unfixed code)
    - Expected counterexample: Multiple any types in WebviewManager, FileHighlighter, etc.

18. **Issue 1.18 - Duplicate Code Test**:
    - Search for findNodeInTree implementations
    - Assert only one implementation exists (will fail on unfixed code)
    - Expected counterexample: Duplicate implementations in ComponentExtractor and RelationshipExtractor

19. **Issue 1.19 - Dead Code Test**:
    - Search for imports of GroundingDataBuilder
    - Assert file is imported somewhere (will fail on unfixed code)
    - Expected counterexample: No imports found, 847 lines of dead code

20. **Issue 1.20 - Unsafe CSP Test**:
    - Generate webview HTML
    - Check Content-Security-Policy header
    - Assert uses nonce-based CSP (will fail on unfixed code)
    - Expected counterexample: Uses 'unsafe-inline'


### Fix Checking

**Goal**: Verify that for all inputs where each bug condition holds, the fixed code produces the expected behavior.

**Pseudocode:**
```
FOR EACH issue IN [1.1 to 1.20] DO
  FOR ALL input WHERE isBugCondition(input, issue) DO
    result := fixedCode(input)
    ASSERT expectedBehavior(result, issue)
  END FOR
END FOR
```

**Fix Verification Tests:**

**Phase 1 Tests:**
- Test 1.1: Verify instanceof AnalysisError works correctly after consolidation
- Test 1.18: Verify findNodeInTree works from shared utils module
- Test 1.19: Verify codebase compiles without GroundingDataBuilder.ts

**Phase 2 Tests:**
- Test 1.2: Verify extension only activates on archview commands
- Test 1.3: Verify TypeScript type checking works for vscode imports
- Test 1.4: Verify buildHeuristicModel is accessible without bracket notation
- Test 1.5: Verify createEmptyTree creates functional parser (or is removed)
- Test 1.6: Verify worker thread code is removed and async batching works
- Test 1.7: Verify cache keys use SHA-256 and have no collisions

**Phase 3 Tests:**
- Test 1.8: Verify file watching detects changes (or FileWatcher is removed)
- Test 1.9: Verify state persists across sessions (or methods are removed)
- Test 1.10: Verify getWorkspaceRoot returns actual workspace folder
- Test 1.11: Verify configuration is read from VS Code settings
- Test 1.12: Verify releaseMemory completes quickly without delay
- Test 1.13: Verify message handlers are disposed and don't leak
- Test 1.14: Verify glob patterns are safely converted to regex

**Phase 4 Tests:**
- Test 1.15: Verify no console.log statements in production code
- Test 1.16: Verify troubleshooting files are deleted
- Test 1.17: Verify all types are properly annotated (no any)
- Test 1.20: Verify webview uses nonce-based CSP

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalExtension(input) = fixedExtension(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for normal operations, then write property-based tests capturing that behavior.

**Preservation Test Cases:**

1. **Diagram Generation Preservation**: 
   - Generate diagrams for various codebases
   - Verify output matches unfixed version for valid inputs
   - Test with TypeScript, JavaScript, Python, Java, Go projects

2. **User Interaction Preservation**:
   - Test element selection in diagrams
   - Test hover functionality
   - Test abstraction level changes
   - Test export functionality
   - Verify all interactions work identically

3. **Language Support Preservation**:
   - Parse code in all supported languages
   - Verify AST extraction works identically
   - Test with various language constructs

4. **Visualization Preservation**:
   - Render diagrams with Cytoscape.js
   - Verify layout and styling unchanged
   - Test with various diagram sizes

5. **Pattern Matching Preservation**:
   - Test include/exclude patterns for normal cases
   - Verify file filtering works identically
   - Test with various glob patterns (non-malicious)

6. **AI Integration Preservation**:
   - Test AI-powered architecture interpretation
   - Verify AI service calls work identically
   - Test with various code structures

7. **Error Handling Preservation**:
   - Test error messages for various error conditions
   - Verify ErrorHandler produces same messages
   - Test with various error scenarios

8. **Memory Management Preservation**:
   - Test memory cleanup for normal operations
   - Verify MemoryManager cleans up correctly (just faster)
   - Test with various resource scenarios

9. **File Highlighting Preservation**:
   - Test file highlighting in IDE
   - Verify FileHighlighter works identically
   - Test with various file selections

10. **Configuration Change Preservation**:
    - Test configuration change detection
    - Verify cache invalidation works
    - Test with various configuration changes

### Unit Tests

**Test Organization:**
```
src/__tests__/
  ├── phase1/
  │   ├── errorClassConsolidation.test.ts
  │   ├── codeDeduplication.test.ts
  │   └── deadCodeRemoval.test.ts
  ├── phase2/
  │   ├── activationEvents.test.ts
  │   ├── staticImports.test.ts
  │   ├── methodAccess.test.ts
  │   ├── parserInitialization.test.ts
  │   ├── workerThreads.test.ts
  │   └── hashFunction.test.ts
  ├── phase3/
  │   ├── fileWatcher.test.ts
  │   ├── statePersistence.test.ts
  │   ├── workspaceRoot.test.ts
  │   ├── configuration.test.ts
  │   ├── memoryManager.test.ts
  │   ├── messageHandlers.test.ts
  │   └── globPatterns.test.ts
  ├── phase4/
  │   ├── codeQuality.test.ts
  │   ├── typeAnnotations.test.ts
  │   └── contentSecurityPolicy.test.ts
  └── preservation/
      ├── diagramGeneration.test.ts
      ├── userInteraction.test.ts
      ├── languageSupport.test.ts
      └── aiIntegration.test.ts
```

**Key Unit Tests:**
- Test each fix in isolation
- Test edge cases for each fix
- Test error conditions for each fix
- Test that fixes don't break related functionality

### Property-Based Tests

**Property Test Framework**: Use fast-check for property-based testing

**Key Properties to Test:**

1. **Error Handling Property**: For any error thrown, instanceof checks work correctly
2. **Activation Property**: For any VS Code event, extension only activates on archview commands
3. **Type Safety Property**: For any module import, TypeScript type checking is enabled
4. **Parser Property**: For any parser creation, language is set before parsing
5. **Hash Property**: For any content, hash function produces consistent results with no collisions
6. **Configuration Property**: For any configuration value, system reads from VS Code settings
7. **Memory Property**: For any memory cleanup, operation completes without artificial delay
8. **Handler Property**: For any handler registration, old handlers are disposed
9. **Pattern Property**: For any glob pattern, conversion to regex is safe
10. **Preservation Property**: For any non-buggy input, behavior is identical to original

**Example Property Test:**
```typescript
import fc from 'fast-check';

describe('Hash Function Property', () => {
  it('should produce consistent hashes with no collisions', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 100, maxLength: 1000 }),
        (contents) => {
          const hashes = contents.map(c => computeCacheKey(c));
          const uniqueHashes = new Set(hashes);
          // No collisions for different content
          return hashes.length === uniqueHashes.size;
        }
      )
    );
  });
});
```

### Integration Tests

**Integration Test Scenarios:**

1. **Full Diagram Generation Flow**:
   - Open workspace
   - Run archview.generateDiagram command
   - Verify diagram is generated and displayed
   - Test with all supported languages

2. **Configuration Change Flow**:
   - Change archview configuration
   - Verify cache is invalidated
   - Verify refresh prompt appears
   - Verify diagram updates after refresh

3. **File Watching Flow** (if implemented):
   - Generate diagram
   - Modify source file
   - Verify file change is detected
   - Verify diagram refresh is offered

4. **Error Handling Flow**:
   - Trigger various error conditions
   - Verify errors are caught correctly
   - Verify user-friendly messages are shown
   - Verify extension remains stable

5. **Memory Management Flow**:
   - Generate large diagram
   - Trigger memory cleanup
   - Verify cleanup completes quickly
   - Verify resources are released

6. **Multi-Language Flow**:
   - Generate diagram for polyglot project
   - Verify all languages are parsed correctly
   - Verify relationships across languages work
   - Verify diagram shows complete architecture

7. **AI Integration Flow**:
   - Generate diagram with AI enabled
   - Verify AI service is called
   - Verify architecture interpretation is added
   - Verify diagram includes AI insights

8. **Export Flow**:
   - Generate diagram
   - Export to various formats
   - Verify exports are correct
   - Verify all diagram elements are preserved

**Integration Test Environment:**
- Use VS Code Extension Test Runner
- Create test workspaces for each language
- Mock external dependencies (AI service, etc.)
- Test in clean VS Code instance

**Regression Test Suite:**
- Run full integration test suite after each phase
- Compare results with baseline from unfixed code
- Verify no functionality is broken
- Document any intentional behavior changes

