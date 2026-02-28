/**
 * Property-based tests for AbstractionFilter
 * Tests Property 19 from the design document
 */

import * as fc from 'fast-check';
import { AbstractionFilter } from '../AbstractionFilter';
import { DiagramGenerator } from '../DiagramGenerator';
import { AbstractionLevel } from '../../types';
import { arbitraryArchitecturalModel } from './arbitraries';

describe('AbstractionFilter Property Tests', () => {
  let filter: AbstractionFilter;
  let generator: DiagramGenerator;

  beforeEach(() => {
    filter = new AbstractionFilter();
    generator = new DiagramGenerator();
  });

  /**
   * Property 19: Abstraction Level Filtering
   * **Validates: Requirements 6.2, 6.3, 6.4**
   *
   * For any abstraction level (Overview, Module, Detailed), the diagram should display
   * only components whose abstraction level is less than or equal to the selected level,
   * with Overview showing only level-1 components, Module showing levels 1-2,
   * and Detailed showing all levels.
   */
  describe('Property 19: Abstraction Level Filtering', () => {
    it('should filter to only level 1 components for Overview', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          // Generate full diagram
          const fullDiagram = await generator.generateDiagram(model);

          // Filter to Overview level
          const overviewDiagram = filter.filterByLevel(
            fullDiagram,
            model,
            AbstractionLevel.Overview
          );

          // Verify abstraction level is set correctly
          expect(overviewDiagram.abstractionLevel).toBe(
            AbstractionLevel.Overview
          );

          // All visible nodes should be level 1
          for (const node of overviewDiagram.nodes) {
            const component = model.components.find((c) => c.id === node.id);
            if (component) {
              expect(component.abstractionLevel).toBe(AbstractionLevel.Overview);
            }
          }

          // Count expected level 1 components
          const level1Count = model.components.filter(
            (c) => c.abstractionLevel === AbstractionLevel.Overview
          ).length;
          expect(overviewDiagram.nodes.length).toBe(level1Count);
        }),
        { numRuns: 100 }
      );
    });

    it('should filter to levels 1-2 for Module', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          // Generate full diagram
          const fullDiagram = await generator.generateDiagram(model);

          // Filter to Module level
          const moduleDiagram = filter.filterByLevel(
            fullDiagram,
            model,
            AbstractionLevel.Module
          );

          // Verify abstraction level is set correctly
          expect(moduleDiagram.abstractionLevel).toBe(AbstractionLevel.Module);

          // All visible nodes should be level 1 or 2
          for (const node of moduleDiagram.nodes) {
            const component = model.components.find((c) => c.id === node.id);
            if (component) {
              expect(component.abstractionLevel).toBeLessThanOrEqual(
                AbstractionLevel.Module
              );
            }
          }

          // Count expected level 1-2 components
          const level12Count = model.components.filter(
            (c) => c.abstractionLevel <= AbstractionLevel.Module
          ).length;
          expect(moduleDiagram.nodes.length).toBe(level12Count);
        }),
        { numRuns: 100 }
      );
    });

    it('should show all components for Detailed', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          // Generate full diagram
          const fullDiagram = await generator.generateDiagram(model);

          // Filter to Detailed level
          const detailedDiagram = filter.filterByLevel(
            fullDiagram,
            model,
            AbstractionLevel.Detailed
          );

          // Verify abstraction level is set correctly
          expect(detailedDiagram.abstractionLevel).toBe(
            AbstractionLevel.Detailed
          );

          // All components should be visible
          expect(detailedDiagram.nodes.length).toBe(model.components.length);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve relationships between visible components', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryArchitecturalModel(),
          fc.constantFrom(
            AbstractionLevel.Overview,
            AbstractionLevel.Module,
            AbstractionLevel.Detailed
          ),
          async (model, level) => {
            // Generate full diagram
            const fullDiagram = await generator.generateDiagram(model);

            // Filter to target level
            const filteredDiagram = filter.filterByLevel(
              fullDiagram,
              model,
              level
            );

            // Get visible node IDs
            const visibleNodeIds = new Set(
              filteredDiagram.nodes.map((n) => n.id)
            );

            // All edges should connect visible nodes
            for (const edge of filteredDiagram.edges) {
              expect(visibleNodeIds.has(edge.source)).toBe(true);
              expect(visibleNodeIds.has(edge.target)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should remove edges when source or target is filtered out', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          // Generate full diagram
          const fullDiagram = await generator.generateDiagram(model);

          // Filter to Overview level (most restrictive)
          const overviewDiagram = filter.filterByLevel(
            fullDiagram,
            model,
            AbstractionLevel.Overview
          );

          // Get visible node IDs
          const visibleNodeIds = new Set(
            overviewDiagram.nodes.map((n) => n.id)
          );

          // Count edges in full diagram that connect visible nodes
          const expectedEdgeCount = fullDiagram.edges.filter(
            (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
          ).length;

          // Filtered diagram should have exactly those edges
          expect(overviewDiagram.edges.length).toBe(expectedEdgeCount);
        }),
        { numRuns: 100 }
      );
    });

    it('should use helper methods correctly', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          // Generate full diagram
          const fullDiagram = await generator.generateDiagram(model);

          // Test helper methods
          const overviewDiagram = filter.getOverviewLevel(fullDiagram, model);
          expect(overviewDiagram.abstractionLevel).toBe(
            AbstractionLevel.Overview
          );

          const moduleDiagram = filter.getModuleLevel(fullDiagram, model);
          expect(moduleDiagram.abstractionLevel).toBe(AbstractionLevel.Module);

          const detailedDiagram = filter.getDetailedLevel(fullDiagram, model);
          expect(detailedDiagram.abstractionLevel).toBe(
            AbstractionLevel.Detailed
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain monotonicity: Overview ⊆ Module ⊆ Detailed', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          // Generate full diagram
          const fullDiagram = await generator.generateDiagram(model);

          // Filter to all levels
          const overviewDiagram = filter.getOverviewLevel(fullDiagram, model);
          const moduleDiagram = filter.getModuleLevel(fullDiagram, model);
          const detailedDiagram = filter.getDetailedLevel(fullDiagram, model);

          // Overview nodes should be subset of Module nodes
          const overviewIds = new Set(overviewDiagram.nodes.map((n) => n.id));
          const moduleIds = new Set(moduleDiagram.nodes.map((n) => n.id));
          const detailedIds = new Set(detailedDiagram.nodes.map((n) => n.id));

          for (const id of overviewIds) {
            expect(moduleIds.has(id)).toBe(true);
            expect(detailedIds.has(id)).toBe(true);
          }

          // Module nodes should be subset of Detailed nodes
          for (const id of moduleIds) {
            expect(detailedIds.has(id)).toBe(true);
          }

          // Node counts should be monotonically increasing
          expect(overviewDiagram.nodes.length).toBeLessThanOrEqual(
            moduleDiagram.nodes.length
          );
          expect(moduleDiagram.nodes.length).toBeLessThanOrEqual(
            detailedDiagram.nodes.length
          );
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Filtering should not modify original diagram
   */
  describe('Immutability', () => {
    it('should not modify the original diagram data', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          // Generate full diagram
          const fullDiagram = await generator.generateDiagram(model);

          // Store original counts
          const originalNodeCount = fullDiagram.nodes.length;
          const originalEdgeCount = fullDiagram.edges.length;
          const originalLevel = fullDiagram.abstractionLevel;

          // Filter to Overview level
          filter.filterByLevel(fullDiagram, model, AbstractionLevel.Overview);

          // Original diagram should be unchanged
          expect(fullDiagram.nodes.length).toBe(originalNodeCount);
          expect(fullDiagram.edges.length).toBe(originalEdgeCount);
          expect(fullDiagram.abstractionLevel).toBe(originalLevel);
        }),
        { numRuns: 100 }
      );
    });
  });
});
