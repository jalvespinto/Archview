# 🧪 Test Command Registration

I've added a simple test command and more logging to debug the issue.

## 🚀 Steps to Test

### Step 1: Reload Kiro
```bash
# Close Kiro completely
pkill kiro

# Reopen
kiro /home/jap/projects/Archview
```

### Step 2: Check Activation Logs

Open **Help > Toggle Developer Tools** and go to the **Console** tab.

You should see:
```
ArchView extension activating...
=== registerCommands called ===
Commands registered successfully
Try running: archview.test
ArchView extension activated successfully
```

### Step 3: Test the Simple Command

1. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Type: `archview.test`
3. Press Enter

**Expected result:**
- A popup message: "ArchView test command works!"
- Console log: "=== TEST COMMAND WORKS ==="

### Step 4: If Test Works, Try Generate Diagram

1. Press `Cmd+Shift+P` / `Ctrl+Shift+P`
2. Type: `ArchView: Generate Diagram`
3. Press Enter

**Expected result:**
- A popup message: "Generate Diagram command triggered!"
- Console log: "=== archview.generateDiagram command triggered ==="
- Then the actual diagram generation starts

## 🐛 Troubleshooting

### If you don't see the test command in the palette:

The extension isn't loading. Check Developer Console for errors.

### If the test command appears but nothing happens when you run it:

There's an issue with command execution. Check for JavaScript errors in Developer Console.

### If test works but Generate Diagram doesn't:

The command registration is working, but there's an issue with the generateDiagram method itself.

## 📋 What to Check

In **Developer Tools > Console**, look for:

1. **Activation logs** - Did the extension activate?
2. **Registration logs** - Were commands registered?
3. **Execution logs** - When you run a command, does it trigger?
4. **Error messages** - Any red errors?

## Alternative: Use F5 Debug Mode

If symlink still has issues, use debug mode:

1. In this project, press **F5**
2. Extension Development Host opens
3. In that window, open this project
4. Try the commands

Debug mode is more reliable for development.

Let me know what happens with the test command! 🔍
