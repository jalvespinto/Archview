# How to Test the ArchView Extension

This guide answers your specific questions about testing, installing, using, and debugging the extension.

## 📦 How to Install Without Marketplace

You have three options:

### Option 1: Install from VSIX (Recommended for Testing)

This is the closest to how end users will experience your extension.

```bash
# 1. Package the extension
npm install
npm run package

# This creates: archview-0.1.0.vsix
```

Then in Kiro IDE:
1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type: `Extensions: Install from VSIX...`
3. Navigate to and select `archview-0.1.0.vsix`
4. Click "Install"
5. Reload Kiro IDE when prompted

**To update after changes:**
```bash
# Uninstall old version in Kiro IDE Extensions panel
npm run package
# Install new VSIX
```

### Option 2: Debug Mode (Best for Development)

Run the extension in a special debug instance:

1. Open the `archview` project folder in Kiro IDE
2. Press **F5** (or Run > Start Debugging)
3. A new "Extension Development Host" window opens
4. The extension is automatically loaded in this window
5. Any changes you make are reflected after reloading

**Advantages:**
- No installation needed
- Set breakpoints in your code
- See console output in Debug Console
- Fast iteration cycle

### Option 3: Symlink (For Continuous Development)

Create a symlink to your development folder:

```bash
# Find your Kiro extensions directory
# Linux/Mac: ~/.kiro/extensions
# Windows: %USERPROFILE%\.kiro\extensions

# Create symlink
ln -s /path/to/archview ~/.kiro/extensions/archview

# Compile in watch mode
npm run watch
```

Now changes are reflected after reloading Kiro IDE (no reinstall needed).

## 🎮 How to Use the Extension

### Basic Usage

1. **Open a project** in Kiro IDE that contains code files (.ts, .js, .py, .java, .go)

2. **Generate a diagram**:
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type: `ArchView: Generate Diagram`
   - Press Enter
   - Wait for analysis (10-30 seconds for small projects)

3. **Interact with the diagram**:
   - **Click** nodes to select components
   - **Hover** over nodes for tooltips
   - **Mouse wheel** to zoom
   - **Click + drag** to pan
   - **Level selector** to change detail level

4. **Navigate to code**:
   - Click a node in the diagram
   - Files highlight in the explorer
   - Click a highlighted file to open it

5. **Export diagram**:
   - Command: `ArchView: Export Diagram`
   - Choose PNG or SVG format
   - Select save location

6. **Refresh after changes**:
   - Command: `ArchView: Refresh Diagram`

### Test Projects

Create sample projects to test with:

```bash
npm run create-test-projects
```

This creates:
- `test-projects/typescript-app` - TypeScript MVC structure
- `test-projects/python-app` - Python MVC structure
- `test-projects/polyglot-app` - Mixed languages

Open any of these in Kiro IDE and generate a diagram.

## 🐛 How to Debug

### Debug Extension Code (TypeScript)

1. **Set breakpoints**:
   - Open any `.ts` file in `src/`
   - Click in the gutter to set a breakpoint (red dot)

2. **Start debugging**:
   - Press **F5**
   - Extension Development Host window opens

3. **Trigger your code**:
   - In the Extension Development Host, use the extension
   - When code hits a breakpoint, execution pauses

4. **Inspect variables**:
   - View variables in the Debug panel
   - Hover over variables in code
   - Use Debug Console to evaluate expressions

5. **Step through code**:
   - F10: Step over
   - F11: Step into
   - Shift+F11: Step out
   - F5: Continue

**Example debugging session:**

```typescript
// In src/analysis/AnalysisService.ts
async buildGroundingLayer(rootPath: string, config: AnalysisConfig) {
  console.log('Starting analysis for:', rootPath); // Add logging
  debugger; // Or set breakpoint here
  
  const files = await this.fileScanner.scan(rootPath, config);
  console.log('Found files:', files.length); // Check file count
  
  // ... rest of code
}
```

### Debug Webview Code (Diagram Rendering)

The diagram runs in a webview (browser context), so you need browser DevTools:

1. **Open diagram** in Extension Development Host

2. **Open webview DevTools**:
   - Command Palette: `Developer: Open Webview Developer Tools`
   - Chrome DevTools opens

3. **Debug like a web page**:
   - Console tab: See console.log output
   - Elements tab: Inspect DOM
   - Sources tab: Set breakpoints in `webview.js`
   - Network tab: Monitor requests

**Example webview debugging:**

```javascript
// In src/ui/webview/webview.js
window.addEventListener('message', event => {
  console.log('Received message:', event.data); // Add logging
  
  const message = event.data;
  if (message.type === 'initialize') {
    console.log('Initializing diagram with data:', message.data);
    // Set breakpoint here to inspect diagram data
  }
});
```

### View Logs

**During debugging (F5):**
- Debug Console shows all console.log output
- Output panel > "ArchView" shows extension logs

**In production (installed VSIX):**
- View > Output
- Select "ArchView" from dropdown
- See all extension logs here

### Common Debugging Scenarios

#### Scenario 1: Diagram not generating

```typescript
// Add logging in AnalysisService.ts
console.log('Config:', config);
console.log('Files found:', files.length);
console.log('Components extracted:', components.length);
```

Check Output panel for errors.

#### Scenario 2: Files not highlighting

```typescript
// Add logging in FileHighlighter.ts
console.log('Highlighting files:', filePaths);
console.log('Current highlights:', this.highlightedFiles);
```

#### Scenario 3: AI not working

```typescript
// Add logging in KiroAIService.ts
console.log('Sending to AI:', prompt.substring(0, 100));
console.log('AI response:', response);
```

Check if `archview.aiEnabled` is true in settings.

## 🧪 How to Test

### Automated Tests

```bash
# Run all tests
npm test

# Run in watch mode (re-runs on changes)
npm run test:watch

# Run specific test file
npm test -- FileScanner.test.ts

# Run property-based tests only
npm run test:property

# Run with coverage
npm run test:coverage
```

### Manual Testing Workflow

#### 1. Quick Smoke Test (5 minutes)

```bash
# Create test projects
npm run create-test-projects

# Start debugging
# Press F5 in Kiro IDE

# In Extension Development Host:
# - Open test-projects/typescript-app
# - Generate diagram
# - Click a few nodes
# - Try zoom/pan
# - Export to PNG
```

#### 2. Comprehensive Test (30 minutes)

Use the checklist in [TESTING_GUIDE.md](TESTING_GUIDE.md):

- [ ] Test on TypeScript project
- [ ] Test on Python project
- [ ] Test on polyglot project
- [ ] Test all interactions (click, hover, zoom, pan)
- [ ] Test all commands (Generate, Refresh, Export)
- [ ] Test abstraction levels
- [ ] Test with AI enabled/disabled
- [ ] Test configuration options
- [ ] Test error cases (empty project, invalid files)
- [ ] Test performance with large project

#### 3. Real-World Test

Test on your own projects:

```bash
# Open your real project in Extension Development Host
# Generate diagram
# Verify it makes sense
# Check performance
# Look for bugs
```

### Testing Different Scenarios

#### Test with AI Disabled

```json
// In Kiro Settings
{
  "archview.aiEnabled": false
}
```

Generate diagram - should use fallback heuristic analysis.

#### Test with Custom Patterns

```json
{
  "archview.includePatterns": ["**/*.ts"],
  "archview.excludePatterns": ["**/test/**", "**/node_modules/**"]
}
```

Generate diagram - should only analyze TypeScript files outside test folders.

#### Test with Large Project

```json
{
  "archview.maxFiles": 100
}
```

Open a large project - should limit to 100 files.

#### Test Auto-Refresh

```json
{
  "archview.autoRefresh": true,
  "archview.autoRefreshDebounce": 5000
}
```

Generate diagram, modify a file, wait 5 seconds - diagram should refresh.

## 🔍 Troubleshooting

### Extension doesn't load

```bash
# Check for compilation errors
npm run compile

# Check for missing dependencies
npm install

# Verify package.json main field
cat package.json | grep '"main"'
# Should be: "main": "./dist/extension.js"
```

### Diagram doesn't appear

1. Check Output panel (View > Output > ArchView) for errors
2. Open webview DevTools for console errors
3. Verify project has source files
4. Check file patterns in settings

### Changes not reflected

**In debug mode (F5):**
- Reload Extension Development Host: `Cmd+R` / `Ctrl+R`
- Or stop and restart debugging

**With VSIX installed:**
- Recompile: `npm run compile`
- Repackage: `npm run package`
- Uninstall old VSIX
- Install new VSIX
- Reload Kiro IDE

### Tests fail

```bash
# Clear Jest cache
npm test -- --clearCache

# Run with verbose output
npm test -- --verbose

# Run specific test
npm test -- --testNamePattern="should detect Python files"
```

## 📊 Performance Testing

### Test Analysis Performance

```bash
# Run performance tests
npm run test:performance

# Or manually time it
time npm test -- --testPathPattern=performance
```

### Profile Memory Usage

```typescript
// Add to your code
const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
// ... operation ...
const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`Memory used: ${memAfter - memBefore} MB`);
```

### Test with Large Projects

1. Find or create a project with 1000+ files
2. Generate diagram
3. Check it completes in < 120 seconds
4. Monitor memory usage

## 🎯 Quick Reference

### Essential Commands

```bash
# Development
npm install              # Install dependencies
npm run compile         # Compile TypeScript
npm run watch           # Compile on changes
npm test                # Run tests

# Testing
npm run create-test-projects  # Create sample projects
npm run package              # Create VSIX file
npm run dev                  # Compile + create test projects

# Quality
npm run lint            # Check code style
npm run typecheck       # Check types
npm run ci              # Run all checks
```

### Keyboard Shortcuts

**In Kiro IDE:**
- `F5` - Start debugging
- `Cmd+Shift+P` / `Ctrl+Shift+P` - Command Palette

**In Extension Development Host:**
- `Cmd+R` / `Ctrl+R` - Reload window
- `Cmd+Shift+P` / `Ctrl+Shift+P` - Command Palette

**While debugging:**
- `F5` - Continue
- `F10` - Step over
- `F11` - Step into
- `Shift+F11` - Step out

## 📚 Additional Resources

- **Quick Testing**: [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Full Development Guide**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **Configuration**: [docs/CONFIGURATION.md](docs/CONFIGURATION.md)
- **Troubleshooting**: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Architecture**: [.kiro/specs/ai-architecture-diagram-extension/design.md](.kiro/specs/ai-architecture-diagram-extension/design.md)

## 🚀 Recommended Workflow

For the best development experience:

1. **Initial setup**:
   ```bash
   npm install
   npm run create-test-projects
   ```

2. **Development cycle**:
   - Open project in Kiro IDE
   - Press F5 to start debugging
   - Make changes to code
   - Reload Extension Development Host (Cmd+R)
   - Test changes
   - Repeat

3. **Before committing**:
   ```bash
   npm run ci  # Runs lint, typecheck, tests
   ```

4. **Before releasing**:
   ```bash
   npm run package
   # Install VSIX and do final testing
   ```

## 💡 Pro Tips

1. **Use watch mode** for faster iteration:
   ```bash
   npm run watch  # In one terminal
   # Press F5 in Kiro IDE
   # Changes compile automatically
   ```

2. **Use test:watch** for TDD:
   ```bash
   npm run test:watch
   # Tests re-run on file changes
   ```

3. **Add console.log liberally** during debugging - they appear in Debug Console

4. **Use webview DevTools** for diagram issues - it's just like debugging a web page

5. **Test with small projects first** before trying large codebases

6. **Check Output panel** when things go wrong - errors are logged there

7. **Use property-based tests** to find edge cases you didn't think of

Happy testing! 🎉
