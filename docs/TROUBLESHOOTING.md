# ArchView Troubleshooting Guide

Solutions to common issues and problems with ArchView.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Analysis Issues](#analysis-issues)
- [Diagram Display Issues](#diagram-display-issues)
- [Performance Issues](#performance-issues)
- [File Highlighting Issues](#file-highlighting-issues)
- [Export Issues](#export-issues)
- [AI Integration Issues](#ai-integration-issues)
- [Configuration Issues](#configuration-issues)

---

## Installation Issues

### Extension Won't Install

**Symptoms**: Installation fails or hangs

**Possible Causes**:
- Network connectivity issues
- Insufficient disk space
- Kiro IDE version incompatibility

**Solutions**:

1. **Check Kiro IDE version**:
   - Requires Kiro IDE ^1.0.0
   - Update Kiro IDE if needed

2. **Check disk space**:
   - Ensure at least 100MB free space
   - Extension + dependencies ~50MB

3. **Retry installation**:
   - Close and reopen Kiro IDE
   - Try installing again

4. **Manual installation**:
   - Download .vsix file from marketplace
   - Install from VSIX in Extensions panel

### Extension Not Activating

**Symptoms**: Extension installed but commands not available

**Possible Causes**:
- Extension not activated
- Activation error
- Missing dependencies

**Solutions**:

1. **Check extension status**:
   - Open Extensions panel
   - Verify ArchView shows as "Enabled"

2. **Reload window**:
   - Command Palette → "Developer: Reload Window"

3. **Check error logs**:
   - Help → Toggle Developer Tools
   - Check Console for errors

4. **Reinstall extension**:
   - Uninstall ArchView
   - Restart Kiro IDE
   - Reinstall ArchView

---

## Analysis Issues

### "No Architecture Detected"

**Symptoms**: Message saying no architecture was detected

**Possible Causes**:
- No supported code files in project
- All files excluded by patterns
- Empty project

**Solutions**:

1. **Verify supported files exist**:
   - Check for .ts, .js, .py, .java, or .go files
   - Ensure files contain actual code

2. **Check include patterns**:
   ```json
   "archview.includePatterns": [
     "**/*.ts",
     "**/*.js",
     "**/*.py",
     "**/*.java",
     "**/*.go"
   ]
   ```

3. **Check exclude patterns**:
   - Ensure not excluding all source files
   - Temporarily set to `[]` to test

4. **Check file locations**:
   - Ensure files are within workspace
   - Check that workspace is properly opened

### Analysis Times Out

**Symptoms**: Analysis runs for 2+ minutes then fails

**Possible Causes**:
- Too many files
- Very large files
- Insufficient system resources

**Solutions**:

1. **Reduce max files**:
   ```json
   "archview.maxFiles": 500
   ```

2. **Add more exclusions**:
   ```json
   "archview.excludePatterns": [
     "**/node_modules/**",
     "**/dist/**",
     "**/build/**",
     "**/*.test.ts",
     "**/*.spec.ts"
   ]
   ```

3. **Reduce max depth**:
   ```json
   "archview.maxDepth": 8
   ```

4. **Close other applications**:
   - Free up system memory
   - Close unused IDE windows

5. **Disable AI temporarily**:
   ```json
   "archview.aiEnabled": false
   ```

### Analysis Fails with Error

**Symptoms**: Error message during analysis

**Possible Causes**:
- File access permissions
- Corrupted files
- Unsupported file encoding

**Solutions**:

1. **Check error message**:
   - Read full error in Output panel
   - Look for specific file causing issue

2. **Check file permissions**:
   - Ensure read access to all project files
   - Check directory permissions

3. **Exclude problematic files**:
   - Add specific files to exclude patterns
   - Example: `"**/problematic-file.ts"`

4. **Check file encoding**:
   - Ensure files are UTF-8 encoded
   - Re-save files with correct encoding

5. **View detailed logs**:
   - Output panel → Select "ArchView"
   - Check for specific error details

### Incomplete Analysis Results

**Symptoms**: Some files or components missing from diagram

**Possible Causes**:
- Max files limit reached
- Files excluded by patterns
- Parsing errors in specific files

**Solutions**:

1. **Increase max files**:
   ```json
   "archview.maxFiles": 2000
   ```

2. **Check include patterns**:
   - Ensure all desired file types included
   - Add missing extensions

3. **Check exclude patterns**:
   - Verify not excluding desired files
   - Review patterns carefully

4. **Check Output panel**:
   - Look for parsing warnings
   - Identify files that failed to parse

---

## Diagram Display Issues

### Diagram Not Appearing

**Symptoms**: Analysis completes but no diagram shows

**Possible Causes**:
- Webview creation failed
- Rendering error
- Empty analysis result

**Solutions**:

1. **Check for error messages**:
   - Look for error notifications
   - Check Output panel

2. **Retry generation**:
   - Close any open diagram panels
   - Run "Generate Diagram" again

3. **Reload window**:
   - Command Palette → "Developer: Reload Window"
   - Try generating again

4. **Check webview support**:
   - Ensure Kiro IDE supports webviews
   - Update Kiro IDE if needed

### Diagram Looks Cluttered

**Symptoms**: Too many nodes, hard to read

**Possible Causes**:
- Too much detail at current level
- Too many top-level components
- Poor layout

**Solutions**:

1. **Switch to Overview level**:
   - Use level selector in toolbar
   - Shows only top-level components

2. **Use zoom and pan**:
   - Zoom in on specific areas
   - Pan to explore different sections

3. **Exclude test files**:
   ```json
   "archview.excludePatterns": [
     "**/*.test.ts",
     "**/*.spec.ts"
   ]
   ```

4. **Enable AI grouping**:
   ```json
   "archview.aiEnabled": true
   ```
   - AI groups related files better

### Diagram Layout Issues

**Symptoms**: Nodes overlapping, poor positioning

**Possible Causes**:
- Layout algorithm limitations
- Too many nodes
- Complex relationships

**Solutions**:

1. **Use Fit to View**:
   - Click "Fit to View" button
   - Resets layout

2. **Refresh diagram**:
   - Command: "ArchView: Refresh Diagram"
   - Regenerates layout

3. **Switch abstraction levels**:
   - Try different levels
   - Fewer nodes = better layout

4. **Manually adjust zoom**:
   - Zoom out to see full structure
   - Zoom in to specific areas

### Colors Not Showing

**Symptoms**: All nodes same color

**Possible Causes**:
- Single language project
- Theme compatibility issue
- Rendering issue

**Solutions**:

1. **Check project languages**:
   - Single language = single color (expected)
   - Multi-language = multiple colors

2. **Try different theme**:
   - Switch Kiro IDE theme
   - Reload diagram

3. **Refresh diagram**:
   - Regenerate to reset colors

---

## Performance Issues

### Slow Analysis

**Symptoms**: Analysis takes longer than expected

**Possible Causes**:
- Large codebase
- AI enabled
- Insufficient resources

**Solutions**:

1. **Reduce file count**:
   ```json
   "archview.maxFiles": 500
   ```

2. **Disable AI**:
   ```json
   "archview.aiEnabled": false
   ```
   - 30-50% faster

3. **Add more exclusions**:
   - Exclude tests, docs, generated code

4. **Close other applications**:
   - Free up CPU and memory

### Slow Diagram Rendering

**Symptoms**: Diagram takes long to appear after analysis

**Possible Causes**:
- Too many nodes
- Complex layout
- Insufficient GPU

**Solutions**:

1. **Use Overview level**:
   - Fewer nodes = faster rendering

2. **Reduce max files**:
   - Fewer files = fewer nodes

3. **Close other IDE panels**:
   - Free up rendering resources

### High Memory Usage

**Symptoms**: Kiro IDE using excessive memory

**Possible Causes**:
- Large diagram in memory
- Multiple diagrams open
- Memory leak

**Solutions**:

1. **Close diagram panel**:
   - Releases memory within 2 seconds

2. **Close other diagrams**:
   - Only keep one diagram open

3. **Reduce max files**:
   ```json
   "archview.maxFiles": 500
   ```

4. **Restart Kiro IDE**:
   - Clears all memory

### Laggy Interactions

**Symptoms**: Slow pan, zoom, or selection

**Possible Causes**:
- Too many nodes
- Insufficient GPU
- Other resource-intensive processes

**Solutions**:

1. **Switch to Overview**:
   - Fewer nodes = better performance

2. **Close other applications**:
   - Free up GPU resources

3. **Reduce diagram complexity**:
   - Exclude more files
   - Use simpler layout

---

## File Highlighting Issues

### Files Not Highlighting

**Symptoms**: Clicking diagram element doesn't highlight files

**Possible Causes**:
- Files moved or deleted
- File paths changed
- IDE integration issue

**Solutions**:

1. **Refresh diagram**:
   - Command: "ArchView: Refresh Diagram"
   - Updates file paths

2. **Check files exist**:
   - Verify files still at original paths
   - Check for renamed/moved files

3. **Check workspace**:
   - Ensure files within workspace
   - Reopen workspace if needed

4. **Reload window**:
   - Command: "Developer: Reload Window"

### Wrong Files Highlighting

**Symptoms**: Incorrect files highlight for selected component

**Possible Causes**:
- Stale analysis data
- File mapping error

**Solutions**:

1. **Refresh diagram**:
   - Regenerates file mappings

2. **Clear cache**:
   - Close diagram
   - Regenerate from scratch

### Highlights Not Clearing

**Symptoms**: Previous highlights remain after new selection

**Possible Causes**:
- State management issue
- Extension bug

**Solutions**:

1. **Click background**:
   - Deselects and clears highlights

2. **Close and reopen diagram**:
   - Resets state

3. **Reload window**:
   - Full state reset

---

## Export Issues

### Export Fails

**Symptoms**: Export command fails or produces error

**Possible Causes**:
- Insufficient disk space
- File permissions
- Rendering issue

**Solutions**:

1. **Check disk space**:
   - Ensure sufficient space for export

2. **Check write permissions**:
   - Verify can write to target directory

3. **Try different format**:
   - If PNG fails, try SVG
   - If SVG fails, try PNG

4. **Try different location**:
   - Export to different directory

### Export Quality Issues

**Symptoms**: Exported image low quality or incorrect

**Possible Causes**:
- Resolution settings
- Format limitations
- Rendering issues

**Solutions**:

1. **Use SVG for quality**:
   - SVG is scalable
   - Better for documentation

2. **Use PNG for compatibility**:
   - PNG works everywhere
   - Minimum 1920x1080

3. **Adjust zoom before export**:
   - Fit to view first
   - Then export

### Export Takes Too Long

**Symptoms**: Export hangs or takes >5 seconds

**Possible Causes**:
- Large diagram
- High resolution
- System resources

**Solutions**:

1. **Switch to Overview**:
   - Fewer nodes = faster export

2. **Close other applications**:
   - Free up resources

3. **Try SVG instead of PNG**:
   - SVG export faster

---

## AI Integration Issues

### AI Features Not Working

**Symptoms**: Basic analysis only, no semantic grouping

**Possible Causes**:
- AI disabled in settings
- Kiro AI service unavailable
- Network issues

**Solutions**:

1. **Check AI enabled**:
   ```json
   "archview.aiEnabled": true
   ```

2. **Check Kiro AI service**:
   - Verify Kiro AI is available
   - Check network connectivity

3. **Check Output panel**:
   - Look for AI-related errors
   - Check for service messages

4. **Fallback mode**:
   - Extension uses basic analysis
   - Still produces diagram

### Poor AI Grouping

**Symptoms**: Components grouped incorrectly

**Possible Causes**:
- Ambiguous code structure
- Insufficient context
- AI interpretation limitations

**Solutions**:

1. **Refresh diagram**:
   - AI may produce different results

2. **Improve code structure**:
   - Better organization helps AI
   - Clear module boundaries

3. **Use manual grouping**:
   - Disable AI
   - Use directory-based grouping

4. **Provide feedback**:
   - Report issues on GitHub
   - Help improve AI prompts

---

## Configuration Issues

### Settings Not Applying

**Symptoms**: Changed settings have no effect

**Possible Causes**:
- Settings not saved
- Wrong settings scope
- Syntax errors

**Solutions**:

1. **Verify settings saved**:
   - Check settings.json
   - Ensure no syntax errors

2. **Check settings scope**:
   - User vs Workspace settings
   - Workspace overrides User

3. **Reload window**:
   - Command: "Developer: Reload Window"

4. **Regenerate diagram**:
   - Settings apply on new analysis

### Invalid Configuration

**Symptoms**: Error about invalid configuration

**Possible Causes**:
- Invalid JSON syntax
- Invalid values
- Type mismatches

**Solutions**:

1. **Check JSON syntax**:
   - Look for missing commas, brackets
   - Use JSON validator

2. **Check value types**:
   - Numbers should be numbers
   - Booleans should be true/false
   - Arrays should be arrays

3. **Check value ranges**:
   - maxFiles: 1-10,000
   - maxDepth: 1-50
   - debounce: 1,000-60,000

4. **Reset to defaults**:
   - Remove custom settings
   - Use default values

---

## Getting More Help

### Check Logs

1. **Output Panel**:
   - View → Output
   - Select "ArchView" from dropdown
   - Check for errors and warnings

2. **Developer Tools**:
   - Help → Toggle Developer Tools
   - Check Console tab
   - Look for errors

### Report Issues

If you can't resolve the issue:

1. **Gather information**:
   - Error messages
   - Steps to reproduce
   - System information
   - Extension version

2. **Check existing issues**:
   - [GitHub Issues](https://github.com/kiro/archview/issues)
   - Search for similar problems

3. **Create new issue**:
   - Provide detailed description
   - Include error logs
   - Attach screenshots if helpful

### Community Support

- GitHub Discussions
- Kiro IDE Community Forums
- Stack Overflow (tag: archview)

---

## Diagnostic Checklist

Use this checklist when troubleshooting:

- [ ] Extension installed and enabled
- [ ] Kiro IDE version compatible (^1.0.0)
- [ ] Project contains supported files
- [ ] Include patterns configured correctly
- [ ] Exclude patterns not too restrictive
- [ ] Sufficient disk space
- [ ] Sufficient memory
- [ ] No file permission issues
- [ ] Settings JSON valid
- [ ] Checked Output panel for errors
- [ ] Tried reloading window
- [ ] Tried regenerating diagram
- [ ] Checked GitHub issues

---

Still having issues? [Open an issue on GitHub](https://github.com/kiro/archview/issues/new)
