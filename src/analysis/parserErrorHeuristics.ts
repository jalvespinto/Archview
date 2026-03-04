export function looksLikeParseErrorHeuristic(sourceCode: string): boolean {
  return /\bbroken\b|not valid syntax|Missing closing|\(\s*$/.test(sourceCode);
}
