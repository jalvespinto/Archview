# Remediation Baseline Report (2026-03-02)

## Scope
Phase 0 evidence capture for the remediation plan in `docs/REMEDIATION_PLAN.md`.

## Commands Run
1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npx jest --detectOpenHandles --runInBand`

## Results Summary
1. `typecheck`: PASS
2. `lint`: FAIL
3. `test` (default): PASS with teardown warning
4. `jest --detectOpenHandles --runInBand`: FAIL (functional tests + open handles)

## Detailed Findings

### 1) Typecheck
- Status: PASS
- Observation: TypeScript compilation completes with `tsc --noEmit`.

### 2) Lint
- Status: FAIL
- Totals from run: `493 problems (190 errors, 303 warnings)`.
- Highest-impact buckets:
1. ESLint + TS project mismatch for tests (`parserOptions.project` points to `tsconfig.json` that excludes tests).
2. Large number of `no-explicit-any` and `no-unused-vars` errors in production and supporting files.
3. Style/complexity warnings are widespread (`naming-convention`, `max-lines`, `complexity`) and currently noisy.

### 3) Jest (Default)
- Status: PASS
- Totals from run: `35 passed, 35 total`; `511 passed, 1 skipped`.
- Warnings:
1. Duplicate manual mock warning for `vscode`:
   1. `dist/__mocks__/vscode.js`
   2. `src/__mocks__/vscode.ts`
2. Worker force-exit warning:
   1. "A worker process has failed to exit gracefully..."
   2. "Force exiting Jest..."

### 4) Jest Detect Open Handles (`--runInBand`)
- Status: FAIL
- Totals from run: `8 failed, 27 passed`; `36 failed, 1 skipped, 475 passed`.
- Failures observed:
1. Relationship extractor property tests failed.
2. ParserManager / AnalysisService / ComponentExtractor / RelationshipExtractor tests failed in this mode.
3. Open-handle report shows many lingering `setTimeout` handles from `DiagramGenerator.withTimeout()`.
- Key implication:
1. Test behavior is mode-sensitive and not stable under stricter handle detection.
2. Timeout cleanup in diagram generation must be fixed before leak diagnostics are considered trustworthy.

## Baseline Conclusions
1. Quality gates are not green (`lint` and strict jest leak run fail).
2. Test suite has stability issues under stricter execution mode.
3. Tooling hygiene (duplicate mocks + lint config mismatch) should be fixed before deep behavioral refactors.

## Immediate Priority Queue (from baseline)
1. Stabilize test/lint infrastructure:
   1. ESLint/TS config mismatch for test files.
   2. Duplicate jest manual mock warning.
   3. Timeout handle cleanup in `DiagramGenerator.withTimeout()`.
2. Re-run baseline commands and require reproducible pass/fail profile twice.
3. Only then proceed to P0 behavioral fixes in the remediation plan.
