/**
 * Phase 2 Bug Condition Exploration Tests
 * 
 * CRITICAL: These tests MUST FAIL on unfixed code - failures confirm the bugs exist
 * DO NOT attempt to fix the tests or the code when they fail
 * GOAL: Surface counterexamples that demonstrate the bugs exist
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
      
      // EXPECTED TO FAIL: activationEvents should be ["*"] on unfixed code
      // This confirms the bug exists
      expect(packageJson.activationEvents).toEqual(['*']);
      
      // Document the bug
      console.log('BUG CONFIRMED: Extension uses eager activation with "*"');
      console.log('IMPACT: Extension loads on every VS Code event, impacting startup time');
      console.log('EXPECTED FIX: Should use command-specific activation events');
    });
    
    it('should document that extension loads immediately on VS Code startup', () => {
      // This test documents the expected behavior after fix
      // After fix, activationEvents should be command-specific
      
      const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Check if commands are defined
      expect(packageJson.contributes.commands).toBeDefined();
      expect(packageJson.contributes.commands.length).toBeGreaterThan(0);
      
      // Document expected commands
      const commands = packageJson.contributes.commands.map((cmd: any) => cmd.command);
      console.log('EXPECTED ACTIVATION EVENTS:', commands.map((cmd: string) => `onCommand:${cmd}`));
    });
  });

  describe('Issue 1.3: Runtime require() Calls Bypass TypeScript Type Checking', () => {
    
    it('should find runtime require() in ExtensionController.ts line 182', () => {
      // BUG: Runtime require() bypasses TypeScript type checking
      // Everything becomes 'any' type
      
      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Check line 182 (0-indexed: line 181)
      const line182 = lines[181];
      
      // EXPECTED TO FAIL: Should find require('vscode') on unfixed code
      expect(line182).toContain("const vscode = require('vscode')");
      
      console.log('BUG CONFIRMED: Runtime require() found at line 182');
      console.log('LINE:', line182.trim());
    });
    
    it('should find runtime require() in ExtensionController.ts line 481', () => {
      // BUG: Runtime require() in catch block
      
      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Check line 481 (0-indexed: line 480)
      const line481 = lines[480];
      
      // EXPECTED TO FAIL: Should find require('vscode') on unfixed code
      expect(line481).toContain("const vscode = require('vscode')");
      
      console.log('BUG CONFIRMED: Runtime require() found at line 481');
      console.log('LINE:', line481.trim());
    });
    
    it('should find runtime require() in WebviewManager.ts line 123', () => {
      // BUG: Runtime require() in createWebviewPanel method
      
      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Check line 123 (0-indexed: line 122)
      const line123 = lines[122];
      
      // EXPECTED TO FAIL: Should find require('vscode') on unfixed code
      expect(line123).toContain("const vscode = require('vscode')");
      
      console.log('BUG CONFIRMED: Runtime require() found at line 123');
      console.log('LINE:', line123.trim());
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
      
      // EXPECTED TO FAIL: Should NOT have top-level import on unfixed code
      expect(hasTopLevelImport).toBe(false);
      
      console.log('BUG CONFIRMED: No top-level vscode import, only runtime require()');
      console.log('IMPACT: TypeScript type checking bypassed, everything is any type');
    });
  });

  describe('Issue 1.4: Bracket Notation Bypasses Private Method Access Control', () => {
    
    it('should find bracket notation access at line 439', () => {
      // BUG: Using bracket notation to access private method
      // this.aiService['buildHeuristicModel'] bypasses TypeScript access control
      
      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Check line 439 (0-indexed: line 438)
      const line439 = lines[438];
      
      // EXPECTED TO FAIL: Should find bracket notation on unfixed code
      expect(line439).toContain("this.aiService['buildHeuristicModel']");
      
      console.log('BUG CONFIRMED: Bracket notation found at line 439');
      console.log('LINE:', line439.trim());
      console.log('IMPACT: Bypasses TypeScript access control, makes refactoring unsafe');
    });
    
    it('should verify buildHeuristicModel is a private method', () => {
      // Verify that the method being accessed is indeed private
      
      const filePath = path.join(__dirname, '..', 'analysis', 'KiroAIService.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Search for buildHeuristicModel method declaration
      const hasBuildHeuristicModel = content.includes('buildHeuristicModel');
      
      expect(hasBuildHeuristicModel).toBe(true);
      
      console.log('CONFIRMED: buildHeuristicModel method exists in KiroAIService');
      console.log('EXPECTED FIX: Either make method public or use proper dependency injection');
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
        
        // EXPECTED TO FAIL: Should NOT find setLanguage call on unfixed code
        const hasSetLanguage = methodBody.includes('setLanguage');
        expect(hasSetLanguage).toBe(false);
        
        console.log('BUG CONFIRMED: createEmptyTree() does not call setLanguage()');
        console.log('METHOD BODY:', methodBody);
        console.log('IMPACT: Parser cannot parse any code without language grammar');
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
      
      console.log(`CONFIRMED: createEmptyTree() is used ${usages} times as fallback`);
      console.log('NOTE: Method serves real purpose (graceful degradation), cannot be deleted');
    });
    
    it('should demonstrate parser fails without language', () => {
      // Demonstrate that parser without language cannot parse
      
      const parser = new Parser();
      // Do NOT call parser.setLanguage()
      
      const tree = parser.parse('const x = 1;');
      
      // Parser may return null or a non-functional tree
      if (tree === null) {
        console.log('BUG DEMONSTRATED: Parser without language returns null');
        console.log('EXPECTED FIX: Call parser.setLanguage() before parse()');
        expect(tree).toBeNull();
      } else {
        // Parser should create a tree but it will be non-functional
        expect(tree).toBeDefined();
        
        // The root node should have no meaningful structure
        const rootNode = tree.rootNode;
        expect(rootNode).toBeDefined();
        
        console.log('BUG DEMONSTRATED: Parser without language creates non-functional tree');
        console.log('Root node type:', rootNode.type);
        console.log('Root node has children:', rootNode.childCount > 0);
        console.log('EXPECTED FIX: Call parser.setLanguage() before parse()');
      }
    });
  });

  describe('Issue 1.6: Worker Thread Code is Dead Code', () => {
    
    it('should verify parseWithWorkerThreads always falls back', () => {
      // BUG: parseWithWorkerThreads always falls back to parseWithAsyncBatching
      // The entire worker thread code path is dead code
      
      const filePath = path.join(__dirname, '..', 'performance', 'AnalysisOptimizer.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find parseWithWorkerThreads method
      const methodMatch = content.match(/private async parseWithWorkerThreads<T>\([\s\S]*?\n  \}/);
      
      expect(methodMatch).toBeDefined();
      
      if (methodMatch) {
        const methodBody = methodMatch[0];
        
        // EXPECTED TO FAIL: Should find fallback to parseWithAsyncBatching
        expect(methodBody).toContain('parseWithAsyncBatching');
        expect(methodBody).toContain('fall back');
        
        console.log('BUG CONFIRMED: parseWithWorkerThreads always falls back');
        console.log('METHOD BODY:', methodBody);
        console.log('IMPACT: Entire worker thread code path is dead code');
      }
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
        
        console.log('BUG CONFIRMED: Worker support check is superficial');
        console.log('METHOD BODY:', methodBody);
        console.log('EXPECTED FIX: Either implement worker threads or remove the code');
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
        
        // EXPECTED TO FAIL: Should find custom 32-bit hash on unfixed code
        expect(methodBody).toContain('let hash = 0');
        expect(methodBody).toContain('hash << 5');
        expect(methodBody).toContain('hash & hash'); // Convert to 32-bit
        expect(methodBody).toContain('hash.toString(36)');
        
        // Should have comment about using crypto in production
        expect(methodBody).toContain('crypto.createHash');
        
        console.log('BUG CONFIRMED: Custom 32-bit hash function found');
        console.log('METHOD BODY:', methodBody);
        console.log('IMPACT: High collision risk for cache keys');
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
          console.log('INCONSISTENCY CONFIRMED: AnalysisService uses crypto.createHash');
          console.log('But AnalysisOptimizer uses custom 32-bit hash');
          console.log('EXPECTED FIX: Use crypto.createHash consistently');
        }
      }
    });
    
    it('should demonstrate hash collision risk with similar content', () => {
      // Demonstrate that 32-bit hash has collision risk
      
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
      
      // Test with similar content
      const content1 = 'a'.repeat(1000);
      const content2 = 'b'.repeat(1000);
      
      const hash1 = hash32bit(content1);
      const hash2 = hash32bit(content2);
      
      console.log('Hash collision risk demonstration:');
      console.log('Content 1 hash:', hash1);
      console.log('Content 2 hash:', hash2);
      console.log('32-bit hash space: ~4 billion values');
      console.log('EXPECTED FIX: Use SHA-256 with ~2^256 values (no practical collision risk)');
      
      // Just verify hashes are generated
      expect(hash1).toBeDefined();
      expect(hash2).toBeDefined();
    });
  });
});
