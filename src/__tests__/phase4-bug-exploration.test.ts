/**
 * Phase 4 Bug Condition Exploration Tests
 *
 * CRITICAL: These tests are designed to FAIL on UNFIXED code to prove bugs exist.
 * When tests FAIL, it confirms the bugs are present (this is the expected outcome).
 * After fixes are implemented, these same tests should PASS.
 *
 * Requirements: 2.15, 2.16, 2.17, 2.20
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
 * Recursively find all TypeScript and JavaScript files under a directory,
 * excluding test files and node_modules.
 */
function findProductionFiles(dir: string, extensions: string[] = ['.ts', '.js']): string[] {
  const results: string[] = [];
  
  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip test directories and node_modules
        if (entry.name === '__tests__' || entry.name === '__mocks__' || entry.name === 'node_modules') {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        // Skip test files
        if (extensions.includes(ext) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
          results.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return results;
}

describe('Phase 4: Bug Condition Exploration Tests', () => {

  describe('Issue 1.15: Debug Statements in Production Code', () => {

    it('should verify ExtensionController.ts has no console.log statements', () => {
      // BUG: ExtensionController.ts contains 35+ debug console.log statements
      // EXPECTED TO FAIL on unfixed code: Many console.log statements found

      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      // Count console.log occurrences
      const consoleLogMatches = content.match(/console\.log\(/g);
      const count = consoleLogMatches ? consoleLogMatches.length : 0;

      // EXPECTED TO FAIL: ~35 console.log statements on unfixed code
      expect(count).toBe(0);
    });

    it('should verify all production TypeScript files have no console.log statements', () => {
      // BUG: Multiple production files contain console.log statements:
      // ExtensionController.ts (35), webview.js (20), WebviewMessageHandler.ts (9),
      // spike/kiro-ai-poc.ts (5), extension.ts (4), WebviewManager.ts (4),
      // KiroAIService.ts (3), FileHighlighter.ts (2), AnalysisOptimizer.ts (1)
      // EXPECTED TO FAIL on unfixed code: 83+ console.log statements across 9 files

      const srcDir = path.join(__dirname, '..');
      const productionFiles = findProductionFiles(srcDir, ['.ts']);
      
      const filesWithConsoleLogs: Array<{ file: string; count: number }> = [];
      
      for (const filePath of productionFiles) {
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const content = stripComments(rawContent);
        
        const consoleLogMatches = content.match(/console\.log\(/g);
        const count = consoleLogMatches ? consoleLogMatches.length : 0;
        
        if (count > 0) {
          const relativePath = path.relative(path.join(__dirname, '..'), filePath);
          filesWithConsoleLogs.push({ file: relativePath, count });
        }
      }

      // EXPECTED TO FAIL: Multiple files with console.log statements
      expect(filesWithConsoleLogs).toEqual([]);
    });

    it('should verify webview.js has no console.log statements', () => {
      // BUG: webview.js contains ~20 console.log statements
      // EXPECTED TO FAIL on unfixed code: Many console.log statements found

      const filePath = path.join(__dirname, '..', 'ui', 'webview', 'webview.js');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const consoleLogMatches = content.match(/console\.log\(/g);
      const count = consoleLogMatches ? consoleLogMatches.length : 0;

      // EXPECTED TO FAIL: ~20 console.log statements on unfixed code
      expect(count).toBe(0);
    });

    it('should verify test command is implemented or removed', () => {
      // BUG: Test command at lines 186-192 only shows "ArchView test command works!"
      //      instead of running actual tests
      // EXPECTED TO FAIL on unfixed code: Test command is a stub

      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      // Look for the test command registration
      const hasTestCommand = content.includes('archview.test');
      
      if (hasTestCommand) {
        // If test command exists, it should either:
        // 1. Run actual tests (contains 'npm test' or similar)
        // 2. Be removed entirely
        const testCommandStub = content.includes('ArchView test command works!');
        
        // EXPECTED TO FAIL: Test command is a stub showing placeholder message
        expect(testCommandStub).toBe(false);
      }
    });
  });

  describe('Issue 1.16: Troubleshooting Files in Repository Root', () => {

    it('should verify repository root has no troubleshooting markdown files', () => {
      // BUG: 11 troubleshooting .md files clutter the repository root:
      // COMMANDS_FIXED.md, DEBUG_LOGGING_ADDED.md, FIX_APPLIED.md, HOW_TO_TEST.md,
      // QUICK_FIX.md, TEST_COMMAND_REGISTRATION.md, TESTING_GUIDE.md, TEST_ON_THIS_REPO.md,
      // TROUBLESHOOTING_COMMAND_NOT_FOUND.md, WEBVIEW_FIX_SUMMARY.md, WEBVIEW_ISSUE_REPORT.md
      // EXPECTED TO FAIL on unfixed code: 11 troubleshooting files found

      const repoRoot = path.join(__dirname, '..', '..');
      const entries = fs.readdirSync(repoRoot);
      
      // Legitimate docs that should remain
      const legitimateDocs = [
        'README.md',
        'CHANGELOG.md',
        'CONTRIBUTING.md',
        'LICENSE'
      ];
      
      // Find all .md files that are not legitimate
      const troubleshootingFiles = entries.filter(entry => {
        if (!entry.endsWith('.md')) return false;
        if (legitimateDocs.includes(entry)) return false;
        
        const fullPath = path.join(repoRoot, entry);
        const stat = fs.statSync(fullPath);
        return stat.isFile();
      });

      // EXPECTED TO FAIL: 11 troubleshooting .md files on unfixed code
      expect(troubleshootingFiles).toEqual([]);
    });

    it('should verify repository root has no debug text files', () => {
      // BUG: test-output.txt exists in repository root
      // EXPECTED TO FAIL on unfixed code: test-output.txt found

      const repoRoot = path.join(__dirname, '..', '..');
      const entries = fs.readdirSync(repoRoot);
      
      // Find debug .txt files
      const debugTextFiles = entries.filter(entry => {
        if (!entry.endsWith('.txt')) return false;
        
        const fullPath = path.join(repoRoot, entry);
        const stat = fs.statSync(fullPath);
        return stat.isFile();
      });

      // EXPECTED TO FAIL: test-output.txt on unfixed code
      expect(debugTextFiles).toEqual([]);
    });

    it('should document all troubleshooting artifacts found', () => {
      // This test documents what needs to be cleaned up
      // EXPECTED TO FAIL on unfixed code: Lists all 12 files to remove

      const repoRoot = path.join(__dirname, '..', '..');
      const entries = fs.readdirSync(repoRoot);
      
      const legitimateDocs = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE'];
      
      const artifactsToRemove = entries.filter(entry => {
        const fullPath = path.join(repoRoot, entry);
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) return false;
        
        // Troubleshooting .md files
        if (entry.endsWith('.md') && !legitimateDocs.includes(entry)) return true;
        
        // Debug .txt files
        if (entry.endsWith('.txt')) return true;
        
        return false;
      });

      // EXPECTED TO FAIL: 12 artifacts (11 .md + 1 .txt) on unfixed code
      expect(artifactsToRemove.length).toBe(0);
    });
  });

  describe('Issue 1.17: Explicit Any Types Bypass Type Safety', () => {

    it('should verify WebviewManager.ts has no explicit any types', () => {
      // BUG: WebviewManager.ts has 3 explicit any types:
      // - panel property (line 14): private panel: any
      // - return types (lines 23, 142): methods return any
      // EXPECTED TO FAIL on unfixed code: 3 any types found

      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      // Match explicit any type patterns
      const anyPatterns = [
        /:\s*any\b/g,           // : any
        /as\s+any\b/g,          // as any
        /any\[\]/g,             // any[]
        /<any>/g,               // <any>
        /\(\s*\.\.\.\s*args\s*:\s*any/g  // (...args: any
      ];

      let totalMatches = 0;
      for (const pattern of anyPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          totalMatches += matches.length;
        }
      }

      // EXPECTED TO FAIL: 3 any types on unfixed code
      expect(totalMatches).toBe(0);
    });

    it('should verify FileHighlighter.ts has no explicit any types', () => {
      // BUG: FileHighlighter.ts has 2 explicit any types:
      // - decorationProvider (line 19): private decorationProvider: any
      // - kiroAPI (line 20): private kiroAPI: any
      // EXPECTED TO FAIL on unfixed code: 2 any types found

      const filePath = path.join(__dirname, '..', 'ui', 'FileHighlighter.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const anyPatterns = [
        /:\s*any\b/g,
        /as\s+any\b/g,
        /any\[\]/g,
        /<any>/g,
        /\(\s*\.\.\.\s*args\s*:\s*any/g
      ];

      let totalMatches = 0;
      for (const pattern of anyPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          totalMatches += matches.length;
        }
      }

      // EXPECTED TO FAIL: 2 any types on unfixed code
      expect(totalMatches).toBe(0);
    });

    it('should verify ExtensionController.ts has no explicit any types', () => {
      // BUG: ExtensionController.ts has 5 explicit any types:
      // - Memento interface (line 38): get/update methods use any
      // - subscriptions (line 42): private subscriptions: any[]
      // - Command callback (line 49): (...args: any[]) => any
      // - type assertions (lines 325, 391): as any
      // EXPECTED TO FAIL on unfixed code: 5 any types found

      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const anyPatterns = [
        /:\s*any\b/g,
        /as\s+any\b/g,
        /any\[\]/g,
        /<any>/g,
        /\(\s*\.\.\.\s*args\s*:\s*any/g
      ];

      let totalMatches = 0;
      for (const pattern of anyPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          totalMatches += matches.length;
        }
      }

      // EXPECTED TO FAIL: 5 any types on unfixed code
      expect(totalMatches).toBe(0);
    });

    it('should verify FileWatcher.ts has proper types (not any)', () => {
      // NOTE: Task description mentions FileWatcher.ts but it actually has no any types
      // This test verifies that FileWatcher.ts is clean (should pass even on unfixed code)

      const filePath = path.join(__dirname, '..', 'analysis', 'FileWatcher.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');
      const content = stripComments(rawContent);

      const anyPatterns = [
        /:\s*any\b/g,
        /as\s+any\b/g,
        /any\[\]/g,
        /<any>/g,
        /\(\s*\.\.\.\s*args\s*:\s*any/g
      ];

      let totalMatches = 0;
      for (const pattern of anyPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          totalMatches += matches.length;
        }
      }

      // Should pass: FileWatcher.ts has no any types
      expect(totalMatches).toBe(0);
    });

    it('should document all files with explicit any types', () => {
      // This test documents which files need type fixes
      // EXPECTED TO FAIL on unfixed code: Lists 3 files with 10 total any types

      const targetFiles = [
        { path: path.join(__dirname, '..', 'ui', 'WebviewManager.ts'), name: 'WebviewManager.ts' },
        { path: path.join(__dirname, '..', 'ui', 'FileHighlighter.ts'), name: 'FileHighlighter.ts' },
        { path: path.join(__dirname, '..', 'ExtensionController.ts'), name: 'ExtensionController.ts' }
      ];

      const filesWithAny: Array<{ file: string; count: number }> = [];

      const anyPatterns = [
        /:\s*any\b/g,
        /as\s+any\b/g,
        /any\[\]/g,
        /<any>/g,
        /\(\s*\.\.\.\s*args\s*:\s*any/g
      ];

      for (const { path: filePath, name } of targetFiles) {
        const rawContent = fs.readFileSync(filePath, 'utf-8');
        const content = stripComments(rawContent);

        let totalMatches = 0;
        for (const pattern of anyPatterns) {
          const matches = content.match(pattern);
          if (matches) {
            totalMatches += matches.length;
          }
        }

        if (totalMatches > 0) {
          filesWithAny.push({ file: name, count: totalMatches });
        }
      }

      // EXPECTED TO FAIL: 3 files with any types on unfixed code
      expect(filesWithAny).toEqual([]);
    });
  });

  describe('Issue 1.20: Unsafe CSP in Webview HTML', () => {

    it('should verify WebviewManager generates nonce-based CSP', () => {
      // BUG: CSP uses unsafe-inline for scripts and styles
      // Current: default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'
      // Expected: script-src 'nonce-{random}'; style-src 'nonce-{random}'
      // EXPECTED TO FAIL on unfixed code: Uses unsafe-inline

      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');

      // Check if CSP uses unsafe-inline
      const hasUnsafeInline = rawContent.includes("'unsafe-inline'");

      // EXPECTED TO FAIL: Uses unsafe-inline on unfixed code
      expect(hasUnsafeInline).toBe(false);
    });

    it('should verify WebviewManager generates random nonces', () => {
      // BUG: No nonce generation exists in WebviewManager
      // Expected: crypto.randomBytes(16).toString('base64') or similar
      // EXPECTED TO FAIL on unfixed code: No nonce generation

      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');

      // Check for nonce generation patterns
      const hasNonceGeneration =
        rawContent.includes('randomBytes') ||
        rawContent.includes('crypto.random') ||
        rawContent.includes('nonce') && rawContent.includes('random');

      // EXPECTED TO FAIL: No nonce generation on unfixed code
      expect(hasNonceGeneration).toBe(true);
    });

    it('should verify CSP meta tag uses nonce-based directives', () => {
      // BUG: CSP meta tag at line 207 uses unsafe-inline
      // Expected format: script-src 'nonce-{nonce}'; style-src 'nonce-{nonce}'
      // EXPECTED TO FAIL on unfixed code: No nonce in CSP

      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');

      // Extract CSP meta tag content
      const cspMatch = rawContent.match(/content="([^"]*Content-Security-Policy[^"]*)"/);
      
      if (cspMatch) {
        const cspContent = cspMatch[1];
        
        // Check if CSP uses nonce-based directives
        const hasNonceDirective =
          cspContent.includes("'nonce-") ||
          cspContent.includes('nonce-${');

        // EXPECTED TO FAIL: No nonce directive on unfixed code
        expect(hasNonceDirective).toBe(true);
      } else {
        // If no CSP found, that's also a failure
        expect(cspMatch).toBeDefined();
      }
    });

    it('should verify style and script tags have nonce attributes', () => {
      // BUG: <style> tag (line 209) and <script> tag (line 246) have no nonce attributes
      // Expected: <style nonce="${nonce}"> and <script nonce="${nonce}">
      // EXPECTED TO FAIL on unfixed code: No nonce attributes

      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');

      // Check for nonce attributes in style and script tags
      const hasStyleNonce = /<style[^>]*nonce=/.test(rawContent);
      const hasScriptNonce = /<script[^>]*nonce=/.test(rawContent);

      // EXPECTED TO FAIL: No nonce attributes on unfixed code
      expect(hasStyleNonce).toBe(true);
      expect(hasScriptNonce).toBe(true);
    });

    it('should verify getWebviewContent method implements secure CSP', () => {
      // BUG: getWebviewContent() (lines 199-251) generates HTML with unsafe CSP
      // Expected: Method should generate nonce, use it in CSP and tags
      // EXPECTED TO FAIL on unfixed code: Insecure implementation

      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const rawContent = fs.readFileSync(filePath, 'utf-8');

      // Find getWebviewContent method
      const methodMatch = rawContent.match(/private getWebviewContent\([^)]*\)[^{]*\{[\s\S]*?\n  \}/);
      
      if (methodMatch) {
        const methodBody = methodMatch[0];
        
        // Check for secure CSP implementation
        const hasNonceGeneration = methodBody.includes('randomBytes') || methodBody.includes('nonce');
        const hasNonceInCSP = methodBody.includes("'nonce-") || methodBody.includes('nonce-${');
        const noUnsafeInline = !methodBody.includes("'unsafe-inline'");

        const isSecure = hasNonceGeneration && hasNonceInCSP && noUnsafeInline;

        // EXPECTED TO FAIL: Insecure implementation on unfixed code
        expect(isSecure).toBe(true);
      } else {
        // If method not found, that's also a failure
        expect(methodMatch).toBeDefined();
      }
    });
  });
});
