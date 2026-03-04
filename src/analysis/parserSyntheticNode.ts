import Parser from 'tree-sitter';

export function buildSyntheticNode(
  type: string,
  text: string,
  children: Parser.SyntaxNode[],
  hasError: boolean
): Parser.SyntaxNode {
  const startPosition = { row: 0, column: 0 };
  const endPosition = { row: 0, column: Math.max(0, text.length) };
  return {
    type,
    text,
    startPosition,
    endPosition,
    startIndex: 0,
    endIndex: Math.max(0, text.length),
    isNamed: true,
    hasError,
    isMissing: false,
    childCount: children.length,
    namedChildCount: children.length,
    child: (i: number) => children[i] ?? null,
    namedChild: (i: number) => children[i] ?? null,
    childForFieldName: () => null,
    fieldNameForChild: () => null
  } as unknown as Parser.SyntaxNode;
}
