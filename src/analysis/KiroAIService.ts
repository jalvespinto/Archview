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
  sendMessage(prompt: string, options?: any): Promise<string>;
}

/**
 * Result of getting the Kiro AI instance
 */
interface KiroAIResult {
  api: KiroAI;
  isMock: boolean;
}

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
    const result = await this.getKiroAI();
    this.kiroAI = result.api;
    this.isMock = result.isMock;
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
    if (!this.kiroAI) {
      await this.initialize();
    }

    // Check cache first
    const cached = await this.cache.get(grounding, tier);
    if (cached) {
      console.log(`Cache hit for tier ${tier}`);
      return cached;
    }

    console.log(`Cache miss for tier ${tier}, querying LLM`);
    const startTime = Date.now();

    try {
      // Build the prompt for the current tier
      const prompt = this.buildPromptForTier(grounding, tier);

      // Send to LLM
      const response = await this.kiroAI!.sendMessage(prompt);

      // Parse the response
      const llmResponse = this.parseLLMResponse(response);

      // Convert to ArchitecturalModel
      const model = this.convertToArchitecturalModel(
        llmResponse,
        grounding,
        tier,
        Date.now() - startTime
      );

      // Store in cache
      await this.cache.set(grounding, tier, model);

      // Check if we need to enrich and retry
      if (model.metadata.confidence === 'low' && tier < 3) {
        const ambiguousFiles = this.extractAmbiguousFiles(llmResponse, grounding);
        
        if (ambiguousFiles.length > 0) {
          console.log(
            `Low confidence at tier ${tier}. Enriching ${ambiguousFiles.length} ambiguous files to tier ${tier + 1}`
          );
          
          const enriched = await this.enrichGrounding(
            grounding,
            ambiguousFiles,
            (tier + 1) as 2 | 3
          );
          
          return this.interpretArchitecture(enriched, (tier + 1) as 2 | 3);
        }
      }

      return model;
    } catch (error) {
      // If LLM fails, fall back to heuristic interpretation
      console.warn('LLM interpretation failed, using heuristic fallback:', error);
      
      const fallbackModel = this.buildHeuristicModel(grounding, Date.now() - startTime);
      
      // Store fallback in cache
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
    // Create a copy of the grounding data
    const enriched: GroundingData = {
      ...grounding,
      files: [...grounding.files],
    };

    // Find files that need enrichment
    const filesToEnrich = enriched.files.filter(file =>
      ambiguousFilePaths.includes(file.path)
    );

    if (targetTier === 2) {
      // Tier 2: Add function signatures and method lists
      await this.enrichToTier2(filesToEnrich);
    } else if (targetTier === 3) {
      // Tier 3: Add first 50 lines of file content
      await this.enrichToTier3(filesToEnrich, grounding.rootPath);
    }

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
    // If LLM explicitly provided ambiguous files, use those
    if (llmResponse.ambiguousFiles && llmResponse.ambiguousFiles.length > 0) {
      return llmResponse.ambiguousFiles;
    }

    // Otherwise, heuristically identify files that might need more detail
    // Look for files with generic names or minimal exports
    const ambiguous: string[] = [];
    const genericNames = ['util', 'helper', 'common', 'shared', 'index', 'main'];

    for (const file of grounding.files) {
      const fileName = file.path.split('/').pop()?.toLowerCase() || '';
      const baseName = fileName.replace(/\.[^.]+$/, '');

      // Check if file has a generic name
      const hasGenericName = genericNames.some(name => baseName.includes(name));

      // Check if file has minimal exports (might need more context)
      const hasMinimalExports = file.exports.length === 0 &&
                                file.classes.length === 0 &&
                                file.topLevelFunctions.length === 0;

      if (hasGenericName || hasMinimalExports) {
        ambiguous.push(file.path);
      }
    }

    return ambiguous;
  }

  /**
   * Enrich files to Tier 2: add function signatures and method lists
   *
   * @param files - Files to enrich
   */
  private async enrichToTier2(files: FileGroundingData[]): Promise<void> {
    // Import ParserManager for re-parsing files
    const { ParserManager } = await import('./ParserManager');
    const parserManager = new ParserManager();
    await parserManager.initialize();

    const fs = await import('fs/promises');
    const path = await import('path');

    for (const file of files) {
      try {
        // Read file content
        const sourceCode = await fs.readFile(file.path, 'utf-8');

        // Parse the file
        const ast = await parserManager.parseFile(file.path, sourceCode, file.language);

        // Extract function signatures for top-level functions
        for (const func of file.topLevelFunctions) {
          if (!func.signature) {
            func.signature = await this.extractFunctionSignature(
              func.name,
              ast,
              sourceCode
            );
          }
        }

        // Extract method lists for classes
        for (const cls of file.classes) {
          if (!cls.methods || cls.methods.length === 0) {
            cls.methods = await this.extractClassMethods(cls.name, ast, sourceCode);
          }
        }
      } catch (error) {
        console.warn(`Failed to enrich file ${file.path} to Tier 2:`, error);
        // Continue with other files
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
    const fs = await import('fs/promises');
    const path = await import('path');

    for (const file of files) {
      try {
        // Resolve absolute path
        const absolutePath = path.isAbsolute(file.path)
          ? file.path
          : path.join(rootPath, file.path);

        // Read file content
        const sourceCode = await fs.readFile(absolutePath, 'utf-8');

        // Get first 50 lines
        const lines = sourceCode.split('\n').slice(0, 50);
        const excerpt = lines.join('\n');

        // Add excerpt to file data (extend the interface)
        (file as any).contentExcerpt = excerpt;
      } catch (error) {
        console.warn(`Failed to enrich file ${file.path} to Tier 3:`, error);
        // Continue with other files
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
  private async extractFunctionSignature(
    functionName: string,
    ast: any,
    sourceCode: string
  ): Promise<string> {
    try {
      // This is a simplified implementation
      // In a real implementation, we would traverse the AST to find the function
      // and extract its parameters and return type

      // For now, return a placeholder
      return `${functionName}(...)`;
    } catch (error) {
      return `${functionName}(...)`;
    }
  }

  /**
   * Extract method names from a class in the AST
   *
   * @param className - Name of the class
   * @param ast - Parsed AST
   * @param sourceCode - Source code
   * @returns Array of method names
   */
  private async extractClassMethods(
    className: string,
    ast: any,
    sourceCode: string
  ): Promise<string[]> {
    try {
      // This is a simplified implementation
      // In a real implementation, we would traverse the AST to find the class
      // and extract all its method names

      // For now, return empty array
      return [];
    } catch (error) {
      return [];
    }
  }

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

    if (tier >= 2) {
      prompt += '\n\n--- TIER 2 ENRICHMENT ---\n';
      prompt += 'Additional function signatures and method lists have been provided for ambiguous files.\n';
    }

    if (tier === 3) {
      prompt += '\n\n--- TIER 3 ENRICHMENT ---\n';
      prompt += 'File content excerpts (first 50 lines) have been provided for critical files:\n\n';

      // Add content excerpts for files that have them
      for (const file of grounding.files) {
        const excerpt = (file as any).contentExcerpt;
        if (excerpt) {
          prompt += `\nFile: ${file.path}\n`;
          prompt += '```\n';
          prompt += excerpt;
          prompt += '\n```\n';
        }
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
      // If response is already an object, return it
      if (typeof response === 'object') {
        return response as LLMArchitectureResponse;
      }

      // Try to parse as JSON
      const parsed = JSON.parse(response);
      
      // Validate required fields
      if (!parsed.components || !Array.isArray(parsed.components)) {
        throw new Error('Invalid response: missing or invalid components array');
      }
      if (!parsed.relationships || !Array.isArray(parsed.relationships)) {
        throw new Error('Invalid response: missing or invalid relationships array');
      }
      if (!parsed.patterns || !Array.isArray(parsed.patterns)) {
        throw new Error('Invalid response: missing or invalid patterns array');
      }
      if (!parsed.confidence || !['high', 'medium', 'low'].includes(parsed.confidence)) {
        throw new Error('Invalid response: missing or invalid confidence level');
      }

      return parsed as LLMArchitectureResponse;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse LLM response as JSON: ${error.message}`);
      }
      throw error;
    }
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
  private convertToArchitecturalModel(
    llmResponse: LLMArchitectureResponse,
    grounding: GroundingData,
    tier: 1 | 2 | 3,
    inferenceTimeMs: number
  ): ArchitecturalModel {
    // Convert components
    const components: ArchitecturalComponent[] = llmResponse.components.map(comp => ({
      id: comp.id,
      name: comp.name,
      description: comp.description,
      role: comp.role,
      filePaths: comp.filePaths,
      abstractionLevel: this.mapAbstractionLevel(comp.abstractionLevel),
      subComponents: comp.subComponents,
      parent: comp.parent,
    }));

    // Convert relationships
    const relationships: ArchitecturalRelationship[] = llmResponse.relationships.map(rel => ({
      id: rel.id,
      sourceId: rel.sourceId,
      targetId: rel.targetId,
      type: this.mapRelationshipType(rel.type),
      description: rel.description,
      strength: rel.strength,
    }));

    // Build metadata
    const metadata: ArchitecturalModelMetadata = {
      llmInferenceTimeMs: inferenceTimeMs,
      tierUsed: tier,
      confidence: llmResponse.confidence,
      filesAnalyzed: grounding.files.length,
    };

    return {
      components,
      relationships,
      patterns: llmResponse.patterns,
      metadata,
    };
  }

  /**
   * Map numeric abstraction level to enum
   */
  private mapAbstractionLevel(level: number): AbstractionLevel {
    switch (level) {
      case 1:
        return AbstractionLevel.Overview;
      case 2:
        return AbstractionLevel.Module;
      case 3:
        return AbstractionLevel.Detailed;
      default:
        return AbstractionLevel.Overview;
    }
  }

  /**
   * Map string relationship type to enum
   */
  private mapRelationshipType(type: string): RelationshipType {
    const typeMap: Record<string, RelationshipType> = {
      import: RelationshipType.Import,
      dependency: RelationshipType.Dependency,
      inheritance: RelationshipType.Inheritance,
      composition: RelationshipType.Composition,
      function_call: RelationshipType.FunctionCall,
    };

    return typeMap[type.toLowerCase()] || RelationshipType.Dependency;
  }

  /**
   * Build a heuristic architectural model when LLM is unavailable
   * Groups files by top-level directory and derives relationships from import graph
   * 
   * @param grounding - The grounding data
   * @param inferenceTimeMs - Time taken (for consistency with LLM path)
   * @returns Heuristic architectural model with low confidence
   */
  public buildHeuristicModel(
      grounding: GroundingData,
      inferenceTimeMs: number
    ): ArchitecturalModel {
      const components: ArchitecturalComponent[] = [];
      const relationships: ArchitecturalRelationship[] = [];

      // Group files by top-level directory
      const directoryGroups = this.groupFilesByTopLevelDirectory(grounding);

      // Create components from directory groups
      for (const [dirPath, files] of directoryGroups.entries()) {
        const dirName = dirPath.split('/').pop() || dirPath;
        const componentId = this.sanitizeId(dirPath);

        components.push({
          id: componentId,
          name: this.formatComponentName(dirName),
          description: `Component containing files from ${dirPath}`,
          role: 'module',
          filePaths: files.map(f => f.path),
          abstractionLevel: AbstractionLevel.Overview,
          subComponents: [],
          parent: null,
        });
      }

      // Derive relationships from import graph
      const componentMap = this.buildFileToComponentMap(components);
      const relationshipSet = new Set<string>();

      for (const importEdge of grounding.importGraph) {
        const sourceComponent = componentMap.get(importEdge.sourceFile);
        const targetComponent = componentMap.get(importEdge.targetFile);

        // Only create relationships between different components
        if (sourceComponent && targetComponent && sourceComponent !== targetComponent) {
          const relId = `${sourceComponent}->${targetComponent}`;

          // Avoid duplicate relationships
          if (!relationshipSet.has(relId)) {
            relationshipSet.add(relId);

            relationships.push({
              id: this.sanitizeId(relId),
              sourceId: sourceComponent,
              targetId: targetComponent,
              type: RelationshipType.Import,
              description: `Import dependency from ${sourceComponent} to ${targetComponent}`,
              strength: 0.5, // Medium strength for heuristic relationships
            });
          }
        }
      }

      const metadata: ArchitecturalModelMetadata = {
        llmInferenceTimeMs: inferenceTimeMs,
        tierUsed: 1,
        confidence: 'low', // Always low confidence for heuristic models
        filesAnalyzed: grounding.files.length,
      };

      return {
        components,
        relationships,
        patterns: [], // No pattern detection in heuristic mode
        metadata,
      };
    }

  /**
   * Group files by their top-level directory
   * 
   * @param grounding - The grounding data
   * @returns Map of directory path to files in that directory
   */
  private groupFilesByTopLevelDirectory(
    grounding: GroundingData
  ): Map<string, FileGroundingData[]> {
    const groups = new Map<string, FileGroundingData[]>();
    
    for (const file of grounding.files) {
      // Get top-level directory from file path
      const topLevelDir = this.getTopLevelDirectory(file.path, grounding.rootPath);
      
      if (!groups.has(topLevelDir)) {
        groups.set(topLevelDir, []);
      }
      
      groups.get(topLevelDir)!.push(file);
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
    // Remove root path if present
    let relativePath = filePath;
    if (filePath.startsWith(rootPath)) {
      relativePath = filePath.substring(rootPath.length);
    }
    
    // Remove leading slash
    relativePath = relativePath.replace(/^\/+/, '');
    
    // Get first directory component
    const parts = relativePath.split('/');
    if (parts.length > 1) {
      return parts[0];
    }
    
    // File is in root directory
    return '.';
  }

  /**
   * Build a map from file path to component ID
   * 
   * @param components - The components
   * @returns Map of file path to component ID
   */
  private buildFileToComponentMap(
    components: ArchitecturalComponent[]
  ): Map<string, string> {
    const map = new Map<string, string>();
    
    for (const component of components) {
      for (const filePath of component.filePaths) {
        map.set(filePath, component.id);
      }
    }
    
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
    // Handle special cases
    if (dirName === '.') {
      return 'Root';
    }
    
    // Convert kebab-case and snake_case to spaces
    const withSpaces = dirName.replace(/[-_]/g, ' ');
    
    // Capitalize first letter of each word
    return withSpaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Sanitize a string to be used as an ID
   * Removes special characters and spaces
   * 
   * @param str - The string to sanitize
   * @returns Sanitized ID string
   */
  private sanitizeId(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  /**
   * Get Kiro AI instance through multiple access patterns
   * Tries: import → global → mock
   * 
   * @returns KiroAI instance and whether it's a mock
   */
  private async getKiroAI(): Promise<KiroAIResult> {
    // Pattern 1: Try importing kiro module
    try {
      const kiro = await import('kiro');
      if (kiro && (kiro as any).ai) {
        return { api: (kiro as any).ai, isMock: false };
      }
    } catch (error) {
      // Import failed, try other methods
    }

    // Pattern 2: Check for global kiro object
    if (typeof (global as any).kiro !== 'undefined') {
      const kiro = (global as any).kiro;
      if (kiro && kiro.ai) {
        return { api: kiro.ai, isMock: false };
      }
    }

    // Pattern 3: Fall back to mock for testing
    try {
      const { getKiroAI } = await import('../spike/kiro-api-stub');
      const result = await getKiroAI();
      return result;
    } catch (error) {
      throw new Error(
        'Kiro AI API not available. Tried import, global object, and mock fallback.'
      );
    }
  }

  /**
   * Clear the cache
   * Useful when files change or for testing
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return this.cache.getStats();
  }
}
