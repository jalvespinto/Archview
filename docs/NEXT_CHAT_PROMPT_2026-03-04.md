Continue the Archview remediation from the latest documented state.

Authoritative context (read first):
1) docs/CHAT_HANDOFF_2026-03-02.md
2) docs/PHASE3_PROGRESS_2026-03-02.md
3) docs/REMEDIATION_PLAN.md
4) docs/REMEDIATION_BASELINE_2026-03-02.md
5) docs/PHASE2_PROGRESS_2026-03-02.md

Current status to preserve:
- Lint: 0 errors, 3 warnings
- Compile: passing
- Tests: flaky/non-deterministic across analysis/property suites; reruns may pass/fail without code changes

Execution requirements:
1. Keep behavior unchanged.
2. Work in one-method micro-batches only.
3. After every batch, run:
   - npm run lint
   - npm run compile
   - npm test
4. Do not revert unrelated workspace changes.
5. Update docs/PHASE3_PROGRESS_2026-03-02.md at each meaningful checkpoint.
6. End each batch with:
   - exact warning/error delta,
   - what changed,
   - risks introduced,
   - verification results.

Current warning shape (remaining):
- File-size warnings only in:
  - src/analysis/ComponentExtractor.ts
  - src/analysis/KiroAIService.ts
  - src/analysis/RelationshipExtractor.ts

Most recent completed state:
- Batches 230-239 completed in one-method mode.
- KiroAIService lint-reported file-size reduced from 335 (pre-Batch 230) to 318 (Batch 239), warning still present.
- Net warning count remains 3 (all file-size warnings).
- Known deterministic rollback events:
  - Batch 116 (`getWorkspaceRoot` removal) reverted same batch because phase3-preservation.pbt expects method presence.
  - Batch 217 (`getKiroAI` async-return compaction) reverted same batch because KiroAIService error-wrapping behavior changed.
- Known nondeterministic test profile in recent runs:
  - alternating failures across ComponentExtractor.test, ComponentExtractor.property.test, ParserManager.test, ParserManager.property.test, RelationshipExtractor.test, and occasional AnalysisService.test.
- Known operational instability in recent runs:
  - one Jest worker hang observed during Batch 215; process cleanup required.
  - intermittent ENOENT in phase4-preservation.pbt temp-property directory traversal (observed in Batch 238 run).

Immediate next suggested micro-batch:
- Continue with src/analysis/KiroAIService.ts one-method behavior-preserving compaction slices until it falls below max-lines (currently 318 in latest lint snapshot; target <=300), then retarget src/analysis/ComponentExtractor.ts.
