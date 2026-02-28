# Testing ArchView on Its Own Repository

Great news! The extension is now installed and you can test it on this very repository!

## ✅ Installation Complete

The extension has been installed via symlink:
```
~/.kiro/extensions/kiro.archview -> /home/jap/projects/Archview
```

You can verify it's installed:
```bash
kiro --list-extensions
# Should show: kiro.archview
```

## 🎮 How to Test on This Repo

### Step 1: Open This Project in Kiro IDE

If you're not already in Kiro IDE:
```bash
cd /home/jap/projects/Archview
kiro .
```

Or if Kiro is already open:
- File > Open Folder
- Select `/home/jap/projects/Archview`

### Step 2: Generate the Diagram

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Linux/Windows)
2. Type: `ArchView: Generate Diagram`
3. Press Enter
4. Wait 10-20 seconds for analysis

### Step 3: Explore the Architecture

The diagram should show the structure of this extension itself:

**Expected components:**
- `src/analysis/` - Analysis services (FileScanner, ParserManager, ComponentExtractor, etc.)
- `src/diagram/` - Diagram generation (DiagramGenerator, StyleManager, AbstractionFilter)
- `src/ui/` - UI components (WebviewManager, DiagramRenderer, FileHighlighter)
- `src/types/` - Type definitions
- `src/performance/` - Performance optimization
- `src/__tests__/` - Test files

**Try these interactions:**
- Click on a node (e.g., "AnalysisService") → Files should highlight in explorer
- Hover over nodes → See tooltips with file counts
- Zoom in/out with mouse wheel
- Pan by clicking and dragging
- Switch abstraction levels (Overview, Module, Detailed)

### Step 4: Test Commands

**Refresh the diagram:**
1. Make a small change to any `.ts` file (add a comment)
2. Command: `ArchView: Refresh Diagram`
3. Diagram should update

**Export the diagram:**
1. Command: `ArchView: Export Diagram`
2. Choose PNG or SVG
3. Save it somewhere
4. Open the exported file to verify

### Step 5: Test Configuration

Open Kiro Settings and try changing:

```json
{
  "archview.aiEnabled": false
}
```

Refresh the diagram - it should use fallback heuristic analysis (still works, just less semantic).

Or try:
```json
{
  "archview.includePatterns": ["**/src/**/*.ts"],
  "archview.excludePatterns": ["**/__tests__/**", "**/node_modules/**"]
}
```

Refresh - should only show source files, not tests.

## 🐛 Debugging While Testing

Since the extension is symlinked, you can debug it while using it:

1. **Keep this project open in one Kiro window**
2. **Open another Kiro window** for testing
3. In the first window:
   - Set breakpoints in the code
   - Press F5 to start debugging
4. In the Extension Development Host window:
   - Open this same project
   - Generate diagram
   - Breakpoints will hit!

## 📊 What You Should See

This repository has a well-structured TypeScript codebase, so the diagram should show:

**At Overview Level:**
- Main architectural layers (analysis, diagram, ui, types)
- Clear separation of concerns

**At Module Level:**
- Individual services and managers
- Relationships between modules

**At Detailed Level:**
- Individual classes and their methods
- Detailed dependency graph

## 🎯 Things to Test

- [ ] Generate diagram on this repo
- [ ] Click nodes to see file highlighting
- [ ] Hover to see tooltips
- [ ] Zoom and pan
- [ ] Switch between abstraction levels
- [ ] Export to PNG
- [ ] Export to SVG
- [ ] Refresh after making a change
- [ ] Test with AI disabled
- [ ] Test with custom file patterns
- [ ] Check Output panel for logs (View > Output > ArchView)

## 🔄 Making Changes

Since it's symlinked, any changes you make are immediately available:

1. Edit any `.ts` file in `src/`
2. Compile: `npm run compile`
3. Reload Kiro IDE: `Cmd+R` / `Ctrl+R`
4. Changes are active!

Or use watch mode:
```bash
npm run watch
# Compiles automatically on file changes
# Just reload Kiro IDE to see changes
```

## 📝 Expected Results

This is a real-world TypeScript project with:
- ~30 source files
- Multiple architectural layers
- Clear module boundaries
- Good separation of concerns

The diagram should clearly show:
1. **Analysis layer** - Handles code scanning and parsing
2. **Diagram layer** - Generates visual representations
3. **UI layer** - Manages webview and interactions
4. **Types layer** - Shared type definitions

You should be able to:
- Navigate from diagram to code easily
- Understand the architecture at a glance
- See how components depend on each other

## 🚀 Next Steps

After testing on this repo:

1. Try it on other projects you have
2. Test with different languages (Python, Java, Go)
3. Test with larger projects
4. Report any issues you find
5. Suggest improvements!

## 💡 Pro Tips

1. **Start with Overview level** - This repo has good structure, so Overview shows the big picture
2. **Click on AnalysisService** - It's a central component with many dependencies
3. **Try exporting** - The diagram of this repo makes great documentation
4. **Check the logs** - View > Output > ArchView shows what's happening
5. **Test performance** - This repo is medium-sized, good for performance testing

Enjoy exploring the architecture of the extension that's creating the architecture diagram! 🎨🔄

## 🆘 If Something Goes Wrong

**Extension not showing up:**
```bash
kiro --list-extensions
# Should show: kiro.archview
```

**Commands not available:**
- Reload Kiro IDE: `Cmd+R` / `Ctrl+R`
- Or restart Kiro completely

**Diagram not generating:**
- Check Output panel (View > Output > ArchView)
- Verify compilation: `npm run compile`
- Check for errors in the console

**Need to reinstall:**
```bash
rm ~/.kiro/extensions/kiro.archview
ln -s /home/jap/projects/Archview ~/.kiro/extensions/kiro.archview
```

Happy testing! 🎉
