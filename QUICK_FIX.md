# Quick Fix: Use Debug Mode

The symlinked extension might not be activating properly. The most reliable way to test is using **Debug Mode**.

## ✅ Recommended Solution: Debug Mode (F5)

This is actually the best way to develop and test extensions:

### Step 1: Make Sure You're in the Archview Project

```bash
cd /home/jap/projects/Archview
kiro .
```

### Step 2: Start Debugging

1. In Kiro IDE, press **F5** (or Run > Start Debugging)
2. A new window opens called **"Extension Development Host"**
3. The extension is automatically loaded in this window

### Step 3: Open This Project in the Debug Window

In the Extension Development Host window:
1. File > Open Folder
2. Select `/home/jap/projects/Archview`

### Step 4: Generate Diagram

1. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Type: `ArchView: Generate Diagram`
3. Press Enter
4. Wait for the diagram!

## Why This Works Better

- Extension is guaranteed to load
- You can see console output in Debug Console
- You can set breakpoints
- Better error messages
- No installation issues

## What You Should See

In the Debug Console (bottom panel), you should see:
```
ArchView extension activating...
ArchView extension activated successfully
```

If you see errors instead, we can fix them!

## Alternative: Check Why Symlink Isn't Working

If you want to debug the symlink issue:

1. Open Developer Tools: **Help > Toggle Developer Tools**
2. Go to **Console** tab
3. Look for errors mentioning "ArchView" or "archview"
4. Common issues:
   - Module not found errors
   - Activation errors
   - Missing dependencies

## Most Common Issue: Missing node_modules

The symlink might not include node_modules. Check:

```bash
ls -la ~/.kiro/extensions/kiro.archview/node_modules/
```

If it shows "No such file or directory", that's the problem. The extension needs its dependencies.

**Solution:** Use debug mode (F5) instead, which handles this automatically.

## Try This Now

1. Close any open Kiro windows
2. Open terminal:
   ```bash
   cd /home/jap/projects/Archview
   kiro .
   ```
3. Press **F5**
4. In Extension Development Host, open this project
5. Try: `ArchView: Generate Diagram`

This should work! Let me know what happens. 🚀
