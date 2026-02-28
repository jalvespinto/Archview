/**
 * DiagramGenerator: Converts ArchitecturalModel to DiagramData
 * Requirements: 2.1, 2.3, 2.4, 2.7, 12.2
 */

import {
  ArchitecturalModel,
  ArchitecturalComponent,
  ArchitecturalRelationship,
} from '../types/analysis';
import {
  DiagramData,
  DiagramNode,
  DiagramEdge,
  AbstractionLevel,
  ComponentType,
  Language,
  RelationshipType,
} from '../types';
import { StyleManager } from './StyleManager';

export class DiagramGenerator {
  private styleManager: StyleManager;
  private readonly GENERATION_TIMEOUT_MS = 60000; // 60 seconds per requirements

  constructor() {
    this.styleManager = new StyleManager();
  }

  /**
   * Generate diagram data from architectural model
   * Requirement 2.1: Create diagram from architectural model
   * Requirement 2.7: Complete rendering within 60 seconds
   */
  async generateDiagram(
    model: ArchitecturalModel,
    abstractionLevel: AbstractionLevel = AbstractionLevel.Overview
  ): Promise<DiagramData> {
    return this.withTimeout(
      this.generateDiagramInternal(model, abstractionLevel),
      this.GENERATION_TIMEOUT_MS,
      'Diagram generation timed out'
    );
  }

  private async generateDiagramInternal(
    model: ArchitecturalModel,
    abstractionLevel: AbstractionLevel
  ): Promise<DiagramData> {
    // Create nodes from architectural components
    // Requirement 2.3: Display components as labeled nodes using LLM-generated names
    const nodes = this.createNodes(model.components);

    // Create edges from architectural relationships
    // Requirement 2.4: Display relationships as directed edges
    const edges = this.createEdges(model.relationships);

    // Default layout configuration
    const layout = {
      algorithm: 'dagre' as const,
      spacing: 50,
      direction: 'TB' as const,
    };

    return {
      nodes,
      edges,
      layout,
      abstractionLevel,
    };
  }

  /**
   * Create diagram nodes from architectural components
   * Requirement 2.3: Use LLM-generated names and descriptions as labels
   * Requirement 12.2: Language-based color coding
   */
  private createNodes(components: ArchitecturalComponent[]): DiagramNode[] {
    return components.map((component) => {
      // Infer language from file paths
      const language = this.inferLanguage(component.filePaths);

      // Infer component type from role and description
      const componentType = this.inferComponentType(component);

      // Get styling based on language and type
      const style = this.styleManager.getNodeStyle(language, componentType);

      return {
        id: component.id,
        label: component.name, // LLM-generated name
        type: componentType,
        language,
        filePaths: component.filePaths,
        style,
      };
    });
  }

  /**
   * Create diagram edges from architectural relationships
   * Requirement 2.4: Reflect LLM-identified dependencies
   */
  private createEdges(
    relationships: ArchitecturalRelationship[]
  ): DiagramEdge[] {
    return relationships.map((relationship) => {
      // Get edge styling based on relationship type
      const style = this.styleManager.getEdgeStyle(relationship.type);

      return {
        id: relationship.id,
        source: relationship.sourceId,
        target: relationship.targetId,
        type: relationship.type,
        style,
      };
    });
  }

  /**
   * Infer language from file paths
   * Requirement 12.2: Detect programming language
   */
  private inferLanguage(filePaths: string[]): Language {
    if (filePaths.length === 0) {
      return Language.Unknown;
    }

    // Count file extensions
    const extensionCounts = new Map<Language, number>();

    for (const filePath of filePaths) {
      const ext = filePath.split('.').pop()?.toLowerCase();
      let language = Language.Unknown;

      switch (ext) {
        case 'py':
          language = Language.Python;
          break;
        case 'js':
        case 'jsx':
          language = Language.JavaScript;
          break;
        case 'ts':
        case 'tsx':
          language = Language.TypeScript;
          break;
        case 'java':
          language = Language.Java;
          break;
        case 'go':
          language = Language.Go;
          break;
      }

      extensionCounts.set(language, (extensionCounts.get(language) || 0) + 1);
    }

    // Return most common language
    let maxCount = 0;
    let dominantLanguage = Language.Unknown;

    extensionCounts.forEach((count, language) => {
      if (count > maxCount) {
        maxCount = count;
        dominantLanguage = language;
      }
    });

    return dominantLanguage;
  }

  /**
   * Infer component type from architectural component
   */
  private inferComponentType(component: ArchitecturalComponent): ComponentType {
    const role = component.role.toLowerCase();
    const name = component.name.toLowerCase();

    // Check for service patterns
    if (role.includes('service') || name.includes('service')) {
      return ComponentType.Service;
    }

    // Check for module/package patterns
    if (
      role.includes('module') ||
      role.includes('package') ||
      role.includes('layer')
    ) {
      return ComponentType.Module;
    }

    // Check for interface patterns
    if (role.includes('interface') || name.startsWith('i')) {
      return ComponentType.Interface;
    }

    // Default based on abstraction level
    switch (component.abstractionLevel) {
      case AbstractionLevel.Overview:
        return ComponentType.Package;
      case AbstractionLevel.Module:
        return ComponentType.Module;
      case AbstractionLevel.Detailed:
        return ComponentType.Class;
      default:
        return ComponentType.Module;
    }
  }

  /**
   * Wrap operation with timeout
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      ),
    ]);
  }
}
