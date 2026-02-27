/**
 * Analysis-specific type definitions
 * Includes Grounding Layer and Architectural Model types
 * Requirements: 1.2, 1.4, 2.2
 */

import { Language, AbstractionLevel, RelationshipType } from './index';

// ============================================================================
// Grounding Layer Models
// ============================================================================

/**
 * GroundingData: The compact, structured output of static analysis
 * This is the input fed to the LLM for architectural interpretation
 */
export interface GroundingData {
  rootPath: string;
  timestamp: number;
  directoryTree: DirectoryNode;
  files: FileGroundingData[];
  importGraph: ImportEdge[];
  inheritanceGraph: InheritanceEdge[];
}

export interface DirectoryNode {
  name: string;
  path: string;
  children: DirectoryNode[];
  files: string[]; // file paths in this directory
}

export interface FileGroundingData {
  path: string;
  language: Language;
  exports: string[];          // exported symbol names
  classes: ClassGroundingData[];
  topLevelFunctions: FunctionGroundingData[];
  imports: ImportRef[];
}

export interface ClassGroundingData {
  name: string;
  superClass?: string;
  interfaces?: string[];
  methods?: string[];         // Tier 2: added only when LLM requests more detail
}

export interface FunctionGroundingData {
  name: string;
  signature?: string;         // Tier 2: params + return type, no body
}

export interface ImportRef {
  from: string;               // import source path (raw, not resolved)
  symbols: string[];          // imported names, or ['*'] for wildcard
}

export interface ImportEdge {
  sourceFile: string;
  targetFile: string;         // resolved to absolute path where possible
  symbols: string[];
}

export interface InheritanceEdge {
  childClass: string;
  parentClass: string;
  sourceFile: string;
  type: 'extends' | 'implements';
}

// ============================================================================
// Architectural Model (LLM Output)
// ============================================================================

/**
 * ArchitecturalModel: The primary output of LLM interpretation
 * This is the semantic understanding of the codebase architecture
 */
export interface ArchitecturalModel {
  components: ArchitecturalComponent[];
  relationships: ArchitecturalRelationship[];
  patterns: string[];         // e.g., 'MVC', 'microservices', 'control plane / data plane'
  metadata: ArchitecturalModelMetadata;
}

export interface ArchitecturalComponent {
  id: string;
  name: string;               // LLM-generated meaningful name
  description: string;        // LLM-generated role description (max 50 words)
  role: string;               // e.g., 'control plane', 'data access layer', 'auth module'
  filePaths: string[];        // source files that make up this component
  abstractionLevel: AbstractionLevel;
  subComponents: string[];    // IDs of child ArchitecturalComponents
  parent: string | null;
}

export interface ArchitecturalRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  description: string;        // LLM-generated description of the relationship
  strength: number;           // 0-1
}

export interface ArchitecturalModelMetadata {
  llmInferenceTimeMs: number;
  tierUsed: 1 | 2 | 3;       // highest tier of enrichment applied
  confidence: 'high' | 'medium' | 'low';
  filesAnalyzed: number;
}

// ============================================================================
// Combined Analysis Result
// ============================================================================

/**
 * Complete analysis result combining both grounding and architectural model
 */
export interface AnalysisResult {
  timestamp: number;
  rootPath: string;
  groundingData: GroundingData;       // static analysis output
  architecturalModel: ArchitecturalModel; // LLM interpretation
  metadata: AnalysisMetadata;
}

export interface AnalysisMetadata {
  fileCount: number;
  languageDistribution: Record<Language, number>;
  staticAnalysisTimeMs: number;
  llmInterpretationTimeMs: number;
  treeDepth: number;
}
