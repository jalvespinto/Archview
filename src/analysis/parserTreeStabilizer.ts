import Parser from 'tree-sitter';

export function stabilizeParsedTree(tree: Parser.Tree): Parser.Tree {
  const rootNode = tree.rootNode;
  const stableTree = Object.create(tree) as Parser.Tree;
  Object.defineProperty(stableTree, 'rootNode', {
    value: rootNode,
    writable: false,
    enumerable: true,
    configurable: false
  });
  return stableTree;
}
