/**
 * Phase 3 Bug Condition Exploration Tests
 *
 * CRITICAL: These tests are designed to FAIL on UNFIXED code to prove bugs exist.
 * When tests FAIL, it confirms the bugs are present (this is the expected outcome).
 * After fixes are implemented, these same tests should PASS.
 *
 * Requirements: 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Strip single-line (//) and multi-line comments from TypeScript source code,
 * while preserving string literals that may contain // (e.g., '**\/*.ts').
 *
 * Uses a state-machine approach: walks character by character, tracks whether
 * we're inside a string literal or not, and only removes comments that appear
 * outside of strings.
 */
function stripComments(source: string): string {
  let result = '';
  let i = 0;
  const len = source.length;

  while (i < len) {
    const ch = source[i];
    const next = i + 1 < len ? source[i + 1] : '';

    // Single-quoted string
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      result += ch;
      i++;
      while (i < len) {
        if (source[i] === '\\') {
          result += source[i] + (i + 1 < len ? source[i + 1] : '');
          i += 2;
          continue;
        }
        if (source[i] === quote) {
          // For template literals, handle nested ${} later if needed;
          // for now just close on matching quote.
          result += source[i];
          i++;
          break;
        }
        result += source[i];
        i++;
      }
    }
    // Multi-line comment
    else if (ch === '/' && next === '*') {
      i += 2;
      while (i < len) {
        if (source[i] === '*' && i + 1 < len && source[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
    }
    // Single-line comment
    else if (ch === '/' && next === '/') {
      // Skip until end of line
      i += 2;
      while (i < len && source[i] !== '\n') {
        i++;
      }
    }
    // Normal character
    else {
      result += ch;
      i++;
    }
  }

  return result;
}

/**
 * Extract a method body from source code using brace counting.
 * Finds the method by signature pattern, then captures everything between
 * the opening and final closing brace at the same nesting depth.
 * Returns the full method text including signature, or null if not found.
 * 
 * FIXED: Now properly handles return types with braces by looking for the
 * method body brace (the one at the same indentation level as the method signature).
 */
function extractMethodBody(source: string, signaturePattern: RegExp): string | null {
  const match = signaturePattern.exec(source);
  if (!match) return null;

  const startIndex = match.index;
  
  // Find the opening brace of the method body
  // Strategy: Look for a brace that comes after the method signature line
  // The method signature ends with either `) {` or `): ReturnType {`
  let i = startIndex;
  let foundMethodBodyStart = false;
  let methodBodyStart = -1;
  
  // First, skip past the method signature to find where it ends
  // Look for the pattern: closing paren, optional return type, then opening brace
  while (i < source.length) {
    if (source[i] === '(') {
      // Found opening paren of parameters, now find the matching closing paren
      let parenDepth = 1;
      i++;
      while (i < source.length && parenDepth > 0) {
        if (source[i] === '(') parenDepth++;
        else if (source[i] === ')') parenDepth--;
        i++;
      }
      // Now we're past the parameters, look for the method body opening brace
      // Skip past return type if present (`: Type`)
      while (i < source.length) {
        if (source[i] === '{') {
          // Check if this brace is part of a return type or the method body
          // If we see a newline before this brace, it's likely the method body
          // If the brace is on the same line as the signature, it's the method body
          const textSinceParams = source.substring(i - 20, i);
          if (textSinceParams.includes('\n')) {
            // There's a newline, so this is likely the method body
            methodBodyStart = i;
            foundMethodBodyStart = true;
            break;
          } else {
            // No newline, check if this looks like a return type brace
            // Return type braces are usually like `: { prop: type }`
            // Method body braces are usually like `) {` or `): void {`
            const prevChars = source.substring(Math.max(0, i - 10), i).trim();
            if (prevChars.endsWith(')') || prevChars.endsWith('void') || prevChars.endsWith('Promise<void>')) {
              // This is the method body brace
              methodBodyStart = i;
              foundMethodBodyStart = true;
              break;
            } else {
              // This might be a return type brace, skip it
              i++;
              continue;
            }
          }
        }
        i++;
      }
      break;
    }
    i++;
  }
  
  if (!foundMethodBodyStart || methodBodyStart === -1) return null;
  
  // Now count braces from the method body start to find the end
  let braceDepth = 0;
  let endIndex = methodBodyStart;
  
  for (let j = methodBodyStart; j < source.length; j++) {
    if (source[j] === '{') {
      braceDepth++;
    } else if (source[j] === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        endIndex = j + 1;
        break;
      }
    }
  }

  if (braceDepth !== 0) return null;
  return source.substring(startIndex, endIndex);
}

describe('Phase 3: Bug Condition Exploration Tests', () => {

  describe('Issue 1.8: FileWatcher setupWatchers() is Empty Implementation', () => {

    it('should verify setupWatchers() has actual implementation (not just comments)', () => {
      // BUG: setupWatchers() method body is entirely comments — no executable code
      // EXPECTED TO FAIL on unfixed code: Method has no real implementation

      const filePath = path.join(__dirname, '..', 'analysis', 'FileWatcher.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private setupWatchers\(/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        // After stripping comments, check if there's any real watcher creation code
        const hasWatcherCreation =
          methodBody.includes('createFileSystemWatcher') ||
          methodBody.includes('watcher.onDidChange') ||
          methodBody.includes('watcher.onDidCreate') ||
          methodBody.includes('this.watchers.push');

        // EXPECTED TO FAIL: After stripping comments, no real code exists
        expect(hasWatcherCreation).toBe(true);
      }
    });

    it('should verify FileWatcher creates actual watchers when start() is called', () => {
      // BUG: start() calls setupWatchers() which is empty, so no watchers are created
      // EXPECTED TO FAIL on unfixed code: watchers array remains empty

      const filePath = path.join(__dirname, '..', 'analysis', 'FileWatcher.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private setupWatchers\(/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        // Remove the signature line to get just the body
        const bodyOnly = methodBody.replace(/private setupWatchers\([^)]*\)[^{]*\{/, '').replace(/\}$/, '');
        const trimmedBody = bodyOnly.trim();

        // EXPECTED TO FAIL: Body is empty after stripping comments
        expect(trimmedBody.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Issue 1.9: State Persistence is Stub Implementation', () => {

    it('should verify loadState() actually calls globalState.get (not just a comment)', () => {
      // BUG: loadState() has globalState.get only in a TODO comment, actual code is `const savedState = undefined`
      // EXPECTED TO FAIL on unfixed code: Method is a stub

      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private async loadState\(\)/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        // After stripping comments, the real code should call globalState.get
        const usesGlobalState =
          methodBody.includes('globalState.get');

        // EXPECTED TO FAIL: Only the comment mentions globalState.get, not the real code
        expect(usesGlobalState).toBe(true);
      }
    });

    it('should verify loadState() does not hardcode savedState to undefined', () => {
      // BUG: loadState() does `const savedState = undefined as Partial<ExtensionState> | undefined`
      // EXPECTED TO FAIL on unfixed code: savedState is always undefined

      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private async loadState\(\)/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        const hardcodesUndefined = methodBody.includes('= undefined as');

        // EXPECTED TO FAIL: Code hardcodes savedState to undefined
        expect(hardcodesUndefined).toBe(false);
      }
    });

    it('should verify saveState() actually calls globalState.update (not just a comment)', () => {
      // BUG: saveState() has globalState.update only in a TODO comment, actual code just logs
      // EXPECTED TO FAIL on unfixed code: Method is a stub

      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private async saveState\(\)/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        const usesGlobalState =
          methodBody.includes('globalState.update');

        // EXPECTED TO FAIL: Only the comment mentions globalState.update, not the real code
        expect(usesGlobalState).toBe(true);
      }
    });
  });

  describe('Issue 1.10: getWorkspaceRoot() Returns Wrong Directory', () => {

    it('should verify getWorkspaceRoot() uses vscode.workspace.workspaceFolders (not just a comment)', () => {
      // BUG: Returns process.cwd() — the TODO comment mentions workspaceFolders but code doesn't use it
      // EXPECTED TO FAIL on unfixed code: Returns wrong directory

      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private async getWorkspaceRoot\(\)/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        const usesWorkspaceFolders =
          methodBody.includes('workspaceFolders');

        // EXPECTED TO FAIL: Only the comment mentions workspaceFolders
        expect(usesWorkspaceFolders).toBe(true);
      }
    });

    it('should verify getWorkspaceRoot() does not simply return process.cwd()', () => {
      // BUG: Directly returns process.cwd() which is the VS Code installation dir
      // EXPECTED TO FAIL on unfixed code: Uses process.cwd() as the sole return value

      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private async getWorkspaceRoot\(\)/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        // Check if process.cwd() is the ONLY return value (not used as a fallback)
        // After fix, process.cwd() may remain as a fallback, but workspaceFolders should be primary
        const lines = methodBody.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const returnLines = lines.filter(l => l.startsWith('return'));

        const onlyReturnsCwd = returnLines.length === 1 && 
          returnLines[0].includes('process.cwd()') && 
          !returnLines[0].includes('workspaceFolders');

        // EXPECTED TO FAIL: Only return statement is `return process.cwd()`
        expect(onlyReturnsCwd).toBe(false);
      }
    });
  });

  describe('Issue 1.11: getAnalysisConfig() Uses Hardcoded Defaults', () => {

    it('should verify getAnalysisConfig() reads from VS Code configuration API (not just a comment)', () => {
      // BUG: Returns hardcoded defaults, ignores user configuration
      // The TODO comment mentions getConfiguration but code doesn't call it
      // EXPECTED TO FAIL on unfixed code: No configuration API usage

      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private getAnalysisConfig\(/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        const usesConfiguration =
          methodBody.includes('getConfiguration');

        // EXPECTED TO FAIL: No getConfiguration call in actual code (only in comment)
        expect(usesConfiguration).toBe(true);
      }
    });

    it('should verify registerConfigurationListener() actually registers a listener (not just a comment)', () => {
      // BUG: registerConfigurationListener() is a no-op that just logs
      // The TODO comment mentions onDidChangeConfiguration but code doesn't use it
      // EXPECTED TO FAIL on unfixed code: No actual listener registration

      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private registerConfigurationListener\(\)/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        const hasListener =
          methodBody.includes('onDidChangeConfiguration');

        // EXPECTED TO FAIL: No listener in actual code (only in comment)
        expect(hasListener).toBe(true);
      }
    });

    it('should verify package.json has configuration schema (already exists)', () => {
      // NOTE: package.json already has complete configuration schema
      // This test verifies it exists (should pass even on unfixed code)

      const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.contributes?.configuration).toBeDefined();

      const properties = packageJson.contributes?.configuration?.properties;
      expect(properties).toBeDefined();
      expect(properties['archview.maxFiles']).toBeDefined();
      expect(properties['archview.includePatterns']).toBeDefined();
      expect(properties['archview.excludePatterns']).toBeDefined();
    });
  });

  describe('Issue 1.12: releaseMemory() Has Artificial 2-Second Delay', () => {

    it('should verify releaseMemory() does not use setInterval polling loop', () => {
      // BUG: Method uses setInterval polling loop that waits 2 seconds even after cleanup completes
      // EXPECTED TO FAIL on unfixed code: Has setInterval inside releaseMemory

      const filePath = path.join(__dirname, '..', 'performance', 'MemoryManager.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      // Use brace-counting extraction to get the FULL method body
      const methodBody = extractMethodBody(content, /async releaseMemory\(/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        const hasPollingLoop = methodBody.includes('setInterval');

        // EXPECTED TO FAIL: Has setInterval polling loop in actual code
        expect(hasPollingLoop).toBe(false);
      }
    });

    it('should verify releaseMemory() does not wait for RELEASE_TIMEOUT_MS', () => {
      // BUG: Uses RELEASE_TIMEOUT_MS (2000ms) to artificially delay resolution
      // EXPECTED TO FAIL on unfixed code: Uses timeout constant

      const filePath = path.join(__dirname, '..', 'performance', 'MemoryManager.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /async releaseMemory\(/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        const usesTimeout = methodBody.includes('RELEASE_TIMEOUT_MS');

        // EXPECTED TO FAIL: References RELEASE_TIMEOUT_MS in actual code
        expect(usesTimeout).toBe(false);
      }
    });

    it('should verify releaseMemory() completes quickly (< 500ms) at runtime', async () => {
      // BUG: Takes ~2000ms due to polling loop waiting for RELEASE_TIMEOUT_MS
      // EXPECTED TO FAIL on unfixed code: Takes > 500ms

      const { MemoryManager } = await import('../performance/MemoryManager');
      const mgr = new MemoryManager();

      const start = Date.now();
      await mgr.releaseMemory(() => { /* instant cleanup */ });
      const elapsed = Date.now() - start;

      // EXPECTED TO FAIL: Takes ~2000ms on unfixed code
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Issue 1.13: Message Handler Memory Leak', () => {

    it('should verify setupMessageHandling() disposes old handlers before re-registering', () => {
      // BUG: Every call to setupMessageHandling() adds a new onDidReceiveMessage listener
      //       without removing the previous one, causing memory leak
      // EXPECTED TO FAIL on unfixed code: No disposal logic

      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private setupMessageHandling\(\)/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        // Check if method disposes old listeners before creating new ones
        const hasDisposal =
          methodBody.includes('.dispose()') ||
          methodBody.includes('messageHandlers.forEach') && methodBody.includes('dispose') ||
          methodBody.includes('messageDisposable') && methodBody.includes('dispose');

        // EXPECTED TO FAIL: No disposal on unfixed code
        expect(hasDisposal).toBe(true);
      }
    });

    it('should verify onMessage() returns a disposable or tracks handlers for cleanup', () => {
      // BUG: onMessage() registers handlers but provides no way to unregister them
      // EXPECTED TO FAIL on unfixed code: No disposal mechanism

      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /onMessage\(handler:/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        // A proper implementation should return a disposable or provide unregister capability
        const hasDisposalMechanism =
          methodBody.includes('Disposable') ||
          methodBody.includes('return') && methodBody.includes('dispose') ||
          methodBody.includes('delete') ||
          methodBody.includes('removeHandler');

        // EXPECTED TO FAIL: onMessage just adds to map with no cleanup mechanism
        expect(hasDisposalMechanism).toBe(true);
      }
    });

    it('should verify WebviewManager has a public dispose() method', () => {
      // BUG: No public dispose() method — external code cannot clean up resources
      // Has disposeWebview() but not the standard dispose() pattern
      // EXPECTED TO FAIL on unfixed code: No dispose() method

      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      // Look for a public dispose() method (not disposeWebview)
      const hasDisposeMethod =
        /(?:public\s+)?dispose\s*\(\s*\)\s*(?::\s*void\s*)?\{/.test(content) &&
        !content.match(/(?:public\s+)?dispose\s*\(\s*\)\s*(?::\s*void\s*)?\{/)![0].includes('disposeWebview');

      // EXPECTED TO FAIL: No dispose() method on unfixed code
      expect(hasDisposeMethod).toBe(true);
    });
  });

  describe('Issue 1.14: Glob Pattern Security — Custom Implementation Instead of Vetted Library', () => {

    it('should verify FileScanner uses minimatch or picomatch for glob matching', () => {
      // BUG: Uses custom regex-based glob matching which risks regex injection
      // Recommended fix: Use minimatch or picomatch library
      // EXPECTED TO FAIL on unfixed code: No library import

      const filePath = path.join(__dirname, '..', 'analysis', 'FileScanner.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');

      // Check top-level imports for a vetted glob library
      const lines = rawContent.split('\n').slice(0, 30);
      const hasGlobLibrary = lines.some(line =>
        line.includes("from 'minimatch'") ||
        line.includes('from "minimatch"') ||
        line.includes("from 'picomatch'") ||
        line.includes('from "picomatch"') ||
        line.includes("require('minimatch')") ||
        line.includes("require('picomatch')")
      );

      // EXPECTED TO FAIL on unfixed code: No glob library import
      expect(hasGlobLibrary).toBe(true);
    });

    it('should verify matchGlobPattern() does not use custom regex construction', () => {
      // BUG: Custom regex via `new RegExp(regexPattern)` from user-supplied pattern
      //       is prone to ReDoS and edge-case mismatches
      // EXPECTED TO FAIL on unfixed code: Uses custom regex building

      const filePath = path.join(__dirname, '..', 'analysis', 'FileScanner.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private matchGlobPattern\(/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        // A custom regex approach builds patterns with `new RegExp()` from user input
        const usesCustomRegex = methodBody.includes('new RegExp(');

        // EXPECTED TO FAIL: Uses custom RegExp construction on unfixed code
        expect(usesCustomRegex).toBe(false);
      }
    });

    it('should verify custom glob implementation handles ReDoS-prone patterns safely', () => {
      // BUG: The custom glob-to-regex can produce exponential-backtracking regexes
      // For example, deeply nested ** patterns
      // EXPECTED TO FAIL on unfixed code if using custom regex: pattern takes too long

      const filePath = path.join(__dirname, '..', 'analysis', 'FileScanner.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const methodBody = extractMethodBody(content, /private matchGlobPattern\(/);
      expect(methodBody).toBeDefined();

      if (methodBody) {
        // If still using custom regex, check that it doesn't blindly build from user input
        const usesNewRegExp = methodBody.includes('new RegExp(');
        const hasTimeoutOrSafeGuard =
          methodBody.includes('minimatch') ||
          methodBody.includes('picomatch') ||
          methodBody.includes('timeout') ||
          methodBody.includes('try') && methodBody.includes('catch');

        // Must either use a library OR have a safeguard against ReDoS
        // EXPECTED TO FAIL: Uses raw RegExp with no protection
        expect(!usesNewRegExp || hasTimeoutOrSafeGuard).toBe(true);
      }
    });
  });
});
