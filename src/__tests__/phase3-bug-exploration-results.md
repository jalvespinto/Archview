# Phase 3 Bug Condition Exploration Test Results

**Test Date**: Phase 3 Exploration Tests (corrected)
**Purpose**: Verify bugs exist on UNFIXED code by running tests that should FAIL
**Expected Outcome**: Tests FAIL (proving bugs exist)
**Actual Outcome**: 18 FAILED, 1 PASSED — all 7 bugs correctly detected

## Summary

- **Total Tests**: 19
- **Failed**: 18 (bugs confirmed present)
- **Passed**: 1 (package.json config schema — intentionally passes, tests a prerequisite)

## Methodology

Tests read source files and use a **comment-stripping state machine** before checking
for code patterns. This prevents false positives from TODO comments like
`// In production: vscode.workspace.getConfiguration('archview')` being mistakenly
treated as real implementation code. Method bodies are extracted using brace-counting
to handle arbitrarily nested code blocks.

## Test Results by Issue

### Issue 1.8: FileWatcher setupWatchers() — EMPTY IMPLEMENTATION
**Status**: 2/2 tests FAIL (bug confirmed)

| Test | Result | Finding |
|------|--------|---------|
| setupWatchers() has actual implementation | FAIL | After stripping comments, method body is empty — no `createFileSystemWatcher` calls |
| FileWatcher creates actual watchers | FAIL | Method body is blank after comment removal — zero executable lines |

**Bug Condition**: `setupWatchers()` at lines 127–140 of `FileWatcher.ts` contains only
placeholder comments. The method does nothing, so `start()` sets `isWatching = true` but
creates no actual file system watchers.

---

### Issue 1.9: State Persistence — STUB IMPLEMENTATION
**Status**: 3/3 tests FAIL (bug confirmed)

| Test | Result | Finding |
|------|--------|---------|
| loadState() calls globalState.get | FAIL | Only the TODO comment mentions `globalState.get`; actual code does `const savedState = undefined as ...` |
| loadState() does not hardcode undefined | FAIL | Code explicitly sets `savedState = undefined` |
| saveState() calls globalState.update | FAIL | Only the TODO comment mentions `globalState.update`; actual code just logs `'State saved'` |

**Bug Condition**: `loadState()` (lines 779–793) always assigns `undefined` to `savedState`.
`saveState()` (lines 799–809) calls `console.log('State saved')` without persisting anything.

---

### Issue 1.10: getWorkspaceRoot() — RETURNS WRONG DIRECTORY
**Status**: 2/2 tests FAIL (bug confirmed)

| Test | Result | Finding |
|------|--------|---------|
| Uses vscode.workspace.workspaceFolders | FAIL | Only in a TODO comment; stripped code has no `workspaceFolders` reference |
| Does not simply return process.cwd() | FAIL | Sole return statement is `return process.cwd()` |

**Bug Condition**: `getWorkspaceRoot()` (lines 666–670) returns `process.cwd()` which is the
VS Code/Node process working directory, not the user's open workspace folder.

---

### Issue 1.11: getAnalysisConfig() — HARDCODED DEFAULTS
**Status**: 2/3 tests FAIL + 1 PASS (bug confirmed)

| Test | Result | Finding |
|------|--------|---------|
| Reads from VS Code configuration API | FAIL | `getConfiguration` exists only in TODO comment |
| registerConfigurationListener() registers listener | FAIL | `onDidChangeConfiguration` exists only in TODO comment |
| package.json has configuration schema | PASS (expected) | Schema with `archview.maxFiles`, `archview.includePatterns`, etc. already exists |

**Bug Condition**: `getAnalysisConfig()` (lines 692–730) returns a hardcoded object literal.
`registerConfigurationListener()` (lines 236–244) just logs a message. User settings are
completely ignored despite `package.json` defining a full configuration schema.

---

### Issue 1.12: releaseMemory() — ARTIFICIAL 2-SECOND DELAY
**Status**: 3/3 tests FAIL (bug confirmed)

| Test | Result | Finding |
|------|--------|---------|
| Does not use setInterval polling loop | FAIL | Method contains `setInterval` at line 186 |
| Does not wait for RELEASE_TIMEOUT_MS | FAIL | Method references `this.RELEASE_TIMEOUT_MS` (2000ms) |
| Completes quickly (< 500ms) at runtime | FAIL | Took ~2005ms due to artificial polling delay |

**Bug Condition**: `releaseMemory()` (lines 175–195) executes cleanup immediately, then creates
a `setInterval` polling loop checking every 100ms until 2 seconds have elapsed. The cleanup is
already done — the 2-second wait is entirely artificial.

**Code**:
```typescript
return new Promise((resolve) => {
  const checkInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    if (elapsed >= this.RELEASE_TIMEOUT_MS) {  // RELEASE_TIMEOUT_MS = 2000
      clearInterval(checkInterval);
      resolve();
    }
  }, 100);
});
```

---

### Issue 1.13: Message Handler Memory Leak
**Status**: 3/3 tests FAIL (bug confirmed)

| Test | Result | Finding |
|------|--------|---------|
| setupMessageHandling() disposes old handlers | FAIL | No `.dispose()` call before re-registering |
| onMessage() returns a disposable | FAIL | Returns void; no way to unregister handlers |
| WebviewManager has public dispose() | FAIL | Only `disposeWebview()` exists, not `dispose()` |

**Bug Condition**: `setupMessageHandling()` (lines 145–158) adds a new `onDidReceiveMessage`
listener every time it's called without disposing the previous one. `onMessage()` (lines 72–75)
adds handlers to a Map but provides no mechanism to remove them. No public `dispose()` method
follows the VS Code `Disposable` pattern.

---

### Issue 1.14: Glob Pattern Security — Custom Implementation
**Status**: 3/3 tests FAIL (bug confirmed)

| Test | Result | Finding |
|------|--------|---------|
| Uses minimatch or picomatch library | FAIL | No glob library imported |
| Does not use custom regex construction | FAIL | Uses `new RegExp(regexPattern)` from user-supplied pattern |
| Handles ReDoS-prone patterns safely | FAIL | No timeout, no try-catch, no safeguard |

**Bug Condition**: `matchGlobPattern()` (lines 320–353 of `FileScanner.ts`) converts user-supplied
glob patterns to regex via string replacement, then calls `new RegExp(regexPattern)`. This is
vulnerable to ReDoS with crafted patterns and has edge-case mismatches compared to standard
glob libraries.

---

## Conclusions

All 7 Phase 3 issues are confirmed present in the unfixed code:

| # | Issue | Severity | Tests |
|---|-------|----------|-------|
| 1.8 | FileWatcher empty setupWatchers() | Medium | 2 FAIL |
| 1.9 | State persistence stubs | Medium | 3 FAIL |
| 1.10 | Wrong workspace root (process.cwd) | Medium | 2 FAIL |
| 1.11 | Hardcoded config defaults | Medium | 2 FAIL + 1 PASS |
| 1.12 | Artificial 2s delay in releaseMemory | Medium | 3 FAIL |
| 1.13 | Message handler memory leak | Medium | 3 FAIL |
| 1.14 | Custom glob regex (ReDoS risk) | Medium | 3 FAIL |

### Previous Test Version Issue

The original test implementation used naive `string.includes()` on raw source files,
which matched TODO comments and produced **13 false positives** out of 15 tests. The
corrected tests use a state-machine comment stripper and brace-counting method extraction
to ensure only executable code is analyzed.

## Test Execution Details

```
Test Suites: 1 failed, 1 total
Tests:       18 failed, 1 passed, 19 total
Time:        ~3s
```

All failures are expected — they confirm bugs exist and will serve as verification
that fixes are correct when they pass after implementation.
