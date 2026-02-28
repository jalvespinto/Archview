/**
 * GroundingDataBuilder - Converts raw Component[] and Relationship[] into compact GroundingData
 * Requirements: 1.2, 1.3, 2.5
 * 
 * Responsibilities:
 * - Build DirectoryNode tree from file paths
 * - Convert Component[] to FileGroundingData[]
 * - Resolve import paths where possible (relative → absolute)
 * - Build ImportEdge[] and InheritanceEdge[] from Relationship[]
 * - Validate grounding data integrity
 */

import * as path from 'path';
import {
  GroundingData,
  DirectoryNode,
  FileGroundingData,
  ClassGroundingData,
  FunctionGroundingData,
  ImportRef,
  ImportEdge,
  InheritanceEdge
} from '../types/analysis';
import {
  Component,
  ComponentType,
  Relationship,
  RelationshipType,
  Language
} from '../types';

/**
 * Validation result for grounding data
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Builds compact GroundingData structure from raw analysis results
 */
export class GroundingDataBuilder {
  /**
   * Build GroundingData from components and relationships
   * @param rootPath Root path of the codebase
   * @param components Extracted components
   * @param relationships Extracted relationships
   * @returns Compact GroundingData structure
   */
  buildGroundingData(
    rootPath: string,
    components: Component[],
    relationships: Relationship[]
  ): GroundingData {
    // Build directory tree from file paths
    const allFilePaths = this.extractAllFilePaths(components);
    const directoryTree = this.buildDirectoryTree(rootPath, allFilePaths);

    // Convert components to FileGroundingData
    const files = this.buildFileGroundingData(components);

    // Build import graph from relationships
    const importGraph = this.buildImportGraph(relationships, components);

    // Build inheritance graph from relationships
    const inheritanceGraph = this.buildInheritanceGraph(relationships, components);

    const groundingData: GroundingData = {
      rootPath,
      timestamp: Date.now(),
      directoryTree,
      files,
      importGraph,
      inheritanceGraph
    };

    return groundingData;
  }

  /**
   * Extract all unique file paths from components
   */
  private extractAllFilePaths(components: Component[]): string[] {
    const filePathSet = new Set<string>();
    
    for (const component of components) {
      for (const filePath of component.filePaths) {
        filePathSet.add(filePath);
      }
    }

    return Array.from(filePathSet).sort();
  }

  /**
   * Build directory tree from file paths
   * Creates a hierarchical structure representing the directory layout
   */
  buildDirectoryTree(rootPath: string, filePaths: string[]): DirectoryNode {
    const root: DirectoryNode = {
      name: path.basename(rootPath) || 'root',
      path: rootPath,
      children: [],
      files: []
    };

    // Build tree structure
    for (const filePath of filePaths) {
      const relativePath = path.relative(rootPath, filePath);
      const parts = relativePath.split(path.sep);
      
      let currentNode = root;
      
      // Navigate/create directory nodes
      for (let i = 0; i < parts.length - 1; i++) {
        const dirName = parts[i];
        let childNode = currentNode.children.find(child => child.name === dirName);
        
        if (!childNode) {
          const dirPath = path.join(rootPath, ...parts.slice(0, i + 1));
          childNode = {
            name: dirName,
            path: dirPath,
            children: [],
            files: []
          };
          currentNode.children.push(childNode);
        }
        
        currentNode = childNode;
      }
      
      // Add file to the final directory node
      currentNode.files.push(filePath);
    }

    // Sort children and files for consistency
    this.sortDirectoryTree(root);

    return root;
  }

  /**
   * Sort directory tree recursively for consistent output
   */
  private sortDirectoryTree(node: DirectoryNode): void {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.files.sort();
    
    for (const child of node.children) {
      this.sortDirectoryTree(child);
    }
  }

  /**
   * Build FileGroundingData array from components
   * Groups components by file and extracts relevant metadata
   */
  private buildFileGroundingData(components: Component[]): FileGroundingData[] {
    // Group components by file path
    const fileComponentMap = new Map<string, Component[]>();
    
    for (const component of components) {
      for (const filePath of component.filePaths) {
        if (!fileComponentMap.has(filePath)) {
          fileComponentMap.set(filePath, []);
        }
        fileComponentMap.get(filePath)!.push(component);
      }
    }

    // Build FileGroundingData for each file
    const files: FileGroundingData[] = [];
    
    for (const [filePath, fileComponents] of fileComponentMap.entries()) {
      const fileData = this.buildFileData(filePath, fileComponents);
      files.push(fileData);
    }

    return files.sort((a, b) => a.path.localeCompare(b.path));
  }

  /**
   * Build FileGroundingData for a single file
   */
  private buildFileData(filePath: string, components: Component[]): FileGroundingData {
    // Find the module/package component (top-level)
    const moduleComponent = components.find(
      c => c.type === ComponentType.Module || c.type === ComponentType.Package
    );

    const language = moduleComponent?.language || Language.Unknown;

    // Extract exports (top-level classes and functions)
    const exports: string[] = [];
    const classes: ClassGroundingData[] = [];
    const topLevelFunctions: FunctionGroundingData[] = [];

    for (const component of components) {
      // Skip the module/package component itself
      if (component.type === ComponentType.Module || component.type === ComponentType.Package) {
        continue;
      }

      // Extract classes
      if (component.type === ComponentType.Class || component.type === ComponentType.Interface) {
        const classData = this.buildClassData(component, components);
        classes.push(classData);
        exports.push(component.name);
      }

      // Extract top-level functions (not methods)
      if (component.type === ComponentType.Function) {
        // Check if this is a top-level function (parent is module/package)
        const isTopLevel = component.parent === moduleComponent?.id;
        
        if (isTopLevel) {
          const funcData = this.buildFunctionData(component);
          topLevelFunctions.push(funcData);
          exports.push(component.name);
        }
      }
    }

    // Extract imports (will be populated from relationships later)
    const imports: ImportRef[] = [];

    return {
      path: filePath,
      language,
      exports,
      classes,
      topLevelFunctions,
      imports
    };
  }

  /**
   * Build ClassGroundingData from a class component
   */
  private buildClassData(classComponent: Component, allComponents: Component[]): ClassGroundingData {
    // Extract method names from child components
    const methods: string[] = [];
    
    for (const childId of classComponent.children) {
      const childComponent = allComponents.find(c => c.id === childId);
      if (childComponent && childComponent.type === ComponentType.Function) {
        // Extract just the method name (remove class prefix if present)
        const methodName = childComponent.name.includes('.')
          ? childComponent.name.split('.').pop()!
          : childComponent.name;
        methods.push(methodName);
      }
    }

    return {
      name: classComponent.name,
      methods: methods.length > 0 ? methods : undefined
    };
  }

  /**
   * Build FunctionGroundingData from a function component
   */
  private buildFunctionData(funcComponent: Component): FunctionGroundingData {
    return {
      name: funcComponent.name
    };
  }

  /**
   * Build import graph from relationships
   * Converts Import relationships to ImportEdge[]
   */
  buildImportGraph(relationships: Relationship[], components: Component[]): ImportEdge[] {
    const importEdges: ImportEdge[] = [];
    const componentMap = new Map(components.map(c => [c.id, c]));

    // Filter import/dependency relationships
    const importRelationships = relationships.filter(
      r => r.type === RelationshipType.Import || r.type === RelationshipType.Dependency
    );

    for (const rel of importRelationships) {
      const sourceComponent = componentMap.get(rel.source);
      const targetComponent = componentMap.get(rel.target);

      if (!sourceComponent || !targetComponent) {
        continue;
      }

      // Get file paths
      const sourceFile = sourceComponent.filePaths[0];
      const targetFile = targetComponent.filePaths[0];

      if (!sourceFile || !targetFile) {
        continue;
      }

      // Resolve target path (relative → absolute where possible)
      const resolvedTargetFile = this.resolveImportPath(sourceFile, targetFile);

      // Extract imported symbols (use target component name as symbol)
      const symbols = [targetComponent.name];

      importEdges.push({
        sourceFile,
        targetFile: resolvedTargetFile,
        symbols
      });
    }

    return importEdges;
  }

  /**
   * Build inheritance graph from relationships
   * Converts Inheritance relationships to InheritanceEdge[]
   */
  buildInheritanceGraph(relationships: Relationship[], components: Component[]): InheritanceEdge[] {
    const inheritanceEdges: InheritanceEdge[] = [];
    const componentMap = new Map(components.map(c => [c.id, c]));

    // Filter inheritance relationships
    const inheritanceRelationships = relationships.filter(
      r => r.type === RelationshipType.Inheritance
    );

    for (const rel of inheritanceRelationships) {
      const childComponent = componentMap.get(rel.source);
      const parentComponent = componentMap.get(rel.target);

      if (!childComponent || !parentComponent) {
        continue;
      }

      // Only include class/interface inheritance
      if (
        childComponent.type !== ComponentType.Class &&
        childComponent.type !== ComponentType.Interface
      ) {
        continue;
      }

      const sourceFile = childComponent.filePaths[0];
      if (!sourceFile) {
        continue;
      }

      // Determine inheritance type (extends vs implements)
      // For now, default to 'extends' - this could be enhanced with more AST analysis
      const type: 'extends' | 'implements' = 
        parentComponent.type === ComponentType.Interface ? 'implements' : 'extends';

      inheritanceEdges.push({
        childClass: childComponent.name,
        parentClass: parentComponent.name,
        sourceFile,
        type
      });
    }

    return inheritanceEdges;
  }

  /**
   * Resolve import path from relative to absolute where possible
   * @param sourceFile The file doing the importing
   * @param targetFile The file being imported
   * @returns Resolved absolute path or original if resolution fails
   */
  resolveImportPath(sourceFile: string, targetFile: string): string {
    // If target is already absolute, return as-is
    if (path.isAbsolute(targetFile)) {
      return targetFile;
    }

    try {
      // Try to resolve relative to source file directory
      const sourceDir = path.dirname(sourceFile);
      const resolved = path.resolve(sourceDir, targetFile);
      return resolved;
    } catch (error) {
      // If resolution fails, return original
      return targetFile;
    }
  }

  /**
   * Validate grounding data integrity
   * Checks for common issues and inconsistencies
   */
  validateGroundingData(groundingData: GroundingData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate root path
    if (!groundingData.rootPath) {
      errors.push('Missing root path');
    }

    // Validate directory tree
    if (!groundingData.directoryTree) {
      errors.push('Missing directory tree');
    } else {
      const treeValidation = this.validateDirectoryTree(groundingData.directoryTree);
      errors.push(...treeValidation.errors);
      warnings.push(...treeValidation.warnings);
    }

    // Validate files
    if (!groundingData.files || groundingData.files.length === 0) {
      warnings.push('No files in grounding data');
    } else {
      // Check for duplicate file paths
      const filePaths = new Set<string>();
      for (const file of groundingData.files) {
        if (filePaths.has(file.path)) {
          errors.push(`Duplicate file path: ${file.path}`);
        }
        filePaths.add(file.path);

        // Validate file data
        if (!file.language || file.language === Language.Unknown) {
          warnings.push(`Missing language for file: ${file.path}`);
        }
      }
    }

    // Validate import graph
    if (groundingData.importGraph) {
      const filePathSet = new Set(groundingData.files.map(f => f.path));
      
      for (const edge of groundingData.importGraph) {
        if (!filePathSet.has(edge.sourceFile)) {
          warnings.push(`Import edge references unknown source file: ${edge.sourceFile}`);
        }
        
        if (!edge.symbols || edge.symbols.length === 0) {
          warnings.push(`Import edge has no symbols: ${edge.sourceFile} → ${edge.targetFile}`);
        }
      }
    }

    // Validate inheritance graph
    if (groundingData.inheritanceGraph) {
      const filePathSet = new Set(groundingData.files.map(f => f.path));
      
      for (const edge of groundingData.inheritanceGraph) {
        if (!filePathSet.has(edge.sourceFile)) {
          warnings.push(`Inheritance edge references unknown source file: ${edge.sourceFile}`);
        }
        
        if (!edge.childClass || !edge.parentClass) {
          errors.push('Inheritance edge missing class names');
        }
        
        if (edge.type !== 'extends' && edge.type !== 'implements') {
          errors.push(`Invalid inheritance type: ${edge.type}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate directory tree structure
   */
  private validateDirectoryTree(node: DirectoryNode): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!node.name) {
      errors.push('Directory node missing name');
    }

    if (!node.path) {
      errors.push('Directory node missing path');
    }

    // Check for circular references in children
    const visited = new Set<string>();
    const checkCircular = (n: DirectoryNode): boolean => {
      if (visited.has(n.path)) {
        errors.push(`Circular reference detected in directory tree: ${n.path}`);
        return true;
      }
      visited.add(n.path);

      for (const child of n.children) {
        if (checkCircular(child)) {
          return true;
        }
      }

      return false;
    };

    checkCircular(node);

    // Recursively validate children
    for (const child of node.children) {
      const childValidation = this.validateDirectoryTree(child);
      errors.push(...childValidation.errors);
      warnings.push(...childValidation.warnings);
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
