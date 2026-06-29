# Grid Code-Quality Audit

Audit of the `Grid` module (`packages/ui/src/modules/grid`) against the [`clean-code`](../.claude/skills/clean-code/SKILL.md) principles, driven by the `code-quality` MCP server and verified by reading the flagged code and running the project's own gate.

## Scope and method

Forty-eight TypeScript/TSX files, 9,411 LOC. Every `code-quality` analyzer was run over the module — `code_metrics`, `analyze_complexity`, `detect_antipatterns`, `find_duplicates`, `find_dead_code`, `analyze_import_graph`, `check_style` — and each non-trivial finding was confirmed or dismissed by reading the cited code. The project linter (`biome check`) was run directly because the MCP `check_style` fell back to basic checks rather than the repository's Biome config.

Findings are ranked by verified severity, not by raw tool output; a large share of the antipattern report is tooling noise on TSX and type files, documented under [Dismissed tool artifacts](#dismissed-tool-artifacts) so a later pass need not re-chase it.

## Verdict

The module is high quality. The real linter is clean, there is no duplication and no circular dependency, and average cyclomatic complexity is 2.22. The only defensible structural finding is the size of `grid-data.tsx`; everything else is minor or a tool artifact.

## Strengths

`biome check` reports zero issues across all 48 files.

Duplication is 0% (`find_duplicates`) and the import graph holds zero circular dependencies at a max depth of 5 (`analyze_import_graph`).

Average cyclomatic complexity is 2.22 and average cognitive complexity is 1.72; the module is overwhelmingly flat, guard-clause code.

Documentation discipline is exceptional — a 52.71% comment ratio, with TSDoc carrying `@internal`, `@remarks`, and rationale on internal helpers (`grid-sorting-utilities.ts`, `grid-constants.ts`, `grid-export.ts`).

Layout constants are centralized and individually documented in `grid-constants.ts`, with each value's purpose and units spelled out.

Decomposition is clear: hooks are split by concern (`use-grid-*`), pure utilities are separated from components, and the public surface is a thin barrel (`index.ts`).

## Findings

### P1 — `grid-data.tsx` is a 1,080-line orchestrator module

`grid-data.tsx` is the module's largest file by a wide margin (the next are `grid-head.tsx` at 694 and `grid-context-menu.tsx` at 554). The exported `GridData` component spans roughly lines 515–1080 (~565 lines) and destructures ~37 props. `detect_antipatterns` flags it `god-class` purely on line count (threshold 500).

The file is not tangled — it already delegates to ~16 focused helpers (`resolveSortable`, `resolveVirtualization`, `resolveExport`, `resolveTableProps`, `resolveAriaRowCount`, `resolveGridSemantics`, `resolveHover`, `resolveResizeLayout`, `useStableRowClick`, `bridgeRowActivate`, `useGridStatusMessage`, `GridBusyStatus`, `describeSort`, `describeSelection`, `GridRegion`). The size is breadth of responsibility, not depth of nesting.

Recommendation (SRP): extract two cohesive clusters into sibling modules — the pure config resolvers (`resolve*`) into `grid-data-resolvers.ts`, and the accessibility status/announcement helpers (`describeSort`, `describeSelection`, `useGridStatusMessage`, `GridBusyStatus`) into `grid-status.ts`. This pulls the file under the 500-line threshold and isolates pure logic for direct unit testing. `grid-head.tsx` (694) is a secondary candidate by the same reasoning. Low risk — the helpers are pure or already self-contained and covered by the existing grid test suite.

### P2 — Wide prop surfaces on internal sub-components

`detect_antipatterns` reports "excessive-parameters" on `GridColumnHeader` (17), `GridReorderableColumnHeader` (16), `GridToolbar` (12), `GridColumnManager` (11), `GridColumnManagerDialog` (10), and `useGridNavigation` (10). The label is wrong — these are single destructured props/options objects, not positional parameter lists — but the *count* is a real prop-drilling smell.

Several of these props arrive as correlated bundles (sort, resize, pin, filter handlers) that `GridData` already holds and that the grid context (`context.ts`) already exposes. The `resize` bundle is already grouped; the same shape can extend to the pin and filter handlers.

Recommendation (composition): group correlated props into cohesive objects, or source stable handlers from the existing grid context rather than threading them through every header render. `GridData`'s own ~37 props are excluded — that is the component's public API contract and is acceptable.

### P3 — `useGridSelection` wrapper is unexported and unused in production

`useGridSelection` (`use-grid-selection.ts:109`) is flagged by `find_dead_code` (medium confidence). It is not re-exported from `index.ts`, and `grid-data.tsx` composes the two sub-hooks (`useGridSelectionState` + `useGridSelectionActions`) inline — it must thread engine-derived `rowKeys` between them, so the convenience wrapper cannot serve it. The wrapper is referenced only by its own test.

Recommendation (YAGNI): remove it (~5 lines), or, if it is meant as public composition, export it from `index.ts` and document the intent. Its TSDoc claim that "`Grid` calls [it] directly" is currently inaccurate.

### P3 — Residual magic numbers

`detect_antipatterns` flags 14 magic numbers, all at info severity. `grid-constants.ts` already centralizes layout and timing constants thoroughly, and spot-checks show the remainder are locally clear in-context literals (e.g. the `REORDER_AUTO_SCROLL` threshold `0.2`, slice indices). Low priority; fold any genuinely opaque value into `grid-constants.ts` opportunistically when touching the surrounding code.

## Do not refactor

`analyze_complexity` flags a handful of functions above the complexity threshold that should be left as they are: `compareSortKeys` (CC 14, Cog 23), `parseNumeric` (CC 10, Cog 17), `nextSort` (CC 8, Cog 18), and `navTarget` (CC 11).

Reading them confirms the complexity is essential domain logic — sort classification, numeric coercion, tri-state sort transitions — expressed as flat sequences of early-return guard clauses with thorough TSDoc. They are exactly the shape clean-code prescribes; decomposing them further would scatter one cohesive decision and reduce clarity. The cognitive-complexity scores overstate the difficulty because the code is linear, not nested.

## Dismissed tool artifacts

The `detect_antipatterns` `deep-nesting` results (reported depths of 10–112) are false. Spot-checks of the worst offenders — `grid-table-views.ts:360` (a flat `return {…}` object literal, real depth ~2), `grid-export.ts:70` (a flat statement sequence), and `grid-data-types.ts:403` (a TSDoc block above a single type property) — show the detector counts cumulative brace/JSX/paren depth rather than logical block nesting, which inflates wildly in TSX and type files. Genuine maximum nesting in the spot-checked code is ≤3.

The `excessive-parameters` errors are mislabeled, as noted in P2; they count destructured object fields as parameters. The actionable signal is prop count, not parameter-list length.

The seven "orphan files" from `analyze_import_graph` are not unused — the label means "imports nothing from within the module." They are the barrel (`index.ts`), type-only modules (`grid-data-types.ts`, `grid-editing-types.ts`), and leaf utilities (`grid-pagination-utilities.ts`, `grid-editing-utilities.ts`, `grid-pin-overrides.ts`, `use-grid-truncation.ts`) consumed by tests or at the package boundary.

The MCP `check_style` "0 issues" result used a basic fallback, not the project's Biome config; the clean result was reconfirmed by running `biome check` directly.

## Suggested remediation order

1. (P1, optional) Split `grid-data.tsx` — extract the `resolve*` resolvers and the a11y status helpers into two sibling modules. Largest readability and SRP win, low risk.

2. (P2) Narrow the internal sub-component prop surfaces via prop grouping or the existing grid context.

3. (P3) Remove or export-and-document `useGridSelection`.

4. (P3) Fold residual opaque literals into `grid-constants.ts` opportunistically.

---

**See also:** [`grid-accessibility-audit.md`](grid-accessibility-audit.md) · [`CONVENTIONS.md`](../CONVENTIONS.md) · [`clean-code` skill](../.claude/skills/clean-code/SKILL.md).
