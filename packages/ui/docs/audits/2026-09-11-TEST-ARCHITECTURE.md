# Test Architecture Proposal

Proposal for the `packages/ui` test suite (2026-09-11): one real-browser DOM suite, a node project for the pure layer, a disk module cache, one component registry that feeds every sweep gate, and lint rules in place of the import-layering boundary tests. The measured speed wins are the browser suite without isolation (190s to 44s) and the module cache (60s to 51s on the unit project); the browser convergence is a simplification at wall-clock parity, and the rest is structure. The [August audit](2026-08-02-TEST-SUITE-AUDIT.md) banked the runner wins: pool, isolation, and sequencer took the jsdom suite from 143s to about 47s. This document starts where that one stopped. Every number below comes from a run on this machine; the method is the one the audits set, so a claim is a finding only after a run showed it.

The suite holds 592 test files and about 115,000 lines. 492 files and 6,743 tests run under `pnpm test`; 100 files and 539 tests run in the browser suite. The test infrastructure is 2,223 lines across 44 files, and about half of those lines are comments that explain a jsdom workaround.

## Measured

All numbers come from a shared 4-core container. Compare them only against each other; the August audit ran on an idle machine that was about twice as fast.

The jsdom suite (`pnpm test`) runs 492 files in 91.4s of wall clock. The phases sum across workers: tests 196.6s, import 76.2s, transform 41.7s, setup 18.3s. Test bodies are now the largest phase, and the August audit's fixed cost is gone. The per-test profile is flat: the slowest test is a 1.9s TSDoc walk, only 73 tests exceed 200ms, and 54 percent of the test time sits in the 1,016 tests over 50ms. There is no fat tail to cut.

Per-test cost follows the interaction style, not the component:

| style | files | tests | ms per test |
|---|---|---|---|
| no DOM at all | 162 | 2,078 | 13.9 |
| render, assert only | 195 | 1,666 | 18.7 |
| `fireEvent` | 76 | 1,483 | 42.0 |
| `userEvent` | 59 | 1,516 | 48.5 |

The browser suite (`pnpm test:browser`) runs 100 files in 190.3s. Its import phase sums to 565.7s and its setup phase to 98.6s: each file re-imports the module graph, because the browser config leaves `isolate` at its default. Test bodies take 120.1s.

**The same jsdom tests run in Chromium at wall-clock parity, with cheaper test bodies.** A trial config pointed the `components/`, `hooks/`, and `primitives/` directories (215 files, 3,016 tests) at the browser provider with `isolate: false`, the browser setup files, and the browser module mocks. The jsdom run of the same three directories, on four workers, took 20.9s of wall clock with test bodies at 35.7s summed. The Chromium run took 32.3s cold and 27.6s warm, on one page, with test bodies at 25.0s summed; the files themselves ran in a 19.0s span, and the rest was fixed startup (the Vite server, the dependency optimizer, and the browser launch). A four-instance variant, one page per quarter of the file list, took 39.3s warm: each instance re-imports the whole graph, and four pages saturate four cores. So on this machine the browser is not a wall-clock win. It is a 30 percent cut in test-body cost behind a fixed startup, and that startup does not grow with the suite.

The trial failed 48 of 3,016 tests in 16 files, and every failure is test infrastructure, not component behaviour:

| cause | tests | fix |
|---|---|---|
| `fireEvent.drop` with a fake `dataTransfer` object | 15 | build a real `DataTransfer` in `makeFileList` |
| `motion` and `shiki` not in the browser mocks | 11 | add both to `browser/setup/module-mocks.ts` |
| `el.focus = vi.fn()` after `userEvent` patched the getter | 7 | `vi.spyOn(el, 'focus')` |
| `vi.spyOn` on an ESM namespace export (`announce`) | 6 | mock `core/announcer` in setup, or assert on the live region |
| live-region assertions with no `__resetAnnouncer` | 4 | port the `afterEach` from the jsdom setup |
| real layout and real CSS serialization | 3 | assert the behaviour, not the pixel or the shorthand |
| timezone and locale not pinned in the page | 2 | `timezoneId` and `locale` on the Playwright context |

**The disk module cache pays for itself on the second run.** Vitest 4.1 ships `experimental.fsModuleCache`. With it on, the `unit` project ran in 60.0s cold and 50.7s warm; transform fell from 40.0s to 8.9s and import from 57.1s to 24.2s. The cache is 29 MB on disk.

## Findings

**The workaround layer exists because jsdom has no layout.** `setup/jsdom-stubs.ts` (135 lines) stubs `matchMedia`, `ResizeObserver`, an `IntersectionObserver` that reports every target visible at once, `scrollIntoView`, `scrollBy`, canvas `getContext`, `window.print`, an `<iframe>` `contentWindow` getter, and object URLs. `setup/restore-prototype-focus.ts` undoes a `userEvent` patch that jsdom cannot undo itself. `helpers/with-fake-time.ts` installs a fake `jest` global so RTL's `waitFor` advances the clock. `vitest.config.ts` swallows one `window is not defined` error from a virtualizer timer that outlives its file. `helpers/mock-dom-geometry.ts` and `helpers/stub-resize-observer.ts` fake the geometry that nine and seven files need. The `virtual-options` tests assert only that the row count is bounded, because react-virtual renders zero rows in a zero-size viewport. None of this exists in the browser suite, whose setup is 61 lines.

**The split in `CONVENTIONS.md` §10.5 costs a second file per component.** Eight components carry a jsdom file and a browser twin (`grid-pinning`, `grid-width-settle`, `grid-row-reorder`, `grid-infinite-scroll`, `grid-resize`, `chart-aspect-legend`, `chart-resize-tracking`, `use-is-truncated`), and each twin's header explains what jsdom could not see. The a11y gate disables `color-contrast`, `target-size`, and `region` under jsdom and re-enables the first two in three browser files. The corpus in `a11y/cases` already feeds both suites, so the case list has one home and two runners.

**A third of the jsdom suite touches no DOM.** 142 of 411 files in the unit tree import nothing from Testing Library and reference no `document`, `window`, or `render`. `utilities/` (18 of 18), `recipes/` (9 of 9), and the module engines (`map-geometry`, `chart-scale`, `query-evaluate`, `grid-sort-state`, and 41 more `.test.ts` files under `modules/`) are pure. Each of them pays jsdom, three setup files, and four `vi.mock` doubles for nothing, and each can leak DOM state into the shared window by accident. The `.test.ts` extension is not a clean proxy: 37 of the 52 `.test.ts` files under `components/` are hook tests on `renderHook`.

**Five test shapes repeat across the component tree.** The August audit counted them: the density triad (28 tests, 10 files), "passes through HTML attributes" (30 tests, 27 files), 21 identical skeleton-pairing tests, the text-input triad across 13 components, and "renders as a link when href is provided" (9 files). `a11y/cases` is already the registry that the axe, focus, trap, and roved gates read; the other five shapes have no registry, so a new component gets them by copy or not at all.

**Half of the DOM assertions read structure, not behaviour.** `bySlot` and `allBySlot` appear at 1,994 sites in 150 files, more than `getByRole` (857 sites, 91 files). Tailwind class strings are asserted at 107 sites in 33 files, `tagName` at 113 sites in 60 files. A class assertion fails on a cosmetic recipe edit and passes when the recipe row is wrong but the class is present; `recipes/` already tests the recipes directly. `bySlot` returns `null`, so 62 files pair it with `present()` to get what a Testing Library query gives for free: a thrown error with a DOM dump, and a `findBy` variant.

**The boundary project holds two kinds of rule.** Ten of the nineteen `*-boundary` tests are import-layering rules over source text (`hook-purity`, `primitive-purity`, `kiso`, `katakana-purity`, `kata`, `recipe-import`, `create-context`, `component-ma`, the sibling-import half of `component-boundary`, the import half of `engine-purity`). Biome 2.5 expresses each of them as `noRestrictedImports` with gitignore-style `patterns` under a per-glob `overrides` entry, and its GritQL plugins cover the two banned-token scans (`spacing`, `data-slot`). The other rules are semantic and stay as tests: `tsdoc-coverage` walks alias chains with the compiler API, the two filename rules check symbol-to-filename parity, `static-component` holds a curated contract, `test-isolation` re-parses `vitest.config.ts`, and `component-boundary` ties a Context render to `'use client'`.

**Helpers duplicate what one generic factory or the runner already does.** `makeChangeEvent`, `makeFocusEvent`, `makePointerEvent`, and `makeKeyEvent` share one shape; `matchMedia` and `ResizeObserver` are stubbed twice each; `noop` is declared five times; `stubWindowScrollBy` has no test importer; 12 files carry an `afterEach(vi.unstubAllGlobals)` that `unstubGlobals: true` already runs; 13 files hand-roll fake timers beside the `withFakeTime` helper that 9 files use; `userEvent.setup({ delay: null })` appears 327 times with no fixture. Three files define the same `makeWrapper`.

## Architecture

The proposal has six parts. The first three change where tests run; the last three change how tests are written. Each part stands alone, and the Order section gives the sequence that keeps every step measurable.

### 1. One real-browser suite for every DOM test

Move every test that renders into Vitest browser mode on Chromium, with `isolate: false`, and retire the jsdom environment. The trial shows the price is 48 test edits in five infrastructure seams and a fixed startup of about nine seconds. The return is an accurate DOM, test bodies at 0.70 of their jsdom cost, one runner in place of two, and the deletion of the workaround layer. This is the simplification move of the proposal, not the speed move; parts 2 and 3 and the `isolate` fix under Ruled out are the speed moves, and they come first in the Order.

Keep three instances, split by what a setup-file `vi.mock` must toggle:

- `dom`: `@floating-ui/react`, `motion`, `motion/react`, and `shiki` mocked, as the `unit` project mocks them today. This instance absorbs `components/`, `modules/`, `hooks/`, `primitives/`, `providers/`, `layouts/`, `a11y/`, `docs/`, the integration files now under `boundary/`, and the current `browser/` files.
- `floating-ui`: `@floating-ui/react` real, as today.
- `isolated`: `isolate: true`, for the five files that `vi.mock` a source module (`map-centroid-deferral`, `map-path-deferral`, `map-points-render`, `query-builder`, `use-pdf-viewer-document`). The rest of today's `integration` project moves to `dom`: the virtualizer timer that forced process isolation fires into a real window, where `window` is defined.

What the change deletes: `setup/jsdom-stubs.ts`, `setup/restore-prototype-focus.ts`, the fake `jest` global in `with-fake-time.ts`, `mock-dom-geometry.ts`, `stub-resize-observer.ts`, `stub-match-media.ts`, the `onUnhandledError` filter, the `LANG` guard and the `TZ` pin (the Playwright context pins both), the axe rule exclusions in `helpers/axe.ts` and the three browser files that re-enable them, the eight jsdom twins whose browser file already owns the behaviour, and the `jsdom` dependency. `CONVENTIONS.md` §10.5 loses its second sentence: one runner, one placement rule.

What the change keeps: `renderUI`, `bySlot`, the module mocks, the corpus, `sequence.shuffle`, the timeout policy, and the reporter setup. `IS_REACT_ACT_ENVIRONMENT` stays `true`: the trial ran with RTL's default and the synchronous tests passed. The current browser files that set it to `false` for real `ResizeObserver` callbacks keep their `waitFor` form.

Two parts of the trial are unverified. `modules/` (143 files, 83s of jsdom test time) did not run in the trial; the grid, chart, and map suites use `mockDomGeometry` and the ResizeObserver stub most, so their edit count will be higher than the components' 48. And the wall clock for the full suite on a machine with more cores is unmeasured: the four-instance variant lost on four cores because each page pays the graph import, and that trade reverses only where the cores outnumber the pages. Measure the full suite on the CI runner before the jsdom project goes; if the browser suite lands above the jsdom suite by more than its fixed startup, keep both runners and move only the files that jsdom fakes (the nine `mockDomGeometry` files, the seven ResizeObserver-stub files, and the virtualizer suites).

### 2. A node project for the pure layer

Add a `pure` project with `environment: 'node'`, no setup files, and `isolate: false`, and route the 142 no-DOM files into it. Route by path where a directory is wholly pure (`utilities/`, `recipes/`) and by a `// @vitest-environment node` docblock elsewhere, with one boundary rule: a file in a DOM project that imports nothing from Testing Library and names no `document` or `window` must carry the docblock. The rule is a `collectPatternViolations` scan like the others, and it turns the split into a gate rather than a convention.

The speed gain is small: about 37ms of setup per file, or six seconds of worker time. The accuracy gain is the point. A pure test cannot reach the shared window, cannot depend on a mock it did not ask for, and runs anywhere Node runs, with no browser and no locale export.

### 3. The disk module cache, on every machine

Set `experimental.fsModuleCache: true` in both configs and add its directory to the CI cache beside `.turbo`, keyed on the lockfile with a restore prefix. The warm path took 9.3s off the unit project on this machine and 31s off its transform phase; on CI the restore turns every run into a warm run. The option is experimental, so pin the Vitest version and drop the flag if a release note changes its semantics.

### 4. One component registry, every sweep derived

Grow `a11y/cases` into the registry it already is. Each entry keeps its canonical `element` and gains optional columns: `slots` (the `data-slot` anchors the component publishes), `open` (the interaction that reveals an overlay), and capability flags for `density`, `passthrough`, `skeleton`, `href`, and `textInput`. The sweep gates read the columns: the axe baseline, focus, trap, and roved gates as today, plus five new sweeps that replace the density triad, the attribute pass-through test, the skeleton pairing, the text-input triad, and the link-when-href test. A new component writes one entry and receives every gate; a component that lacks a capability omits the column and no test is skipped by hand.

The registry removes about 130 hand-written tests and, with them, the drift the audit found: two of thirty skeleton components with no render test, and 21 identical tests that differ only in the import line.

### 5. Queries and assertions that read like the contract

Build `getBySlot`, `queryBySlot`, `findBySlot`, and their `All` forms with Testing Library's `buildQueries`, bind them into `screen` and `within` through `configure`, and retire `bySlot` and `present`. The change is mechanical over 1,994 sites, and a codemod does it in one commit. Each query then throws with a DOM dump on a miss, and `findBySlot` replaces the `waitFor(() => bySlot(...))` form.

Remove the 107 Tailwind class assertions. Where the test wanted a behaviour (a drawer that fits its content, a menu that scrolls at its cap), assert it in the browser through computed style or geometry. Where it wanted the recipe, the recipe tests under `recipes/` already own it. Leave `tagName` assertions where the element type is the contract (a `<fieldset>` for a menu section) and drop them where it is not.

Introduce property-based tests for the engines through `@fast-check/vitest`. The pure layer holds the invariants that tables under-sample: CSV quoting per RFC 4180, ring winding and spherical area in `map-geometry`, tick placement in `chart-scale`, sort stability and group nesting in the grid engine, evaluation in `query-evaluate`, and number formatting. A property replaces a table of five rows with a generator over the domain, and it shrinks a failure to the smallest input. Keep the tables for the documented examples and add a property beside each.

Consolidate the helpers: one `makeEvent<T>` factory for the four event builders, one `matchMedia` stub, one `ResizeObserver` stub, one `noop`, a `user` fixture through `test.extend` so `userEvent.setup({ delay: null })` is written once, and `withFakeTime` as the only fake-timer path. Give the grid cluster one fixture module (`fixtures/grid.ts`) with `Row`, the columns, the rows, and `getKey`, so a change to `GridColumn` is one edit and not 37.

### 6. Import rules in Biome, semantic rules in tests

Move the ten import-layering rules into `biome.json`: one `overrides` entry per source layer, each with `noRestrictedImports` and the `patterns` that the test's regex encodes today. Move the two banned-token scans into GritQL plugins scoped by `includes`. Each rule then runs in `biome check`, on staged files at pre-commit, and inline in the editor, and the `boundary` project keeps the nine semantic rules and the two recipe-arithmetic invariants.

The speed gain here is small, because the boundary rules take 72ms at the median. The gain is that a violation surfaces at the keystroke, and that about 600 lines of `walkSource` regex become declarative configuration.

## Risks

**Browser mode changes what `act` sees.** Real `ResizeObserver`, `IntersectionObserver`, and scroll events land outside React's act scope. The current browser files handle this with `waitFor`; the migrated jsdom files that stub those observers today will need the same form where they asserted synchronously after a resize. The trial found three such assertions in 215 files.

**Chromium in the gate job.** The gate today runs without a browser, and the browser job exists so the download does not serialize into it. With one suite there is one job, and it pays the cached download (about 170 MB, keyed on the lockfile) on every cache miss. Measure the cold-cache cost before the merge; the alternative is to keep two jobs and split the instances across them.

**`isolate: false` in a browser shares one window across files.** The jsdom suite has run that way since August and its residue rules apply unchanged: remove appended nodes in `onTestFinished`, never `vi.mock` per file, and keep `sequence.shuffle` on so an order dependency fails early. The `test-isolation-boundary` rule extends to the new instances by adding them to its project list.

**The fs module cache is experimental.** Vitest documents it as such. If a release changes its invalidation, a stale module serves a test; the CI key on the lockfile bounds that to one dependency bump, and `VITEST_SEED` replay does not depend on it.

## Ruled out

**happy-dom as a faster jsdom.** Not measured. happy-dom 20.14 under `pool: 'threads'` with the unit project's setup files exited the worker before the first file ran, and a CLI `--environment` override did not reach the project. The suite's focus, selection, and `Range` assertions are the surface where happy-dom differs most from a browser, so a measurement that passes would still trade accuracy for speed in the wrong direction. Part 1 removes the question: there is no DOM emulator to pick.

**Sharding the browser suite across instances on four cores.** Measured above: four non-isolated pages took 39.3s where one took 27.6s, because each page imports the graph. The lever exists for larger machines only.

**Sharding the suite across CI jobs.** The full jsdom suite is 91s here and about 47s on a fast machine, and the gate job also runs lint, types, knip, and the build. A shard matrix would add a checkout and install per shard and save less than it costs. Revisit only if the merged browser suite lands above two minutes.

**Snapshot tests.** The suite has none, and the proposal adds none. A snapshot pins structure, which is the class of assertion this proposal reduces.

**Running the current browser suite in isolation.** With `--no-isolate` on the existing browser config, the 100-file suite ran in 43.8s against 190.3s, and all 539 tests passed. That result is a free win to take now, ahead of part 1, and it is the same lever the migrated suite depends on.

## Order

1. Turn on `fsModuleCache` in both configs and cache its directory in CI. One commit; measure the CI wall clock before and after.

2. Set `isolate: false` on the existing browser config. One commit; the measured number above is the acceptance test.

3. Add the `pure` project and its docblock rule. Route `utilities/` and `recipes/` by path first, then the module engines by docblock.

4. Migrate the DOM suite to the browser in directory-sized commits: `components/`, then `hooks/` and `primitives/`, then `modules/`, then the `integration` files, then delete the jsdom project and its workaround layer. Fix the five infrastructure seams in the first commit, so each later directory lands with fewer edits.

5. Grow the registry and derive the five sweeps. Delete the hand-written copies in the same commit as each sweep.

6. Land the slot queries by codemod, then remove the class assertions directory by directory.

7. Move the import rules to Biome and delete their tests, one rule per commit, with the test's fixture run against the lint rule before the test goes.

8. Add properties to the engines last. Nothing depends on them, and each one is a small, independent change.

---

**See also:** [2026-08-02 test suite audit](2026-08-02-TEST-SUITE-AUDIT.md) · [`CONVENTIONS.md` §10](../../../../CONVENTIONS.md) · [`vitest.config.ts`](../../vitest.config.ts) · [`vitest.browser.config.ts`](../../vitest.browser.config.ts).
