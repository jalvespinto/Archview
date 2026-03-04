import Parser from 'tree-sitter';
import type { ExtractedNode } from './ParserManager';

export function treeSitterNodeToExtractedNode(node: Parser.SyntaxNode): ExtractedNode {
  const children: ExtractedNode[] = [];

  for (let i = 0; i < node.namedChildCount; i++) {
    const child = node.namedChild(i);
    if (child) {
      children.push(treeSitterNodeToExtractedNode(child));
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
