# ArchView Remediation Plan

## Purpose
This plan defines a structured path to fix current correctness, quality, and maintainability issues in ArchView while continuously validating behavior through tests and explicit self-critique.

## Working Rules
1. Test-first for each bug: reproduce with failing test or deterministic script before fixing.
2. Small scoped changes: one subsystem/fix group per PR-sized unit.
3. Two-layer verification: focused tests for changed area, then full suite.
4. Self-critique checkpoint at end of every phase:
   1. What assumptions did we make?
   2. Which assumptions were validated by tests?
   3. What new risks were introduced?
   4. What evidence shows this fix is real (not accidental pass)?
5. No silent masking: do not solve failures by broad ignores without documented rationale.

## Global Exit Gates
1. `npm run typecheck` passes.
2. `npm run lint` passes.
3. `npm test` passes with no unexpected warnings.
4. `npx jest --detectOpenHandles --runInBand` (full or targeted suites) shows no leaks.
5. No duplicate mock warnings.
6. Critical workflows manually smoke-tested:
   1. Generate diagram
   2. Refresh diagram
   3. Export diagram
   4. Auto-refresh from file changes
   5. State restoration across deactivate/activate

## Prioritized Backlog
### P0 (Correctness/Regression Risk)
1. Event-handler accumulation in webview message registration.
2. Cache invalidation path mismatch (absolute vs relative paths).
3. FileWatcher custom regex glob matching (align with minimatch).
4. Export command argument safety when invoked without explicit format.
5. Tooling integrity blockers:
   1. ESLint/TS project mismatch for tests
   2. Jest duplicate manual mock warning
   3. Open handle warnings

### P1 (Reliability/Quality)
1. Tier 2 enrichment path resolution bug.
2. Silent catch blocks in state persistence (add observability).
3. Inline webview asset strategy vs bundled assets (single source of truth).
4. Remaining TODOs in production execution paths.

### P2 (Hardening/Technical Debt)
1. Reduce explicit `any` in production modules.
2. Split oversized complex methods.
3. Add prompt-size safeguards for large repositories.
4. Add regression watchlist tests for top historical failures.

## Phase Plan
## Phase 0: Baseline and Evidence Capture
### Tasks
1. Run:
   1. `npm run typecheck`
   2. `npm run lint`
   3. `npm test`
   4. `npx jest --detectOpenHandles --runInBand` (targeted first, expand as needed)
2. Capture outputs into a baseline report artifact with timestamps.
3. Categorize failures by subsystem and severity.

### Validation
1. Baseline report exists and is reproducible (rerun one failing command to confirm deterministic behavior).

### Self-Critique
1. Are we measuring real defects or test/config noise?
2. Which failures block safe code changes first?

## Phase 1: Toolchain and Quality Gate Stabilization
### Tasks
1. Fix lint/TS config mismatch so lint can evaluate intended files correctly.
2. Resolve duplicate manual mock warning (`dist/__mocks__` conflict).
3. Resolve test lifecycle leaks/open handles where possible.

### Test Strategy
1. Add/adjust config tests only when behaviorally needed.
2. Re-run lint and targeted jest leak checks after each config change.

### Exit Criteria
1. Lint runs cleanly or with only approved residual warnings documented.
2. Duplicate mock warning eliminated.
3. Leak warnings reduced/eliminated with evidence.

### Self-Critique
1. Did we hide defects via ignores?
2. Are excludes narrowly scoped and justified?

## Phase 2: P0 Functional Fixes
### Tasks
1. Fix webview message handler lifecycle ownership/disposal.
2. Normalize path semantics in analysis cache invalidation.
3. Replace FileWatcher matching with minimatch-based logic.
4. Harden export command handling for missing/invalid format.

### Test Strategy
1. Create failing regression tests for each bug first.
2. Verify each test fails pre-fix and passes post-fix.
3. Run affected subsystem suites, then full test suite.

### Exit Criteria
1. All P0 regression tests pass.
2. No behavior regressions in phase-related preservation tests.

### Self-Critique
1. Could tests pass if fix were removed? (quick mutation sanity check)
2. Did we introduce hidden coupling between controller and UI services?

## Phase 3: P1 Reliability Fixes
### Tasks
1. Fix Tier 2 enrichment path resolution for relative files.
2. Replace silent catches in state load/save with structured logging strategy.
3. Unify webview delivery approach (prefer bundled assets with strict CSP).
4. Address TODOs that affect user-visible behavior.

### Test Strategy
1. Add integration tests for state persistence failures and fallback behavior.
2. Add tests validating webview asset loading path consistency.

### Exit Criteria
1. Enrichment works for relative and absolute file paths.
2. Persistence failures are diagnosable through logs/events.
3. Webview architecture is single-path and documented.

### Self-Critique
1. Are we improving observability without over-noising logs?
2. Does webview change preserve CSP and functionality?

## Phase 4: P2 Hardening
### Tasks
1. Reduce explicit `any` in high-risk production modules.
2. Refactor long/complex methods that are recurring bug sources.
3. Add prompt budget protections for large codebases.
4. Add regression watchlist tests for previously critical issues.

### Test Strategy
1. Enforce typecheck and lint as mandatory pre-merge gates.
2. Add targeted property tests for refactored complex logic.

### Exit Criteria
1. Type quality measurably improved in targeted modules.
2. Complexity hotspots reduced with equivalent behavior.
3. Large-prompt failure modes handled gracefully.

### Self-Critique
1. Are refactors justified by risk reduction and not style-only churn?
2. Did we preserve runtime behavior with evidence?

## Phase 5: Final Verification and Release Readiness
### Tasks
1. Run full gate suite and collect artifacts.
2. Execute manual smoke tests for key extension workflows.
3. Produce final remediation report:
   1. Fixed issues
   2. Deferred items
   3. Residual risks
   4. Validation evidence

### Exit Criteria
1. All global gates pass.
2. Final report approved by maintainers.

## Execution Order
1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5

## Immediate Next Actions
1. Execute Phase 0 baseline checks now.
2. Commit baseline report artifact.
3. Start Phase 1 with lint/TS/Jest warning stabilization.
