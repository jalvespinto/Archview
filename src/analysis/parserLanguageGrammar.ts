import Parser from 'tree-sitter';
import { Language } from '../types';
import Python from 'tree-sitter-python';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';
import Java from 'tree-sitter-java';
import Go from 'tree-sitter-go';

type TreeSitterLanguage = Parameters<Parser['setLanguage']>[0];

export function getLanguageGrammar(
  language: Language,
  getDefaultLanguage: () => TreeSitterLanguage
): TreeSitterLanguage {
  switch (language) {
    case Language.Python:
      return Python;
    case Language.JavaScript:
      return JavaScript;
    case Language.TypeScript:
      return TypeScript.typescript;
    case Language.Java:
      return Java;
    case Language.Go:
      return Go;
    default:
      return getDefaultLanguage();
  }
}
