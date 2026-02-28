# ✅ Fix Applied

## The Problem

Kiro IDE (being VS Code compatible) requires the `engines.vscode` property in package.json. We only had `engines.kiro`, which caused the error:

```
property engines.vscode is mandatory and must be of type string
```

## The Solution

I've added the `engines.vscode` property to package.json:

```json
"engines": {
  "vscode": "^1.80.0",
  "kiro": "^1.0.0",
  "node": ">=18.0.0"
}
```

## Next Steps

1. **Reload Kiro IDE** to pick up the change:
   - Press `Cmd+R` (Mac) or `Ctrl+R` (Linux/Windows)
   - Or close and reopen Kiro IDE

2. **Verify the extension loads**:
   ```bash
   kiro --list-extensions
   # Should show: kiro.archview (without error)
   ```

3. **Test the extension**:
   - Press `Cmd+Shift+P` / `Ctrl+Shift+P`
   - Type: `ArchView: Generate Diagram`
   - Press Enter

The extension should now work correctly! 🎉

## Why This Happened

Kiro IDE is built on VS Code's extension API, so it expects VS Code-compatible package.json properties. Even though we're targeting Kiro, we need to include the `vscode` engine version for compatibility.

This is common when developing extensions for VS Code-based editors - they maintain backward compatibility with VS Code's extension format.
