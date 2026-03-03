/**
 * ComponentExtractor - Extracts architectural components from parsed ASTs
 * Requirements: 1.2, 6.2, 6.3, 6.4
 * 
 * Responsibilities:
 * - Extract modules/packages (Python modules, JS/TS modules, Java packages, Go packages)
 * - Extract classes and interfaces from ASTs
 * - Extract functions and methods
 * - Assign abstraction levels based on component type and nesting
 */

import * as path from 'path';
import Parser from 'tree-sitter';
import {
  Component,
  ComponentType,
  Language,
  AbstractionLevel,
  ComponentMetadata
} from '../types';
import { ParsedAST, ParserManager, ExtractedNode } from './ParserManager';
import { findNodeInTree } from '../utils/astUtils';

/**
 * Context for component extraction
 */
export interface ExtractionContext {
  rootPath: string;
  filePath: string;
  ast: ParsedAST;
  parserManager: ParserManager;
}

/**
 * Result of component extraction from a single file
 */
export interface FileExtractionResult {
  components: Component[];
  moduleComponent?: Component; // Top-level module/package component
}

/**
 * Extracts architectural components from parsed ASTs
 * Uses language-specific strategies for accurate extraction
 */
export class ComponentExtractor {
  private componentIdCounter = 0;

  /**
   * Extract components from a parsed AST
   * @param context Extraction context with AST and metadata
   * @returns Extracted components with hierarchy
   */
  async extractComponents(context: ExtractionContext): Promise<FileExtractionResult> {
    const { ast } = context;

    // Select extraction strategy based on language
    switch (ast.language) {
      case Language.Python:
        return this.extractPythonComponents(context);
      case Language.JavaScript:
      case Language.TypeScript:
        return this.extractJavaScriptComponents(context);
      case Language.Java:
        return this.extractJavaComponents(context);
      case Language.Go:
        return this.extractGoComponents(context);
      default:
        return { components: [] };
    }
  }

  /**
   * Extract components from Python AST
   * Extracts: modules, classes, functions
   */
  private extractPythonComponents(context: ExtractionContext): FileExtractionResult {
    const { ast, filePath, parserManager } = context;
    const components: Component[] = [];
    const rootNode = ast.tree.rootNode;
    const moduleComponent = this.createPythonModuleComponent(context);
    components.push(moduleComponent);

    this.extractPythonClassComponents(ast, parserManager, rootNode, filePath, moduleComponent, components);
    this.extractPythonTopLevelFunctionComponents(ast, rootNode, filePath, moduleComponent, components);

    return { components, moduleComponent };
  }

  private createPythonModuleComponent(context: ExtractionContext): Component {
    const { ast, filePath, rootPath } = context;
    const rootNode = ast.tree.rootNode;
    const moduleName = this.getModuleName(filePath, rootPath);

    return this.createComponent({
      name: moduleName,
      type: ComponentType.Module,
      language: Language.Python,
      filePaths: [filePath],
      abstractionLevel: AbstractionLevel.Overview,
      parent: null,
      metadata: {
        lineCount: rootNode.endPosition.row - rootNode.startPosition.row + 1,
        exportedSymbols: []
      }
    });
  }

  private extractPythonClassComponents(
    ast: ParsedAST,
    parserManager: ParserManager,
    rootNode: Parser.SyntaxNode,
    filePath: string,
    moduleComponent: Component,
    components: Component[]
  ): void {
    const classNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['class_definition']
    });

    for (const classNode of classNodes) {
      const className = this.extractPythonClassName(classNode, ast.sourceCode);
      if (!className) continue;

      const classComponent = this.createComponent({
        name: className,
        type: ComponentType.Class,
        language: Language.Python,
        filePaths: [filePath],
        abstractionLevel: AbstractionLevel.Module,
        parent: moduleComponent.id,
        metadata: {
          lineCount: classNode.endPosition.row - classNode.startPosition.row + 1,
          exportedSymbols: []
        }
      });
      components.push(classComponent);
      moduleComponent.children.push(classComponent.id);

      this.extractPythonClassMethodComponents(ast, rootNode, filePath, classNode, className, classComponent, components);
    }
  }

  private extractPythonClassMethodComponents(
    ast: ParsedAST,
    rootNode: Parser.SyntaxNode,
    filePath: string,
    classNode: ExtractedNode,
    className: string,
    classComponent: Component,
    components: Component[]
  ): void {
    const classTreeNode = findNodeInTree(rootNode, classNode);
    if (!classTreeNode) {
      return;
    }

    const methodNodes = this.findDescendantsByType(classTreeNode, 'function_definition');

    for (const methodNode of methodNodes) {
      const methodName = this.extractPythonFunctionName(methodNode, ast.sourceCode);
      if (!methodName) continue;

      const methodComponent = this.createComponent({
        name: `${className}.${methodName}`,
        type: ComponentType.Function,
        language: Language.Python,
        filePaths: [filePath],
        abstractionLevel: AbstractionLevel.Detailed,
        parent: classComponent.id,
        metadata: {
          lineCount: methodNode.endPosition.row - methodNode.startPosition.row + 1,
          exportedSymbols: []
        }
      });
      components.push(methodComponent);
      classComponent.children.push(methodComponent.id);
    }
  }

  private extractPythonTopLevelFunctionComponents(
    ast: ParsedAST,
    rootNode: Parser.SyntaxNode,
    filePath: string,
    moduleComponent: Component,
    components: Component[]
  ): void {
    const functionNodes = this.extractTopLevelNodes(rootNode, 'function_definition');

    for (const funcNode of functionNodes) {
      const funcName = this.extractPythonFunctionName(funcNode, ast.sourceCode);
      if (!funcName) continue;

      const funcComponent = this.createComponent({
        name: funcName,
        type: ComponentType.Function,
        language: Language.Python,
        filePaths: [filePath],
        abstractionLevel: AbstractionLevel.Module,
        parent: moduleComponent.id,
        metadata: {
          lineCount: funcNode.endPosition.row - funcNode.startPosition.row + 1,
          exportedSymbols: []
        }
      });
      components.push(funcComponent);
      moduleComponent.children.push(funcComponent.id);
    }
  }

  /**
   * Extract components from JavaScript/TypeScript AST
   * Extracts: modules, classes, interfaces, functions
   */
  private extractJavaScriptComponents(context: ExtractionContext): FileExtractionResult {
    const { ast, filePath, parserManager } = context;
    const components: Component[] = [];
    const rootNode = ast.tree.rootNode;
    const moduleComponent = this.createJSModuleComponent(context);
    components.push(moduleComponent);

    this.extractJSClassComponents(
      ast,
      parserManager,
      rootNode,
      filePath,
      moduleComponent,
      components
    );

    if (ast.language === Language.TypeScript) {
      this.extractTSInterfaceComponents(ast, parserManager, filePath, moduleComponent, components);
    }

    this.extractJSTopLevelFunctionComponents(ast, rootNode, filePath, moduleComponent, components);

    return { components, moduleComponent };
  }

  private createJSModuleComponent(context: ExtractionContext): Component {
    const { ast, filePath, rootPath } = context;
    const rootNode = ast.tree.rootNode;
    const moduleName = this.getModuleName(filePath, rootPath);

    return this.createComponent({
      name: moduleName,
      type: ComponentType.Module,
      language: ast.language,
      filePaths: [filePath],
      abstractionLevel: AbstractionLevel.Overview,
      parent: null,
      metadata: {
        lineCount: rootNode.endPosition.row - rootNode.startPosition.row + 1,
        exportedSymbols: []
      }
    });
  }

  private extractJSClassComponents(
    ast: ParsedAST,
    parserManager: ParserManager,
    rootNode: Parser.SyntaxNode,
    filePath: string,
    moduleComponent: Component,
    components: Component[]
  ): void {
    const classNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['class_declaration', 'class']
    });

    for (const classNode of classNodes) {
      const className = this.extractJSClassName(classNode, ast.sourceCode);
      if (!className) continue;

      const classComponent = this.createComponent({
        name: className,
        type: ComponentType.Class,
        language: ast.language,
        filePaths: [filePath],
        abstractionLevel: AbstractionLevel.Module,
        parent: moduleComponent.id,
        metadata: {
          lineCount: classNode.endPosition.row - classNode.startPosition.row + 1,
          exportedSymbols: []
        }
      });
      components.push(classComponent);
      moduleComponent.children.push(classComponent.id);

      this.extractJSClassMethodComponents(ast, rootNode, filePath, classNode, className, classComponent, components);
    }
  }

  private extractJSClassMethodComponents(
    ast: ParsedAST,
    rootNode: Parser.SyntaxNode,
    filePath: string,
    classNode: ExtractedNode,
    className: string,
    classComponent: Component,
    components: Component[]
  ): void {
    const classTreeNode = findNodeInTree(rootNode, classNode);
    if (!classTreeNode) {
      return;
    }

    const methodNodes = this.findDescendantsByType(classTreeNode, 'method_definition');
    for (const methodNode of methodNodes) {
      const methodName = this.extractJSMethodName(methodNode, ast.sourceCode);
      if (!methodName) continue;

      const methodComponent = this.createComponent({
        name: `${className}.${methodName}`,
        type: ComponentType.Function,
        language: ast.language,
        filePaths: [filePath],
        abstractionLevel: AbstractionLevel.Detailed,
        parent: classComponent.id,
        metadata: {
          lineCount: methodNode.endPosition.row - methodNode.startPosition.row + 1,
          exportedSymbols: []
        }
      });
      components.push(methodComponent);
      classComponent.children.push(methodComponent.id);
    }
  }

  private extractTSInterfaceComponents(
    ast: ParsedAST,
    parserManager: ParserManager,
    filePath: string,
    moduleComponent: Component,
    components: Component[]
  ): void {
    const interfaceNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['interface_declaration']
    });

    for (const interfaceNode of interfaceNodes) {
      const interfaceName = this.extractTSInterfaceName(interfaceNode, ast.sourceCode);
      if (!interfaceName) continue;

      const interfaceComponent = this.createComponent({
        name: interfaceName,
        type: ComponentType.Interface,
        language: ast.language,
        filePaths: [filePath],
        abstractionLevel: AbstractionLevel.Module,
        parent: moduleComponent.id,
        metadata: {
          lineCount: interfaceNode.endPosition.row - interfaceNode.startPosition.row + 1,
          exportedSymbols: []
        }
      });
      components.push(interfaceComponent);
      moduleComponent.children.push(interfaceComponent.id);
    }
  }

  private extractJSTopLevelFunctionComponents(
    ast: ParsedAST,
    rootNode: Parser.SyntaxNode,
    filePath: string,
    moduleComponent: Component,
    components: Component[]
  ): void {
    const functionNodes = this.extractTopLevelNodes(rootNode, 'function_declaration');

    for (const funcNode of functionNodes) {
      const funcName = this.extractJSFunctionName(funcNode, ast.sourceCode);
      if (!funcName) continue;

      const funcComponent = this.createComponent({
        name: funcName,
        type: ComponentType.Function,
        language: ast.language,
        filePaths: [filePath],
        abstractionLevel: AbstractionLevel.Module,
        parent: moduleComponent.id,
        metadata: {
          lineCount: funcNode.endPosition.row - funcNode.startPosition.row + 1,
          exportedSymbols: []
        }
      });
      components.push(funcComponent);
      moduleComponent.children.push(funcComponent.id);
    }
  }

  /**
   * Extract components from Java AST
   * Extracts: packages, classes, interfaces, methods
   */
  private extractJavaComponents(context: ExtractionContext): FileExtractionResult {
    const { ast, filePath, parserManager } = context;
    const components: Component[] = [];
    const rootNode = ast.tree.rootNode;
    const packageComponent = this.createJavaPackageComponent(context);
    components.push(packageComponent);

    this.extractJavaClassComponents(ast, parserManager, rootNode, filePath, packageComponent, components);
    this.extractJavaInterfaceComponents(ast, parserManager, filePath, packageComponent, components);

    return { components, moduleComponent: packageComponent };
  }

  private createJavaPackageComponent(context: ExtractionContext): Component {
    const { ast, filePath, rootPath } = context;
    const rootNode = ast.tree.rootNode;
    const packageName = this.extractJavaPackageName(rootNode, ast.sourceCode) ||
      this.getModuleName(filePath, rootPath);

    return this.createComponent({
      name: packageName,
      type: ComponentType.Package,
      language: Language.Java,
      filePaths: [filePath],
      abstractionLevel: AbstractionLevel.Overview,
      parent: null,
      metadata: {
        lineCount: rootNode.endPosition.row - rootNode.startPosition.row + 1,
        exportedSymbols: []
      }
    });
  }

  private extractJavaClassComponents(
    ast: ParsedAST,
    parserManager: ParserManager,
    rootNode: Parser.SyntaxNode,
    filePath: string,
    packageComponent: Component,
    components: Component[]
  ): void {
    const classNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['class_declaration']
    });

    for (const classNode of classNodes) {
      const className = this.extractJavaClassName(classNode, ast.sourceCode);
      if (!className) continue;

      const classComponent = this.createComponent({
        name: className,
        type: ComponentType.Class,
        language: Language.Java,
        filePaths: [filePath],
        abstractionLevel: AbstractionLevel.Module,
        parent: packageComponent.id,
        metadata: {
          lineCount: classNode.endPosition.row - classNode.startPosition.row + 1,
          exportedSymbols: []
        }
      });
      components.push(classComponent);
      packageComponent.children.push(classComponent.id);

      this.extractJavaClassMethodComponents(ast, rootNode, filePath, classNode, className, classComponent, components);
    }
  }

  private extractJavaClassMethodComponents(
    ast: ParsedAST,
    rootNode: Parser.SyntaxNode,
    filePath: string,
    classNode: ExtractedNode,
    className: string,
    classComponent: Component,
    components: Component[]
  ): void {
    const classTreeNode = findNodeInTree(rootNode, classNode);
    if (!classTreeNode) {
      return;
    }

    const methodNodes = this.findDescendantsByType(classTreeNode, 'method_declaration');
    for (const methodNode of methodNodes) {
      const methodName = this.extractJavaMethodName(methodNode, ast.sourceCode);
      if (!methodName) continue;

      const methodComponent = this.createComponent({
        name: `${className}.${methodName}`,
        type: ComponentType.Function,
        language: Language.Java,
        filePaths: [filePath],
        abstractionLevel: AbstractionLevel.Detailed,
        parent: classComponent.id,
        metadata: {
          lineCount: methodNode.endPosition.row - methodNode.startPosition.row + 1,
          exportedSymbols: []
        }
      });
      components.push(methodComponent);
      classComponent.children.push(methodComponent.id);
    }
  }

  private extractJavaInterfaceComponents(
    ast: ParsedAST,
    parserManager: ParserManager,
    filePath: string,
    packageComponent: Component,
    components: Component[]
  ): void {
    const interfaceNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['interface_declaration']
    });

    for (const interfaceNode of interfaceNodes) {
      const interfaceName = this.extractJavaInterfaceName(interfaceNode, ast.sourceCode);
      if (!interfaceName) continue;

      const interfaceComponent = this.createComponent({
        name: interfaceName,
        type: ComponentType.Interface,
        language: Language.Java,
        filePaths: [filePath],
        abstractionLevel: AbstractionLevel.Module,
        parent: packageComponent.id,
        metadata: {
          lineCount: interfaceNode.endPosition.row - interfaceNode.startPosition.row + 1,
          exportedSymbols: []
        }
      });
      components.push(interfaceComponent);
      packageComponent.children.push(interfaceComponent.id);
    }
  }

  /**
   * Extract components from Go AST
   * Extracts: packages, structs (as classes), interfaces, functions
   */
  private extractGoComponents(context: ExtractionContext): FileExtractionResult {
    const { ast, filePath, parserManager } = context;
    const components: Component[] = [];
    const packageComponent = this.createGoPackageComponent(context);
    components.push(packageComponent);

    this.extractGoStructComponents(ast, parserManager, filePath, packageComponent, components);
    this.extractGoFunctionComponents(ast, parserManager, filePath, packageComponent, components);

    return { components, moduleComponent: packageComponent };
  }

  private createGoPackageComponent(context: ExtractionContext): Component {
    const { ast, filePath, rootPath } = context;
    const rootNode = ast.tree.rootNode;
    const packageName = this.extractGoPackageName(rootNode, ast.sourceCode) ||
      this.getModuleName(filePath, rootPath);

    return this.createComponent({
      name: packageName,
      type: ComponentType.Package,
      language: Language.Go,
      filePaths: [filePath],
      abstractionLevel: AbstractionLevel.Overview,
      parent: null,
      metadata: {
        lineCount: rootNode.endPosition.row - rootNode.startPosition.row + 1,
        exportedSymbols: []
      }
    });
  }

  private extractGoStructComponents(
    ast: ParsedAST,
    parserManager: ParserManager,
    filePath: string,
    packageComponent: Component,
    components: Component[]
  ): void {
    const structNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['type_declaration']
    });

    for (const structNode of structNodes) {
      const structName = this.extractGoStructName(structNode, ast.sourceCode);
      if (!structName) continue;

      const structComponent = this.createComponent({
        name: structName,
        type: ComponentType.Class,
        language: Language.Go,
        filePaths: [filePath],
        abstractionLevel: AbstractionLevel.Module,
        parent: packageComponent.id,
        metadata: {
          lineCount: structNode.endPosition.row - structNode.startPosition.row + 1,
          exportedSymbols: []
        }
      });
      components.push(structComponent);
      packageComponent.children.push(structComponent.id);
    }
  }

  private extractGoFunctionComponents(
    ast: ParsedAST,
    parserManager: ParserManager,
    filePath: string,
    packageComponent: Component,
    components: Component[]
  ): void {
    const functionNodes = parserManager.extractNodesByType(ast, {
      nodeTypes: ['function_declaration', 'method_declaration']
    });

    for (const funcNode of functionNodes) {
      const funcName = this.extractGoFunctionName(funcNode, ast.sourceCode);
      if (!funcName) continue;

      const receiver = this.extractGoMethodReceiver(funcNode, ast.sourceCode);
      if (receiver) {
        this.addGoMethodComponent(receiver, funcName, funcNode, filePath, packageComponent, components);
        continue;
      }

      this.addGoTopLevelFunctionComponent(funcName, funcNode, filePath, packageComponent, components);
    }
  }

  private addGoMethodComponent(
    receiver: string,
    functionName: string,
    functionNode: ExtractedNode,
    filePath: string,
    packageComponent: Component,
    components: Component[]
  ): void {
    const parentStruct = components.find(
      c => c.type === ComponentType.Class && c.name === receiver
    );

    const methodComponent = this.createComponent({
      name: `${receiver}.${functionName}`,
      type: ComponentType.Function,
      language: Language.Go,
      filePaths: [filePath],
      abstractionLevel: AbstractionLevel.Detailed,
      parent: parentStruct?.id || packageComponent.id,
      metadata: {
        lineCount: functionNode.endPosition.row - functionNode.startPosition.row + 1,
        exportedSymbols: []
      }
    });
    components.push(methodComponent);

    if (parentStruct) {
      parentStruct.children.push(methodComponent.id);
      return;
    }

    packageComponent.children.push(methodComponent.id);
  }

  private addGoTopLevelFunctionComponent(
    functionName: string,
    functionNode: ExtractedNode,
    filePath: string,
    packageComponent: Component,
    components: Component[]
  ): void {
    const funcComponent = this.createComponent({
      name: functionName,
      type: ComponentType.Function,
      language: Language.Go,
      filePaths: [filePath],
      abstractionLevel: AbstractionLevel.Module,
      parent: packageComponent.id,
      metadata: {
        lineCount: functionNode.endPosition.row - functionNode.startPosition.row + 1,
        exportedSymbols: []
      }
    });
    components.push(funcComponent);
    packageComponent.children.push(funcComponent.id);
  }

  // ============================================================================
  // Helper Methods - Name Extraction
  // ============================================================================

  private extractPythonClassName(node: ExtractedNode, _sourceCode: string): string | null {
    // class_definition has a 'name' field
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === 'identifier') {
          return child.text;
        }
      }
    }
    return null;
  }

  private extractPythonFunctionName(node: ExtractedNode, _sourceCode: string): string | null {
    // function_definition has a 'name' field
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === 'identifier') {
          return child.text;
        }
      }
    }
    return null;
  }

  private extractJSClassName(node: ExtractedNode, _sourceCode: string): string | null {
    // class_declaration has a 'name' field
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === 'identifier' || child.type === 'type_identifier') {
          return child.text;
        }
      }
    }
    return null;
  }

  private extractJSMethodName(node: ExtractedNode, _sourceCode: string): string | null {
    // method_definition has a 'name' field (property_identifier)
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === 'property_identifier') {
          return child.text;
        }
      }
    }
    return null;
  }

  private extractJSFunctionName(node: ExtractedNode, _sourceCode: string): string | null {
    // function_declaration has a 'name' field
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === 'identifier') {
          return child.text;
        }
      }
    }
    return null;
  }

  private extractTSInterfaceName(node: ExtractedNode, _sourceCode: string): string | null {
    // interface_declaration has a 'name' field
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === 'type_identifier') {
          return child.text;
        }
      }
    }
    return null;
  }

  private extractJavaClassName(node: ExtractedNode, _sourceCode: string): string | null {
    // class_declaration has a 'name' field
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === 'identifier') {
          return child.text;
        }
      }
    }
    return null;
  }

  private extractJavaMethodName(node: ExtractedNode, _sourceCode: string): string | null {
    // method_declaration has a 'name' field
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === 'identifier') {
          return child.text;
        }
      }
    }
    return null;
  }

  private extractJavaInterfaceName(node: ExtractedNode, _sourceCode: string): string | null {
    // interface_declaration has a 'name' field
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === 'identifier') {
          return child.text;
        }
      }
    }
    return null;
  }

  private extractJavaPackageName(node: Parser.SyntaxNode, _sourceCode: string): string | null {
    // Look for package_declaration at the top of the file
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'package_declaration') {
        // Extract package name from scoped_identifier or identifier
        for (let j = 0; j < child.childCount; j++) {
          const pkgChild = child.child(j);
          if (pkgChild && (pkgChild.type === 'scoped_identifier' || pkgChild.type === 'identifier')) {
            return pkgChild.text;
          }
        }
      }
    }
    return null;
  }

  private extractGoPackageName(node: Parser.SyntaxNode, _sourceCode: string): string | null {
    // Look for package_clause at the top of the file
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === 'package_clause') {
        // Extract package name from package_identifier
        for (let j = 0; j < child.childCount; j++) {
          const pkgChild = child.child(j);
          if (pkgChild && pkgChild.type === 'package_identifier') {
            return pkgChild.text;
          }
        }
      }
    }
    return null;
  }

  private extractGoStructName(node: ExtractedNode, _sourceCode: string): string | null {
    for (const child of node.children || []) {
      if (child.type !== 'type_spec') {
        continue;
      }

      const structName = this.extractStructNameFromTypeSpec(child);
      if (structName) {
        return structName;
      }
    }

    return null;
  }

  private extractStructNameFromTypeSpec(typeSpecNode: ExtractedNode): string | null {
    let name: string | null = null;
    let hasStructType = false;

    for (const specChild of typeSpecNode.children || []) {
      if (specChild.type === 'type_identifier') {
        name = specChild.text;
      }

      if (specChild.type === 'struct_type') {
        hasStructType = true;
      }
    }

    if (name && hasStructType) {
      return name;
    }

    return null;
  }

  private extractGoFunctionName(node: ExtractedNode, _sourceCode: string): string | null {
    // function_declaration or method_declaration has a 'name' field
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (child.type === 'identifier' || child.type === 'field_identifier') {
          return child.text;
        }
      }
    }
    return null;
  }

  private extractGoMethodReceiver(node: ExtractedNode, _sourceCode: string): string | null {
    // method_declaration has a 'receiver' field (parameter_list)
    if (node.type !== 'method_declaration') {
      return null;
    }

    for (const child of node.children || []) {
      if (child.type !== 'parameter_list') {
        continue;
      }

      const receiverType = this.extractGoReceiverTypeFromParameterList(child);
      if (receiverType) {
        return receiverType;
      }
    }

    return null;
  }

  private extractGoReceiverTypeFromParameterList(parameterListNode: ExtractedNode): string | null {
    for (const param of parameterListNode.children || []) {
      if (param.type !== 'parameter_declaration') {
        continue;
      }

      const receiverType = this.extractGoReceiverTypeFromParameterDeclaration(param);
      if (receiverType) {
        return receiverType;
      }
    }

    return null;
  }

  private extractGoReceiverTypeFromParameterDeclaration(parameterNode: ExtractedNode): string | null {
    for (const paramChild of parameterNode.children || []) {
      if (paramChild.type === 'type_identifier') {
        return paramChild.text;
      }

      if (paramChild.type === 'pointer_type') {
        return this.extractTypeIdentifierFromPointerType(paramChild);
      }
    }

    return null;
  }

  private extractTypeIdentifierFromPointerType(pointerTypeNode: ExtractedNode): string | null {
    for (const ptrChild of pointerTypeNode.children || []) {
      if (ptrChild.type === 'type_identifier') {
        return ptrChild.text;
      }
    }

    return null;
  }


  private findChildrenByType(node: Parser.SyntaxNode | null, type: string): Parser.SyntaxNode[] {
    if (!node) return [];

    const results: Parser.SyntaxNode[] = [];

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && child.type === type) {
        results.push(child);
      }
    }

    return results;
  }

  private findDescendantsByType(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode[] {
    const results: Parser.SyntaxNode[] = [];

    const traverse = (n: Parser.SyntaxNode): void => {
      if (n.type === type) {
        results.push(n);
      }

      for (let i = 0; i < n.childCount; i++) {
        const child = n.child(i);
        if (child) {
          traverse(child);
        }
      }
    };

    traverse(node);
    return results;
  }

  private extractTopLevelNodes(root: Parser.SyntaxNode, type: string): Parser.SyntaxNode[] {
    const results: Parser.SyntaxNode[] = [];

    for (let i = 0; i < root.childCount; i++) {
      const child = root.child(i);
      if (child && child.type === type) {
        results.push(child);
      }
    }

    return results;
  }

  // ============================================================================
  // Helper Methods - Component Creation
  // ============================================================================

  private createComponent(params: {
    name: string;
    type: ComponentType;
    language: Language;
    filePaths: string[];
    abstractionLevel: AbstractionLevel;
    parent: string | null;
    metadata: ComponentMetadata;
  }): Component {
    return {
      id: this.generateComponentId(),
      name: params.name,
      type: params.type,
      language: params.language,
      filePaths: params.filePaths,
      children: [],
      parent: params.parent,
      abstractionLevel: params.abstractionLevel,
      metadata: params.metadata
    };
  }

  private generateComponentId(): string {
    return `component_${this.componentIdCounter++}`;
  }

  private getModuleName(filePath: string, rootPath: string): string {
    const relativePath = path.relative(rootPath, filePath);
    const parsed = path.parse(relativePath);
    
    // Remove extension and convert path separators to dots
    const modulePath = path.join(parsed.dir, parsed.name);
    return modulePath.replace(/[/\\]/g, '.');
  }

  /**
   * Reset component ID counter (useful for testing)
   */
  resetIdCounter(): void {
    this.componentIdCounter = 0;
  }
}
