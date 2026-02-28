/**
 * AbstractionFilter: Filters diagram data by abstraction level
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import {
  DiagramData,
  DiagramNode,
  DiagramEdge,
  AbstractionLevel,
} from '../types';
import { ArchitecturalModel } from '../types/analysis';

export class AbstractionFilter {
  /**
   * Filter diagram data by abstraction level
   * Requirement 6.1: Provide at least three abstraction levels
   * Requirement 6.2: Overview shows only top-level components
   * Requirement 6.3: Module shows individual modules
   * Requirement 6.4: Detailed shows classes, functions, and internal dependencies
   */
  filterByLevel(
    diagramData: DiagramData,
    architecturalModel: ArchitecturalModel,
    targetLevel: AbstractionLevel
  ): DiagramData {
    // Filter nodes based on abstraction level from architectural model
    const filteredNodes = this.filterNodes(
      diagramData.nodes,
      architecturalModel,
      targetLevel
    );

    // Get IDs of visible nodes
    const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));

    // Filter edges to only include those between visible nodes
    const filteredEdges = this.filterEdges(diagramData.edges, visibleNodeIds);

    return {
      ...diagramData,
      nodes: filteredNodes,
      edges: filteredEdges,
      abstractionLevel: targetLevel,
    };
  }

  /**
   * Filter nodes by abstraction level
   * Overview (1): Only level 1 components
   * Module (2): Levels 1-2
   * Detailed (3): All levels
   */
  private filterNodes(
    nodes: DiagramNode[],
    architecturalModel: ArchitecturalModel,
    targetLevel: AbstractionLevel
  ): DiagramNode[] {
    // Create a map of component ID to abstraction level
    const componentLevels = new Map<string, AbstractionLevel>();
    for (const component of architecturalModel.components) {
      componentLevels.set(component.id, component.abstractionLevel);
    }

    // Filter nodes based on their abstraction level
    return nodes.filter((node) => {
      const nodeLevel = componentLevels.get(node.id);
      if (nodeLevel === undefined) {
        // If level not found, include by default
        return true;
      }

      // Include node if its level is <= target level
      return nodeLevel <= targetLevel;
    });
  }

  /**
   * Filter edges to preserve relationships between visible components
   * Requirement 6.4: Preserve relationships between visible components
   */
  private filterEdges(
    edges: DiagramEdge[],
    visibleNodeIds: Set<string>
  ): DiagramEdge[] {
    return edges.filter(
      (edge) =>
        visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  }

  /**
   * Get overview level diagram (level 1 only)
   * Requirement 6.2: Show only top-level components and major dependencies
   */
  getOverviewLevel(
    diagramData: DiagramData,
    architecturalModel: ArchitecturalModel
  ): DiagramData {
    return this.filterByLevel(
      diagramData,
      architecturalModel,
      AbstractionLevel.Overview
    );
  }

  /**
   * Get module level diagram (levels 1-2)
   * Requirement 6.3: Show individual modules and their public interfaces
   */
  getModuleLevel(
    diagramData: DiagramData,
    architecturalModel: ArchitecturalModel
  ): DiagramData {
    return this.filterByLevel(
      diagramData,
      architecturalModel,
      AbstractionLevel.Module
    );
  }

  /**
   * Get detailed level diagram (all levels)
   * Requirement 6.4: Show classes, functions, and internal dependencies
   */
  getDetailedLevel(
    diagramData: DiagramData,
    architecturalModel: ArchitecturalModel
  ): DiagramData {
    return this.filterByLevel(
      diagramData,
      architecturalModel,
      AbstractionLevel.Detailed
    );
  }
}
