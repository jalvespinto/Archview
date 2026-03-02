import Parser from 'tree-sitter';

interface NodeLocator {
  type: string;
  startPosition: {
    row: number;
    column: number;
  };
}

/**
 * Find a specific node in a Tree-sitter syntax tree by matching type and position.
 * 
 * @param root - The root node to start searching from
 * @param target - The target node with type and position to match
 * @returns The matching node or null if not found
 */
export function findNodeInTree(root: Parser.SyntaxNode, target: NodeLocator): Parser.SyntaxNode | null {
  // Find the actual Tree-sitter node corresponding to an ExtractedNode
  const traverse = (node: Parser.SyntaxNode): Parser.SyntaxNode | null => {
    if (
      node.type === target.type &&
      node.startPosition.row === target.startPosition.row &&
      node.startPosition.column === target.startPosition.column
    ) {
      return node;
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        const result = traverse(child);
        if (result) return result;
      }
    }

    return null;
  };

  return traverse(root);
}
