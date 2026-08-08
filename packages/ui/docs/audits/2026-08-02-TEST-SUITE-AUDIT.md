# Test Suite Audit

Survey of the `packages/ui` Vitest suite (2026-08-02) for speed, stability, and consolidation. The suite holds 524 test files. 444 of them run under `pnpm test`; the other 80 run in the browser suite. The jsdom suite runs 5643 tests.

The method is the one the built-in adoption audit set: a claim is not a finding until somebody read, probed, or ran something. Three lenses swept the suite and a skeptic tried to refute each claim. Of 26 claims, 8 did not survive; they are recorded under Ruled out, because they name ground the next audit does not need to walk again.

The headline is one config change. The suite spends 69% of its processor work on per-file fixed cost, not on test execution. One pool change removes most of that cost, and a sequencer fix recovers what the shuffle gave back: together they take the suite from 143.4s to about 47s. The rest of this document is about what a shared environment makes unsafe, and what it turned out not to.

## Measured

All numbers come from an idle machine with 4 cores. Compare them only against each other. An earlier container ran about 40% slower, and that difference invalidated one inference (see Corrections).

The previous configuration ran 444 files and 5643 tests in 143.4s. The three projects were not equal:

| project | pool | files | wall |
|---|---|---|---|
| `unit` | vmThreads, jsdom | 407 | 134-150s alone |
| `boundary` | threads, node, `isolate: false` | 20 | 4.0s |
| `integration` | forks, jsdom | 17 | 24.0s |

The phase split explains where the time goes: transform 36.3s, setup 97.4s, import 167.5s, tests 162.5s, environment 75.1s. Test execution is 162.5s of 539s. The other 69% is the cost to start each file.

## Ready

**Move the `unit` project to `pool: 'threads'` with `isolate: false`.** The pool matrix over the 407 unit files is unambiguous:

| variant | wall | setup | import | tests |
|---|---|---|---|---|
| vmThreads + isolate (then committed) | 134.3s | 123.7s | 163.0s | 166.4s |
| threads + isolate | 290.5s | 140.0s | 166.5s | 187.5s |
| threads + `isolate: false` | 51.0s | 6.5s | 37.9s | 141.4s |

`isolate: false` keeps the evaluated module graph across a worker's files and does not rebuild it for each one. Setup drops by a factor of 19. Import drops by a factor of 4.3. Vitest still invalidates the setup modules before every file, so their bodies re-run; Vitest does not rebuild what they import.

On the full three-project configuration this alone took the suite to about 95s; the sequencer fix below took it to about 47s. Every seed run passed: twelve for the pool change, five more for the sequencer.

The change also lowers memory. Peak resident set is 1485 MB against 2440 MB for the control, because vmThreads holds a VM context for each file. `vmMemoryLimit: '1GB'` is a cost of vmThreads, not a guard that the candidate lacks.

The precondition is already paid. A shared module registry breaks on a per-file `vi.mock`, and the `unit` project has none. All three live in `integration`, which keeps the `forks` pool: `boundary/query-builder.test.tsx:17`, `boundary/use-chat-scroll.test.ts:12`, and `boundary/use-pdf-viewer-document.test.ts:5`. Two `unit` files name `vi.mock` in a comment only, and both say they use the global mock and spies instead (`components/shiny-text.test.tsx`, `components/use-hold-button-gesture-reduced-motion.test.ts`).

`setup/restore-prototype-focus.ts` keeps working under the change. It captures the pristine `HTMLElement.prototype.focus` and `blur` descriptors ahead of any `userEvent.setup()`, and its body re-runs per file, so each capture reads what the previous file's `afterEach` restored.

**`sequence.shuffle` cost more than the pool change saved.** `shuffle` selects `RandomSequencer`, whose `sort` is only `shuffle(files, seed)`; it drops the project grouping `BaseSequencer` applies, so all three projects interleave into one queue. A pool passes a worker to the next file only when the queue head belongs to the same project. At every other crossing the shared module graph was thrown away, and one measured run held 75 of them. A `groupOrder` for each project restores the grouping and takes the suite from about 95s to about 47s, with the shuffle still live inside each group. Resolved in #1039.

## Shared-window leaks

A shared jsdom window turns anything that outlives a file into a cross-file fault. vmThreads hid these, because it discarded the window for each file.

**`printRows` left a live `<iframe>` in `document.body`.** Resolved in #1039. Its `cleanup` runs only on `afterprint` or a window `focus` event, and jsdom fires neither. The a11y sweeps assert over `document.body`, so the node landed in the tree they read.

**Two suites removed body nodes after the assertion rather than in teardown.** Resolved in #1039 and #1039, which route both through `onTestFinished`. A failing assertion used to skip the removal, so one root-cause failure became many in unrelated files.

**Three hook test files called `vi.resetModules()` seven times.** Resolved in #1039. The calls were vestigial, and `test-isolation-boundary.test.ts` now bars them outright.

**Ref-counted DOM singletons hold process-global state.** Open. `use-scroll-lock`, `use-grabbing-cursor`, and `dismiss-layers` balance a counter on mount and unmount; `utilities/media-query.ts`, `utilities/document-listener.ts`, the time-ago tickers, and `use-truncation`'s shared `ResizeObserver` keep module-scope state and touch `document` or `window`. The last is the worst: it caches a global a test installed and keeps it after the test restores it. Measure each before you add a reset — the one seam this audit proposed turned out to guard nothing (see Corrections).

## Open

**`api-extractor.test.ts` builds nine ts-morph Projects with the full ES2022 lib.** The fixture tsconfig asks for `lib: ['ES2022']` (`api-extractor.test.ts:33`), but every fixture resolves intrinsic types only. `build-api.ts:133` opens a fresh Project for each call, and the checker merges the lib global symbol table again each time. Set `noLib: true` on the fixture. The saving is per-test processor time, so measure it from the per-file report at `--maxWorkers=1`, not from suite wall clock.

**The axe runners serialize a selector and the source HTML for every passing node.** Both consumers read `violations` only. Pass `resultTypes: ['violations']` in `helpers/axe.ts`. Rule evaluation does not change, so this cannot take the whole 8.5s that the a11y suites spend.

**`grid-row-manager.test.tsx` holds a duplicated three-click path.** `opens the manager and colors a group` and `tints the group header aggregation with the group color` drive the identical path and differ only in what they read. Fold the second into the first. The rest of that file's cost is inherent: the assertion needs both the grid and the dialog.

**About 300 assertions restate a Tailwind class string that lives in `src/recipes`.** They fail on a cosmetic recipe edit that changes no behaviour, and they pass when the recipe row is wrong but the class is present.

**Five repeated test shapes belong in the shared corpus.** `CONVENTIONS.md` §10.5 already routes them there. The density triad appears in 10 files (28 tests). "passes through HTML attributes" appears 30 times in 27 files. 21 skeleton-pairing tests are identical, while 2 of 30 skeleton components have no render test at all. The text-input triad repeats across 13 components. "renders as a link when href is provided" appears 9 times. Build **one** component registry with optional columns, and derive each sweep from it. Four separate tables would mean four edits for each new component.

**The 42-file grid cluster has no shared fixture.** Each file rebuilds `Row`, the columns, the rows, and `getKey`. A change to `GridColumn`'s shape is a 37-file edit. This is a maintenance finding, not a speed one: the fixtures are cheap object literals. Still open across the cluster. One file has been done and shows the shape the rest would take. `grid-editing.test.tsx` held three copies of the row type, the rows, and a render helper, one per suite. It now holds one of each at module scope, behind a `renderSessionGrid({ editable, cols })` its two grid-owned suites share.

**`installResizeObserverStub` is copied into six files.** Extract one helper, and install it with `vi.stubGlobal` so that `unstubGlobals` is the backstop. Keep it out of `helpers/index.ts` for the reason at `helpers/index.ts:9`.

## Corrections

**A reset seam for the media-query registries fixes nothing.** The prerequisite list first asked for `__resetMediaQueryRegistries`, on the theory that a registry survives its test and reaches the next file. It does not. The registry drops itself when the last subscriber unsubscribes, and RTL's `cleanup` unmounts every subscriber. A probe that failed any test which left a live registry ran over the whole unit project — 407 files, 5167 tests — and found none. The seven `vi.resetModules()` calls were therefore vestigial, and the three suites now import their hooks directly with no replacement machinery. The same reasoning is what the remaining singletons must be measured against, not assumed into.

**`--detectAsyncLeaks` does not have to run before the pool change.** The first version of this document said `isolate: true` is what attributes a leak to the file that created it. That is wrong. `base.B6Opl8PE.js` constructs the hook for each file inside the run loop, before the file's tests and independent of `config.isolate`; the flag governs the module-graph reset alone. Attribution survives the change.

**Do not run `--detectAsyncLeaks` under vmThreads.** The detector identifies a resource by building an `Error` stack and testing `stack.includes(testFile)`, and its `catch { return }` drops any resource whose stack throws — which its own comment attributes to "VitestModuleEvaluator's async wrapper of node:vm". A clean result on that pool is not evidence. Run it on `threads`.

**The suite has no async leak.** Under the target configuration the detector reports 914 resources, and effectively all are instrument noise: it collects one `setImmediate` after the file ends, so anything pending at that instant counts. 482 are TickObjects and 253 are microtasks. Of the 157 timers, 88 are RTL's own act-settle `setTimeout(resolve, 0)` and 50 are the `selectionchange` timeout jsdom arms on every `focus()`. The only application timers are `grid-export/download.ts:29`, which revokes an object URL that `setup/jsdom-stubs.ts` has replaced with a `vi.fn()`, and `hooks/a11y/use-typeahead.ts:44`, which clears a string on per-instance state. Nothing here needs fixing, and no probe was added: there is no leak for it to catch.

**The `boundary` and `integration` projects do not carry half the wall clock.** An earlier claim compared a 201.7s full run against a 105.3s `unit` run measured on a slower container. Measured side by side, `boundary` is 4.0s and `integration` is 24.0s against `unit`'s 149.6s. The `unit` project is nearly the whole suite.

**The `forks` pool is not the cost that it looked like.** The integration file set runs in 18.0s on forks, 17.5s on threads, and 15.7s on vmThreads. The pool buys about 2s. Keep `forks` and keep the isolation.

**File count is not a speed lever.** An earlier claim priced 276 small files at ~1.2s of fixed cost each. The pool change banks that saving whole: setup across all 407 files falls to 6.5s. Consolidation stays worth doing for maintenance. Do not sell it as speed.

**The 67 bare `userEvent.setup()` sites are not a speed lever either.** 330 sites exist and 257 pass `{ delay: null }`. The 23 files that hold the bare sites drive only about 85 action steps in total, which is sub-second processor time. Make them consistent, and drop the speed rationale.

## Ruled out

They are recorded so that nobody re-opens them.

**The docs engine does not re-pay module resolution or the lib parse for each test.** `helpers.ts:19` holds a `diskSourceFileCache` that caches lib and on-disk `.d.ts` source files once for each worker. `PROJECT_ROOT` is `/project`, which does not exist, so a Bundler-mode resolver has nothing to walk. The `api-extractor` finding survives because it names a different mechanism: per-Program checker initialization, which no cache covers.

**A bare `userEvent` re-export does not cost a pointer-events check that cannot fire.** jsdom folds inline styles into the computed style, so the check can fire. The proposed change also breaks call sites.

**`use-truncation`'s cached `ResizeObserver` does not create a cross-file hazard on its own.** The code reads as quoted, but the harm chain does not exist under the unit project's jsdom. It is still worth a reset seam on principle, because it captures a test-installed global.

**The print path's `focus` listener does not accumulate.** The cited line is the `removeEventListener` inside `cleanup`, not the registration. The pdf mirror is exercised only by a suite in the `integration` project, which keeps process isolation.

**`CodeBlock`'s html cache cannot flip its assertion.** The two files do share a cache key, but on a cache hit the component paints the same result that the assertion expects.

**`sequence.shuffle` does not make a red run unreproducible.** The reporter prints the seed on every run. Replay it with `VITEST_SEED=<seed> pnpm test`, never with `--sequence.seed`: the flag replaces the resolved sequence object and drops the per-project `groupOrder` with it, which reorders the queue the failure came from.

**`onUnhandledError` cannot be scoped per project.** Vitest resolves it once from the root config. The proposed change would remove the protection that the comment exists for.

**The `<name>.test` and `<name>-utilities.test` split does not follow the stated rule.** The claim was that a `-utilities.test.ts` exists if and only if a `-utilities.ts` module exists. Its own evidence contradicts it: `modules/grid-sorting-utilities.test.ts:2` imports from `modules/grid/engine/grid-sort`.

## Order

The sequence matters, because some changes make others impossible to measure.

1. Fix the DOM residue that a shared window makes visible. Done in #1039.

2. Change the pool alone. Put nothing else in that commit, or the attribution is lost. Done in #1039: 143.4s to about 95s, on top of six more on the candidate configuration.

3. Measure `noLib` and `resultTypes` before and after, from the per-file report at `--maxWorkers=1`. Wall clock over 4 workers divides the signal into noise.

4. Consolidate last, and on the maintenance argument only.

## State

Steps 1 and 2 are complete, together with the browser-suite gate (#1039). The full jsdom suite now runs in about 47s against 143.4s before.

Steps 3 and 4 are open, and the Open section above lists what they cover. Nothing in them is a prerequisite for anything else.

---

**See also:** [`CONVENTIONS.md` §10](../../../../CONVENTIONS.md) · [`vitest.config.ts`](../../vitest.config.ts).
