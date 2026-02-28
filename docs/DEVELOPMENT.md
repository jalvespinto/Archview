# Development Guide

This guide covers how to develop, test, debug, and install the ArchView extension locally without publishing to the marketplace.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Kiro IDE installed
- Git (for cloning the repository)

## Setup Development Environment

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/kiro/archview
cd archview

# Install dependencies
npm install

# Compile TypeScript
npm run compile
```

### 2. Verify Installation

```bash
# Run type checking
npm run typecheck

# Run tests
npm test

# Run linter
npm run lint
```

## Local Installation Methods

### Method 1: Install from VSIX (Recommended)

This is the easiest way to test the extension as an end user would experience it.

```bash
# Package the extension
npm run package

# This creates: archview-0.1.0.vsix
```

Then install in Kiro IDE:

1. Open Kiro IDE
2. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Type: `Extensions: Install from VSIX...`
4. Select the `archview-0.1.0.vsix` file
5. Reload Kiro IDE when prompted

**To update after making changes:**
```bash
# Recompile and repackage
npm run compile
npm run package

# Uninstall old version in Kiro IDE
# Reinstall new VSIX
```

### Method 2: Symlink for Development

For rapid iteration without reinstalling:

```bash
# Find your Kiro extensions directory
# Linux: ~/.kiro/extensions
# macOS: ~/.kiro/extensions
# Windows: %USERPROFILE%\.kiro\extensions

# Create a symlink
ln -s /path/to/archview ~/.kiro/extensions/archview

# Compile in watch mode
npm run watch
```

Now changes are reflected after reloading Kiro IDE.

### Method 3: Debug Mode (Best for Development)

Run the extension in a debug instance of Kiro IDE:

1. Open the `archview` folder in Kiro IDE
2. Press `F5` or go to Run > Start Debugging
3. This opens a new "Extension Development Host" window
4. The extension is loaded in this debug window
5. Set breakpoints in your TypeScript code
6. Use the Debug Console to inspect variables

**Debug Configuration** (already in `.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "preLaunchTask": "npm: compile"
    }
  ]
}
```

## Testing the Extension

### Unit and Property-Based Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only property-based tests
npm run test:property

# Run performance tests
npm run test:performance

# Generate coverage report
npm run test:coverage
```

### Manual Testing Workflow

#### 1. Prepare Test Projects

Create sample projects in different languages:

**TypeScript Project:**
```bash
mkdir test-projects/typescript-app
cd test-projects/typescript-app
npm init -y
# Add some .ts files with classes, functions, imports
```

**Python Project:**
```bash
mkdir test-projects/python-app
cd test-projects/python-app
# Add some .py files with classes, functions, imports
```

**Polyglot Project:**
```bash
mkdir test-projects/polyglot-app
# Mix of .ts, .py, .java, .go files
```

#### 2. Test Basic Functionality

1. **Open test project in Kiro IDE**
   - File > Open Folder
   - Select one of your test projects

2. **Generate diagram**
   - Press `Cmd+Shift+P` / `Ctrl+Shift+P`
   - Type: `ArchView: Generate Diagram`
   - Wait for analysis to complete
   - Verify diagram appears

3. **Test interactions**
   - Click nodes to select them
   - Verify files highlight in explorer
   - Hover over nodes to see tooltips
   - Zoom in/out with mouse wheel
   - Pan by dragging
   - Click "Fit to View" button

4. **Test abstraction levels**
   - Switch between Overview, Module, Detailed
   - Verify different levels show different detail

5. **Test export**
   - Command: `ArchView: Export Diagram`
   - Choose PNG format
   - Verify file is created and valid
   - Repeat with SVG format

6. **Test refresh**
   - Modify a source file
   - Command: `ArchView: Refresh Diagram`
   - Verify diagram updates

#### 3. Test Edge Cases

- **Empty project**: No source files
- **Large project**: 1000+ files
- **Single file**: Project with one file
- **Deep nesting**: Many nested directories
- **Mixed languages**: Polyglot project
- **Invalid code**: Files with syntax errors
- **No AI**: Disable `archview.aiEnabled` setting

#### 4. Test Configuration

Open Kiro Settings and test each configuration option:

```json
{
  "archview.includePatterns": ["**/*.ts"],
  "archview.excludePatterns": ["**/test/**"],
  "archview.maxFiles": 100,
  "archview.maxDepth": 5,
  "archview.languages": ["typescript"],
  "archview.aiEnabled": false,
  "archview.autoRefresh": true,
  "archview.autoRefreshDebounce": 5000
}
```

Verify each setting affects behavior correctly.

## Debugging

### Debug Extension Code

1. **Set breakpoints** in TypeScript files
2. **Press F5** to start debugging
3. **Trigger the code** in the Extension Development Host
4. **Inspect variables** in Debug panel
5. **Use Debug Console** for expressions

### Debug Webview Code

The diagram renderer runs in a webview (browser context):

1. **Open webview DevTools**:
   - In Extension Development Host, with diagram open
   - Command Palette: `Developer: Open Webview Developer Tools`

2. **Inspect webview**:
   - View console logs
   - Inspect DOM elements
   - Debug JavaScript in `webview.js`
   - Monitor network requests

3. **Debug webview messages**:
   ```typescript
   // Add logging in WebviewManager
   console.log('Sending message to webview:', message);
   
   // Add logging in webview.js
   console.log('Received message from extension:', event.data);
   ```

### Debug Analysis Service

Add logging to track analysis progress:

```typescript
// In AnalysisService.ts
console.log('Starting analysis for:', rootPath);
console.log('Found files:', files.length);
console.log('Extracted components:', components.length);
```

View logs in:
- **Debug Console** (when debugging)
- **Output Panel** > "ArchView" channel (in production)

### Common Issues and Solutions

#### Issue: Extension not loading

**Solution:**
```bash
# Check compilation errors
npm run compile

# Check for missing dependencies
npm install

# Verify package.json main field points to dist/extension.js
```

#### Issue: Webview not displaying

**Solution:**
- Check browser console in webview DevTools
- Verify HTML file path in WebviewManager
- Check CSP (Content Security Policy) settings
- Ensure Cytoscape.js is loaded

#### Issue: AI features not working

**Solution:**
- Verify Kiro AI API is available
- Check `archview.aiEnabled` setting
- Test fallback mode (should still work without AI)
- Check error logs in Output panel

#### Issue: Tests failing

**Solution:**
```bash
# Clear Jest cache
npm test -- --clearCache

# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- FileScanner.test.ts
```

## Performance Profiling

### Profile Analysis Performance

```typescript
// Add timing in AnalysisService
const startTime = Date.now();
const result = await this.analyzeCodebase(rootPath, config);
console.log('Analysis took:', Date.now() - startTime, 'ms');
```

### Profile Memory Usage

```typescript
// Add memory tracking
const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
// ... operation ...
const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
console.log('Memory used:', memAfter - memBefore, 'MB');
```

### Profile Rendering Performance

Use Chrome DevTools Performance tab in webview:
1. Open webview DevTools
2. Go to Performance tab
3. Click Record
4. Trigger diagram rendering
5. Stop recording
6. Analyze flame graph

## Continuous Integration

The project includes CI configuration in `.github/workflows/`:

```bash
# Run the same checks as CI locally
npm run ci

# This runs:
# - npm run lint
# - npm run typecheck
# - npm run test:coverage
```

## Making Changes

### Typical Development Workflow

1. **Make changes** to TypeScript files
2. **Compile**: `npm run compile` (or use watch mode)
3. **Run tests**: `npm test`
4. **Test manually** in debug mode (F5)
5. **Fix issues** and repeat
6. **Package**: `npm run package`
7. **Install VSIX** and test as end user

### Hot Reload During Development

For faster iteration:

```bash
# Terminal 1: Watch mode compilation
npm run watch

# Terminal 2: Run tests in watch mode
npm run test:watch

# Kiro IDE: Press F5 to debug
# After changes, reload Extension Development Host:
# Command Palette > Developer: Reload Window
```

## Testing Checklist

Before considering a feature complete:

- [ ] Unit tests pass
- [ ] Property-based tests pass (100 iterations)
- [ ] Manual testing in debug mode works
- [ ] Manual testing from VSIX works
- [ ] Tested on sample TypeScript project
- [ ] Tested on sample Python project
- [ ] Tested on polyglot project
- [ ] Tested with large project (1000+ files)
- [ ] Tested all commands (Generate, Refresh, Export)
- [ ] Tested all configuration options
- [ ] Tested error cases
- [ ] Tested with AI enabled and disabled
- [ ] No console errors in webview
- [ ] No errors in Output panel
- [ ] Memory usage acceptable
- [ ] Performance acceptable
- [ ] Documentation updated

## Useful Commands Reference

```bash
# Development
npm run compile          # Compile TypeScript
npm run watch           # Compile in watch mode
npm run typecheck       # Type check without emitting

# Testing
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report
npm run test:property   # Run property-based tests only
npm run test:performance # Run performance tests only

# Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix auto-fixable issues
npm run ci              # Run all CI checks

# Packaging
npm run package         # Create VSIX file
npm run vscode:prepublish # Pre-publish hook
```

## Debugging Tips

1. **Use console.log liberally** during development
2. **Check Output panel** for extension logs
3. **Use webview DevTools** for diagram issues
4. **Set breakpoints** in critical paths
5. **Test with small projects first** before large ones
6. **Disable AI** to isolate static analysis issues
7. **Check file patterns** if files aren't being analyzed
8. **Monitor memory** with large projects
9. **Use property-based tests** to find edge cases
10. **Read error messages carefully** - they're descriptive

## Getting Help

- Check existing tests for examples
- Review implementation in `src/` directory
- Check design document for architecture details
- Look at similar VS Code extensions for patterns
- Ask questions in GitHub issues

## Next Steps

Now that you know how to develop and test:

1. Try running the extension in debug mode (F5)
2. Open a test project and generate a diagram
3. Make a small change and see it reflected
4. Run the test suite
5. Package and install the VSIX

Happy developing! 🚀
