---
inclusion: auto
---

# Testing Requirements for AI Architecture Diagram Extension

## Property-Based Testing Standards

### Test Format
Every correctness property from the design document must be implemented as a property-based test:

```typescript
// Feature: ai-architecture-diagram-extension, Property {N}: {Property Name}
describe('Property: {Property Name}', () => {
  it('should {property description}', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generators for random inputs
        arbitraryInput(),
        async (input) => {
          // Execute system behavior
          const result = await systemUnderTest(input);
          
          // Assert property holds
          expect(result).toSatisfyProperty();
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Required Properties to Implement

Reference `.kiro/specs/ai-architecture-diagram-extension/design.md` section "Correctness Properties" for the complete list of 29 properties.

Key properties include:
- Property 1: Component Detection Completeness
- Property 2: Relationship Detection Completeness
- Property 6: Analysis-to-Diagram Fidelity
- Property 12: Highlight State Transitions
- Property 19: Abstraction Level Filtering
- Property 21: SVG Export Validity
- Property 28: Multi-Language Diagram Integration

### Generator Guidelines

Create arbitraries for:
- `arbitraryCodebase()` - Random project structures with files
- `arbitraryAnalysisResult()` - Valid analysis results with components and relationships
- `arbitraryDiagramData()` - Valid diagram data with nodes and edges
- `arbitraryComponent()` - Random components with valid fields
- `arbitraryRelationship()` - Random relationships referencing valid components

Ensure generated data maintains referential integrity:
- Relationship source/target must reference existing component IDs
- Edge source/target must reference existing node IDs
- Parent/child references must be valid and acyclic

### Test Configuration
- Minimum 100 iterations per property test
- Use `fc.assert()` with `{ numRuns: 100 }`
- Set timeout to 30 seconds for property tests
- Run property tests in CI on every commit

## Unit Testing Standards

### Test Organization
- Group tests by component/class using `describe()` blocks
- One test file per source file (e.g., `analysis-service.test.ts` for `analysis-service.ts`)
- Place test files adjacent to source files or in `__tests__/` directory

### Coverage Requirements
- Minimum 80% line coverage for core logic
- 100% coverage for error handling paths
- Test all public methods and interfaces
- Test edge cases explicitly (empty inputs, null values, boundary conditions)

### Mocking Strategy
- Mock Kiro IDE APIs (file system, webview, decorations)
- Mock AI service responses for deterministic tests
- Mock Tree-sitter parsers for unit tests (use real parsers in integration tests)
- Use Jest's `jest.fn()` and `jest.mock()` for mocking

### Test Examples

**Edge Case Testing:**
```typescript
describe('AnalysisService', () => {
  it('should handle empty codebase', async () => {
    const result = await analyzer.analyzeCodebase('/empty/path', config);
    expect(result.components).toHaveLength(0);
  });
  
  it('should handle unrecognized file types', async () => {
    const result = await analyzer.analyzeCodebase('/path/with/unknown', config);
    expect(result.components.some(c => c.language === Language.Unknown)).toBe(true);
  });
});
```

**Error Condition Testing:**
```typescript
describe('ErrorHandler', () => {
  it('should display error message on analysis failure', async () => {
    const error = new AnalysisError('Parse failed');
    await errorHandler.handleAnalysisError(error);
    expect(mockWindow.showErrorMessage).toHaveBeenCalled();
  });
});
```

## Integration Testing

### Test Scenarios
- Complete workflow: activate extension → generate diagram → select element → highlight files
- Refresh workflow: modify file → detect change → regenerate diagram
- Export workflow: generate diagram → export to PNG/SVG
- Multi-language workflow: analyze polyglot project → verify all languages in diagram

### Test Data
- Create sample projects in `test-fixtures/` directory
- Include projects for each supported language
- Include polyglot project with multiple languages
- Include large project (1000+ files) for performance testing

## Performance Testing

### Benchmarks
- Analysis time: Test with 1000+ file codebase, assert < 120 seconds
- Rendering time: Test with 500+ node diagram, assert < 60 seconds
- Export time: Test PNG/SVG export, assert < 5 seconds
- Memory usage: Monitor during operations, assert within limits

### Performance Test Format
```typescript
describe('Performance', () => {
  it('should analyze 1000+ files within 120 seconds', async () => {
    const startTime = Date.now();
    await analyzer.analyzeCodebase(largeCodebasePath, config);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(120000);
  }, 150000); // 150s timeout for test itself
});
```

## Test Execution

### Local Development
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage report
npm run test:property      # Run only property tests
npm run test:performance   # Run performance benchmarks
```

### CI Pipeline
- Run unit tests on every commit
- Run property tests (100 iterations) on every commit
- Run integration tests on pull requests
- Run performance tests weekly
- Fail build on any test failure
