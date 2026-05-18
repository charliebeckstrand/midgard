# tests:audit

TRIGGER when: audit, check, review, or scan tests / coverage / suite — "are the tests in sync", "any stale tests", "does every component have a test", "run the test audit". Auto-eligible after `/tests:compose` writes new tests.

Compare test files against the project's test baseline (coverage matrix + `/tests:compose` REQUIRED patterns + authoring conventions). Report deviations as `file:line` entries by severity. CLEAN runs emit no table.

## Arguments

$ARGUMENTS

- A component, hook, or module name → audit only that target's test file.
- A path → audit a specific test file or subdirectory.
- `--changed` → audit test files in `git diff --name-only` (staged + unstaged), plus tests for source files whose source changed.
- `--top N` → in suite or changed mode, show top N worst offenders (default 10).
- No arguments → audit every test file in every package, plus check for source files missing a test.

---

## 1. Manifest

Read `./manifest.json`. If missing, halt with a pointer to `/repo:manifest`.

Per package, capture:

| Field | Use |
|---|---|
| `path`, `name` | map test files to packages |
| `testRunner` | drives expected imports and assertions; `null` → one package-level finding, skip the package |
| `framework` | drives whether component-testing helpers should appear |
| `testLayout` | `sibling` or `mirror`; drives location checks |
| `componentsDir` | source of truth for which components need tests |
| `isFrontend` | gates component-pattern checks |
| `conventions.principles` | drives classification of over-testing and dead-test findings |

Read `testHelpersDir`. If `null`, glob the package source for `test-utils.{ts,tsx}`, `setup.{ts,tsx}`, `helpers.{ts,tsx}`, or `__tests__/helpers/`. Treat the discovered file as the canonical render-helper source.

Security-sensitive and project-specific paths aren't in the schema — detect them inline. Never invent a manifest field.

---

## 2. Locate test files

Per qualifying package, collect:

- Every `*.test.*` / `*.spec.*` under the source root (`sibling`) or `__tests__/` (`mirror`).
- The package's **test setup file** (`vitest.setup.*`, `jest.setup.*`). Don't flag per-file findings for mocks declared in the setup file.
- The **project-local helpers file** discovered in §1, if any.
- Source files that should have a corresponding test (every non-trivial export under `componentsDir`, `src/hooks/`, `src/utils/`, or the package equivalent).

---

## 3. Resolve scope

Priority order:

1. Explicit target name or path → audit only that.
2. `--changed` → `git diff --name-only HEAD` plus unstaged. Keep: test files in the diff, plus tests for source files in the diff.
3. No argument → every test file in every package, plus the coverage check (§4.1) against every testable source file.

Record the mode: `single` / `changed` / `suite`.

---

## 4. Checks

Each check defines one baseline. A check that holds emits nothing. A nit earns its row only when it would survive a second reader's review.

Severity:

| Severity | Meaning |
|---|---|
| **blocker** | broken test (won't run, wrong target, dangling `.only`, missing `describe`/`it`) |
| **warning** | meaningful drift (missing required pattern, source-surface mismatch, mock state leak, layout mismatch) |
| **nit** | style or coverage hint |

**Non-trivial** in this skill: a runtime value or component export. Skip pure type exports, barrel re-exports, zero-branch constants.

### 4.1. Coverage

- **blocker** — non-trivial source export under `componentsDir` / `src/hooks/` / `src/utils/` has no matching test. Skip exclusions in `CLAUDE.md` / `AGENTS.md` / per-package skip lists.
- **warning** — test file exists for a source file that no longer exists.
- **nit** — fewer than 2 `it()` blocks for a non-trivial target.

### 4.2. Required patterns from `/tests:compose`

Classify each test file by target type (component, hook, pure function, module) and apply the REQUIRED patterns from `/tests:compose` §4:

- **blocker** — no `describe` or `it` block.
- **warning** — component test missing root-marker check (4.1.A).
- **warning** — component test missing `className` merge check (4.1.B).
- **warning** — hook test missing initial-value check (4.2.A).
- **warning** — pure-function test missing happy-path check (4.3.A).
- **nit** — component test covers only required patterns and skips every conditional pattern the source uses (`ref`, `as`, event forwarding, `disabled`, `loading`).

### 4.3. Runner and helper drift

- **blocker** — test imports from a runner the package doesn't declare (`from 'jest'` in a vitest package; `from 'vitest'` in a jest package).
- **warning** — test imports raw `@testing-library/react` `render` when the package ships a project-local render helper.
- **warning** — test imports a framework helper inside a `library` or `node` package with no frontend surface.
- **nit** — `'use client'` directive in a test file.

### 4.4. Mock hygiene

- **blocker** — `.only` / `f` variant (`it.only`, `fdescribe`, `fit`) left in the file.
- **warning** — `vi.stubGlobal` / `jest.spyOn` / `mockImplementation` carrying state with no `beforeEach` reset or `afterEach` restore.
- **warning** — `vi.mock` / `jest.mock` of a module the test never imports.
- **nit** — `it.skip` / `xit` / `xdescribe` with no explanatory comment.
- **nit** — empty `it()` block with no assertions.

### 4.5. Source-surface sync

Parse the matching source file:

- **warning** — test references a prop, export, or method that no longer exists.
- **warning** — test asserts a literal variant / size / color value no longer in the source's union.
- **nit** — source has a documented prop (`disabled`, `loading`, `readonly`, `invalid`) with no matching `it()` block.
- **nit** — source uses `forwardRef` but test doesn't exercise ref forwarding.

### 4.6. Test layout and naming

- **warning** — test at `sibling` location when package's `testLayout` is `mirror`, or vice versa.
- **warning** — test renders JSX but extension is `.test.ts`.
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

Lead with the verdict.

| Verdict | When |
|---|---|
| **CLEAN** | no deviations — entire report; stop |
| **DEVIATIONS PRESENT** | only warnings/nits |
| **FAIL** | any blocker |

If `--changed` and the diff is empty, say so and exit.

Score for ranking: `(blockers × 5) + (warnings × 2) + (nits × 1)`.

Branch on mode:

- **`single`** — one section, full findings table.
- **`changed`** — one section per changed test file, sorted by score descending. Cap at top **10** unless `--top N`.
- **`suite`** — Deviation summary table first (top 10; baseline-holders omitted), then full per-file sections for the top-N. List the rest: `Remaining test files with deviations: N (M deviations total). Run /tests:audit <name> to inspect.`

Deviation summary table:

```
| Rank | Test | Location | Blockers | Warnings | Nits | Score | Headline finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | widget.test.tsx | packages/ui/src/components/widget/widget.test.tsx | 1 | 3 | 2 | 13 | missing-required-pattern: no className merge check |
```

Per-file section (all modes): group findings by severity (blockers → warnings → nits). Per finding: `file:line` + one-line description + one-line concrete fix (e.g. "add a `merges custom className` test per `/tests:compose` 4.1.B").

Roll-up:

```
Audited: N test files across M packages · K outside baseline
Deviations: <B> blocker · <W> warning · <I> nit
Coverage: <X>/<Y> testable units have tests (<percent>%)
```

---

## 6. Offer to fix

After findings, ask whether to apply auto-fixable items:

| Finding | Fix |
|---|---|
| Missing test file | `/tests:compose <name>` for each target |
| Stray `.only` / `fdescribe` / `fit` | strip it |
| Wrong extension (`.test.ts` rendering JSX) | rename to `.test.tsx` |
| Wrong test-layout location | move to match `testLayout` |
| `'use client'` directive in a test | remove |

Never modify an existing test file beyond the structural fixes above; new files and pattern additions go through `/tests:compose`.

---

## Rules

- Source analysis only. Never run the test suite, boot a dev server, or write to test files without explicit go-ahead.
- The verdict is the deliverable; deviations are evidence. CLEAN is a successful run. Don't manufacture nits.
- Read `testRunner`, `testLayout`, `componentsDir`, and per-package source roots from the manifest. Never invent values.
- REQUIRED patterns from `/tests:compose` §4 are the canonical coverage matrix. New required patterns belong in `/tests:compose`, not here.
- Honor exclusion lists in `CLAUDE.md` / `AGENTS.md` under a `## Tests skip list` heading. If none, no exclusions.
- In `suite` mode: rank, then truncate.
