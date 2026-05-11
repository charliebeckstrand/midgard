# Recommend Skills

TRIGGER when: the user asks to recommend, suggest, or identify new project skills to add to `.claude/commands/`; asks what's missing from the skill catalog, what slash commands the project should have next, where the namespaces are sparse, or which declared conventions still lack an automated skill.

You are the **meta-skill** for the `skill/` namespace. You scan the existing catalog under `.claude/commands/`, compare it against the project's stack and declared conventions, and recommend either (a) new skills to author via `/skill:compose`, or (b) extensions to existing skills that would close the gap more cheaply. You do **not** author the recommended skills yourself — `/skill:compose` owns scaffolding.

## Arguments

$ARGUMENTS

Recognized hints:
- A namespace (`audit`, `refactor`, `ui`, `skill`) → narrow recommendations to that namespace.
- A category from section 4 → only recommend skills from that category.
- No arguments → full scan, all categories.

---

## 1. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing or stale, invoke `/discover --quiet` and re-read.

Pull these fields:

- `packages[*]` — full set; you filter candidates by what the stack supports.
- `packages[*].framework`, `packages[*].linter`, `packages[*].testRunner`, `packages[*].isFrontend` — drives which categories apply.
- `packages[*].componentsDir`, `packages[*].tokensDir` — required for design-system and component scaffolding categories.
- `preCommit.tool`, `preCommit.gates`, `ci.provider`, `ci.jobs` — gates already wired; a skill that duplicates an existing gate is a weak recommendation.
- `conventions.principles` — declared rules that should weight your recommendations. An unenforced principle is a strong candidate for a new skill.
- `conventions.mandatorySkills` — declared bindings the project already commits to; never propose anything already listed here.
- `conventions.vocabularyGlossary` — use the project's terms in user-facing output.

---

## 2. Inventory existing skills

Glob `.claude/commands/**/*.md`. For each file, capture:

- Path and namespace (top-level vs. `<namespace>/<leaf>`).
- First heading and the `TRIGGER` line.
- Whether the skill is bound in the `## Skills` section of `CLAUDE.md`.

Anything already present **must not** be re-recommended as new — but it **can** be recommended as an **extension** when the existing skill almost fits and is missing a discrete capability (a new argument hint, a new heuristic, a new handoff).

---

## 3. Inventory bindings and adjacent gates

From the profile and from `CLAUDE.md`:

- **CLAUDE.md `## Skills` bindings** — a skill present in the catalog but unbound is a hygiene problem `/audit:meta` already flags; do not re-recommend it as new.
- **Pre-commit gates** — `preCommit.gates`. A skill that re-implements an existing pre-commit check is a weak recommendation.
- **CI jobs** — `ci.jobs`. Same rule.
- **Existing recommenders** — `/audit:recommend`, `/refactor:recommend`, `/ui:component-recommend`, and this skill itself form the meta-recommender layer. Recommending another recommender requires a distinct lens that none of these cover.

A category that is **already covered end-to-end** (skill exists, bound in `CLAUDE.md`, wired into a gate where applicable) is not a candidate. A category that is **partially covered** (skill exists but no binding, or binding but no gate) is a candidate for extension, not a new skill.

---

## 4. Catalog of skill categories

Each entry is a **lens**, not a checklist. Skip categories the discovered stack does not support.

| Category | Typical concrete skills |
| --- | --- |
| **Discovery & profiling** | project profile generator; per-package convention sniffer; dependency-graph snapshot |
| **Planning & scoping** | task brainstormer; design-doc drafter; spec-from-issue extractor |
| **Multi-agent reasoning** | council; debate; premortem; postmortem |
| **Pre-commit gates** | staged-diff reviewer; simplifier; commit-message linter; secret scanner |
| **Audit** | a11y; type tightness; dead-code; layering; bundle size; i18n drift; design-token drift |
| **Refactor** | duplication extractor; single-use inliner; naming normalizer; long-file splitter |
| **Authoring / scaffolding** | UI component; test file; API route; database migration; new package |
| **Recommender (catalog-meta)** | new audits to add; new refactors to apply; new components to build; new skills to compose |
| **Workflow utilities** | loop runner; PR-watcher; release-notes generator; CLAUDE.md initializer |
| **Project-specific** | a skill that encodes a declared principle in `conventions.principles` and has no automated check today |

Filter rules using profile fields:

- Frontend-only categories (UI scaffolding, a11y, design-token audits, i18n) require at least one package with `framework: react` or `next` (and `componentsDir` or `tokensDir` set for design-token work).
- Next-only candidates (server/client boundary linter, route-bundle audit) require at least one package with `framework: next`.
- TypeScript-only candidates (type-tightness audits, ts-config drift) require TypeScript in devDeps.
- Test-runner-specific scaffolding (`vitest` vs. `jest` snapshots) requires a matching `testRunner` on at least one package.

---

## 5. Match principles and namespace shape to candidates

Walk `conventions.principles` from the profile. For each principle, ask: **does any existing skill enforce or operationalize this today?**

- Principle: "Shared packages must not import from application code." → if no `audit/layering` or `refactor:recommend` heuristic covers this, propose `audit/layering` as a new skill.
- Principle: "Each commit represents one logical change." → if no commit-time skill enforces atomicity, propose `audit/atomic-commits` (PR-time, since pre-commit cannot judge a single staged diff against this rule).
- Principle: "Extend before inventing." → already operationalized by `/skill:compose`'s sample-the-catalog step; do not duplicate.

Also walk the namespaces:

- A namespace with **one** skill is a sparseness signal; ask whether a sibling would be earned (e.g. `refactor/` with only `recommend.md` could grow `refactor/apply.md` once duplication-extraction is repeatable).
- A namespace with **zero** skills but the project has the matching surface (e.g. no `migration/` namespace despite a Drizzle schema in the profile) is a strong candidate.

A principle without enforcement is a stronger recommendation than a generic category gap.

---

## 6. Score and rank

For each candidate:

- **Impact** — Low / Medium / High. Promote candidates that enforce a declared principle, close a real pre-commit/CI gap, or unlock a workflow the project repeats often.
- **Effort** — Low / Medium / High. Low = a one-file skill that wraps an existing tool; Medium = a skill with its own heuristics; High = a skill that requires new infrastructure (a new cache file, a new CI job, a new sub-agent topology).
- **Coverage delta** — how much new coverage this adds beyond existing skills and gates (0–100%). A skill whose heuristics duplicate an existing audit gets a low delta.

Compute Priority = (Impact × Coverage delta) / Effort. Rank descending.

If a candidate corresponds to a `conventions.principles` entry, **bump Impact one notch**.

---

## 7. Present recommendations

Output a single ranked table:

| Name | Namespace | Trigger it would handle | Why now | Effort | Priority | Form |
| --- | --- | --- | --- | --- | --- | --- |
| `audit/layering` | `audit` | "check shared packages don't depend on app code" | declared principle, no automated enforcement today | Medium | High | new skill |
| `refactor/apply` | `refactor` | "apply the refactor I picked from `/refactor:recommend`" | recommender exists; execution is ad-hoc | Medium | Medium | new skill |
| `skill/compose` argument: `--from-principle` | `skill` | "scaffold a skill that enforces this principle from `CLAUDE.md`" | extension would let `/skill:compose` seed from a declared principle | Low | Medium | extension to existing |

Column rules:

- **Name** — proposed path (`<namespace>/<leaf>` or top-level slug), or the name of the skill being extended.
- **Namespace** — `audit`, `refactor`, `ui`, `skill`, or `top-level`.
- **Trigger it would handle** — the user phrasing that would invoke the new skill. Quote in the user's voice.
- **Why now** — concrete reason this matters today (declared principle without enforcement, recurring ad-hoc workflow, namespace sparseness with the matching project surface).
- **Effort** — Low / Medium / High.
- **Priority** — Low / Medium / High.
- **Form** — `new skill` (author a new file via `/skill:compose`), `extension to existing` (add a section, argument, or handoff to an existing skill), or `lint / config change` (achievable by tightening configuration rather than a new skill).

After the table, add a short paragraph noting:
- Skills the project **already has** in the touched namespaces (so the user sees the baseline).
- Categories that found **no gaps** ("planning category fully covered by `/brainstorm` + `/council` + `/premortem`").
- Categories that were **skipped** because the stack doesn't support them ("no Next package — server/client boundary skill skipped").

This makes the recommendation set falsifiable.

---

## 8. Offer to compose

Ask the user which recommendations to act on. For each:

- **`new skill`** → invoke `/skill:compose <name> "<one-line intent>"` so the seed flows straight into the compose skill's step 1. Do not draft the file inline — `/skill:compose` enforces the catalog's template and self-audits via `/audit:meta`.
- **`extension to existing`** → open the existing skill, propose the diff, and confirm before applying. Extensions to shared skills follow the same rule as shared components in `CLAUDE.md`: never modify without explicit approval.
- **`lint / config change`** → propose the exact diff to the relevant config file and let the user apply it.

Do **not** automatically wire newly-composed skills into pre-commit or CI; those changes touch shared developer workflow and need user approval.

---

## Worked example (fabricated)

Imagine a profile with:
- `packages[*].framework`: `react`, `next`, `library`.
- `conventions.principles`: includes "Shared packages must not import from application code." and "Each commit represents one logical change."
- `preCommit.gates`: `["lint", "type"]`.
- `ci.jobs`: `["lint", "type", "test", "build"]`.
- `.claude/commands/` contains `audit/a11y.md`, `audit/meta.md`, `audit/recommend.md`, `refactor/recommend.md`, `ui/component.md`, `ui/component-recommend.md`, `skill/compose.md`, plus the standard top-level skills.

A reasonable output:

| Name | Namespace | Trigger it would handle | Why now | Effort | Priority | Form |
| --- | --- | --- | --- | --- | --- | --- |
| `audit/layering` | `audit` | "check shared packages don't depend on app code" | declared principle has no automated check; affects 3 packages | Medium | High | new skill |
| `audit/atomic-commits` | `audit` | "flag commits that bundle unrelated changes" | declared principle, PR-time check possible | Medium | Medium | new skill |
| `refactor/apply` | `refactor` | "apply the refactor I picked from `/refactor:recommend`" | `refactor/` namespace has only `recommend.md`; execution is ad-hoc | Medium | Medium | new skill |
| `migration/scaffold` | `migration` (new) | "scaffold a Drizzle migration for this schema change" | no namespace today; the project ships Drizzle and writes migrations by hand | High | Low | new skill |

Plus a note: *`audit/a11y`, `audit/meta`, `audit/recommend`, `refactor/recommend`, `ui/component`, `ui/component-recommend`, and `skill/compose` already exist. Recommender category fully covered. No backend-only audits proposed — the discovered stack has no server-only package that would justify them.*

---

## Important

- Read the catalog **every run** — the namespace is meant to grow; never recommend something that's already there. Re-globbing is cheap; trusting memory is not.
- Never recommend a skill the discovered stack cannot run (e.g. a Next route-bundle audit on a pure library workspace).
- Distinguish **new skill** from **extension to existing** clearly. A new file under `.claude/commands/` is a different operation from a section added to an existing skill, and `/audit:meta` treats them differently.
- Cite specific declared principles when explaining gaps — vague claims like "the catalog feels thin here" are not evidence.
- This skill **recommends**; it does not compose. Hand off accepted recommendations to `/skill:compose`, and let that skill's self-audit gate the final scaffold.
