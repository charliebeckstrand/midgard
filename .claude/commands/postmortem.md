# postmortem

TRIGGER when: the user signals completion ("wrap up", "finish up", "task complete", "ready to commit") and a non-empty diff exists. Always run before `git commit` from inside Claude — don't commit until this skill returns PROCEED or every chained downstream skill returns PASS.

Trivial diffs (docs, comments, formatting, dependency-free renames) commit directly. Risky diffs (logic, type surface, multi-file, new dependencies, secrets, auth, UI components) chain through the matching downstream skills first. `/typescript:review` is the default logic-risk gate for any diff with `.ts` / `.tsx` changes — this is a TypeScript codebase, so TS-aware review subsumes generic code review.

## What it decides

- **PROCEED** — commit without further checks. The diff is mechanical or non-functional.
- **POLISH** — chain into `/orator` alone. The diff modifies prose (markdown, comments, JSDoc) with no executable or structural code risk.
- **FORMAT** — chain into `/typescript:format`, then `/orator` if prose was touched. The diff touches `.ts` / `.tsx` but carries no logical risk; the format pass is the only structural gate.
- **REVIEW** — chain into `/typescript:format`, then `/orator` if prose was touched, then `/typescript:review` because the diff carries logical risk.
- **REVIEW + EXTRAS** — chain into `/typescript:format`, `/orator` (if prose), then one or more of `/audit:a11y`, `/tests:compose`, then `/typescript:review`, in that order.
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

Security-sensitive paths aren't in the schema. Detect inline against path patterns (`.env*`, `auth/`, `permissions/`) — never invent a manifest field.

### 1. Collect the diff

```bash
git diff --cached --name-only
git diff --cached
```

If nothing is staged, fall back to `git diff HEAD --name-only` and `git diff HEAD`; tell the user you're inspecting unstaged changes.

Empty diff → stop.

### 2. Refresh the Manifest if invalidated

Inspect the diff's file list. If any path matches `[manifest-invalidators]` (see *Reference* below), silently invoke `/repo:manifest --quiet`.

On error, surface and BLOCK — the manifest is a prerequisite, not best-effort. On success, check `git status --short manifest.json`:

- Modified → surface a finding: the refresh updated `manifest.json`; recommend `git add manifest.json` so the schema ships with the invalidating change. Don't auto-stage; the user decides what enters the commit.
- Unchanged → the invalidation didn't materially alter the schema; proceed.

No invalidator match → skip. The manifest stays stable across logic-only diffs.

### 3. Classify the change

Apply these signals against the diff. Collect every match — a diff may hit multiple rows.

| Signal | Detection | Routes to |
|---|---|---|
| Secrets / auth / permissions touched | Path or hunk hits on `.env*`, `auth/`, `permissions/`, API keys, JWT, OAuth, session/cookie handling, RBAC | `/typescript:review --angle=security` |
| New or modified frontend component | New file under `packages[*].componentsDir`, or modified `.tsx` / `.jsx` exporting a component, in a package where `isFrontend` is true | `/audit:a11y` |
| New logic without matching tests | A new exported function, or a new conditional with more than one branch, with no corresponding `*.test.*` / `*.spec.*` change in the diff | `/tests:compose` |
| Smells like over-engineering | Single-use abstraction, speculative generic, premature interface, unused parameter, dead branch | `/typescript:review --angle=simplification` |
| Logic edit, type surface change, multi-file change, new dependency | Conditional logic edited, exported type changed, ≥3 source files modified, `package.json` dependency added | `/typescript:review` |
| TS surface touched, no logical risk | `.ts` / `.tsx` modified but no row above matched (cosmetic rename of a local, formatting drift) | `/typescript:format` |
| Prose modified — markdown, comments, JSDoc | Any `*.md` / `*.mdx` in the diff, or added / modified comment lines (`//`, `/*`, `*`, `/**`) in `.ts` / `.tsx` | `/orator` for `*.md` files; `/orator comments` for in-source edits |
| Whitespace / generated noise only | Diff hits only whitespace, lockfile churn, or generated output; no executable or prose lines changed | PROCEED |
| Dependency-free rename | Symbol renamed with all call sites updated, no behavior change | PROCEED |
| Debug code, half-finished work, secrets in diff | `console.log`, `debugger`, `// TODO: revert`, commented-out blocks, real credentials | BLOCK |

Union the matched handoffs, then order them: `/typescript:format` first (any `.ts` / `.tsx` in surface), then `/orator` (any prose — markdown, comments, JSDoc), then extras (`/audit:a11y`, `/tests:compose`), then `/typescript:review`. Format runs first so downstream skills see formatted code, and so a format APPLIED verdict halts the chain for restage before the reviewer wastes effort. Orator runs after format so it polishes the formatted surface; it returns a rewrite diff for the user to apply and doesn't gate the chain. Review is always last, never parallel — it reviews the change as-is, including format and extras edits. When multiple rows route to `/typescript:review` with `--angle=` flags, stack them on one invocation (`/typescript:review --angle=security --angle=simplification`) instead of running the reviewer twice.

Format and review share categories by design — `as any` justifications, banned `enum`, default exports, constant naming, filename / export mismatches. Format BLOCKs mechanically; once CLEAN, review's value sits in tests, type-check, logic correctness, broken call sites, and the §5 / §6 conventions format can't see. A PASS with no new findings still earned its keep by running the test suite and type-check — that's the gate, not the findings list.

### 3a. Verify ui package format alignment

For each staged source file, find its containing package via `packages[*].path`. Skip files whose package has no `componentsDir`, `primitivesDir`, or `hooksDir` — the kind table below doesn't apply to non-library packages. Otherwise detect kind, read **one** reference sibling of the same kind, and compare structural patterns — not behavior.

| Kind | Path predicate | Reference |
|---|---|---|
| component | under `componentsDir` | most-recently-modified sibling `componentsDir/<other>/<other>.tsx` (the main component file in another component folder) |
| primitive | under `primitivesDir` | most-recently-modified sibling `primitivesDir/<other>.tsx` |
| hook | under `hooksDir`, filename starts with `use-` | most-recently-modified sibling `hooksDir/use-<other>.ts` |
| test (`sibling` layout) | `*.{test,spec}.{ts,tsx}` under the package, excluding files inside `testHelpersDir` | most-recently-modified other test beside source under the same source directory |
| test (`mirror` layout) | same as above | most-recently-modified other test under the same `__tests__/<subdir>` (preserving the mirrored subdir, e.g. `components/`, `primitives/`, `hooks/`) |

Exclude diff files when picking the reference. Read both staged file and reference. Compare:

- **Filename + export** — matches `<name>.tsx` / `<name>-<part>.tsx` / `use-<name>.ts` per CLAUDE.md, and the exported symbol's PascalCase (or `useCamelCase`) form matches the filename. Violation → **BLOCK** — the lefthook `filenames` gate and `component-filename-boundary.test.ts` would fail anyway.
- **Import grouping** — same external / internal / relative ordering and alias style.
- **Top-level structure** — types lifted to `types.ts`, hooks lifted to `use-<name>.ts`, recipes lifted to `variants.ts` when the reference splits that way; same compound / sub-part file layout.
- **Component shape** — same `'use client'` discipline, same `forwardRef` / polymorphic pattern, same `data-slot` / `data-part` marker convention.
- **Test conventions** — same `describe` / `it` nesting depth, same render helper, same assertion style, same mock pattern.

Drift findings surface as advisory `format-drift` findings on this skill's verdict (alongside §4's classification line). They don't BLOCK on their own. Filename / export-name violations BLOCK.

If the manifest's kind field is `null` (e.g. `primitivesDir: null`, or `testLayout: null` for the test kind), skip that kind silently.

### 4. Decide

Print the verdict in one line:

```
<N> files changed · classification: <PROCEED|POLISH|FORMAT|REVIEW|REVIEW+EXTRAS|BLOCK> · chain: <skill-1> → <skill-2> → …
```

Then one of:

- **PROCEED** — state the reason in one sentence (`whitespace-only`, `mechanical rename with all call sites updated`). Hand control back.
- **POLISH** — invoke `/orator` on the prose surface. Surface the rewrite diff; the chain advances regardless — orator outputs suggestions, not gates.
- **FORMAT** — invoke `/typescript:format`, then `/orator` if prose was touched. CLEAN advances; APPLIED halts pending restage; BLOCK halts pending fixes. Orator's diff is suggestion-only.
- **REVIEW** or **REVIEW + EXTRAS** — invoke the chained skills in order. Each must clear without a blocking finding before the next runs: format must return CLEAN (APPLIED halts pending restage); `/orator` returns a rewrite diff and the chain advances; gates (`/typescript:review`, `/tests:compose`) must return PASS; audits (`/audit:a11y`, `/tests:audit`, `/ui:audit`, `/ui:docs:audit`) must return CLEAN or DEVIATIONS PRESENT. The user may waive any finding to advance.
- **BLOCK** — list every blocking observation with `file:line`. Refuse to chain further. Don't run `git commit` until the user resolves or overrides.

### 5. Hand off

Invoke each chained skill in order; wait for its verdict. Four verdict shapes: format returns **CLEAN / APPLIED / BLOCK**; gates return **PASS / BLOCK**; audits return **CLEAN / DEVIATIONS PRESENT / FAIL**; rewriters (`/orator`) return a rewrite diff headed `<N> files · <M> rewrites · <K> flagged-for-deletion` and carry no gate verdict. Advance on CLEAN, PASS, or any rewriter output. On APPLIED, surface the modified file list, halt the chain, recommend `git add -u` before re-running `/postmortem` so downstream skills see the formatted code. On DEVIATIONS PRESENT, surface findings and advance unless the user halts. On BLOCK or FAIL, stop — `git commit` doesn't run until findings are resolved or waived.

When the chain finishes clean, state the change is ready to commit. Don't run `git commit` yourself unless the user explicitly asked.

## Worked examples (fabricated)

- **README typo fix** — one file, `*.md`, prose only. Verdict: POLISH. Chain: `/orator`.
- **Rename `formatCurrency` → `formatMoney` across 4 files** — symbol rename, every call site updated, no comment edits. Verdict: PROCEED.
- **New `SizeProvider` context with `useSize` hook** — new logic, new JSDoc on exports, no tests in diff, new file under `componentsDir`. Verdict: REVIEW + EXTRAS. Chain: `/typescript:format` → `/orator comments` → `/tests:compose` → `/audit:a11y` → `/typescript:review`.
- **Patch a JWT verification edge case in `auth/verifyToken.ts`** — auth path touched, logic edit, no comments changed. Verdict: REVIEW. Chain: `/typescript:format` → `/typescript:review --angle=security`.
- **Introduce `WidgetFactory<T>` with a single caller** — speculative generic abstraction. Verdict: REVIEW. Chain: `/typescript:format` → `/typescript:review --angle=simplification`.
- **JSDoc edit on `useControllable`** — cosmetic comment change on a TS file, no logic touched. Verdict: FORMAT. Chain: `/typescript:format` → `/orator comments`.
- **Update `CONTRIBUTING.md` plus tweak one `.ts` import order** — prose + cosmetic TS, no logic. Verdict: FORMAT. Chain: `/typescript:format` → `/orator`.
- **`console.log("debug:", user)` left in a handler** — debug code in diff. Verdict: BLOCK. Cite `path/to/file.ts:42`. Commit refused.

## Rules

- Never run `git commit` while any downstream skill has open findings.
- Never widen the chain "to be safe" — every extra skill earns its place via a matched signal. Padding wastes the user's time and trains them to ignore the verdict.
- Never skip `/typescript:review` when a logic edit, type surface change, multi-file change, or new dependency is present. PROCEED is reserved for diffs with no executable change.
- Never skip `/orator` when prose was touched (markdown, comments, JSDoc). It outputs suggestions — the user decides what to apply — but skipping it lets degraded prose ship.
- Never auto-commit. The chain returns control; the user decides when to commit.
- Don't pad the verdict. PROCEED is one sentence. BLOCK is the findings list.
- When the manifest lacks a classification field (e.g. `componentsDir: null`), fall back to these globs: `packages/*/src/components/`, `packages/*/src/ui/`, `packages/*/components/` for components; `packages/*/src/primitives/` for primitives; `packages/*/src/hooks/` for hooks. Never invent paths outside this list.

## Reference: `[manifest-invalidators]`

Paths whose modification can invalidate `manifest.json`. Canonical source — update only here; consumer skills cite by handle.

- Root `package.json`, `pnpm-workspace.yaml`, or any package's `package.json`
- `turbo.json`, `tsconfig.json`
- Lockfiles (`pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lock`)
- `lefthook.yml`, `lefthook.yaml`, `.husky/`, `.pre-commit-config.yaml`
- `.github/workflows/*.{yml,yaml}`
- `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, `README.md`
