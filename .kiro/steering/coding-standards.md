---
inclusion: auto
description: TypeScript coding standards and conventions for the extension
---

# Coding Standards for AI Architecture Diagram Extension

## TypeScript Conventions

### Naming Patterns
- **Classes**: PascalCase with descriptive nouns (e.g., `AnalysisService`, `DiagramRenderer`, `FileHighlighter`)
- **Interfaces**: PascalCase, prefix with `I` only for pure contracts (e.g., `Component`, `AnalysisResult`)
- **Enums**: PascalCase for enum name, PascalCase for values (e.g., `ComponentType.Module`)
- **Functions/Methods**: camelCase with verb prefixes (e.g., `analyzeCodebase()`, `generateDiagram()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_ANALYSIS_TIME_MS`)
- **Private members**: Prefix with underscore (e.g., `_cache`, `_parseFile()`)

### File Organization
- One class per file, filename matches class name in kebab-case (e.g., `analysis-service.ts`)
- Group related interfaces in `types/` directory
- Keep files under 300 lines; split into multiple files if larger
- Directory structure mirrors component architecture from design doc

### Code Structure
- Use async/await for asynchronous operations (no raw Promises)
- Prefer composition over inheritance
- Use dependency injection for testability
- Keep functions under 50 lines; extract helper functions if needed
- Use early returns to reduce nesting

### Error Handling
- Use custom error classes extending `Error` (e.g., `AnalysisError`, `RenderError`)
- Always include context in error messages
- Log errors before throwing or returning
- Implement graceful degradation per design doc error handling strategy

### Documentation
- JSDoc comments for all public interfaces, classes, and methods
- Include `@param`, `@returns`, `@throws` tags
- Reference requirement numbers in comments (e.g., `// Requirements: 1.2, 1.3`)
- Document non-obvious implementation decisions

## Design Pattern Adherence

### Service Classes
All service classes should follow this pattern:
```typescript
export class ServiceName {
  private _dependency: DependencyType;
  
  constructor(dependency: DependencyType) {
    this._dependency = dependency;
  }
  
  async mainMethod(): Promise<ResultType> {
    // Implementation
  }
  
  private _helperMethod(): void {
    // Implementation
  }
}
```

### Interface Definitions
Reference the design doc data models exactly:
- `Component`, `Relationship`, `AnalysisResult` from design doc section "Data Models"
- `DiagramData`, `DiagramNode`, `DiagramEdge` from design doc
- Do not add fields not specified in design without justification

### Validation
Always validate inputs using the `DataValidator` pattern from design doc:
- Check required fields exist
- Validate references (component IDs, file paths)
- Detect cycles in hierarchical relationships
- Return `ValidationResult` with errors array

## Testing Requirements

### Property-Based Tests
- Tag with comment: `// Feature: ai-architecture-diagram-extension, Property {N}: {name}`
- Use fast-check with minimum 100 iterations
- Generate valid random inputs using arbitraries
- Assert universal properties, not specific values

### Unit Tests
- Focus on specific scenarios and edge cases
- Mock external dependencies (Kiro API, file system, AI)
- Test error conditions explicitly
- Keep tests independent and deterministic

## Performance Guidelines

- Analysis operations must complete within 120 seconds (Requirement 1.5)
- Diagram rendering must complete within 60 seconds (Requirement 2.7)
- Export operations must complete within 5 seconds (Requirement 7.5)
- Memory limits: 500MB during analysis, 200MB during rendering (Requirements 9.1, 9.2)
- Use caching to avoid re-analyzing unchanged files (Requirement 9.5)
