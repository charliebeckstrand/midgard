# postmortem

TRIGGER when: a task is reported complete and a non-empty diff exists; the user says "wrap up", "finish up", "task complete", or "ready to commit". Always run before `git commit` from inside Claude — do not commit until this skill returns PROCEED or every chained downstream skill returns PASS.

Run after a task is reported complete and before `git commit`. Read the diff, classify the change, and pick the smallest set of downstream skills the change needs.

This is the triage step before commit. Trivial diffs (docs, comments, formatting, dependency-free renames) proceed directly to commit. Risky diffs (logic, type surface, multi-file, new dependencies, secrets, auth, UI components) chain through the matching downstream skills first. `/typescript:review` is the default logic-risk gate for any diff with `.ts` / `.tsx` changes — this is a TypeScript codebase, so TS-aware review subsumes generic code review.

## What it decides

- **PROCEED** — commit without further checks. The diff is mechanical or non-functional.
- **REVIEW** — chain into `/typescript:review` because the diff carries logical risk.
- **REVIEW + EXTRAS** — chain into one or more of `/audit:a11y`, `/tests:compose`, `/simplify`, `/security-review`, then `/typescript:review`, in that order.
- **BLOCK** — refuse to commit and surface the reason (e.g. half-finished work, debug code, secrets in the diff).

## Steps

### 0. Ensure the Manifest exists

Read `./manifest.json`. If the file is missing, silently invoke `/repo:manifest --quiet` to create it, then re-read. Postmortem is a canonical creator alongside `/premortem` — never tell the user it's loading or generating the manifest.

From the manifest, capture:

- `packages[*].path` and `packages[*].name` — used to map changed files to packages and downstream skill scope.
- `packages[*].componentsDir` — used to detect new or modified frontend components.
- `packages[*].primitivesDir`, `packages[*].hooksDir`, `packages[*].testHelpersDir`, `packages[*].testLayout` — used to locate reference siblings for the format-alignment check in 3a.
- `packages[*].isFrontend` — used to gate the a11y route to frontend packages.
- `conventions.principles` — observed when classifying scope creep, single-use abstraction, or speculative generality.

Security-sensitive paths are not in the schema. Detect them inline against path patterns (`.env*`, `auth/`, `permissions/`, etc.) — never invent a manifest field.

### 1. Collect the diff

```bash
git diff --cached --name-only
git diff --cached
```

If nothing is staged, fall back to `git diff HEAD --name-only` and `git diff HEAD`, and tell the user you're inspecting unstaged changes because nothing is staged.

If the diff is empty, stop — there's nothing to triage.

### 2. Refresh the Manifest if invalidated

Inspect the diff's file list against the **canonical invalidator list in `/repo:manifest` → "Freshness invalidators"**. That list is authoritative; do not duplicate it here.

If any invalidator path appears in the diff, silently invoke `/repo:manifest --quiet`. After it returns, check `git status --short manifest.json`:
- If `manifest.json` is modified, run `git add manifest.json` so it ships in the same commit as the change that invalidated it.
- If `manifest.json` is unchanged, the invalidation signal didn't materially alter the schema; proceed.

If no invalidator matches, skip this step. The Manifest stays stable across logic-only diffs and never refreshes on every commit.

### 3. Classify the change

Apply these signals against the diff. Collect every match — multiple signals often apply to one diff.

| Signal | Detection | Routes to |
|---|---|---|
| Secrets / auth / permissions touched | Path or hunk hits on `.env*`, `auth/`, `permissions/`, API keys, JWT, OAuth, session/cookie handling, RBAC | `/security-review` |
| New or modified frontend component | New file under `packages[*].componentsDir`, or a modified `.tsx` / `.jsx` that exports a component, in a package where `isFrontend` is true | `/audit:a11y` |
| New logic without matching tests | A new non-trivial function or branch with no corresponding `*.test.*` / `*.spec.*` change in the same diff | `/tests:compose` |
| Smells like over-engineering | Single-use abstraction, speculative generic, premature interface, unused parameter, dead branch | `/simplify` |
| Logic edit, type surface change, multi-file change, new dependency | Conditional logic edited, exported type changed, ≥3 source files modified, `package.json` dependency added | `/typescript:review` |
| Docs / comments / formatting only | Diff hits only `*.md`, comment lines, or whitespace; no executable lines changed | PROCEED |
| Dependency-free rename | Symbol renamed with all call sites updated, no behavior change | PROCEED |
| Debug code, half-finished work, secrets in diff | `console.log`, `debugger`, `// TODO: revert`, commented-out blocks, real credentials | BLOCK |

`/simplify` and `/security-review` are user-level skills, not project skills under `.claude/commands/`. When the harness does not expose them, fold their concerns into `/typescript:review` (note the simplification or security angle as a finding for `/typescript:review` to scrutinize) and drop them from the chain.

A diff can match several rows. Union the matched handoffs, then order them: extras (`/security-review`, `/audit:a11y`, `/tests:compose`, `/simplify`) first, then `/typescript:review`. `/typescript:review` is always last in the chain, never parallel — it reviews the change as-is, including any edits the extras prompt.

### 3a. Verify packages/ui format alignment

Skip this step when no staged file lives under `packages/ui`. Otherwise, for each staged source file in that package, detect its kind and read **one** reference sibling of the same kind, then compare structural patterns. The point is to confirm the staged file matches the established format of existing code — not to second-guess the change's behavior.

| Kind | Path predicate | Reference picked from |
|---|---|---|
| component | under `componentsDir` | a random sibling `componentsDir/<other>/<other>.tsx` (the main component file in another component folder) |
| primitive | under `primitivesDir` | a random sibling `primitivesDir/<other>.tsx` |
| hook | under `hooksDir`, filename starts with `use-` | a random sibling `hooksDir/use-<other>.ts` |
| test | under `testHelpersDir`, matches `*.test.{ts,tsx}` | a random sibling test in the same mirrored subdir (`components/`, `primitives/`, `hooks/`) |

Exclude files already in the diff when picking the reference. Read both staged file and reference. Compare:

- **Filename + export** — matches `<name>.tsx` / `<name>-<part>.tsx` / `use-<name>.ts` per CLAUDE.md, and the exported symbol's PascalCase (or `useCamelCase`) form matches the filename. Violation → **BLOCK** (the lefthook `filenames` gate and `component-filename-boundary.test.ts` would fail anyway; rejecting earlier saves the round-trip).
- **Import grouping** — same external / internal / relative ordering and same alias style as the reference.
- **Top-level structure** — types lifted to `types.ts`, hooks lifted to `use-<name>.ts`, recipes lifted to `variants.ts` when the reference follows that split; same compound / sub-part file layout as the reference (e.g. `<name>-<part>.tsx` files when the reference has them).
- **Component shape** — same `'use client'` discipline, same `forwardRef` / polymorphic pattern, same `data-slot` / `data-part` marker convention as the reference.
- **Test conventions** — same `describe` / `it` nesting depth, same render helper (project-local `renderWithProviders` vs raw `render`), same assertion style, same mock pattern as the reference test.

Drift findings fold into the chain as `format-drift` notes carried into `/typescript:review` (or `/ui:audit` if that's already in the chain). Filename / export-name violations BLOCK.

If the manifest's directory field for a kind is `null` (e.g. `primitivesDir: null`), skip that kind silently — there's no reference to sample.

### 4. Decide

Print the verdict in one line:

```
<N> files changed · classification: <PROCEED|REVIEW|REVIEW+EXTRAS|BLOCK> · chain: <skill-1> → <skill-2> → …
```

Then one of:

- **PROCEED** — state the reason in one sentence (`docs-only`, `whitespace-only`, `mechanical rename with all call sites updated`). Hand control back to the user.
- **REVIEW** or **REVIEW + EXTRAS** — invoke the chained skills in order. Each must return PASS (or the user explicitly waives a finding) before the next runs.
- **BLOCK** — list every blocking observation with `file:line` citations. Refuse to chain further. Do not run `git commit` until the user resolves or explicitly overrides.

### 5. Hand off

For each skill in the chain, invoke it and wait for its verdict. If any returns BLOCK and the user has not overridden, stop the chain — `git commit` does not run.

When the chain completes with every step PASS (or the original verdict was PROCEED), state that the change is ready to commit. Do not run `git commit` yourself unless the user explicitly asked you to commit.

## Worked examples (fabricated)

- **README typo fix** — one file, `*.md`, no code paths. Verdict: PROCEED. No chain.
- **Rename `formatCurrency` → `formatMoney` across 4 files** — symbol rename, every call site updated, no behavior change. Verdict: PROCEED.
- **New `SizeProvider` context with `useSize` hook** — new logic, no tests in diff, new file under `componentsDir`. Verdict: REVIEW + EXTRAS. Chain: `/tests:compose` → `/audit:a11y` → `/typescript:review`.
- **Patch a JWT verification edge case in `auth/verifyToken.ts`** — auth path touched, logic edit. Verdict: REVIEW + EXTRAS. Chain: `/security-review` → `/typescript:review`.
- **Introduce `WidgetFactory<T>` with a single caller** — speculative generic abstraction. Verdict: REVIEW + EXTRAS. Chain: `/simplify` → `/typescript:review`.
- **`console.log("debug:", user)` left in a handler** — debug code in diff. Verdict: BLOCK. Cite `path/to/file.ts:42`. Commit refused.

## Rules

- Never run `git commit` while any downstream skill in the chain has open findings.
- Never widen the chain "to be safe" — every extra skill must be justified by a matched signal. Padding the chain wastes the user's time and trains them to ignore the verdict.
- Never skip `/typescript:review` when any logic edit, type surface change, multi-file change, or new dependency is present. PROCEED is reserved for diffs with no executable change.
- Never auto-commit. The chain returns control to the user; the user decides when to commit.
- Don't pad the verdict. PROCEED is one sentence. BLOCK is the findings list and nothing else.
- If the manifest doesn't expose a field needed to classify (e.g. no `componentsDir`), fall back to `git grep` on path conventions — never guess.