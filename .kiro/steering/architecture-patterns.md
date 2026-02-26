---
inclusion: auto
---

# Architecture Patterns for AI Architecture Diagram Extension

## Component Structure

Follow the layered architecture from the design document:

```
Extension Controller (Orchestration Layer)
    ↓
Analysis Service (Analysis Layer)
    ↓
Tree-sitter Parsers (Parsing Layer)

Extension Controller (Orchestration Layer)
    ↓
Webview Manager (Presentation Layer)
    ↓
Diagram Renderer (Rendering Layer)

Extension Controller (Orchestration Layer)
    ↓
File Highlighter (IDE Integration Layer)
```

## Service Layer Pattern

All major components should be implemented as services with clear interfaces:

### Analysis Service
- **Input**: `AnalysisConfig` (root path, patterns, limits)
- **Output**: `AnalysisResult` (components, relationships, metadata)
- **Dependencies**: Tree-sitter parsers, file system, Kiro AI API
- **Responsibilities**: File scanning, parsing, dependency extraction, AI enhancement

### Diagram Generator
- **Input**: `AnalysisResult`
- **Output**: `DiagramData` (nodes, edges, layout config)
- **Dependencies**: None (pure transformation)
- **Responsibilities**: Convert analysis to visual representation, apply styling

### Webview Manager
- **Input**: `DiagramData`
- **Output**: Rendered webview with interactive diagram
- **Dependencies**: Kiro Webview API, Diagram Renderer
- **Responsibilities**: Webview lifecycle, bidirectional messaging, UI controls

### File Highlighter
- **Input**: File paths array
- **Output**: Visual decorations in IDE
- **Dependencies**: Kiro FileDecoration API
- **Responsibilities**: Apply/clear highlights, track state

## Data Flow Principles

### Unidirectional Data Flow
- Data flows from Analysis → Diagram Generation → Rendering
- No circular dependencies between services
- State managed centrally in Extension Controller

### Immutability
- Analysis results are immutable once generated
- Diagram data is immutable once created
- Create new objects for updates rather than mutating

### Caching Strategy
- Cache analysis results keyed by file modification time
- Cache AI responses keyed by component structure hash
- Invalidate cache on file changes or configuration updates
- Store cache in extension global state for persistence

## Interface Design Principles

### Data Models
Use exact interfaces from design document:
- `Component`, `Relationship`, `AnalysisResult`
- `DiagramData`, `DiagramNode`, `DiagramEdge`
- `WebviewMessage` union type

Do not add fields without updating design document first.

### Service Interfaces
- All async operations return `Promise<T>`
- Use specific error types (not generic `Error`)
- Accept configuration objects rather than multiple parameters
- Return rich result objects with metadata

### Message Passing
Use discriminated unions for type-safe messaging:
```typescript
type WebviewMessage = 
  | { type: 'initialize'; data: DiagramData }
  | { type: 'elementSelected'; elementId: string }
  | { type: 'error'; message: string };
```

## Dependency Injection

All services should accept dependencies via constructor:

```typescript
class AnalysisService {
  constructor(
    private _parserManager: ParserManager,
    private _aiService: KiroAIService,
    private _fileSystem: FileSystem
  ) {}
}
```

Benefits:
- Testability (inject mocks)
- Flexibility (swap implementations)
- Clear dependencies

## Error Handling Pattern

Follow the error handling strategy from design document:

```typescript
class ServiceName {
  async operation(): Promise<Result> {
    try {
      // Attempt operation
      return await this._performOperation();
    } catch (error) {
      // Log detailed error
      this._logger.error('Operation failed', error);
      
      // Attempt graceful degradation
      if (this._canFallback(error)) {
        this._logger.warn('Using fallback approach');
        return await this._fallbackOperation();
      }
      
      // Wrap and rethrow with context
      throw new ServiceError(
        'User-friendly message',
        { cause: error, context: this._getContext() }
      );
    }
  }
}
```

## State Management

### Extension State
- Current analysis result (cached)
- Selected element ID
- Current abstraction level
- Zoom and pan state
- Highlighted file paths

### State Updates
- Centralized in Extension Controller
- Immutable updates (create new state objects)
- Notify dependent components on state changes
- Persist critical state in extension global state

## Performance Patterns

### Async Operations
- Use worker threads for CPU-intensive parsing
- Batch file system operations
- Stream large files rather than loading entirely
- Debounce user interactions (zoom, pan)

### Memory Management
- Release resources when webview closed
- Clear caches when memory pressure detected
- Use weak references for large objects
- Monitor memory usage and warn if approaching limits

### Caching
- Cache analysis results by file modification time
- Cache AI responses by structure hash
- Implement LRU eviction (max 100 entries)
- Invalidate on configuration changes

## Tree-sitter Integration

### Parser Management
```typescript
class ParserManager {
  private _parsers: Map<Language, Parser>;
  
  getParser(language: Language): Parser {
    if (!this._parsers.has(language)) {
      this._parsers.set(language, this._initializeParser(language));
    }
    return this._parsers.get(language)!;
  }
}
```

### AST Traversal
- Use Tree-sitter query syntax for pattern matching
- Extract nodes by type (class_definition, function_definition, import_statement)
- Handle language-specific variations in AST structure
- Gracefully handle parse errors (partial ASTs)

## Kiro AI Integration

### Prompt Construction
- Use structured prompts with clear instructions
- Include relevant context (components, relationships)
- Request JSON responses for easy parsing
- Keep prompts under 4000 tokens

### Response Parsing
- Validate AI response structure before using
- Handle malformed responses gracefully
- Fall back to heuristics if parsing fails
- Cache successful responses

## Cytoscape.js Integration

### Initialization
```typescript
const cy = cytoscape({
  container: document.getElementById('diagram'),
  layout: { name: 'dagre', rankDir: 'TB' },
  style: [ /* node and edge styles */ ],
  minZoom: 0.25,
  maxZoom: 4.0
});
```

### Performance Optimization
- Enable virtualization for 1000+ nodes
- Use progressive rendering (nodes first, edges second)
- Debounce zoom/pan updates
- Use `requestAnimationFrame` for smooth animations

## File References

When implementing, reference these design document sections:
- **System Architecture**: Overall component structure
- **Component Interaction Flow**: Sequence of operations
- **Data Models**: Exact interface definitions
- **Error Handling**: Error categories and strategies
- **AI Integration Strategy**: Kiro AI usage patterns
