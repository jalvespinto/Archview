/**
 * Tree-sitter parser integration for multi-language AST parsing
 * Requirements: 1.2, 1.4, 12.4
 */

import Parser from 'tree-sitter';
import { Language } from '../types';

// Language-specific parsers
import Python from 'tree-sitter-python';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import Java from 'tree-sitter-java';
import Go from 'tree-sitter-go';

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
      // Initialize Python parser
      const pythonParser = new Parser();
      pythonParser.setLanguage(Python);
      this.parsers.set(Language.Python, pythonParser);

      // Initialize JavaScript parser
      const jsParser = new Parser();
      jsParser.setLanguage(JavaScript);
      this.parsers.set(Language.JavaScript, jsParser);

      // Initialize TypeScript parser
      const tsParser = new Parser();
      tsParser.setLanguage(TypeScript.typescript);
      this.parsers.set(Language.TypeScript, tsParser);

      // Initialize Java parser
      const javaParser = new Parser();
      javaParser.setLanguage(Java);
      this.parsers.set(Language.Java, javaParser);

      // Initialize Go parser
      const goParser = new Parser();
      goParser.setLanguage(Go);
      this.parsers.set(Language.Go, goParser);

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

    // Handle unknown language
    if (language === Language.Unknown) {
      return {
        tree: this.createEmptyTree(),
        language,
        filePath,
        sourceCode,
        parseErrors: [{
          message: 'Unknown language - cannot parse',
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 0, column: 0 }
        }]
      };
    }

    const parser = this.parsers.get(language);
    if (!parser) {
      return {
        tree: this.createEmptyTree(),
        language,
        filePath,
        sourceCode,
        parseErrors: [{
          message: `No parser available for language: ${language}`,
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 0, column: 0 }
        }]
      };
    }

    try {
      const tree = parser.parse(sourceCode);
      const parseErrors = this.extractParseErrors(tree);

      return {
        tree,
        language,
        filePath,
        sourceCode,
        parseErrors
      };
    } catch (error) {
      // Graceful fallback: return empty tree with error
      return {
        tree: this.createEmptyTree(),
        language,
        filePath,
        sourceCode,
        parseErrors: [{
          message: `Parse failed: ${error instanceof Error ? error.message : String(error)}`,
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 0, column: 0 }
        }]
      };
    }
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
    const errors: ParseError[] = [];
    const rootNode = tree.rootNode;

    const findErrors = (node: Parser.SyntaxNode): void => {
      if (node.type === 'ERROR' || node.isMissing) {
        errors.push({
          message: node.isMissing 
            ? `Missing ${node.type}` 
            : `Syntax error at ${node.type}`,
          startPosition: {
            row: node.startPosition.row,
            column: node.startPosition.column
          },
          endPosition: {
            row: node.endPosition.row,
            column: node.endPosition.column
          }
        });
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) {
          findErrors(child);
        }
      }
    };

    findErrors(rootNode);
    return errors;
  }

  /**
   * Convert Tree-sitter node to ExtractedNode format
   */
  private nodeToExtractedNode(node: Parser.SyntaxNode): ExtractedNode {
    const children: ExtractedNode[] = [];
    
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child) {
        children.push(this.nodeToExtractedNode(child));
      }
    }

    return {
      type: node.type,
      text: node.text,
      startPosition: {
        row: node.startPosition.row,
        column: node.startPosition.column
      },
      endPosition: {
        row: node.endPosition.row,
        column: node.endPosition.column
      },
      children
    };
  }

  /**
   * Create an empty tree for error cases
   */
  private createEmptyTree(): Parser.Tree {
    // Create a minimal parser to generate an empty tree
    const tempParser = new Parser();
    return tempParser.parse('');
  }

  /**
   * Dispose of all parsers and free resources
   */
  dispose(): void {
    this.parsers.clear();
    this.initialized = false;
  }
}
