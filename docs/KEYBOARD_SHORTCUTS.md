# ArchView Keyboard Shortcuts

Quick reference for all keyboard shortcuts and interactions in ArchView.

## Command Palette Commands

Access via Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

| Command | Description |
|---------|-------------|
| `ArchView: Generate Diagram` | Analyze codebase and create new diagram |
| `ArchView: Refresh Diagram` | Regenerate diagram with latest code changes |
| `ArchView: Export Diagram` | Export current diagram as PNG or SVG |

## Diagram Navigation

### Mouse Controls

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Pan** | Click + Drag background | Move around the diagram |
| **Zoom In** | Mouse wheel up | Zoom into the diagram |
| **Zoom Out** | Mouse wheel down | Zoom out of the diagram |
| **Select Element** | Click node | Select a component and highlight its files |
| **Deselect** | Click background | Clear selection and file highlights |
| **Hover Info** | Hover over node | Show component tooltip with details |

### Trackpad Gestures

| Action | Gesture | Description |
|--------|---------|-------------|
| **Pan** | Two-finger drag | Move around the diagram |
| **Zoom In** | Pinch out | Zoom into the diagram |
| **Zoom Out** | Pinch in | Zoom out of the diagram |

### Toolbar Controls

| Control | Action | Description |
|---------|--------|-------------|
| **Fit to View** | Click button | Reset zoom and pan to show entire diagram |
| **Abstraction Level** | Select dropdown | Switch between Overview/Module/Detailed |
| **Export** | Click button | Open export dialog |
| **Refresh** | Click button | Regenerate diagram |

## File Explorer Integration

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Open File** | Click highlighted file | Open file in editor |
| **View in Explorer** | Right-click file | Show file context menu |

## Diagram View Shortcuts

While the diagram panel is focused:

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Cmd/Ctrl + F` | Find | Search for components (if available) |
| `Cmd/Ctrl + +` | Zoom In | Alternative zoom in |
| `Cmd/Ctrl + -` | Zoom Out | Alternative zoom out |
| `Cmd/Ctrl + 0` | Reset Zoom | Fit diagram to view |
| `Escape` | Deselect | Clear current selection |

## Abstraction Level Shortcuts

Quick switching between abstraction levels:

| Shortcut | Level | Description |
|----------|-------|-------------|
| `Cmd/Ctrl + 1` | Overview | Show top-level components only |
| `Cmd/Ctrl + 2` | Module | Show module-level detail |
| `Cmd/Ctrl + 3` | Detailed | Show all details (classes/functions) |

*Note: These shortcuts may need to be configured in Kiro IDE keybindings*

## Export Shortcuts

When export dialog is open:

| Shortcut | Action | Description |
|----------|--------|-------------|
| `P` | PNG | Select PNG format |
| `S` | SVG | Select SVG format |
| `Enter` | Confirm | Confirm export with selected format |
| `Escape` | Cancel | Close export dialog |

## Tips for Efficient Navigation

### Quick Exploration Workflow

1. **Generate diagram**: `Cmd+Shift+P` → "Generate Diagram"
2. **Fit to view**: Click "Fit to View" button
3. **Select component**: Click any node
4. **View files**: Files auto-highlight in explorer
5. **Open file**: Click highlighted file
6. **Return to diagram**: Click diagram panel

### Zoom and Focus Workflow

1. **Start at Overview**: `Cmd+1` (or select Overview)
2. **Find area of interest**: Pan and zoom with mouse
3. **Switch to Detailed**: `Cmd+3` (or select Detailed)
4. **Explore details**: Click components to see files
5. **Reset view**: `Cmd+0` or "Fit to View"

### Multi-Component Exploration

1. **Select first component**: Click node
2. **View its files**: Check highlighted files
3. **Select next component**: Click another node
4. **Compare files**: Previous highlights clear automatically
5. **Deselect**: Click background or press `Escape`

## Customizing Shortcuts

To customize keyboard shortcuts in Kiro IDE:

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type: "Preferences: Open Keyboard Shortcuts"
3. Search for "ArchView"
4. Click the pencil icon next to any command
5. Press your desired key combination
6. Press Enter to save

### Recommended Custom Shortcuts

```json
{
  "key": "cmd+shift+a",
  "command": "archview.generateDiagram",
  "when": "editorTextFocus"
},
{
  "key": "cmd+shift+r",
  "command": "archview.refreshDiagram",
  "when": "archview.diagramVisible"
},
{
  "key": "cmd+shift+e",
  "command": "archview.exportDiagram",
  "when": "archview.diagramVisible"
}
```

## Accessibility

### Keyboard-Only Navigation

ArchView supports keyboard-only navigation:

1. **Tab** - Move focus between diagram elements
2. **Enter** - Select focused element
3. **Arrow Keys** - Navigate between elements
4. **Escape** - Deselect and return to diagram
5. **Tab** - Move to toolbar controls

### Screen Reader Support

- Component names announced on focus
- File counts announced on selection
- Relationship descriptions available
- Toolbar controls properly labeled

## Platform-Specific Notes

### macOS
- Use `Cmd` for all shortcuts
- Trackpad gestures fully supported
- Magic Mouse scroll gestures supported

### Windows/Linux
- Use `Ctrl` for all shortcuts
- Mouse wheel zoom supported
- Touchpad gestures may vary by device

### Touch Devices
- Tap to select
- Pinch to zoom
- Two-finger drag to pan
- Long press for context menu

## Quick Reference Card

Print this for easy reference:

```
┌─────────────────────────────────────────────────┐
│         ArchView Keyboard Shortcuts             │
├─────────────────────────────────────────────────┤
│ Generate Diagram    Cmd+Shift+P → Generate     │
│ Refresh Diagram     Cmd+Shift+P → Refresh      │
│ Export Diagram      Cmd+Shift+P → Export       │
├─────────────────────────────────────────────────┤
│ Pan                 Click + Drag                │
│ Zoom In/Out         Mouse Wheel                 │
│ Select Element      Click Node                  │
│ Deselect            Click Background / Esc      │
│ Fit to View         Toolbar Button / Cmd+0     │
├─────────────────────────────────────────────────┤
│ Overview Level      Cmd+1                       │
│ Module Level        Cmd+2                       │
│ Detailed Level      Cmd+3                       │
├─────────────────────────────────────────────────┤
│ Find                Cmd+F                       │
│ Zoom In             Cmd++                       │
│ Zoom Out            Cmd+-                       │
└─────────────────────────────────────────────────┘
```

## Troubleshooting Shortcuts

### Shortcut Not Working

1. Check if diagram panel has focus
2. Verify shortcut not conflicting with other extensions
3. Check Kiro IDE keyboard shortcuts settings
4. Try clicking diagram panel first

### Custom Shortcuts Not Saving

1. Ensure keybindings.json is writable
2. Check for JSON syntax errors
3. Restart Kiro IDE
4. Verify "when" clauses are correct

---

For more help, see:
- [Quick Start Guide](QUICK_START.md)
- [Configuration Guide](CONFIGURATION.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
