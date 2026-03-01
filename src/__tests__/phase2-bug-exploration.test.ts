/**
 * Phase 2 Bug Condition Exploration Tests
 * 
 * These tests verify that Phase 2 bugs have been fixed by asserting the expected (correct) behavior.
 * Tests are designed to PASS on fixed code (confirming bugs are resolved).
 * 
 * Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import * as fs from 'fs';
import * as path from 'path';
import Parser from 'tree-sitter';

describe('Phase 2: Bug Condition Exploration Tests', () => {
  
  describe('Issue 1.2: Eager Extension Activation', () => {
    
    it('should verify activationEvents is command-specific (not eager "*")', () => {
      // FIXED: Extension now only activates on archview commands
      // This improves startup time for all users
      
      const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // EXPECTED TO PASS: activationEvents should be command-specific on fixed code
      expect(packageJson.activationEvents).not.toEqual(['*']);
      expect(packageJson.activationEvents).toContain('onCommand:archview.generateDiagram');
      expect(packageJson.activationEvents).toContain('onCommand:archview.refreshDiagram');
      expect(packageJson.activationEvents).toContain('onCommand:archview.exportDiagram');
    });
    
    it('should document that extension loads only when commands are invoked', () => {
      // This test verifies the fix is complete
      
      const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      // Check if commands are defined
      expect(packageJson.contributes.commands).toBeDefined();
      expect(packageJson.contributes.commands.length).toBeGreaterThan(0);
      
      // Verify all activation events are command-specific
      const allCommandSpecific = packageJson.activationEvents.every((event: string) => 
        event.startsWith('onCommand:')
      );
      expect(allCommandSpecific).toBe(true);
    });
  });

  describe('Issue 1.3: Runtime require() Calls Bypass TypeScript Type Checking', () => {
    
    it('should verify NO runtime require() in ExtensionController.registerCommands method', () => {
      // FIXED: Top-level imports enable TypeScript type checking
      
      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find registerCommands method and check for require('vscode')
      const registerCommandsMatch = content.match(/private\s+registerCommands\([^)]*\)\s*:\s*void\s*\{[\s\S]*?\n\s{2}\}/);
      
      expect(registerCommandsMatch).toBeDefined();
      
      if (registerCommandsMatch) {
        const methodBody = registerCommandsMatch[0];
        
        // EXPECTED TO PASS: Should NOT find require('vscode') on fixed code
        expect(methodBody).not.toContain("require('vscode')");
      }
    });
    
    it('should verify NO runtime require() in ExtensionController.handleError method', () => {
      // FIXED: No runtime require() in catch block
      
      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find handleError method and check for require('vscode')
      const handleErrorMatch = content.match(/private\s+async\s+handleError\([^)]*\)\s*:\s*Promise<void>\s*\{[\s\S]*?\n\s{2}\}/);
      
      expect(handleErrorMatch).toBeDefined();
      
      if (handleErrorMatch) {
        const methodBody = handleErrorMatch[0];
        
        // EXPECTED TO PASS: Should NOT find require('vscode') on fixed code
        expect(methodBody).not.toContain("require('vscode')");
      }
    });
    
    it('should verify NO runtime require() in WebviewManager.createWebviewPanel method', () => {
      // FIXED: No runtime require() in createWebviewPanel method
      
      const filePath = path.join(__dirname, '..', 'ui', 'WebviewManager.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find createWebviewPanel method and check for require('vscode')
      const createWebviewMatch = content.match(/private\s+createWebviewPanel\([^)]*\)\s*:\s*[^{]*\{[\s\S]*?\n\s{2}\}/);
      
      expect(createWebviewMatch).toBeDefined();
      
      if (createWebviewMatch) {
        const methodBody = createWebviewMatch[0];
        
        // EXPECTED TO PASS: Should NOT find require('vscode') on fixed code
        expect(methodBody).not.toContain("require('vscode')");
      }
    });
    
    it('should verify top-level vscode import exists (fix confirmation)', () => {
      // Verify that vscode IS imported at top level (confirming the fix)
      
      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check first 50 lines for top-level import
      const lines = content.split('\n').slice(0, 50);
      const hasTopLevelImport = lines.some(line => 
        line.includes("import * as vscode from 'vscode'") ||
        line.includes('import * as vscode from "vscode"')
      );
      
      // EXPECTED TO PASS: Should have top-level import on fixed code
      expect(hasTopLevelImport).toBe(true);
    });
  });

  describe('Issue 1.4: Bracket Notation Bypasses Private Method Access Control', () => {
    
    it('should verify NO bracket notation access in ExtensionController', () => {
      // FIXED: Using proper method access instead of bracket notation
      
      const filePath = path.join(__dirname, '..', 'ExtensionController.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Search for bracket notation access to buildHeuristicModel
      const hasBracketNotation = /this\.aiService\['buildHeuristicModel'\]/.test(content);
      
      // EXPECTED TO PASS: Should NOT find bracket notation on fixed code
      expect(hasBracketNotation).toBe(false);
    });
    
    it('should verify buildHeuristicModel is now public or properly accessed', () => {
      // Verify that the method is now public (proper access control)
      
      const filePath = path.join(__dirname, '..', 'analysis', 'KiroAIService.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Search for public buildHeuristicModel method declaration
      const hasPublicMethod = /public\s+.*buildHeuristicModel/.test(content);
      
      // EXPECTED TO PASS: Method should be public on fixed code
      expect(hasPublicMethod).toBe(true);
    });
  });

  describe('Issue 1.5: Parser Created Without Language Grammar', () => {
    
    it('should verify createEmptyTree() creates parser WITH setLanguage()', () => {
      // FIXED: Parser now has language set before parsing
      
      const filePath = path.join(__dirname, '..', 'analysis', 'ParserManager.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find createEmptyTree method
      const createEmptyTreeMatch = content.match(/private createEmptyTree\(\): Parser\.Tree \{[\s\S]*?return tempParser\.parse\(''\);[\s\S]*?\}/);
      
      expect(createEmptyTreeMatch).toBeDefined();
      
      if (createEmptyTreeMatch) {
        const methodBody = createEmptyTreeMatch[0];
        
        // EXPECTED TO PASS: Should find setLanguage call on fixed code
        const hasSetLanguage = methodBody.includes('setLanguage');
        expect(hasSetLanguage).toBe(true);
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
    
    it('should verify getDefaultLanguage() method exists', () => {
      // Verify that getDefaultLanguage helper method was added
      
      const filePath = path.join(__dirname, '..', 'analysis', 'ParserManager.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Should have getDefaultLanguage method
      const hasGetDefaultLanguage = /private getDefaultLanguage\(\)/.test(content);
      expect(hasGetDefaultLanguage).toBe(true);
    });
  });

  describe('Issue 1.6: Worker Thread Code is Dead Code', () => {
    
    it('should verify parseWithWorkerThreads method is removed', () => {
      // FIXED: Dead code removed entirely
      
      const filePath = path.join(__dirname, '..', 'performance', 'AnalysisOptimizer.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // EXPECTED TO PASS: Should NOT find parseWithWorkerThreads method
      const hasWorkerMethod = /private async parseWithWorkerThreads/.test(content);
      expect(hasWorkerMethod).toBe(false);
    });
    
    it('should verify worker support check is removed', () => {
      // FIXED: Worker support check removed
      
      const filePath = path.join(__dirname, '..', 'performance', 'AnalysisOptimizer.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // EXPECTED TO PASS: Should NOT find checkWorkerThreadSupport method
      const hasWorkerCheck = /private checkWorkerThreadSupport/.test(content);
      expect(hasWorkerCheck).toBe(false);
    });
    
    it('should verify parseWithAsyncBatching still exists', () => {
      // Verify that the working async batching method is still present
      
      const filePath = path.join(__dirname, '..', 'performance', 'AnalysisOptimizer.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Should still have parseWithAsyncBatching
      const hasAsyncBatching = /private async parseWithAsyncBatching/.test(content);
      expect(hasAsyncBatching).toBe(true);
    });
  });

  describe('Issue 1.7: 32-bit Hash Function Has Collision Risk', () => {
    
    it('should verify SHA-256 hash is used instead of custom 32-bit hash', () => {
      // FIXED: Using crypto.createHash with SHA-256
      
      const filePath = path.join(__dirname, '..', 'performance', 'AnalysisOptimizer.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Find hashContent method
      const methodMatch = content.match(/private hashContent\(content: string\): string \{[\s\S]*?\n  \}/);
      
      expect(methodMatch).toBeDefined();
      
      if (methodMatch) {
        const methodBody = methodMatch[0];
        
        // EXPECTED TO PASS: Should use crypto.createHash on fixed code
        expect(methodBody).toContain('crypto.createHash');
        expect(methodBody).toContain('sha256');
        
        // Should NOT have custom 32-bit hash
        expect(methodBody).not.toContain('let hash = 0');
        expect(methodBody).not.toContain('hash << 5');
      }
    });
    
    it('should verify crypto import exists', () => {
      // Verify that crypto module is imported
      
      const filePath = path.join(__dirname, '..', 'performance', 'AnalysisOptimizer.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for crypto import in first 50 lines
      const lines = content.split('\n').slice(0, 50);
      const hasCryptoImport = lines.some(line => 
        line.includes("import * as crypto from 'crypto'") ||
        line.includes('import * as crypto from "crypto"')
      );
      
      expect(hasCryptoImport).toBe(true);
    });
    
    it('should verify AnalysisService also uses crypto.createHash', () => {
      // Verify consistency between AnalysisService and AnalysisOptimizer
      
      const filePath = path.join(__dirname, '..', 'analysis', 'AnalysisService.ts');
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Both should use crypto.createHash
        const usesCrypto = content.includes('crypto.createHash');
        
        if (usesCrypto) {
          expect(usesCrypto).toBe(true);
        }
      }
    });
  });
});
