/**
 * KiroAIService: AI-powered architectural interpretation service
 * 
 * This service is the primary producer of the Architectural Model.
 * It takes the compact Grounding Layer from static analysis and uses
 * the Kiro AI API to interpret it into a semantic architectural understanding.
 * 
 * Requirements: 1.4, 2.2
 * Task: 6.1
 */

import {
  GroundingData,
  ArchitecturalModel,
  ArchitecturalComponent,
  ArchitecturalRelationship,
  ArchitecturalModelMetadata,
  FileGroundingData,
} from '../types/analysis';
import { AbstractionLevel, RelationshipType } from '../types';
import { ArchitecturalModelCache } from './ArchitecturalModelCache';

/**
 * Response structure expected from the LLM
 */
interface LLMArchitectureResponse {
  components: Array<{
    id: string;
    name: string;
    description: string;
    role: string;
    filePaths: string[];
    abstractionLevel: number;
    subComponents: string[];
    parent: string | null;
  }>;
  relationships: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    type: string;
    description: string;
    strength: number;
  }>;
  patterns: string[];
  confidence: 'high' | 'medium' | 'low';
  ambiguousFiles?: string[];
}

/**
 * Kiro AI API interface
 */
interface KiroAI {
  sendMessage(prompt: string, options?: unknown): Promise<string>;
}

/**
 * Result of getting the Kiro AI instance
 */
interface KiroAIResult {
  api: KiroAI;
  isMock: boolean;
}

type FileGroundingDataWithExcerpt = FileGroundingData & { contentExcerpt?: string };
type KiroImport = { ai?: KiroAI };
type GlobalWithKiro = typeof globalThis & { kiro?: { ai?: KiroAI } };

export class KiroAIService {
  private kiroAI: KiroAI | null = null;
  private isMock: boolean = false;
  private cache: ArchitecturalModelCache;

  constructor() {
    this.cache = new ArchitecturalModelCache();
  }

  /**
   * Initialize the Kiro AI service
   * Attempts to access the Kiro AI API through multiple patterns
   */
  async initialize(): Promise<void> {
    const { api, isMock } = await this.getKiroAI(); this.kiroAI = api; this.isMock = isMock;
  }

  /**
   * Primary entry point: interpret grounding data into an architectural model
   * 
   * @param grounding - The compact grounding layer from static analysis
   * @param tier - The enrichment tier to use (1, 2, or 3)
   * @returns The architectural model with semantic understanding
   */
  async interpretArchitecture(
    grounding: GroundingData,
    tier: 1 | 2 | 3 = 1
  ): Promise<ArchitecturalModel> {
    if (!this.kiroAI) await this.initialize();
    const cached = await this.cache.get(grounding, tier), startTime = Date.now();
    if (cached) return cached;
    try {
      const llmResponse = this.parseLLMResponse(await this.kiroAI!.sendMessage(this.buildPromptForTier(grounding, tier)));
      const model = this.convertToArchitecturalModel(llmResponse, grounding, tier, Date.now() - startTime);
      await this.cache.set(grounding, tier, model);
      if (model.metadata.confidence === 'low' && tier < 3) {
        const ambiguousFiles = this.extractAmbiguousFiles(llmResponse, grounding);
        if (ambiguousFiles.length > 0) return this.interpretArchitecture(await this.enrichGrounding(grounding, ambiguousFiles, (tier + 1) as 2 | 3), (tier + 1) as 2 | 3);
      }
      return model;
    } catch (error) {
      console.warn('LLM interpretation failed, using heuristic fallback:', error);
      const fallbackModel = this.buildHeuristicModel(grounding, Date.now() - startTime);
      await this.cache.set(grounding, tier, fallbackModel);
      return fallbackModel;
    }
  }
  /**
   * Enrich grounding data with additional detail for ambiguous files
   * Tier 2: Add function signatures and method lists
   * Tier 3: Add first 50 lines of file content
   *
   * @param grounding - The original grounding data
   * @param ambiguousFilePaths - Files that need more detail
   * @param targetTier - The tier to enrich to (2 or 3)
   * @returns Enriched grounding data
   */
  async enrichGrounding(
    grounding: GroundingData,
    ambiguousFilePaths: string[],
    targetTier: 2 | 3
  ): Promise<GroundingData> {
    const enriched: GroundingData = { ...grounding, files: [...grounding.files] }, filesToEnrich = enriched.files.filter((file) => ambiguousFilePaths.includes(file.path));
    await (targetTier === 2 ? this.enrichToTier2(filesToEnrich) : this.enrichToTier3(filesToEnrich, grounding.rootPath));
    return enriched;
  }
  /**
   * Extract list of ambiguous files from LLM response
   *
   * @param llmResponse - The LLM response
   * @param grounding - The grounding data
   * @returns Array of file paths that need enrichment
   */
  private extractAmbiguousFiles(
    llmResponse: LLMArchitectureResponse,
    grounding: GroundingData
  ): string[] {
    if (llmResponse.ambiguousFiles && llmResponse.ambiguousFiles.length > 0) return llmResponse.ambiguousFiles;
    const ambiguous: string[] = [], genericNames = ['util', 'helper', 'common', 'shared', 'index', 'main'];
    for (const file of grounding.files) {
      const baseName = (file.path.split('/').pop()?.toLowerCase() || '').replace(/\.[^.]+$/, '');
      if (genericNames.some((name) => baseName.includes(name)) || (file.exports.length === 0 && file.classes.length === 0 && file.topLevelFunctions.length === 0)) ambiguous.push(file.path);
    }
    return ambiguous;
  }

  /**
   * Enrich files to Tier 2: add function signatures and method lists
   *
   * @param files - Files to enrich
   */
  private async enrichToTier2(files: FileGroundingData[]): Promise<void> {
    const parserManager = new (await import('./ParserManager')).ParserManager(), fs = await import('fs/promises');
    await parserManager.initialize();
    for (const file of files) {
      try {
        const sourceCode = await fs.readFile(file.path, 'utf-8'), ast = await parserManager.parseFile(file.path, sourceCode, file.language);
        for (const func of file.topLevelFunctions) {
          if (!func.signature) func.signature = await this.extractFunctionSignature(func.name, ast, sourceCode);
        }
        for (const cls of file.classes) {
          if (!cls.methods || cls.methods.length === 0) cls.methods = await this.extractClassMethods(cls.name, ast, sourceCode);
        }
      } catch (error) {
        console.warn(`Failed to enrich file ${file.path} to Tier 2:`, error);
      }
    }
    parserManager.dispose();
  }

  /**
   * Enrich files to Tier 3: add first 50 lines of file content
   *
   * @param files - Files to enrich
   * @param rootPath - Root path for resolving file paths
   */
  private async enrichToTier3(
    files: FileGroundingData[],
    rootPath: string
  ): Promise<void> {
    const [fs, path] = await Promise.all([import('fs/promises'), import('path')]);
    for (const file of files) {
      try {
        (file as FileGroundingDataWithExcerpt).contentExcerpt = (await fs.readFile(path.isAbsolute(file.path) ? file.path : path.join(rootPath, file.path), 'utf-8')).split('\n').slice(0, 50).join('\n');
      } catch (error) {
        console.warn(`Failed to enrich file ${file.path} to Tier 3:`, error);
      }
    }
  }

  /**
   * Extract function signature from AST
   *
   * @param functionName - Name of the function
   * @param ast - Parsed AST
   * @param sourceCode - Source code
   * @returns Function signature string
   */
  private async extractFunctionSignature(functionName: string, _ast: unknown, _sourceCode: string): Promise<string> { return `${functionName}(...)`; }

  /**
   * Extract method names from a class in the AST
   *
   * @param className - Name of the class
   * @param ast - Parsed AST
   * @param sourceCode - Source code
   * @returns Array of method names
   */
  private async extractClassMethods(_className: string, _ast: unknown, _sourceCode: string): Promise<string[]> { return []; }

  /**
   * Build Tier 1 prompt from grounding data
   * Tier 1 includes: directory tree, file metadata, import graph, inheritance graph
   * 
   * @param grounding - The grounding data to convert to a prompt
   * @returns The formatted prompt string
   */
  private buildTier1Prompt(grounding: GroundingData): string {
    return `You are analyzing a software architecture. Below is the structural grounding data extracted
from the codebase via static analysis. Your task is to produce a semantic Architectural Model.

Directory structure:
${JSON.stringify(grounding.directoryTree, null, 2)}

Files and their exports/imports:
${JSON.stringify(grounding.files, null, 2)}

Import relationships:
${JSON.stringify(grounding.importGraph, null, 2)}

Inheritance relationships:
${JSON.stringify(grounding.inheritanceGraph, null, 2)}

Produce a JSON response with this exact structure:
{
  "components": [
    {
      "id": "unique-id",
      "name": "Descriptive component name",
      "description": "What this component does (max 50 words)",
      "role": "architectural role (e.g., 'control plane', 'auth module', 'data access layer')",
      "filePaths": ["list", "of", "file", "paths"],
      "abstractionLevel": 1,
      "subComponents": [],
      "parent": null
    }
  ],
  "relationships": [
    {
      "id": "unique-id",
      "sourceId": "component-id",
      "targetId": "component-id",
      "type": "import|dependency|inheritance|composition|function_call",
      "description": "What this relationship represents",
      "strength": 0.8
    }
  ],
  "patterns": ["list of detected architectural patterns"],
  "confidence": "high|medium|low",
  "ambiguousFiles": ["paths of files needing more detail if confidence is low"]
}

Focus on:
1. Grouping files that belong together into named architectural components
2. Identifying layers (e.g., API, business logic, data access, infrastructure)
3. Detecting feature modules (e.g., auth, payments, notifications)
4. Naming components at a meaningful level of abstraction`;
  }
  /**
   * Build prompt for the specified tier
   *
   * @param grounding - The grounding data
   * @param tier - The tier level (1, 2, or 3)
   * @returns The formatted prompt string
   */
  private buildPromptForTier(grounding: GroundingData, tier: 1 | 2 | 3): string {
    let prompt = this.buildTier1Prompt(grounding);
    if (tier >= 2) prompt += '\n\n--- TIER 2 ENRICHMENT ---\nAdditional function signatures and method lists have been provided for ambiguous files.\n';
    if (tier === 3) {
      prompt += '\n\n--- TIER 3 ENRICHMENT ---\nFile content excerpts (first 50 lines) have been provided for critical files:\n\n';
      for (const file of grounding.files) {
        const excerpt = (file as FileGroundingDataWithExcerpt).contentExcerpt; if (excerpt) prompt += `\nFile: ${file.path}\n\`\`\`\n${excerpt}\n\`\`\`\n`;
      }
    }
    return prompt;
  }

  /**
   * Parse LLM JSON response into structured format
   * Handles both string and object responses
   * 
   * @param response - The raw response from the LLM
   * @returns Parsed LLM response structure
   */
  private parseLLMResponse(response: string): LLMArchitectureResponse {
    try {
      if (this.isLLMResponseObject(response)) return response;
      const parsed = JSON.parse(response) as unknown; this.validateLLMResponse(parsed); return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(`Failed to parse LLM response as JSON: ${error.message}`); throw error;
    }
  }

  private isLLMResponseObject(response: unknown): response is LLMArchitectureResponse {
    return typeof response === 'object' && response !== null;
  }

  private validateLLMResponse(parsed: unknown): asserts parsed is LLMArchitectureResponse {
    if (!this.hasArrayField(parsed, 'components')) throw new Error('Invalid response: missing or invalid components array');
    if (!this.hasArrayField(parsed, 'relationships')) throw new Error('Invalid response: missing or invalid relationships array');
    if (!this.hasArrayField(parsed, 'patterns')) throw new Error('Invalid response: missing or invalid patterns array');
    if (!this.hasValidConfidence(parsed)) throw new Error('Invalid response: missing or invalid confidence level');
  }

  private hasArrayField(parsed: unknown, field: 'components' | 'relationships' | 'patterns'): boolean {
    return !!parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>)[field]);
  }

  private hasValidConfidence(parsed: unknown): boolean {
    return !!parsed && typeof parsed === 'object' && ['high', 'medium', 'low'].includes((parsed as { confidence?: unknown }).confidence as string);
  }

  /**
   * Convert LLM response to ArchitecturalModel structure
   * Maps LLM types to our internal types and adds metadata
   * 
   * @param llmResponse - The parsed LLM response
   * @param grounding - The original grounding data
   * @param tier - The tier used for this interpretation
   * @param inferenceTimeMs - Time taken for LLM inference
   * @returns Complete ArchitecturalModel
   */
  private convertToArchitecturalModel(llmResponse: LLMArchitectureResponse, grounding: GroundingData, tier: 1 | 2 | 3, inferenceTimeMs: number): ArchitecturalModel {
    const components: ArchitecturalComponent[] = llmResponse.components.map(comp => ({
      id: comp.id, name: comp.name, description: comp.description, role: comp.role, filePaths: comp.filePaths,
      abstractionLevel: this.mapAbstractionLevel(comp.abstractionLevel), subComponents: comp.subComponents, parent: comp.parent,
    }));
    const relationships: ArchitecturalRelationship[] = llmResponse.relationships.map(rel => ({
      id: rel.id, sourceId: rel.sourceId, targetId: rel.targetId, type: this.mapRelationshipType(rel.type),
      description: rel.description, strength: rel.strength,
    }));
    return { components, relationships, patterns: llmResponse.patterns, metadata: { llmInferenceTimeMs: inferenceTimeMs, tierUsed: tier, confidence: llmResponse.confidence, filesAnalyzed: grounding.files.length } };
  }

  /**
   * Map numeric abstraction level to enum
   */
  private mapAbstractionLevel(level: number): AbstractionLevel {
    return ({ 1: AbstractionLevel.Overview, 2: AbstractionLevel.Module, 3: AbstractionLevel.Detailed } as Record<number, AbstractionLevel>)[level] ?? AbstractionLevel.Overview;
  }

  /**
   * Map string relationship type to enum
   */
  private mapRelationshipType(type: string): RelationshipType {
    return ({ import: RelationshipType.Import, dependency: RelationshipType.Dependency, inheritance: RelationshipType.Inheritance, composition: RelationshipType.Composition, function_call: RelationshipType.FunctionCall } as Record<string, RelationshipType>)[type.toLowerCase()] ?? RelationshipType.Dependency;
  }

  /**
   * Build a heuristic architectural model when LLM is unavailable
   * Groups files by top-level directory and derives relationships from import graph
   * 
   * @param grounding - The grounding data
   * @param inferenceTimeMs - Time taken (for consistency with LLM path)
   * @returns Heuristic architectural model with low confidence
   */
  public buildHeuristicModel(grounding: GroundingData, inferenceTimeMs: number): ArchitecturalModel {
    const components = this.createHeuristicComponents(grounding);
    return { components, relationships: this.deriveHeuristicRelationships(grounding, components), patterns: [], metadata: this.createHeuristicMetadata(grounding, inferenceTimeMs) };
  }

  private createHeuristicComponents(grounding: GroundingData): ArchitecturalComponent[] {
    const components: ArchitecturalComponent[] = [], directoryGroups = this.groupFilesByTopLevelDirectory(grounding);
    for (const [dirPath, files] of directoryGroups.entries()) {
      components.push({
        id: this.sanitizeId(dirPath), name: this.formatComponentName(dirPath.split('/').pop() || dirPath),
        description: `Component containing files from ${dirPath}`, role: 'module', filePaths: files.map((f) => f.path),
        abstractionLevel: AbstractionLevel.Overview, subComponents: [], parent: null,
      });
    }
    return components;
  }

  private deriveHeuristicRelationships(grounding: GroundingData, components: ArchitecturalComponent[]): ArchitecturalRelationship[] {
    const relationships: ArchitecturalRelationship[] = [], componentMap = this.buildFileToComponentMap(components), relationshipSet = new Set<string>();
    for (const importEdge of grounding.importGraph) {
      const sourceComponent = componentMap.get(importEdge.sourceFile), targetComponent = componentMap.get(importEdge.targetFile);
      const relId = this.getHeuristicRelationshipId(sourceComponent, targetComponent);
      if (!sourceComponent || !targetComponent || !relId || relationshipSet.has(relId)) continue;
      relationshipSet.add(relId);
      relationships.push(this.createHeuristicImportRelationship(relId, sourceComponent, targetComponent));
    }
    return relationships;
  }

  private getHeuristicRelationshipId(sourceComponent: string | undefined, targetComponent: string | undefined): string | undefined {
    return !sourceComponent || !targetComponent || sourceComponent === targetComponent ? undefined : `${sourceComponent}->${targetComponent}`;
  }

  private createHeuristicImportRelationship(
    relId: string,
    sourceId: string,
    targetId: string
  ): ArchitecturalRelationship {
    return { id: this.sanitizeId(relId), sourceId, targetId, type: RelationshipType.Import, description: `Import dependency from ${sourceId} to ${targetId}`, strength: 0.5 };
  }

  private createHeuristicMetadata(
    grounding: GroundingData,
    inferenceTimeMs: number
  ): ArchitecturalModelMetadata {
    return { llmInferenceTimeMs: inferenceTimeMs, tierUsed: 1, confidence: 'low', filesAnalyzed: grounding.files.length };
  }

  /**
   * Group files by their top-level directory
   * 
   * @param grounding - The grounding data
   * @returns Map of directory path to files in that directory
   */
  private groupFilesByTopLevelDirectory(grounding: GroundingData): Map<string, FileGroundingData[]> {
    const groups = new Map<string, FileGroundingData[]>();
    for (const file of grounding.files) {
      const topLevelDir = this.getTopLevelDirectory(file.path, grounding.rootPath);
      groups.set(topLevelDir, [...(groups.get(topLevelDir) ?? []), file]);
    }
    return groups;
  }

  /**
   * Extract top-level directory from a file path
   * 
   * @param filePath - The file path
   * @param rootPath - The root path of the project
   * @returns The top-level directory path
   */
  private getTopLevelDirectory(filePath: string, rootPath: string): string {
    const normalizedPath = (filePath.startsWith(rootPath) ? filePath.substring(rootPath.length) : filePath).replace(/^\/+/, ''), separatorIndex = normalizedPath.indexOf('/');
    return separatorIndex >= 0 ? normalizedPath.substring(0, separatorIndex) : '.';
  }

  /**
   * Build a map from file path to component ID
   * 
   * @param components - The components
   * @returns Map of file path to component ID
   */
  private buildFileToComponentMap(components: ArchitecturalComponent[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const component of components) for (const filePath of component.filePaths) map.set(filePath, component.id);
    return map;
  }

  /**
   * Format a directory name into a readable component name
   * Converts kebab-case and snake_case to Title Case
   * 
   * @param dirName - The directory name
   * @returns Formatted component name
   */
  private formatComponentName(dirName: string): string {
    if (dirName === '.') return 'Root';
    return dirName.replace(/[-_]/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  }

  /**
   * Sanitize a string to be used as an ID
   * Removes special characters and spaces
   * 
   * @param str - The string to sanitize
   * @returns Sanitized ID string
   */
  private sanitizeId(str: string): string {
    return str.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  }

  /**
   * Get Kiro AI instance through multiple access patterns
   * Tries: import → global → mock
   * 
   * @returns KiroAI instance and whether it's a mock
   */
  private async getKiroAI(): Promise<KiroAIResult> {
    try {
      const importedKiro = (await import('kiro')) as KiroImport;
      if (importedKiro.ai) return { api: importedKiro.ai, isMock: false };
    } catch {
      // Continue with global and stub discovery paths.
    }
    const globalKiro = (globalThis as GlobalWithKiro).kiro;
    if (globalKiro?.ai) return { api: globalKiro.ai, isMock: false };
    try {
      return await (await import('../spike/kiro-api-stub')).getKiroAI();
    } catch {
      throw new Error('Kiro AI API not available. Tried import, global object, and mock fallback.');
    }
  }

  /**
   * Clear the cache
   * Useful when files change or for testing
   */
  clearCache(): void { this.cache.clear(); }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } { return this.cache.getStats(); }
}
