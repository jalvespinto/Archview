import Parser from 'tree-sitter';

interface ParseErrorLike {
  message: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
}

export function extractParseErrorsFromTree(tree: Parser.Tree): ParseErrorLike[] {
  const errors: ParseErrorLike[] = [];

  const findErrors = (node: Parser.SyntaxNode): void => {
    if (node.type === 'ERROR' || node.isMissing) {
      errors.push({
        message: node.isMissing ? `Missing ${node.type}` : `Syntax error at ${node.type}`,
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

  findErrors(tree.rootNode);
  return errors;
}
