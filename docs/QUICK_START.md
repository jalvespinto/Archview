# ArchView Quick Start Guide

Get up and running with ArchView in 5 minutes!

## Installation

1. Open Kiro IDE
2. Open the Extensions panel (`Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for "ArchView"
4. Click **Install**
5. Reload Kiro IDE if prompted

## Your First Diagram

### Step 1: Open a Project

Open any project that contains code in supported languages:
- TypeScript/JavaScript
- Python
- Java
- Go

### Step 2: Generate the Diagram

1. Open the Command Palette:
   - Mac: `Cmd+Shift+P`
   - Windows/Linux: `Ctrl+Shift+P`

2. Type: `ArchView: Generate Diagram`

3. Press Enter

### Step 3: Wait for Analysis

You'll see a progress indicator while ArchView:
- Scans your codebase
- Analyzes file structure
- Uses AI to understand architecture
- Generates the diagram

This typically takes 10-30 seconds for small projects, up to 2 minutes for large codebases (1000+ files).

### Step 4: Explore Your Architecture

Once the diagram appears:

**Pan**: Click and drag the background to move around

**Zoom**: Use your mouse wheel or trackpad pinch gesture

**Select**: Click any component (node) to select it

**View Files**: When you select a component, its files highlight in the file explorer

**Navigate**: Click a highlighted file to open it in the editor

**Fit View**: Click the "Fit to View" button to see the entire diagram

## Understanding the Diagram

### Components (Nodes)

Each box or shape represents an architectural component:
- **Modules**: Groups of related files
- **Packages**: Language-specific packages
- **Services**: Identified service components
- **Layers**: Architectural layers (API, business logic, data access)

### Relationships (Edges)

Arrows between components show:
- **Dependencies**: One component uses another
- **Imports**: Direct import relationships
- **Inheritance**: Class inheritance
- **Function Calls**: Cross-component function calls

### Colors

Different colors indicate:
- **Programming language** of the component
- **Component type** (module, class, service)

Hover over any component to see details!

## Abstraction Levels

Use the level selector in the toolbar to change detail:

### Overview (Level 1)
- Shows only top-level components
- Best for understanding overall architecture
- Ideal for large projects

### Module (Level 2)
- Shows module-level structure
- Displays public interfaces
- Good balance of detail and clarity

### Detailed (Level 3)
- Shows classes and functions
- Displays internal dependencies
- Best for understanding implementation details

**Tip**: Start with Overview, then drill down to Detailed for specific areas.

## Common Tasks

### Refresh After Code Changes

1. Make changes to your code
2. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Type: `ArchView: Refresh Diagram`
4. Press Enter

The diagram regenerates with your latest changes.

### Export for Documentation

1. With diagram open, open Command Palette
2. Type: `ArchView: Export Diagram`
3. Choose format:
   - **PNG**: For presentations and documents (1920x1080+)
   - **SVG**: For scalable graphics and web use
4. Choose save location

### Find a Specific Component

1. Use the search/filter in the diagram toolbar (if available)
2. Or use `Cmd+F` / `Ctrl+F` to search
3. Click the component to select it
4. Files highlight in the explorer

### Navigate from Diagram to Code

1. Click a component in the diagram
2. Look at the file explorer - highlighted files belong to that component
3. Click any highlighted file to open it
4. The file opens in the editor

## Tips for Best Results

### For Large Projects

- Start with Overview level
- Use the search/filter to find specific components
- Consider adjusting `archview.maxFiles` in settings if analysis times out

### For Multi-Language Projects

- All supported languages appear in one diagram
- Colors distinguish different languages
- Hover to see language information

### For Better Performance

- Exclude unnecessary directories in settings:
  ```json
  "archview.excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**"
  ]
  ```

- Reduce `archview.maxFiles` if needed
- Disable auto-refresh for very large projects

## Keyboard Shortcuts

While viewing a diagram:

| Action | Shortcut |
|--------|----------|
| Zoom In | Mouse wheel up / Pinch out |
| Zoom Out | Mouse wheel down / Pinch in |
| Pan | Click + Drag |
| Select Element | Click |
| Deselect | Click background |
| Fit to View | Button in toolbar |

## Troubleshooting

### "No architecture detected"

**Cause**: No supported code files found

**Solution**:
- Check that your project contains .ts, .js, .py, .java, or .go files
- Verify `archview.includePatterns` in settings
- Check that files aren't all excluded by `archview.excludePatterns`

### Analysis Takes Too Long

**Cause**: Too many files being analyzed

**Solution**:
- Add more exclusion patterns (node_modules, dist, build, etc.)
- Reduce `archview.maxFiles` in settings
- Close other resource-intensive applications

### Diagram Looks Cluttered

**Cause**: Too much detail at current level

**Solution**:
- Switch to Overview level
- Use zoom to focus on specific areas
- Consider if your architecture has too many top-level components

### Files Not Highlighting

**Cause**: File paths changed or files moved

**Solution**:
- Refresh the diagram
- Check that files still exist
- Ensure files are within the workspace

## Next Steps

Now that you've created your first diagram:

1. **Explore Configuration**: Customize ArchView in Kiro Settings
2. **Try Different Levels**: Switch between Overview, Module, and Detailed
3. **Export Diagrams**: Create documentation for your team
4. **Enable Auto-Refresh**: Keep diagrams up-to-date automatically

## Getting Help

- Check the [README](../README.md) for detailed documentation
- Review [Configuration Guide](CONFIGURATION.md) for settings
- See [Troubleshooting Guide](TROUBLESHOOTING.md) for common issues
- Report bugs on [GitHub Issues](https://github.com/kiro/archview/issues)

---

Happy diagramming! 🎨
