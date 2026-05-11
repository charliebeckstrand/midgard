---
name: code-review
description: "Pre-commit code review. Reads the staged diff, runs the project's tests and type checks for the touched packages, and reviews the changes for bugs, type holes, and broken call sites. Blocks the commit until every finding is resolved. MANDATORY TRIGGERS: '/code-review', 'code review', 'review my changes', 'review this diff', 'review before commit', 'pre-commit review', 'check before I commit'. ALWAYS run before executing `git commit` from inside Claude — do not commit until the review returns PASS or the user explicitly waives a finding."
---

# Code Review

Run before every commit. Block the commit if anything looks wrong.

## What it checks

1. **Tests for changed files** — run the project's test command, scoped to the packages touched by the staged diff. Verify that test files in the diff itself weren't weakened or skipped.
2. **Type check** — run the project's type-check command for the touched packages, when one exists.
3. **Diff review** — read every staged hunk and look for bugs, type holes, broken call sites, and accidentally committed debug code.

If any check fails, **the commit is blocked**. Do not run `git commit` until every issue is resolved or the user explicitly waives it.

## Steps

### 0. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing or stale, invoke `/discover --quiet` and re-read.

From the profile, capture:

- `packageManager` — `pnpm` / `yarn` / `npm` / `bun`. (Turborepo defaults to pnpm; other managers are possible.)
- `packages[*].path` and `packages[*].name` — used to map changed files to packages.
- `packages[*].scripts.test` — exists or not, per package.
- `packages[*].scripts.check-types` (or `typecheck`) — exists or not, per package.
- `conventions.principles` — observed when reviewing the diff for scope creep.

This skill assumes the repo is a Turborepo. If `monorepo.tool` is anything other than `turbo`, fall back to running each touched package's `scripts.test` directly via the package manager.

### 1. Collect the diff

```bash
git diff --cached --name-only
git diff --cached
```

If nothing is staged, fall back to `git diff HEAD --name-only` and `git diff HEAD`, and tell the user you're reviewing unstaged changes because nothing is staged.

If the diff is empty, stop — there's nothing to review.

### 2. Map files to packages

For each changed path, find the longest `packages[*].path` from the profile that prefixes the file. Collect the unique set of affected package names.

Skip changes to files outside any package (root configs, top-level docs) — they don't have tests to run, but still review them in step 5.

### 3. Run tests for the touched packages

Build the test command using Turbo:

```
<pm> turbo test --filter=<pkg-1> --filter=<pkg-2>
```

Pass one `--filter` per touched package in a single command. Substitute `<pm>` with the `packageManager` from the profile (typically `pnpm`). Only include packages whose profile entry has `scripts.test` set — Turbo skips packages without a `test` task automatically, but filtering keeps the run scoped.

For every test file present in the diff itself, confirm:

- The test still passes.
- The test wasn't deleted, marked `.skip` (`it.skip`, `describe.skip`, `test.skip`, framework equivalent), or weakened (assertions removed, `expect` calls deleted, real assertions replaced with no-ops).

A weakened test counts as a blocking finding even when the suite is green.

### 4. Type-check the touched packages

If any touched package's profile entry has `scripts.check-types` (or `typecheck`) set, run the equivalent Turbo command, substituting the discovered task name:

```
<pm> turbo check-types --filter=<pkg-1> --filter=<pkg-2>
```

Use whichever name (`check-types` vs `typecheck`) the touched packages declare in their scripts. Any type error blocks the commit. If no touched package exposes a type-check script, note it in the verdict and move on.

### 5. Review the diff

Read the full staged diff and look for:

- **Bugs** — off-by-one, wrong operator, swapped arguments, missing `await`, mishandled promises, race conditions.
- **Null / undefined hazards** — property access on values that can legitimately be nullish.
- **Type holes** — `as any`, `as unknown as X`, `// @ts-ignore`, `// @ts-expect-error` without justification, widened return types, dropped generics.
- **Broken call sites** — when a function signature, exported type, or return shape changes, grep the codebase for other callers and verify each one still compiles and behaves correctly.
- **Accidental commits** — `console.log`, `debugger`, hardcoded secrets, commented-out blocks, generated artifacts, `// TODO: revert`.
- **Scope creep** — unrelated formatting churn or drive-by refactors. If `conventions.principles` includes a rule like "a bug fix is not a refactoring opportunity", cite it explicitly when flagging.

For each finding, cite the file and line as `path/to/file.ts:42` and explain the concern in one sentence. No padding.

### 6. Verdict

Print a one-line header:

```
<N> files changed · tests <pass|fail|n/a> · types <pass|fail|n/a> · <M> findings
```

Then one of:

- **PASS** — every check green and no findings worth blocking on. State this and let the user proceed to commit.
- **BLOCK** — list every blocking finding with `file:line` citations and a suggested fix. Refuse to run `git commit` until findings are resolved. If the user insists, require an explicit override ("commit anyway, I've read the findings") before proceeding.

## Rules

- Never run `git commit` while findings remain open.
- Never auto-fix during the review — surface the issue, let the user decide.
- Never skip the review because the diff "looks small". Trivial diffs hide non-trivial bugs.
- Don't pad the report. If there's nothing to say, say PASS in one line.
