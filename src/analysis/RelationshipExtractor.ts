/**
 * RelationshipExtractor - Extracts relationships between components from ASTs
 * Requirements: 1.3
 * 
 * Responsibilities:
 * - Extract import/dependency relationships (import statements, require calls)
 * - Extract inheritance relationships (class extends, implements)
 * - Extract function call relationships
 * - Calculate relationship strength based on occurrence count
 */

import Parser from 'tree-sitter';
import {
  Relationship,
  RelationshipType,
  RelationshipMetadata,
  Language,
  Component,
  ComponentType
} from '../types';
import { ParsedAST, ParserManager } from './ParserManager';
import { findNodeInTree } from '../utils/astUtils';

/**
 * Context for relationship extraction
 */
export interface RelationshipExtractionContext {
  ast: ParsedAST;
  components: Component[];
  parserManager: ParserManager;
}

/**
 * Raw relationship data before component mapping
 */
interface RawRelationship {
  sourceFile: string;
  sourceComponentId?: string; // Optional: specific component within the file
  targetIdentifier: string;
  type: RelationshipType;
  occurrences: number;
  nodeStartPosition?: number; // Optional: AST node position to determine source component
}

/**
 * Extracts relationships between architectural components from ASTs
 * Uses language-specific strategies for accurate extraction
 */
export class RelationshipExtractor {
  private relationshipIdCounter = 0;

  /**
   * Extract relationships from a parsed AST
   * @param context Extraction context with AST and components
   * @returns Array of relationships between components
   */
  async extractRelationships(context: RelationshipExtractionContext): Promise<Relationship[]> {
    const { ast } = context;

    // Select extraction strategy based on language
    switch (ast.language) {
      case Language.Python:
        return this.extractPythonRelationships(context);
      case Language.JavaScript:
      case Language.TypeScript:
        return this.extractJavaScriptRelationships(context);
      case Language.Java:
        return this.extractJavaRelationships(context);
      case Language.Go:
        return this.extractGoRelationships(context);
      default:
        return [];
    }
  }

  /**
   * Extract relationships from Python AST
   * Extracts: imports, inheritance, function calls
   */
  /**
     * Extract relationships from Python AST
     * Extracts: imports, inheritance, function calls
     */
    /**
       * Extract relationships from Python AST
       * Extracts: imports, inheritance, function calls
       */
      private extractPythonRelationships(context: RelationshipExtractionContext): Relationship[] {
        const { ast, components, parserManager } = context;
        const rawRelationships: RawRelationship[] = [];
        const rootNode = ast.tree.rootNode;

        // Extract import relationships
        const importNodes = parserManager.extractNodesByType(ast, {
          nodeTypes: ['import_statement', 'import_from_statement']
        });

        for (const importNode of importNodes) {
          const imports = this.extractPythonImports(importNode, ast.sourceCode);
          const treeNode = findNodeInTree(rootNode, importNode);
          const sourceComponentId = treeNode ? this.findContainingComponent(treeNode, components, ast.filePath) : undefined;
          for (const imp of imports) {
            rawRelationships.push({
              sourceFile: ast.filePath,
              sourceComponentId,
              targetIdentifier: imp,
              type: RelationshipType.Import,
              occurrences: 1
            });
          }
        }

        // Extract inheritance relationships
        const classNodes = parserManager.extractNodesByType(ast, {
          nodeTypes: ['class_definition']
        });

        for (const classNode of classNodes) {
          const treeNode = findNodeInTree(rootNode, classNode);
          if (treeNode) {
            const baseClasses = this.extractPythonBaseClasses(treeNode, ast.sourceCode);
            // The source component is the class itself
            const sourceComponentId = this.findContainingComponent(treeNode, components, ast.filePath);
            for (const baseClass of baseClasses) {
              rawRelationships.push({
                sourceFile: ast.filePath,
                sourceComponentId,
                targetIdentifier: baseClass,
                type: RelationshipType.Inheritance,
                occurrences: 1
              });
            }
          }
        }

        // Extract function call relationships
        const callNodes = parserManager.extractNodesByType(ast, {
          nodeTypes: ['call']
        });

        // Track calls per source component
        const callsBySource = new Map<string, Map<string, number>>();

        for (const callNode of callNodes) {
          const treeNode = findNodeInTree(rootNode, callNode);
          if (treeNode) {
            const functionName = this.extractPythonFunctionCall(callNode, ast.sourceCode);
            if (functionName) {
              // Find which component contains this call
              const sourceComponentId = this.findContainingComponent(treeNode, components, ast.filePath);
              if (sourceComponentId) {
                if (!callsBySource.has(sourceComponentId)) {
                  callsBySource.set(sourceComponentId, new Map());
                }
                const calls = callsBySource.get(sourceComponentId)!;
                calls.set(functionName, (calls.get(functionName) || 0) + 1);
              }
            }
          }
        }

        // Create raw relationships from aggregated calls
        for (const [sourceComponentId, calls] of callsBySource.entries()) {
          for (const [functionName, count] of calls.entries()) {
            rawRelationships.push({
              sourceFile: ast.filePath,
              sourceComponentId,
              targetIdentifier: functionName,
              type: RelationshipType.FunctionCall,
              occurrences: count
            });
          }
        }

        // Map raw relationships to components
        return this.mapRelationshipsToComponents(rawRelationships, components);
      }

  /**
   * Extract relationships from JavaScript/TypeScript AST
   * Extracts: imports, inheritance, function calls
   */
  /**
     * Extract relationships from JavaScript/TypeScript AST
     * Extracts: imports, inheritance, function calls
     */
    private extractJavaScriptRelationships(context: RelationshipExtractionContext): Relationship[] {
      const { ast, components, parserManager } = context;
      const rawRelationships: RawRelationship[] = [];
      const rootNode = ast.tree.rootNode;

      // Extract import relationships (ES6 imports and require)
      const importNodes = parserManager.extractNodesByType(ast, {
        nodeTypes: ['import_statement']
      });

      for (const importNode of importNodes) {
        const imports = this.extractJSImports(importNode, ast.sourceCode);
        const treeNode = findNodeInTree(rootNode, importNode);
        const sourceComponentId = treeNode ? this.findContainingComponent(treeNode, components, ast.filePath) : undefined;
        for (const imp of imports) {
          rawRelationships.push({
            sourceFile: ast.filePath,
            sourceComponentId,
            targetIdentifier: imp,
            type: RelationshipType.Import,
            occurrences: 1
          });
        }
      }

      // Extract require() calls
      const callNodes = parserManager.extractNodesByType(ast, {
        nodeTypes: ['call_expression', 'ERROR']
      });

      for (const callNode of callNodes) {
        const treeNode = findNodeInTree(rootNode, callNode);
        if (treeNode) {
          const requirePath = this.extractJSRequire(treeNode, ast.sourceCode);
          if (requirePath) {
            const sourceComponentId = this.findContainingComponent(treeNode, components, ast.filePath);
            rawRelationships.push({
              sourceFile: ast.filePath,
              sourceComponentId,
              targetIdentifier: requirePath,
              type: RelationshipType.Import,
              occurrences: 1
            });
          }
        }
      }

      // Extract inheritance relationships (extends, implements)
      const classNodes = parserManager.extractNodesByType(ast, {
        nodeTypes: ['class_declaration', 'class']
      });

      for (const classNode of classNodes) {
        const treeNode = findNodeInTree(rootNode, classNode);
        if (treeNode) {
          const sourceComponentId = this.findContainingComponent(treeNode, components, ast.filePath);
          const extendsClass = this.extractJSExtends(treeNode, ast.sourceCode);
          if (extendsClass) {
            rawRelationships.push({
              sourceFile: ast.filePath,
              sourceComponentId,
              targetIdentifier: extendsClass,
              type: RelationshipType.Inheritance,
              occurrences: 1
            });
          }

          // TypeScript implements
          if (ast.language === Language.TypeScript) {
            const implementsInterfaces = this.extractTSImplements(treeNode, ast.sourceCode);
            for (const iface of implementsInterfaces) {
              rawRelationships.push({
                sourceFile: ast.filePath,
                sourceComponentId,
                targetIdentifier: iface,
                type: RelationshipType.Inheritance,
                occurrences: 1
              });
            }
          }
        }
      }

      // Extract function call relationships
      // Track calls per source component
      const callsBySource = new Map<string, Map<string, number>>();

      for (const callNode of callNodes) {
        const treeNode = findNodeInTree(rootNode, callNode);
        if (treeNode) {
          const functionName = this.extractJSFunctionCall(treeNode, ast.sourceCode);
          if (functionName) {
            // Find which component contains this call
            const sourceComponentId = this.findContainingComponent(treeNode, components, ast.filePath);
            if (sourceComponentId) {
              if (!callsBySource.has(sourceComponentId)) {
                callsBySource.set(sourceComponentId, new Map());
              }
              const calls = callsBySource.get(sourceComponentId)!;
              calls.set(functionName, (calls.get(functionName) || 0) + 1);
            }
          }
        }
      }

      // Create raw relationships from aggregated calls
      for (const [sourceComponentId, calls] of callsBySource.entries()) {
        for (const [functionName, count] of calls.entries()) {
          rawRelationships.push({
            sourceFile: ast.filePath,
            sourceComponentId,
            targetIdentifier: functionName,
            type: RelationshipType.FunctionCall,
            occurrences: count
          });
        }
      }

      return this.mapRelationshipsToComponents(rawRelationships, components);
    }

  /**
   * Extract relationships from Java AST
   * Extracts: imports, inheritance, function calls
   */
  private extractJavaRelationships(context: RelationshipExtractionContext): Relationship[] {
    const { ast, components, parserManager } = context;
    const rawRelationships: RawRelationship[] = [];
    const rootNode = ast.tree.rootNode;

    // Extract import relationships
    const importNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['import_declaration']
    });

    for (const importNode of importNodes) {
      const importPath = this.extractJavaImport(importNode, ast.sourceCode);
      if (importPath) {
        rawRelationships.push({
          sourceFile: ast.filePath,
          targetIdentifier: importPath,
          type: RelationshipType.Import,
          occurrences: 1
        });
      }
    }

    // Extract inheritance relationships (extends, implements)
    const classNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['class_declaration']
    });

    for (const classNode of classNodes) {
      const treeNode = findNodeInTree(rootNode, classNode);
      if (treeNode) {
        const extendsClass = this.extractJavaExtends(treeNode, ast.sourceCode);
        if (extendsClass) {
          rawRelationships.push({
            sourceFile: ast.filePath,
            targetIdentifier: extendsClass,
            type: RelationshipType.Inheritance,
            occurrences: 1
          });
        }

        const implementsInterfaces = this.extractJavaImplements(treeNode, ast.sourceCode);
        for (const iface of implementsInterfaces) {
          rawRelationships.push({
            sourceFile: ast.filePath,
            targetIdentifier: iface,
            type: RelationshipType.Inheritance,
            occurrences: 1
          });
        }
      }
    }

    // Extract function call relationships
    const callNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['method_invocation']
    });

    const callCounts = new Map<string, number>();
    for (const callNode of callNodes) {
      const treeNode = findNodeInTree(rootNode, callNode);
      if (treeNode) {
        const methodName = this.extractJavaMethodCall(treeNode, ast.sourceCode);
        if (methodName) {
          callCounts.set(methodName, (callCounts.get(methodName) || 0) + 1);
        }
      }
    }

    for (const [methodName, count] of callCounts.entries()) {
      rawRelationships.push({
        sourceFile: ast.filePath,
        targetIdentifier: methodName,
        type: RelationshipType.FunctionCall,
        occurrences: count
      });
    }

    return this.mapRelationshipsToComponents(rawRelationships, components);
  }

  /**
   * Extract relationships from Go AST
   * Extracts: imports, inheritance (interface implementation), function calls
   */
  private extractGoRelationships(context: RelationshipExtractionContext): Relationship[] {
    const { ast, components, parserManager } = context;
    const rawRelationships: RawRelationship[] = [];
    const rootNode = ast.tree.rootNode;

    // Extract import relationships
    const importNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['import_declaration']
    });

    for (const importNode of importNodes) {
      const imports = this.extractGoImports(importNode, ast.sourceCode);
      for (const imp of imports) {
        rawRelationships.push({
          sourceFile: ast.filePath,
          targetIdentifier: imp,
          type: RelationshipType.Import,
          occurrences: 1
        });
      }
    }

    // Extract function call relationships
    const callNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['call_expression']
    });

    const callCounts = new Map<string, number>();
    for (const callNode of callNodes) {
      const treeNode = findNodeInTree(rootNode, callNode);
      if (treeNode) {
        const functionName = this.extractGoFunctionCall(treeNode, ast.sourceCode);
        if (functionName) {
          callCounts.set(functionName, (callCounts.get(functionName) || 0) + 1);
        }
      }
    }

    for (const [functionName, count] of callCounts.entries()) {
      rawRelationships.push({
        sourceFile: ast.filePath,
        targetIdentifier: functionName,
        type: RelationshipType.FunctionCall,
        occurrences: count
      });
    }

    return this.mapRelationshipsToComponents(rawRelationships, components);
  }

  // ============================================================================
  // Python Extraction Helpers
  // ============================================================================

  private extractPythonImports(node: any, sourceCode: string): string[] {
    const imports: string[] = [];

    // import_statement: import module1, module2
    // import_from_statement: from module import name1, name2
    if (node.type === 'import_statement') {
      // Extract dotted_name nodes
      for (const child of node.children || []) {
        if (child.type === 'dotted_name' || child.type === 'aliased_import') {
          const moduleName = this.extractPythonModuleName(child);
          if (moduleName) {
            imports.push(moduleName);
          }
        }
      }
    } else if (node.type === 'import_from_statement') {
      // Extract module name from 'from' clause
      for (const child of node.children || []) {
        if (child.type === 'dotted_name') {
          const moduleName = this.extractPythonModuleName(child);
          if (moduleName) {
            imports.push(moduleName);
          }
        }
      }
    }

    return imports;
  }

  private extractPythonModuleName(node: any): string | null {
    if (node.type === 'dotted_name') {
      return node.text;
    } else if (node.type === 'aliased_import') {
      // aliased_import has a 'name' field
      for (const child of node.children || []) {
        if (child.type === 'dotted_name') {
          return child.text;
        }
      }
    }
    return null;
  }

  private extractPythonBaseClasses(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const baseClasses: string[] = [];

    // Look for argument_list in class_definition
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'argument_list') {
        // Extract identifiers from argument list
        for (let j = 0; j < child.childCount; j++) {
          const arg = child.child(j);
          if (arg && (arg.type === 'identifier' || arg.type === 'attribute')) {
            baseClasses.push(arg.text);
          }
        }
      }
    }

    return baseClasses;
  }

  private extractPythonFunctionCall(node: any, sourceCode: string): string | null {
    // call node has a 'function' field
    for (const child of node.children || []) {
      if (child.type === 'identifier' || child.type === 'attribute') {
        return child.text;
      }
    }
    return null;
  }

  // ============================================================================
  // JavaScript/TypeScript Extraction Helpers
  // ============================================================================

  private extractJSImports(node: any, sourceCode: string): string[] {
    const imports: string[] = [];

    // import_statement has a 'source' field (string)
    for (const child of node.children || []) {
      if (child.type === 'string') {
        // Remove quotes from string
        const importPath = child.text.replace(/['"]/g, '');
        imports.push(importPath);
      }
    }

    return imports;
  }

  private extractJSRequire(node: Parser.SyntaxNode, sourceCode: string): string | null {
    // Check if this is a require() call
    const functionNode = node.childForFieldName('function');
    if (functionNode && functionNode.text === 'require') {
      const argsNode = node.childForFieldName('arguments');
      if (argsNode) {
        // Get first argument (the module path)
        const firstArg = argsNode.namedChild(0);
        if (firstArg && firstArg.type === 'string') {
          return firstArg.text.replace(/['"]/g, '');
        }
      }
    }
    return null;
  }

  private extractJSExtends(node: Parser.SyntaxNode, sourceCode: string): string | null {
    // Look for class_heritage
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'class_heritage') {
        // Extract identifier from extends clause
        for (let j = 0; j < child.childCount; j++) {
          const heritageChild = child.child(j);
          if (heritageChild && (heritageChild.type === 'identifier' || heritageChild.type === 'type_identifier')) {
            return heritageChild.text;
          }
        }
      }
    }
    return null;
  }

  private extractTSImplements(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const interfaces: string[] = [];

    // Look for implements clause
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'class_heritage') {
        // Check if this is implements (not extends)
        let isImplements = false;
        for (let j = 0; j < child.childCount; j++) {
          const token = child.child(j);
          if (token && token.text === 'implements') {
            isImplements = true;
          }
          if (isImplements && token && token.type === 'type_identifier') {
            interfaces.push(token.text);
          }
        }
      }
    }

    return interfaces;
  }

  private extractJSFunctionCall(node: Parser.SyntaxNode, sourceCode: string): string | null {
    // call_expression has a 'function' field
    if (node.type === 'call_expression') {
      const functionNode = node.childForFieldName('function');
      if (functionNode) {
        // Handle simple identifiers and member expressions
        if (functionNode.type === 'identifier') {
          return functionNode.text;
        } else if (functionNode.type === 'member_expression') {
          // For member expressions, get the property name
          const propertyNode = functionNode.childForFieldName('property');
          if (propertyNode) {
            return propertyNode.text;
          }
        }
      }
      return null;
    }

    // Some reserved keyword identifiers surface as ERROR nodes (e.g., `var()`).
    if (node.type === 'ERROR') {
      let calleeText: string | null = null;
      let hasArgs = false;

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (!child) {
          continue;
        }

        if (child.type === 'formal_parameters' || child.type === 'arguments' || child.type === 'argument_list') {
          hasArgs = true;
          continue;
        }

        if (!calleeText && child.isNamed) {
          const candidate = child.text;
          if (/^[A-Za-z_$][\\w$]*$/.test(candidate)) {
            calleeText = candidate;
          }
        }
      }

      if (calleeText && hasArgs) {
        return calleeText;
      }
    }

    return null;
  }

  // ============================================================================
  // Java Extraction Helpers
  // ============================================================================

  private extractJavaImport(node: any, sourceCode: string): string | null {
    // import_declaration contains scoped_identifier or identifier
    for (const child of node.children || []) {
      if (child.type === 'scoped_identifier' || child.type === 'identifier') {
        return child.text;
      }
    }
    return null;
  }

  private extractJavaExtends(node: Parser.SyntaxNode, sourceCode: string): string | null {
    // Look for superclass field
    const superclassNode = node.childForFieldName('superclass');
    if (superclassNode) {
      return superclassNode.text;
    }
    return null;
  }

  private extractJavaImplements(node: Parser.SyntaxNode, sourceCode: string): string[] {
    const interfaces: string[] = [];

    // Look for interfaces field
    const interfacesNode = node.childForFieldName('interfaces');
    if (interfacesNode) {
      // type_list contains type_identifier nodes
      for (let i = 0; i < interfacesNode.childCount; i++) {
        const child = interfacesNode.child(i);
        if (child && child.type === 'type_identifier') {
          interfaces.push(child.text);
        }
      }
    }

    return interfaces;
  }

  private extractJavaMethodCall(node: Parser.SyntaxNode, sourceCode: string): string | null {
    // method_invocation has a 'name' field
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      return nameNode.text;
    }
    return null;
  }

  // ============================================================================
  // Go Extraction Helpers
  // ============================================================================

  private extractGoImports(node: any, sourceCode: string): string[] {
    const imports: string[] = [];

    // import_declaration can have import_spec or import_spec_list
    for (const child of node.children || []) {
      if (child.type === 'import_spec') {
        const importPath = this.extractGoImportSpec(child);
        if (importPath) {
          imports.push(importPath);
        }
      } else if (child.type === 'import_spec_list') {
        for (const spec of child.children || []) {
          if (spec.type === 'import_spec') {
            const importPath = this.extractGoImportSpec(spec);
            if (importPath) {
              imports.push(importPath);
            }
          }
        }
      }
    }

    return imports;
  }

  private extractGoImportSpec(node: any): string | null {
    // import_spec contains interpreted_string_literal
    for (const child of node.children || []) {
      if (child.type === 'interpreted_string_literal' || child.type === 'raw_string_literal') {
        return child.text.replace(/["`]/g, '');
      }
    }
    return null;
  }

  private extractGoFunctionCall(node: Parser.SyntaxNode, sourceCode: string): string | null {
    // call_expression has a 'function' field
    const functionNode = node.childForFieldName('function');
    if (functionNode) {
      // Handle simple identifiers and selector expressions
      if (functionNode.type === 'identifier') {
        return functionNode.text;
      } else if (functionNode.type === 'selector_expression') {
        // For selector expressions, get the field name
        const fieldNode = functionNode.childForFieldName('field');
        if (fieldNode) {
          return fieldNode.text;
        }
      }
    }
    return null;
  }

  // ============================================================================
  // Relationship Mapping
  // ============================================================================

  /**
   * Map raw relationships to actual component relationships
   * Resolves target identifiers to component IDs
   */
  private mapRelationshipsToComponents(
      rawRelationships: RawRelationship[],
      components: Component[]
    ): Relationship[] {
      const relationships: Relationship[] = [];
      const relationshipMap = new Map<string, Relationship>();

      // Build a map from file path to ALL components in that file
      const fileToComponents = new Map<string, Component[]>();
      for (const component of components) {
        for (const filePath of component.filePaths) {
          if (!fileToComponents.has(filePath)) {
            fileToComponents.set(filePath, []);
          }
          fileToComponents.get(filePath)!.push(component);
        }
      }

      for (const raw of rawRelationships) {
        // Determine source component
        let sourceComponent: Component | undefined;

        if (raw.sourceComponentId) {
          // If source component ID is explicitly provided, use it
          sourceComponent = components.find(c => c.id === raw.sourceComponentId);
        } else {
          // Otherwise, find source component from file
          const sourceComponents = fileToComponents.get(raw.sourceFile);
          if (!sourceComponents || sourceComponents.length === 0) {
            continue;
          }

          // If there's only one component in the file, use it
          if (sourceComponents.length === 1) {
            sourceComponent = sourceComponents[0];
          } else if (raw.nodeStartPosition !== undefined) {
            // If we have node position, find the component that contains this position
            // For now, use a simple heuristic: find the most specific (deepest) component
            // that could contain this relationship
            sourceComponent = sourceComponents.find(c => 
              c.type !== ComponentType.Module && c.parent !== null
            ) || sourceComponents[0];
          } else {
            // Default to the module component (top-level)
            sourceComponent = sourceComponents.find(c => c.type === ComponentType.Module) || sourceComponents[0];
          }
        }

        if (!sourceComponent) {
          continue;
        }

        // Find target component by matching identifier
        const targetComponent = this.findComponentByIdentifier(raw.targetIdentifier, components);
        if (!targetComponent || targetComponent.id === sourceComponent.id) {
          continue; // Skip if target not found or self-reference
        }

        // Create or update relationship
        const key = `${sourceComponent.id}-${targetComponent.id}-${raw.type}`;
        const existing = relationshipMap.get(key);

        if (existing) {
          // Update occurrence count
          existing.metadata.occurrences += raw.occurrences;
        } else {
          // Create new relationship
          const relationship: Relationship = {
            id: this.generateRelationshipId(),
            source: sourceComponent.id,
            target: targetComponent.id,
            type: raw.type,
            strength: 0, // Will be calculated later
            metadata: {
              occurrences: raw.occurrences,
              bidirectional: false
            }
          };
          relationshipMap.set(key, relationship);
        }
      }

      // Calculate relationship strength and check for bidirectional
      for (const [key, relationship] of relationshipMap.entries()) {
        // Calculate strength (0-1) based on occurrences
        // Use logarithmic scale to handle large occurrence counts
        relationship.strength = Math.min(1.0, Math.log10(relationship.metadata.occurrences + 1) / 2);

        // Check if bidirectional
        const reverseKey = `${relationship.target}-${relationship.source}-${relationship.type}`;
        if (relationshipMap.has(reverseKey)) {
          relationship.metadata.bidirectional = true;
        }

        relationships.push(relationship);
      }

      return relationships;
    }

  /**
   * Find component by matching identifier (name, module path, etc.)
   */
  private findComponentByIdentifier(identifier: string, components: Component[]): Component | null {
    // Try exact name match first
    for (const component of components) {
      if (component.name === identifier) {
        return component;
      }
    }

    // Try partial match (e.g., module path contains identifier)
    for (const component of components) {
      if (component.name.includes(identifier) || identifier.includes(component.name)) {
        return component;
      }
    }

    // Try matching against file paths
    for (const component of components) {
      for (const filePath of component.filePaths) {
        if (filePath.includes(identifier) || identifier.includes(filePath)) {
          return component;
        }
      }
    }

    return null;
  }

  /**
   * Find the most specific component that contains a given AST node
   * Uses AST traversal to find the containing function/class definition
   */
  private findComponentByNodePosition(lineNumber: number, components: Component[], filePath: string): string | undefined {
    // Filter components in the same file
    const fileComponents = components.filter(c => c.filePaths.includes(filePath));
    
    // Since we don't have line ranges for components, we use a heuristic:
    // - For modules (top-level), return the module component
    // - For functions/classes, we need more context from the AST
    // This is a limitation of the current design
    
    // For now, return undefined to let the mapping logic use its default behavior
    // The proper fix would require storing line ranges in Component metadata
    return undefined;
  }

  /**
   * Find the component that contains a given AST node by traversing up the tree
   * to find the enclosing function or class definition
   */
  private findContainingComponent(node: Parser.SyntaxNode, components: Component[], filePath: string): string | undefined {
    // Filter components in the same file
    const fileComponents = components.filter(c => c.filePaths.includes(filePath));
    
    // Traverse up the AST to find the enclosing function or class
    let current: Parser.SyntaxNode | null = node;
    while (current) {
      // Check if this node is a function or class definition
      const nodeType = current.type;
      if (nodeType === 'function_definition' || nodeType === 'class_definition' ||
          nodeType === 'function_declaration' || nodeType === 'class_declaration' ||
          nodeType === 'class' || nodeType === 'method_definition') {
        
        // Extract the name of this function/class
        // Try to get the name field first
        let name: string | null = null;
        
        // For tree-sitter nodes, try childForFieldName
        if (typeof current.childForFieldName === 'function') {
          const nameNode = current.childForFieldName('name');
          if (nameNode) {
            name = nameNode.text;
          }
        }
        
        // Fallback: search for identifier child
        if (!name) {
          for (let i = 0; i < current.childCount; i++) {
            const child = current.child(i);
            if (child && child.type === 'identifier') {
              name = child.text;
              break;
            }
          }
        }
        
        if (name) {
          // Find the component with this name
          const component = fileComponents.find(c => c.name === name && c.type !== ComponentType.Module);
          if (component) {
            return component.id;
          }
        }
      }
      
      current = current.parent;
    }
    
    // If no enclosing function/class found, return the module component
    const moduleComponent = fileComponents.find(c => c.type === ComponentType.Module);
    return moduleComponent?.id;
  }


  private generateRelationshipId(): string {
    return `relationship_${this.relationshipIdCounter++}`;
  }

  /**
   * Reset relationship ID counter (useful for testing)
   */
  resetIdCounter(): void {
    this.relationshipIdCounter = 0;
  }
}
