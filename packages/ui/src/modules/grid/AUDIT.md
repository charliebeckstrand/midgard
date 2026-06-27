# Grid module — code-quality audit (interim findings)

> **Status: IN PROGRESS.** This file captures the raw output of the `code-quality`
> MCP analyzer pass over the Grid module plus a first-pass signal/noise triage,
> saved so the work survives a session interruption. A deeper verification +
> synthesis workflow (12 agents reading the real code behind each finding, the
> real Biome/tsc gate, and correctness/perf/a11y/API lenses) was still running
> when this was written; its results will be folded in on continuation. Treat the
> "Triage" verdicts below as first-pass judgments grounded in the analyzer output
> and a read of `index.ts`/`code_metrics`, not yet line-by-line confirmed for
> every item.

## Scope

- **Target:** `packages/ui/src/modules/grid` (57 TypeScript files)
- **Instrument:** `code-quality` MCP server — all 7 analyzers run at the directory level
- **Date:** 2026-06-27

## Module size (code_metrics)

| Metric | Value |
|--------|-------|
| Files | 57 (all TypeScript) |
| Lines (LOC) | 9,464 |
| Source lines (SLOC) | 5,675 |
| Comment lines | 2,430 (42.8% ratio) |
| Functions | 358 |
| Classes | 0 |
| Avg LOC/file | 166 |

Largest files: `grid-data.tsx` (987), `grid-head.tsx` (620),
`use-grid-editable-wrapper.ts` (584), `use-grid-table.ts` (445),
`grid-context-menu.tsx` (430), `grid-row.tsx` (411), `types.ts` (335),
`grid-data-types.ts` (325), `grid-table-options.ts` (310), `grid-table-views.ts` (305).

The module is mid-migration from a bespoke data grid to `@tanstack/react-table`
(see `ROADMAP.md`). It is mature and feature-rich; the audit's job is mostly to
separate genuine refactor targets from static-analyzer artifacts.

---

## Confirmed signal (first-pass)

These are the analyzer findings that a first read judges to be **genuine**, ordered
roughly by importance. Each still needs the line-by-line confirmation the running
workflow provides.

### Complexity hotspots (high *cognitive* complexity — the refactor-worthy kind)

Cyclomatic (CC) is noisy on flat dispatch; **cognitive (Cog)** is the better
signal for "hard to read." The genuine targets:

| Function | Location | CC | Cog | Note |
|----------|----------|----|----|------|
| `nextSort` | `grid-data.tsx:185` | 8 | **18** | Sort-cycle state machine; high cognitive load |
| `parseNumeric` | `grid-sorting-utilities.ts:31` | 10 | **17** | Smart numeric parsing (currency/percent/accounting negatives) |
| `Commit` | `grid-editable-editor-utilities.ts:4` | 8 | **16** | Editor commit handler |
| `editorKeyHandler` | `grid-editable-editor-utilities.ts:14` | 8 | **16** | Editor keydown dispatch |
| `compareSmart` | `grid-sorting-utilities.ts:99` | 10 | **14** | Default comparator |
| `clampToBoundingRect` | `grid-reorder.ts:24` | 7 | **12** | Drag clamp geometry |
| `autoRemove` | `grid-table-options.ts:115` | **15** | **27** | Highest combined; filter auto-removal logic |
| `useGridEditableCellSlice` | `grid-editable-context.ts:61` | 13 | 10 | Context slice selector |
| `navTarget` | `use-grid-navigation.ts:71` | 11 | 8 | Also 6 positional params |

`use-grid-editable-wrapper.ts:252 switch` (CC=14, **Cog=1**) is a *flat* switch —
high CC but trivially readable; likely fine as-is.

### File size & cohesion (god-file, >500 LOC threshold)

- `grid-data.tsx` — **987 LOC**, 24 functions, **23 import dependencies** (the
  module's most-dependent file). Likely the orchestration hub; assess whether it
  bundles separable concerns (sort state, semantics resolution, virtualization
  wiring, colgroup) that could move to siblings.
- `grid-head.tsx` — **620 LOC**; header components with very large prop signatures
  (see below).
- `use-grid-editable-wrapper.ts` — **584 LOC**, 15 functions; the editable
  subsystem's god-hook.

### Large component prop signatures (excessive-parameters, genuine subset)

These are React components whose **props object** the analyzer counts as
"parameters." Arity isn't the real issue, but the prop *count* signals a component
doing a lot:

- `GridColumnHeader` — `grid-head.tsx:448` — **17 props**
- `GridReorderableColumnHeader` — `grid-head.tsx:541` — **15 props**
- `GridColumnManager` — `grid-column-manager.tsx:54` — **11 props**
- `GridColumnManagerDialog` — `grid-column-manager-dialog.tsx:35` — **11 props**

Genuinely positional candidates worth an options object: `navTarget`
(`use-grid-navigation.ts:71`, 6) and `pageStatus` (`grid-pagination.tsx:30`, 6) —
pending confirmation they're positional, not destructured props.

### Magic numbers (genuine, unhoused subset)

`grid-constants.ts` IS the constants module, so the literals flagged there are
false positives (see noise section). The genuinely unhoused ones to check:

- `use-grid-truncation.ts:6` — `0.01` (sub-pixel overflow epsilon) — name it.
- `grid-pagination-utilities.ts:8,10,12` — `7`, `3`, `4` (page-window math) —
  candidates for named constants.
- `grid-editable-date-editor.tsx:12` — `4`.

### Lint/type gate NOT actually run

The MCP `check_style` tool reported "0 issues" but `Tools used: basic` — it fell
back to a no-op and **never ran the repo's Biome**. The real gate
(`biome check`, `turbo run check-types`, per CLAUDE.md §3.4) must be run
separately before trusting any "clean" claim. **This is an open item** — the
workflow was running it when interrupted.

### Dead code (one candidate to verify)

- `useGridSelection` (`use-grid-selection.ts:99`) — flagged unused; **verify**
  against the whole repo. It is *not* in the public barrel (`index.ts`), so if
  nothing internal or external imports it, it may be genuinely dead.

---

## Static-analyzer noise (confirmed / near-certain false positives)

This is the most important meta-finding: a large fraction of the raw output is
**tool artifact**, and reporting it as-is would be misleading.

- **Deep-nesting detector is unreliable here.** It produced 46 "errors" with
  physically impossible depths — e.g. `grid-table-views.ts:302` "depth 104",
  `grid-data.tsx:959` "88", `use-grid-table.ts:443` "80",
  `grid-context-menu.tsx:363` "61", `grid-column-manager.tsx:154` "39". It also
  flags pure **type-definition files** (`types.ts:325` "28",
  `grid-data-types.ts:317` "14") which have no control flow at all. It is almost
  certainly counting brace/JSX/type-literal/object-literal depth, not `if`/`for`/
  `while`/`try` nesting. The low-number *warnings* (5–6 levels: `grid-filter.tsx:25`,
  `grid-reorder.ts:119`, `context.ts:31`, `use-grid-editable-store.ts:21`) are the
  only ones plausibly worth a look.
- **magic-numbers flags the constants file.** `grid-constants.ts:1,11,14,17,20`
  (`44`, `150`, `48`, `40`, `16`) are literals being *assigned to* named
  constants — that's the fix, not the problem.
- **excessive-parameters counts React props as parameters.** The 8–17 "params"
  on header/manager components are single destructured props objects.
- **dead-code flags a public export.** `GridEditableBooleanEditor`
  (`grid-editable-boolean-editor.tsx:18`) is re-exported from `index.ts:16` — it's
  public API, not dead. The analyzer can't see external consumers.
- **find_duplicates:** 0% duplication — clean, no action.
- **import graph "orphans":** the 10 "orphan" files (incl. `index.ts`) have no
  *intra-directory* imports; they import from outside the grid dir or are leaf
  utilities. Not unused.

---

## Clean results (no action)

- **Circular dependencies:** 0 (max dependency depth 4, 179 imports total).
- **Code duplication:** 0%.
- **Comment ratio:** healthy 42.8%.

---

## Open items for continuation

1. **Fold in the verification workflow output** (run ID `wf_4235a5f0-f76`,
   script saved under the session's `workflows/scripts/`) — 12 agents'
   line-confirmed verdicts on every item above, plus the lenses below.
2. **Run the real Biome + tsc gate** scoped to the grid module and record actual
   lint/type findings (the MCP `check_style` no-op left this unknown).
3. **Correctness & hooks lens** — stale closures, effect dependency arrays, async
   commit/draft races in the editable subsystem and navigation.
4. **Render-performance lens** — memoization / inline-literal props / context-value
   rebuilds on the per-row/per-cell hot paths.
5. **Accessibility lens** — verify the ROADMAP's `role="grid"` /
   `aria-rowindex`/`aria-colindex` / `role="separator"` claims and icon-button
   accessible names.
6. **API & type-safety lens** — `any`/`as`/`!` usage, public-export TSDoc coverage
   (CLAUDE.md §3.5), union exhaustiveness.
7. Confirm the complexity refactor targets and the `useGridSelection` dead-code
   candidate line-by-line, then write the final severity-ranked report +
   remediation roadmap.

---

## Appendix — full raw analyzer output

### analyze_complexity (threshold 10) — high-complexity functions

```
grid-table-options.ts:115     autoRemove                  CC=15 Cog=27 LOC=52 params=1
use-grid-editable-wrapper.ts:252  switch                  CC=14 Cog=1  LOC=55 params=1
grid-editable-context.ts:61   useGridEditableCellSlice    CC=13 Cog=10 LOC=40 params=4
use-grid-navigation.ts:71     navTarget                   CC=11 Cog=8  LOC=30 params=6
use-grid-navigation.ts:78     switch                      CC=11 Cog=5  LOC=22 params=1
grid-sorting-utilities.ts:31  parseNumeric                CC=10 Cog=17 LOC=24 params=1
grid-sorting-utilities.ts:99  compareSmart                CC=10 Cog=14 LOC=17 params=2
grid-sorting-utilities.ts:57  compareEmpty                CC=8  Cog=10 LOC=11 params=2
grid-editable-editor-utilities.ts:4   Commit              CC=8  Cog=16 LOC=24 params=1
grid-editable-editor-utilities.ts:14  editorKeyHandler    CC=8  Cog=16 LOC=14 params=2
grid-data.tsx:185             nextSort                    CC=8  Cog=18 LOC=23 params=3
grid-reorder.ts:24            clampToBoundingRect         CC=7  Cog=12 LOC=21 params=4
use-grid-editable-wrapper.ts:61  handleHistoryKey/undo/redo  CC=9 Cog=9
```
Module averages: avg cyclomatic 2.33, avg cognitive 1.72 (low overall — hotspots are localized).

### detect_antipatterns — summary

```
god-class: 8   long-method: 2   deep-nesting: 46   excessive-parameters: 14
magic-numbers: 12   feature-envy: 5   primitive-obsession: 1
Severity: 50 errors / 20 warnings / 18 info
```
god-class (file >500 LOC): grid-data.tsx (987), grid-head.tsx (620), use-grid-editable-wrapper.ts (584).
long-method: use-grid-editable-wrapper.ts:252 switch (54 lines), grid-table-options.ts:115 autoRemove (51 lines).
feature-envy (long method chains, info-level): use-grid-truncation.ts:83, use-grid-editable-wrapper.ts:140, use-grid-editable-draft.ts:54, grid-row.tsx:247, grid-row.tsx:336.

### find_dead_code (medium confidence)

```
export useGridSelection           use-grid-selection.ts:99          (verify — not in barrel)
export GridEditableBooleanEditor  grid-editable-boolean-editor.tsx:18  (FALSE POSITIVE — public via index.ts:16)
```

### find_duplicates

```
0 duplicate blocks / 0 duplicate lines / 0% duplication.
```

### analyze_import_graph

```
57 files, 179 imports, avg 3.14/file, max depth 4, circular deps: 0.
Most imported: grid-constants.ts (6), grid-row.tsx (3), use-grid-editable-navigation.ts (2), grid-table-views.ts (2), grid-data.tsx (2).
Most dependent: grid-data.tsx (23), grid-head.tsx (16), grid-editable.tsx (13), grid-column-manager.tsx (12), grid-row.tsx (7).
"Orphans" (no intra-dir deps): use-grid-truncation, use-grid-resize-height, use-grid-editable-wrapper, use-grid-editable-store, use-grid-editable-history, use-grid-editable-draft, index.ts, grid-pagination-utilities, grid-editable-types, grid-data-types.
```

### check_style

```
0 issues — BUT "Tools used: basic" (no-op fallback; real Biome NOT run). Result is meaningless; rerun the repo gate.
```
