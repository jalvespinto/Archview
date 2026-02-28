# ArchView Extension - Webview Display Issue

## Summary

The ArchView extension successfully analyzes codebases and generates architecture diagrams, but the diagram is not being displayed to the user because the WebviewManager is using mock implementations instead of the real Kiro webview API.

## Current Status

### ✅ What's Working

1. **Extension Activation**: Extension loads and activates successfully
2. **Command Registration**: All commands (`archview.generateDiagram`, `archview.refreshDiagram`, `archview.exportDiagram`) are properly registered
3. **File Scanning**: Successfully scans and filters files based on patterns
4. **Multi-language Parsing**: Tree-sitter parsers work correctly for TypeScript, Python, JavaScript, Java, and Go
5. **Component Extraction**: Extracts components (modules, classes, functions) from source code
6. **Relationship Detection**: Identifies dependencies, imports, and inheritance relationships
7. **Grounding Layer**: Builds compact structured representation of codebase
8. **AI Integration**: Falls back to heuristic model when Kiro AI API is unavailable
9. **Diagram Generation**: Creates diagram data structure with nodes and edges
10. **All Tests Pass**: 378 tests passing, including 29 property-based correctness tests

### ❌ What's Not Working

**The webview is not being displayed.** When the diagram is generated, instead of showing a visual panel with the interactive diagram, nothing appears to the user.

## Evidence from Logs

When running `ArchView: Generate Diagram`, the console shows:

```
[Extension Host] === archview.generateDiagram command triggered ===
[Extension Host] === generateDiagram called ===
[Extension Host] Getting workspace root...
[Extension Host] Workspace root: /home/jap/projects/menu-planning/backend
[Extension Host] Generating architecture diagram...
[Extension Host] Phase 1: Building grounding layer...
[Extension Host] Progress: 100% - Analysis complete
[Extension Host] Grounding layer built, files: 979
[Extension Host] Phase 2: Interpreting with AI...
[Extension Host] Architectural model created, components: 2
[Extension Host] Phase 3: Generating diagram...
[Extension Host] Diagram data generated, nodes: 2
[Extension Host] Phase 4: Creating webview...
[Extension Host] Mock postMessage: {type: 'initialize', data: {…}}  ⚠️ THIS IS THE PROBLEM
[Extension Host] === Diagram generated successfully ===
```

The key line is:
```
Mock postMessage: {type: 'initialize', data: {…}}
```

This indicates the WebviewManager is using a mock implementation instead of creating a real webview.

## Root Cause

The `WebviewManager` class (located in `src/ui/WebviewManager.ts`) is using placeholder/mock implementations for webview operations instead of the actual Kiro webview API.

### Current Implementation (Mock)

```typescript
// src/ui/WebviewManager.ts
export class WebviewManager {
  createWebview(): void {
    // TODO: Implement actual webview creation
    console.log('Mock: createWebview called');
  }

  postMessage(message: WebviewMessage): void {
    // TODO: Implement actual message posting
    console.log('Mock postMessage:', message);
  }

  updateDiagram(data: DiagramData): void {
    // TODO: Implement actual diagram update
    console.log('Mock: updateDiagram called');
  }
}
```

### Required Implementation (Real Kiro API)

```typescript
// What it should be:
import * as vscode from 'vscode';

export class WebviewManager {
  private panel: vscode.WebviewPanel | null = null;

  createWebview(): void {
    this.panel = vscode.window.createWebviewPanel(
      'archview',
      'Architecture Diagram',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    // Load HTML content
    this.panel.webview.html = this.getWebviewContent();
  }

  postMessage(message: WebviewMessage): void {
    if (this.panel) {
      this.panel.webview.postMessage(message);
    }
  }

  updateDiagram(data: DiagramData): void {
    this.postMessage({
      type: 'initialize',
      data: data
    });
  }

  private getWebviewContent(): string {
    // Load from src/ui/webview/index.html
    // Include Cytoscape.js library
    // Include diagram rendering code
    return `<!DOCTYPE html>...`;
  }
}
```

## Impact

**User Experience**: Users can run the command, see progress in the console, but never see the actual diagram. From their perspective, the command completes but nothing happens.

**Functionality**: The core analysis and diagram generation work perfectly. Only the final display step is missing.

## Files Involved

1. **`src/ui/WebviewManager.ts`** - Main file that needs implementation
2. **`src/ui/webview/index.html`** - Webview HTML template (exists but not loaded)
3. **`src/ui/webview/webview.js`** - Webview JavaScript for Cytoscape.js (exists but not loaded)
4. **`src/ui/webview/styles.css`** - Webview styles (exists but not loaded)
5. **`src/ExtensionController.ts`** - Calls WebviewManager (working correctly)

## What Needs to Be Done

### 1. Implement Real Webview Creation

Replace mock methods in `WebviewManager` with actual Kiro/VS Code webview API calls:

- `createWebview()` - Create actual webview panel
- `postMessage()` - Send messages to webview
- `updateDiagram()` - Update diagram data
- `disposeWebview()` - Clean up resources

### 2. Load Webview Content

The webview HTML/CSS/JS files exist in `src/ui/webview/` but are not being loaded:

- Load `index.html` as webview content
- Include Cytoscape.js library (from node_modules or CDN)
- Include `webview.js` for diagram rendering
- Include `styles.css` for styling

### 3. Set Up Message Passing

Implement bidirectional communication:

- Extension → Webview: Send diagram data
- Webview → Extension: Handle user interactions (clicks, exports, etc.)

### 4. Handle Webview Lifecycle

- Create webview when diagram is generated
- Reuse existing webview if already open
- Dispose properly when closed
- Handle webview state preservation

## Testing the Fix

Once implemented, the user should:

1. Run command: `ArchView: Generate Diagram`
2. See a new panel open with the title "Architecture Diagram"
3. See an interactive diagram with nodes and edges
4. Be able to click nodes, zoom, pan, and export

## Workaround

Currently, there is no workaround. The diagram data is generated correctly but cannot be viewed without the webview implementation.

## Additional Context

### Why This Happened

The extension was developed with comprehensive tests for the analysis and diagram generation logic, but the webview integration was left as TODO/mock implementations. All the hard parts (parsing, analysis, AI integration, diagram generation) work perfectly - only the display layer needs completion.

### Estimated Effort

**Low to Medium** - The webview API is straightforward, and all the content files already exist. Main tasks:

1. Replace mock methods with real API calls (~30 minutes)
2. Load HTML/CSS/JS content into webview (~20 minutes)
3. Set up message passing (~20 minutes)
4. Test and debug (~30 minutes)

**Total: ~2 hours**

### Dependencies

- Kiro IDE webview API (same as VS Code webview API)
- Cytoscape.js library (already in node_modules)
- Existing webview HTML/CSS/JS files (already created)

## References

- **VS Code Webview API**: https://code.visualstudio.com/api/extension-guides/webview
- **Kiro IDE**: Compatible with VS Code extension API
- **Cytoscape.js**: https://js.cytoscape.org/

## Contact

For questions about this issue, refer to:
- Design document: `.kiro/specs/ai-architecture-diagram-extension/design.md`
- Implementation tasks: `.kiro/specs/ai-architecture-diagram-extension/tasks.md`
- WebviewManager source: `src/ui/WebviewManager.ts`

---

**Status**: Ready for implementation
**Priority**: High (blocks user-facing functionality)
**Complexity**: Low (straightforward API integration)
