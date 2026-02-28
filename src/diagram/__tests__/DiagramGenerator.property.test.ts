/**
 * Property-based tests for DiagramGenerator
 * Tests Properties 6, 7, and 8 from the design document
 */

import * as fc from 'fast-check';
import { DiagramGenerator } from '../DiagramGenerator';
import { AbstractionLevel } from '../../types';
import { arbitraryArchitecturalModel } from './arbitraries';

describe('DiagramGenerator Property Tests', () => {
  let generator: DiagramGenerator;

  beforeEach(() => {
    generator = new DiagramGenerator();
  });

  /**
   * Property 6: Analysis-to-Diagram Fidelity
   * **Validates: Requirements 2.1, 2.3, 2.4**
   *
   * For any valid analysis result, the generated diagram should contain
   * a node for each component and an edge for each relationship in the analysis result.
   */
  describe('Property 6: Analysis-to-Diagram Fidelity', () => {
    it('should create diagram nodes and edges for all analysis components and relationships', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          const diagramData = await generator.generateDiagram(model);

          // Every component should have a corresponding node
          expect(diagramData.nodes.length).toBe(model.components.length);

          for (const component of model.components) {
            const node = diagramData.nodes.find((n) => n.id === component.id);
            expect(node).toBeDefined();
            expect(node?.label).toBe(component.name);
            expect(node?.filePaths).toEqual(component.filePaths);
          }

          // Every relationship should have a corresponding edge
          expect(diagramData.edges.length).toBe(model.relationships.length);

          for (const relationship of model.relationships) {
            const edge = diagramData.edges.find((e) => e.id === relationship.id);
            expect(edge).toBeDefined();
            expect(edge?.source).toBe(relationship.sourceId);
            expect(edge?.target).toBe(relationship.targetId);
            expect(edge?.type).toBe(relationship.type);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve component names from LLM-generated names', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          const diagramData = await generator.generateDiagram(model);

          // All component names should be preserved as node labels
          const componentNames = new Set(model.components.map((c) => c.name));
          const nodeLabels = new Set(diagramData.nodes.map((n) => n.label));

          expect(nodeLabels).toEqual(componentNames);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve relationship types in edges', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          const diagramData = await generator.generateDiagram(model);

          // All relationship types should be preserved
          for (const relationship of model.relationships) {
            const edge = diagramData.edges.find((e) => e.id === relationship.id);
            expect(edge?.type).toBe(relationship.type);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Abstraction Level Generation
   * **Validates: Requirements 2.6**
   *
   * For any analysis result, the Diagram_Generator should be able to generate
   * diagrams at all three abstraction levels (Overview, Module, Detailed).
   */
  describe('Property 7: Abstraction Level Generation', () => {
    it('should generate diagrams at all three abstraction levels', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          // Generate at Overview level
          const overviewDiagram = await generator.generateDiagram(
            model,
            AbstractionLevel.Overview
          );
          expect(overviewDiagram.abstractionLevel).toBe(
            AbstractionLevel.Overview
          );

          // Generate at Module level
          const moduleDiagram = await generator.generateDiagram(
            model,
            AbstractionLevel.Module
          );
          expect(moduleDiagram.abstractionLevel).toBe(AbstractionLevel.Module);

          // Generate at Detailed level
          const detailedDiagram = await generator.generateDiagram(
            model,
            AbstractionLevel.Detailed
          );
          expect(detailedDiagram.abstractionLevel).toBe(
            AbstractionLevel.Detailed
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should set the correct abstraction level in diagram data', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryArchitecturalModel(),
          fc.constantFrom(
            AbstractionLevel.Overview,
            AbstractionLevel.Module,
            AbstractionLevel.Detailed
          ),
          async (model, level) => {
            const diagramData = await generator.generateDiagram(model, level);
            expect(diagramData.abstractionLevel).toBe(level);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 8: Component Hierarchy Representation
   * **Validates: Requirements 2.5**
   *
   * For any component with parent-child relationships in the analysis result,
   * the diagram data should preserve these hierarchical relationships in its structure.
   */
  describe('Property 8: Component Hierarchy Representation', () => {
    it('should preserve parent-child relationships in diagram structure', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          const diagramData = await generator.generateDiagram(model);

          // For each component with subComponents, verify they exist in the diagram
          for (const component of model.components) {
            if (component.subComponents.length > 0) {
              const node = diagramData.nodes.find((n) => n.id === component.id);
              expect(node).toBeDefined();

              // Verify all subComponents exist as nodes
              for (const subComponentId of component.subComponents) {
                const subNode = diagramData.nodes.find(
                  (n) => n.id === subComponentId
                );
                expect(subNode).toBeDefined();
              }
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain component ID consistency across hierarchy', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          const diagramData = await generator.generateDiagram(model);

          // All component IDs should be present in diagram nodes
          const componentIds = new Set(model.components.map((c) => c.id));
          const nodeIds = new Set(diagramData.nodes.map((n) => n.id));

          expect(nodeIds).toEqual(componentIds);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve file path associations for hierarchical components', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          const diagramData = await generator.generateDiagram(model);

          // For each component, verify file paths are preserved in nodes
          for (const component of model.components) {
            const node = diagramData.nodes.find((n) => n.id === component.id);
            expect(node?.filePaths).toEqual(component.filePaths);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Diagram generation should complete within timeout
   * Validates: Requirement 2.7 (60 second timeout)
   */
  describe('Timeout Management', () => {
    it('should complete generation within reasonable time', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          const startTime = Date.now();
          await generator.generateDiagram(model);
          const endTime = Date.now();

          // Should complete well within 60 seconds for test data
          expect(endTime - startTime).toBeLessThan(5000); // 5 seconds for tests
        }),
        { numRuns: 50 } // Fewer runs for performance test
      );
    });
  });

  /**
   * Additional property: Generated diagrams should have valid structure
   */
  describe('Diagram Structure Validity', () => {
    it('should generate diagrams with valid node and edge structure', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          const diagramData = await generator.generateDiagram(model);

          // All nodes should have required fields
          for (const node of diagramData.nodes) {
            expect(node.id).toBeDefined();
            expect(node.label).toBeDefined();
            expect(node.type).toBeDefined();
            expect(node.language).toBeDefined();
            expect(node.filePaths).toBeDefined();
            expect(Array.isArray(node.filePaths)).toBe(true);
            expect(node.style).toBeDefined();
          }

          // All edges should have required fields
          for (const edge of diagramData.edges) {
            expect(edge.id).toBeDefined();
            expect(edge.source).toBeDefined();
            expect(edge.target).toBeDefined();
            expect(edge.type).toBeDefined();
            expect(edge.style).toBeDefined();
          }

          // Layout should be defined
          expect(diagramData.layout).toBeDefined();
          expect(diagramData.layout.algorithm).toBeDefined();
          expect(diagramData.layout.spacing).toBeGreaterThan(0);
          expect(diagramData.layout.direction).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should generate edges that reference existing nodes', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          const diagramData = await generator.generateDiagram(model);

          const nodeIds = new Set(diagramData.nodes.map((n) => n.id));

          // All edges should reference existing nodes
          for (const edge of diagramData.edges) {
            expect(nodeIds.has(edge.source)).toBe(true);
            expect(nodeIds.has(edge.target)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
