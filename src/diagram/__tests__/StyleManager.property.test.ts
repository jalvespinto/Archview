/**
 * Property-based tests for StyleManager
 * Tests Property 29 from the design document
 */

import * as fc from 'fast-check';
import { StyleManager } from '../StyleManager';
import { DiagramGenerator } from '../DiagramGenerator';
import { Language, ComponentType } from '../../types';
import {
  arbitraryLanguage,
  arbitraryComponentType,
  arbitraryArchitecturalModel,
} from './arbitraries';

describe('StyleManager Property Tests', () => {
  let styleManager: StyleManager;
  let generator: DiagramGenerator;

  beforeEach(() => {
    styleManager = new StyleManager();
    generator = new DiagramGenerator();
  });

  /**
   * Property 29: Language Visual Distinction
   * **Validates: Requirements 12.2**
   *
   * For any component in the diagram, its visual style (color, icon) should reflect
   * its programming language, with different languages having distinct visual representations.
   */
  describe('Property 29: Language Visual Distinction', () => {
    it('should assign distinct colors to different languages', () => {
      fc.assert(
        fc.property(
          arbitraryLanguage(),
          arbitraryLanguage(),
          arbitraryComponentType(),
          (lang1, lang2, componentType) => {
            const style1 = styleManager.getNodeStyle(lang1, componentType);
            const style2 = styleManager.getNodeStyle(lang2, componentType);

            // If languages are different, colors should be different
            if (lang1 !== lang2) {
              expect(style1.color).not.toBe(style2.color);
            } else {
              // Same language should have same color
              expect(style1.color).toBe(style2.color);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently assign the same color to the same language', () => {
      fc.assert(
        fc.property(
          arbitraryLanguage(),
          arbitraryComponentType(),
          arbitraryComponentType(),
          (language, type1, type2) => {
            const style1 = styleManager.getNodeStyle(language, type1);
            const style2 = styleManager.getNodeStyle(language, type2);

            // Same language should always get the same color regardless of component type
            expect(style1.color).toBe(style2.color);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign valid hex color codes', () => {
      fc.assert(
        fc.property(
          arbitraryLanguage(),
          arbitraryComponentType(),
          (language, componentType) => {
            const style = styleManager.getNodeStyle(language, componentType);

            // Color should be a valid hex code
            expect(style.color).toMatch(/^#[0-9a-fA-F]{6}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign distinct colors for all supported languages', () => {
      const languages = [
        Language.Python,
        Language.JavaScript,
        Language.TypeScript,
        Language.Java,
        Language.Go,
        Language.Unknown,
      ];

      const colors = new Set<string>();
      const componentType = ComponentType.Module;

      for (const language of languages) {
        const style = styleManager.getNodeStyle(language, componentType);
        colors.add(style.color);
      }

      // All languages should have distinct colors
      expect(colors.size).toBe(languages.length);
    });

    it('should apply language-based colors in generated diagrams', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          const diagramData = await generator.generateDiagram(model);

          // Each node should have a color based on its language
          for (const node of diagramData.nodes) {
            const expectedStyle = styleManager.getNodeStyle(
              node.language,
              node.type
            );

            expect(node.style.color).toBe(expectedStyle.color);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain visual distinction across multi-language projects', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryArchitecturalModel(), async (model) => {
          const diagramData = await generator.generateDiagram(model);

          // Group nodes by language
          const nodesByLanguage = new Map<Language, typeof diagramData.nodes>();
          for (const node of diagramData.nodes) {
            if (!nodesByLanguage.has(node.language)) {
              nodesByLanguage.set(node.language, []);
            }
            nodesByLanguage.get(node.language)!.push(node);
          }

          // If there are multiple languages, they should have different colors
          if (nodesByLanguage.size > 1) {
            const colors = new Set<string>();
            for (const [language, nodes] of nodesByLanguage) {
              if (nodes.length > 0) {
                colors.add(nodes[0].style.color);
              }
            }

            // Number of distinct colors should equal number of languages
            expect(colors.size).toBe(nodesByLanguage.size);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Component type-based shapes
   */
  describe('Component Type Visual Distinction', () => {
    it('should assign shapes based on component type', () => {
      fc.assert(
        fc.property(
          arbitraryComponentType(),
          arbitraryLanguage(),
          (componentType, language) => {
            const style = styleManager.getNodeStyle(language, componentType);

            // Shape should be one of the valid values
            expect(['rectangle', 'ellipse', 'hexagon']).toContain(style.shape);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should consistently assign the same shape to the same component type', () => {
      fc.assert(
        fc.property(
          arbitraryComponentType(),
          arbitraryLanguage(),
          arbitraryLanguage(),
          (componentType, lang1, lang2) => {
            const style1 = styleManager.getNodeStyle(lang1, componentType);
            const style2 = styleManager.getNodeStyle(lang2, componentType);

            // Same component type should get same shape regardless of language
            expect(style1.shape).toBe(style2.shape);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign appropriate sizes based on component type', () => {
      fc.assert(
        fc.property(
          arbitraryComponentType(),
          arbitraryLanguage(),
          (componentType, language) => {
            const style = styleManager.getNodeStyle(language, componentType);

            // Size should be positive
            expect(style.size).toBeGreaterThan(0);

            // Size should be reasonable (between 20 and 100)
            expect(style.size).toBeGreaterThanOrEqual(20);
            expect(style.size).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Relationship type-based edge styling
   */
  describe('Relationship Type Visual Distinction', () => {
    it('should assign line styles based on relationship type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'import',
            'dependency',
            'inheritance',
            'composition',
            'function_call'
          ),
          (relationshipType) => {
            const style = styleManager.getEdgeStyle(relationshipType as any);

            // Line style should be one of the valid values
            expect(['solid', 'dashed', 'dotted']).toContain(style.lineStyle);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign distinct line styles for different relationship types', () => {
      const inheritanceStyle = styleManager.getEdgeStyle('inheritance' as any);
      const importStyle = styleManager.getEdgeStyle('import' as any);

      // Different relationship types should have different visual characteristics
      // (either different line style, color, or width)
      const isDifferent =
        inheritanceStyle.lineStyle !== importStyle.lineStyle ||
        inheritanceStyle.color !== importStyle.color ||
        inheritanceStyle.width !== importStyle.width;

      expect(isDifferent).toBe(true);
    });

    it('should assign valid colors to edges', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'import',
            'dependency',
            'inheritance',
            'composition',
            'function_call'
          ),
          (relationshipType) => {
            const style = styleManager.getEdgeStyle(relationshipType as any);

            // Color should be a valid hex code
            expect(style.color).toMatch(/^#[0-9a-fA-F]{6}$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should assign positive widths to edges', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'import',
            'dependency',
            'inheritance',
            'composition',
            'function_call'
          ),
          (relationshipType) => {
            const style = styleManager.getEdgeStyle(relationshipType as any);

            // Width should be positive
            expect(style.width).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enable arrows on all edges', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'import',
            'dependency',
            'inheritance',
            'composition',
            'function_call'
          ),
          (relationshipType) => {
            const style = styleManager.getEdgeStyle(relationshipType as any);

            // All edges should have arrows (directed graph)
            expect(style.arrow).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Style consistency
   */
  describe('Style Consistency', () => {
    it('should return the same style for the same inputs', () => {
      fc.assert(
        fc.property(
          arbitraryLanguage(),
          arbitraryComponentType(),
          (language, componentType) => {
            const style1 = styleManager.getNodeStyle(language, componentType);
            const style2 = styleManager.getNodeStyle(language, componentType);

            // Multiple calls with same inputs should return identical styles
            expect(style1).toEqual(style2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have all required style properties', () => {
      fc.assert(
        fc.property(
          arbitraryLanguage(),
          arbitraryComponentType(),
          (language, componentType) => {
            const style = styleManager.getNodeStyle(language, componentType);

            // All required properties should be present
            expect(style.color).toBeDefined();
            expect(style.shape).toBeDefined();
            expect(style.size).toBeDefined();
            expect(style.borderWidth).toBeDefined();

            // Border width should be positive
            expect(style.borderWidth).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
