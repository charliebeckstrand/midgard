# audit:refactor

TRIGGER when: the user asks to recommend, suggest, surface, or identify refactor opportunities; asks what's getting messy, what should be cleaned up, where the duplication is, what abstractions are pulling their weight.

You are auditing the project for refactor opportunities and ranking them. Recommendations must be grounded in concrete evidence (file paths, line numbers, callsite counts) — never vague platitudes like "consider extracting".

## Arguments

$ARGUMENTS

Recognized hints:
- A path or package name → narrow the scan to that scope.
- A heuristic name from section 3 → only run that heuristic.
- No arguments → scan the whole repo with all heuristics.

---

## 1. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing or stale, silently invoke `/repo:discover --quiet` and re-read; do not announce the regeneration to the user.

Pull these fields:

- `monorepo.workspaces` and `packages[*].path` — the scope universe.
- `packages[*].framework`, `packages[*].linter`, `packages[*].testRunner` — used to pick language-aware heuristics (TS-vs-JS, framework-specific patterns).
- `conventions.principles` — declared rules that **weight** which heuristics matter most. For example, a principle like "shared packages never depend on app code" promotes the dependency-direction heuristic; "atomic commits" has no impact on refactor scoring.
- `conventions.vocabularyGlossary` — use the project's terms in user-facing output.
- `notes` — flags that might explain anomalies (e.g. multiple lockfiles).

---

## 2. Define the scope

If the user passed a path or package, restrict to that scope. Otherwise scan every directory listed in `packages[*].path`. Always exclude:

- Anything matching `.gitignore`.
- Generated directories: `dist/`, `build/`, `.next/`, `.turbo/`, `coverage/`, `out/`.
- Vendored code: `vendor/`, `third_party/`.
- Test fixtures unless explicitly requested.

---

## 3. Run the heuristics

Run heuristics in parallel where independent. Each produces zero or more candidates with full file:line evidence.

### 3a. Duplication (≥2 sites)

Find clusters of near-identical code across files. Threshold: 8+ lines duplicated, normalized for whitespace and identifier names. For each cluster:

- Locations (file:line for each occurrence).
- Outline of the shared shape.
- Suggested extraction target — pick the lowest-common scope (same package, then shared package, then root utility).

Skip clusters that obviously model different domain concepts despite syntactic similarity (e.g. two CRUD handlers that happen to share a try/catch shape but operate on unrelated entities). Code shape alone is not duplication; **semantic** duplication is.

### 3b. Layering / dependency-direction violations

Build the package dependency graph from `package.json#dependencies` + `peerDependencies` in monorepos. Compare to any declared layering rule in `conventions.principles` (e.g. "shared packages do not depend on app code"). Flag edges that violate the rule.

Also flag intra-package layering breaks when the project's source tree implies layers (e.g. a `core/` directory importing from a `features/` sibling). Inspect import paths and report file:line of the offending import.

### 3c. Single-use abstractions

Find exported functions, components, hooks, or types whose **only** consumer is one other file (excluding tests). Candidates to **inline**, because the abstraction earns its keep at duplication ≥2.

For each: declaration file:line, sole consumer file:line, a one-sentence rationale.

Skip exports that are part of a public API surface (re-exported from a package barrel that other packages import) — those have unseen consumers.

### 3d. Naming / convention inconsistencies

Within a single package, flag clusters where the same concept uses different identifier shapes (e.g. `getUser` / `fetchUser` / `loadUser` for the same data path; `isOpen` / `open` / `visible` for the same boolean).

Report each cluster as a single candidate: list the variants, the files using each, and which name appears most often (the suggested canonical form).

### 3e. Long files / long functions

Configurable thresholds — default: **file > 400 lines**, **function/method > 60 lines**. Flag files and functions that exceed them. For functions, include cyclomatic-complexity proxy: count `if`/`else if`/`switch case`/`?:`/`&&`/`||` to spot tangled branching.

### 3f. Dead exports

Find exported symbols with no internal consumer AND no entry in any `package.json#exports` map or root barrel that another package would import. Report file:line of the export.

Use the linter's report if `linter` is `eslint` with `eslint-plugin-unused-imports` configured — preferable to a hand-rolled scan. If `biome`, run `biome check --formatter-enabled=false` and parse for unused-export findings.

### 3g. Stale markers

Grep for `TODO`, `FIXME`, `XXX`, `HACK`. Use `git blame` to find the commit date of each. Flag any older than **6 months**. Group by file; report file:line + age in weeks.

### 3h. Framework smells (React / Next)

Run on packages whose `framework` is `react` or `next`:

- Components that should be memoized (large prop surface + frequent re-render proxies).
- `useEffect` blocks with empty dependency arrays that read changing props.
- Custom hooks calling `useState` for derived values that could be `useMemo`.
- **Next-specific**: `'use client'` directives in files that only re-export (server-component leaks), `'use client'` on components that have no client-side surface (no hooks, no event handlers), data fetching duplicated between `page.tsx` and a child client component.

Be conservative — only flag patterns with high confidence.

---

## 4. Score and rank

For each candidate produced by section 3, score:

- **Impact** — Low / Medium / High. Promote candidates whose fix reduces real ongoing pain: many duplicate sites, layering violations that block a planned refactor, dead code in hot files.
- **Effort** — Low / Medium / High. Promote candidates whose fix is well-contained and reversible.
- **Confidence** — Low / Medium / High. Drop candidates below Medium unless the user explicitly wants exploratory suggestions.

Compute **Priority** = Impact / Effort with Confidence as a tiebreaker. Rank descending.

If `conventions.principles` cite a relevant rule, **bump Impact one notch** for candidates whose fix enforces that principle.

---

## 5. Present recommendations

Output a single ranked table:

| Name | Location | Pattern | Impact | Effort | Priority | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| `extract formatPrice` | `apps/web/src/cart.ts:42`, `apps/admin/src/invoice.ts:88`, `packages/billing/src/format.ts:11` | duplication (3 sites) | High | Low | High | three identical implementations across two apps and one package; extract to `packages/billing` so app code depends inward |
| `inline parseLocaleTag` | `packages/i18n/src/parse.ts:5` (used once in `apps/web/src/locale.ts:17`) | single-use abstraction | Low | Low | Medium | exported helper with one consumer; inlining removes a public surface that earns nothing |

Column rules:

- **Name** — imperative, action-first ("extract X", "inline Y", "rename Z to W", "split file"). Use the project's vocabulary.
- **Location** — `path/to/file.ts:line` for every relevant occurrence. List up to 5; if more, say "+N more".
- **Pattern** — the heuristic that fired (`duplication`, `layering`, `single-use`, `naming`, `long-file`, `long-function`, `dead-export`, `stale-marker`, `framework-smell`).
- **Impact** / **Effort** / **Priority** — Low / Medium / High.
- **Rationale** — one short sentence citing the evidence. When a principle from `conventions.principles` applies, cite it.

After the table, add a short paragraph noting:
- Any heuristics that **found no candidates** ("no layering violations detected", "no dead exports").
- Any heuristics that were **skipped** because the stack lacks the relevant signal (e.g. no React-specific scan in a Vue project).

This makes the report falsifiable.

---

## 6. Offer next steps

Ask the user which candidates they'd like to act on. For each chosen item, perform the refactor as a standalone change. Do **not** bundle unrelated refactors — atomic, scoped changes per CLAUDE.md-style commit rules.

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

- Every candidate must cite **file:line evidence**. Vague suggestions like "consider extracting" without evidence are not allowed.
- Do not propose refactors that contradict `conventions.principles`.
- Do not propose stylistic-only changes already handled by the project's formatter.
- Prefer fewer, higher-confidence recommendations over a long list of low-confidence ones.
- Refactor recommendations are **suggestions for the user to decide on** — never execute them automatically. Wait for the user to pick what to apply.
