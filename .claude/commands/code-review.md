---
name: code-review
description: "Conditional code review. Reads the staged diff, runs the project's tests and type checks for the touched packages, and reviews the changes for bugs, type holes, and broken call sites. Blocks the commit until every finding is resolved. MANDATORY TRIGGERS: '/code-review', 'code review', 'review my changes', 'review this diff', 'review before commit', 'pre-commit review', 'check before I commit'. Invoked by `/postmortem` when the diff carries logical risk, or directly when the user asks for a review explicitly. Do NOT auto-invoke before every commit — `/postmortem` owns the pre-commit gate and decides when this skill runs. When invoked, do not commit until this review returns PASS or the user explicitly waives a finding."
---

# Code Review

Run when `/postmortem` routes here, or when the user asks for a review explicitly. Block the commit if anything looks wrong. Do not run before every commit — `/postmortem` is the pre-commit gate that decides whether this review is warranted.

## What it checks

1. **Tests for changed files** — run the project's test command, scoped to the packages touched by the staged diff. Verify that test files in the diff itself weren't weakened or skipped.
2. **Type check** — run the project's type-check command for the touched packages, when one exists.
3. **Diff review** — read every staged hunk and look for bugs, type holes, broken call sites, and accidentally committed debug code.

If any check fails, **the commit is blocked**. Do not run `git commit` until every issue is resolved or the user explicitly waives it.

## Steps

### 0. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing or stale, invoke `/repo:discover --quiet` and re-read.

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

Read the full staged diff. Focus on what no other skill in the `/postmortem` chain owns — security goes to `/security-review`, a11y goes to `/audit:a11y`, missing tests go to `/tests:compose`, single-use abstractions and drive-by refactors go to `/simplify`. Don't re-cover that ground here.

What's left for `/code-review`:

- **Broken call sites** — when a function signature, exported type, or return shape changes, grep the codebase for other callers and verify each one still compiles. Example: `function foo(x: string)` → `function foo(x: string, y: number)` requires every caller to pass `y`.
- **Weakened tests in the diff itself** — a test marked `.skip` (or framework equivalent), deleted, or stripped of assertions. A green suite hides this; only reading the diff catches it.
- **Bugs in the changed logic** — off-by-one, wrong operator, swapped arguments, missing `await`, mishandled promises. Read each hunk as if the function were new.
- **Null / undefined hazards** — property access on a value the type allows to be nullish, with no guard added.
- **Type holes** — `as any`, `as unknown as X`, `// @ts-ignore`, `// @ts-expect-error` without a one-line justification comment; widened return types; dropped generics.
- **Debug residue postmortem missed** — subtle leftovers like a `console.log` inside a conditional, a stray `debugger` behind a feature flag, a generated artifact checked in alongside source. Postmortem's BLOCK rule catches the obvious ones; surface anything that slipped through.

For each finding, cite `path/to/file.ts:42` and explain the concern in one sentence. No padding.

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
