# Contributing to ArchView

Thank you for your interest in contributing to ArchView! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git
- Kiro IDE (for testing)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/archview.git
   cd archview
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/kiro/archview.git
   ```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Compile TypeScript

```bash
npm run compile
```

### Watch Mode (for development)

```bash
npm run watch
```

### Run Tests

```bash
npm test
```

### Run Extension in Development

1. Open the project in Kiro IDE
2. Press F5 to launch Extension Development Host
3. Test your changes in the development instance

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes
- `chore/` - Maintenance tasks

### 2. Make Changes

- Write clean, readable code
- Follow the code style guide
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
npm test

# Run property-based tests
npm run test:property

# Run with coverage
npm run test:coverage

# Run linter
npm run lint

# Type check
npm run typecheck
```

### 4. Commit Changes

Write clear, descriptive commit messages:

```bash
git commit -m "feat: add support for Rust language parsing"
git commit -m "fix: resolve memory leak in diagram renderer"
git commit -m "docs: update configuration guide"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin your-branch-name
```

Then create a pull request on GitHub.

## Testing

### Unit Tests

Write unit tests for specific scenarios:

```typescript
describe('ComponentAnalyzer', () => {
  it('should detect TypeScript classes', () => {
    const code = 'class MyClass { }';
    const result = analyzer.analyze(code);
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].name).toBe('MyClass');
  });
});
```

### Property-Based Tests

Write property tests for universal properties:

```typescript
// Feature: ai-architecture-diagram-extension, Property 1: Component Detection Completeness
describe('Property: Component Detection Completeness', () => {
  it('should identify all components in any codebase', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCodebase({ includeComponents: true }),
        async (codebase) => {
          const result = await analyzer.analyzeCodebase(codebase.path);
          
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
```

### Test Requirements

- All new features must have tests
- Bug fixes must include regression tests
- Property tests must run 100 iterations
- Maintain >80% code coverage
- All tests must pass before merging

### Running Specific Tests

```bash
# Run specific test file
npm test -- ComponentAnalyzer.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="Component Detection"

# Run in watch mode
npm run test:watch
```

## Code Style

### TypeScript Style Guide

- Use TypeScript strict mode
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Use async/await over promises
- Prefer interfaces over type aliases for objects

### Example

```typescript
/**
 * Analyzes a codebase and extracts architectural information.
 * 
 * @param rootPath - Root directory of the codebase
 * @param config - Analysis configuration options
 * @returns Promise resolving to analysis results
 */
async function analyzeCodebase(
  rootPath: string,
  config: AnalysisConfig
): Promise<AnalysisResult> {
  // Implementation
}
```

### Linting

Run ESLint to check code style:

```bash
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Formatting

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multi-line objects/arrays
- Max line length: 100 characters

## Submitting Changes

### Pull Request Process

1. **Update Documentation**: Update README, docs, or comments as needed
2. **Add Tests**: Ensure new code is tested
3. **Run Full Test Suite**: `npm run ci`
4. **Update CHANGELOG**: Add entry under "Unreleased" section
5. **Create Pull Request**: Use the PR template
6. **Address Review Comments**: Respond to feedback promptly

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Property tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] CHANGELOG updated
```

### Review Process

1. Automated checks must pass (CI)
2. At least one maintainer review required
3. All review comments must be addressed
4. Squash and merge when approved

## Reporting Bugs

### Before Reporting

1. Check existing issues
2. Try latest version
3. Verify it's not a configuration issue
4. Collect relevant information

### Bug Report Template

```markdown
**Describe the Bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment**
- OS: [e.g., macOS 13.0]
- Kiro IDE Version: [e.g., 1.0.0]
- Extension Version: [e.g., 0.1.0]
- Node.js Version: [e.g., 18.0.0]

**Additional Context**
Any other relevant information
```

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
Clear description of desired solution

**Describe alternatives you've considered**
Alternative solutions or features

**Additional context**
Mockups, examples, or other context
```

### Feature Discussion

1. Open an issue with feature request
2. Discuss with maintainers
3. Get approval before implementing
4. Follow development workflow

## Architecture

See [design.md](.kiro/specs/ai-architecture-diagram-extension/design.md) for:
- System architecture
- Component descriptions
- Data models
- Design decisions

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [fast-check Documentation](https://github.com/dubzzz/fast-check)
- [Kiro Extension API](https://kiro.dev/api)

## Questions?

- Open a discussion on GitHub
- Ask in pull request comments
- Check existing issues and discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to ArchView! 🎉
