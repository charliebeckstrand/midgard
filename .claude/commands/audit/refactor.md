# audit:refactor

TRIGGER when: recommend, suggest, surface, or identify refactor opportunities — "what's getting messy", "what should be cleaned up", "where the duplication is", "what abstractions earn their keep". Also when the user picks a refactor candidate from a prior audit and asks to plan or execute it.

Survey the project for refactor opportunities, rank high-confidence candidates, and — for chosen candidates — produce a staged execution plan and run it.

Recommendations clear a confidence bar; this skill never pads the table to justify the run. Zero candidates is a valid outcome. Every candidate cites concrete evidence: file paths, line numbers, callsite counts.

**Scope boundaries** (when a finding lives elsewhere, name the sibling and move on):

| Concern | Sibling |
|---|---|
| Component-internal smells (prop bloat, conditional tangles, mirrored state) | `/ui:audit` |
| Type-level smells (`as any`, missed narrowings, `enum`, missing `satisfies`) | `/typescript:audit` |
| Accessibility | `/audit:a11y` |
| Type-shaped execution (renames, lifts, `enum`-to-`as const`, `any`-to-`unknown`, JSDoc-to-TS) | `/typescript:migrate` |

## Arguments

$ARGUMENTS

- A path or package name → narrow the scan to that scope.
- A heuristic name from §3 → run only that heuristic.
- No arguments → scan the whole repo with all heuristics.

---

## 1. Manifest

Read `./manifest.json`. If missing, halt with a pointer to `/repo:manifest`.

Pull:

- `monorepo.workspaces`, `packages[*].path` — the scope universe.
- `packages[*].framework`, `packages[*].linter`, `packages[*].testRunner` — drive language-aware heuristics.
- `conventions.principles` — weight heuristic priority (e.g. "shared packages never depend on app code" promotes the dependency-direction heuristic).
- `notes` — flags that might explain anomalies (e.g. multiple lockfiles).

---

## 2. Define scope

If the user passed a path or package, restrict. Otherwise scan every directory in `packages[*].path`. Always exclude:

- `.gitignore` matches.
- Generated directories: `dist/`, `build/`, `.next/`, `.turbo/`, `coverage/`, `out/`.
- Vendored: `vendor/`, `third_party/`.
- Test fixtures unless explicitly requested.

---

## 3. Run heuristics

Run heuristics in parallel where independent. Each produces zero or more candidates with full `file:line` evidence.

### 3a. Duplication (≥2 sites)

Find clusters of near-identical code across files. Threshold: 8+ lines duplicated, normalized for whitespace and identifier names. Per cluster:

- Locations (`file:line` per occurrence).
- Outline of shared shape.
- Suggested extraction target — lowest-common scope (same package, then shared package, then root utility).

Skip clusters that model different domain concepts despite syntactic similarity (two CRUD handlers sharing a try/catch shape but operating on unrelated entities). Flag only when call sites share shape **and** domain concept.

### 3b. Layering / dependency-direction violations

Build the package dependency graph from `package.json#dependencies` + `peerDependencies`. Compare to declared layering rules in `conventions.principles` (e.g. "shared packages do not depend on app code"). Flag violating edges.

Also flag intra-package layering breaks when the source tree implies layers (a `core/` directory importing from a `features/` sibling). Inspect import paths; report `file:line` of the offending import.

### 3c. Single-use abstractions

Find exported functions, components, hooks, or types whose only consumer is one other file (excluding tests). Candidates to inline — abstractions require ≥2 call sites.

Per candidate: declaration `file:line`, sole consumer `file:line`, one-sentence rationale.

Skip exports that are part of a public API surface (re-exported from a package barrel that other packages import) — those have unseen consumers.

When the single use is within the same package and the abstraction is a component, skip and surface one line: `→ /ui:audit for component consolidation in <package>`. Flag here only for non-component single-use (a utility, a hook used by one file, a type used in one place).

### 3d. Naming / convention inconsistencies

Within a single package, flag clusters where the same concept uses different identifier shapes (`getUser` / `fetchUser` / `loadUser` for the same data path; `isOpen` / `open` / `visible` for the same boolean).

Per cluster: variants, files using each, and the most common name (suggested canonical form).

Also flag module-level `const` declarations whose casing or placement violates a package's `## Constant naming` rule (e.g. `packages/ui/CLAUDE.md`). Cite the rule's location; don't restate it. Skip when no such rule exists.

### 3e. Long files / long functions

Default thresholds:

- File > **400 lines**.
- Function/method > **60 lines**.
- Cyclomatic-complexity proxy > **12** (count `if` / `else if` / `switch case` / `?:` / `&&` / `||` per function).

### 3f. Dead exports

Find exported symbols with no internal consumer AND no entry in any `package.json#exports` map or root barrel another package imports.

Use the linter's report when available: `eslint` + `eslint-plugin-unused-imports`, or `biome check --formatter-enabled=false`. Otherwise grep for exported symbols with zero in-repo importers.

### 3g. Stale markers

Grep `TODO`, `FIXME`, `XXX`, `HACK`. Use `git blame` for commit dates; if blame unavailable, mark age "unknown". Flag any older than **6 months**. Group by file; report `file:line` + age in weeks.

### 3h. Framework smells (cross-file only)

Run on packages whose `framework` is `react` or `next`. Component-internal smells belong to `/ui:audit` §5.12 — don't duplicate. Surface only patterns that cross file boundaries:

- `'use client'` on files that only re-export (server-component leaks).
- Data fetching duplicated between `page.tsx` and a child client component.
- A component imported by both server and client surfaces that hardcodes one or the other (uses `next/headers` and is also imported by a `'use client'` file).
- Shared barrel exports mixing server-only and client-only symbols.

Be conservative — only flag high-confidence patterns.

---

## 4. Score and rank

Per candidate. The bar is gatekeeping, not filtering — a low-priority candidate is dropped, not demoted into the report.

| Axis | Promotes |
|---|---|
| **Impact** (Low/Medium/High) | Candidates whose fix reduces real ongoing pain — many duplicate sites, layering violations blocking a planned refactor, dead code in hot files. |
| **Effort** (Low/Medium/High) | Candidates whose fix is well-contained and reversible. |
| **Confidence** (Low/Medium/High) | Drop below Medium unless the user explicitly wants exploratory suggestions. |

Compute **Priority** = Impact / Effort, Confidence breaks ties. Rank descending.

When `conventions.principles` cites a relevant rule, bump Impact one notch for candidates whose fix enforces that principle.

---

## 5. Present recommendations

If no candidate cleared the bar: **NO RECOMMENDATIONS** in one line. Note any heuristic skipped for lack of signal so the user knows the coverage. Don't invent low-confidence candidates to populate the table.

Otherwise, one ranked table:

| Name | Location | Pattern | Impact | Effort | Priority | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| `extract formatPrice` | `apps/storefront/app/cart.tsx:42`, `apps/storefront/app/checkout/summary.tsx:88`, `packages/design-system/src/utilities/format-price.ts:11` | duplication (3 sites) | High | Low | High | three identical implementations across the app and the design system; extract to `packages/design-system` so app code depends inward |
| `inline parseLocaleTag` | `packages/design-system/src/utilities/parse-locale-tag.ts:5` (used once in `apps/storefront/app/locale.tsx:17`) | single-use abstraction | Low | Low | Medium | exported helper with one consumer; inlining removes a public surface that earns nothing |

Column rules:

- **Name** — imperative, action-first ("extract X", "inline Y", "rename Z to W", "split file").
- **Location** — `path/to/file.ts:line` per occurrence. Up to 5; if more, say "+N more".
- **Pattern** — the heuristic that fired (`duplication`, `layering`, `single-use`, `naming`, `long-file`, `long-function`, `dead-export`, `stale-marker`, `framework-smell`).
- **Impact** / **Effort** / **Priority** — Low / Medium / High.
- **Rationale** — one short sentence citing evidence. When `conventions.principles` applies, cite the rule.

After the table, a short paragraph naming:

- Heuristics that ran and confirmed the baseline ("no layering violations", "no dead exports") — evidence the survey worked.
- Heuristics skipped because the stack lacks the relevant signal (e.g. no Next-specific scan in a React-only package).

---

## 6. Plan execution

Ask which candidates to act on. Per chosen candidate, produce an execution plan **before any edits**. The plan is the deliverable of this step; execution comes after the user reviews it.

### 6a. Plan shape

Per candidate:

- **Goal** — one sentence stating what changes structurally.
- **Stages** — ordered, independently-committable steps. Each names files touched, the test gates that must pass, and what state the repo is in if work stops there.
- **Handoffs** — sibling skills per stage (`/premortem` once at the start, `/typescript:migrate` for type-shaped stages, `/typescript:review` after type-touching stages, `/postmortem` at each commit boundary).
- **Rollback story** — what reverts cleanly if a stage fails.

The default sequencing pattern for almost every refactor:

1. **Introduce** the new shape alongside the old (additive, no consumers changed).
2. **Migrate consumers** one at a time, each its own commit.
3. **Remove** the old shape once no consumers remain.

Stages 1 and 2 are non-destructive; only stage 3 deletes.

Pattern-specific sequencing:

| Pattern | Stages | Test gate |
|---|---|---|
| `duplication` | 1: write shared utility (no consumers). 2: migrate each call site, one commit per. 3: delete duplicates. | scoped tests covering the migrated call site |
| `layering` | 1: introduce inverted dependency (lower layer exposing what higher layer needs). 2: rewire importer. 3: remove offending import. | package's full test suite (layering changes can break consumers transitively) |
| `single-use` | inline at sole consumer, remove export | consumer's tests |
| `long-file` / `long-function` | 1: extract sub-pieces alongside original. 2: rewrite original to call extracted. 3: remove anything unused. | file's tests + manual diff read |
| `dead-export` | remove the export and its definition | package's full type-check + tests ("no consumers" is only as reliable as the analysis) |
| `stale-marker` | resolve the marker (delete, fix, or replace with a tracked issue) | — (not really a refactor) |
| `naming` | delegate to `/typescript:migrate rename` for type/function renames; manual rename for identifier-only (see 6b) | — |

### 6b. Type-shaped work delegates to `/typescript:migrate`

When the candidate is a rename, a lift to a shared home, an `enum`-to-`as const` conversion, an `any`-to-`unknown` tightening, or a JSDoc-to-TS migration, the stages call `/typescript:migrate <mode> <target>` rather than editing inline. `/typescript:migrate` runs its own staging and test gates; `/audit:refactor` orchestrates.

Non-type refactors (duplication extract, layering inversion, long-file split) execute inline.

### 6c. Premortem before executing

Write the plan to `~/.claude/plans/audit-refactor-<candidate-slug>-<timestamp>.md`, then invoke `/premortem` on it before the user approves execution. Premortem picks it up automatically.

If premortem returns concrete diffs to the plan, apply them. If premortem flags a Point-of-No-Return failure (irreversible artifact, lossy stage), add a checkpoint before the irreversible step.

### 6d. Execute stage by stage

After premortem-driven revisions, ask the user to confirm execution. Per stage:

1. Perform the stage's edits.
2. Run the stage's test gate (scoped, per §6a).
3. If the gate fails: stop, surface, don't advance.
4. If the gate passes: invoke `/postmortem` for that stage's diff. `/postmortem` decides whether `/typescript:review` runs.
5. After `/postmortem` returns PROCEED, ask the user to commit. **Never auto-commit.**
6. Advance only after the previous stage is committed.

Atomic, scoped changes per stage. Never bundle unrelated refactors.

### 6e. Handoff when out of scope

When a chosen item turns out to be in a sibling's scope (a component-level consolidate showed up under `single-use`, an a11y issue surfaced via `dead-export`), invoke that sibling. The plan still applies — `/ui:audit`'s consolidate flow produces its own staging.

---

## Worked examples (fabricated)

### Extract on second use

Before — two near-identical implementations:

```ts
// apps/storefront/app/cart.tsx
export function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

// apps/storefront/app/checkout/summary.tsx
export function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}
```

After — extracted:

```ts
// packages/design-system/src/utilities/format-price.ts
export function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

// apps/storefront/app/cart.tsx
import { formatPrice } from '@acme/design-system/utilities/format-price'
```

### Inline the single-user abstraction

Before — `parseLocaleTag` defined and exported but used in exactly one file:

```ts
// packages/design-system/src/utilities/parse-locale-tag.ts
export function parseLocaleTag(tag: string) {
  const [lang, region] = tag.split('-')

  return { lang, region }
}

// apps/storefront/app/locale.tsx
import { parseLocaleTag } from '@acme/design-system/utilities/parse-locale-tag'
const { lang } = parseLocaleTag(req.headers['accept-language'] ?? 'en-US')
```

After — inlined:

```ts
// apps/storefront/app/locale.tsx
const [lang] = (req.headers['accept-language'] ?? 'en-US').split('-')
```

---

## Rules

- Every candidate cites `file:line` evidence. Vague suggestions ("consider extracting") are not allowed.
- Confidence is a gate, not a tiebreaker. A long candidate list signals the bar was too low — re-tune, don't ship.
- The expected outcome on a healthy codebase: NO RECOMMENDATIONS or one to three candidates. A table of ten is suspicious.
- Don't propose refactors that contradict `conventions.principles`.
- Don't propose stylistic-only changes the formatter handles.
- Recommendations are suggestions; execution requires user approval at each stage. **Never auto-execute, never auto-commit, never bundle stages.**
- Always premortem the plan before execution. Plan goes to `~/.claude/plans/audit-refactor-<slug>-<timestamp>.md`; `/premortem` picks it up.
- Type-shaped execution delegates to `/typescript:migrate`. This skill orchestrates; it doesn't perform `rename` / `lift` / `enum-to-const` / `any-to-unknown` / `jsdoc-to-ts` directly.
- Component-internal smells, type smells, a11y issues belong to sibling skills. Stay in lane.
