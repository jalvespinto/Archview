/**
 * Data validation utilities for AI Architecture Diagram Extension
 * Requirements: 10.1, 10.2
 */

import {
  AnalysisResult,
  DiagramData,
  ValidationResult,
  Component
} from './index';

export class DataValidator {
  /**
   * Validates an AnalysisResult for structural integrity
   * Requirements: 10.1, 10.2
   */
  validateAnalysisResult(result: AnalysisResult): ValidationResult {
    const errors: string[] = [];

    if (!result.components || result.components.length === 0) {
      errors.push('No components found in analysis');
    }

    if (!result.components) {
      return { valid: false, errors };
    }

    const componentIds = new Set(result.components.map(c => c.id));
    this.validateRelationshipReferences(result.relationships ?? [], componentIds, errors);
    this.validateComponentHierarchyReferences(result.components, componentIds, errors);
    if (this.hasCycles(result.components)) {
      errors.push('Circular parent-child relationships detected');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validates DiagramData for structural integrity
   * Requirements: 10.1, 10.2
   */
  validateDiagramData(data: DiagramData): ValidationResult {
    const errors: string[] = [];

    // Check required fields
    if (!data.nodes || data.nodes.length === 0) {
      errors.push('No nodes found in diagram data');
    }

    if (!data.nodes) {
      return { valid: false, errors };
    }

    // Build node ID set for edge validation
    const nodeIds = new Set(data.nodes.map(n => n.id));

    // Validate edge references
    for (const edge of data.edges || []) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target: ${edge.target}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private validateRelationshipReferences(
    relationships: AnalysisResult['relationships'],
    componentIds: Set<string>,
    errors: string[]
  ): void {
    for (const rel of relationships) {
      if (!componentIds.has(rel.source)) {
        errors.push(`Invalid source reference in relationship ${rel.id}: ${rel.source}`);
      }

      if (!componentIds.has(rel.target)) {
        errors.push(`Invalid target reference in relationship ${rel.id}: ${rel.target}`);
      }
    }
  }

  private validateComponentHierarchyReferences(
    components: Component[],
    componentIds: Set<string>,
    errors: string[]
  ): void {
    for (const component of components) {
      if (component.parent && !componentIds.has(component.parent)) {
        errors.push(`Invalid parent reference in component ${component.id}: ${component.parent}`);
      }

      for (const childId of component.children || []) {
        if (!componentIds.has(childId)) {
          errors.push(`Invalid child reference in component ${component.id}: ${childId}`);
        }
      }
    }
  }

  /**
   * Detects cycles in parent-child component relationships using DFS
   * Requirements: 10.1
   */
  private hasCycles(components: Component[]): boolean {
    const componentMap = new Map(components.map(c => [c.id, c]));
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (componentId: string): boolean => {
      if (recursionStack.has(componentId)) {
        return true; // Cycle detected
      }

      if (visited.has(componentId)) {
        return false; // Already processed
      }

      visited.add(componentId);
      recursionStack.add(componentId);

      const component = componentMap.get(componentId);
      if (component) {
        // Check parent relationship
        if (component.parent && detectCycle(component.parent)) {
          return true;
        }

        // Check children relationships
        for (const childId of component.children || []) {
          if (detectCycle(childId)) {
            return true;
          }
        }
      }

      recursionStack.delete(componentId);
      return false;
    };

    // Check all components as potential cycle entry points
    for (const component of components) {
      if (!visited.has(component.id)) {
        if (detectCycle(component.id)) {
          return true;
        }
      }
    }

    return false;
  }
}
