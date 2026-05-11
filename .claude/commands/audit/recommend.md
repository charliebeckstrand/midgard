# Recommend Audits

TRIGGER when: the user asks to recommend, suggest, or identify audits; asks what should be checked, what's not being audited, what audit would help here, what gates are missing.

You are the **meta-skill** for the `audit/` namespace. You scan the project to find gaps in its quality gates and recommend either (a) new audit skills to add under `.claude/commands/audit/`, or (b) one-off audit runs the user could perform right now. You do **not** run the audits themselves — concrete audits live in sibling skills like `audit/a11y.md`.

## Arguments

$ARGUMENTS

Recognized hints:
- A package name or path → narrow recommendations to that scope.
- A category from section 4 → only recommend audits from that category.
- No arguments → full scan, all categories.

---

## 1. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing or stale, invoke `/discover --quiet` and re-read.

Pull these fields:

- `packages[*]` — full set; you'll filter audits by what the stack supports.
- `packages[*].framework`, `packages[*].linter`, `packages[*].testRunner`, `packages[*].isFrontend` — drives which categories apply.
- `preCommit.tool`, `preCommit.gates` — gates that already run locally.
- `ci.provider`, `ci.jobs` — gates that already run in CI.
- `conventions.principles` — declared rules; an unenforced rule is a strong audit candidate.
- `conventions.vocabularyGlossary` — use the project's terms in user-facing output.

---

## 2. Inventory existing audits

List `.claude/commands/audit/*.md` (excluding this file). For each, capture:

- Skill name and trigger.
- What it audits (parse the body's first paragraph and the "What it checks" section).
- Whether it's wired into any pre-commit or CI gate.

Anything already present **must not** be re-recommended as new — but it **can** be recommended as a one-off run if the gate is missing.

---

## 3. Inventory existing gates

From the profile:

- **Pre-commit gates**: `preCommit.gates`. Note which checks already run locally.
- **CI jobs**: `ci.jobs`. Note which checks already run in CI.
- **Linter rules**: read the project's linter config (`biome.json`, `.eslintrc*`, `eslint.config.*`). Capture which rule families are enabled — a strict lint config covers many audit categories for free.
- **Type config**: read root and per-package `tsconfig*.json`. Capture `strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` — these collapse several "type tightness" audit needs.

A category that is **already covered end-to-end** (lint + CI gate) is not a high-priority recommendation. A category that's partially covered (e.g. lint catches it locally but no CI gate exists) is medium priority. A category that's uncovered is high priority.

---

## 4. Catalog of audit categories

Each entry is a **lens**, not a checklist. Skip entries the discovered stack does not support.

| Category | Typical concrete audits |
| --- | --- |
| **Accessibility** | a11y static analysis on frontend components; ARIA correctness; color-contrast against design tokens; reduced-motion compliance |
| **Dependency hygiene** | dead exports; orphan files (no importer, no entry); circular imports; layering / dependency-direction rules between packages |
| **Type tightness** | unjustified `any`/`unknown`; unjustified `as` casts; unjustified `@ts-ignore`/`@ts-expect-error`; missing `noUncheckedIndexedAccess` consequences |
| **Bundle / performance** | per-route bundle size budgets; heavy-deps audit; code-split boundaries; tree-shake-blocking re-exports |
| **Security** | committed secrets; vulnerable deps (lockfile audit); unsafe sinks (dangerouslySetInnerHTML, eval, exec) |
| **Test coverage** | uncovered critical paths; tests weakened in recent diffs; missing tests for new public API |
| **Commit / PR hygiene** | non-atomic commits; commit-message convention drift; PR-description requirements |
| **CI hygiene** | missing gates; cache misconfiguration; parallelism gaps; flaky-job tracking |
| **Documentation** | undocumented public API; stale README; CLAUDE.md / AGENTS.md drift versus actual conventions |
| **Design system** | recipe / token usage drift; orphan tokens; components that bypass the variant system |
| **Internationalization** | hardcoded user-facing strings; missing translations; locale-dependent formatting outside the i18n layer |

Use `packages[*].framework` and `packages[*].isFrontend` to filter:

- Frontend-only categories (Accessibility, i18n) require at least one package with `framework: react` or `next`.
- Design-system audits require at least one package with a `tokensDir`.
- TS-only audits (type tightness) require TypeScript in devDeps.
- Next-only audits (server/client boundary, route-level bundle size) require at least one package with `framework: next`.

---

## 5. Match principles to gaps

Walk `conventions.principles` from the profile. For each principle, ask: **does an automated check enforce this today?**

- "Shared packages do not depend on app code" → covered by a layering audit. If none exists in `audit/`, this is a top candidate.
- "Tests must not be skipped or weakened" → partially covered by `/code-review`, but only on staged diffs. A CI gate would close the loop.
- "Atomic commits" → no automated enforcement is possible at the linter level; either propose a commit-message audit at PR-time or note this as a "human-only" rule and skip.

A principle without enforcement is a stronger recommendation than a generic category gap.

---

## 6. Score and rank

For each candidate audit:

- **Impact** — how much risk it removes. Principles-enforcing audits and security audits start at High; documentation drift starts at Low.
- **Effort** — Low (purely lint config), Medium (new audit skill with static analysis), High (requires new tooling or infrastructure).
- **Coverage delta** — how much new coverage this adds beyond existing gates (0–100%). Low delta = de-prioritize.

Compute Priority = (Impact × Coverage delta) / Effort. Rank descending.

---

## 7. Present recommendations

Output a single ranked table:

| Name | Target | Rule it would enforce | Why now | Effort | Priority | Form |
| --- | --- | --- | --- | --- | --- | --- |
| `audit/dep-direction` | packages with `framework: library` | "shared packages never depend on app code" (`CLAUDE.md`) | currently unenforced; ad-hoc inspection only | Medium | High | new skill |
| `audit/dead-code` | all TS packages | dead exports & orphan files | linter catches unused imports but not unused exports; no CI gate | Low | Medium | new skill |
| `audit/atomic-commits` | repo-wide | "each commit is one logical change" (`CLAUDE.md`) | no enforcement today | Medium | Medium | PR-time check |

Column rules:

- **Name** — proposed path (e.g. `audit/dep-direction`), or `one-off run` if recommending a single execution of an existing audit.
- **Target** — which packages or files the audit applies to (use profile vocabulary).
- **Rule it would enforce** — quote or paraphrase the principle / common-sense rule, citing the source when it's a declared principle.
- **Why now** — concrete reason this matters today (current gap, recent incident, declared principle without enforcement).
- **Effort** — Low / Medium / High.
- **Priority** — Low / Medium / High.
- **Form** — `new skill` (author a new file under `audit/`), `one-off run` (run an existing skill now), or `lint rule` (achievable by enabling a linter rule rather than a new skill).

After the table, add a short paragraph noting:
- Audits the project **already has** (so the user can see the baseline).
- Categories that found **no gaps** ("type tightness already enforced by `strict: true` + CI typecheck").
- Categories that were **skipped** because the stack doesn't support them ("no frontend packages — accessibility category skipped").

---

## 8. Offer next steps

Ask the user which recommendations to act on. For each:

- **`new skill`** → ask whether to draft it now. If yes, draft a new skill file in `audit/` modeled on `audit/a11y.md`'s shape (or whichever existing audit most closely matches).
- **`one-off run`** → invoke the existing audit skill immediately with the suggested scope.
- **`lint rule`** → propose the exact config diff; let the user apply it.

Do **not** automatically wire new audits into pre-commit or CI without explicit user approval — those changes touch shared developer workflow.

---

## Worked example (fabricated)

Imagine a profile with:
- `packages[*].framework`: `react`, `react`, `library`.
- `conventions.principles`: includes "shared packages never depend on app code".
- `preCommit.gates`: `["lint"]`.
- `ci.jobs`: `["lint", "test", "build"]`.
- `audit/` contains only `a11y.md`.

A reasonable output:

| Name | Target | Rule it would enforce | Why now | Effort | Priority | Form |
| --- | --- | --- | --- | --- | --- | --- |
| `audit/dep-direction` | all packages | "shared packages never depend on app code" | declared principle, no automated check exists | Medium | High | new skill |
| `audit/dead-code` | TS packages | "unused exports indicate stale API" | no current gate | Low | High | new skill |
| `one-off run /audit:a11y` | `apps/web`, `apps/admin` | a11y on changed components | a11y skill exists but never run on apps | Low | Medium | one-off run |
| `audit/type-tightness` | TS packages | no unjustified `any`/`as` casts | partially covered by linter; no CI gate | Medium | Medium | new skill |

Plus a note: *`audit/a11y` exists. Type-tightness is partially covered by `noImplicitAny: true`; the remaining gap is `as` casts and `@ts-ignore`. No commit-message audit recommended — the project's principles do not declare a convention.*

---

## Important

- Read existing audits **every run** — the namespace is meant to grow; never recommend something that's already there.
- Never recommend an audit the discovered stack cannot run (e.g. a11y on a pure Node library).
- Distinguish **new skill** from **one-off run** clearly. The first grows the namespace; the second uses what's already there.
- Cite specific files when explaining gaps — vague claims like "tests are weak" are unhelpful.
- This skill **recommends**; it does not author audits or modify CI. The user decides what to act on.
