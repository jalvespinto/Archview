import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';

type TreeSitterLanguage = Parameters<Parser['setLanguage']>[0];

export function getDefaultTreeSitterLanguage(): TreeSitterLanguage {
  return TypeScript.typescript;
}
