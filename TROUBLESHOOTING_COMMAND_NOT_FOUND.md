# Troubleshooting: Command Not Found

## The Error

```
command "archview.generateDiagram" not found
```

This means the extension isn't activating properly. Let's debug this step by step.

## Step 1: Check Extension is Installed

```bash
kiro --list-extensions
```

Should show: `kiro.archview`

If not, reinstall:
```bash
rm ~/.kiro/extensions/kiro.archview
ln -s /home/jap/projects/Archview ~/.kiro/extensions/kiro.archview
```

## Step 2: Check Extension is Compiled

```bash
ls -la dist/extension.js
```

Should show the compiled extension file. If not:
```bash
npm run compile
```

## Step 3: Check for Activation Errors

In Kiro IDE:
1. Open **View > Output**
2. Select **"ArchView"** from the dropdown (if available)
3. Look for error messages

Or check the Developer Console:
1. **Help > Toggle Developer Tools**
2. Go to **Console** tab
3. Look for errors related to "ArchView" or "archview"

## Step 4: Check Extension Host Log

In Kiro IDE:
1. **Help > Toggle Developer Tools**
2. Go to **Console** tab
3. Filter for "ArchView" or "extension"
4. Look for activation errors

Common errors:
- Module not found
- Syntax errors
- Missing dependencies

## Step 5: Verify package.json

Check that package.json has:

```json
{
  "name": "archview",
  "main": "./dist/extension.js",
  "engines": {
    "vscode": "^1.80.0"
  },
  "activationEvents": [
    "onCommand:archview.generateDiagram",
    "onCommand:archview.refreshDiagram",
    "onCommand:archview.exportDiagram"
  ]
}
```

## Step 6: Try Manual Activation

Sometimes extensions need to be activated manually first. Try:

1. Open Developer Tools: **Help > Toggle Developer Tools**
2. In Console, type:
   ```javascript
   vscode.extensions.getExtension('kiro.archview')
   ```
3. Check if it returns an extension object or undefined

## Step 7: Check for Missing Dependencies

The extension needs these runtime dependencies:
- tree-sitter
- cytoscape
- cytoscape-dagre

Verify they're installed:
```bash
ls node_modules/ | grep -E "tree-sitter|cytoscape"
```

Should show:
- cytoscape
- cytoscape-dagre
- tree-sitter
- tree-sitter-* (language parsers)

If missing:
```bash
npm install
```

## Step 8: Restart Kiro Completely

Sometimes a full restart is needed:
```bash
# Close all Kiro windows
pkill kiro

# Reopen
kiro /home/jap/projects/Archview
```

## Step 9: Check Extension Activation Events

The extension should activate when you run the command. Check if activation events are correct in package.json:

```json
"activationEvents": [
  "onCommand:archview.generateDiagram",
  "onCommand:archview.refreshDiagram",
  "onCommand:archview.exportDiagram"
]
```

## Step 10: Try Debug Mode Instead

If the installed extension isn't working, try debug mode:

1. Open this project in Kiro IDE
2. Press **F5** (Start Debugging)
3. In the Extension Development Host window that opens
4. Open this same project (File > Open Folder)
5. Try the command again

Debug mode often provides better error messages.

## Quick Fix: Use Debug Mode

The most reliable way to test:

```bash
# In the Archview project directory
npm run compile

# Open in Kiro
kiro .

# Press F5 to start debugging
# Extension Development Host opens
# In that window, open this project again
# Try: ArchView: Generate Diagram
```

## Common Issues

### Issue: "Cannot find module 'tree-sitter'"

**Solution:**
```bash
npm install
npm run compile
```

### Issue: Extension not in list

**Solution:**
```bash
# Recreate symlink
rm ~/.kiro/extensions/kiro.archview
ln -s $(pwd) ~/.kiro/extensions/kiro.archview

# Restart Kiro
```

### Issue: "Extension failed to activate"

**Solution:**
Check Developer Console for the actual error, then:
```bash
npm run compile
# Restart Kiro
```

## What to Check in Developer Console

Look for these messages:
- ✅ "ArchView extension activating..."
- ✅ "ArchView extension activated successfully"
- ❌ Any error messages
- ❌ "Extension host terminated unexpectedly"

## Next Steps

1. Try the steps above in order
2. Check Developer Console for specific errors
3. If still not working, use Debug Mode (F5)
4. Share any error messages you see

## Alternative: Package as VSIX

If symlink isn't working, try packaging:

```bash
# Install vsce if not already installed
npm install -g @vscode/vsce

# Temporarily add vscode engine (already done)
# Package
vsce package --allow-star-activation

# Install
kiro --install-extension archview-0.1.0.vsix
```

Let me know what you see in the Developer Console and we'll fix it! 🔧
