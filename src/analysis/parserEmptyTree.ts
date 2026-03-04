import Parser from 'tree-sitter';

type TreeSitterLanguage = Parameters<Parser['setLanguage']>[0];

export function createEmptyParserTree(
  getDefaultLanguage: () => TreeSitterLanguage,
  stabilizeTree: (tree: Parser.Tree) => Parser.Tree
): Parser.Tree {
  const tempParser = new Parser();
  tempParser.setLanguage(getDefaultLanguage());
  return stabilizeTree(tempParser.parse(''));
}
