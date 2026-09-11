# Bug Sweep Plan — segmenting a full-surface sweep of `ui`

**Date:** 2026-09-11 · **Subject:** how a full bug sweep of the `ui` package divides into affordable segments, how each segment runs, and what each one covers. **Scope of the sweep:** every `.ts` and `.tsx` file under [`src`](../../src), except every `__tests__` and `__benchmarks__` directory — 1,510 files and 153,159 lines. **This plan holds the design and the state; the findings live in the dated bug audit under [`audits/`](../audits).**

## Status

One read of the whole package does not fit in one session. This container holds 4 cores, so the agent harness runs 2 sweeps at a time. A full first round costs about 5 hours of sweep time, and the verification costs more than the sweep that found the claims. The segments below divide that cost, and the [Progress ledger](#progress-ledger) carries the state of each one.

This audit fixes nothing yet. Every finding is a claim about the tree as of this commit, and the line numbers drift.

## Cadence

Each segment resolves before the next one starts research. A pull request stays small, and the context of a finding stays loaded while somebody fixes it. Re-deriving that context later costs more than the fix.

The alternative was to bank findings across segments and resolve by severity, which would let one pull request close a root cause that spans segments. The `input`-arm defect in segment `A01` is such a shape, and the text-input segment may repeat it. Record the shape in the audit when that happens, and let the later segment's resolution close both.

## Method

Each segment runs two steps, and the [Progress ledger](#progress-ledger) tracks them apart. Research establishes what is wrong. Resolution fixes it. A review gate sits between them, because a finding decides work and nobody commits work a reader has not seen.

### Research

A unit is a disjoint file set. The ledger's 28 segments hold 50 units over 153,159 lines, so a unit averages about 2,920 lines; the largest is 4,021 and the smallest 51. A segment holds one to three units, and 19 of the 28 hold exactly two. One sweep agent owns each unit and reads every file in it, because a sample cannot bound what it missed.

A sweep reports a defect only when it can name the file, the line, the trigger, and the wrong result. Style, naming, and format stay out of scope, and Biome owns them. A request for a test, for a document, or for a refactor is not a defect. A repository convention is not a defect: [`CONVENTIONS.md`](../../../../CONVENTIONS.md) decides intent, notably §3.6, §3.9, §7.2, §7.3, and §11.3, and [`REFERENCE.md`](../../REFERENCE.md) §2 decides the tier boundary.

One verifier then judges the claims of a unit in a single pass, and it works blind: it receives the file, the symbol, the trigger, and the claimed wrong result, and never the sweep's own trace. It traces the control flow itself, it follows each caller and each guard, and it reads the conventions, the TSDoc, the surface docs, the open audits, and the tests. It refutes a claim when it is not certain. Segment `A01` ran two verifiers that each held the sweep's evidence, and both walked the same citations in the same order, so the pair was not independent; blinding one pass buys more than running two anchored ones.

A third pass tests reach. For each claim it names a call site that reaches the trigger, in the demos, the modules, the layouts, or the apps. If no call site exists, it records that. That pass sets the severity. Segment `A01` ran without it, and a red team supplied it after the fact. The bug audit for that segment records what the omission cost and what changed because of it.

Verification runs as one batch for each unit, not as one agent for each claim. The batch costs 1 agent for each unit in place of 2 agents for each claim, and it gives the verifier the context of the neighbouring claims, which is what lets it group them by root cause. That choice is what holds a segment affordable.

Research ends at the review gate. The segment writes its findings and its ruled-out claims into the dated bug audit, it groups the findings by root cause, it names every question a reader must settle, and it recommends the resolution steps in order. Research is done when the reader has the findings and the open questions have answers. Until then the ledger holds the segment in review.

### Resolution

Resolution starts only after the gate, and it never starts from a finding alone: a finding states a defect, and a resolution step states a change. Each step names the findings it closes, so one pull request can close several rows of one root cause.

Each step carries a test that fails before the change. [`CONVENTIONS.md`](../../../../CONVENTIONS.md) §10.5 decides where the test sits: a guarantee that must hold for every component of a kind goes in the shared corpus, and behaviour specific to one component goes in its own file. A change to a public export updates its TSDoc and the matching surface index in the same commit (§12.1, §12.2).

A row resolves in place, in the audit that holds it. Its `Status` cell takes the pull request that closed it, and the cell is the only record of resolution state, so a fix edits one cell and no prose. The segment's `Resolution` column here reads done when every row of that segment carries a pull request. An audit goes when its last row closes; this plan stays as the record of what was swept and how (§12.4).

## Progress ledger

One row for each area segment. `Research` tracks the sweep, the verification, and the review gate. `Resolution` tracks the fixes, and it stays empty until research finds something to fix. The ledger covers the whole scope, the file sets are disjoint, and the `Files` and `Lines` columns sum to the scope above.

States: `◯ open` — not started. `◐` — started and not finished: under `Research` the findings are written and wait on a reader, and under `Resolution` some rows are fixed. `✅ done`. A `—` in `Resolution` means research has not yet said whether there is anything to resolve.

| Segment | Area | Scope | Files | Lines | Research | Resolution |
|---|---|---|---|---|---|---|
| `A01` | components | date-picker + menu + segment + pdf-viewer (part) | 49 | 7,172 | ✅ done | ◐ 15 of 15: 14 fixed, 1 refuted |
| `A02` | components | calendar + data-display 1/2 | 71 | 5,841 | ◯ open | — |
| `A03` | components | data-display 2/2 + feedback | 68 | 2,746 | ◯ open | — |
| `A04` | components | form-control 1/2 + form-control 2/2 | 76 | 4,978 | ◯ open | — |
| `A05` | components | layout-leaf + media-canvas 1/2 | 89 | 5,927 | ◯ open | — |
| `A06` | components | media-canvas 2/2 + navigation | 87 | 5,911 | ◯ open | — |
| `A07` | components | overlay + selection | 83 | 6,851 | ◯ open | — |
| `A08` | components | text-input | 47 | 3,884 | ◯ open | — |
| `A09` | modules/grid | grid/engine 1/2 + grid/engine 2/2 | 40 | 5,449 | ◯ open | — |
| `A10` | modules/grid | grid/surface 1/5 + grid/surface 2/5 | 27 | 7,921 | ◯ open | — |
| `A11` | modules/grid | grid/surface 3/5 + grid/surface 4/5 | 42 | 8,263 | ◯ open | — |
| `A12` | modules/grid | grid/surface 5/5 | 8 | 1,962 | ◯ open | — |
| `A13` | modules/chart | chart/engine 1/4 + chart/engine 2/4 | 29 | 8,284 | ◯ open | — |
| `A14` | modules/chart | chart/engine 3/4 + chart/engine 4/4 | 23 | 5,622 | ◯ open | — |
| `A15` | modules/chart | chart/surface 1/2 + chart/surface 2/2 | 29 | 5,071 | ◯ open | — |
| `A16` | modules/map | map/engine 1/2 + map/engine 2/2 | 50 | 8,093 | ◯ open | — |
| `A17` | modules/map | map/surface 1/2 + map/surface 2/2 | 33 | 7,374 | ◯ open | — |
| `A18` | modules/other | chat+query | 39 | 3,797 | ◯ open | — |
| `A19` | hooks | hooks/a11y + hooks/core 1/2 + hooks/core 2/2 | 56 | 5,980 | ◯ open | — |
| `A20` | primitives | layouts + primitives + providers | 90 | 4,743 | ◯ open | — |
| `A21` | foundation | core+utilities+types | 58 | 2,989 | ◯ open | — |
| `A22` | recipes | recipes/index.ts + recipes/kata 1/2 | 53 | 3,690 | ◯ open | — |
| `A23` | recipes | recipes/kata 2/2 + recipes/katakana | 50 | 3,139 | ◯ open | — |
| `A24` | recipes | recipes/kiso | 138 | 3,801 | ◯ open | — |
| `A25` | docs | demos 1/5 + demos 2/5 | 73 | 6,951 | ◯ open | — |
| `A26` | docs | demos 3/5 + demos 4/5 | 31 | 6,534 | ◯ open | — |
| `A27` | docs | demos 5/5 + engine 1/2 | 34 | 6,165 | ◯ open | — |
| `A28` | docs | engine 2/2 | 37 | 4,021 | ◯ open | — |

### Segment scopes

A segment names its themes, and a theme names its directories. A theme that exceeds one unit splits into parts. A part that covers whole directories names them; a part that splits one directory names that directory and the range of file names it covers, sorted by name. Eighteen of the 34 parts split by directory, so a range never crosses a directory.

| Theme | Directories | Parts |
|---|---|---|
| calendar | components/calendar | — |
| data-display | `components/` dl, json-tree, kanban, list, pagination, pivot-table, stat, table, timeline, tree | 1. json-tree, kanban, list, pivot-table, stat, tree<br>2. dl, pagination, table, timeline |
| feedback | `components/` alert, badge, banner, copy-button, loading, placeholder, progress, shiny-text, status, time-ago, toast | — |
| form-control | `components/` button, checkbox, control, fieldset, form, hold-button, radio, rating, slider, slider/range, stepper, switch, toggle-icon-button | 1. button, control, fieldset, form, rating, slider/range, stepper, switch<br>2. checkbox, hold-button, radio, slider, toggle-icon-button |
| layout-leaf | `components/` aspect-ratio, avatar, box, card, code, container, divider, flex, group, heading, icon, kbd, link, markdown, spacer, stack, text | — |
| media-canvas | `components/` color, file-upload, odometer, pdf-viewer, signature-pad, sparkline, swatch | 1. color, odometer, pdf-viewer, swatch<br>2. file-upload, signature-pad, sparkline |
| navigation | `components/` accordion, breadcrumb, collapse, nav, resizable, scroll-area, sidebar, split, tabs, toolbar | — |
| overlay | `components/` command-palette, confirm, context-menu, dialog, drawer, popover, sheet, tooltip | — |
| selection | `components/` combobox, filters, listbox, select, tag-input | — |
| text-input | `components/` address-input, credit-card-input, currency-input, date-input, input, mask-input, number-input, password-confirm, password-input, password-strength, phone-input, search-input, textarea, zipcode-input | — |
| grid/engine | `modules/grid/` engine, engine/grid-column, engine/grid-export, engine/grid-group, engine/grid-pin, engine/grid-row, engine/grid-sort, engine/grid-table, engine/grid-zone | 1. engine, engine/grid-column, engine/grid-export, engine/grid-pin, engine/grid-table, engine/grid-zone<br>2. engine/grid-group, engine/grid-row, engine/grid-sort |
| grid/surface | modules/grid | 1. `modules/grid` `context.ts .. grid-data-resolvers.ts`<br>2. `modules/grid` `grid-data-types.ts .. grid-group-leaf-row.tsx`<br>3. `modules/grid` `grid-group-manager.tsx .. index.ts`<br>4. `modules/grid` `types.ts .. use-grid-reveal-hold.ts`<br>5. `modules/grid` `use-grid-roving.ts .. use-grid-zone-sortable.ts` |
| chart/engine | `modules/chart/` engine, engine/chart-axes, engine/chart-color, engine/chart-frame, engine/chart-geometry, engine/chart-legend, engine/chart-marks | 1. `engine` `chart-constants.ts .. chart-tier.ts`<br>2. `engine` `chart-time.ts .. use-chart-series-toggle.ts`<br>3. engine/chart-color, engine/chart-geometry, engine/chart-legend<br>4. engine/chart-axes, engine/chart-frame, engine/chart-marks |
| chart/surface | `modules/` chart, chart/area-chart, chart/bar-chart, chart/bubble-chart, chart/choropleth-chart, chart/combo-chart, chart/donut-chart, chart/heatmap-chart, chart/line-chart, chart/pie-chart, chart/scatter-chart, chart/sector-chart | 1. chart/area-chart, chart/bubble-chart, chart/combo-chart, chart/donut-chart, chart/heatmap-chart, chart, chart/pie-chart, chart/scatter-chart, chart/sector-chart<br>2. chart/bar-chart, chart/choropleth-chart, chart/line-chart |
| map/engine | `modules/map/` engine, engine/map-cluster, engine/map-geometry, engine/map-hover, engine/map-keyboard, engine/map-legend, engine/map-overlay, engine/map-projection, engine/map-region, engine/map-routing, engine/map-zip, engine/map-zoom | 1. engine/map-cluster, engine/map-geometry, engine/map-hover, engine/map-zip<br>2. engine, engine/map-keyboard, engine/map-legend, engine/map-overlay, engine/map-projection, engine/map-region, engine/map-routing, engine/map-zoom |
| map/surface | modules/map | 1. `modules/map` `context.ts .. map-regions-lit.tsx`<br>2. `modules/map` `map-regions.tsx .. use-map-zoom.ts` |
| chat+query | `modules/` chat, chat/engine, chat/engine/chat-content, query, query/engine, query/query-builder | — |
| hooks/a11y | hooks/a11y | — |
| hooks/core | hooks | 1. `hooks` `index.ts .. use-panel-fit.ts`<br>2. `hooks` `use-panel-resize.ts .. use-virtual-window.ts` |
| layouts | layouts, layouts/sidebar | — |
| primitives | `primitives/` active-indicator, affix, chrome, control, current, density, floating-surface, link, mount, offcanvas, option, overlay, panel, polymorphic, popover, portal, query, ready-reveal, reduced-motion, select-trigger, toggle, touch-target, virtual-options | — |
| providers | `providers/` density, glass, headless, locale, toast, ui | — |
| core+utilities+types | core, core/recipe, core/recipe/engine, types, utilities | — |
| recipes/index.ts | recipes | — |
| recipes/kata | recipes/kata | 1. `recipes/kata` `accordion.ts .. menu.ts`<br>2. `recipes/kata` `nav.ts .. tree.ts` |
| recipes/katakana | recipes/katakana | — |
| recipes/kiso | `recipes/` kiso, kiso/control, kiso/hannou, kiso/iro, kiso/ji, kiso/kasane, kiso/kokkaku, kiso/ma, kiso/narabi, kiso/omote, kiso/panel, kiso/popover, kiso/segment, kiso/sen, kiso/shaku, kiso/slider, kiso/ugoki | — |
| demos | `docs/demos/` components, modules, modules/chart, modules/grid, modules/map, providers | 1. `components` `accordion.tsx .. form.tsx`<br>2. `components` `group.tsx .. shiny-text.tsx`<br>3. `components` `sidebar.tsx .. zipcode-input.tsx`<br>4. modules, modules/grid, modules/map<br>5. modules/chart, providers |
| engine | docs, docs/engine, docs/engine/api-reference, docs/engine/api-reference/engine, docs/engine/components, docs/engine/components/api-reference, docs/engine/derive-code, docs/engine/hooks, docs/engine/plugins, docs/engine/vite | 1. docs/engine/api-reference/engine, docs/engine/components, docs/engine/vite, docs<br>2. docs/engine/api-reference, docs/engine, docs/engine/components/api-reference, docs/engine/derive-code, docs/engine/hooks, docs/engine/plugins |

Segment `A01` is the one exception, because it predates this partition. It took [`components/date-picker`](../../src/components/date-picker) (17 files), [`components/menu`](../../src/components/menu) (11 files), and [`components/segment`](../../src/components/segment) (5 files) whole, and 16 of the 31 files in [`components/pdf-viewer`](../../src/components/pdf-viewer): `index.ts`, `pdf-viewer-document-cache.ts`, `pdf-viewer-highlight-geometry.ts`, `pdf-viewer-highlights-context.ts`, `pdf-viewer-highlights.tsx`, `pdf-viewer-magnifier-context.ts`, `pdf-viewer-magnifier-settings.tsx`, `pdf-viewer-magnifier.tsx`, `pdf-viewer-thumbnails.tsx`, `pdf-viewer-toolbar-button.tsx`, `pdf-viewer-utilities.ts`, `pdf-viewer-viewport.tsx`, `pdf-viewer-zoom-controls.tsx`, `types.ts`, `use-pdf-viewer-highlights.ts`, and `use-pdf-viewer-page-rotation.ts`.

The **media-canvas** theme therefore carries only the other 15 `pdf-viewer` files, and they all sit in part 1, which segment `A05` owns: `context.ts`, `pdf-viewer-document-actions.tsx`, `pdf-viewer-highlight-label.tsx`, `pdf-viewer-highlights-provider.tsx`, `pdf-viewer-magnifier-provider.tsx`, `pdf-viewer-thumbnail-list.tsx`, `pdf-viewer-toolbar.tsx`, `pdf-viewer.tsx`, `use-pdf-viewer-document.ts`, `use-pdf-viewer-magnifier.ts`, `use-pdf-viewer-page-scale.ts`, `use-pdf-viewer-page-size.ts`, `use-pdf-viewer-pagination.ts`, `use-pdf-viewer-viewport-size.ts`, and `use-pdf-viewer.ts`.

## Lens segments

An area sweep reads one file set, so it cannot see a defect that spans the package. A lens sweep reads across the package for one defect class. The lens segments run after the area segments, because a lens needs the findings to avoid a repeat.

| Segment | Lens | What it hunts |
|---|---|---|
| `B01` | react-hook-correctness | a stale closure, a dependency array that misses a value the body reads, a state write in render, a ref the render body mutates |
| `B01` | lifecycle-teardown | a listener, an observer, a timer, or an animation frame with no matching teardown, or a teardown that detaches from the wrong node |
| `B01` | form-binding-cascade | a bindable control that breaks the three-mode resolution order of [`CONVENTIONS.md`](../../../../CONVENTIONS.md) §7.2, or that conflates `undefined` with `null` against §7.3 |
| `B02` | aria-semantics | a role or a state that breaks assistive technology, and an `id` reference that points at nothing |
| `B02` | focus-and-keyboard | focus that escapes to `document.body`, a roving set with no tab stop or with two, and arrow arithmetic that overruns |
| `B02` | error-handling | a swallowed error, and a state that stays in load forever |
| `B03` | async-races | a state write after a newer request resolves, and a missing in-flight guard |
| `B03` | numeric-and-geometry | a zero divisor, and `NaN` or `Infinity` in a style or an SVG attribute |
| `B03` | date-time-locale | a time-zone assumption, and a locale-sensitive parse of a machine string; the suite pins `LANG=en-US`, so CI hides this class |
| `B04` | unsound-types | a cast or a non-null assertion that a caller can break |
| `B04` | composition-and-boundaries | spread order against [`CONVENTIONS.md`](../../../../CONVENTIONS.md) §3.9, and the barrel against §3.5 |
| `B04` | browser-floor | a platform call above the [`.browserslistrc`](../../../../.browserslistrc) floor, against [`CONVENTIONS.md`](../../../../CONVENTIONS.md) §11.3 |
| `B05` | render-cost-and-leaks | an unstable context value, and a cache with no eviction |
| `B05` | test-soundness | a test that cannot fail, across [`src/__tests__`](../../src/__tests__) and [`src/docs/engine/__tests__`](../../src/docs/engine/__tests__) |
| `B05` | build-and-config-surface | what the area sweeps exclude: `tsup.config.ts`, `vite.docs.config.ts`, the five Vitest configs, the three `tsconfig` files, the `exports` map in `package.json`, and the three CSS files under [`src/docs`](../../src/docs) |

## Closing segment

Segment `C01` stays open, and it holds the completeness critics, one targeted probe for each gap they name, and the final rank.

Three critics read the findings and the ruled-out claims. The first one names the surface that the method cannot reach. The second one names the cross-component interaction that no single file shows. Three examples are nested dismiss layers, two overlays that each lock the scroll, and a form inside a drawer inside a sheet. The third one attacks the verification itself, and it names a refutation that leans on a type that a cast breaks, or on a test that asserts nothing. Each gap becomes one probe, and each probe runs the same verification.

## Not covered

The area sweeps exclude every `__tests__` and `__benchmarks__` directory. Four exist: [`src/__tests__`](../../src/__tests__) holds 628 files and 115,439 lines, [`src/__benchmarks__`](../../src/__benchmarks__) holds 63 files and 7,783 lines, [`src/docs/engine/__tests__`](../../src/docs/engine/__tests__) holds 33 files and 5,456 lines, and `src/docs/engine/__benchmarks__` holds 1 file and 107 lines. The last two sit inside the `engine` theme, so segment `A28` excludes them although its directories contain them.

Lens `test-soundness` in `B05` covers both test trees for one defect class only: a test that cannot fail. A full sweep of the test tree needs its own audit. No lens covers either benchmark tree.

The area sweeps read `.ts` and `.tsx` only, so they exclude the build configuration, the `exports` map, and the CSS. Lens `build-and-config-surface` in `B05` closes that gap.

No sweep runs the package. Every claim comes from a read of the source. A defect that needs a run to see stays out of reach: a layout result, a paint order, a real browser event sequence. The browser suite and a manual pass own that ground.

## Agent architecture

The sweep ran on general-purpose agents with long prompts. Five specialist agents replace them, under [`.claude/agents/bug`](../../../../.claude/agents/bug). Three architects proposed a network and three skeptics attacked each proposal against one test: the network must not be worse than no specialist agents at all. A folder groups the family and each name keeps the `bug-` prefix, because the name is the address and must stay unique across the project; the folder is organisational only, and an agent is invoked by its name.

Three proposals converge on the same four owners, and they now live under [`.claude/agents/bug`](../../../../.claude/agents/bug): `bug-sweeper` reads one unit and raises claims, `bug-verifier` judges them, `bug-recorder` writes the documents and judges nothing, and `bug-resolver` closes a row. Take that core as settled. The proposals cost 10, 13, and 15 agent invocations for one segment; only 10 survives the concurrency cap of 2 across the whole programme, so the burden of proof sits on any agent beyond the four.

`bug-reporter` is the fifth, and it carries a concern the four left unowned. Each of the four returns a lead — a defect it saw outside its own remit — and nothing consumed one; the resolver told a reader to return a lead for a consumer that did not exist. The reporter turns one out-of-band discovery into a claim, and it costs nothing for each segment, because it runs on a discovery rather than in the pipeline.

A lead now has one path to a durable home. A claim for a segment already swept goes through an addendum pass of the verifier and becomes a row the recorder appends; an unsettled addendum flips that segment's `Research` cell back to `◐ review`, because the gate has to run again on it. A lead for a segment not yet swept becomes a line under that segment's Surfaced-not-judged section, and it reaches that segment's sweep as a file path and never as the claimed defect, because the defect would anchor the reading. A file the partition does not own — a test, a benchmark, a config, a stylesheet, anything under `apps/` — takes no segment, and the reader decides where the claim lands.

Two skeptics independently rejected **reach as its own agent**, and the argument holds. Severity is not wholly a reach call: `F5` turns on impact ("one redundant key, and Enter still activates the item") and `F1`'s reach turns on a guard in `apps/places`, which is mechanism work. Reach is therefore a mandated question inside the verifier, not a separate remit — the verifier must answer it and must not return a severity without it.

The skeptics found five gaps that no proposal owned. A standing ruling that attaches to a document class rather than to a code seam: a documentation sweep ruled that `audits/` and `plans/` stay in their authored voice, so a controlled-language pass over either is refused work. No agent was told to look for such a ruling. This plan states the decision rather than citing the audit that made it, because §12.4 bars a permanent document from naming an audit. A file collision between resolvers that run at the same time: segment `A01` collides with itself, because two of its steps both write `use-menu-state.ts`. Who may amend this plan's prose, which `A01` proved is necessary. The cross-component defect, which only a segment-wide vantage can see and which no proposal let that vantage raise. And [`CONVENTIONS.md`](../../../../CONVENTIONS.md) §10.3, which bars a test from driving floating-ui, pdfjs, fetch, or virtualization — the machinery under `F1`, `F2`, and `F6`, so a test author cannot be told to cover them.

A segment-wide vantage was refused as an agent: a cause that spans two units is an overlap check on quoted citations and step file sets, and the verifier runs again over both sheets when it fires, so the vantage is a named pass and not a remit. Each of the five gaps has an owner in the files.

## State

Segment `A01` research is done and its resolution has not started. The review settled three questions: forbid the static `Menu` composition, accept one frame for the deferred reference clock, and resolve one segment before the next starts research.

Every resolution step of `A01` is done on the branch. Fourteen rows read `◐ FIXED` and close when a pull request merges; `R3.2` fell, because it described a toggle that a static menu never performs and a probe on the unfixed tree disproved it across every activation path. Resolution reads `◐` rather than `✅` because no row carries a pull request yet.

The next action is segment `A02` — calendar and data-display, 71 files and 5,841 lines. It is the first segment to run on the four agents under [`.claude/agents/bug`](../../../../.claude/agents/bug), and the first test of whether they beat the general-purpose agents they replace.

---

**See also:** [`../README.md`](../README.md) · [`CONVENTIONS.md` §12](../../../../CONVENTIONS.md) · [`REFERENCE.md`](../../REFERENCE.md).
