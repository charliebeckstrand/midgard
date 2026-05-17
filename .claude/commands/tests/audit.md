# tests:audit

TRIGGER when: the user asks to audit, check, review, or scan the project's tests / test coverage / test suite; asks "are the tests in sync", "any stale tests", "does every component have a test", "run the test audit". Also auto-eligible after `/tests:compose` writes new tests, to verify the new file fits the project's coverage matrix and authoring conventions.

Compares test files against the project's test baseline (coverage matrix + `/tests:compose` REQUIRED patterns + authoring conventions). Deviations are reported as `file:line`-anchored entries grouped by severity. A run that finds no deviations reports CLEAN and emits no table.

## Arguments

$ARGUMENTS

Recognized hints:
- A component, hook, or module name → audit only that target's test file.
- A path → audit a specific test file or subdirectory.
- `--changed` → audit only test files in `git diff --name-only` (staged + unstaged), plus tests for source files whose source changed.
- `--top N` → in suite or changed mode, show only the top N worst offenders (default 10).
- No arguments → audit every test file in every package, plus check for source files missing a test.

---

## 1. Load the Manifest

Read `./manifest.json`. If missing, stop and tell the user to run `/repo:manifest` first — never generate the manifest yourself.

Per package, capture:

- `path`, `name` — map test files to packages.
- `testRunner` — drives expected imports and assertion syntax. `null` → record one package-level finding and skip the package.
- `framework` — drives whether component-testing helpers should appear.
- `testLayout` — `sibling` or `mirror`. Drives location checks.
- `componentsDir` — source of truth for which components need tests.
- `isFrontend` — gates component-pattern checks.
- `conventions.principles` — drives classification of over-testing and dead-test findings.

Read the package's `testHelpersDir` from the manifest. If `null`, fall back to globbing the package source for `test-utils.{ts,tsx}`, `setup.{ts,tsx}`, `helpers.{ts,tsx}`, or a `__tests__/helpers/` directory. Treat the discovered file as the canonical render-helper source for the package.

Security-sensitive and project-specific paths are not in the schema — detect them inline. Never invent a manifest field.

---

## 2. Locate the test files

Per qualifying package, collect:

- Every `*.test.*` / `*.spec.*` under the package's source root (for `sibling`) or under `__tests__/` (for `mirror`).
- The package's **test setup file** (`vitest.setup.*`, `jest.setup.*`, etc.). Don't flag a per-file finding for mocks declared in the setup file.
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

Each check below defines one baseline condition. A check that holds emits nothing; only deviations get reported.

A nit is not licence to fill the table. Surface a nit only when it would survive a second reader's review; otherwise treat the check as held.

Severity:

- **blocker** — broken test (won't run, wrong target, dangling `.only`, missing `describe`/`it`).
- **warning** — meaningful drift (missing required pattern, source-surface mismatch, mock state leak, layout mismatch).
- **nit** — style or coverage hint.

**Non-trivial** in this skill means a runtime value or component export. Skip pure type exports, barrel re-exports, and zero-branch constants.

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

Lead the report with the verdict (see *Verdict* below). When the verdict is CLEAN, that is the entire report — no per-file sections, no roll-up. The remainder of this section applies only when at least one deviation was recorded. Score for ranking deviated files is:

```
score = (blockers × 5) + (warnings × 2) + (nits × 1)
```

Branch on the mode from section 3.

### `single` mode

One section, full findings table.

### `changed` mode

One section per changed test file, sorted by score descending. Cap at top **10** unless `--top N`.

### `suite` mode

Lead with a **Deviation summary** table — test files that left the baseline, ranked by deviation score, capped at top **10** (or `--top N`). Files that hold the baseline do not appear:

```
## Deviation summary

| Rank | Test | Location | Blockers | Warnings | Nits | Score | Headline finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | widget.test.tsx | packages/ui/src/components/widget/widget.test.tsx | 1 | 3 | 2 | 13 | missing-required-pattern: no className merge check |
| 2 | drawer.test.tsx | packages/ui/src/components/drawer/drawer.test.tsx | 0 | 4 | 1 | 9 | mock-state-leak: vi.stubGlobal with no afterEach restore |
```

Then print full per-file sections for the top-N only, in rank order. List the rest below the cut:

```
Remaining test files with deviations: N (M deviations total). Run `/tests:audit <name>` to inspect.
```

### Per-file section (all modes)

Group findings by severity (blockers → warnings → nits). Per finding:

- `file:line` anchor.
- One-line description.
- One-line concrete fix (e.g. "add a `merges custom className` test per `/tests:compose` 4.1.B").

### Roll-up

```
Audited: N test files across M packages · K outside baseline
Deviations: <B> blocker · <W> warning · <I> nit
Coverage: <X>/<Y> testable units have tests (<percent>%)
```

### Verdict (lead the report)

- Any **blocker** → **FAIL**.
- Only warnings/nits → **DEVIATIONS PRESENT**.
- No deviations recorded → **CLEAN**. End the report here.

If `--changed` was used and the diff is empty, say so and exit cleanly.

---

## 6. Offer to fix

After presenting findings, ask whether to apply auto-fixable items:

- Missing test file → invoke `/tests:compose <name>` for each missing target.
- Stray `.only` / `fdescribe` / `fit` → strip it.
- Wrong file extension (`.test.ts` rendering JSX) → rename to `.test.tsx`.
- Wrong test-layout location → move to match the package's `testLayout`.
- `'use client'` directive in a test → remove it.

Never modify an existing test file beyond the structural fixes listed above; new files and pattern additions go through `/tests:compose`.

---

## Important

- Source analysis only. Never run the test suite, boot a dev server, or write to test files without explicit go-ahead.
- The audit's deliverable is the verdict. Deviations are evidence; a CLEAN run is a successful run. Do not manufacture nits to justify a non-empty report.
- Read `testRunner`, `testLayout`, `componentsDir`, and per-package source roots from the manifest. Never invent values the manifest doesn't report.
- The REQUIRED patterns from `/tests:compose` section 4 are the canonical coverage matrix. New required patterns belong in `/tests:compose`, not here.
- Honor exclusion lists in `CLAUDE.md` / `AGENTS.md` under a `## Tests skip list` heading. If none, treat as no exclusions.
- In `suite` mode, **rank, then truncate**.