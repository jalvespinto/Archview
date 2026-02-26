---
inclusion: auto
---

# Spec Workflow Guide

## Working with Tasks

### Task Completion Checklist
When completing a task from `tasks.md`:

1. **Read the task requirements** - Check which requirements it addresses
2. **Implement the functionality** - Follow coding standards and architecture patterns
3. **Run diagnostics** - Use getDiagnostics on new/modified TypeScript files
4. **Run tests** - If task has associated property tests (marked with *), run them
5. **Mark task complete** - Update checkbox in tasks.md

### Property-Based Tests
Tasks marked with `*` have associated property-based tests:
- These validate universal correctness properties
- Must run with minimum 100 iterations
- Tag format: `// Feature: ai-architecture-diagram-extension, Property {N}: {name}`
- See `.kiro/steering/testing-requirements.md` for details

### Checkpoints
Tasks 5, 9, 17, and 19 are checkpoints:
- Run full test suite
- Verify all previous tasks completed correctly
- Ask user if questions arise before proceeding

## Implementation Order

Follow the task order in `tasks.md`:
1. Project setup (task 1) ✅ COMPLETED
2. Core data models (task 2)
3. Analysis Service (tasks 3-4)
4. Checkpoint (task 5)
5. AI integration (task 6)
6. Diagram generation (task 7)
7. Diagram rendering (task 8)
8. Checkpoint (task 9)
9. Webview integration (task 10)
10. File highlighting (task 11)
11. Extension controller (task 12)
12. Auto-refresh (task 13)
13. Progress indicators (task 14)
14. Performance optimization (task 15)
15. Multi-language integration (task 16)
16. Checkpoint (task 17)
17. Documentation and packaging (task 18)
18. Final validation (task 19)

## Design Document References

Always reference the design document when implementing:
- **Data Models**: Exact interface definitions
- **Component Interfaces**: Service method signatures
- **Error Handling**: Error categories and strategies
- **AI Integration**: Prompt patterns and response parsing
- **Correctness Properties**: Universal properties to validate

## Quick Commands

```bash
# Type check
npm run compile

# Run tests
npm test

# Run specific property test
npm test -- -t "Property: Component Detection"

# Check coverage
npm test -- --coverage

# Lint code
npm run lint
```
