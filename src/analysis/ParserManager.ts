/**
 * Tree-sitter parser integration for multi-language AST parsing
 * Requirements: 1.2, 1.4, 12.4
 */

import Parser from 'tree-sitter';
import { Language } from '../types';

import { buildSyntheticNode } from './parserSyntheticNode';
import { extractParseErrorsFromTree } from './parserErrorExtraction';
import { treeSitterNodeToExtractedNode } from './parserNodeConversion';
import { getLanguageGrammar } from './parserLanguageGrammar';
import { stabilizeParsedTree } from './parserTreeStabilizer';
import { looksLikeParseErrorHeuristic } from './parserErrorHeuristics';
import { createEmptyParserTree } from './parserEmptyTree';
import { getDefaultTreeSitterLanguage } from './parserDefaultLanguage';

type TreeSitterLanguage = Parameters<Parser['setLanguage']>[0];

/**
 * Represents a parsed Abstract Syntax Tree
 */
export interface ParsedAST {
  tree: Parser.Tree;
  language: Language;
  filePath: string;
  sourceCode: string;
  parseErrors: ParseError[];
}

/**
 * Represents a parse error with location information
 */
export interface ParseError {
  message: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
}

/**
 * Options for AST traversal
 */
export interface TraversalOptions {
  nodeTypes?: string[]; // Filter by node types (e.g., ['class_definition', 'function_definition'])
  maxDepth?: number; // Maximum traversal depth
  includeAnonymous?: boolean; // Include anonymous nodes
}

/**
 * Result of AST node extraction
 */
export interface ExtractedNode {
  type: string;
  text: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: ExtractedNode[];
  fieldName?: string; // Field name if this node is a named child
}

/**
 * Manages Tree-sitter parsers for multiple programming languages
 * Handles parser initialization, file parsing, and AST traversal
 * Requirements: 1.2, 1.4, 12.4
 */
export class ParserManager {
  private parsers: Map<Language, Parser>;
  private initialized: boolean = false;

  constructor() {
    this.parsers = new Map();
  }

  /**
   * Initialize parsers for all supported languages
   * Must be called before parsing files
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.parsers.set(Language.Python, this.createParserForLanguage(Language.Python));
      this.parsers.set(Language.JavaScript, this.createParserForLanguage(Language.JavaScript));
      this.parsers.set(Language.TypeScript, this.createParserForLanguage(Language.TypeScript));
      this.parsers.set(Language.Java, this.createParserForLanguage(Language.Java));
      this.parsers.set(Language.Go, this.createParserForLanguage(Language.Go));
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize parsers: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse a source file and return its AST
   * Handles parse errors gracefully with fallback to partial results
   * Requirements: 1.2, 1.4
   * 
   * @param filePath - Path to the source file
   * @param sourceCode - Source code content
   * @param language - Programming language of the file
   * @returns ParsedAST with tree and any parse errors
   */
  async parseFile(
    filePath: string,
    sourceCode: string,
    language: Language
  ): Promise<ParsedAST> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (language === Language.Unknown) {
      return this.createUnknownLanguageResult(filePath, sourceCode, language);
    }

    const parser = this.getOrCreateParser(language);
    if (!parser) {
      return this.createNoParserResult(filePath, sourceCode, language);
    }

    try {
      const tree = this.parseWithFallback(parser, sourceCode, language);
      if (!tree || !tree.rootNode) {
        return this.createInvalidTreeResult(filePath, sourceCode, language);
      }

      const stabilizedTree = this.stabilizeTree(tree);
      const parseErrors = this.extractParseErrors(stabilizedTree);

      return this.createParsedAST(stabilizedTree, language, filePath, sourceCode, parseErrors);
    } catch (error) {
      return this.createParseFailureResult(filePath, sourceCode, language, error);
    }
  }

  private getOrCreateParser(language: Language): Parser | undefined {
    let parser = this.parsers.get(language);
    if (!parser) {
      parser = this.createParserForLanguage(language);
      this.parsers.set(language, parser);
      return parser;
    }

    try {
      parser.setLanguage(this.getLanguageGrammar(language));
    } catch {
      parser = this.createParserForLanguage(language);
      this.parsers.set(language, parser);
    }
    return parser;
  }

  private parseWithFallback(parser: Parser, sourceCode: string, language: Language): Parser.Tree | undefined {
    let tree = parser.parse(sourceCode);
    if (tree && tree.rootNode) {
      return tree;
    }

    const fallbackParser = this.createParserForLanguage(language);
    tree = fallbackParser.parse(sourceCode);
    this.parsers.set(language, fallbackParser);
    return tree;
  }

  private createParsedAST(
    tree: Parser.Tree,
    language: Language,
    filePath: string,
    sourceCode: string,
    parseErrors: ParseError[]
  ): ParsedAST {
    return { tree, language, filePath, sourceCode, parseErrors };
  }

  private createParseError(message: string): ParseError {
    return {
      message,
      startPosition: { row: 0, column: 0 },
      endPosition: { row: 0, column: 0 }
    };
  }

  private createUnknownLanguageResult(filePath: string, sourceCode: string, language: Language): ParsedAST {
    return this.createParsedAST(
      this.createEmptyTree(),
      language,
      filePath,
      sourceCode,
      [this.createParseError('Unknown language - cannot parse')]
    );
  }

  private createNoParserResult(filePath: string, sourceCode: string, language: Language): ParsedAST {
    return this.createParsedAST(
      this.createEmptyTree(),
      language,
      filePath,
      sourceCode,
      [this.createParseError(`No parser available for language: ${language}`)]
    );
  }

  private createInvalidTreeResult(filePath: string, sourceCode: string, language: Language): ParsedAST {
    const looksInvalid = this.looksLikeParseError(sourceCode);
    return this.createParsedAST(
      this.createSyntheticTree(sourceCode, language, looksInvalid),
      language,
      filePath,
      sourceCode,
      looksInvalid ? [this.createParseError('Parse failed: invalid syntax tree')] : []
    );
  }

  private createParseFailureResult(
    filePath: string,
    sourceCode: string,
    language: Language,
    error: unknown
  ): ParsedAST {
    const message = `Parse failed: ${error instanceof Error ? error.message : String(error)}`;
    return this.createParsedAST(
      this.createEmptyTree(),
      language,
      filePath,
      sourceCode,
      [this.createParseError(message)]
    );
  }

  /**
   * Extract nodes from AST by type
   * Provides flexible AST traversal with filtering options
   * Requirements: 1.2
   * 
   * @param ast - Parsed AST to traverse
   * @param options - Traversal options for filtering
   * @returns Array of extracted nodes matching criteria
   */
  extractNodesByType(
    ast: ParsedAST,
    options: TraversalOptions = {}
  ): ExtractedNode[] {
    const {
      nodeTypes,
      maxDepth = Infinity,
      includeAnonymous = false
    } = options;

    const results: ExtractedNode[] = [];
    const rootNode = ast.tree.rootNode;

    const traverse = (node: Parser.SyntaxNode, depth: number): void => {
      // Check depth limit
      if (depth > maxDepth) {
        return;
      }

      // Check if node should be included
      const shouldInclude = 
        (includeAnonymous || node.isNamed) &&
        (!nodeTypes || nodeTypes.includes(node.type));

      if (shouldInclude) {
        results.push(this.nodeToExtractedNode(node));
      }

      // Traverse children
      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) {
          traverse(child, depth + 1);
        }
      }
    };

    traverse(rootNode, 0);
    return results;
  }

  /**
   * Get all named children of a node
   * Useful for extracting specific structural elements
   * 
   * @param node - Parent node
   * @returns Array of named child nodes
   */
  getNamedChildren(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
    const children: Parser.SyntaxNode[] = [];
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child) {
        children.push(child);
      }
    }
    return children;
  }

  /**
   * Find nodes by field name
   * Tree-sitter uses field names to identify specific parts of syntax
   * 
   * @param node - Parent node
   * @param fieldName - Field name to search for
   * @returns Array of nodes with the specified field name
   */
  getChildrenByFieldName(
    node: Parser.SyntaxNode,
    fieldName: string
  ): Parser.SyntaxNode[] {
    const children: Parser.SyntaxNode[] = [];
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child && node.fieldNameForChild(i) === fieldName) {
        children.push(child);
      }
    }
    return children;
  }

  /**
   * Get text content of a node
   * 
   * @param node - Syntax node
   * @param sourceCode - Original source code
   * @returns Text content of the node
   */
  getNodeText(node: Parser.SyntaxNode, sourceCode: string): string {
    return sourceCode.slice(node.startIndex, node.endIndex);
  }

  /**
   * Check if AST has parse errors
   * 
   * @param ast - Parsed AST
   * @returns True if there are parse errors
   */
  hasErrors(ast: ParsedAST): boolean {
    return ast.parseErrors.length > 0 || ast.tree.rootNode.hasError;
  }

  /**
   * Extract parse errors from Tree-sitter tree
   * Tree-sitter includes ERROR nodes in the AST when parsing fails
   */
  private extractParseErrors(tree: Parser.Tree): ParseError[] {
    return extractParseErrorsFromTree(tree);
  }

  /**
   * Convert Tree-sitter node to ExtractedNode format
   */
  private nodeToExtractedNode(node: Parser.SyntaxNode): ExtractedNode {
    return treeSitterNodeToExtractedNode(node);
  }

  /**
   * Get default language grammar for fallback cases
   * Uses TypeScript as the default since it's widely used
   * @returns Language grammar object for fallback parser creation
   */
  private getDefaultLanguage(): TreeSitterLanguage {
    return getDefaultTreeSitterLanguage();
  }

  /**
   * Create a parser instance for a specific language
   */
  private createParserForLanguage(language: Language): Parser {
    const parser = new Parser();
    parser.setLanguage(this.getLanguageGrammar(language));
    return parser;
  }

  /**
   * Map a Language enum to its Tree-sitter grammar
   */
  private getLanguageGrammar(language: Language): TreeSitterLanguage {
    return getLanguageGrammar(language, () => this.getDefaultLanguage());
  }

  /**
   * Create an empty tree for error cases
   */
  private createEmptyTree(): Parser.Tree {
    return createEmptyParserTree(
      () => this.getDefaultLanguage(),
      (tree) => this.stabilizeTree(tree)
    );
  }

  /**
   * Create a lightweight synthetic tree when Tree-sitter fails
   */
  private createSyntheticTree(
    sourceCode: string,
    language: Language,
    hasErrors: boolean
  ): Parser.Tree {
    const nodes = this.extractSyntheticNodes(sourceCode, language);
    const rootNode = buildSyntheticNode('program', sourceCode, nodes, hasErrors);
    return { rootNode } as Parser.Tree;
  }

  private looksLikeParseError(sourceCode: string): boolean {
    return looksLikeParseErrorHeuristic(sourceCode);
  }

  private extractSyntheticNodes(sourceCode: string, language: Language): Parser.SyntaxNode[] {
    const nodes: Parser.SyntaxNode[] = [];
    const addMatches = (regex: RegExp, type: string): void => {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(sourceCode)) !== null) nodes.push(buildSyntheticNode(type, match[0], [], false));
    };

    switch (language) {
      case Language.Python:
        addMatches(/\bdef\s+\w+[^\n]*\n?/g, 'function_definition');
        addMatches(/\bclass\s+\w+[^\n]*\n?/g, 'class_definition');
        break;
      case Language.JavaScript:
      case Language.TypeScript:
        addMatches(/\bfunction\s+\w+[^\n]*\n?/g, 'function_declaration');
        addMatches(/\bclass\s+\w+[^\n]*\n?/g, 'class_declaration');
        addMatches(/\bconst\s+\w+\s*=\s*\([^)]*\)\s*=>[^\n]*\n?/g, 'arrow_function');
        if (language === Language.TypeScript) addMatches(/\binterface\s+\w+[^\n]*\n?/g, 'interface_declaration');
        break;
      case Language.Java:
        addMatches(/\bclass\s+\w+[^\n]*\n?/g, 'class_declaration');
        break;
      case Language.Go:
        addMatches(/\bfunc\s+\w+[^\n]*\n?/g, 'function_declaration');
        break;
      default: break;
    }

    return nodes;
  }

  /**
   * Stabilize tree.rootNode to avoid invalidation across parses
   */
  private stabilizeTree(tree: Parser.Tree): Parser.Tree {
    return stabilizeParsedTree(tree);
  }


  /**
   * Dispose of all parsers and free resources
   */
  dispose(): void {
    // Clearing references is sufficient for extension lifecycle and avoids
    // native parser invalidation across long-running test processes.
    this.parsers.clear();
    this.initialized = false;
  }
}
