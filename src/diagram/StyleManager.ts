/**
 * StyleManager: Manages visual styling for diagram nodes and edges
 * Requirements: 2.5, 12.2
 */

import {
  Language,
  ComponentType,
  RelationshipType,
  NodeStyle,
  EdgeStyle,
} from '../types';

export class StyleManager {
  /**
   * Get node style based on language and component type
   * Requirement 12.2: Language-based color coding
   * Requirement 2.5: Component type-based shapes
   * Requirement 12.3: Add language icons to nodes
   */
  getNodeStyle(language: Language, componentType: ComponentType): NodeStyle {
    return {
      color: this.getLanguageColor(language),
      shape: this.getComponentShape(componentType),
      size: this.getComponentSize(componentType),
      borderWidth: 2,
      languageIcon: this.getLanguageIcon(language),
    };
  }

  /**
   * Get edge style based on relationship type
   * Requirement 2.5: Relationship type-based edge styling
   */
  getEdgeStyle(relationshipType: RelationshipType): EdgeStyle {
    return {
      color: this.getRelationshipColor(relationshipType),
      width: this.getRelationshipWidth(relationshipType),
      lineStyle: this.getRelationshipLineStyle(relationshipType),
      arrow: true,
    };
  }

  /**
   * Get color for programming language
   * Requirement 12.2: Visual distinction by language
   */
  private getLanguageColor(language: Language): string {
    switch (language) {
      case Language.Python:
        return '#3776ab'; // Python blue
      case Language.JavaScript:
        return '#f7df1e'; // JavaScript yellow
      case Language.TypeScript:
        return '#3178c6'; // TypeScript blue
      case Language.Java:
        return '#007396'; // Java blue
      case Language.Go:
        return '#00add8'; // Go cyan
      case Language.Unknown:
      default:
        return '#808080'; // Gray for unknown
    }
  }

  /**
   * Get icon identifier for programming language
   * Requirement 12.3: Add language icons to diagram nodes
   */
  private getLanguageIcon(language: Language): string {
    switch (language) {
      case Language.Python:
        return 'python';
      case Language.JavaScript:
        return 'javascript';
      case Language.TypeScript:
        return 'typescript';
      case Language.Java:
        return 'java';
      case Language.Go:
        return 'go';
      case Language.Unknown:
      default:
        return 'file'; // Generic file icon for unknown languages
    }
  }

  /**
   * Get shape for component type
   * Requirement 2.5: Component type-based shapes
   */
  private getComponentShape(
    componentType: ComponentType
  ): 'rectangle' | 'ellipse' | 'hexagon' {
    switch (componentType) {
      case ComponentType.Package:
      case ComponentType.Module:
        return 'rectangle';
      case ComponentType.Service:
        return 'hexagon';
      case ComponentType.Class:
      case ComponentType.Interface:
        return 'rectangle';
      case ComponentType.Function:
        return 'ellipse';
      default:
        return 'rectangle';
    }
  }

  /**
   * Get size for component type
   */
  private getComponentSize(componentType: ComponentType): number {
    switch (componentType) {
      case ComponentType.Package:
        return 80;
      case ComponentType.Module:
        return 60;
      case ComponentType.Service:
        return 70;
      case ComponentType.Class:
        return 50;
      case ComponentType.Interface:
        return 50;
      case ComponentType.Function:
        return 40;
      default:
        return 50;
    }
  }

  /**
   * Get color for relationship type
   */
  private getRelationshipColor(relationshipType: RelationshipType): string {
    switch (relationshipType) {
      case RelationshipType.Import:
        return '#666666';
      case RelationshipType.Dependency:
        return '#4a90e2';
      case RelationshipType.Inheritance:
        return '#e24a4a';
      case RelationshipType.Composition:
        return '#4ae290';
      case RelationshipType.FunctionCall:
        return '#9b59b6';
      default:
        return '#666666';
    }
  }

  /**
   * Get width for relationship type
   */
  private getRelationshipWidth(relationshipType: RelationshipType): number {
    switch (relationshipType) {
      case RelationshipType.Inheritance:
        return 3;
      case RelationshipType.Composition:
        return 2.5;
      case RelationshipType.Dependency:
        return 2;
      case RelationshipType.Import:
      case RelationshipType.FunctionCall:
        return 1.5;
      default:
        return 2;
    }
  }

  /**
   * Get line style for relationship type
   * Requirement 2.5: Relationship type-based edge styling (solid, dashed, dotted)
   */
  private getRelationshipLineStyle(
    relationshipType: RelationshipType
  ): 'solid' | 'dashed' | 'dotted' {
    switch (relationshipType) {
      case RelationshipType.Inheritance:
      case RelationshipType.Composition:
        return 'solid';
      case RelationshipType.Dependency:
        return 'dashed';
      case RelationshipType.Import:
      case RelationshipType.FunctionCall:
        return 'dotted';
      default:
        return 'solid';
    }
  }
}
