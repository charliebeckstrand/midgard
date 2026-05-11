# tests:audit

TRIGGER when: the user asks to audit, check, review, or scan the project's tests / test coverage / test suite; asks "are the tests in sync", "any stale tests", "does every component have a test", "run the test audit". Also auto-eligible after `/tests:compose` writes new tests, to verify the new file fits the project's coverage matrix and authoring conventions.

You are running a static audit against the project's test files. The audit produces file:line-anchored findings sorted by severity. It does **not** run the test suite — this is source analysis only.

## Arguments

$ARGUMENTS

Recognized hints:
- A component, hook, or module name → audit only that target's test file.
- A path → audit a specific test file or subdirectory.
- `--changed` → audit only test files in `git diff --name-only` (staged + unstaged), plus tests for source files whose source changed.
- No arguments → audit every test file in every package, plus check for source files missing a test.

---

## 1. Load the Project Profile

Read `.claude/cache/project-profile.json`. If missing or stale, silently invoke `/repo:discover --quiet` and re-read; do not announce the regeneration to the user.

For each package, pull:

- `packages[*].path` and `packages[*].name` — used to map test files to packages and downstream skill scope.
- `packages[*].testRunner` — `vitest` / `jest` / `bun` / `node` / `null`. Drives expected imports and assertion syntax.
- `packages[*].framework` — `next` / `react` / `library` / `node`. Drives whether component-testing helpers should appear.
- `packages[*].testLayout` — `sibling` (`*.test.*` next to source) or `mirror` (`__tests__/` mirrors source). Drives location checks.
- `packages[*].testHelpersDir` — path to project-local test helpers. Drives the "raw library vs project helper" check.
- `packages[*].componentsDir` — source of truth for which components exist.
- `packages[*].isFrontend` — gates the component-pattern checks to frontend packages.
- `conventions.principles` — observed when classifying over-testing and dead-test findings.

If a package has `testRunner: null`, record a single package-level finding ("package `<name>` has no test runner — coverage audit skipped") and skip the rest of the audit for that package. Never silently assume a runner.

---

## 2. Locate the test files

For each qualifying package, collect:

- Every `*.test.*` / `*.spec.*` file under the package's source root (for `sibling` layout) or under `__tests__/` (for `mirror` layout).
- The package's **test setup file** (`vitest.setup.ts`, `jest.setup.ts`, etc.) — used to detect global mocks and stubs that the audit must not flag as missing in individual files.
- The **project-local helpers barrel** under `testHelpersDir`, if any — used to detect the canonical render helper for the package.
- The list of source files that should have a corresponding test (every non-trivial export under `componentsDir`, `src/hooks/`, `src/utils/`, or the package's equivalent).

---

## 3. Resolve scope

In priority order:

1. **Explicit target name or path** from `$ARGUMENTS` → audit only that.
2. **`--changed`** → take `git diff --name-only HEAD` plus unstaged. Keep:
   - Test files in the diff.
   - Source files whose tests should be re-audited (look up the matching test file by name).
3. **No argument** → audit every test file in every package, **and** run the coverage check (section 4.1) against every testable source file.

---

## 4. Run the checks

For each parsed test file, run every applicable check. Each check produces zero or more findings.

Severity legend (canonical per `/skill:audit`):

- **blocker** — broken test (won't run, wrong target, dangling `.only`, `describe`/`it` missing). Blocks the audit.
- **warning** — meaningful drift (missing required pattern from `/tests:compose`, prop reference no longer exists on source, mock state leaks, layout mismatch). Surfaces in the report.
- **nit** — style or coverage hint (under-tested edge case, snapshot in a non-snapshot project, padding). Suggested fix only.

### 4.1. Coverage

- **blocker** — a source file with a non-trivial export (component, hook, class, function with branches) under `componentsDir` / `src/hooks/` / `src/utils/` has no matching test file. Skip targets on the project's exclusion list (read from `CLAUDE.md`, `AGENTS.md`, or a test-skip list).
- **warning** — a test file exists for a source file that no longer exists.
- **nit** — a test file has fewer than 2 `it()` (or equivalent) blocks for a non-trivial target.

### 4.2. Required patterns from `/tests:compose`

Parse each test file and classify by target type (component, hook, pure function, module). Apply the REQUIRED patterns from `/tests:compose` section 4:

- **blocker** — file has no `describe` or `it` block (decorative).
- **warning** — **component** test missing the root-marker / "renders" check (pattern A of section 4.1).
- **warning** — **component** test missing the `className` merge check (pattern B of section 4.1).
- **warning** — **hook** test missing the initial-value check (pattern A of section 4.2).
- **warning** — **pure-function** test missing the happy-path check (pattern A of section 4.3).
- **nit** — a component test exercises only the required patterns and skips every conditional pattern (`ref`, `as`, event forwarding, disabled, loading) the source itself uses.

### 4.3. Runner and helper drift

- **blocker** — test imports from a runner the package doesn't declare (`from 'jest'` in a vitest package, `from 'vitest'` in a jest package).
- **warning** — test imports raw `@testing-library/react` `render` when the package's `testHelpersDir` exposes a project-local render helper.
- **warning** — test imports a framework helper (`@testing-library/react`) inside a `library` or `node` package with no frontend surface.
- **nit** — `'use client'` directive present in a test file (never needed; tests are not Next.js entry points).

### 4.4. Mock hygiene

- **blocker** — `.only` or `f` variant (`it.only`, `describe.only`, `fdescribe`, `fit`) left in the file. Test isolation slipped through.
- **warning** — `vi.stubGlobal` / `jest.spyOn` / `mockImplementation` carrying state with no matching `beforeEach` reset or `afterEach` restore. State leaks between tests.
- **warning** — `vi.mock` / `jest.mock` of a module the test never imports.
- **nit** — `it.skip` / `xit` / `xdescribe` with no comment explaining why.
- **nit** — empty `it()` block with no assertions (placeholder test).

### 4.5. Source-surface sync

For each test, parse the matching source file:

- **warning** — test references a prop, export, or method that no longer exists on the source.
- **warning** — test asserts a literal variant / size / color value no longer in the source's union (typo or removed enum member).
- **nit** — source has a documented prop (`disabled`, `loading`, `readonly`, `invalid`) with no matching `it()` block.
- **nit** — source uses `forwardRef` but the test does not exercise the ref-forwarding pattern.

### 4.6. Test layout and naming

- **warning** — test file at the `sibling` location when the package's `testLayout` is `mirror`, or vice versa.
- **warning** — test renders JSX but the file extension is `.test.ts` (should be `.test.tsx`).
- **nit** — extension is `.test.tsx` but the file imports no JSX (could be `.test.ts`).
- **nit** — neighboring tests in the package use one description casing (sentence vs imperative) and the file diverges.

### 4.7. Forbidden patterns (per `/tests:compose` "What NOT to test")

- **warning** — assertion on a specific class string literal or computed style, beyond a single deterministic marker (a `data-*` attribute or variant-resolution probe).
- **warning** — assertion on an internal state variable, private method, or token literal.
- **warning** — snapshot test (`toMatchSnapshot`, `toMatchInlineSnapshot`) in a package where no other test uses snapshots.
- **nit** — exhaustive permutation of variant × color × size, beyond verifying the variant system works.
- **nit** — test asserts third-party library internals rather than the project's usage of it.

### 4.8. Authoring conventions

- **nit** — test file diverges from the package's dominant convention for indentation, blank-line discipline, or import grouping (sample one neighboring test to derive the convention).
- **nit** — `describe` block wraps a single `it` when sibling tests in the package drop the `describe` in that case (or vice versa).

---

## 5. Report

Group findings by file, then by severity within each file. Lead with blockers, then warnings, then nits. For every finding, include:

- `file:line` anchor.
- One-line description of what's wrong.
- One-line concrete fix (e.g. "add a `merges custom className` test per `/tests:compose` section 4.1.B").

End with a roll-up:

```
Audited: N test files across M packages
Findings: <B> blocker · <W> warning · <I> nit
Coverage: <X>/<Y> testable units have tests (<percent>%)
```

If `--changed` was used and the diff is empty, say so and exit cleanly.

If any **blocker** findings exist, mark the audit as **FAIL** at the top of the report. If only warnings/nits exist, mark as **PASS WITH FINDINGS**. If nothing was found, mark as **PASS**.

---

## 6. Offer to fix

After presenting findings, ask whether the user wants the auto-fixable ones applied. Auto-fixable means:

- Missing test file entirely → invoke `/tests:compose <name>` for each missing target, in order.
- Stray `.only` / `fdescribe` / `fit` modifier → strip it.
- Wrong file extension (`.test.ts` rendering JSX) → rename to `.test.tsx`.
- Wrong test-layout location → move the file to match the package's `testLayout`.
- `'use client'` directive in a test → remove it.

Never auto-rewrite assertions or add missing required patterns inline — those are judgment calls about what the test should exercise. Surface them and let `/tests:compose` extend the file in a focused pass.

---

## Important

- The audit reads source only. Never run the test suite, never boot a dev server, never write to test files without the user's explicit go-ahead.
- The package's `testRunner` and `testLayout` are the source of truth for what a test should look like in that package. Never invent a runner or a layout the profile does not report.
- `componentsDir` and the per-package source roots are the source of truth for what needs testing. Never rely on a memorized list.
- The REQUIRED patterns from `/tests:compose` section 4 are the canonical coverage matrix for this audit. Never invent new required patterns here — propose them as a change to `/tests:compose` first.
- Honor exclusion lists declared in `CLAUDE.md` / `AGENTS.md` / per-package test-skip lists. A target on the exclusion list is not a coverage gap.
- Use the project's vocabulary from `conventions.vocabularyGlossary` when naming targets and axes in the report.
