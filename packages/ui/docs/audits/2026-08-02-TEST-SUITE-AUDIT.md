# Test Suite Audit

Survey of the `packages/ui` Vitest suite (2026-08-02) for speed, stability, and consolidation. The suite holds 524 test files. 444 of them run under `pnpm test`; the other 80 run in the browser suite. The jsdom suite runs 5643 tests.

The method is the one the built-in adoption audit set: a claim is not a finding until somebody read, probed, or ran something. Three lenses swept the suite and a skeptic tried to refute each claim. 26 claims went in; 18 survived and 8 did not. The refuted claims are recorded under Ruled out, because they name ground that the next audit does not need to walk again.

The headline is one config change. The suite spends 69% of its processor work on per-file fixed cost, not on test execution. One pool change removes most of that cost and takes the suite from 143.4s to 97.7s. The rest of this document is mostly about what that change makes unsafe, because a shared environment turns three latent leaks into real ones.

## Measured

All numbers come from an idle machine with 4 cores. Compare them only against each other. An earlier container ran about 40% slower, and that difference invalidated one inference (see Corrections).

The committed configuration runs 444 files and 5643 tests in 143.3s. The three projects are not equal:

| project | pool | files | wall |
|---|---|---|---|
| `unit` | vmThreads, jsdom | 407 | 149.6s alone |
| `boundary` | threads, node, `isolate: false` | 20 | 4.0s |
| `integration` | forks, jsdom | 17 | 24.0s |

The phase split explains where the time goes: transform 36.3s, setup 97.4s, import 167.5s, tests 162.5s, environment 75.1s. Test execution is 162.5s of 539s. The other 69% is the cost to start each file.

## Ready

**Move the `unit` project to `pool: 'threads'` with `isolate: false`.** The pool matrix over the 407 unit files is unambiguous:

| variant | wall | setup | import | tests |
|---|---|---|---|---|
| vmThreads + isolate (committed) | 134.3s | 123.7s | 163.0s | 166.4s |
| threads + isolate | 290.5s | 140.0s | 166.5s | 187.5s |
| threads + `isolate: false` | 51.0s | 6.5s | 37.9s | 141.4s |

`isolate: false` evaluates the setup files and the module graph once for each worker, not once for each file. Setup drops by a factor of 19. Import drops by a factor of 4.3.

On the full three-project configuration the change takes the suite from 143.4s to 97.7s. Six shuffle seeds passed, and all 5643 tests passed in each. The control passed twice at 141.5s and 145.3s.

The change also lowers memory. Peak resident set is 1485 MB against 2440 MB for the control, because vmThreads holds a VM context for each file. `vmMemoryLimit: '1GB'` is a cost of vmThreads, not a guard that the candidate lacks.

The precondition is already paid. A shared module registry breaks on a per-file `vi.mock`, and the `unit` project has none. All three live in `integration`, which keeps the `forks` pool: `boundary/query-builder.test.tsx:17`, `boundary/use-chat-scroll.test.ts:12`, and `boundary/use-pdf-viewer-document.test.ts:5`. Two `unit` files name `vi.mock` in a comment only, and both say they use the global mock and spies instead, because a per-file mock "races the global mock under the shared vmThreads module cache" (`components/shiny-text.test.tsx:7`, `components/use-hold-button-gesture-reduced-motion.test.ts:33`).

`setup/restore-prototype-focus.ts` improves under the change. It captures the pristine `HTMLElement.prototype.focus` and `blur` descriptors once at worker start, ahead of any `userEvent.setup()`. That is what its comment asks for.

## Prerequisites

The change shares one jsdom window across the ~100 files that each worker runs. Three leaks are invisible today only because vmThreads discards the window for each file. Fix them first, while `isolate: true` still attributes a leak to the file that caused it.

**`printRows` leaves a live `<iframe>` in `document.body`.** `modules/grid/engine/grid-export/print.ts:74` appends the iframe. `iframe.remove()` runs only from `cleanup` (`print.ts:49`), and `cleanup` runs only on `afterprint` or on a window `focus` event. jsdom fires neither, and `setup/jsdom-stubs.ts` stubs `window.focus` to a `vi.fn()`. The node therefore survives its own file. The a11y sweeps assert over `document.body`, so this iframe lands in the tree that they read.

**Some suites remove body nodes after the assertion, not in an `afterEach`.** A real failure then leaves the node behind. Today the window dies with the file. Afterwards, one root-cause failure becomes many failures in unrelated files, and the true cause is hard to find.

**Ref-counted DOM singletons hold process-global state.** `use-scroll-lock`, `use-grabbing-cursor`, and `dismiss-layers` balance a counter on mount and unmount. Four more modules keep module-scope mutable state and touch `document` or `window`: `utilities/media-query.ts:7`, `utilities/document-listener.ts:6`, the time-ago tickers, and `use-truncation`'s shared `ResizeObserver`. The last one is the worst, because it caches a global that a test installed and keeps it after the test restores it. Export a reset for each, and call it from the `afterEach` in `setup/index.ts`, beside `__resetAnnouncer` (`core/announcer.ts:67` is the precedent).

**Three hook test files call `vi.resetModules()` seven times.** `hooks/use-media-query.test.ts:13,25,41`, `hooks/use-min-width.test.ts:13,25`, and `hooks/use-has-hover.test.ts:15,27` each reset the graph and then re-import the hook. `vitest.config.ts:58` forbids exactly this and gives the reason. Today vmThreads already shares the graph, so the cost sits in both baselines. Afterwards each call invalidates a graph that the files behind it must rebuild. Replace them with an explicit reset seam on `utilities/media-query.ts`.

**Vitest 4.1.10 ships `--detectAsyncLeaks`, and nothing here uses it.** Run the unit project with it once under the current configuration and fix what it names. It reports async resources that outlive their file. After the pool change a leaked timer fires inside a sibling file and the trail is gone. Keep it as a diagnostic script, never as a default: it captures a stack for every async resource.

**Add a leak probe.** One cheap check for each test converts a mysterious failure 40 files later into a failure in the file that caused it. Assert that the reset seams are at rest and that `document.body` is empty. This is the change that makes the pool change safe instead of lucky.

## Open

**`api-extractor.test.ts` builds nine ts-morph Projects with the full ES2022 lib.** The fixture tsconfig asks for `lib: ['ES2022']` (`api-extractor.test.ts:33`), but every fixture resolves intrinsic types only. `build-api.ts:133` opens a fresh Project for each call, and the checker merges the lib global symbol table again each time. Set `noLib: true` on the fixture. The saving is per-test processor time, so measure it from the per-file report at `--maxWorkers=1`, not from suite wall clock.

**The axe runners serialize a selector and the source HTML for every passing node.** Both consumers read `violations` only. Pass `resultTypes: ['violations']` in `helpers/axe.ts`. Rule evaluation does not change, so this cannot take the whole 8.5s that the a11y suites spend.

**`grid-row-manager.test.tsx` holds a duplicated three-click path.** `opens the manager and colors a group` and `tints the group header aggregation with the group color` drive the identical path and differ only in what they read. Fold the second into the first. The rest of that file's cost is inherent: the assertion needs both the grid and the dialog.

**About 300 assertions restate a Tailwind class string that lives in `src/recipes`.** They fail on a cosmetic recipe edit that changes no behaviour, and they pass when the recipe row is wrong but the class is present.

**Five repeated test shapes belong in the shared corpus.** `CONVENTIONS.md` §10.5 already routes them there. The density triad appears in 10 files (28 tests). "passes through HTML attributes" appears 30 times in 27 files. 21 skeleton-pairing tests are identical, while 2 of 30 skeleton components have no render test at all. The text-input triad repeats across 13 components. "renders as a link when href is provided" appears 9 times. Build **one** component registry with optional columns, and derive each sweep from it. Four separate tables would mean four edits for each new component.

**The 42-file grid cluster has no shared fixture.** Each file rebuilds `Row`, the columns, the rows, and `getKey`. A change to `GridColumn`'s shape is a 37-file edit. This is a maintenance finding, not a speed one: the fixtures are cheap object literals.

**`installResizeObserverStub` is copied into six files.** Extract one helper, and install it with `vi.stubGlobal` so that `unstubGlobals` is the backstop. Keep it out of `helpers/index.ts` for the reason at `helpers/index.ts:9`.

**80 browser test files (234 tests) run under no gate.** `.github/workflows/ci.yml:32` is the whole gate, and it never runs `test:browser`. `turbo.json` declares no such task. `CONVENTIONS.md:108` routes every layout, colour, target-size, and focus-trap assertion into that suite, so this is the largest coverage hole found. Either gate it in a separate CI job, or record in `vitest.browser.config.ts` that it is manual. The current state cannot be told apart from an oversight.

## Corrections

**The `boundary` and `integration` projects do not carry half the wall clock.** An earlier claim compared a 201.7s full run against a 105.3s `unit` run measured on a slower container. Measured side by side, `boundary` is 4.0s and `integration` is 24.0s against `unit`'s 149.6s. The `unit` project is nearly the whole suite.

**The `forks` pool is not the cost that it looked like.** The integration file set runs in 18.0s on forks, 17.5s on threads, and 15.7s on vmThreads. The pool buys about 2s. Keep `forks` and keep the isolation.

**File count is not a speed lever.** An earlier claim priced 276 small files at ~1.2s of fixed cost each. The pool change banks that saving whole: setup across all 407 files falls to 6.5s. Consolidation stays worth doing for maintenance. Do not sell it as speed.

**The 67 bare `userEvent.setup()` sites are not a speed lever either.** 330 sites exist and 257 pass `{ delay: null }`. The 23 files that hold the bare sites drive only about 85 action steps in total, which is sub-second processor time. Make them consistent, and drop the speed rationale.

## Ruled out

Eight claims did not survive. They are recorded so that nobody re-opens them.

**The docs engine does not re-pay module resolution or the lib parse for each test.** `helpers.ts:19` holds a `diskSourceFileCache` that caches lib and on-disk `.d.ts` source files once for each worker. `PROJECT_ROOT` is `/project`, which does not exist, so a Bundler-mode resolver has nothing to walk. The `api-extractor` finding survives because it names a different mechanism: per-Program checker initialization, which no cache covers.

**A bare `userEvent` re-export does not cost a pointer-events check that cannot fire.** jsdom folds inline styles into the computed style, so the check can fire. The proposed change also breaks call sites.

**`use-truncation`'s cached `ResizeObserver` does not create a cross-file hazard on its own.** The code reads as quoted, but the harm chain does not exist under the unit project's jsdom. It is still worth a reset seam on principle, because it captures a test-installed global.

**The print path's `focus` listener does not accumulate.** The cited line is the `removeEventListener` inside `cleanup`, not the registration. The pdf mirror is exercised only by a suite in the `integration` project, which keeps process isolation.

**`CodeBlock`'s html cache cannot flip its assertion.** The two files do share a cache key, but on a cache hit the component paints the same result that the assertion expects.

**`sequence.shuffle` does not make a red run unreproducible.** The reporter prints the seed on every run, and `--sequence.seed` replays it.

**`onUnhandledError` cannot be scoped per project.** Vitest resolves it once from the root config. The proposed change would remove the protection that the comment exists for.

**The `<name>.test` and `<name>-utilities.test` split does not follow the stated rule.** The claim was that a `-utilities.test.ts` exists if and only if a `-utilities.ts` module exists. Its own evidence contradicts it: `modules/grid-sorting-utilities.test.ts:2` imports from `modules/grid/engine/grid-sort`.

## Order

The sequence matters, because some changes make others impossible to measure.

1. Fix the leaks and add the probe, while `isolate: true` still names the guilty file. Run `--detectAsyncLeaks` first and fix what it reports.

2. Change the pool alone. Put nothing else in that commit, or the 143.4s to 97.7s attribution is lost. Record the seed that the reporter prints.

3. Measure `noLib` and `resultTypes` before and after, from the per-file report at `--maxWorkers=1`. Wall clock over 4 workers divides the signal into noise.

4. Consolidate last, and on the maintenance argument only.

---

**See also:** [`CONVENTIONS.md` §10](../../../../CONVENTIONS.md) · [`vitest.config.ts`](../../vitest.config.ts).
