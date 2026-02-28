/**
 * Core type definitions for AI Architecture Diagram Extension
 * Based on design document data models
 * Requirements: 1.2, 1.3, 1.4, 2.3, 2.4, 2.5, 12.1
 */

// ============================================================================
// Analysis Models
// ============================================================================

export interface AnalysisResult {
  timestamp: number;
  rootPath: string;
  components: Component[];
  relationships: Relationship[];
  metadata: AnalysisMetadata;
}

export interface AnalysisMetadata {
  fileCount: number;
  languageDistribution: Record<Language, number>;
  analysisTimeMs: number;
  treeDepth: number;
}

export interface Component {
  id: string;
  name: string;
  type: ComponentType;
  language: Language;
  filePaths: string[];
  children: string[]; // Child component IDs
  parent: string | null; // Parent component ID
  abstractionLevel: AbstractionLevel;
  metadata: ComponentMetadata;
}

export enum ComponentType {
  Package = 'package',
  Module = 'module',
  Class = 'class',
  Function = 'function',
  Service = 'service',
  Interface = 'interface'
}

export enum Language {
  Python = 'python',
  JavaScript = 'javascript',
  TypeScript = 'typescript',
  Java = 'java',
  Go = 'go',
  Unknown = 'unknown'
}

export enum AbstractionLevel {
  Overview = 1,    // Top-level components only
  Module = 2,      // Module-level detail
  Detailed = 3     // Class/function level
}

export interface ComponentMetadata {
  lineCount: number;
  exportedSymbols: string[];
  description?: string; // AI-generated description
}

export interface Relationship {
  id: string;
  source: string; // Source component ID
  target: string; // Target component ID
  type: RelationshipType;
  strength: number; // 0-1, based on coupling
  metadata: RelationshipMetadata;
}

export enum RelationshipType {
  Import = 'import',
  Dependency = 'dependency',
  Inheritance = 'inheritance',
  Composition = 'composition',
  FunctionCall = 'function_call'
}

export interface RelationshipMetadata {
  occurrences: number; // How many times this relationship appears
  bidirectional: boolean;
}

// ============================================================================
// Diagram Models
// ============================================================================

export interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  layout: LayoutConfig;
  abstractionLevel: AbstractionLevel;
}

export interface DiagramNode {
  id: string;
  label: string;
  type: ComponentType;
  language: Language;
  filePaths: string[];
  position?: { x: number; y: number };
  style: NodeStyle;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  style: EdgeStyle;
}

export interface NodeStyle {
  color: string;
  shape: 'rectangle' | 'ellipse' | 'hexagon';
  size: number;
  borderWidth: number;
}

export interface EdgeStyle {
  color: string;
  width: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  arrow: boolean;
}

export interface LayoutConfig {
  algorithm: 'dagre' | 'cose' | 'breadthfirst';
  spacing: number;
  direction: 'TB' | 'LR'; // Top-to-bottom or Left-to-right
}

// ============================================================================
// Configuration Models
// ============================================================================

export interface AnalysisConfig {
  rootPath: string;
  includePatterns: string[]; // Glob patterns
  excludePatterns: string[]; // Glob patterns
  maxFiles: number;
  maxDepth: number;
  languages: Language[];
  aiEnabled: boolean;
  autoRefresh?: boolean; // Requirement 11.2
  autoRefreshDebounce?: number; // Requirement 11.3 (milliseconds, default: 10000)
}

// ============================================================================
// Webview Communication Models
// ============================================================================

export type WebviewMessage = 
  | { type: 'initialize'; data: DiagramData }
  | { type: 'elementSelected'; elementId: string }
  | { type: 'elementHovered'; elementId: string }
  | { type: 'abstractionLevelChanged'; level: AbstractionLevel }
  | { type: 'exportRequested'; format: 'png' | 'svg' }
  | { type: 'refreshRequested' }
  | { type: 'diagramOutOfSync'; timestamp: number } // Requirement 11.5
  | { type: 'diagramRefreshed' } // Requirement 11.5
  | { type: 'error'; message: string };

// ============================================================================
// AI Integration Models
// ============================================================================

export interface AIInsights {
  componentGroups: ComponentGroup[];
  architecturalPatterns: string[];
  suggestions: string[];
}

export interface ComponentGroup {
  name: string;
  description: string;
  componentIds: string[];
  reasoning: string;
}

// ============================================================================
// Validation Models
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================================================
// Error Models
// ============================================================================

export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export class RenderError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RenderError';
  }
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIError';
  }
}

// ============================================================================
// Validation Utilities
// ============================================================================

export { DataValidator } from './validation';
