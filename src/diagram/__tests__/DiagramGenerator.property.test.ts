/**
 * Property-based tests for DiagramGenerator
 * Tests Properties 6, 7, 8, and 28 from the design document
 */

import * as fc from 'fast-check';
import { DiagramGenerator } from '../DiagramGenerator';
import { AbstractionLevel, Language } from '../../types';
import {
  arbitraryArchitecturalModel,
  arbitraryLanguage,
  arbitraryAbstractionLevel,
  arbitraryArchitecturalRelationship,
  arbitraryArchitecturalModelMetadata,
} from './arbitraries';

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

  /**
   * Property 28: Multi-Language Diagram Integration
   * **Validates: Requirements 12.3**
   *
   * For any project containing source files in multiple programming languages,
   * the generated diagram should include components from all detected languages.
   */
  describe('Property 28: Multi-Language Diagram Integration', () => {
    it('should include components from all languages in a single diagram', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a model with components from multiple languages
          fc
            .array(arbitraryLanguage(), { minLength: 2, maxLength: 5 })
            .chain((languages) => {
              // Create at least one component per language
              const componentsPerLanguage = languages.map((lang, idx) =>
                fc.record({
                  id: fc.constant(`component-${lang}-${idx}`),
                  name: fc.constant(`${lang}Component${idx}`),
                  description: fc.lorem({ maxCount: 10 }),
                  role: fc.constantFrom(
                    'control plane',
                    'data access layer',
                    'auth module'
                  ),
                  filePaths: fc.array(
                    fc
                      .tuple(
                        fc.stringMatching(/^[a-z]+$/),
                        fc.constant(getExtensionForLanguage(lang))
                      )
                      .map(([name, ext]) => `src/${name}.${ext}`),
                    { minLength: 1, maxLength: 3 }
                  ),
                  abstractionLevel: arbitraryAbstractionLevel(),
                  subComponents: fc.constant([]),
                  parent: fc.constant(null),
                })
              );

              return fc
                .tuple(...componentsPerLanguage)
                .chain((components) => {
                  const componentIds = components.map((c) => c.id);
                  return fc.record({
                    components: fc.constant(components),
                    relationships: fc.array(
                      arbitraryArchitecturalRelationship(componentIds),
                      { maxLength: 5 }
                    ),
                    patterns: fc.constant([]),
                    metadata: arbitraryArchitecturalModelMetadata(),
                  });
                });
            }),
          async (model) => {
            const diagramData = await generator.generateDiagram(model);

            // Extract unique languages from components
            const languagesInModel = new Set<Language>();
            for (const component of model.components) {
              // Infer language from file paths
              for (const filePath of component.filePaths) {
                const ext = filePath.split('.').pop()?.toLowerCase();
                const language = getLanguageFromExtension(ext || '');
                languagesInModel.add(language);
              }
            }

            // Extract unique languages from diagram nodes
            const languagesInDiagram = new Set(
              diagramData.nodes.map((n) => n.language)
            );

            // All languages from the model should be present in the diagram
            for (const language of languagesInModel) {
              expect(languagesInDiagram.has(language)).toBe(true);
            }

            // Verify all components are included (none filtered out by language)
            expect(diagramData.nodes.length).toBe(model.components.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle unknown file types as generic components', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            components: fc.array(
              fc.record({
                id: fc.uuid(),
                name: fc.stringMatching(/^[A-Z][a-zA-Z]+$/),
                description: fc.lorem({ maxCount: 10 }),
                role: fc.constantFrom('module', 'service', 'component'),
                // Use unknown file extensions
                filePaths: fc.array(
                  fc
                    .tuple(
                      fc.stringMatching(/^[a-z]+$/),
                      fc.constantFrom('xyz', 'abc', 'unknown', 'custom')
                    )
                    .map(([name, ext]) => `src/${name}.${ext}`),
                  { minLength: 1, maxLength: 3 }
                ),
                abstractionLevel: arbitraryAbstractionLevel(),
                subComponents: fc.constant([]),
                parent: fc.constant(null),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            relationships: fc.constant([]),
            patterns: fc.constant([]),
            metadata: arbitraryArchitecturalModelMetadata(),
          }),
          async (model) => {
            const diagramData = await generator.generateDiagram(model);

            // All components with unknown file types should be included
            expect(diagramData.nodes.length).toBe(model.components.length);

            // All nodes with unknown file types should have Language.Unknown
            for (const node of diagramData.nodes) {
              expect(node.language).toBe(Language.Unknown);
            }

            // Nodes should still have valid styling
            for (const node of diagramData.nodes) {
              expect(node.style).toBeDefined();
              expect(node.style.color).toBeDefined();
              expect(node.style.shape).toBeDefined();
              expect(node.style.size).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve all components in multi-language projects', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryArchitecturalModel(),
          async (model) => {
            const diagramData = await generator.generateDiagram(model);

            // Count components by language in the model
            const componentsByLanguage = new Map<Language, number>();
            for (const component of model.components) {
              for (const filePath of component.filePaths) {
                const ext = filePath.split('.').pop()?.toLowerCase();
                const language = getLanguageFromExtension(ext || '');
                componentsByLanguage.set(
                  language,
                  (componentsByLanguage.get(language) || 0) + 1
                );
              }
            }

            // All components should be present in the diagram
            expect(diagramData.nodes.length).toBe(model.components.length);

            // Verify each component is represented
            for (const component of model.components) {
              const node = diagramData.nodes.find((n) => n.id === component.id);
              expect(node).toBeDefined();
              expect(node?.filePaths).toEqual(component.filePaths);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should add language icons to all nodes', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryArchitecturalModel(),
          async (model) => {
            const diagramData = await generator.generateDiagram(model);

            // All nodes should have a language icon in their style
            for (const node of diagramData.nodes) {
              expect(node.style.languageIcon).toBeDefined();
              expect(typeof node.style.languageIcon).toBe('string');
              if (node.style.languageIcon) {
                expect(node.style.languageIcon.length).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Helper function to get file extension for a language
 */
function getExtensionForLanguage(language: Language): string {
  switch (language) {
    case Language.Python:
      return 'py';
    case Language.JavaScript:
      return 'js';
    case Language.TypeScript:
      return 'ts';
    case Language.Java:
      return 'java';
    case Language.Go:
      return 'go';
    case Language.Unknown:
    default:
      return 'txt';
  }
}

/**
 * Helper function to get language from file extension
 */
function getLanguageFromExtension(ext: string): Language {
  switch (ext) {
    case 'py':
      return Language.Python;
    case 'js':
    case 'jsx':
      return Language.JavaScript;
    case 'ts':
    case 'tsx':
      return Language.TypeScript;
    case 'java':
      return Language.Java;
    case 'go':
      return Language.Go;
    default:
      return Language.Unknown;
  }
}

