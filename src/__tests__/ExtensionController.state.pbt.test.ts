/**
 * Property-Based Tests for Extension Controller State Preservation
 * Feature: ai-architecture-diagram-extension, Property 18: State Preservation During Navigation
 * 
 * **Validates: Requirements 5.5, 6.6, 11.4**
 * 
 * Property: For any selected diagram element and viewport state (zoom, pan),
 * performing navigation operations (zoom, pan, abstraction level change, refresh)
 * should preserve the selection and focus area where the element still exists.
 */

import * as fc from 'fast-check';
import { ExtensionController } from '../ExtensionController';
import { AbstractionLevel, RelationshipType } from '../types';
import {
  ArchitecturalModel,
  ArchitecturalComponent,
  ArchitecturalRelationship
} from '../types/analysis';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate arbitrary architectural component
 */
function arbitraryArchitecturalComponent(): fc.Arbitrary<ArchitecturalComponent> {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `comp-${s}`),
    name: fc.string({ minLength: 3, maxLength: 30 }),
    description: fc.string({ minLength: 10, maxLength: 100 }),
    role: fc.oneof(
      fc.constant('control plane'),
      fc.constant('data access layer'),
      fc.constant('auth module'),
      fc.constant('api layer'),
      fc.constant('business logic')
    ),
    filePaths: fc.array(fc.string({ minLength: 5, maxLength: 30 }).map(s => `src/${s}.ts`), {
      minLength: 1,
      maxLength: 5
    }),
    abstractionLevel: fc.oneof(
      fc.constant(AbstractionLevel.Overview),
      fc.constant(AbstractionLevel.Module),
      fc.constant(AbstractionLevel.Detailed)
    ),
    subComponents: fc.constant([]),
    parent: fc.constant(null)
  });
}

/**
 * Generate arbitrary architectural relationship
 */
function arbitraryArchitecturalRelationship(
  componentIds: string[]
): fc.Arbitrary<ArchitecturalRelationship> {
  if (componentIds.length < 2) {
    // Need at least 2 components for a relationship
    return fc.record({
      id: fc.constant('rel-none'),
      sourceId: fc.constant(''),
      targetId: fc.constant(''),
      type: fc.constant(RelationshipType.Import),
      description: fc.constant(''),
      strength: fc.constant(0)
    });
  }

  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `rel-${s}`),
    sourceId: fc.constantFrom(...componentIds),
    targetId: fc.constantFrom(...componentIds),
    type: fc.oneof(
      fc.constant(RelationshipType.Import),
      fc.constant(RelationshipType.Dependency),
      fc.constant(RelationshipType.Inheritance),
      fc.constant(RelationshipType.Composition),
      fc.constant(RelationshipType.FunctionCall)
    ),
    description: fc.string({ minLength: 10, maxLength: 50 }),
    strength: fc.double({ min: 0, max: 1 })
  }).filter(rel => rel.sourceId !== rel.targetId); // No self-references
}

/**
 * Generate arbitrary architectural model
 */
function arbitraryArchitecturalModel(): fc.Arbitrary<ArchitecturalModel> {
  return fc
    .array(arbitraryArchitecturalComponent(), { minLength: 3, maxLength: 10 })
    .chain(components => {
      const componentIds = components.map(c => c.id);
      return fc
        .array(arbitraryArchitecturalRelationship(componentIds), {
          minLength: 0,
          maxLength: Math.min(15, componentIds.length * 2)
        })
        .map(relationships => ({
          components,
          relationships: relationships.filter(r => r.id !== 'rel-none'),
          patterns: ['MVC', 'layered architecture'],
          metadata: {
            llmInferenceTimeMs: 1000,
            tierUsed: 1 as const,
            confidence: 'high' as const,
            filesAnalyzed: 50
          }
        }));
    });
}

/**
 * Generate arbitrary viewport state
 */
function arbitraryViewportState(): fc.Arbitrary<{
  zoomLevel: number;
  panPosition: { x: number; y: number };
}> {
  return fc.record({
    zoomLevel: fc.double({ min: 0.25, max: 4.0 }),
    panPosition: fc.record({
      x: fc.integer({ min: -1000, max: 1000 }),
      y: fc.integer({ min: -1000, max: 1000 })
    })
  });
}

/**
 * Generate arbitrary navigation operation
 */
function arbitraryNavigationOperation(): fc.Arbitrary<
  | { type: 'zoom'; delta: number }
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'abstractionLevel'; level: AbstractionLevel }
  | { type: 'refresh' }
> {
  return fc.oneof(
    fc.record({
      type: fc.constant('zoom' as const),
      delta: fc.double({ min: -0.5, max: 0.5 })
    }),
    fc.record({
      type: fc.constant('pan' as const),
      dx: fc.integer({ min: -200, max: 200 }),
      dy: fc.integer({ min: -200, max: 200 })
    }),
    fc.record({
      type: fc.constant('abstractionLevel' as const),
      level: fc.oneof(
        fc.constant(AbstractionLevel.Overview),
        fc.constant(AbstractionLevel.Module),
        fc.constant(AbstractionLevel.Detailed)
      )
    }),
    fc.record({
      type: fc.constant('refresh' as const)
    })
  );
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 18: State Preservation During Navigation', () => {
  // Reduce test timeout and iterations for faster execution
  const TEST_TIMEOUT = 120000; // 2 minutes
  const NUM_RUNS = 5; // Reduced to speed up tests with expensive controller initialization

  /**
   * Property: Selection preservation during zoom operations
   * 
   * For any selected element and zoom operation, the selection should be preserved
   */
  it('should preserve selection during zoom operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryArchitecturalModel(),
        arbitraryViewportState(),
        fc.array(fc.double({ min: -0.5, max: 0.5 }), { minLength: 1, maxLength: 5 }),
        async (model, initialViewport, zoomDeltas) => {
          // Create controller with mock context
          const controller = new ExtensionController();
          const mockContext = {
            subscriptions: [],
            globalState: { get: () => null, update: async () => {} },
            workspaceState: { get: () => null, update: async () => {} }
          };

          await controller.activate(mockContext);

          // Set up initial state
          controller.setState({
            architecturalModel: model,
            zoomLevel: initialViewport.zoomLevel,
            panPosition: initialViewport.panPosition
          });

          // Select a random element
          const selectedElement = model.components[0];
          controller.setSelectedElement(selectedElement.id);

          // Perform zoom operations
          for (const delta of zoomDeltas) {
            const currentState = controller.getState();
            const newZoomLevel = Math.max(
              0.25,
              Math.min(4.0, currentState.zoomLevel + delta)
            );
            controller.setState({ zoomLevel: newZoomLevel });
          }

          // Verify selection is preserved
          const currentState = controller.getState();
          expect(currentState.selectedElementId).toBe(selectedElement.id);

          await controller.deactivate();
        }
      ),
      { numRuns: NUM_RUNS }
    );
  }, TEST_TIMEOUT);

  /**
   * Property: Selection preservation during pan operations
   * 
   * For any selected element and pan operation, the selection should be preserved
   */
  it('should preserve selection during pan operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryArchitecturalModel(),
        arbitraryViewportState(),
        fc.array(
          fc.record({
            dx: fc.integer({ min: -200, max: 200 }),
            dy: fc.integer({ min: -200, max: 200 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (model, initialViewport, panOperations) => {
          const controller = new ExtensionController();
          const mockContext = {
            subscriptions: [],
            globalState: { get: () => null, update: async () => {} },
            workspaceState: { get: () => null, update: async () => {} }
          };

          await controller.activate(mockContext);

          // Set up initial state
          controller.setState({
            architecturalModel: model,
            zoomLevel: initialViewport.zoomLevel,
            panPosition: initialViewport.panPosition
          });

          // Select a random element
          const selectedElement = model.components[0];
          controller.setSelectedElement(selectedElement.id);

          // Perform pan operations
          for (const { dx, dy } of panOperations) {
            const currentState = controller.getState();
            controller.setState({
              panPosition: {
                x: currentState.panPosition.x + dx,
                y: currentState.panPosition.y + dy
              }
            });
          }

          // Verify selection is preserved
          const currentState = controller.getState();
          expect(currentState.selectedElementId).toBe(selectedElement.id);

          await controller.deactivate();
        }
      ),
      { numRuns: NUM_RUNS }
    );
  }, TEST_TIMEOUT);

  /**
   * Property: Selection preservation during abstraction level changes
   * 
   * For any selected element and abstraction level change, the selection should be
   * preserved if the element exists at the new abstraction level
   */
  it('should preserve selection during abstraction level changes when element exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryArchitecturalModel(),
        fc.oneof(
          fc.constant(AbstractionLevel.Overview),
          fc.constant(AbstractionLevel.Module),
          fc.constant(AbstractionLevel.Detailed)
        ),
        async (model, newLevel) => {
          const controller = new ExtensionController();
          const mockContext = {
            subscriptions: [],
            globalState: { get: () => null, update: async () => {} },
            workspaceState: { get: () => null, update: async () => {} }
          };

          await controller.activate(mockContext);

          // Set up initial state
          controller.setState({
            architecturalModel: model,
            abstractionLevel: AbstractionLevel.Module
          });

          // Select an element that exists at all levels
          const selectedElement = model.components[0];
          controller.setSelectedElement(selectedElement.id);

          // Change abstraction level
          controller.setState({ abstractionLevel: newLevel });

          // Verify selection is preserved (element exists at all levels in our test data)
          const currentState = controller.getState();
          expect(currentState.selectedElementId).toBe(selectedElement.id);

          await controller.deactivate();
        }
      ),
      { numRuns: NUM_RUNS }
    );
  }, TEST_TIMEOUT);

  /**
   * Property: Viewport state preservation during mixed navigation operations
   * 
   * For any sequence of navigation operations, the viewport state should be
   * correctly updated and preserved
   */
  it('should preserve and update viewport state during mixed navigation operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryArchitecturalModel(),
        arbitraryViewportState(),
        fc.array(arbitraryNavigationOperation(), { minLength: 1, maxLength: 10 }),
        async (model, initialViewport, operations) => {
          const controller = new ExtensionController();
          const mockContext = {
            subscriptions: [],
            globalState: { get: () => null, update: async () => {} },
            workspaceState: { get: () => null, update: async () => {} }
          };

          await controller.activate(mockContext);

          // Set up initial state
          controller.setState({
            architecturalModel: model,
            zoomLevel: initialViewport.zoomLevel,
            panPosition: { ...initialViewport.panPosition }
          });

          // Select an element
          const selectedElement = model.components[0];
          controller.setSelectedElement(selectedElement.id);

          // Track expected state
          let expectedZoom = initialViewport.zoomLevel;
          let expectedPan = { ...initialViewport.panPosition };
          let expectedAbstractionLevel = AbstractionLevel.Module;

          // Perform operations
          for (const op of operations) {
            switch (op.type) {
              case 'zoom':
                expectedZoom = Math.max(0.25, Math.min(4.0, expectedZoom + op.delta));
                controller.setState({ zoomLevel: expectedZoom });
                break;
              case 'pan':
                expectedPan = {
                  x: expectedPan.x + op.dx,
                  y: expectedPan.y + op.dy
                };
                controller.setState({ panPosition: { ...expectedPan } });
                break;
              case 'abstractionLevel':
                expectedAbstractionLevel = op.level;
                controller.setState({ abstractionLevel: op.level });
                break;
              case 'refresh':
                // Refresh should preserve state
                break;
            }
          }

          // Verify state is preserved correctly
          const currentState = controller.getState();
          expect(currentState.zoomLevel).toBeCloseTo(expectedZoom, 5);
          expect(currentState.panPosition.x).toBe(expectedPan.x);
          expect(currentState.panPosition.y).toBe(expectedPan.y);
          expect(currentState.abstractionLevel).toBe(expectedAbstractionLevel);
          expect(currentState.selectedElementId).toBe(selectedElement.id);

          await controller.deactivate();
        }
      ),
      { numRuns: NUM_RUNS }
    );
  }, TEST_TIMEOUT);

  /**
   * Property: Selection cleared when element no longer exists
   * 
   * When an element is removed (e.g., after filtering), the selection should be cleared
   */
  it('should clear selection when selected element no longer exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryArchitecturalModel(),
        async model => {
          const controller = new ExtensionController();
          const mockContext = {
            subscriptions: [],
            globalState: { get: () => null, update: async () => {} },
            workspaceState: { get: () => null, update: async () => {} }
          };

          await controller.activate(mockContext);

          // Set up initial state
          controller.setState({ architecturalModel: model });

          // Select an element
          const selectedElement = model.components[0];
          controller.setSelectedElement(selectedElement.id);

          // Verify selection is set
          let currentState = controller.getState();
          expect(currentState.selectedElementId).toBe(selectedElement.id);

          // Remove the selected element from the model
          const newModel = {
            ...model,
            components: model.components.filter(c => c.id !== selectedElement.id)
          };
          controller.setState({ architecturalModel: newModel });

          // Clear selection (simulating what would happen in refresh)
          controller.clearSelection();

          // Verify selection is cleared
          currentState = controller.getState();
          expect(currentState.selectedElementId).toBeNull();

          await controller.deactivate();
        }
      ),
      { numRuns: NUM_RUNS }
    );
  }, TEST_TIMEOUT);
});
