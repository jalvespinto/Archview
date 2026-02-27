# Design Document: AI Architecture Diagram Extension

## Overview

The AI Architecture Diagram Extension is a Kiro IDE extension that automatically analyzes project codebases and generates interactive, AI-enhanced architecture diagrams. The extension bridges the gap between code and visual understanding by providing developers with automatically generated, navigable visualizations of their software architecture.

### Design Goals

1. **Zero-configuration experience**: Work out of the box with sensible defaults
2. **Multi-language support**: Handle polyglot projects seamlessly
3. **Performance**: Analyze large codebases (1000+ files) efficiently
4. **Interactivity**: Provide smooth, responsive diagram navigation and IDE integration
5. **AI-driven architecture interpretation**: Use the LLM as the primary producer of the Architectural Model, with static analysis providing a compact, information-dense Grounding Layer as input — not the other way around

### Technology Stack

**Extension Core:**
- **TypeScript**: Primary language for all extension code (Kiro IDE compatibility)
- **Node.js**: Runtime environment for extension execution
- **Kiro Extension API**: IDE integration and file system access

**Analysis Engine:**
- **TypeScript**: Analysis service implementation
- **Tree-sitter**: Multi-language parsing library with Node.js bindings
- **Language-specific parsers**: 
  - `tree-sitter-python`, `tree-sitter-javascript`, `tree-sitter-typescript`
  - `tree-sitter-java`, `tree-sitter-go`
- **TypeScript Compiler API**: For enhanced TypeScript/JavaScript analysis

**AI Integration:**
- **Kiro AI API**: Built-in Kiro agent capabilities for architectural insights
- **Prompt engineering**: Structured prompts for component grouping and naming

**Diagram Rendering:**
- **Cytoscape.js**: Graph visualization library with layout algorithms
- **Webview API**: Kiro IDE webview for rendering interactive diagrams
- **HTML/CSS/JavaScript**: UI layer for diagram controls and interactions

**Data Storage:**
- **JSON**: Serialization format for analysis results and diagram data
- **In-memory cache**: Fast access to analysis results for unchanged files

## Architecture

### System Architecture

The extension follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Kiro IDE                             │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Extension Host (TypeScript)               │  │
│  │  ┌─────────────┐  ┌──────────────┐              │  │
│  │  │  Extension  │  │   Webview    │              │  │
│  │  │  Controller │◄─┤   Manager    │              │  │
│  │  └──────┬──────┘  └──────┬───────┘              │  │
│  │         │                 │                       │  │
│  │  ┌──────▼──────┐  ┌──────▼───────┐              │  │
│  │  │  Analysis   │  │   Diagram    │              │  │
│  │  │   Service   │  │   Renderer   │              │  │
│  │  │             │  └──────────────┘              │  │
│  │  │ ┌─────────┐ │                                │  │
│  │  │ │Tree-    │ │  ┌──────────────┐              │  │
│  │  │ │sitter   │ │  │   File       │              │  │
│  │  │ └─────────┘ │  │  Highlighter │              │  │
│  │  │ ┌─────────┐ │  └──────────────┘              │  │
│  │  │ │Language │ │                                │  │
│  │  │ │Parsers  │ │                                │  │
│  │  │ └─────────┘ │                                │  │
│  │  └──────┬──────┘                                │  │
│  └─────────┼───────────────────────────────────────┘  │
│            │                                           │
└────────────┼───────────────────────────────────────────┘
             │
      ┌──────▼──────┐
      │  Kiro AI    │
      │     API     │
      └─────────────┘
```

### Component Interaction Flow

**Diagram Generation Flow:**
1. User activates extension → Extension Controller
2. Extension Controller → Analysis Service
3. Analysis Service scans files → Tree-sitter parsing → builds compact **Grounding Layer** (directory tree, class/function names, import graph, inheritance graph)
4. Analysis Service → Kiro AI API (Grounding Layer as structured input — Tier 1)
5. IF LLM requests more detail for ambiguous files → Analysis Service adds function signatures (Tier 2) or file content excerpts (Tier 3)
6. Kiro AI API produces **Architectural Model** (named components with roles, descriptions, relationships, detected patterns)
7. Analysis Service returns Architectural Model → Extension Controller
8. Extension Controller → Webview Manager (diagram data derived from Architectural Model)
9. Webview Manager → Diagram Renderer (Cytoscape.js)
10. Diagram displayed to user

**Interactive Navigation Flow:**
1. User clicks diagram element → Diagram Renderer
2. Diagram Renderer → Webview Manager (element ID)
3. Webview Manager → Extension Controller (file mapping request)
4. Extension Controller → File Highlighter (file paths)
5. File Highlighter uses Kiro API to highlight files in explorer
6. User clicks highlighted file → Kiro IDE opens file

## Components and Interfaces

### Extension Controller

**Responsibility**: Orchestrates extension lifecycle, coordinates between components, manages state.

**Interface:**
```typescript
interface ExtensionController {
  // Lifecycle
  activate(context: ExtensionContext): Promise<void>;
  deactivate(): Promise<void>;
  
  // Commands
  generateDiagram(): Promise<void>;
  refreshDiagram(): Promise<void>;
  exportDiagram(format: 'png' | 'svg'): Promise<void>;
  
  // State management
  getAnalysisResults(): AnalysisResult | null;
  setSelectedElement(elementId: string): void;
  clearSelection(): void;
}
```

**Key Responsibilities:**
- Register extension commands and event handlers
- Manage Analysis Service subprocess lifecycle
- Cache analysis results for performance
- Coordinate between File Highlighter and Webview Manager
- Handle configuration changes

### Analysis Service (TypeScript)

**Responsibility**: Analyze codebase, extract architectural information, integrate with AI.

**Interface:**
```typescript
interface AnalysisService {
  // Main analysis (orchestrates all phases)
  analyzeCodebase(
    rootPath: string,
    config: AnalysisConfig
  ): Promise<AnalysisResult>;

  // Phase 1: static analysis → Grounding Layer
  buildGroundingLayer(
    rootPath: string,
    config: AnalysisConfig
  ): Promise<GroundingData>;

  // Phase 2: LLM interpretation → Architectural Model
  interpretWithLLM(
    grounding: GroundingData,
    config: AnalysisConfig
  ): Promise<ArchitecturalModel>;

  // Language detection
  detectLanguage(filePath: string): Language;
}
```

**Key Responsibilities:**
- File system traversal and filtering (using Node.js `fs` and `glob`)
- Multi-language AST parsing using Tree-sitter Node.js bindings
- Dependency extraction (imports, function calls, inheritance)
- Component identification (modules, classes, services)
- AI prompt construction and response parsing via Kiro AI API
- Result caching and serialization

**Implementation Notes:**
- Uses `tree-sitter` npm package with language-specific grammars
- Async/await for file I/O operations
- Worker threads for parallel file parsing (performance optimization)
- Incremental parsing for file updates

### Webview Manager

**Responsibility**: Manage diagram webview lifecycle, handle messaging between extension and webview.

**Interface:**
```typescript
interface WebviewManager {
  // Lifecycle
  createWebview(): Webview;
  disposeWebview(): void;
  
  // Messaging
  postMessage(message: WebviewMessage): void;
  onMessage(handler: (message: WebviewMessage) => void): void;
  
  // Content
  updateDiagram(data: DiagramData): void;
  setAbstractionLevel(level: AbstractionLevel): void;
}
```

**Key Responsibilities:**
- Create and manage Kiro IDE webview panel
- Load HTML/CSS/JavaScript for diagram UI
- Handle bidirectional messaging with webview content
- Manage webview state and lifecycle
- Provide diagram controls (zoom, pan, export, abstraction levels)

### Diagram Renderer (Cytoscape.js)

**Responsibility**: Render interactive diagram, handle user interactions, manage visual state.

**Interface:**
```typescript
interface DiagramRenderer {
  // Rendering
  initialize(container: HTMLElement): void;
  renderDiagram(data: DiagramData): void;
  updateLayout(algorithm: LayoutAlgorithm): void;
  
  // Interaction
  onElementClick(handler: (elementId: string) => void): void;
  onElementHover(handler: (elementId: string) => void): void;
  
  // Navigation
  zoomIn(): void;
  zoomOut(): void;
  fitToView(): void;
  panTo(x: number, y: number): void;
  
  // Selection
  selectElement(elementId: string): void;
  clearSelection(): void;
  
  // Export
  exportToPNG(): Blob;
  exportToSVG(): string;
}
```

**Key Responsibilities:**
- Initialize Cytoscape.js instance
- Convert DiagramData to Cytoscape format
- Apply layout algorithms (hierarchical, force-directed)
- Handle zoom, pan, and selection interactions
- Render tooltips and visual feedback
- Generate export images

**Cytoscape Configuration:**
- Layout: Dagre (hierarchical) for architecture diagrams
- Styling: Custom CSS for nodes and edges
- Interaction: Click, hover, drag events
- Performance: Virtualization for large graphs (1000+ nodes)

### File Highlighter

**Responsibility**: Highlight files in IDE explorer, manage highlight state.

**Interface:**
```typescript
interface FileHighlighter {
  // Highlighting
  highlightFiles(filePaths: string[]): void;
  clearHighlights(): void;
  
  // State
  getHighlightedFiles(): string[];
  isFileHighlighted(filePath: string): boolean;
}
```

**Key Responsibilities:**
- Use Kiro IDE API to apply file decorations
- Maintain set of currently highlighted files
- Clear previous highlights when selection changes
- Handle file system changes (renamed/deleted files)

**Implementation Approach:**
- Use Kiro's FileDecoration API for visual indicators
- Apply custom color/icon to highlighted files
- Listen to file system events to update highlights
- Debounce highlight updates for performance



## Data Models

### GroundingData

The compact, structured output of static analysis — the input fed to the LLM. Designed to be information-dense while fitting within the LLM's context window.

```typescript
interface GroundingData {
  rootPath: string;
  timestamp: number;
  directoryTree: DirectoryNode;
  files: FileGroundingData[];
  importGraph: ImportEdge[];
  inheritanceGraph: InheritanceEdge[];
}

interface DirectoryNode {
  name: string;
  path: string;
  children: DirectoryNode[];
  files: string[]; // file paths in this directory
}

interface FileGroundingData {
  path: string;
  language: Language;
  exports: string[];          // exported symbol names
  classes: ClassGroundingData[];
  topLevelFunctions: FunctionGroundingData[];
  imports: ImportRef[];
}

interface ClassGroundingData {
  name: string;
  superClass?: string;
  interfaces?: string[];
  methods?: string[];         // Tier 2: added only when LLM requests more detail
}

interface FunctionGroundingData {
  name: string;
  signature?: string;         // Tier 2: params + return type, no body
}

interface ImportRef {
  from: string;               // import source path (raw, not resolved)
  symbols: string[];          // imported names, or ['*'] for wildcard
}

interface ImportEdge {
  sourceFile: string;
  targetFile: string;         // resolved to absolute path where possible
  symbols: string[];
}

interface InheritanceEdge {
  childClass: string;
  parentClass: string;
  sourceFile: string;
  type: 'extends' | 'implements';
}
```

### ArchitecturalModel

The primary output of LLM interpretation — the semantic understanding of the codebase architecture.

```typescript
interface ArchitecturalModel {
  components: ArchitecturalComponent[];
  relationships: ArchitecturalRelationship[];
  patterns: string[];         // e.g., 'MVC', 'microservices', 'control plane / data plane'
  metadata: ArchitecturalModelMetadata;
}

interface ArchitecturalComponent {
  id: string;
  name: string;               // LLM-generated meaningful name
  description: string;        // LLM-generated role description (max 50 words)
  role: string;               // e.g., 'control plane', 'data access layer', 'auth module'
  filePaths: string[];        // source files that make up this component
  abstractionLevel: AbstractionLevel;
  subComponents: string[];    // IDs of child ArchitecturalComponents
  parent: string | null;
}

interface ArchitecturalRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  description: string;        // LLM-generated description of the relationship
  strength: number;           // 0-1
}

interface ArchitecturalModelMetadata {
  llmInferenceTimeMs: number;
  tierUsed: 1 | 2 | 3;       // highest tier of enrichment applied
  confidence: 'high' | 'medium' | 'low';
  filesAnalyzed: number;
}
```

### AnalysisResult

Represents the complete analysis of a codebase, combining both phases.

```typescript
interface AnalysisResult {
  timestamp: number;
  rootPath: string;
  groundingData: GroundingData;       // static analysis output
  architecturalModel: ArchitecturalModel; // LLM interpretation
  metadata: AnalysisMetadata;
}

interface AnalysisMetadata {
  fileCount: number;
  languageDistribution: Record<Language, number>;
  staticAnalysisTimeMs: number;
  llmInterpretationTimeMs: number;
  treeDepth: number;
}
```

### Component

Represents an architectural component (module, class, service, package).

```typescript
interface Component {
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

enum ComponentType {
  Package = 'package',
  Module = 'module',
  Class = 'class',
  Function = 'function',
  Service = 'service',
  Interface = 'interface'
}

enum Language {
  Python = 'python',
  JavaScript = 'javascript',
  TypeScript = 'typescript',
  Java = 'java',
  Go = 'go',
  Unknown = 'unknown'
}

enum AbstractionLevel {
  Overview = 1,    // Top-level components only
  Module = 2,      // Module-level detail
  Detailed = 3     // Class/function level
}

interface ComponentMetadata {
  lineCount: number;
  exportedSymbols: string[];
  description?: string;  // LLM-generated description from ArchitecturalModel
  role?: string;         // LLM-generated role from ArchitecturalModel
}
```

### Relationship

Represents a dependency or connection between components.

```typescript
interface Relationship {
  id: string;
  source: string; // Source component ID
  target: string; // Target component ID
  type: RelationshipType;
  strength: number; // 0-1, based on coupling
  metadata: RelationshipMetadata;
}

enum RelationshipType {
  Import = 'import',
  Dependency = 'dependency',
  Inheritance = 'inheritance',
  Composition = 'composition',
  FunctionCall = 'function_call'
}

interface RelationshipMetadata {
  occurrences: number; // How many times this relationship appears
  bidirectional: boolean;
}
```

### DiagramData

Represents the visual diagram structure for rendering.

```typescript
interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  layout: LayoutConfig;
  abstractionLevel: AbstractionLevel;
}

interface DiagramNode {
  id: string;
  label: string;
  type: ComponentType;
  language: Language;
  filePaths: string[];
  position?: { x: number; y: number };
  style: NodeStyle;
}

interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  style: EdgeStyle;
}

interface NodeStyle {
  color: string;
  shape: 'rectangle' | 'ellipse' | 'hexagon';
  size: number;
  borderWidth: number;
}

interface EdgeStyle {
  color: string;
  width: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  arrow: boolean;
}

interface LayoutConfig {
  algorithm: 'dagre' | 'cose' | 'breadthfirst';
  spacing: number;
  direction: 'TB' | 'LR'; // Top-to-bottom or Left-to-right
}
```

### AnalysisConfig

Configuration for codebase analysis.

```typescript
interface AnalysisConfig {
  rootPath: string;
  includePatterns: string[]; // Glob patterns
  excludePatterns: string[]; // Glob patterns
  maxFiles: number;
  maxDepth: number;
  languages: Language[];
  aiEnabled: boolean;
}
```

### WebviewMessage

Messages exchanged between extension and webview.

```typescript
type WebviewMessage = 
  | { type: 'initialize'; data: DiagramData }
  | { type: 'elementSelected'; elementId: string }
  | { type: 'elementHovered'; elementId: string }
  | { type: 'abstractionLevelChanged'; level: AbstractionLevel }
  | { type: 'exportRequested'; format: 'png' | 'svg' }
  | { type: 'refreshRequested' }
  | { type: 'error'; message: string };
```

## AI Integration Strategy

### Overview: LLM as Primary Architectural Model Producer

The LLM is not an optional enhancement layer — it is the primary producer of the Architectural Model. Static analysis (Tree-sitter) builds the Grounding Layer, which is fed to the LLM. The LLM then produces the semantic interpretation that the diagram is built from.

### Kiro AI Integration

```typescript
interface KiroAIService {
  // Primary entry point: interpret grounding data into an architectural model
  interpretArchitecture(
    grounding: GroundingData,
    tier?: 1 | 2 | 3
  ): Promise<ArchitecturalModel>;

  // Enrich grounding data when LLM needs more detail for specific files
  enrichGrounding(
    grounding: GroundingData,
    ambiguousFilePaths: string[],
    targetTier: 2 | 3
  ): Promise<GroundingData>;
}
```

**Implementation Approach:**
```typescript
import * as kiro from 'kiro';

class KiroAIService {
  async interpretArchitecture(
    grounding: GroundingData,
    tier: 1 | 2 | 3 = 1
  ): Promise<ArchitecturalModel> {
    const prompt = this.buildGroundingPrompt(grounding, tier);
    const response = await kiro.ai.sendMessage(prompt);
    const model = this.parseArchitecturalModel(response);

    // If LLM signals ambiguity, enrich and retry at higher tier
    if (model.metadata.confidence === 'low' && tier < 3) {
      const ambiguous = this.extractAmbiguousFiles(model, grounding);
      const enriched = await this.enrichGrounding(grounding, ambiguous, (tier + 1) as 2 | 3);
      return this.interpretArchitecture(enriched, (tier + 1) as 2 | 3);
    }

    return model;
  }
}
```

### Tiered Enrichment Strategy

The Grounding Layer is sent to the LLM in tiers of increasing detail. Higher tiers are only used when the LLM cannot confidently determine architectural groupings from the tier below.

**Tier 1 (always sent — default)**
- Directory tree (full hierarchy)
- Per-file: path, language, exported class/function names
- Import graph (who imports who)
- Inheritance graph (class hierarchies)
- Rationale: Directory co-location + naming conventions + import clustering is sufficient for ~80% of well-structured codebases.

**Tier 2 (added for ambiguous files)**
- Everything in Tier 1, plus:
- Function signatures (name, parameters, return type — no body)
- Class method lists
- Rationale: Covers cases where names alone are ambiguous (e.g., `util.ts`, `helpers.go`)

**Tier 3 (added for critical/unclear key files)**
- Everything in Tier 2, plus:
- First 50 lines of file content for files the LLM flags
- Rationale: Covers subtle patterns (CQRS, event sourcing) not visible from names alone

### Prompt Engineering

**Tier 1 Architecture Interpretation Prompt:**
```
You are analyzing a software architecture. Below is the structural grounding data extracted
from the codebase via static analysis. Your task is to produce a semantic Architectural Model.

Directory structure:
{JSON directory tree}

Files and their exports/imports:
{JSON array of FileGroundingData}

Import relationships:
{JSON array of ImportEdge}

Inheritance relationships:
{JSON array of InheritanceEdge}

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
4. Naming components at a meaningful level of abstraction
```

### AI Response Caching

To optimize performance and cost:
- Cache ArchitecturalModel responses keyed by a hash of the GroundingData structure
- Invalidate cache when any file in the grounding data changes (modification time check)
- Store cache in extension global state
- Maximum cache size: 100 entries (LRU eviction)
- Cache tier-specific responses separately (Tier 1, 2, 3 cached independently)

### Fallback Strategy

When the LLM is unavailable or disabled, fall back to a heuristic interpretation of the Grounding Layer:
- Group components by top-level directory (directory = architectural component)
- Use directory and file names as component names (no LLM-generated descriptions)
- Derive relationships directly from the import graph
- Mark all components with `confidence: 'low'` and notify the user

The fallback still produces a valid Architectural Model — just with less semantic richness. The diagram renders correctly either way.



## Error Handling

### Error Categories

**1. Analysis Errors**
- File system access denied
- Unsupported file formats
- Parse errors in source files
- Memory exhaustion during analysis
- Timeout during large codebase analysis

**2. AI Integration Errors**
- Kiro AI service unavailable
- Malformed AI responses
- AI request timeout

**3. Rendering Errors**
- Invalid diagram data structure
- Webview creation failure
- Layout algorithm failure
- Export generation failure

**4. IDE Integration Errors**
- File decoration API unavailable
- File paths no longer valid
- Workspace not available

### Error Handling Strategy

**Graceful Degradation:**
```typescript
class ErrorHandler {
  handleAnalysisError(error: AnalysisError): void {
    // Log detailed error for debugging
    logger.error('Analysis failed', error);
    
    // Show user-friendly message
    window.showErrorMessage(
      `Failed to analyze codebase: ${error.userMessage}`,
      'Retry', 'View Logs'
    );
    
    // Offer fallback: analyze subset of files
    if (error.type === 'timeout') {
      this.offerPartialAnalysis();
    }
  }
  
  handleAIError(error: AIError): void {
    logger.warn('AI enhancement failed, using fallback', error);
    
    // Continue without AI enhancement
    this.useFallbackGrouping();
    
    // Notify user (non-blocking)
    window.showWarningMessage(
      'AI features unavailable, using basic analysis'
    );
  }
  
  handleRenderError(error: RenderError): void {
    logger.error('Rendering failed', error);
    
    // Show error in webview
    this.webview.showError(error.userMessage);
    
    // Offer to export raw data
    window.showErrorMessage(
      'Failed to render diagram',
      'Export Data', 'Retry'
    );
  }
}
```

**Error Recovery:**
- Automatic retry with exponential backoff for transient errors
- Partial results when complete analysis fails
- Fallback to simpler algorithms when advanced features fail
- State preservation across errors (zoom, pan, selection)

**User Feedback:**
- Progress indicators during long operations
- Detailed error messages with actionable suggestions
- Non-blocking warnings for non-critical failures
- Debug logs accessible via "View Logs" action

**Validation:**
```typescript
class DataValidator {
  validateAnalysisResult(result: AnalysisResult): ValidationResult {
    const errors: string[] = [];
    
    // Check required fields
    if (!result.components || result.components.length === 0) {
      errors.push('No components found in analysis');
    }
    
    // Validate component references
    const componentIds = new Set(result.components.map(c => c.id));
    for (const rel of result.relationships) {
      if (!componentIds.has(rel.source)) {
        errors.push(`Invalid source reference: ${rel.source}`);
      }
      if (!componentIds.has(rel.target)) {
        errors.push(`Invalid target reference: ${rel.target}`);
      }
    }
    
    // Check for cycles in parent-child relationships
    if (this.hasCycles(result.components)) {
      errors.push('Circular parent-child relationships detected');
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  validateDiagramData(data: DiagramData): ValidationResult {
    const errors: string[] = [];
    
    // Validate node-edge consistency
    const nodeIds = new Set(data.nodes.map(n => n.id));
    for (const edge of data.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target: ${edge.target}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}
```

### Timeout Management

**Analysis Timeout:**
- Maximum 120 seconds for full codebase analysis (per requirements)
- Progress tracking: report percentage complete every 5 seconds
- Cancellation support: user can cancel long-running analysis
- Partial results: return analyzed components if timeout occurs

**Rendering Timeout:**
- Maximum 60 seconds for diagram generation (per requirements)
- Fallback to simpler layout if complex layout times out
- Progressive rendering: show nodes first, then edges

**AI Timeout:**
- Maximum 30 seconds per Kiro AI request
- Retry once on timeout
- Fall back to non-AI approach after retry failure



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Component Detection Completeness

*For any* codebase containing architectural components (modules, classes, services, packages), the AI_Analyzer should identify all components of supported types and include them in the analysis result.

**Validates: Requirements 1.2**

### Property 2: Relationship Detection Completeness

*For any* codebase with relationships between components (dependencies, imports, function calls, inheritance), the AI_Analyzer should detect and include all relationships in the analysis result.

**Validates: Requirements 1.3**

### Property 3: Multi-Language Support

*For any* source file written in a supported language (Python, JavaScript, TypeScript, Java, Go), the AI_Analyzer should successfully parse the file and extract architectural information.

**Validates: Requirements 1.4, 12.1**

### Property 4: Language Pattern Recognition

*For any* source file using language-specific architectural patterns (Python modules, JavaScript ES6 modules, Java packages), the AI_Analyzer should correctly identify and categorize the pattern.

**Validates: Requirements 12.4**

### Property 5: Error Message Display

*For any* error condition (analysis failure, diagram generation failure, unanalyzable codebase), the Extension should display a descriptive error message to the user.

**Validates: Requirements 1.6, 10.1, 10.2, 10.5**

### Property 6: Analysis-to-Diagram Fidelity

*For any* valid analysis result, the generated diagram should contain a node for each component and an edge for each relationship in the analysis result.

**Validates: Requirements 2.1, 2.3, 2.4**

### Property 7: Abstraction Level Generation

*For any* analysis result, the Diagram_Generator should be able to generate diagrams at all three abstraction levels (Overview, Module, Detailed).

**Validates: Requirements 2.6**

### Property 8: Component Hierarchy Representation

*For any* component with parent-child relationships in the analysis result, the diagram data should preserve these hierarchical relationships in its structure.

**Validates: Requirements 2.5**

### Property 9: Element Selection Highlighting

*For any* diagram element, when selected, the Interactive_Navigator should highlight that element and no other elements.

**Validates: Requirements 3.1**

### Property 10: File Mapping Integrity

*For any* diagram element, there should exist a valid mapping to one or more source files, and selecting the element should display and highlight exactly those files.

**Validates: Requirements 3.2, 3.3, 4.1**

### Property 11: Tooltip Information Completeness

*For any* diagram element, hovering over it should display a tooltip containing at minimum the element name and the count of associated source files.

**Validates: Requirements 3.4**

### Property 12: Highlight State Transitions

*For any* sequence of element selections (including deselection), the set of highlighted files should always match the files associated with the currently selected element, or be empty if no element is selected.

**Validates: Requirements 3.5, 4.4, 4.5**

### Property 13: Highlight Visual Distinction

*For any* highlighted source file, its visual decoration should be distinct from non-highlighted files in the file explorer.

**Validates: Requirements 4.2**

### Property 14: Highlighted File Navigation

*For any* highlighted source file, clicking it should trigger the IDE to open that file.

**Validates: Requirements 4.3**

### Property 15: Pan Operation Updates Viewport

*For any* pan operation (click and drag), the diagram viewport position should change in the direction of the drag.

**Validates: Requirements 5.1**

### Property 16: Zoom Operation Updates Scale

*For any* zoom operation (mouse wheel, pinch gesture), the diagram zoom level should increase or decrease accordingly.

**Validates: Requirements 5.2**

### Property 17: Fit-to-View Reset

*For any* diagram state, activating the "fit to view" function should adjust zoom and pan such that all diagram elements are visible within the viewport.

**Validates: Requirements 5.4**

### Property 18: State Preservation During Navigation

*For any* selected diagram element and viewport state (zoom, pan), performing navigation operations (zoom, pan, abstraction level change, refresh) should preserve the selection and focus area where the element still exists.

**Validates: Requirements 5.5, 6.6, 11.4**

### Property 19: Abstraction Level Filtering

*For any* abstraction level (Overview, Module, Detailed), the diagram should display only components whose abstraction level is less than or equal to the selected level, with Overview showing only level-1 components, Module showing levels 1-2, and Detailed showing all levels.

**Validates: Requirements 6.2, 6.3, 6.4**

### Property 20: PNG Export Resolution

*For any* diagram, exporting to PNG format should produce an image with resolution of at least 1920x1080 pixels.

**Validates: Requirements 7.2**

### Property 21: SVG Export Validity

*For any* diagram, exporting to SVG format should produce a valid SVG document that can be parsed by standard SVG parsers.

**Validates: Requirements 7.3**

### Property 22: Export Completeness

*For any* diagram at a given abstraction level, the exported image should include all visible diagram elements (nodes and edges) at that level.

**Validates: Requirements 7.4**

### Property 23: File Pattern Filtering

*For any* configured include/exclude file patterns, the AI_Analyzer should analyze only files that match the include patterns and do not match the exclude patterns.

**Validates: Requirements 8.4**

### Property 24: Cache Hit for Unchanged Files

*For any* file that has not been modified since the last analysis, re-analyzing the codebase should use the cached analysis result for that file rather than re-parsing it.

**Validates: Requirements 9.5**

### Property 25: Progress Indicator Visibility

*For any* long-running operation (analysis, diagram generation), a progress indicator should be visible to the user while the operation is in progress.

**Validates: Requirements 10.3**

### Property 26: Error Logging

*For any* error that occurs during extension operation, detailed error information should be logged to the IDE console.

**Validates: Requirements 10.4**

### Property 27: File Change Detection

*For any* file modification in the project codebase when auto-refresh is enabled, the Extension should detect the change and mark the diagram as out of sync.

**Validates: Requirements 11.2, 11.5**

### Property 28: Multi-Language Diagram Integration

*For any* project containing source files in multiple programming languages, the generated diagram should include components from all detected languages.

**Validates: Requirements 12.3**

### Property 29: Language Visual Distinction

*For any* component in the diagram, its visual style (color, icon) should reflect its programming language, with different languages having distinct visual representations.

**Validates: Requirements 12.2**



## Testing Strategy

### Overview

The testing strategy employs a dual approach combining unit tests for specific scenarios and property-based tests for comprehensive validation of universal properties. This ensures both concrete correctness and general robustness across diverse inputs.

### Unit Testing

**Purpose**: Verify specific examples, edge cases, error conditions, and integration points.

**Scope**:
- Specific example scenarios (e.g., activating extension with a known codebase)
- Edge cases (e.g., empty codebase, unrecognized file types, no code files)
- Error conditions (e.g., file access denied, malformed configuration)
- Integration points (e.g., IDE API interactions, subprocess communication)
- UI interactions (e.g., button clicks, menu actions)

**Framework**: Jest for TypeScript/JavaScript, pytest for Python

**Example Unit Tests**:
```typescript
describe('Extension Activation', () => {
  it('should display welcome message on first activation', async () => {
    const context = createMockContext({ isFirstActivation: true });
    await extension.activate(context);
    expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('Welcome')
    );
  });
  
  it('should handle empty codebase gracefully', async () => {
    const emptyWorkspace = createWorkspace([]);
    const result = await analyzer.analyzeCodebase(emptyWorkspace);
    expect(result.components).toHaveLength(0);
    expect(mockWindow.showInformationMessage).toHaveBeenCalledWith(
      expect.stringContaining('no architecture was detected')
    );
  });
});

describe('File Pattern Filtering', () => {
  it('should exclude node_modules by default', async () => {
    const workspace = createWorkspace([
      'src/index.ts',
      'node_modules/package/index.js'
    ]);
    const result = await analyzer.analyzeCodebase(workspace);
    expect(result.components.every(c => 
      !c.filePaths.some(p => p.includes('node_modules'))
    )).toBe(true);
  });
});
```

**Balance**: Focus unit tests on specific scenarios rather than exhaustive input coverage. Property-based tests handle comprehensive input coverage.

### Property-Based Testing

**Purpose**: Verify universal properties hold across all valid inputs through randomized testing.

**Framework**: fast-check (TypeScript/JavaScript)

**Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each test tagged with comment referencing design document property
- Tag format: `// Feature: ai-architecture-diagram-extension, Property {number}: {property_text}`

**Property Test Implementation**:

Each correctness property from the design document must be implemented as a single property-based test. The test should:
1. Generate random valid inputs
2. Execute the system behavior
3. Assert the property holds

**Example Property Tests**:

```typescript
// Feature: ai-architecture-diagram-extension, Property 1: Component Detection Completeness
describe('Property: Component Detection Completeness', () => {
  it('should identify all components in any codebase', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCodebase({ includeComponents: true }),
        async (codebase) => {
          const result = await analyzer.analyzeCodebase(codebase.path);
          
          // Verify all known components are detected
          for (const expectedComponent of codebase.knownComponents) {
            const found = result.components.some(c =>
              c.name === expectedComponent.name &&
              c.type === expectedComponent.type
            );
            expect(found).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: ai-architecture-diagram-extension, Property 6: Analysis-to-Diagram Fidelity
describe('Property: Analysis-to-Diagram Fidelity', () => {
  it('should create diagram nodes and edges for all analysis components and relationships', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryAnalysisResult(),
        async (analysisResult) => {
          const diagramData = await generator.generateDiagram(analysisResult);
          
          // Every component should have a corresponding node
          expect(diagramData.nodes.length).toBe(analysisResult.components.length);
          
          for (const component of analysisResult.components) {
            const node = diagramData.nodes.find(n => n.id === component.id);
            expect(node).toBeDefined();
            expect(node.label).toBe(component.name);
          }
          
          // Every relationship should have a corresponding edge
          expect(diagramData.edges.length).toBe(analysisResult.relationships.length);
          
          for (const relationship of analysisResult.relationships) {
            const edge = diagramData.edges.find(e => e.id === relationship.id);
            expect(edge).toBeDefined();
            expect(edge.source).toBe(relationship.source);
            expect(edge.target).toBe(relationship.target);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: ai-architecture-diagram-extension, Property 12: Highlight State Transitions
describe('Property: Highlight State Transitions', () => {
  it('should maintain correct highlight state through any selection sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryDiagramData(),
        fc.array(fc.oneof(
          fc.record({ action: fc.constant('select'), elementId: fc.string() }),
          fc.record({ action: fc.constant('deselect') })
        )),
        async (diagramData, selectionSequence) => {
          const navigator = new InteractiveNavigator(diagramData);
          const highlighter = new FileHighlighter();
          
          for (const action of selectionSequence) {
            if (action.action === 'select') {
              const element = diagramData.nodes.find(n => n.id === action.elementId);
              if (element) {
                await navigator.selectElement(action.elementId);
                await highlighter.highlightFiles(element.filePaths);
                
                // Verify highlighted files match selected element
                const highlighted = highlighter.getHighlightedFiles();
                expect(new Set(highlighted)).toEqual(new Set(element.filePaths));
              }
            } else {
              await navigator.clearSelection();
              await highlighter.clearHighlights();
              
              // Verify no files are highlighted
              expect(highlighter.getHighlightedFiles()).toHaveLength(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: ai-architecture-diagram-extension, Property 21: SVG Export Validity
describe('Property: SVG Export Validity', () => {
  it('should produce valid SVG for any diagram', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryDiagramData(),
        async (diagramData) => {
          const renderer = new DiagramRenderer();
          await renderer.renderDiagram(diagramData);
          
          const svgString = await renderer.exportToSVG();
          
          // Verify SVG can be parsed
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgString, 'image/svg+xml');
          
          // Check for parse errors
          const parseError = doc.querySelector('parsererror');
          expect(parseError).toBeNull();
          
          // Verify root element is SVG
          expect(doc.documentElement.tagName).toBe('svg');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Generators (Arbitraries)**:

Property-based tests require generators for random valid inputs:

```typescript
// Generate random codebase structures
function arbitraryCodebase(options?: { includeComponents?: boolean }) {
  return fc.record({
    path: fc.string(),
    files: fc.array(arbitrarySourceFile()),
    knownComponents: options?.includeComponents 
      ? fc.array(arbitraryComponent())
      : fc.constant([])
  });
}

// Generate random source files
function arbitrarySourceFile() {
  return fc.record({
    path: fc.string(),
    language: fc.oneof(...Object.values(Language).map(fc.constant)),
    content: fc.string()
  });
}

// Generate random analysis results
function arbitraryAnalysisResult() {
  return fc.record({
    timestamp: fc.integer(),
    rootPath: fc.string(),
    components: fc.array(arbitraryComponent(), { minLength: 1 }),
    relationships: fc.array(arbitraryRelationship()),
    metadata: arbitraryAnalysisMetadata()
  }).chain(result => {
    // Ensure relationships reference valid component IDs
    const componentIds = result.components.map(c => c.id);
    return fc.constant({
      ...result,
      relationships: result.relationships.filter(r =>
        componentIds.includes(r.source) && componentIds.includes(r.target)
      )
    });
  });
}

// Generate random diagram data
function arbitraryDiagramData() {
  return fc.record({
    nodes: fc.array(arbitraryDiagramNode(), { minLength: 1 }),
    edges: fc.array(arbitraryDiagramEdge()),
    layout: arbitraryLayoutConfig(),
    abstractionLevel: fc.oneof(...Object.values(AbstractionLevel).map(fc.constant))
  }).chain(data => {
    // Ensure edges reference valid node IDs
    const nodeIds = data.nodes.map(n => n.id);
    return fc.constant({
      ...data,
      edges: data.edges.filter(e =>
        nodeIds.includes(e.source) && nodeIds.includes(e.target)
      )
    });
  });
}
```

### Integration Testing

**Purpose**: Verify end-to-end workflows and IDE integration.

**Scope**:
- Complete diagram generation workflow (activation → analysis → rendering)
- File highlighting integration with IDE
- Webview communication
- Python subprocess lifecycle
- AI API integration

**Approach**:
- Use Kiro IDE test harness for extension testing
- Mock external dependencies (AI API, file system)
- Test with realistic sample projects

### Performance Testing

**Purpose**: Validate performance requirements.

**Scope**:
- Analysis time for 1000+ file codebases (< 120 seconds)
- Diagram rendering time (< 60 seconds)
- Memory usage during analysis (< 500MB)
- Memory usage during rendering (< 200MB)
- Export time (< 5 seconds)

**Approach**:
- Benchmark tests with large sample projects
- Memory profiling tools
- Performance regression tracking in CI

### Test Coverage Goals

- **Unit test coverage**: 80% line coverage for core logic
- **Property test coverage**: 100% of correctness properties implemented
- **Integration test coverage**: All major user workflows
- **Edge case coverage**: All identified edge cases tested

### Continuous Integration

- Run all unit tests on every commit
- Run property tests (100 iterations) on every commit
- Run integration tests on pull requests
- Run performance benchmarks weekly
- Fail build on test failures or coverage regression

