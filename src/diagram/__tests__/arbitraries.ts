/**
 * Fast-check arbitraries for property-based testing
 * Generates random valid test data for diagram generation
 */

import * as fc from 'fast-check';
import {
  ArchitecturalModel,
  ArchitecturalComponent,
  ArchitecturalRelationship,
  ArchitecturalModelMetadata,
} from '../../types/analysis';
import {
  AbstractionLevel,
  RelationshipType,
  Language,
  DiagramData,
  DiagramNode,
  DiagramEdge,
  ComponentType,
} from '../../types';

/**
 * Generate random abstraction level
 */
export const arbitraryAbstractionLevel = (): fc.Arbitrary<AbstractionLevel> =>
  fc.constantFrom(
    AbstractionLevel.Overview,
    AbstractionLevel.Module,
    AbstractionLevel.Detailed
  );

/**
 * Generate random relationship type
 */
export const arbitraryRelationshipType = (): fc.Arbitrary<RelationshipType> =>
  fc.constantFrom(
    RelationshipType.Import,
    RelationshipType.Dependency,
    RelationshipType.Inheritance,
    RelationshipType.Composition,
    RelationshipType.FunctionCall
  );

/**
 * Generate random language
 */
export const arbitraryLanguage = (): fc.Arbitrary<Language> =>
  fc.constantFrom(
    Language.Python,
    Language.JavaScript,
    Language.TypeScript,
    Language.Java,
    Language.Go,
    Language.Unknown
  );

/**
 * Generate random file path
 */
export const arbitraryFilePath = (): fc.Arbitrary<string> =>
  fc
    .tuple(
      fc.array(fc.stringMatching(/^[a-z]+$/), { minLength: 1, maxLength: 3 }),
      fc.stringMatching(/^[a-z]+$/),
      fc.constantFrom('ts', 'js', 'py', 'java', 'go')
    )
    .map(([dirs, name, ext]) => `${dirs.join('/')}/${name}.${ext}`);

/**
 * Generate random architectural component
 */
export const arbitraryArchitecturalComponent = (
  id?: string
): fc.Arbitrary<ArchitecturalComponent> =>
  fc.record({
    id: id ? fc.constant(id) : fc.uuid(),
    name: fc.stringMatching(/^[A-Z][a-zA-Z]+$/),
    description: fc.lorem({ maxCount: 10 }),
    role: fc.constantFrom(
      'control plane',
      'data access layer',
      'auth module',
      'api gateway',
      'business logic'
    ),
    filePaths: fc.array(arbitraryFilePath(), { minLength: 1, maxLength: 5 }),
    abstractionLevel: arbitraryAbstractionLevel(),
    subComponents: fc.constant([]), // Will be populated later
    parent: fc.constant(null), // Will be populated later
  });

/**
 * Generate random architectural relationship
 */
export const arbitraryArchitecturalRelationship = (
  componentIds: string[]
): fc.Arbitrary<ArchitecturalRelationship> => {
  if (componentIds.length < 2) {
    // Need at least 2 components for a relationship
    // Return a valid relationship using the same ID for source and target (self-reference)
    const singleId = componentIds[0] || 'default-id';
    return fc.record({
      id: fc.uuid(),
      sourceId: fc.constant(singleId),
      targetId: fc.constant(singleId),
      type: arbitraryRelationshipType(),
      description: fc.lorem({ maxCount: 5 }),
      strength: fc.double({ min: 0, max: 1 }),
    });
  }

  return fc.record({
    id: fc.uuid(),
    sourceId: fc.constantFrom(...componentIds),
    targetId: fc.constantFrom(...componentIds),
    type: arbitraryRelationshipType(),
    description: fc.lorem({ maxCount: 5 }),
    strength: fc.double({ min: 0, max: 1 }),
  });
};

/**
 * Generate random architectural model metadata
 */
export const arbitraryArchitecturalModelMetadata =
  (): fc.Arbitrary<ArchitecturalModelMetadata> =>
    fc.record({
      llmInferenceTimeMs: fc.integer({ min: 100, max: 30000 }),
      tierUsed: fc.constantFrom(1, 2, 3) as fc.Arbitrary<1 | 2 | 3>,
      confidence: fc.constantFrom('high', 'medium', 'low') as fc.Arbitrary<
        'high' | 'medium' | 'low'
      >,
      filesAnalyzed: fc.integer({ min: 1, max: 1000 }),
    });

/**
 * Generate random architectural model
 */
export const arbitraryArchitecturalModel =
  (): fc.Arbitrary<ArchitecturalModel> =>
    fc
      .tuple(
        fc.integer({ min: 1, max: 20 }), // number of components
        fc.integer({ min: 0, max: 30 }) // number of relationships
      )
      .chain(([numComponents, numRelationships]) =>
        fc
          .array(arbitraryArchitecturalComponent(), {
            minLength: numComponents,
            maxLength: numComponents,
          })
          .chain((components) => {
            const componentIds = components.map((c) => c.id);
            return fc.record({
              components: fc.constant(components),
              relationships: fc.array(
                arbitraryArchitecturalRelationship(componentIds),
                { minLength: 0, maxLength: numRelationships }
              ),
              patterns: fc.array(
                fc.constantFrom('MVC', 'microservices', 'layered', 'CQRS'),
                { maxLength: 3 }
              ),
              metadata: arbitraryArchitecturalModelMetadata(),
            });
          })
      );

/**
 * Generate random component type
 */
export const arbitraryComponentType = (): fc.Arbitrary<ComponentType> =>
  fc.constantFrom(
    ComponentType.Package,
    ComponentType.Module,
    ComponentType.Class,
    ComponentType.Function,
    ComponentType.Service,
    ComponentType.Interface
  );

/**
 * Generate random diagram node
 */
export const arbitraryDiagramNode = (id?: string): fc.Arbitrary<DiagramNode> =>
  fc.record({
    id: id ? fc.constant(id) : fc.uuid(),
    label: fc.stringMatching(/^[A-Z][a-zA-Z]+$/),
    type: arbitraryComponentType(),
    language: arbitraryLanguage(),
    filePaths: fc.array(arbitraryFilePath(), { minLength: 1, maxLength: 5 }),
    position: fc.option(
      fc.record({
        x: fc.integer({ min: 0, max: 1000 }),
        y: fc.integer({ min: 0, max: 1000 }),
      }),
      { nil: undefined }
    ),
    style: fc.record({
      color: fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
      shape: fc.constantFrom('rectangle', 'ellipse', 'hexagon') as fc.Arbitrary<
        'rectangle' | 'ellipse' | 'hexagon'
      >,
      size: fc.integer({ min: 20, max: 100 }),
      borderWidth: fc.integer({ min: 1, max: 5 }),
    }),
  });

/**
 * Generate random diagram edge
 */
export const arbitraryDiagramEdge = (
  nodeIds: string[]
): fc.Arbitrary<DiagramEdge> => {
  if (nodeIds.length < 2) {
    // Use the same ID for source and target (self-reference)
    const singleId = nodeIds[0] || 'default-id';
    return fc.record({
      id: fc.uuid(),
      source: fc.constant(singleId),
      target: fc.constant(singleId),
      type: arbitraryRelationshipType(),
      style: fc.record({
        color: fc
          .hexaString({ minLength: 6, maxLength: 6 })
          .map((s) => `#${s}`),
        width: fc.integer({ min: 1, max: 5 }),
        lineStyle: fc.constantFrom('solid', 'dashed', 'dotted') as fc.Arbitrary<
          'solid' | 'dashed' | 'dotted'
        >,
        arrow: fc.boolean(),
      }),
    });
  }

  return fc.record({
    id: fc.uuid(),
    source: fc.constantFrom(...nodeIds),
    target: fc.constantFrom(...nodeIds),
    type: arbitraryRelationshipType(),
    style: fc.record({
      color: fc.hexaString({ minLength: 6, maxLength: 6 }).map((s) => `#${s}`),
      width: fc.integer({ min: 1, max: 5 }),
      lineStyle: fc.constantFrom('solid', 'dashed', 'dotted') as fc.Arbitrary<
        'solid' | 'dashed' | 'dotted'
      >,
      arrow: fc.boolean(),
    }),
  });
};

/**
 * Generate random diagram data
 */
export const arbitraryDiagramData = (): fc.Arbitrary<DiagramData> =>
  fc
    .tuple(
      fc.integer({ min: 1, max: 20 }), // number of nodes
      fc.integer({ min: 0, max: 30 }) // number of edges
    )
    .chain(([numNodes, numEdges]) =>
      fc
        .array(arbitraryDiagramNode(), {
          minLength: numNodes,
          maxLength: numNodes,
        })
        .chain((nodes) => {
          const nodeIds = nodes.map((n) => n.id);
          return fc.record({
            nodes: fc.constant(nodes),
            edges: fc.array(arbitraryDiagramEdge(nodeIds), {
              minLength: 0,
              maxLength: numEdges,
            }),
            layout: fc.record({
              algorithm: fc.constantFrom('dagre', 'cose', 'breadthfirst') as fc.Arbitrary<
                'dagre' | 'cose' | 'breadthfirst'
              >,
              spacing: fc.integer({ min: 10, max: 100 }),
              direction: fc.constantFrom('TB', 'LR') as fc.Arbitrary<
                'TB' | 'LR'
              >,
            }),
            abstractionLevel: arbitraryAbstractionLevel(),
          });
        })
    );
