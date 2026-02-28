# Quick Testing Guide

This is a quick reference for testing the ArchView extension locally.

## 🚀 Quick Start (5 minutes)

### 1. Install and Build

```bash
npm install
npm run compile
```

### 2. Create Test Projects

```bash
./scripts/create-test-project.sh
```

This creates three sample projects:
- `test-projects/typescript-app` - TypeScript MVC app
- `test-projects/python-app` - Python MVC app  
- `test-projects/polyglot-app` - Mixed TypeScript + Python

### 3. Run in Debug Mode

1. Open this project in Kiro IDE
2. Press **F5** (or Run > Start Debugging)
3. A new "Extension Development Host" window opens
4. In that window, open one of the test projects:
   - File > Open Folder
   - Select `test-projects/typescript-app`

### 4. Generate Your First Diagram

In the Extension Development Host window:

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `ArchView: Generate Diagram`
3. Press Enter
4. Wait 5-10 seconds for analysis
5. Diagram appears!

### 5. Test Interactions

- **Click** a node → Files highlight in explorer
- **Hover** over a node → Tooltip appears
- **Mouse wheel** → Zoom in/out
- **Click + drag** → Pan around
- **Fit to View button** → Reset view
- **Level selector** → Change abstraction level

## 📦 Install as VSIX (Production Testing)

Test the extension as users would experience it:

```bash
# Package the extension
npm run package

# This creates: archview-0.1.0.vsix
```

Install in Kiro IDE:
1. Command Palette: `Extensions: Install from VSIX...`
2. Select `archview-0.1.0.vsix`
3. Reload Kiro IDE
4. Open a project and use normally

## 🧪 Run Tests

```bash
# All tests
npm test

# Watch mode (re-runs on changes)
npm run test:watch

# Property-based tests only
npm run test:property

# Performance tests
npm run test:performance

# With coverage
npm run test:coverage
```

## 🐛 Debug Tips

### Debug Extension Code

1. Set breakpoints in `.ts` files
2. Press F5
3. Trigger the code in Extension Development Host
4. Debugger pauses at breakpoints

### Debug Webview (Diagram)

1. With diagram open in Extension Development Host
2. Command Palette: `Developer: Open Webview Developer Tools`
3. Use Chrome DevTools to debug the diagram

### View Logs

- **Debug Console** (when debugging)
- **Output Panel** > "ArchView" (in production)

## ✅ Testing Checklist

Quick checklist for manual testing:

- [ ] Generate diagram on TypeScript project
- [ ] Generate diagram on Python project
- [ ] Generate diagram on polyglot project
- [ ] Click nodes to select them
- [ ] Files highlight in explorer
- [ ] Hover shows tooltips
- [ ] Zoom in/out works
- [ ] Pan works
- [ ] Fit to view works
- [ ] Switch abstraction levels (Overview, Module, Detailed)
- [ ] Refresh diagram after code change
- [ ] Export to PNG
- [ ] Export to SVG
- [ ] Test with AI disabled (`archview.aiEnabled: false`)
- [ ] Test with custom file patterns
- [ ] Test with large project (if available)

## 🔧 Common Issues

### Extension doesn't load
```bash
npm run compile
# Check for errors
```

### Diagram doesn't appear
- Check Output panel for errors
- Open webview DevTools for console errors
- Verify test project has source files

### Tests fail
```bash
npm test -- --clearCache
npm test
```

### Changes not reflected
- Recompile: `npm run compile`
- Reload Extension Development Host: `Cmd+R` / `Ctrl+R`
- Or restart debugging (F5)

## 📚 More Information

- **Full development guide**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- **Configuration options**: [docs/CONFIGURATION.md](docs/CONFIGURATION.md)
- **Troubleshooting**: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Architecture details**: [.kiro/specs/ai-architecture-diagram-extension/design.md](.kiro/specs/ai-architecture-diagram-extension/design.md)

## 🎯 Test Scenarios

### Scenario 1: Basic TypeScript App
```bash
cd test-projects/typescript-app
# Open in Kiro IDE
# Generate diagram
# Should show: Models, Services, Controllers, Utils
```

### Scenario 2: Python App
```bash
cd test-projects/python-app
# Open in Kiro IDE
# Generate diagram
# Should show: models, services, controllers, utils modules
```

### Scenario 3: Polyglot App
```bash
cd test-projects/polyglot-app
# Open in Kiro IDE
# Generate diagram
# Should show: backend (Python) and frontend (TypeScript) components
```

### Scenario 4: Large Project
```bash
# Open a real project with 100+ files
# Generate diagram
# Verify performance is acceptable
# Check memory usage
```

### Scenario 5: Configuration Testing
```json
// In Kiro Settings
{
  "archview.includePatterns": ["**/*.ts"],
  "archview.excludePatterns": ["**/test/**"],
  "archview.maxFiles": 50
}
```
Generate diagram and verify only TypeScript files are analyzed.

## 🚀 Next Steps

1. Run the extension in debug mode (F5)
2. Generate diagrams on test projects
3. Try all interactions
4. Run the test suite
5. Package as VSIX and test installation
6. Test on your own projects!

Happy testing! 🎉
