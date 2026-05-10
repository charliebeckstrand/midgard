---
name: code-review
description: "Pre-commit code review. Reads the staged diff, runs tests and type checks for the touched packages, and reviews the changes for bugs, type holes, and broken call sites. Blocks the commit until every finding is resolved. MANDATORY TRIGGERS: '/code-review', 'code review', 'review my changes', 'review this diff', 'review before commit', 'pre-commit review', 'check before I commit'. ALWAYS run before executing `git commit` from inside Claude on this repo — do not commit until the review returns PASS or the user explicitly waives a finding."
---

# Code Review

Run before every commit. Block the commit if anything looks wrong.

## What it checks

1. **Tests for changed files** — run vitest only for the workspace packages touched by the staged diff, and verify that test files in the diff itself weren't weakened or skipped.
2. **Type check** — run `check-types` for the touched packages.
3. **Diff review** — read every staged hunk and look for bugs, type holes, broken call sites, and accidentally committed debug code.

If any check fails, **the commit is blocked**. Do not run `git commit` until every issue is resolved or the user explicitly waives it.

## Steps

### 1. Collect the diff

```bash
git diff --cached --name-only
git diff --cached
```

If nothing is staged, fall back to `git diff HEAD --name-only` and `git diff HEAD`, and tell the user you're reviewing unstaged changes because nothing is staged.

If the diff is empty, stop — there's nothing to review.

### 2. Map files to packages

For each changed path under `apps/<name>/` or `packages/<name>/`, collect the affected workspace package names from each package's `package.json`. Skip paths outside `apps/` and `packages/` — root configs don't have tests to run.

### 3. Run tests for the touched packages

```bash
pnpm turbo test --filter=<pkg-1> --filter=<pkg-2>
```

Pass one `--filter` per touched package in a single command. Packages without a `test` task are skipped automatically by turbo.

For every test file in the diff itself, confirm:

- the test still passes
- the test wasn't deleted, `.skip`'d (`it.skip`, `describe.skip`), or weakened (assertions removed, `expect` calls deleted, real assertions replaced with no-ops)

A weakened test counts as a blocking finding even when the suite is green.

### 4. Type-check the touched packages

```bash
pnpm turbo check-types --filter=<pkg-1> --filter=<pkg-2>
```

Any type error blocks the commit.

### 5. Review the diff

Read the full staged diff and look for:

- **Bugs** — off-by-one, wrong operator, swapped arguments, missing `await`, mishandled promises, race conditions
- **Null / undefined hazards** — property access on values that can legitimately be nullish
- **Type holes** — `as any`, `as unknown as X`, `// @ts-ignore`, `// @ts-expect-error` without justification, widened return types, dropped generics
- **Broken call sites** — when a function signature, exported type, or return shape changes, grep the codebase for other callers and verify each one still compiles and behaves correctly
- **Accidental commits** — `console.log`, `debugger`, hardcoded secrets, commented-out blocks, generated artifacts, `// TODO: revert`
- **Scope creep** — unrelated formatting churn or drive-by refactors not asked for (per CLAUDE.md: "A bug fix is not a refactoring opportunity")

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
