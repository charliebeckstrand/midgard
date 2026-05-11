---
name: postmortem
description: "Pre-commit triage. After a task is reported complete and before `git commit`, read the diff, classify the change, and route to the smallest set of downstream skills the change warrants — often `/code-review`, sometimes `/audit:a11y`, `/tests:compose`, `/simplify` (when present), or `/security-review` (when present), sometimes nothing at all. Replaces the unconditional 'always run `/code-review` before every commit' default with a decision that fits the change. MANDATORY TRIGGERS: '/postmortem', 'postmortem', 'task complete', 'ready to commit', 'wrap up', 'finish up'. ALWAYS run before executing `git commit` from inside Claude — do not commit until postmortem returns PROCEED or every chained downstream skill returns PASS. Supersedes `/code-review`'s own pre-commit trigger: invoke `/code-review` only when this skill routes to it."
---

# Postmortem

Run after a task is reported complete and before `git commit`. Read the diff, classify the change, and pick the smallest set of downstream skills the change needs.

This replaces the unconditional pre-commit `/code-review` with a triage step. Trivial diffs (docs, comments, formatting, dependency-free renames) proceed directly to commit. Risky diffs (logic, type surface, multi-file, new dependencies, secrets, auth, UI components) chain through the matching downstream skills first.

## What it decides

- **PROCEED** — commit without further checks. The diff is mechanical or non-functional.
- **REVIEW** — chain into `/code-review` because the diff carries logical risk.
- **REVIEW + EXTRAS** — chain into one or more of `/audit:a11y`, `/tests:compose`, `/simplify`, `/security-review`, then `/code-review`, in that order.
- **BLOCK** — refuse to commit and surface the reason (e.g. half-finished work, debug code, secrets in the diff).

## Steps

### 0. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing or stale, invoke `/repo:discover --quiet` and re-read.

From the profile, capture:

- `packages[*].path` and `packages[*].name` — used to map changed files to packages and downstream skill scope.
- `packages[*].componentsDir` — used to detect new or modified frontend components.
- `packages[*].isFrontend` — used to gate the a11y route to frontend packages.
- `conventions.principles` — observed when classifying scope creep, single-use abstraction, or speculative generality.

Security-sensitive paths are not in the schema. Detect them inline against path patterns (`.env*`, `auth/`, `permissions/`, etc.) — never invent a profile field.

### 1. Collect the diff

```bash
git diff --cached --name-only
git diff --cached
```

If nothing is staged, fall back to `git diff HEAD --name-only` and `git diff HEAD`, and tell the user you're inspecting unstaged changes because nothing is staged.

If the diff is empty, stop — there's nothing to triage.

### 2. Classify the change

Apply these signals against the diff. Collect every match — multiple signals often apply to one diff.

| Signal | Detection | Routes to |
|---|---|---|
| Secrets / auth / permissions touched | Path or hunk hits on `.env*`, `auth/`, `permissions/`, API keys, JWT, OAuth, session/cookie handling, RBAC | `/security-review` |
| New or modified frontend component | New file under `packages[*].componentsDir`, or a modified `.tsx` / `.jsx` / `.vue` / `.svelte` that exports a component, in a package where `isFrontend` is true | `/audit:a11y` |
| New logic without matching tests | A new non-trivial function or branch with no corresponding `*.test.*` / `*.spec.*` change in the same diff | `/tests:compose` |
| Smells like over-engineering | Single-use abstraction, speculative generic, premature interface, unused parameter, dead branch | `/simplify` |
| Logic edit, type surface change, multi-file change, new dependency | Conditional logic edited, exported type changed, ≥3 source files modified, `package.json` dependency added | `/code-review` |
| Docs / comments / formatting only | Diff hits only `*.md`, comment lines, or whitespace; no executable lines changed | PROCEED |
| Dependency-free rename | Symbol renamed with all call sites updated, no behavior change | PROCEED |
| Debug code, half-finished work, secrets in diff | `console.log`, `debugger`, `// TODO: revert`, commented-out blocks, real credentials | BLOCK |

`/simplify` and `/security-review` are user-level skills, not project skills under `.claude/commands/`. When the harness does not expose them, fold their concerns into `/code-review` (note the simplification or security angle as a finding for `/code-review` to scrutinize) and drop them from the chain.

A diff can match several rows. Union the matched handoffs, then order them: extras (`/security-review`, `/audit:a11y`, `/tests:compose`, `/simplify`) first, then `/code-review`. `/code-review` is always last in the chain, never parallel — it reviews the change as-is, including any edits the extras prompt.

### 3. Decide

Print the verdict in one line:

```
<N> files changed · classification: <PROCEED|REVIEW|REVIEW+EXTRAS|BLOCK> · chain: <skill-1> → <skill-2> → …
```

Then one of:

- **PROCEED** — state the reason in one sentence (`docs-only`, `whitespace-only`, `mechanical rename with all call sites updated`). Hand control back to the user.
- **REVIEW** or **REVIEW + EXTRAS** — invoke the chained skills in order. Each must return PASS (or the user explicitly waives a finding) before the next runs.
- **BLOCK** — list every blocking observation with `file:line` citations. Refuse to chain further. Do not run `git commit` until the user resolves or explicitly overrides.

### 4. Hand off

For each skill in the chain, invoke it and wait for its verdict. If any returns BLOCK and the user has not overridden, stop the chain — `git commit` does not run.

When the chain completes with every step PASS (or the original verdict was PROCEED), state that the change is ready to commit. Do not run `git commit` yourself unless the user explicitly asked you to commit.

## Worked examples (fabricated)

- **README typo fix** — one file, `*.md`, no code paths. Verdict: PROCEED. No chain.
- **Rename `formatCurrency` → `formatMoney` across 4 files** — symbol rename, every call site updated, no behavior change. Verdict: PROCEED.
- **New `SizeProvider` context with `useSize` hook** — new logic, no tests in diff, new file under `componentsDir`. Verdict: REVIEW + EXTRAS. Chain: `/tests:compose` → `/audit:a11y` → `/code-review`.
- **Patch a JWT verification edge case in `auth/verifyToken.ts`** — auth path touched, logic edit. Verdict: REVIEW + EXTRAS. Chain: `/security-review` → `/code-review`.
- **Introduce `WidgetFactory<T>` with a single caller** — speculative generic abstraction. Verdict: REVIEW + EXTRAS. Chain: `/simplify` → `/code-review`.
- **`console.log("debug:", user)` left in a handler** — debug code in diff. Verdict: BLOCK. Cite `path/to/file.ts:42`. Commit refused.

## Rules

- Never run `git commit` while any downstream skill in the chain has open findings.
- Never widen the chain "to be safe" — every extra skill must be justified by a matched signal. Padding the chain wastes the user's time and trains them to ignore the verdict.
- Never skip `/code-review` when any logic edit, type surface change, multi-file change, or new dependency is present. PROCEED is reserved for diffs with no executable change.
- Never auto-commit. The chain returns control to the user; the user decides when to commit.
- Don't pad the verdict. PROCEED is one sentence. BLOCK is the findings list and nothing else.
- If the profile doesn't expose a field needed to classify (e.g. no `componentsDir`), fall back to `git grep` on path conventions — never guess.
