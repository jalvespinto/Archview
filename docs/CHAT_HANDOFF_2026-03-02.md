# Archview Handoff Context (2026-03-02)

## Current objective
Continue structured remediation plan implementation for Archview with strict validation after each batch.

## What has been completed

### Phase 1 infrastructure stabilization
1. ESLint project alignment:
   1. `.eslintrc.json` updated to include `tsconfig.eslint.json`.
   2. `tsconfig.eslint.json` added.
2. Jest cleanup:
   1. `jest.config.js` now ignores `dist` and scopes roots to `src`.
   2. `forceExit` removed.
3. Lint signal focus:
   1. `package.json` lint scripts now ignore tests/spike/mocks paths.
4. Timeout leak fix:
   1. `src/diagram/DiagramGenerator.ts` `withTimeout()` now clears timeout in `finally`.

### Phase 2 P0 behavioral fixes
1. Webview message handler accumulation fix:
   1. `src/ExtensionController.ts` now tracks/disposes `webviewMessageSubscription`.
2. Incremental cache invalidation with absolute watcher paths:
   1. `src/analysis/AnalysisService.ts` `clearCacheForFile()` handles absolute and relative matches.
3. FileWatcher glob/path correctness:
   1. `src/analysis/FileWatcher.ts` now stores `workspaceRoot`.
   2. Matching now handles workspace-relative patterns against absolute changed paths.
4. Export input hardening:
   1. `src/ExtensionController.ts` validates and normalizes export format (`png|svg`) at runtime.
   2. Invalid values return user-facing error.

### Regression tests added/updated
1. Added:
   1. `src/analysis/__tests__/FileWatcher.pathMatching.test.ts`
   2. `src/__tests__/ExtensionController.exportCommand.test.ts`
2. Updated:
   1. `src/analysis/__tests__/FileWatcher.property.test.ts` matcher aligned to `minimatch`.

### Lint remediation progress
1. Lint errors reduced from `114` to `0`.
2. Current lint status: `0 errors`, `298 warnings`.
3. Warning backlog is mostly:
   1. `@typescript-eslint/naming-convention` (underscore member naming policy)
   2. `max-lines`, `max-lines-per-function`, `complexity`
   3. `explicit-function-return-type`

## Latest validation status
1. `npm run compile`: PASS.
2. `npm run lint`: PASS with warnings (`0 errors`, `298 warnings`).
3. `npm test`: PASS (`37/37` suites, `515 passed`, `1 skipped`).

## Key docs already created
1. `docs/REMEDIATION_PLAN.md`
2. `docs/REMEDIATION_BASELINE_2026-03-02.md`
3. `docs/PHASE1_PROGRESS_2026-03-02.md`
4. `docs/PHASE2_PROGRESS_2026-03-02.md`

## Important implementation notes
1. Test diagnosis should prefer serial execution for flaky/order-sensitive investigations (`--runInBand`).
2. Previous failures from parallel tool calls were misleading; avoid parallel test runs when debugging.
3. Workspace contains many modified files (expected for remediation sequence); do not revert unrelated changes.

## Suggested next execution slice
1. Decide warning strategy before large refactor:
   1. Option A: Keep lint rules strict and refactor to reduce warnings.
   2. Option B: Tune lint policy to align with current project style, then enforce warning budget.
   3. Option C: Hybrid (recommended): targeted rule tuning first, then refactor only high-value modules.
2. If Hybrid is chosen:
   1. Define warning budget + rule policy in `.eslintrc.json`.
   2. Tackle highest-value modules first (`ExtensionController`, `AnalysisService`, `RelationshipExtractor`, `ComponentExtractor`).
   3. Re-run `npm run lint && npm test` after each batch.