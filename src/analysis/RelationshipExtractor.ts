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
  Language,
  Component,
  ComponentType
} from '../types';
import { ParsedAST, ParserManager, ExtractedNode } from './ParserManager';
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
  private extractPythonRelationships(context: RelationshipExtractionContext): Relationship[] {
    const { ast, components, parserManager } = context;
    const rawRelationships: RawRelationship[] = [];
    const rootNode = ast.tree.rootNode;
    const callNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['call']
    });

    this.collectPythonImportRelationships(ast, components, parserManager, rootNode, rawRelationships);
    this.collectPythonInheritanceRelationships(ast, components, parserManager, rootNode, rawRelationships);
    this.collectPythonFunctionCallRelationships(ast, components, rootNode, callNodes, rawRelationships);

    return this.mapRelationshipsToComponents(rawRelationships, components);
  }

  /**
   * Extract relationships from JavaScript/TypeScript AST
   * Extracts: imports, inheritance, function calls
   */
  private extractJavaScriptRelationships(context: RelationshipExtractionContext): Relationship[] {
    const { ast, components, parserManager } = context;
    const rawRelationships: RawRelationship[] = [];
    const rootNode = ast.tree.rootNode;
    const callNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['call_expression', 'ERROR']
    });

    this.collectJSImportRelationships(ast, components, parserManager, rootNode, rawRelationships);
    this.collectJSRequireRelationships(ast, components, rootNode, callNodes, rawRelationships);
    this.collectJSInheritanceRelationships(ast, components, parserManager, rootNode, rawRelationships);
    this.collectJSFunctionCallRelationships(ast, components, rootNode, callNodes, rawRelationships);

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
    const callNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['method_invocation']
    });

    this.collectJavaImportRelationships(ast, parserManager, rawRelationships);
    this.collectJavaInheritanceRelationships(ast, parserManager, rootNode, rawRelationships);
    this.collectJavaFunctionCallRelationships(ast, rootNode, callNodes, rawRelationships);

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

  private collectJavaImportRelationships(
    ast: ParsedAST,
    parserManager: ParserManager,
    rawRelationships: RawRelationship[]
  ): void {
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
  }

  private collectJavaInheritanceRelationships(
    ast: ParsedAST,
    parserManager: ParserManager,
    rootNode: Parser.SyntaxNode,
    rawRelationships: RawRelationship[]
  ): void {
    const classNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['class_declaration']
    });

    for (const classNode of classNodes) {
      const treeNode = findNodeInTree(rootNode, classNode);
      if (!treeNode) {
        continue;
      }

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

  private collectJavaFunctionCallRelationships(
    ast: ParsedAST,
    rootNode: Parser.SyntaxNode,
    callNodes: ExtractedNode[],
    rawRelationships: RawRelationship[]
  ): void {
    const callCounts = new Map<string, number>();
    for (const callNode of callNodes) {
      const treeNode = findNodeInTree(rootNode, callNode);
      if (!treeNode) {
        continue;
      }

      const methodName = this.extractJavaMethodCall(treeNode, ast.sourceCode);
      if (methodName) {
        callCounts.set(methodName, (callCounts.get(methodName) || 0) + 1);
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
  }

  private collectPythonImportRelationships(
    ast: ParsedAST,
    components: Component[],
    parserManager: ParserManager,
    rootNode: Parser.SyntaxNode,
    rawRelationships: RawRelationship[]
  ): void {
    const importNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['import_statement', 'import_from_statement']
    });

    for (const importNode of importNodes) {
      const imports = this.extractPythonImports(importNode, ast.sourceCode);
      const treeNode = findNodeInTree(rootNode, importNode);
      const sourceComponentId = treeNode
        ? this.findContainingComponent(treeNode, components, ast.filePath)
        : undefined;
      for (const importPath of imports) {
        this.addRawRelationship(
          rawRelationships,
          ast.filePath,
          sourceComponentId,
          importPath,
          RelationshipType.Import,
          1
        );
      }
    }
  }

  private collectPythonInheritanceRelationships(
    ast: ParsedAST,
    components: Component[],
    parserManager: ParserManager,
    rootNode: Parser.SyntaxNode,
    rawRelationships: RawRelationship[]
  ): void {
    const classNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['class_definition']
    });

    for (const classNode of classNodes) {
      const treeNode = findNodeInTree(rootNode, classNode);
      if (!treeNode) {
        continue;
      }

      const sourceComponentId = this.findContainingComponent(treeNode, components, ast.filePath);
      const baseClasses = this.extractPythonBaseClasses(treeNode, ast.sourceCode);
      for (const baseClass of baseClasses) {
        this.addRawRelationship(
          rawRelationships,
          ast.filePath,
          sourceComponentId,
          baseClass,
          RelationshipType.Inheritance,
          1
        );
      }
    }
  }

  private collectPythonFunctionCallRelationships(
    ast: ParsedAST,
    components: Component[],
    rootNode: Parser.SyntaxNode,
    callNodes: ExtractedNode[],
    rawRelationships: RawRelationship[]
  ): void {
    const callsBySource = new Map<string, Map<string, number>>();

    for (const callNode of callNodes) {
      const treeNode = findNodeInTree(rootNode, callNode);
      if (!treeNode) {
        continue;
      }

      const functionName = this.extractPythonFunctionCall(callNode, ast.sourceCode);
      if (!functionName) {
        continue;
      }

      const sourceComponentId = this.findContainingComponent(treeNode, components, ast.filePath);
      if (!sourceComponentId) {
        continue;
      }

      if (!callsBySource.has(sourceComponentId)) {
        callsBySource.set(sourceComponentId, new Map());
      }
      const calls = callsBySource.get(sourceComponentId)!;
      calls.set(functionName, (calls.get(functionName) || 0) + 1);
    }

    for (const [sourceComponentId, calls] of callsBySource.entries()) {
      for (const [functionName, count] of calls.entries()) {
        this.addRawRelationship(
          rawRelationships,
          ast.filePath,
          sourceComponentId,
          functionName,
          RelationshipType.FunctionCall,
          count
        );
      }
    }
  }

  // ============================================================================
  // Python Extraction Helpers
  // ============================================================================

  private extractPythonImports(node: ExtractedNode, _sourceCode: string): string[] {
    const imports: string[] = [];
    const candidateNodes = this.getPythonImportCandidateNodes(node);
    for (const candidateNode of candidateNodes) {
      const moduleName = this.extractPythonModuleName(candidateNode);
      if (moduleName) {
        imports.push(moduleName);
      }
    }

    return imports;
  }

  private getPythonImportCandidateNodes(node: ExtractedNode): ExtractedNode[] {
    const children = node.children || [];

    if (node.type === 'import_statement') {
      return children.filter(
        (child) => child.type === 'dotted_name' || child.type === 'aliased_import'
      );
    }

    if (node.type === 'import_from_statement') {
      return children.filter((child) => child.type === 'dotted_name');
    }

    return [];
  }

  private extractPythonModuleName(node: ExtractedNode): string | null {
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

  private extractPythonBaseClasses(node: Parser.SyntaxNode, _sourceCode: string): string[] {
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

  private extractPythonFunctionCall(node: ExtractedNode, _sourceCode: string): string | null {
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

  private collectJSImportRelationships(
    ast: ParsedAST,
    components: Component[],
    parserManager: ParserManager,
    rootNode: Parser.SyntaxNode,
    rawRelationships: RawRelationship[]
  ): void {
    const importNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['import_statement']
    });

    for (const importNode of importNodes) {
      const imports = this.extractJSImports(importNode, ast.sourceCode);
      const treeNode = findNodeInTree(rootNode, importNode);
      const sourceComponentId = treeNode
        ? this.findContainingComponent(treeNode, components, ast.filePath)
        : undefined;
      for (const importPath of imports) {
        this.addRawRelationship(
          rawRelationships,
          ast.filePath,
          sourceComponentId,
          importPath,
          RelationshipType.Import,
          1
        );
      }
    }
  }

  private collectJSRequireRelationships(
    ast: ParsedAST,
    components: Component[],
    rootNode: Parser.SyntaxNode,
    callNodes: ExtractedNode[],
    rawRelationships: RawRelationship[]
  ): void {
    for (const callNode of callNodes) {
      const treeNode = findNodeInTree(rootNode, callNode);
      if (!treeNode) {
        continue;
      }

      const requirePath = this.extractJSRequire(treeNode, ast.sourceCode);
      if (!requirePath) {
        continue;
      }

      const sourceComponentId = this.findContainingComponent(treeNode, components, ast.filePath);
      this.addRawRelationship(
        rawRelationships,
        ast.filePath,
        sourceComponentId,
        requirePath,
        RelationshipType.Import,
        1
      );
    }
  }

  private collectJSInheritanceRelationships(
    ast: ParsedAST,
    components: Component[],
    parserManager: ParserManager,
    rootNode: Parser.SyntaxNode,
    rawRelationships: RawRelationship[]
  ): void {
    const classNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['class_declaration', 'class']
    });

    for (const classNode of classNodes) {
      const treeNode = findNodeInTree(rootNode, classNode);
      if (!treeNode) {
        continue;
      }

      const sourceComponentId = this.findContainingComponent(treeNode, components, ast.filePath);
      const extendsClass = this.extractJSExtends(treeNode, ast.sourceCode);
      if (extendsClass) {
        this.addRawRelationship(
          rawRelationships,
          ast.filePath,
          sourceComponentId,
          extendsClass,
          RelationshipType.Inheritance,
          1
        );
      }

      if (ast.language !== Language.TypeScript) {
        continue;
      }

      const implementsInterfaces = this.extractTSImplements(treeNode, ast.sourceCode);
      for (const iface of implementsInterfaces) {
        this.addRawRelationship(
          rawRelationships,
          ast.filePath,
          sourceComponentId,
          iface,
          RelationshipType.Inheritance,
          1
        );
      }
    }
  }

  private collectJSFunctionCallRelationships(
    ast: ParsedAST,
    components: Component[],
    rootNode: Parser.SyntaxNode,
    callNodes: ExtractedNode[],
    rawRelationships: RawRelationship[]
  ): void {
    const callsBySource = new Map<string, Map<string, number>>();

    for (const callNode of callNodes) {
      const treeNode = findNodeInTree(rootNode, callNode);
      if (!treeNode) {
        continue;
      }

      const functionName = this.extractJSFunctionCall(treeNode, ast.sourceCode);
      if (!functionName) {
        continue;
      }

      const sourceComponentId = this.findContainingComponent(treeNode, components, ast.filePath);
      if (!sourceComponentId) {
        continue;
      }

      if (!callsBySource.has(sourceComponentId)) {
        callsBySource.set(sourceComponentId, new Map());
      }
      const calls = callsBySource.get(sourceComponentId)!;
      calls.set(functionName, (calls.get(functionName) || 0) + 1);
    }

    for (const [sourceComponentId, calls] of callsBySource.entries()) {
      for (const [functionName, count] of calls.entries()) {
        this.addRawRelationship(
          rawRelationships,
          ast.filePath,
          sourceComponentId,
          functionName,
          RelationshipType.FunctionCall,
          count
        );
      }
    }
  }

  private addRawRelationship(
    rawRelationships: RawRelationship[],
    sourceFile: string,
    sourceComponentId: string | undefined,
    targetIdentifier: string,
    type: RelationshipType,
    occurrences: number
  ): void {
    rawRelationships.push({
      sourceFile,
      sourceComponentId,
      targetIdentifier,
      type,
      occurrences
    });
  }

  private extractJSImports(node: ExtractedNode, _sourceCode: string): string[] {
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

  private extractJSRequire(node: Parser.SyntaxNode, _sourceCode: string): string | null {
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

  private extractJSExtends(node: Parser.SyntaxNode, _sourceCode: string): string | null {
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

  private extractTSImplements(node: Parser.SyntaxNode, _sourceCode: string): string[] {
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

  private extractJSFunctionCall(node: Parser.SyntaxNode, _sourceCode: string): string | null {
    if (node.type === 'call_expression') {
      const functionNode = node.childForFieldName('function');
      if (!functionNode) {
        return null;
      }

      if (functionNode.type === 'identifier') {
        return functionNode.text;
      }

      if (functionNode.type === 'member_expression') {
        return functionNode.childForFieldName('property')?.text || null;
      }

      return null;
    }

    if (node.type === 'ERROR') {
      return this.extractJSFunctionCallFromErrorNode(node);
    }

    return null;
  }

  private extractJSFunctionCallFromErrorNode(node: Parser.SyntaxNode): string | null {
    let calleeText: string | null = null;
    let hasArgs = false;

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) {
        continue;
      }

      if (this.isJSCallArgumentNode(child.type)) {
        hasArgs = true;
        continue;
      }

      if (!calleeText && child.isNamed) {
        const candidate = child.text;
        if (this.isValidJSCallIdentifier(candidate)) {
          calleeText = candidate;
        }
      }
    }

    if (calleeText && hasArgs) {
      return calleeText;
    }

    return null;
  }

  private isJSCallArgumentNode(nodeType: string): boolean {
    return nodeType === 'formal_parameters' ||
      nodeType === 'arguments' ||
      nodeType === 'argument_list';
  }

  private isValidJSCallIdentifier(value: string): boolean {
    return /^[A-Za-z_$][\\w$]*$/.test(value);
  }

  // ============================================================================
  // Java Extraction Helpers
  // ============================================================================

  private extractJavaImport(node: ExtractedNode, _sourceCode: string): string | null {
    // import_declaration contains scoped_identifier or identifier
    for (const child of node.children || []) {
      if (child.type === 'scoped_identifier' || child.type === 'identifier') {
        return child.text;
      }
    }
    return null;
  }

  private extractJavaExtends(node: Parser.SyntaxNode, _sourceCode: string): string | null {
    // Look for superclass field
    const superclassNode = node.childForFieldName('superclass');
    if (superclassNode) {
      return superclassNode.text;
    }
    return null;
  }

  private extractJavaImplements(node: Parser.SyntaxNode, _sourceCode: string): string[] {
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

  private extractJavaMethodCall(node: Parser.SyntaxNode, _sourceCode: string): string | null {
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

  private extractGoImports(node: ExtractedNode, _sourceCode: string): string[] {
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

  private extractGoImportSpec(node: ExtractedNode): string | null {
    // import_spec contains interpreted_string_literal
    for (const child of node.children || []) {
      if (child.type === 'interpreted_string_literal' || child.type === 'raw_string_literal') {
        return child.text.replace(/["`]/g, '');
      }
    }
    return null;
  }

  private extractGoFunctionCall(node: Parser.SyntaxNode, _sourceCode: string): string | null {
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
    const relationshipMap = new Map<string, Relationship>();
    const fileToComponents = this.buildFileToComponentsMap(components);

    for (const raw of rawRelationships) {
      const sourceComponent = this.resolveSourceComponent(raw, components, fileToComponents);
      if (!sourceComponent) {
        continue;
      }

      const targetComponent = this.findComponentByIdentifier(raw.targetIdentifier, components);
      if (!targetComponent || targetComponent.id === sourceComponent.id) {
        continue;
      }

      this.upsertRelationship(relationshipMap, sourceComponent, targetComponent, raw);
    }

    return this.finalizeRelationshipMap(relationshipMap);
  }

  private buildFileToComponentsMap(components: Component[]): Map<string, Component[]> {
    const fileToComponents = new Map<string, Component[]>();
    for (const component of components) {
      for (const filePath of component.filePaths) {
        if (!fileToComponents.has(filePath)) {
          fileToComponents.set(filePath, []);
        }
        fileToComponents.get(filePath)!.push(component);
      }
    }
    return fileToComponents;
  }

  private resolveSourceComponent(
    raw: RawRelationship,
    components: Component[],
    fileToComponents: Map<string, Component[]>
  ): Component | undefined {
    if (raw.sourceComponentId) {
      return components.find((component) => component.id === raw.sourceComponentId);
    }

    const sourceComponents = fileToComponents.get(raw.sourceFile);
    if (!sourceComponents || sourceComponents.length === 0) {
      return undefined;
    }

    if (sourceComponents.length === 1) {
      return sourceComponents[0];
    }

    if (raw.nodeStartPosition !== undefined) {
      return sourceComponents.find(
        (component) => component.type !== ComponentType.Module && component.parent !== null
      ) || sourceComponents[0];
    }

    return sourceComponents.find((component) => component.type === ComponentType.Module) || sourceComponents[0];
  }

  private upsertRelationship(
    relationshipMap: Map<string, Relationship>,
    sourceComponent: Component,
    targetComponent: Component,
    raw: RawRelationship
  ): void {
    const key = `${sourceComponent.id}-${targetComponent.id}-${raw.type}`;
    const existing = relationshipMap.get(key);

    if (existing) {
      existing.metadata.occurrences += raw.occurrences;
      return;
    }

    relationshipMap.set(key, {
      id: this.generateRelationshipId(),
      source: sourceComponent.id,
      target: targetComponent.id,
      type: raw.type,
      strength: 0,
      metadata: {
        occurrences: raw.occurrences,
        bidirectional: false
      }
    });
  }

  private finalizeRelationshipMap(relationshipMap: Map<string, Relationship>): Relationship[] {
    const relationships: Relationship[] = [];

    for (const relationship of relationshipMap.values()) {
      relationship.strength = Math.min(1.0, Math.log10(relationship.metadata.occurrences + 1) / 2);

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
  private findComponentByNodePosition(_lineNumber: number, _components: Component[], _filePath: string): string | undefined {
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
    const fileComponents = components.filter(c => c.filePaths.includes(filePath));

    let current: Parser.SyntaxNode | null = node;
    while (current) {
      if (this.isComponentContainerNode(current.type)) {
        const name = this.extractContainerNodeName(current);
        const componentId = this.findNamedNonModuleComponentId(name, fileComponents);
        if (componentId) {
          return componentId;
        }
      }

      current = current.parent;
    }

    return this.findModuleComponentId(fileComponents);
  }

  private isComponentContainerNode(nodeType: string): boolean {
    return nodeType === 'function_definition' ||
      nodeType === 'class_definition' ||
      nodeType === 'function_declaration' ||
      nodeType === 'class_declaration' ||
      nodeType === 'class' ||
      nodeType === 'method_definition';
  }

  private extractContainerNodeName(node: Parser.SyntaxNode): string | null {
    const nameNode = node.childForFieldName('name');
    if (nameNode) {
      return nameNode.text;
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'identifier') {
        return child.text;
      }
    }

    return null;
  }

  private findNamedNonModuleComponentId(name: string | null, fileComponents: Component[]): string | undefined {
    if (!name) {
      return undefined;
    }

    return fileComponents.find(
      (component) => component.name === name && component.type !== ComponentType.Module
    )?.id;
  }

  private findModuleComponentId(fileComponents: Component[]): string | undefined {
    return fileComponents.find((component) => component.type === ComponentType.Module)?.id;
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
