import { Component, Language, Relationship } from '../types';
import { FileGroundingData } from '../types/analysis';
import { ScannedFile } from './FileScanner';
import { ParsedAST, ParserManager } from './ParserManager';
import { ComponentExtractor } from './ComponentExtractor';
import { RelationshipExtractor } from './RelationshipExtractor';

export interface ParsedFileResult {
  scannedFile: ScannedFile;
  ast: ParsedAST;
}

export interface ParsedFileProcessingContext {
  rootPath: string;
  parseResult: ParsedFileResult;
  parserManager: Pick<ParserManager, 'hasErrors'>;
  componentExtractor: Pick<ComponentExtractor, 'extractComponents'>;
  relationshipExtractor: Pick<RelationshipExtractor, 'extractRelationships'>;
  buildFileGroundingData: (
    filePath: string,
    language: Language,
    components: Component[],
    sourceCode: string
  ) => FileGroundingData;
  createEmptyFileGroundingData: (filePath: string, language: Language) => FileGroundingData;
  allComponents: Component[];
  allRelationships: Relationship[];
  fileGroundingDataMap: Map<string, FileGroundingData>;
}

export async function processParsedFileResultForGrounding(
  context: ParsedFileProcessingContext
): Promise<void> {
  const { scannedFile, ast } = context.parseResult;

  if (context.parserManager.hasErrors(ast) && ast.parseErrors.length > 0) {
    context.fileGroundingDataMap.set(
      scannedFile.path,
      context.createEmptyFileGroundingData(scannedFile.path, scannedFile.language)
    );
    return;
  }

  const extractionResult = await context.componentExtractor.extractComponents({
    rootPath: context.rootPath,
    filePath: scannedFile.path,
    ast,
    parserManager: context.parserManager as ParserManager
  });
  context.allComponents.push(...extractionResult.components);

  const relationships = await context.relationshipExtractor.extractRelationships({
    ast,
    components: extractionResult.components,
    parserManager: context.parserManager as ParserManager
  });
  context.allRelationships.push(...relationships);

  const fileGrounding = context.buildFileGroundingData(
    scannedFile.path,
    scannedFile.language,
    extractionResult.components,
    ast.sourceCode
  );
  context.fileGroundingDataMap.set(scannedFile.path, fileGrounding);
}
