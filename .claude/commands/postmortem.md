# postmortem

TRIGGER when: the user signals completion ("wrap up", "finish up", "task complete", "ready to commit") and a non-empty diff exists. Always run before `git commit` from inside Claude — do not commit until this skill returns PROCEED or every chained downstream skill returns PASS.

Trivial diffs (docs, comments, formatting, dependency-free renames) proceed directly to commit. Risky diffs (logic, type surface, multi-file, new dependencies, secrets, auth, UI components) chain through the matching downstream skills first. `/typescript:review` is the default logic-risk gate for any diff with `.ts` / `.tsx` changes — this is a TypeScript codebase, so TS-aware review subsumes generic code review.

## What it decides

- **PROCEED** — commit without further checks. The diff is mechanical or non-functional.
- **FORMAT** — chain into `/typescript:format` alone. The diff touches `.ts` / `.tsx` but carries no logical risk; the format pass is the only gate.
- **REVIEW** — chain into `/typescript:format` then `/typescript:review` because the diff carries logical risk.
- **REVIEW + EXTRAS** — chain into `/typescript:format`, then one or more of `/audit:a11y`, `/tests:compose`, then `/typescript:review`, in that order.
- **BLOCK** — refuse to commit and surface the reason (half-finished work, debug code, secrets).

**Canonical sources cited by handle:**

- `[manifest-invalidators]` — defined at the bottom of this file. Cited by `/premortem`.

## Steps

### 0. Manifest

Read `./manifest.json`. If missing, silently invoke `/repo:manifest --quiet`, then re-read.

Capture:

| Field | Use |
|---|---|
| `packages[*].path`, `packages[*].name` | map changed files to packages and downstream skill scope |
| `packages[*].componentsDir` | detect new or modified frontend components |
| `packages[*].primitivesDir`, `packages[*].hooksDir`, `packages[*].testHelpersDir`, `packages[*].testLayout` | locate reference siblings for the format-alignment check in §3a |
| `packages[*].isFrontend` | gate the a11y route to frontend packages |
| `conventions.principles` | observed when classifying scope creep, single-use abstraction, speculative generality |

Security-sensitive paths aren't in the schema. Detect them inline against path patterns (`.env*`, `auth/`, `permissions/`) — never invent a manifest field.

### 1. Collect the diff

```bash
git diff --cached --name-only
git diff --cached
```

If nothing is staged, fall back to `git diff HEAD --name-only` and `git diff HEAD`; tell the user you're inspecting unstaged changes.

Empty diff → stop.

### 2. Refresh the Manifest if invalidated

Inspect the diff's file list. If any path matches `[manifest-invalidators]` (see *Reference* at the bottom), silently invoke `/repo:manifest --quiet`.

On error, surface and BLOCK — the manifest is a prerequisite, not best-effort. On success, check `git status --short manifest.json`:

- Modified → surface as a finding: tell the user the refresh updated `manifest.json` and recommend `git add manifest.json` so the schema ships with the change that invalidated it. Don't auto-stage; the user decides what enters the commit.
- Unchanged → the invalidation signal didn't materially alter the schema; proceed.

No invalidator match → skip this step. The manifest stays stable across logic-only diffs.

### 3. Classify the change

Apply these signals against the diff. Collect every match — a diff may match multiple rows.

| Signal | Detection | Routes to |
|---|---|---|
| Secrets / auth / permissions touched | Path or hunk hits on `.env*`, `auth/`, `permissions/`, API keys, JWT, OAuth, session/cookie handling, RBAC | `/typescript:review --angle=security` |
| New or modified frontend component | New file under `packages[*].componentsDir`, or modified `.tsx` / `.jsx` exporting a component, in a package where `isFrontend` is true | `/audit:a11y` |
| New logic without matching tests | A new exported function, or a new conditional with more than one branch, with no corresponding `*.test.*` / `*.spec.*` change in the diff | `/tests:compose` |
| Smells like over-engineering | Single-use abstraction, speculative generic, premature interface, unused parameter, dead branch | `/typescript:review --angle=simplification` |
| Logic edit, type surface change, multi-file change, new dependency | Conditional logic edited, exported type changed, ≥3 source files modified, `package.json` dependency added | `/typescript:review` |
| TS surface touched, no logical risk | `.ts` / `.tsx` modified but no row above matched (cosmetic rename of a local, JSDoc edit on a TS file, formatting drift) | `/typescript:format` |
| Docs / comments / formatting only | Diff hits only `*.md`, comment lines, or whitespace; no executable lines changed | PROCEED |
| Dependency-free rename | Symbol renamed with all call sites updated, no behavior change | PROCEED |
| Debug code, half-finished work, secrets in diff | `console.log`, `debugger`, `// TODO: revert`, commented-out blocks, real credentials | BLOCK |

Union the matched handoffs, then order them: `/typescript:format` first (whenever any `.ts` / `.tsx` is in the surface), then extras (`/audit:a11y`, `/tests:compose`), then `/typescript:review`. `/typescript:format` always runs ahead of extras and review so the downstream skills see formatted code — and so a format APPLIED verdict halts the chain for restage before the reviewer wastes effort. `/typescript:review` is always last, never parallel — it reviews the change as-is, including any edits the format pass and extras prompted. When multiple rows route to `/typescript:review` with `--angle=` flags, stack them on a single invocation (`/typescript:review --angle=security --angle=simplification`) rather than running the reviewer twice.

### 3a. Verify ui package format alignment

For each staged source file, find its containing package via `packages[*].path`. Skip the file when its package has no `componentsDir`, `primitivesDir`, or `hooksDir` set — the kind table below doesn't apply to non-library-shaped packages. Otherwise detect its kind and read **one** reference sibling of the same kind, then compare structural patterns — not behavior.

| Kind | Path predicate | Reference |
|---|---|---|
| component | under `componentsDir` | most-recently-modified sibling `componentsDir/<other>/<other>.tsx` (the main component file in another component folder) |
| primitive | under `primitivesDir` | most-recently-modified sibling `primitivesDir/<other>.tsx` |
| hook | under `hooksDir`, filename starts with `use-` | most-recently-modified sibling `hooksDir/use-<other>.ts` |
| test (`sibling` layout) | `*.{test,spec}.{ts,tsx}` under the package, excluding files inside `testHelpersDir` | most-recently-modified other test beside source under the same source directory |
| test (`mirror` layout) | same as above | most-recently-modified other test under the same `__tests__/<subdir>` (preserving the mirrored subdir, e.g. `components/`, `primitives/`, `hooks/`) |

Exclude files already in the diff when picking the reference. Read both staged file and reference. Compare:

- **Filename + export** — matches `<name>.tsx` / `<name>-<part>.tsx` / `use-<name>.ts` per CLAUDE.md, and the exported symbol's PascalCase (or `useCamelCase`) form matches the filename. Violation → **BLOCK** (the lefthook `filenames` gate and `component-filename-boundary.test.ts` would fail anyway; rejecting earlier saves the round-trip).
- **Import grouping** — same external / internal / relative ordering and same alias style as the reference.
- **Top-level structure** — types lifted to `types.ts`, hooks lifted to `use-<name>.ts`, recipes lifted to `variants.ts` when the reference follows that split; same compound / sub-part file layout (e.g. `<name>-<part>.tsx` files when the reference has them).
- **Component shape** — same `'use client'` discipline, same `forwardRef` / polymorphic pattern, same `data-slot` / `data-part` marker convention.
- **Test conventions** — same `describe` / `it` nesting depth, same render helper (project-local `renderWithProviders` vs raw `render`), same assertion style, same mock pattern.

Drift findings surface as advisory `format-drift` findings on this skill's own verdict output (alongside the classification line in §4). They don't BLOCK on their own — the user reads them and decides. Filename / export-name violations BLOCK.

If the manifest's directory field for a kind is `null` (e.g. `primitivesDir: null`), or `testLayout` is `null` for the test kind, skip that kind silently — no reference to sample.

### 4. Decide

Print the verdict in one line:

```
<N> files changed · classification: <PROCEED|FORMAT|REVIEW|REVIEW+EXTRAS|BLOCK> · chain: <skill-1> → <skill-2> → …
```

Then one of:

- **PROCEED** — state the reason in one sentence (`docs-only`, `whitespace-only`, `mechanical rename with all call sites updated`). Hand control back to the user.
- **FORMAT** — invoke `/typescript:format`. CLEAN advances to commit; APPLIED halts pending restage; BLOCK halts pending fixes.
- **REVIEW** or **REVIEW + EXTRAS** — invoke the chained skills in order. Each must clear without a blocking finding before the next runs: `/typescript:format` must return CLEAN (APPLIED halts the chain pending restage); gates (`/typescript:review`, `/tests:compose`) must return PASS; audits (`/audit:a11y`, `/tests:audit`, `/ui:audit`, `/ui:docs:audit`) must return CLEAN or DEVIATIONS PRESENT. The user may waive any finding to advance.
- **BLOCK** — list every blocking observation with `file:line` citations. Refuse to chain further. Do not run `git commit` until the user resolves or explicitly overrides.

### 5. Hand off

For each skill in the chain, invoke it and wait for its verdict. Three verdict shapes appear: format returns **CLEAN / APPLIED / BLOCK**; gates return **PASS / BLOCK**; audits return **CLEAN / DEVIATIONS PRESENT / FAIL**. Advance the chain on CLEAN or PASS; on APPLIED, surface the modified file list, halt the chain, and recommend `git add -u` before re-running `/postmortem` so the downstream skills see the formatted code; on DEVIATIONS PRESENT, surface the findings and advance unless the user halts; on BLOCK or FAIL, stop the chain — `git commit` does not run until findings are resolved or explicitly waived.

When the chain finishes clean, state the change is ready to commit. Do not run `git commit` yourself unless the user explicitly asked.

## Worked examples (fabricated)

- **README typo fix** — one file, `*.md`, no code paths. Verdict: PROCEED. No chain.
- **Rename `formatCurrency` → `formatMoney` across 4 files** — symbol rename, every call site updated. Verdict: PROCEED.
- **New `SizeProvider` context with `useSize` hook** — new logic, no tests in diff, new file under `componentsDir`. Verdict: REVIEW + EXTRAS. Chain: `/typescript:format` → `/tests:compose` → `/audit:a11y` → `/typescript:review`.
- **Patch a JWT verification edge case in `auth/verifyToken.ts`** — auth path touched, logic edit. Verdict: REVIEW. Chain: `/typescript:format` → `/typescript:review --angle=security`.
- **Introduce `WidgetFactory<T>` with a single caller** — speculative generic abstraction. Verdict: REVIEW. Chain: `/typescript:format` → `/typescript:review --angle=simplification`.
- **JSDoc edit on `useControllable`** — cosmetic comment change on a TS file, no logic touched. Verdict: FORMAT. Chain: `/typescript:format`.
- **`console.log("debug:", user)` left in a handler** — debug code in diff. Verdict: BLOCK. Cite `path/to/file.ts:42`. Commit refused.

## Rules

- Never run `git commit` while any downstream skill in the chain has open findings.
- Never widen the chain "to be safe" — every extra skill must be justified by a matched signal. Padding the chain wastes the user's time and trains them to ignore the verdict.
- Never skip `/typescript:review` when any logic edit, type surface change, multi-file change, or new dependency is present. PROCEED is reserved for diffs with no executable change.
- Never auto-commit. The chain returns control to the user; the user decides when to commit.
- Don't pad the verdict. PROCEED is one sentence. BLOCK is the findings list and nothing else.
- If the manifest doesn't expose a field needed to classify (e.g. `componentsDir` is `null`), glob these fallback paths: `packages/*/src/components/`, `packages/*/src/ui/`, `packages/*/components/` for components; `packages/*/src/primitives/` for primitives; `packages/*/src/hooks/` for hooks. Never invent paths not in this list.

## Reference: `[manifest-invalidators]`

Paths whose modification can invalidate `manifest.json`. Canonical source — update only here; consumer skills cite by handle.

- Root `package.json`, `pnpm-workspace.yaml`, or any package's `package.json`
- `turbo.json`, `tsconfig.json`
- Lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lock`)
- `lefthook.yml`, `lefthook.yaml`, `.husky/`, `.pre-commit-config.yaml`
- `.github/workflows/*.{yml,yaml}`
- `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `README.md`
