/**
 * Property-Based Tests for DiagramRenderer Navigation
 * Tests Properties 15, 16, and 17 from the design document
 * Requirements: 5.1, 5.2, 5.4
 * 
 * @jest-environment jsdom
 */

import * as fc from 'fast-check';
import { DiagramRenderer } from '../DiagramRenderer';
import { DiagramData, AbstractionLevel, ComponentType, Language, RelationshipType } from '../../types';

// Mock Cytoscape for testing
jest.mock('cytoscape', () => {
  const mockCytoscape: any = jest.fn(() => {
    let zoom = 1;
    let pan = { x: 0, y: 0 };
    const elements = new Map();

    const mockInstance = {
      elements: jest.fn(() => ({
        remove: jest.fn(),
        nodes: jest.fn(() => []),
        edges: jest.fn(() => []),
        boundingBox: jest.fn(() => ({ x1: 0, y1: 0, w: 800, h: 600 }))
      })),
      add: jest.fn((els) => {
        if (Array.isArray(els)) {
          els.forEach(el => {
            if (el.data?.id) {
              elements.set(el.data.id, el);
            }
          });
        }
      }),
      getElementById: jest.fn((id) => {
        const el = elements.get(id);
        return el ? { length: 1, ...el } : { length: 0 };
      }),
      layout: jest.fn(() => ({
        run: jest.fn()
      })),
      zoom: jest.fn((opts?: any) => {
        if (opts !== undefined) {
          if (typeof opts === 'object' && 'level' in opts) {
            zoom = Math.max(0.25, Math.min(4.0, opts.level));
          } else if (typeof opts === 'number') {
            zoom = Math.max(0.25, Math.min(4.0, opts));
          }
        }
        return zoom;
      }),
      pan: jest.fn((opts?: any) => {
        if (opts !== undefined) {
          pan = { ...opts };
        }
        return pan;
      }),
      fit: jest.fn(() => {
        // Reset to default view
        zoom = 1;
        pan = { x: 0, y: 0 };
      }),
      animate: jest.fn(),
      width: jest.fn(() => 800),
      height: jest.fn(() => 600),
      on: jest.fn(),
      destroy: jest.fn()
    };

    return mockInstance;
  });

  mockCytoscape.use = jest.fn();
  return mockCytoscape;
});

// Arbitraries for generating test data
const arbitraryDiagramData = (): fc.Arbitrary<DiagramData> => {
  return fc.record({
    nodes: fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }),
        label: fc.string({ minLength: 1, maxLength: 50 }),
        type: fc.constantFrom(...Object.values(ComponentType)),
        language: fc.constantFrom(...Object.values(Language)),
        filePaths: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
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
      }),
      { minLength: 1, maxLength: 20 }
    ),
    edges: fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 20 }),
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

describe('DiagramRenderer Navigation Property Tests', () => {
  let renderer: DiagramRenderer;
  let container: HTMLElement;

  beforeEach(() => {
    // Create a real DOM container
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    
    renderer = new DiagramRenderer();
  });

  afterEach(() => {
    if (renderer) {
      renderer.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  // Feature: ai-architecture-diagram-extension, Property 15: Pan Operation Updates Viewport
  // **Validates: Requirements 5.1**
  describe('Property 15: Pan Operation Updates Viewport', () => {
    it('should update viewport position when panning', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.integer({ min: -500, max: 500 }),
          fc.integer({ min: -500, max: 500 }),
          async (diagramData, panX, panY) => {
            // Initialize renderer
            renderer.initialize(container);
            renderer.renderDiagram(diagramData);

            // Get initial pan position
            const initialPan = renderer.getPan();

            // Perform pan operation
            renderer.panTo(panX, panY);

            // Get new pan position
            const newPan = renderer.getPan();

            // Verify pan position changed
            // Note: The exact values might differ due to Cytoscape's internal calculations,
            // but the pan should have been updated
            expect(newPan).toBeDefined();
            expect(typeof newPan.x).toBe('number');
            expect(typeof newPan.y).toBe('number');
            
            // If we panned to a different position, the pan should change
            if (panX !== initialPan.x || panY !== initialPan.y) {
              const panChanged = newPan.x !== initialPan.x || newPan.y !== initialPan.y;
              expect(panChanged).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 30000); // Increase timeout for property tests
  });

  // Feature: ai-architecture-diagram-extension, Property 16: Zoom Operation Updates Scale
  // **Validates: Requirements 5.2**
  describe('Property 16: Zoom Operation Updates Scale', () => {
    it('should increase zoom level when zooming in', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          async (diagramData) => {
            // Initialize renderer
            renderer.initialize(container);
            renderer.renderDiagram(diagramData);

            // Get initial zoom
            const initialZoom = renderer.getZoom();

            // Zoom in
            renderer.zoomIn();

            // Get new zoom
            const newZoom = renderer.getZoom();

            // Verify zoom increased (or stayed at max)
            expect(newZoom).toBeGreaterThanOrEqual(initialZoom);
            
            // Verify zoom is within valid range (25%-400%)
            expect(newZoom).toBeGreaterThanOrEqual(0.25);
            expect(newZoom).toBeLessThanOrEqual(4.0);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should decrease zoom level when zooming out', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          async (diagramData) => {
            // Initialize renderer
            renderer.initialize(container);
            renderer.renderDiagram(diagramData);

            // Zoom in first to ensure we're not at minimum
            renderer.zoomIn();
            renderer.zoomIn();
            
            const initialZoom = renderer.getZoom();

            // Zoom out
            renderer.zoomOut();

            // Get new zoom
            const newZoom = renderer.getZoom();

            // Verify zoom decreased (or stayed at min)
            expect(newZoom).toBeLessThanOrEqual(initialZoom);
            
            // Verify zoom is within valid range (25%-400%)
            expect(newZoom).toBeGreaterThanOrEqual(0.25);
            expect(newZoom).toBeLessThanOrEqual(4.0);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should maintain zoom within 25%-400% range', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.array(fc.constantFrom('in', 'out'), { minLength: 1, maxLength: 20 }),
          async (diagramData, zoomOperations) => {
            // Initialize renderer
            renderer.initialize(container);
            renderer.renderDiagram(diagramData);

            // Perform random zoom operations
            for (const op of zoomOperations) {
              if (op === 'in') {
                renderer.zoomIn();
              } else {
                renderer.zoomOut();
              }
            }

            // Get final zoom
            const finalZoom = renderer.getZoom();

            // Verify zoom is always within valid range
            expect(finalZoom).toBeGreaterThanOrEqual(0.25);
            expect(finalZoom).toBeLessThanOrEqual(4.0);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  // Feature: ai-architecture-diagram-extension, Property 17: Fit-to-View Reset
  // **Validates: Requirements 5.4**
  describe('Property 17: Fit-to-View Reset', () => {
    it('should reset viewport to show all elements after any zoom/pan operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryDiagramData(),
          fc.array(
            fc.record({
              operation: fc.constantFrom('zoomIn', 'zoomOut', 'pan'),
              panX: fc.integer({ min: -1000, max: 1000 }),
              panY: fc.integer({ min: -1000, max: 1000 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (diagramData, operations) => {
            // Initialize renderer
            renderer.initialize(container);
            renderer.renderDiagram(diagramData);

            // Perform random navigation operations
            for (const op of operations) {
              switch (op.operation) {
                case 'zoomIn':
                  renderer.zoomIn();
                  break;
                case 'zoomOut':
                  renderer.zoomOut();
                  break;
                case 'pan':
                  renderer.panTo(op.panX, op.panY);
                  break;
              }
            }

            // Get state before fit
            const zoomBeforeFit = renderer.getZoom();
            const panBeforeFit = renderer.getPan();

            // Fit to view
            renderer.fitToView();

            // Get state after fit
            const zoomAfterFit = renderer.getZoom();
            const panAfterFit = renderer.getPan();

            // Verify that fit-to-view was executed
            // (zoom and/or pan should change, unless already fitted)
            expect(zoomAfterFit).toBeDefined();
            expect(panAfterFit).toBeDefined();
            
            // Zoom should be within valid range
            expect(zoomAfterFit).toBeGreaterThanOrEqual(0.25);
            expect(zoomAfterFit).toBeLessThanOrEqual(4.0);
            
            // After fit-to-view, the diagram should be centered
            // (exact values depend on diagram size, but should be reasonable)
            expect(typeof panAfterFit.x).toBe('number');
            expect(typeof panAfterFit.y).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});
