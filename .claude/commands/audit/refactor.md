# audit:refactor

TRIGGER when: the user asks to recommend, suggest, surface, or identify refactor opportunities; asks what's getting messy, what should be cleaned up, where the duplication is, what abstractions are pulling their weight. Also when the user picks a refactor candidate from a prior audit and asks to plan or execute it.

Surveys the project for refactor opportunities, ranks the high-confidence candidates, and — for those the user chooses to act on — produces a staged execution plan and runs it.

Recommendations clear a confidence bar; this skill does not pad the table to justify the run. A run that returns no candidates is a valid outcome and means the bar held. Recommendations must cite concrete evidence: file paths, line numbers, callsite counts.

**Scope boundaries:**

- Component-internal smells (single-file prop bloat, conditional tangles, mirrored state) → `/ui:audit`. This skill handles **cross-file and cross-component** patterns.
- Type-level smells (`as any`, missed narrowings, `enum`, missing `satisfies`) → `/typescript:audit`. This skill does not duplicate type-system findings.
- Accessibility → `/audit:a11y`.
- Type-shaped execution (renames, lifts, `enum`-to-`as const`, `any`-to-`unknown`, JSDoc-to-TS) → `/typescript:migrate`. This skill orchestrates; `/typescript:migrate` performs the type-shaped edits.

When a finding would be better expressed at one of those scopes, name the sibling skill and move on.

## Arguments

$ARGUMENTS

Recognized hints:
- A path or package name → narrow the scan to that scope.
- A heuristic name from section 3 → only run that heuristic.
- No arguments → scan the whole repo with all heuristics.

---

## 1. Load the Manifest

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate the manifest yourself.

Pull:

- `monorepo.workspaces` and `packages[*].path` — the scope universe.
- `packages[*].framework`, `packages[*].linter`, `packages[*].testRunner` — drives language-aware heuristics.
- `conventions.principles` — weights heuristic priority (e.g. "shared packages never depend on app code" promotes the dependency-direction heuristic).
- `notes` — flags that might explain anomalies (e.g. multiple lockfiles).

---

## 2. Define the scope

If the user passed a path or package, restrict to that scope. Otherwise scan every directory in `packages[*].path`. Always exclude:

- Anything matching `.gitignore`.
- Generated directories: `dist/`, `build/`, `.next/`, `.turbo/`, `coverage/`, `out/`.
- Vendored code: `vendor/`, `third_party/`.
- Test fixtures unless explicitly requested.

---

## 3. Run the heuristics

Run heuristics in parallel where independent. Each produces zero or more candidates with full `file:line` evidence.

### 3a. Duplication (≥2 sites)

Find clusters of near-identical code across files. Threshold: 8+ lines duplicated, normalized for whitespace and identifier names. Per cluster:

- Locations (`file:line` for each occurrence).
- Outline of the shared shape.
- Suggested extraction target — lowest-common scope (same package, then shared package, then root utility).

Skip clusters that model different domain concepts despite syntactic similarity (two CRUD handlers sharing a try/catch shape but operating on unrelated entities). Flag only when call sites share both shape and domain concept.

### 3b. Layering / dependency-direction violations

Build the package dependency graph from `package.json#dependencies` + `peerDependencies`. Compare to declared layering rules in `conventions.principles` (e.g. "shared packages do not depend on app code"). Flag violating edges.

Also flag intra-package layering breaks when the project's source tree implies layers (a `core/` directory importing from a `features/` sibling). Inspect import paths and report `file:line` of the offending import.

### 3c. Single-use abstractions

Find exported functions, components, hooks, or types whose **only** consumer is one other file (excluding tests). Candidates to **inline** — abstractions require ≥2 call sites.

Per candidate: declaration `file:line`, sole consumer `file:line`, one-sentence rationale.

Skip exports that are part of a public API surface (re-exported from a package barrel that other packages import) — those have unseen consumers.

When the single use is **within the same package and the abstraction is a component**, skip the candidate and surface a one-line note: "→ `/ui:audit` for component consolidation in `<package>`." Flag here only when the single-use abstraction is non-component code (a utility, a hook used by one file, a type used in one place).

### 3d. Naming / convention inconsistencies

Within a single package, flag clusters where the same concept uses different identifier shapes (`getUser` / `fetchUser` / `loadUser` for the same data path; `isOpen` / `open` / `visible` for the same boolean).

Per cluster: list the variants, files using each, and which name appears most often (the suggested canonical form).

### 3e. Long files / long functions

Default thresholds: **file > 400 lines**, **function/method > 60 lines**, **cyclomatic-complexity proxy > 12** (count `if` / `else if` / `switch case` / `?:` / `&&` / `||` per function).

### 3f. Dead exports

Find exported symbols with no internal consumer AND no entry in any `package.json#exports` map or root barrel that another package would import.

Use the linter's report if `linter` is `eslint` with `eslint-plugin-unused-imports` configured. If `biome`, run `biome check --formatter-enabled=false` and parse for unused-export findings. Otherwise grep for exported symbols with zero in-repo importers.

### 3g. Stale markers

Grep for `TODO`, `FIXME`, `XXX`, `HACK`. Use `git blame` for commit dates; if blame is unavailable, flag all markers with age "unknown". Flag any older than **6 months**. Group by file; report `file:line` + age in weeks.

### 3h. Framework smells (cross-file only)

Run on packages whose `framework` is `react` or `next`. **Component-internal smells belong to `/ui:audit` section 5.12 — do not duplicate them here.** Surface only patterns that cross file boundaries:

- `'use client'` directives on files that only re-export (server-component leaks).
- Data fetching duplicated between `page.tsx` and a child client component.
- A component imported by both server and client surfaces that hardcodes one or the other (e.g. uses `next/headers` and is also imported by a `'use client'` file).
- Shared barrel exports that mix server-only and client-only symbols.

Be conservative — only flag patterns with high confidence.

---

## 4. Score and rank

Per candidate. The bar is gatekeeping, not filtering — a low-priority candidate is dropped, not demoted into the report.

- **Impact** — Low / Medium / High. Promote candidates whose fix reduces real ongoing pain: many duplicate sites, layering violations blocking a planned refactor, dead code in hot files.
- **Effort** — Low / Medium / High. Promote candidates whose fix is well-contained and reversible.
- **Confidence** — Low / Medium / High. Drop below Medium unless the user explicitly wants exploratory suggestions.

Compute **Priority** = Impact / Effort with Confidence as tiebreaker. Rank descending.

If `conventions.principles` cite a relevant rule, **bump Impact one notch** for candidates whose fix enforces that principle.

---

## 5. Present recommendations

If no candidate cleared the bar, report **NO RECOMMENDATIONS** in one line and stop. Note any heuristic that was skipped for lack of signal so the user knows the coverage. Do not invent low-confidence candidates to populate the table.

Otherwise, single ranked table:

| Name | Location | Pattern | Impact | Effort | Priority | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| `extract formatPrice` | `apps/web/src/cart.ts:42`, `apps/admin/src/invoice.ts:88`, `packages/billing/src/format.ts:11` | duplication (3 sites) | High | Low | High | three identical implementations across two apps and one package; extract to `packages/billing` so app code depends inward |
| `inline parseLocaleTag` | `packages/i18n/src/parse.ts:5` (used once in `apps/web/src/locale.ts:17`) | single-use abstraction | Low | Low | Medium | exported helper with one consumer; inlining removes a public surface that earns nothing |

Column rules:

- **Name** — imperative, action-first ("extract X", "inline Y", "rename Z to W", "split file").
- **Location** — `path/to/file.ts:line` for every relevant occurrence. Up to 5; if more, say "+N more".
- **Pattern** — the heuristic that fired (`duplication`, `layering`, `single-use`, `naming`, `long-file`, `long-function`, `dead-export`, `stale-marker`, `framework-smell`).
- **Impact** / **Effort** / **Priority** — Low / Medium / High.
- **Rationale** — one short sentence citing evidence. When a `conventions.principles` rule applies, cite it.

After the table, add a short paragraph noting:

- Heuristics that ran and confirmed the baseline ("no layering violations", "no dead exports") — these are evidence the survey worked, not gaps.
- Heuristics that were skipped because the stack lacks the relevant signal (e.g. no Next-specific scan in a React-only package).


---

## 6. Plan execution

Ask which candidates to act on. For each chosen candidate, **produce an execution plan before any edits**. The plan is the deliverable of this step; execution comes after the user reviews it.

### 6a. Plan shape

Per candidate, produce:

- **Goal** — one sentence stating what changes structurally when this is done.
- **Stages** — ordered list of independently committable steps. Each stage names the files it touches, the test gates that must pass after it, and what state the repo is in if work stops there.
- **Handoffs** — which sibling skills run as part of each stage (`/premortem` once at the start, `/typescript:migrate` for type-shaped stages, `/typescript:review` after type-touching stages, `/postmortem` at each commit boundary).
- **Rollback story** — what reverts cleanly if a stage fails the test gate.

The default sequencing pattern for almost every refactor:

1. **Introduce** the new shape alongside the old (additive, no consumers changed).
2. **Migrate consumers** one at a time, each as its own commit.
3. **Remove** the old shape once no consumers remain.

Stages 1 and 2 are non-destructive; only stage 3 deletes.

Some refactor patterns have specific sequencing:

- **`duplication`** (extract on second use) — Stage 1: write the shared utility in its new home (no consumers). Stage 2: migrate each call site one commit at a time. Stage 3: delete the duplicate implementations. **Test gate per stage:** scoped tests covering the migrated call site.
- **`layering`** (dependency-direction violation) — Stage 1: introduce the inverted dependency (the lower layer exposing what the higher layer needs). Stage 2: rewire the importing site. Stage 3: remove the offending import. **Test gate:** the package's full test suite, since layering changes can break consumers transitively.
- **`single-use`** (inline) — Single stage: inline the abstraction at its sole consumer, remove the export. **Test gate:** the consumer's tests.
- **`long-file` / `long-function`** — Stage 1: extract sub-pieces alongside the original (cohabitating). Stage 2: rewrite the original to call the extracted pieces. Stage 3: remove anything no longer used. **Test gate:** the file's tests, plus a manual diff read.
- **`dead-export`** — Single stage: remove the export and its definition. **Test gate:** the package's full type-check and test suite, since "no consumers" is only as reliable as the analysis that produced the finding.
- **`stale-marker`** — Single stage: resolve the marker (delete, fix, or replace with a tracked issue). Not really a refactor; surface it but don't over-engineer the plan.
- **`naming`** — Maps to `/typescript:migrate rename` for type/function renames, or a manual rename for identifier-only changes (see 6b).

### 6b. Type-shaped work delegates to `/typescript:migrate`

When the chosen candidate is a rename, a lift to a shared home, an `enum`-to-`as const` conversion, an `any`-to-`unknown` tightening, or a JSDoc-to-TS migration, the execution stages call `/typescript:migrate <mode> <target>` rather than performing the edits inline. `/typescript:migrate` produces its own internal staging and test gates; `audit:refactor` is the orchestrator, not the executor for those shapes.

When the chosen candidate is a non-type refactor (a duplication extract, a layering inversion, a long-file split), execute the stages inline.

### 6c. Premortem the plan before executing

Once the plan is produced, write it to `~/.claude/plans/audit-refactor-<candidate-slug>-<timestamp>.md`, then **invoke `/premortem` on it before the user approves execution**. Premortem picks it up automatically and stress-tests it through the five archetypes.

If premortem returns concrete diffs to the plan, apply them before proceeding. If premortem flags a Point-of-No-Return failure (irreversible artifact, lossy stage), restructure the plan to add a checkpoint before the irreversible step.

### 6d. Execute stage by stage

After premortem-driven plan revisions, ask the user to confirm execution. Then per stage:

1. Perform the stage's edits.
2. Run the stage's test gate (scoped, per the patterns above).
3. If the gate fails: stop, surface, do not advance.
4. If the gate passes: invoke `/postmortem` for that stage's diff. `/postmortem` decides whether `/typescript:review` runs.
5. After `/postmortem` returns PROCEED, ask the user to commit. **Never auto-commit.**
6. Advance to the next stage only after the previous stage is committed.

Atomic, scoped changes per stage. Never bundle unrelated refactors.

### 6e. Handoff to sibling skills when out of scope

When a chosen item is actually in a sibling skill's scope (a component-level consolidate showed up under `single-use`, an a11y issue surfaced via `dead-export`), invoke that sibling rather than performing it here. The plan still applies — `/ui:audit`'s consolidate flow produces its own staging.

---

## Worked examples (fabricated)

### Extract on second use

Before — two near-identical implementations:

```ts
// apps/web/src/cart.ts
export function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

// apps/admin/src/invoice.ts
export function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}
```

After — extracted to a shared package:

```ts
// packages/billing/src/format.ts
export function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
}

// apps/web/src/cart.ts
import { formatPrice } from '@acme/billing'

// apps/admin/src/invoice.ts
import { formatPrice } from '@acme/billing'
```

### Inline the single-user abstraction

Before — `parseLocaleTag` defined and exported but used in exactly one file:

```ts
// packages/i18n/src/parse.ts
export function parseLocaleTag(tag: string) {
  const [lang, region] = tag.split('-')
  return { lang, region }
}

// apps/web/src/locale.ts
import { parseLocaleTag } from '@acme/i18n'
const { lang } = parseLocaleTag(req.headers['accept-language'] ?? 'en-US')
```

After — inlined at the sole consumer:

```ts
// apps/web/src/locale.ts
const [lang] = (req.headers['accept-language'] ?? 'en-US').split('-')
```

---

## Important

- Every candidate must cite `file:line` evidence. Vague suggestions like "consider extracting" without evidence are not allowed.
- Confidence is a gate, not a tiebreaker. A long candidate list is a signal the bar was set too low — re-tune, do not ship.
- The expected outcome on a healthy codebase is **NO RECOMMENDATIONS** or one to three candidates. A table with ten candidates is suspicious.
- Do not propose refactors that contradict `conventions.principles`.
- Do not propose stylistic-only changes already handled by the project's formatter.
- Recommendations are suggestions; execution requires user approval at each stage. **Never auto-execute, never auto-commit, never bundle stages.**
- Always premortem the plan before execution. The plan goes to `~/.claude/plans/audit-refactor-<slug>-<timestamp>.md`; `/premortem` picks it up automatically.
- Type-shaped execution delegates to `/typescript:migrate`. This skill orchestrates the plan but does not perform `rename`, `lift`, `enum-to-const`, `any-to-unknown`, or `jsdoc-to-ts` edits directly.
- Component-internal smells, type smells, and a11y issues belong to sibling skills. Stay in lane.