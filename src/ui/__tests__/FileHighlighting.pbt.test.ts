/**
 * Property-Based Tests for File Highlighting
 * Tests Properties 10, 12, 13, and 14 from the design document
 * Requirements: 3.2, 3.3, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import * as fc from 'fast-check';
import { FileHighlighter } from '../FileHighlighter';
import { FileMappingService } from '../FileMappingService';
import { DiagramData, DiagramNode, AbstractionLevel, ComponentType, Language, RelationshipType } from '../../types';

// Arbitraries for generating test data
const arbitraryFilePath = (): fc.Arbitrary<string> => {
  return fc.tuple(
    fc.constantFrom('src', 'lib', 'test', 'app', 'components'),
    fc.constantFrom('index', 'main', 'utils', 'helpers', 'config'),
    fc.constantFrom('.ts', '.js', '.py', '.java', '.go')
  ).map(([dir, name, ext]) => `${dir}/${name}${ext}`);
};

const arbitraryDiagramNode = (): fc.Arbitrary<DiagramNode> => {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(' ')),
    label: fc.string({ minLength: 1, maxLength: 50 }),
    type: fc.constantFrom(...Object.values(ComponentType)),
    language: fc.constantFrom(...Object.values(Language)),
    filePaths: fc.array(arbitraryFilePath(), { minLength: 1, maxLength: 5 }).map(paths => {
      // Remove duplicates to avoid test failures
      return Array.from(new Set(paths));
    }),
    position: fc.option(
      fc.record({
        x: fc.integer({ min: 0, max: 1000 }),
        y: fc.integer({ min: 0, max: 1000 })
      }),
      { nil: undefined }
    ),
    style: fc.record({
      color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => `#${h}`),
      shape: fc.constantFrom('rectangle' as const, 'ellipse' as const, 'hexagon' as const),
      size: fc.integer({ min: 30, max: 100 }),
      borderWidth: fc.integer({ min: 1, max: 5 })
    })
  });
};

const arbitraryDiagramData = (): fc.Arbitrary<DiagramData> => {
  return fc.record({
    nodes: fc.array(arbitraryDiagramNode(), { minLength: 1, maxLength: 20 }).map(nodes => {
      // Ensure unique node IDs
      const seen = new Set<string>();
      return nodes.filter(node => {
        if (seen.has(node.id)) {
          return false;
        }
        seen.add(node.id);
        return true;
      });
    }),
    edges: fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(' ')),
        source: fc.string({ minLength: 1, maxLength: 20 }),
        target: fc.string({ minLength: 1, maxLength: 20 }),
        type: fc.constantFrom(...Object.values(RelationshipType)),
        style: fc.record({
          color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(h => `#${h}`),
          width: fc.integer({ min: 1, max: 5 }),
          lineStyle: fc.constantFrom('solid' as const, 'dashed' as const, 'dotted' as const),
          arrow: fc.boolean()
        })
      }),
      { minLength: 0, maxLength: 30 }
    ),
    layout: fc.record({
      algorithm: fc.constantFrom('dagre' as const, 'cose' as const, 'breadthfirst' as const),
      spacing: fc.integer({ min: 10, max: 100 }),
      direction: fc.constantFrom('TB' as const, 'LR' as const)
    }),
    abstractionLevel: fc.constantFrom(
      AbstractionLevel.Overview,
      AbstractionLevel.Module,
      AbstractionLevel.Detailed
    )
  }).chain(data => {
    // Ensure edges reference valid node IDs
    const nodeIds = data.nodes.map(n => n.id);
    if (nodeIds.length === 0) {
      return fc.constant({ ...data, edges: [] });
    }
    
    const validEdges = data.edges.filter(e => 
      nodeIds.includes(e.source) && nodeIds.includes(e.target)
    );
    
    return fc.constant({ ...data, edges: validEdges });
  });
};

describe('File Highlighting Property Tests', () => {
  let fileHighlighter: FileHighlighter;
  let fileMappingService: FileMappingService;

  beforeEach(() => {
    fileHighlighter = new FileHighlighter();
    fileMappingService = new FileMappingService();
  });

  afterEach(() => {
    fileHighlighter.dispose();
    fileMappingService.clear();
  });

  // Feature: ai-architecture-diagram-extension, Property 10: File Mapping Integrity
  // **Validates: Requirements 3.2, 3.3, 4.1**
  describe('Property 10: File Mapping Integrity', () => {
    it('should maintain valid mapping between elements and files', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          async (diagramData) => {
            // Update mappings from diagram data
            fileMappingService.updateMappings(diagramData);

            // Verify every node has a valid mapping
            for (const node of diagramData.nodes) {
              const files = fileMappingService.getFilesForElement(node.id);
              
              // Files should match the node's filePaths
              expect(files).toEqual(node.filePaths);
              
              // Every file should map back to this element
              for (const filePath of node.filePaths) {
                const elements = fileMappingService.getElementsForFile(filePath);
                expect(elements).toContain(node.id);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly handle elements with multiple files', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          async (diagramData) => {
            fileMappingService.updateMappings(diagramData);

            // Find nodes with multiple files
            const multiFileNodes = diagramData.nodes.filter(n => n.filePaths.length > 1);
            
            for (const node of multiFileNodes) {
              const files = fileMappingService.getFilesForElement(node.id);
              
              // Should return all files
              expect(files.length).toBe(node.filePaths.length);
              
              // Should contain all file paths
              for (const filePath of node.filePaths) {
                expect(files).toContain(filePath);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle file shared across multiple elements', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          async (diagramData) => {
            fileMappingService.updateMappings(diagramData);

            // Build a map of files to elements
            const fileToElements = new Map<string, string[]>();
            for (const node of diagramData.nodes) {
              for (const filePath of node.filePaths) {
                if (!fileToElements.has(filePath)) {
                  fileToElements.set(filePath, []);
                }
                fileToElements.get(filePath)!.push(node.id);
              }
            }

            // Verify shared files
            for (const [filePath, expectedElements] of fileToElements.entries()) {
              const actualElements = fileMappingService.getElementsForFile(filePath);
              
              // Should contain all elements that reference this file
              expect(actualElements.length).toBe(expectedElements.length);
              for (const elementId of expectedElements) {
                expect(actualElements).toContain(elementId);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle file deletion correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.integer({ min: 0, max: 19 }),
          async (diagramData, nodeIndex) => {
            if (diagramData.nodes.length === 0) return true;

            fileMappingService.updateMappings(diagramData);

            // Pick a node and remove one of its files
            const node = diagramData.nodes[nodeIndex % diagramData.nodes.length];
            if (node.filePaths.length === 0) return true;

            const fileToRemove = node.filePaths[0];
            
            // Remove the file
            fileMappingService.removeFile(fileToRemove);

            // File should no longer be in the mapping
            expect(fileMappingService.hasFile(fileToRemove)).toBe(false);
            
            // File should not be returned for any element
            const filesForElement = fileMappingService.getFilesForElement(node.id);
            expect(filesForElement).not.toContain(fileToRemove);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle file rename correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.integer({ min: 0, max: 19 }),
          arbitraryFilePath(),
          async (diagramData, nodeIndex, newPath) => {
            if (diagramData.nodes.length === 0) return true;

            fileMappingService.updateMappings(diagramData);

            // Pick a node and rename one of its files
            const node = diagramData.nodes[nodeIndex % diagramData.nodes.length];
            if (node.filePaths.length === 0) return true;

            const oldPath = node.filePaths[0];
            
            // Skip if old and new paths are the same
            if (oldPath === newPath) return true;
            
            // Rename the file
            fileMappingService.renameFile(oldPath, newPath);

            // Old path should no longer exist
            const elementsForOldPath = fileMappingService.getElementsForFile(oldPath);
            expect(elementsForOldPath.length).toBe(0);
            
            // New path should map to the same elements
            const elementsForNewPath = fileMappingService.getElementsForFile(newPath);
            expect(elementsForNewPath).toContain(node.id);
            
            // Element should now reference new path
            const filesForElement = fileMappingService.getFilesForElement(node.id);
            expect(filesForElement).toContain(newPath);
            expect(filesForElement).not.toContain(oldPath);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: ai-architecture-diagram-extension, Property 12: Highlight State Transitions
  // **Validates: Requirements 3.5, 4.4, 4.5**
  describe('Property 12: Highlight State Transitions', () => {
    it('should maintain correct highlight state through selection sequence', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.array(
            fc.oneof(
              fc.record({ action: fc.constant('select' as const), index: fc.integer({ min: 0, max: 19 }) }),
              fc.record({ action: fc.constant('deselect' as const) })
            ),
            { minLength: 1, maxLength: 10 }
          ),
          async (diagramData, actions) => {
            if (diagramData.nodes.length === 0) return true;

            fileMappingService.updateMappings(diagramData);

            for (const action of actions) {
              if (action.action === 'select') {
                const nodeIndex = action.index % diagramData.nodes.length;
                const node = diagramData.nodes[nodeIndex];
                
                // Highlight files for this element
                const files = fileMappingService.getFilesForElement(node.id);
                fileHighlighter.highlightFiles(files);
                
                // Verify highlighted files match selected element
                const highlighted = fileHighlighter.getHighlightedFiles();
                expect(highlighted.length).toBe(files.length);
                
                for (const file of files) {
                  expect(highlighted).toContain(file);
                  expect(fileHighlighter.isFileHighlighted(file)).toBe(true);
                }
              } else {
                // Clear highlights
                fileHighlighter.clearHighlights();
                
                // Verify no files are highlighted
                expect(fileHighlighter.getHighlightedFiles()).toHaveLength(0);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear previous highlights when selecting new element', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 2, maxLength: 5 }),
          async (diagramData, selectionIndices) => {
            if (diagramData.nodes.length < 2) return true;

            fileMappingService.updateMappings(diagramData);

            let previousFiles: string[] = [];

            for (const index of selectionIndices) {
              const nodeIndex = index % diagramData.nodes.length;
              const node = diagramData.nodes[nodeIndex];
              
              // Highlight files for this element
              const files = fileMappingService.getFilesForElement(node.id);
              fileHighlighter.highlightFiles(files);
              
              // Previous files should no longer be highlighted (unless they're in current selection)
              for (const prevFile of previousFiles) {
                if (!files.includes(prevFile)) {
                  expect(fileHighlighter.isFileHighlighted(prevFile)).toBe(false);
                }
              }
              
              // Current files should be highlighted
              for (const file of files) {
                expect(fileHighlighter.isFileHighlighted(file)).toBe(true);
              }
              
              previousFiles = files;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty selection correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.integer({ min: 0, max: 19 }),
          async (diagramData, nodeIndex) => {
            if (diagramData.nodes.length === 0) return true;

            fileMappingService.updateMappings(diagramData);

            // Select an element
            const node = diagramData.nodes[nodeIndex % diagramData.nodes.length];
            const files = fileMappingService.getFilesForElement(node.id);
            fileHighlighter.highlightFiles(files);
            
            // Verify files are highlighted
            expect(fileHighlighter.getHighlightedFiles().length).toBeGreaterThan(0);
            
            // Clear selection
            fileHighlighter.clearHighlights();
            
            // Verify no files are highlighted
            expect(fileHighlighter.getHighlightedFiles()).toHaveLength(0);
            
            // Verify all files report as not highlighted
            for (const file of files) {
              expect(fileHighlighter.isFileHighlighted(file)).toBe(false);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: ai-architecture-diagram-extension, Property 13: Highlight Visual Distinction
  // **Validates: Requirements 4.2**
  describe('Property 13: Highlight Visual Distinction', () => {
    it('should distinguish highlighted files from non-highlighted files', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.integer({ min: 0, max: 19 }),
          async (diagramData, nodeIndex) => {
            if (diagramData.nodes.length === 0) return true;

            fileMappingService.updateMappings(diagramData);

            // Select an element
            const node = diagramData.nodes[nodeIndex % diagramData.nodes.length];
            const files = fileMappingService.getFilesForElement(node.id);
            fileHighlighter.highlightFiles(files);
            
            // Get all files from all nodes
            const allFiles = new Set<string>();
            for (const n of diagramData.nodes) {
              for (const f of n.filePaths) {
                allFiles.add(f);
              }
            }
            
            // Verify highlighted files are marked as highlighted
            for (const file of files) {
              expect(fileHighlighter.isFileHighlighted(file)).toBe(true);
            }
            
            // Verify non-highlighted files are marked as not highlighted
            for (const file of allFiles) {
              if (!files.includes(file)) {
                expect(fileHighlighter.isFileHighlighted(file)).toBe(false);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain distinction after multiple operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 3, maxLength: 10 }),
          async (diagramData, selectionIndices) => {
            if (diagramData.nodes.length === 0) return true;

            fileMappingService.updateMappings(diagramData);

            for (const index of selectionIndices) {
              const nodeIndex = index % diagramData.nodes.length;
              const node = diagramData.nodes[nodeIndex];
              const files = fileMappingService.getFilesForElement(node.id);
              
              fileHighlighter.highlightFiles(files);
              
              // Get all files
              const allFiles = new Set<string>();
              for (const n of diagramData.nodes) {
                for (const f of n.filePaths) {
                  allFiles.add(f);
                }
              }
              
              // Verify distinction is maintained
              for (const file of allFiles) {
                const shouldBeHighlighted = files.includes(file);
                expect(fileHighlighter.isFileHighlighted(file)).toBe(shouldBeHighlighted);
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: ai-architecture-diagram-extension, Property 14: Highlighted File Navigation
  // **Validates: Requirements 4.3**
  describe('Property 14: Highlighted File Navigation', () => {
    it('should track which files are highlighted for navigation', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.integer({ min: 0, max: 19 }),
          async (diagramData, nodeIndex) => {
            if (diagramData.nodes.length === 0) return true;

            fileMappingService.updateMappings(diagramData);

            // Select an element
            const node = diagramData.nodes[nodeIndex % diagramData.nodes.length];
            const files = fileMappingService.getFilesForElement(node.id);
            fileHighlighter.highlightFiles(files);
            
            // Get highlighted files
            const highlightedFiles = fileHighlighter.getHighlightedFiles();
            
            // Should match the files for the selected element
            expect(highlightedFiles.length).toBe(files.length);
            for (const file of files) {
              expect(highlightedFiles).toContain(file);
            }
            
            // Each highlighted file should be queryable
            for (const file of highlightedFiles) {
              expect(fileHighlighter.isFileHighlighted(file)).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide accurate list of highlighted files for IDE integration', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 1, maxLength: 5 }),
          async (diagramData, selectionIndices) => {
            if (diagramData.nodes.length === 0) return true;

            fileMappingService.updateMappings(diagramData);

            for (const index of selectionIndices) {
              const nodeIndex = index % diagramData.nodes.length;
              const node = diagramData.nodes[nodeIndex];
              const expectedFiles = fileMappingService.getFilesForElement(node.id);
              
              fileHighlighter.highlightFiles(expectedFiles);
              
              // Get highlighted files
              const actualFiles = fileHighlighter.getHighlightedFiles();
              
              // Should exactly match expected files
              expect(actualFiles.length).toBe(expectedFiles.length);
              expect(new Set(actualFiles)).toEqual(new Set(expectedFiles));
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear navigation state when highlights are cleared', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.integer({ min: 0, max: 19 }),
          async (diagramData, nodeIndex) => {
            if (diagramData.nodes.length === 0) return true;

            fileMappingService.updateMappings(diagramData);

            // Select an element
            const node = diagramData.nodes[nodeIndex % diagramData.nodes.length];
            const files = fileMappingService.getFilesForElement(node.id);
            fileHighlighter.highlightFiles(files);
            
            // Verify files are highlighted
            expect(fileHighlighter.getHighlightedFiles().length).toBeGreaterThan(0);
            
            // Clear highlights
            fileHighlighter.clearHighlights();
            
            // Navigation state should be empty
            expect(fileHighlighter.getHighlightedFiles()).toHaveLength(0);
            
            // No files should be queryable as highlighted
            for (const file of files) {
              expect(fileHighlighter.isFileHighlighted(file)).toBe(false);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
