# Simplification Audit

Survey of `packages/ui` (2026-09-14) for hand-rolled code that React 19, TypeScript 6, the ES2023 platform,
`@floating-ui/react`, or another installed dependency already supplies, and for designs larger than the
problem they solve. Seven single-lens sweeps read the package: React, floating-ui, TypeScript, the web
platform, `modules/`, `components/` with `recipes/`, and the docs engine. The findings are proposed, not
applied, so each row below is a claim to weigh rather than a change in the tree.

This audit follows two that walked the same ground.
[2026-08-04](2026-08-04-SIMPLIFICATION-AUDIT.md) proposed 20 findings and ruled out 35;
[2026-09-02](2026-09-02-SIMPLIFICATION-AUDIT.md) applied its own and cut 581 lines net. Every sweep read
both Ruled out sections first, so no row here re-raises settled ground. Two rows the earlier audits left
open are closed below, both confirmed to still stand.

The three mechanical checks came back empty again, as they did in August and September. `knip` reports no
unused file, export, or dependency. `biome check` reports no diagnostic across 2,247 files. `tsc --noEmit`
is clean. A cross-file duplicate-block scan over every non-test source file returns three blocks wider than
24 normalized lines, and all three are named below.

## Measured

Source is 153,257 lines across 1,235 non-test TypeScript files: `modules/` 61,817, `components/` 43,367,
`docs/` 29,235, `recipes/` 10,635, `hooks/` 5,980, `primitives/` 3,521, `utilities/` 1,494, `core/` 1,393,
`providers/` 758, `layouts/` 518, `types/` 103. The jsdom suite is 6,809 tests in 484 files and passes.

Sixteen findings total about 351 lines, which is 0.23 percent of source. That is the honest measure, and it
is the signature of a surface three audits have now walked: the sweeps returned long Ruled out lists and
short findings lists. No finding names a wrong abstraction.

## Findings

**Hand the resolved `chart` to `ChartCartesianAxes`.** `ChartCartesianAxesProps` is a 14-field list
(`modules/chart/engine/chart-axes/cartesian.tsx:7-42`) that `area-chart.tsx:395`, `line-chart.tsx:206`,
`bar-chart.tsx:228`, and `combo-chart.tsx:343` each fill from the same resolved object — 62 lines of JSX
that differ only in the `baseline` bar and combo add. The sibling `ChartCartesianFrame` already takes
`chart: CartesianChart` and states the rule in its own TSDoc, so the exploded list is the outlier. Twelve
fields read straight off `chart`; `hasData` is `chart.bandPositions.length > 0` exactly, because
`use-chart-cartesian.ts:897` passes `count: data.length` and both layouts build
`bandPositions: bandCenters(band, count)`. Six of the seven defaults are unreachable. This closes the row
[2026-08-04](2026-08-04-SIMPLIFICATION-AUDIT.md) left open, and inverts its blocker: `baseline` being a
non-optional `number` is not what blocks the fold, it is the problem itself, because `chart.baseline` is
`scale.map(0)` — an extrapolated coordinate that sits off the plot for a line chart and lifts off the floor
for an area chart with negative data. Keeping `baseline` the one explicit prop dissolves it. Saving: 82
lines.

**Merge the List and Kanban reorder machines onto one lifted-keyboard engine.** `useListKeyboard` (236
lines) and `useKanbanKeyboard` (362) implement the same APG grabbed-element machine, and both admit it in
their own TSDoc. The name lookup, the deps bag, the Space toggle with its announcement templates, and the
modifier-bail dispatcher are the same code with different identifiers. Only `locate`, `focusNeighbor`, and
the lifted move are per surface. The sweep wrote all three files and measured them house-formatted at 530
against 598. Three behaviour edges must survive and do, because the divergent three stay per hook: a
vertical List neither moves nor calls `preventDefault` on the cross axis where Kanban does; List's
`focusNeighbor` no-ops on Home at the first row where Kanban refocuses the card; and List calls
`preventDefault` for its axis arrows while lifted even when the move is out of bounds. This closes the
second row [2026-08-04](2026-08-04-SIMPLIFICATION-AUDIT.md) left open. Saving: 68 lines.

**Delete `virtualJsonHooks`.** `docs/engine/plugins/virtual-json.ts:187-193` returns
`virtualJsonModules([opts])` and nothing else. The docs plugin calls `virtualJsonModules` directly with all
three specs. Its only consumer is a 36-line test block asserting that the wrapper behaves identically to a
one-element call. `knip` cannot see it because `knip.json` sets `ignoreExportsUsedInFile: true`. Saving: 45
lines, 7 of source and 38 of test.

**Fold the duplicate download and clipboard helpers.** `modules/grid/engine/grid-export/download.ts:1-30`
and `modules/chart/engine/chart-export.ts:225-256` both spell the transient-anchor download — object URL,
build an `<a>`, set `href` and `download`, append, click, remove, then a deferred `revokeObjectURL` — with
the same explanatory comment. They differ in argument order and in one line, `anchor.rel = 'noopener'`,
which only the chart sets. `copyText` is byte-identical in `modules/grid/grid-context-menu-utilities.tsx:199`
and the chart's export module. One `@internal` module beside `utilities/print-frame.ts`, reached at its leaf
path because §12.1 makes `@internal` and a barrel entry exclusive. The grid's downloads gain `rel`, which is
inert for an `<a download>` on a blob URL but is a real DOM-attribute difference and belongs in the commit
message. Saving: 33 lines.

**Delete the `code` tag's interpolation machinery.** `docs/engine/code.ts:7-32` walks `strings` and `values`
in parallel and re-indents each interpolated value. A nesting-aware scan of all 105 `code` template sites
finds zero that interpolate, so at `i = 0` the loop condition `0 < 0` makes `result` equal `strings[0]` for
every existing input. The tag stops accepting interpolation, which becomes a `tsc` error at authoring time
rather than a silent failure. Saving: 26 lines.

**Route Combobox through `useControlProps`.** `components/combobox/combobox.tsx:263-277` resolves the §7.2
control cascade by hand and carries a private `resolveInvalid`, which is `use-control-props.ts:80` character
for character. Its own TSDoc says so. Listbox carried the same copy until
[#1061](https://github.com/charliebeckstrand/midgard/pull/1061) moved it, and Input, Textarea, and Slider
are the other three precedents. Saving: 16 lines.

**Name the three-step type axis once.** `size: { sm: size.sm, md: size.md, lg: size.lg }` is written seven
times across `recipes/kata/fieldset.ts` (four), `tabs.ts`, `tree.ts`, and `menu.ts`. `ji.size` carries eight
keys, so the triple is a deliberate narrowing that a named export in `kiso/ji` holds once. CONVENTIONS §4.4
forbids repeating a variant axis in a second place. Saving: 16 lines.

**Fold the seven rename-only modules into the `slots.tsx` beside them.** Six files exist only to carry a
`PanelClose as DialogClose` alias past `component-boundary.test.ts`, and `select/select-option.tsx` does the
same for six symbols from `'../listbox'`. Each component already has a `slots.tsx` that re-exports from the
same foreign module, `filename-rules.ts:12-21` lists `slots.tsx` in `BARE_ALLOWED`, and
`tsdoc-coverage-boundary.test.ts:14-22` names the per-specifier doccomment form and cites this family by
name. The win is seven fewer files and seven fewer module edges, not the line count. Saving: 15 lines.

**Replace `useTheme`'s hand-rolled media query.** `docs/engine/hooks/use-theme.ts:17-20` and `:29-45` open
`window.matchMedia('(prefers-color-scheme: dark)')` twice, once to read and once to listen. `useMediaQuery`
is `useSyncExternalStore` over `subscribeMediaQuery`, which pools one `MediaQueryList` per query string.
[2026-09-02](2026-09-02-SIMPLIFICATION-AUDIT.md) applied this substitution to `useOffcanvas`; this is the
site it missed, and the last `matchMedia` outside `utilities/media-query.ts`. Saving: 13 lines.

**Read the band centres the hook already resolved.** `use-chart-cartesian.ts:677-685` exports
`bandCenters(chart)`, which returns the array `CartesianChart.bandPositions` already holds, built by the
same `band.center(index)` over the same count. Three cartesian charts call it once per render and allocate a
fresh `number[]`. One behaviour edge, confined to AreaChart with a literal `series={[]}`. Saving: 12 lines
and three allocations per render.

**Let Progress and Rating read the `kokkaku` leaf they already import.** `kata/progress.ts:59-63` and
`:80-84` and `kata/rating.ts:72-76` restate the class literals that `kiso/kokkaku/progress.ts` and
`rating.ts` declare, and each kata already wires the same leaf as `skeleton:`. The component and its
placeholder agree today only because somebody typed the same strings twice. Avatar already has the shape
CONVENTIONS §3.7 describes. A value-level scan over all 24 `kokkaku` leaves found these three and no others.
Saving: 12 lines.

**Prune two never-set options from `GridGroupManager`.** `modules/grid/grid-group-manager.tsx:140-143`
declares, documents, defaults, and threads `addGroupLabel` and `colorOptions` three prop hops deep. The
single caller passes neither. Saving: 6 lines.

**Delete the dead `delay` seam in the line marks.** `modules/chart/engine/chart-marks/line.tsx:54` declares
`delay`, defaults it to `0`, and folds it into four `transition` objects. No caller passes it, not even
ComboChart, which it was written for. With `delay === 0` the four expressions are exactly their constants,
so they become module constants and stop rebuilding per segment, per area path, and per point marker on
every render. [2026-08-04](2026-08-04-SIMPLIFICATION-AUDIT.md) banked this as three lines and passed it
over; the allocation is the reason to take it. Saving: 3 lines and three allocations per render.

**Drop the memo over a template literal.** `primitives/active-indicator/active-indicator.tsx:36-38`
memoizes `` `current-indicator-${scopeId}` `` over a `useId`. React compares a context value with
`Object.is`, which for a primitive is value equality, and `useId` is already stable for the mount, so the
memo can change nothing observable. The package writes the plain form at `modules/map/map-chrome.tsx:95`.
Saving: 2 lines.

**Register `PersistentChrome` through a ref cleanup.** `primitives/chrome/chrome.tsx:48-53` holds a ref and
an effect where `registerChrome` already has React 19's ref-callback contract: it takes the node and returns
the unregister. `hooks/use-scroll-overflow.ts:29-80` is the idiom in the same package. The callback needs a
null guard, because `RefCallback<T>` takes `T | null`, and it must sit at module scope so the node is not
re-registered every render. Registration moves from the passive phase to the commit phase, which is strictly
earlier, and the only reader takes it lazily. Saving: 2 lines.

**Drop the type annotations the compiler now infers.** Ten `(x): x is T` predicates are inferred by
TypeScript 5.5 and later: seven in shipped source (`components/json-tree/json-tree-utilities.tsx:28`,
`modules/chart/engine/chart-layout.ts:1145`, `chart-marks/bar.tsx:76`, `chart-pattern-defs.tsx:152`,
`use-chart-cartesian.ts:373`, `heatmap-chart.tsx:498`, `modules/grid/use-grid-row-manager.tsx:79`) and
three in the docs engine (`derive-code/internals.ts:17`, `api-reference/engine/format-type.ts:200`,
`plugins/virtual-json.ts:43`). Nine come back with a predicate identical to the deleted one; the tenth is
tighter, because `use-grid-row-manager.tsx:79` goes from `item is I` to `item is NonNullable<I>`, which is
assignable to the declared `I[]` return. Eleven `ReturnType<typeof f>` sites in five files reach a named
type — `BandScale`, `HeatmapCell[]`, `SearchIndex`, `MapPoint2D | null`, `GridNavStore` — and two of them
import a value under the `type` modifier only to feed `ReturnType`. Two are already spelled the named way
for the same field elsewhere: `json-tree/context.ts:12` and `map/context.ts:108`. `Responsive<T>`
(`types/responsive.ts:32`) spells a fourth restatement of the breakpoint list its own module derives, and
`resolveResponsive` writes the mapped form nineteen lines below. Saving: 4 lines, and the value is the
naming rather than the size.

A note on method, because it decides this row. A clean `tsc --noEmit` does not prove a predicate is
inferred. `modules/chart/engine/chart-value-labels.tsx:129` compiles after the annotation comes out, but no
predicate is inferred, so `finite` silently widens from `number[]` to `(number | null | undefined)[]` and a
downstream `?? 0` hides it. Each of the ten above was proved by asking the checker for the inferred
predicate through a compiler-API probe, not by a green build.

## Adjacent issues

These are outside a trimming pass. Each wants its own change and its own test.

**`parseInstant` reads a year under 100 as the 20th century.** `modules/chart/engine/chart-time.ts:68`
builds a bare `YYYY-MM-DD` instant with `new Date(Number(y), Number(m) - 1, Number(d))`, and the two-digit
year rule renders `0042-01-01` as 1942-01-01. The package documents this exact trap at
`components/calendar/calendar-utilities.ts:23-32` and routes around it through `CalendarDate`, and
`chart-time.ts`'s own header states that boundary stepping goes through `@internationalized/date`. This one
parse does not. It is not in [2026-09-13](2026-09-13-BUG-AUDIT.md).

**`PersistentChrome` lets a consumer's ref silence it.** `primitives/chrome/chrome.tsx:53` spreads
`{...props}` after `ref={ref}`, and `ComponentProps<'div'>` carries `ref` in React 19. A consumer that
passes its own ref overrides the internal one, `ref.current` stays `null`, and the region never registers,
so the modal exemption the component exists for stops working with no error. CONVENTIONS §3.9 is the rule,
and `spread-order-boundary.test.ts` does not catch it because its load-bearing set is roles and `aria-*`.
The ref-cleanup finding above inherits the flaw; the fix composes both refs with `useComposedRef`.

**`overlay-activity-hold.test.tsx` is red on `origin/main` in a fresh container.** The case "keeps the
surface mounted across a hide and reveal" fails with `Unable to find role="button" and name "count 1"`,
reproduced four times on a clean tree. The other 33 files and 100 tests in
`__tests__/browser/floating-ui/` pass. Not investigated; it may be specific to headless Chromium.

**[2026-08-08](../plans/2026-08-08-EFFECT-EVENT-PLAN.md) overstates its remaining work.** The plan says 25
sites are a mechanical `useEffectEvent` swap. Of the roughly 20 render-phase ref assignments that hold a
callback, two are clean swaps. The rest fail on a presence test, because `useEffectEvent` always returns a
function; on being read from an event-handler `useCallback` rather than an effect; on the callback escaping
as a value, which React forbids; or on a decision the file already records.

**Two comments name what is no longer there.** `docs/engine/index.html:16` tells a maintainer to match
`useTheme`'s `readStoredMode`, which moved onto `usePersistedChoice`. `components/popover/context.ts:12-17`
says both `close` and `triggerRef` read as dead, but `triggerRef` is read at `popover-trigger.tsx:32,45`.

## Ruled out

**The whole `@floating-ui/react` lens.** Twelve exports the package does not use all ship in 0.27.19, so
the absence is a choice, and the choice holds in every case. `useListNavigation` is the load-bearing one:
`useA11yRoving` has 19 call sites and 16 sit on surfaces with no floating context, so those would each have
to mint a synthetic `FloatingRootContext`. The models are opposed — floating-ui registers items by index,
the roving hook queries the DOM on each press, so its item set may change between presses — and a grep for
`elementsRef|labelsRef|registerItem|itemIndex` returns nothing, meaning adoption adds registration to a
`memo`ized option row rather than retiring any. `useTypeahead`: one buffer exists, no duplicate, and the
package's carries an indexed matcher that reaches rows outside a virtualized window. `FloatingTree`:
`Overlay`, and so every Dialog, Sheet, and Drawer, is not a floating node. `useTransitionStyles`:
`AnimatePresence` owns unmount and `onExitComplete`, which `listbox-panel.tsx:74` uses to flush a deferred
selection. `FloatingArrow`: the design has no arrow anywhere. `FloatingOverlay`, `FloatingDelayGroup`,
`inner`, `hide`, `limitShift`, `FloatingList`: each would add a feature, not remove code.

**Every ES2024-and-later built-in.** `tsconfig.base.json` compiles to ES2023 with `lib: ["ES2023"]`, and
[`.browserslistrc`](../../../../.browserslistrc) pins chrome 110 and safari 16.4 with a note that no build
step can lower it, because esbuild and SWC downlevel syntax and never instance methods. That rules out
`Object.groupBy` and `Map.groupBy` for three hand-rolled Map-of-Set inserts, `Promise.withResolvers`,
`Array.fromAsync`, `Map.prototype.getOrInsert`, `RegExp.escape` for two escaped-query sites, and the
Popover API. Reaching them costs a floor change, not an edit.

**`AbortController` is already adopted where it pays.** All 20 non-test `addEventListener` files were read.
The four effects that add three or more listeners already share one signal, and one of them already carries
the comment "One signal rather than three removals". Every remaining site adds exactly one listener, where a
signal costs a line.

**`Intl.ListFormat` and `Intl.PluralRules` have no site.** Every `.join(', ')` found is a comma-delimited
value list, not a conjunction, and `ListFormat` would insert "and". The two plural branches are
`size === 1 ? 'row' : 'rows'` against hardcoded English; without a message catalogue `PluralRules` adds a
category lookup and removes nothing. No hand-rolled thousands separator, percentage, compact notation, or
byte size exists, and every formatter is already cached at module scope or memoized.

**`structuredClone`, `CSS.escape`, `URLSearchParams`, `AbortSignal.timeout`, `toggleAttribute`, and
`Intl.Segmenter` have no remaining target.** Each is either already used where it belongs or has no
hand-rolled site. The seven surviving `arr[arr.length - 1]` reads and the four replaceable
`[...x].sort(…)` spreads are one expression for one expression and remove nothing.

**The memoization is load-bearing, and there is no React Compiler.** No `reactCompiler` or
`babel-plugin-react-compiler` configuration exists in the repo; the package appears in the lockfile only as
an optional peer. All 26 `memo(...)` sites wrap list items in virtualized or large surfaces. `GridRow` is
the contrast case for the cartesian finding: its 26-field fan-out must stay, because one object prop
defeats the shallow compare on every row of every grid.

**`ChartLineMarks` and `AnimatedChartLineMarks` stay two**, and so do the bar pair. Folding needs the motion
runtime on the static path, whose TSDoc calls it "the cheap default with no motion runtime work", or a
per-element conditional component type inside the mount loop — the allocation shape
[2026-09-02](2026-09-02-SIMPLIFICATION-AUDIT.md) had to revert.

**`verticalLayout` and `horizontalLayout` are not twins**, `ScatterChrome` is not `ChartCartesianAxes`, and
the three `findScrollableAncestor` variants answer three different questions. In each case a merged part
takes the union of both prop sets, which moves complexity rather than removing it.

**The pooled-subscription registry is written three times and should stay that way.**
`utilities/document-listener.ts`, `utilities/media-query.ts`, and `components/time-ago/time-ago-ticker.ts`
share a twelve-line dispatch loop, but their lifecycles genuinely differ, so a shared pool is the wrong
abstraction under CLAUDE.md §1.1. Extracting the loop alone nets 16 lines.

**Single-caller helpers and single-statement barrels are the house shape**, produced by CONVENTIONS §3.3
and required by §3.5 and the `"./*"` entry in `package.json`. A caller census over every non-barrel export
in `components/` found a long tail of them and no abstraction that predicts a second use.

**`createContext`'s three overloads collapse but buy a real check.** `core/create-context.ts:46-51` can
come out for 6 lines with `tsc` clean on all three programs, because all 73 call sites pass an explicit type
argument. The overloads enforce the mutual exclusion the doccomment describes:
`createContext<V>('X', { default: v, error: 'boom' })` is rejected with them and accepted without, after
which the implementation silently takes the `default` path. A trade, not a saving.

**CONVENTIONS §4.1 is fully honoured; there is no `any` in shipped source.** A grep for `: any`, `<any>`
and `as any` returns ten files, and every hit is prose in a doccomment or a local `boolean` named `any`
(`modules/chart/engine/chart-scale.ts:208`). All eleven `as unknown as` are genuine escape hatches: seven
bridge the package's minimal `MapFeature` to `@types/topojson-client`, two widen a `<td>` event to a `<tr>`
signature because React's `MouseEvent<T>` is invariant in `T`, and the rest work around a missing
`lib.dom` type or are the mechanism a missing-provider throw is built on.

**The `satisfies` inverse is empty.** Every `keyof typeof X` and `(typeof X)[number]` derivation already
reads an `as const` source, and no annotated `const x: Record<…> = {…}` has a later cast putting a lost
literal back. The one cast that looks like the pattern is the opposite: `chart-pattern-defs.tsx:49` widens
an eight-member tuple so `indexOf` accepts the nine-member slot union.

**No hand-written conditional or mapped type is a built-in in disguise.** `AxesOf<C>`'s key remap is
`Omit<C, ReservedField>`, but its value clause still needs the mapped type. `ExplicitVariantKeys` pulls a
key set out through `infer` and `AxisValue` branches on the presence of `'true'` and `'false'` keys;
neither is `Extract` or `Exclude`. `enum` is already barred by `erasableSyntaxOnly`.

**The demo scale arrays stay**, per the [2026-09-02](2026-09-02-SIMPLIFICATION-AUDIT.md) ruling. A
duplicate-block scan over all of `src/docs` returned 35 blocks and every one is reader-visible sample code.

## Held back

**The two inert `useDismiss` calls.** `hooks/use-floating-ui.ts:429` and `use-floating-disclosure.ts:142`
pass `{ outsidePress: false, escapeKey: false }`, so floating-ui's effect registers no document listener —
about 25 lines across the two hooks, the `dismiss` field, and five consumer `useInteractions` lists. The
change was run, not reasoned: with `enabled: false` on both, the floating-ui browser directory returns 1
failed and 100 passed, which is what a clean tree returns, so the suite is indifferent. That is not a pass.
The retained `onPointerDownCapture` sets `insideReactTree`, which `FloatingFocusManager`'s `closeOnFocusOut`
reads to suppress one focus-out close, and `components/listbox/listbox-panel.tsx:82` renders `modal={false}`
with a comment saying it depends on that close. The behaviour is untested. Write the test first.

**Grid spells two axes and three function types by hand.** `SortState['direction']`
(`modules/grid/context.ts:8`) is restated in 13 further type positions, and `PinSide`
(`engine/grid-pin/overrides.ts:5`) in 17. `PinColumn` and `PinChange` are the same
`(id, side: 'left' | 'right' | false) => void` under two names, and that contract has six spellings in all.
The types stay mutually assignable, so nothing fails until one gains a value — the failure mode
`variant-axis-boundary.test.ts:5-8` names in its own header for `Orientation`, whose scanner does not yet
match these unions. The fix removes no lines and costs public surface: `GridColumnMenuContext` and
`GridPinningState` are both barrelled, so typing their fields as `PinSide` puts it in the emitted `.d.ts`,
which means dropping its `@internal` tag and owing a `docs/COMPONENTS.md` row under §12.2. Structural work,
correctly gated by CLAUDE.md §3.1.

## Totals

355 lines across 17 findings, against 153,257 lines of source — 0.23 percent. The three largest rows give
195 of them, and the two that close open rows from
[2026-08-04](2026-08-04-SIMPLIFICATION-AUDIT.md) give 150. Fourteen of the sixteen are behaviour-neutral and
can land independently. Three findings also remove a per-element allocation from a render path, which is
worth more than their line counts suggest.
