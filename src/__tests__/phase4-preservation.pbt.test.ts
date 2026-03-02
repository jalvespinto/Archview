/**
 * Phase 4 Preservation Property-Based Tests
 *
 * CRITICAL: These tests MUST be written and run BEFORE implementing Phase 4 fixes.
 * They capture the baseline behavior on UNFIXED code to ensure no regressions.
 *
 * Property 2: Preservation - Core Functionality Unchanged
 *
 * Test Strategy: Observation-First Methodology
 * 1. Observe behavior on UNFIXED code for normal operations
 * 2. Write property-based tests capturing observed behavior patterns
 * 3. Run tests on UNFIXED code - EXPECTED OUTCOME: Tests PASS
 * 4. After fixes, re-run same tests - should still PASS (no regressions)
 *
 * Requirements: 3.1, 3.2, 3.4, 3.9
 */

import * as fc from 'fast-check';
import { FileHighlighter } from '../ui/FileHighlighter';
import { WebviewMessageHandler, MessageHandlerCallbacks } from '../ui/WebviewMessageHandler';
import { WebviewManager } from '../ui/WebviewManager';
import { FileMappingService } from '../ui/FileMappingService';
import { ExtensionController } from '../ExtensionController';
import { DiagramData, AbstractionLevel } from '../types';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 4 Preservation Tests - Core Functionality Unchanged', () => {

  describe('Property: File Highlighting State Management (Requirement 3.9)', () => {
    /**
     * FileHighlighter manages a set of highlighted file paths.
     * After fixing type annotations (Issue 1.17), this state management must be preserved.
     */
    it('should add file paths to highlighted set via highlightFiles()', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          (filePaths) => {
            const highlighter = new FileHighlighter();
            highlighter.highlightFiles(filePaths);

            const highlighted = highlighter.getHighlightedFiles();
            expect(highlighted.length).toBe(filePaths.length);
            filePaths.forEach(path => {
              expect(highlighted).toContain(path);
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return correct set via getHighlightedFiles()', () => {
      const highlighter = new FileHighlighter();
      const testPaths = ['src/main.ts', 'src/utils.ts', 'src/types.ts'];

      highlighter.highlightFiles(testPaths);
      const result = highlighter.getHighlightedFiles();

      expect(result).toEqual(testPaths);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should empty set via clearHighlights()', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
          (filePaths) => {
            const highlighter = new FileHighlighter();
            highlighter.highlightFiles(filePaths);
            expect(highlighter.getHighlightedFiles().length).toBeGreaterThan(0);

            highlighter.clearHighlights();
            expect(highlighter.getHighlightedFiles().length).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return correct boolean via isFileHighlighted()', () => {
      const highlighter = new FileHighlighter();
      const testPaths = ['src/main.ts', 'src/utils.ts'];

      highlighter.highlightFiles(testPaths);

      expect(highlighter.isFileHighlighted('src/main.ts')).toBe(true);
      expect(highlighter.isFileHighlighted('src/utils.ts')).toBe(true);
      expect(highlighter.isFileHighlighted('src/other.ts')).toBe(false);
    });
  });

  describe('Property: Message Dispatch Routing (Requirements 3.1, 3.2)', () => {
    /**
     * WebviewMessageHandler routes messages to callbacks.
     * After removing console.log statements (Issue 1.15), routing must be preserved.
     */
    let webviewManager: WebviewManager;
    let fileHighlighter: FileHighlighter;
    let fileMappingService: FileMappingService;

    beforeEach(() => {
      webviewManager = new WebviewManager();
      fileHighlighter = new FileHighlighter();
      fileMappingService = new FileMappingService();
    });

    it('should fire element selection callback on selection message', (done) => {
      const callbacks: MessageHandlerCallbacks = {
        onElementSelected: (elementId: string) => {
          expect(elementId).toBe('component-1');
          done();
        }
      };

      const handler = new WebviewMessageHandler(
        webviewManager,
        fileHighlighter,
        fileMappingService,
        callbacks
      );

      // Simulate message from webview
      const messageHandler = (webviewManager as any).messageHandlers.values().next().value;
      messageHandler({
        type: 'elementSelected',
        elementId: 'component-1'
      });
    });

    it('should fire abstraction level change callback', (done) => {
      const callbacks: MessageHandlerCallbacks = {
        onAbstractionLevelChanged: (level: AbstractionLevel) => {
          expect(level).toBe(AbstractionLevel.Detailed);
          done();
        }
      };

      const handler = new WebviewMessageHandler(
        webviewManager,
        fileHighlighter,
        fileMappingService,
        callbacks
      );

      const messageHandler = (webviewManager as any).messageHandlers.values().next().value;
      messageHandler({
        type: 'abstractionLevelChanged',
        level: AbstractionLevel.Detailed
      });
    });

    it('should fire export request callback', (done) => {
      const callbacks: MessageHandlerCallbacks = {
        onExportRequested: (format: 'png' | 'svg') => {
          expect(format).toBe('png');
          done();
        }
      };

      const handler = new WebviewMessageHandler(
        webviewManager,
        fileHighlighter,
        fileMappingService,
        callbacks
      );

      const messageHandler = (webviewManager as any).messageHandlers.values().next().value;
      messageHandler({
        type: 'exportRequested',
        format: 'png'
      });
    });

    it('should update state via setDiagramData()', () => {
      const handler = new WebviewMessageHandler(
        webviewManager,
        fileHighlighter,
        fileMappingService
      );

      const testData: DiagramData = {
        nodes: [
          {
            id: 'node1',
            label: 'Component 1',
            type: 'module' as any, // ComponentType.Module
            language: 'typescript' as any, // Language.TypeScript
            filePaths: ['src/main.ts'],
            style: {
              color: '#0066cc',
              shape: 'rectangle' as const,
              size: 50,
              borderWidth: 2
            }
          }
        ],
        edges: [],
        layout: {
          algorithm: 'dagre' as const,
          spacing: 50,
          direction: 'TB' as const
        },
        abstractionLevel: AbstractionLevel.Module
      };

      expect(() => handler.setDiagramData(testData)).not.toThrow();
      expect((handler as any).currentDiagramData).toBe(testData);
    });
  });

  describe('Property: WebviewManager Lifecycle (Requirements 3.1, 3.4)', () => {
    /**
     * WebviewManager lifecycle methods must work correctly.
     * After fixing panel type (Issue 1.17) and CSP (Issue 1.20), lifecycle must be preserved.
     */
    it('should return false from isActive() when no webview created', () => {
      const manager = new WebviewManager();
      expect(manager.isActive()).toBe(false);
    });

    it('should allow onMessage() handler registration without throwing', () => {
      const manager = new WebviewManager();
      expect(() => {
        manager.onMessage((msg) => {
          // Handler
        });
      }).not.toThrow();
    });

    it('should allow multiple handlers to be registered', () => {
      const manager = new WebviewManager();
      const handlers: any[] = [];

      expect(() => {
        handlers.push(manager.onMessage((msg) => {}));
        handlers.push(manager.onMessage((msg) => {}));
        handlers.push(manager.onMessage((msg) => {}));
      }).not.toThrow();

      expect(handlers.length).toBe(3);
      handlers.forEach(h => expect(h).toHaveProperty('dispose'));
    });

    it('should handle postMessage() gracefully when no panel exists', () => {
      const manager = new WebviewManager();
      expect(() => {
        manager.postMessage({
          type: 'initialize',
          data: {
            nodes: [],
            edges: [],
            layout: {
              algorithm: 'dagre' as const,
              spacing: 50,
              direction: 'TB' as const
            },
            abstractionLevel: AbstractionLevel.Module
          }
        });
      }).not.toThrow();
    });
  });

  describe('Property: Webview HTML Structure (Requirement 3.4)', () => {
    /**
     * HIGHEST RISK: CSP changes (Issue 1.20) could break webview rendering.
     * After fix adds nonce-based CSP, HTML structure must be preserved.
     */
    let manager: WebviewManager;

    beforeEach(() => {
      manager = new WebviewManager();
    });

    it('should return non-empty CSS string from getInlineStyles()', () => {
      const getInlineStyles = (manager as any).getInlineStyles.bind(manager);
      const css = getInlineStyles();

      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
      
      // Check for expected CSS selectors
      expect(css).toContain('body');
      expect(css).toContain('#diagram-container');
      expect(css).toContain('#controls');
      expect(css).toContain('button');
    });

    it('should return non-empty JS string from getInlineScript()', () => {
      const getInlineScript = (manager as any).getInlineScript.bind(manager);
      const js = getInlineScript();

      expect(typeof js).toBe('string');
      expect(js.length).toBeGreaterThan(0);
      
      // Check for expected function names
      expect(js).toContain('acquireVsCodeApi');
      expect(js).toContain('initialize');
      expect(js).toContain('addEventListener');
    });

    it('should contain style, script, and CSP meta tags in HTML output', () => {
      const html = manager.getWebviewContent();

      expect(html).toMatch(/<style nonce="[^"]+"/);
      expect(html).toContain('</style>');
      expect(html).toMatch(/<script nonce="[^"]+"/);
      expect(html).toContain('</script>');
      expect(html).toContain('<meta http-equiv="Content-Security-Policy"');
      
      // Verify HTML structure
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<div id="diagram-container">');
      expect(html).toContain('<div id="controls">');
    });
  });

  describe('Property: Extension State Management (Requirements 3.1, 3.2)', () => {
    /**
     * ExtensionController state management must work correctly.
     * After removing console.log (Issue 1.15) and fixing types (Issue 1.17),
     * state management must be preserved.
     */
    it('should return valid ExtensionState with all required fields via getState()', () => {
      const controller = new ExtensionController();
      const state = controller.getState();

      // Check all required fields exist
      expect(state).toHaveProperty('analysisResult');
      expect(state).toHaveProperty('groundingData');
      expect(state).toHaveProperty('architecturalModel');
      expect(state).toHaveProperty('selectedElementId');
      expect(state).toHaveProperty('abstractionLevel');
      expect(state).toHaveProperty('zoomLevel');
      expect(state).toHaveProperty('panPosition');
      expect(state).toHaveProperty('isFirstActivation');
      expect(state).toHaveProperty('isDiagramOutOfSync');
      expect(state).toHaveProperty('lastAnalysisTimestamp');
    });

    it('should update state via setState() and reflect in getState()', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            AbstractionLevel.Overview,
            AbstractionLevel.Module,
            AbstractionLevel.Detailed
          ),
          fc.double({ min: 0.1, max: 5.0 }),
          (abstractionLevel, zoomLevel) => {
            const controller = new ExtensionController();
            
            controller.setState({
              abstractionLevel,
              zoomLevel
            });

            const state = controller.getState();
            expect(state.abstractionLevel).toBe(abstractionLevel);
            expect(state.zoomLevel).toBe(zoomLevel);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should have correct initial values in state', () => {
      const controller = new ExtensionController();
      const state = controller.getState();

      expect(state.analysisResult).toBeNull();
      expect(state.groundingData).toBeNull();
      expect(state.architecturalModel).toBeNull();
      expect(state.selectedElementId).toBeNull();
      expect(state.abstractionLevel).toBe(AbstractionLevel.Module);
      expect(state.zoomLevel).toBe(1.0);
      expect(state.panPosition).toEqual({ x: 0, y: 0 });
      expect(state.isFirstActivation).toBe(true);
      expect(state.isDiagramOutOfSync).toBe(false);
      expect(state.lastAnalysisTimestamp).toBeNull();
    });

    it('should allow selectedElement to be set and cleared', () => {
      const controller = new ExtensionController();
      
      controller.setSelectedElement('component-1');
      expect(controller.getState().selectedElementId).toBe('component-1');

      controller.clearSelection();
      expect(controller.getState().selectedElementId).toBeNull();
    });
  });

  describe('Property: Project Compilation (Requirements 3.1, 3.2)', () => {
    /**
     * TypeScript compilation must succeed after type fixes (Issue 1.17).
     * No import references to deleted troubleshooting files (Issue 1.16) should exist.
     */
    it('should compile TypeScript without errors', () => {
      // Run tsc --noEmit to check for compilation errors
      expect(() => {
        execSync('npx tsc --noEmit', {
          cwd: path.join(__dirname, '../..'),
          stdio: 'pipe',
          encoding: 'utf-8'
        });
      }).not.toThrow();
    }, 30000); // Allow 30s for compilation

    it('should have no import references to troubleshooting files', () => {
      const troubleshootingFiles = [
        'COMMANDS_FIXED.md',
        'DEBUG_LOGGING_ADDED.md',
        'FIX_APPLIED.md',
        'HOW_TO_TEST.md',
        'QUICK_FIX.md',
        'TEST_COMMAND_REGISTRATION.md',
        'TESTING_GUIDE.md',
        'TEST_ON_THIS_REPO.md',
        'TROUBLESHOOTING_COMMAND_NOT_FOUND.md',
        'WEBVIEW_FIX_SUMMARY.md',
        'WEBVIEW_ISSUE_REPORT.md',
        'test-output.txt'
      ];

      const srcDir = path.join(__dirname, '..');
      const files = getAllTypeScriptFiles(srcDir);

      // Filter out test files - they may reference troubleshooting files in test data
      const productionFiles = files.filter(f => !f.includes('__tests__'));

      productionFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        
        // Check for actual import/require statements referencing these files
        troubleshootingFiles.forEach(troubleFile => {
          const importPattern = new RegExp(`(import|require).*${troubleFile.replace('.', '\\.')}`, 'g');
          expect(content).not.toMatch(importPattern);
        });
      });
    });
  });
});

/**
 * Helper function to recursively get all TypeScript files
 */
function getAllTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other build directories
        if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
          traverse(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}
