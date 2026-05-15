# tests:audit

TRIGGER when: the user asks to audit, check, review, or scan the project's tests / test coverage / test suite; asks "are the tests in sync", "any stale tests", "does every component have a test", "run the test audit". Also auto-eligible after `/tests:compose` writes new tests, to verify the new file fits the project's coverage matrix and authoring conventions.

Static audit of the project's test files. Produces `file:line`-anchored findings sorted by severity. Does **not** run the test suite — source analysis only.

## Arguments

$ARGUMENTS

Recognized hints:
- A component, hook, or module name → audit only that target's test file.
- A path → audit a specific test file or subdirectory.
- `--changed` → audit only test files in `git diff --name-only` (staged + unstaged), plus tests for source files whose source changed.
- `--top N` → in suite mode, show only the top N worst offenders (default 10).
- No arguments → audit every test file in every package, plus check for source files missing a test.

---

## 1. Load the Manifest

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate the manifest yourself. Treat a successful load as silent background context; don't mention it to the user.

Per package, capture:

- `path`, `name` — map test files to packages.
- `testRunner` — drives expected imports and assertion syntax. `null` → record one package-level finding and skip the package.
- `framework` — drives whether component-testing helpers should appear.
- `testLayout` — `sibling` or `mirror`. Drives location checks.
- `componentsDir` — source of truth for which components need tests.
- `isFrontend` — gates component-pattern checks.
- `conventions.principles` — observed when classifying over-testing and dead-test findings.

The manifest does not record a `testHelpersDir`. Detect project-local test helpers by globbing the package source for `test-utils.{ts,tsx}`, `setup.{ts,tsx}`, `helpers.{ts,tsx}`, or a `__tests__/helpers/` directory. If found, treat that file as the canonical render-helper source for the package.

Security-sensitive and project-specific paths are not in the schema — detect them inline. Never invent a manifest field.

---

## 2. Locate the test files

Per qualifying package, collect:

- Every `*.test.*` / `*.spec.*` under the package's source root (for `sibling`) or under `__tests__/` (for `mirror`).
- The package's **test setup file** (`vitest.setup.*`, `jest.setup.*`, etc.) — global mocks and stubs there are not "missing in individual files".
- The **project-local helpers file** discovered in section 1, if any.
- The list of source files that should have a corresponding test (every non-trivial export under `componentsDir`, `src/hooks/`, `src/utils/`, or the package's equivalent).

---

## 3. Resolve scope

In priority order:

1. **Explicit target name or path** from `$ARGUMENTS` → audit only that.
2. **`--changed`** → `git diff --name-only HEAD` plus unstaged. Keep: test files in the diff, plus tests for source files in the diff.
3. **No argument** → audit every test file in every package, plus the coverage check (4.1) against every testable source file.

Record the **mode**:
- `single` — explicit target.
- `changed` — `--changed`.
- `suite` — no argument; ranks the whole test suite.

---

## 4. Run the checks

Each check produces zero or more findings.

Severity:

- **blocker** — broken test (won't run, wrong target, dangling `.only`, missing `describe`/`it`).
- **warning** — meaningful drift (missing required pattern, source-surface mismatch, mock state leak, layout mismatch).
- **nit** — style or coverage hint.

### 4.1. Coverage

- **blocker** — non-trivial source export under `componentsDir` / `src/hooks/` / `src/utils/` has no matching test. Skip exclusions declared in `CLAUDE.md` / `AGENTS.md` / per-package skip lists.
- **warning** — test file exists for a source file that no longer exists.
- **nit** — fewer than 2 `it()` blocks for a non-trivial target.

### 4.2. Required patterns from `/tests:compose`

Classify each test file by target type (component, hook, pure function, module) and apply the REQUIRED patterns from `/tests:compose` section 4:

- **blocker** — no `describe` or `it` block.
- **warning** — **component** test missing the root-marker check (4.1.A).
- **warning** — **component** test missing the `className` merge check (4.1.B).
- **warning** — **hook** test missing the initial-value check (4.2.A).
- **warning** — **pure-function** test missing the happy-path check (4.3.A).
- **nit** — component test covers only required patterns and skips every conditional pattern the source itself uses (`ref`, `as`, event forwarding, `disabled`, `loading`).

### 4.3. Runner and helper drift

- **blocker** — test imports from a runner the package doesn't declare (`from 'jest'` in a vitest package, `from 'vitest'` in a jest package).
- **warning** — test imports raw `@testing-library/react` `render` when the package has a project-local render helper (discovered in section 1).
- **warning** — test imports a framework helper inside a `library` or `node` package with no frontend surface.
- **nit** — `'use client'` directive in a test file.

### 4.4. Mock hygiene

- **blocker** — `.only` / `f` variant (`it.only`, `fdescribe`, `fit`) left in the file.
- **warning** — `vi.stubGlobal` / `jest.spyOn` / `mockImplementation` carrying state with no matching `beforeEach` reset or `afterEach` restore.
- **warning** — `vi.mock` / `jest.mock` of a module the test never imports.
- **nit** — `it.skip` / `xit` / `xdescribe` with no explanatory comment.
- **nit** — empty `it()` block with no assertions.

### 4.5. Source-surface sync

Parse the matching source file:

- **warning** — test references a prop, export, or method that no longer exists on the source.
- **warning** — test asserts a literal variant / size / color value no longer in the source's union.
- **nit** — source has a documented prop (`disabled`, `loading`, `readonly`, `invalid`) with no matching `it()` block.
- **nit** — source uses `forwardRef` but the test does not exercise ref forwarding.

### 4.6. Test layout and naming

- **warning** — test file at `sibling` location when the package's `testLayout` is `mirror`, or vice versa.
- **warning** — test renders JSX but the extension is `.test.ts`.
- **nit** — extension is `.test.tsx` but the file imports no JSX.
- **nit** — `describe` casing diverges from neighboring tests in the package.

### 4.7. Forbidden patterns (per `/tests:compose` "What NOT to test")

- **warning** — assertion on a specific class string literal or computed style, beyond a single deterministic marker.
- **warning** — assertion on an internal state variable, private method, or token literal.
- **warning** — snapshot test in a package where no other test uses snapshots.
- **nit** — exhaustive permutation of variant × color × size.
- **nit** — test asserts third-party library internals rather than the project's usage of it.

### 4.8. Authoring conventions

- **nit** — file diverges from the package's dominant convention for indentation, blank-line discipline, or import grouping (sample one neighboring test).
- **nit** — `describe` block wraps a single `it` when sibling tests in the package drop the `describe` in that case (or vice versa).

---

## 5. Report

Score each audited test file:

```
score = (blockers × 5) + (warnings × 2) + (nits × 1)
```

Branch on the mode from section 3.

### `single` mode

One section, full findings table.

### `changed` mode

One section per changed test file, sorted by score descending. Cap at top **10** unless `--top N`.

### `suite` mode

Lead with a **Worst offenders** table, sorted by score descending, capped at top **10** (or `--top N`):

```
## Worst offenders

| Rank | Test | Location | Blockers | Warnings | Nits | Score | Headline finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | widget.test.tsx | packages/ui/src/components/widget/widget.test.tsx | 1 | 3 | 2 | 13 | missing-required-pattern: no className merge check |
| 2 | drawer.test.tsx | packages/ui/src/components/drawer/drawer.test.tsx | 0 | 4 | 1 | 9 | mock-state-leak: vi.stubGlobal with no afterEach restore |
```

Then print full per-file sections for the top-N only, in rank order. List the rest below the cut:

```
Below the cut: N test files with M findings (run `/tests:audit <name>` to inspect).
```

### Per-file section (all modes)

Group findings by severity (blockers → warnings → nits). Per finding:

- `file:line` anchor.
- One-line description.
- One-line concrete fix (e.g. "add a `merges custom className` test per `/tests:compose` 4.1.B").

### Roll-up

```
Audited: N test files across M packages
Findings: <B> blocker · <W> warning · <I> nit
Coverage: <X>/<Y> testable units have tests (<percent>%)
```

Top-of-report status:

- Any **blocker** → **FAIL**.
- Only warnings/nits → **PASS WITH FINDINGS**.
- Nothing found → **PASS**.

If `--changed` was used and the diff is empty, say so and exit cleanly.

---

## 6. Offer to fix

After presenting findings, ask whether to apply auto-fixable items:

- Missing test file → invoke `/tests:compose <name>` for each missing target.
- Stray `.only` / `fdescribe` / `fit` → strip it.
- Wrong file extension (`.test.ts` rendering JSX) → rename to `.test.tsx`.
- Wrong test-layout location → move to match the package's `testLayout`.
- `'use client'` directive in a test → remove it.

Never auto-rewrite assertions or add missing required patterns inline — surface them and let `/tests:compose` extend the file in a focused pass.

---

## Important

- Source analysis only. Never run the test suite, boot a dev server, or write to test files without explicit go-ahead.
- The package's `testRunner` and `testLayout` are the source of truth — never invent a runner or layout the manifest does not report.
- `componentsDir` and per-package source roots are the source of truth for what needs testing — never rely on a memorized list.
- The REQUIRED patterns from `/tests:compose` section 4 are the canonical coverage matrix. Never invent new required patterns here — propose them as a change to `/tests:compose` first.
- Honor exclusion lists declared in `CLAUDE.md` / `AGENTS.md` / per-package test-skip lists.
- In `suite` mode, **rank, then truncate**. The worst-offenders table is the deliverable; full per-file sections only for the top-N.