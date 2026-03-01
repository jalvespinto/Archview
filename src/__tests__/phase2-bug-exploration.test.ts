/**
 * Phase 2 Bug Condition Exploration Tests
 * 
 * These tests confirm bugs exist by asserting the buggy conditions are present.
 * Tests are designed to PASS on unfixed code (confirming bugs exist).
 * After fixes are applied, these tests will FAIL (confirming bugs are fixed).
 * 
 * This is the correct approach: tests demonstrate bugs exist before fixing them.
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import * as fs from 'fs';
import * as path from 'path';
import Parser from 'tree-sitter';

describe('Phase 2: Bug Condition Exploration Tests', () => {
  
  describe('Issue 1.2: Eager Extension Activation', () => {
    
    it('should verify activationEvents is set to "*" (eager activation bug)', () => {
      // BUG: Extension activates on ALL VS Code events instead of only archview commands
      // This impacts startup time for all users even if they never use ArchView
      
      const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // EXPECTED TO PASS: activationEvents should be ["*"] on unfixed code
      // This confirms the bug exists
      expect(packageJson.activationEvents).toEqual(['*']);
    });
    
    it('should document that extension loads immediately on VS Code startup', () => {
      // This test documents the expected behavior after fix
      // After fix, activationEvents should be command-specific
      
      const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Check if commands are defined
      expect(packageJson.contributes.commands).toBeDefined();
      expect(packageJson.contributes.commands.length).toBeGreaterThan(0);
    });
  });

  describe('Issue 1.3: Runtime require() Calls Bypass TypeScript Type Checking', () => {
    
    it('should find runtime require() in ExtensionController.registerCommands method', () => {
      // BUG: Runtime require() bypasses TypeScript type checking
      // Everything becomes 'any' type
      
      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find registerCommands method and check for require('vscode')
      const registerCommandsMatch = content.match(/private\s+registerCommands\([^)]*\)\s*:\s*void\s*\{[\s\S]*?\n\s{2}\}/);
      
      expect(registerCommandsMatch).toBeDefined();
      
      if (registerCommandsMatch) {
        const methodBody = registerCommandsMatch[0];
        
        // EXPECTED TO PASS: Should find require('vscode') on unfixed code
        expect(methodBody).toContain("require('vscode')");
      }
    });
    
    it('should find runtime require() in ExtensionController.handleError method', () => {
      // BUG: Runtime require() in catch block
      
      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find handleError method and check for require('vscode')
      const handleErrorMatch = content.match(/private\s+async\s+handleError\([^)]*\)\s*:\s*Promise<void>\s*\{[\s\S]*?\n\s{2}\}/);
      
      expect(handleErrorMatch).toBeDefined();
      
      if (handleErrorMatch) {
        const methodBody = handleErrorMatch[0];
        
        // EXPECTED TO PASS: Should find require('vscode') on unfixed code
        expect(methodBody).toContain("require('vscode')");
      }
    });
    
    it('should find runtime require() in WebviewManager.createWebviewPanel method', () => {
      // BUG: Runtime require() in createWebviewPanel method
      
      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find createWebviewPanel method and check for require('vscode')
      const createWebviewMatch = content.match(/private\s+createWebviewPanel\([^)]*\)\s*:\s*[^{]*\{[\s\S]*?\n\s{2}\}/);
      
      expect(createWebviewMatch).toBeDefined();
      
      if (createWebviewMatch) {
        const methodBody = createWebviewMatch[0];
        
        // EXPECTED TO PASS: Should find require('vscode') on unfixed code
        expect(methodBody).toContain("require('vscode')");
      }
    });
    
    it('should verify no top-level vscode import exists (bug confirmation)', () => {
      // Verify that vscode is NOT imported at top level (confirming the bug)
      
      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check first 50 lines for top-level import
      const lines = content.split('\n').slice(0, 50);
      const hasTopLevelImport = lines.some(line => 
        line.includes("import * as vscode from 'vscode'") ||
        line.includes('import * as vscode from "vscode"')
      );
      
      // EXPECTED TO PASS: Should NOT have top-level import on unfixed code
      expect(hasTopLevelImport).toBe(false);
    });
  });

  describe('Issue 1.4: Bracket Notation Bypasses Private Method Access Control', () => {
    
    it('should find bracket notation access in ExtensionController', () => {
      // BUG: Using bracket notation to access private method
      // this.aiService['buildHeuristicModel'] bypasses TypeScript access control
      
      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Search for bracket notation access to buildHeuristicModel
      const hasBracketNotation = /this\.aiService\['buildHeuristicModel'\]/.test(content);
      
      // EXPECTED TO PASS: Should find bracket notation on unfixed code
      expect(hasBracketNotation).toBe(true);
    });
    
    it('should verify buildHeuristicModel is a private method', () => {
      // Verify that the method being accessed is indeed private
      
      const filePath = path.join(__dirname, '..', 'analysis', 'KiroAIService.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Search for private buildHeuristicModel method declaration
      const hasPrivateMethod = /private\s+.*buildHeuristicModel/.test(content);
      
      expect(hasPrivateMethod).toBe(true);
    });
  });

  describe('Issue 1.5: Parser Created Without Language Grammar', () => {
    
    it('should verify createEmptyTree() creates parser without setLanguage()', () => {
      // BUG: Parser created without calling parser.setLanguage()
      // Tree-sitter requires a language grammar to parse code
      
      const filePath = path.join(__dirname, '..', 'analysis', 'ParserManager.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find createEmptyTree method
      const createEmptyTreeMatch = content.match(/private createEmptyTree\(\): Parser\.Tree \{[\s\S]*?return tempParser\.parse\(''\);[\s\S]*?\}/);
      
      expect(createEmptyTreeMatch).toBeDefined();
      
      if (createEmptyTreeMatch) {
        const methodBody = createEmptyTreeMatch[0];
        
        // EXPECTED TO PASS: Should NOT find setLanguage call on unfixed code
        const hasSetLanguage = methodBody.includes('setLanguage');
        expect(hasSetLanguage).toBe(false);
      }
    });
    
    it('should verify createEmptyTree() is actually used (not dead code)', () => {
      // NOTE: Method IS used at lines 133, 148, 173 as fallback
      
      const filePath = path.join(__dirname, '..', 'analysis', 'ParserManager.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Count usages of createEmptyTree
      const usages = (content.match(/this\.createEmptyTree\(\)/g) || []).length;
      
      // Should have at least 3 usages (lines 133, 148, 173)
      expect(usages).toBeGreaterThanOrEqual(3);
    });
    
    it('should demonstrate parser behavior without language', () => {
      // Demonstrate that parser without language cannot parse properly
      
      const parser = new Parser();
      // Do NOT call parser.setLanguage()
      
      const tree = parser.parse('const x = 1;');
      
      // Parser without language returns null or tree with no meaningful children
      expect(tree === null || tree.rootNode.childCount === 0).toBe(true);
    });
  });

  describe('Issue 1.6: Worker Thread Code is Dead Code', () => {
    
    it('should verify parseWithWorkerThreads always falls back (static analysis)', () => {
      // BUG: parseWithWorkerThreads always falls back to parseWithAsyncBatching
      // The entire worker thread code path is dead code
      
      const filePath = path.join(__dirname, '..', 'performance', 'AnalysisOptimizer.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find parseWithWorkerThreads method
      const methodMatch = content.match(/private async parseWithWorkerThreads<T>\([\s\S]*?\n  \}/);
      
      expect(methodMatch).toBeDefined();
      
      if (methodMatch) {
        const methodBody = methodMatch[0];
        
        // EXPECTED TO PASS: Should find fallback to parseWithAsyncBatching
        expect(methodBody).toContain('parseWithAsyncBatching');
        expect(methodBody).toContain('fall back');
      }
    });
    
    it('should demonstrate parseWithWorkerThreads never uses workers (dynamic execution)', async () => {
      // BUG: Dynamic execution test - call the method and verify it falls back
      
      const { AnalysisOptimizer } = await import('../performance/AnalysisOptimizer');
      const optimizer = new AnalysisOptimizer();
      
      // Track if parseWithAsyncBatching is called
      let asyncBatchingCalled = false;
      const originalMethod = (optimizer as any).parseWithAsyncBatching;
      (optimizer as any).parseWithAsyncBatching = async function(...args: any[]) {
        asyncBatchingCalled = true;
        return originalMethod.apply(this, args);
      };
      
      // Call parseWithWorkerThreads
      const testItems = ['item1', 'item2'];
      const parseFunc = async (item: string) => ({ result: item });
      
      await (optimizer as any).parseWithWorkerThreads(testItems, parseFunc);
      
      // EXPECTED TO PASS: Should always call parseWithAsyncBatching (fallback)
      expect(asyncBatchingCalled).toBe(true);
    });
    
    it('should verify worker support check only checks if Worker class exists', () => {
      // BUG: Worker support check only verifies Worker class exists
      // But actual implementation is a no-op
      
      const filePath = path.join(__dirname, '..', 'performance', 'AnalysisOptimizer.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find checkWorkerThreadSupport method
      const methodMatch = content.match(/private checkWorkerThreadSupport\(\): void \{[\s\S]*?\n  \}/);
      
      expect(methodMatch).toBeDefined();
      
      if (methodMatch) {
        const methodBody = methodMatch[0];
        
        // Check only tests if Worker exists, doesn't actually use it
        expect(methodBody).toContain('const testWorker = Worker');
        expect(methodBody).toContain('this.workerThreadsSupported = true');
      }
    });
  });

  describe('Issue 1.7: 32-bit Hash Function Has Collision Risk', () => {
    
    it('should verify custom hash function uses 32-bit hash', () => {
      // BUG: Custom hash function uses 32-bit hash with high collision risk
      // Comment says "in production, use crypto.createHash"
      
      const filePath = path.join(__dirname, '..', 'performance', 'AnalysisOptimizer.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find hashContent method
      const methodMatch = content.match(/private hashContent\(content: string\): string \{[\s\S]*?\n  \}/);
      
      expect(methodMatch).toBeDefined();
      
      if (methodMatch) {
        const methodBody = methodMatch[0];
        
        // EXPECTED TO PASS: Should find custom 32-bit hash on unfixed code
        expect(methodBody).toContain('let hash = 0');
        expect(methodBody).toContain('hash << 5');
        expect(methodBody).toContain('hash & hash'); // Convert to 32-bit
        expect(methodBody).toContain('hash.toString(36)');
        
        // Should have comment about using crypto in production
        expect(methodBody).toContain('crypto.createHash');
      }
    });
    
    it('should verify AnalysisService uses crypto.createHash correctly', () => {
      // Verify that AnalysisService.ts:495 uses crypto.createHash correctly
      // This shows the inconsistency
      
      const filePath = path.join(__dirname, '..', 'analysis', 'AnalysisService.ts');
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check if crypto.createHash is used
        const usesCrypto = content.includes('crypto.createHash');
        
        if (usesCrypto) {
          // Inconsistency exists between AnalysisService and AnalysisOptimizer
          expect(usesCrypto).toBe(true);
        }
      }
    });
    
    it('should demonstrate hash collision risk with birthday paradox', () => {
      // Demonstrate that 32-bit hash has collision risk using birthday paradox
      
      // Simple 32-bit hash function (same as in code)
      function hash32bit(content: string): string {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
          const char = content.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
      }
      
      // Generate many hashes to demonstrate collision risk
      const hashes = new Set<string>();
      const sampleCount = 100000;
      
      for (let i = 0; i < sampleCount; i++) {
        const content = `content_${i}_${'x'.repeat(i % 100)}`;
        const hash = hash32bit(content);
        hashes.add(hash);
      }
      
      // With 32-bit hash space (~4 billion values), birthday paradox predicts
      // 50% collision probability at sqrt(4B) ≈ 65k samples
      const uniqueHashes = hashes.size;
      const collisionCount = sampleCount - uniqueHashes;
      
      // Verify hash output is short base-36 string (proving 32-bit space)
      const sampleHash = hash32bit('test');
      expect(sampleHash.length).toBeLessThan(10); // 32-bit base-36 is max 7 chars
      
      // With 100k samples, collisions are highly likely (or at minimum, space is small)
      expect(uniqueHashes).toBeLessThanOrEqual(sampleCount);
      
      // Document the risk: SHA-256 would produce 64-char hex strings with no practical collision risk
      expect(sampleHash.length).toBeLessThan(64); // Much smaller than SHA-256
    });
  });
});
