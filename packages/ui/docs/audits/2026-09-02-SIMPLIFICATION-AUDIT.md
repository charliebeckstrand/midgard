# Simplification Audit

Survey of `packages/ui` (2026-09-02) for code a dependency, the platform, React 19, or TypeScript already
supplies, and for duplication a shared helper absorbs. Nine sweeps read every non-test source file in the
package. This audit differs from [2026-08-04](2026-08-04-SIMPLIFICATION-AUDIT.md) in method: the findings
were applied, not proposed, so each row below is a change in the tree rather than a claim to weigh.

Three mechanical checks came back empty before the sweeps and set their direction, as they did in August.
`knip` reports no unused file, export, or dependency. `biome check` reports no diagnostic. A token-level
duplicate-block scan of `components/`, `modules/`, and `hooks/` reports zero blocks, so what remains is
structural redundancy, which a scanner cannot see.

## Measured

The change removes 901 lines net: 2,010 deleted against 1,109 inserted across 191 files, plus 243 lines in
eight new shared modules. Source is about 125,000 lines, so the cut is 0.7 percent. `components/` gives 349
lines, `modules/` 214, `docs/` 150, and the foundation layers (`core`, `hooks`, `primitives`, `providers`,
`recipes`, `utilities`, `layouts`, `types`) 249.

No test file changed. The whole suite passed before and after: 6,602 unit tests in 484 files, 517 browser
tests in 92 files. `tsc --noEmit` is clean on all three programs, `pnpm build` and `pnpm docs:build`
succeed, and `knip` and `biome check` stay clean. No public export changed shape and no rendered DOM
changed.

## Applied

**A dependency already exported it.** `applyUpdater` in the grid was TanStack Table's own
`functionalUpdate`. Three copies of "nearest index by absolute distance" in the chart engine became one.
The chart's hand-built `Date` to `CalendarDateTime` conversion is `toCalendarDateTime(fromDateToLocal(d))`
from `@internationalized/date`, and the date-input's `daysInMonth` and `isSameDay` are `endOfMonth().day`
and the calendar's own comparison. `useOffcanvas` now shares the package's pooled `MediaQueryList` through
`subscribeMediaQuery` instead of opening its own. The date picker's two step-down tables are
`affixStepDown`, whose return type narrowed to the three sizes its map holds so a `Ma`-scale leaf takes it
directly. `Overlay` merges its two refs with `useComposedRef`, which wraps floating-ui's `useMergeRefs`.

**The platform already exported it.** `toSorted`, `toReversed`, `toSpliced`, `with`, `findLast`,
`findLastIndex`, and `at(-1)` replace the copy-then-mutate and index-arithmetic forms across the grid,
chart, map, query, pdf-viewer, and toast surfaces. `Object.fromEntries` and `new Map(entries)` replace
eleven accumulator loops. `flatMap` replaces fourteen reduce-and-push loops. `Node.contains(null)` is
`false`, so `ReadyReveal` drops three null guards, and `useReducer` replaces a hand-rolled force-update.
Four `typeof window === 'undefined'` guards inside effects were unreachable and are gone.

**One machine written twice.** Eight new modules hold what two or more files each spelled for themselves:
`utilities/focusable-selector` (the tab-order selector, in three files), `utilities/clear-native-input`
(the native-setter clear the date and search inputs both drive), `primitives/mount/held-motion` (the
accordion and collapse panel motion bag), `primitives/polymorphic/fallback` (the props type and fallback
element the two polymorphic renderers shared), `docs/engine/identifiers` (a PascalCase test written in five
places and a word matcher in three, one of which lacked the `$` escape), `docs/engine/plugins/ts-source`
(six identical `createSourceFile` calls and a named-import prologue written twice),
`docs/engine/derive-code/indent` (the dedent the api-reference extractor re-derived), and
`docs/engine/hooks/use-persisted-choice` (the theme and density hooks were one persisted choice each). The
grid's two markup escapers became one, the docs registry's two tracked-promise caches became one, and the
chart's repeated pointer projection, callout fit, and emphasis derivations each became one.

**Verbosity with no behavioural payload.** A switch over a closed union became a keyed table in six places.
`x ? true : false`, `if (c) return true; return false`, and duplicate branches collapsed. Hand-rolled
clamps route through `utilities/clamp` at eleven sites. `ReturnType<typeof f>` gave way to the named type
the same module exports.

## Ruled out

**The map's SVG prop bags cannot take `satisfies SVGAttributes<…>`.** The bags carry `data-slot`, and
React's `SVGAttributes` has no index signature for `data-*`; JSX admits the attribute, the type does not.
The `as const` casts stay.

**The demos must keep their own scale arrays.** A shared `colors` / `variants` / `sizes` module saves about
25 lines across twelve demos, but a demo's source *is* the code sample the docs render, so the saving is
paid for in what a reader sees. Left alone.

**`loadImage` must not become `HTMLImageElement.decode()`.** The promise form is shorter, but jsdom does
not implement `decode`, so the chart-export test would need a stub in place of a real assertion
([CONVENTIONS.md](../../../CONVENTIONS.md) §10.3).

**The 56 single-argument `cn(k.slot)` calls stay.** Dropping the call saves no line, and the two
`cn(className)` sites are load-bearing: `cn(undefined)` yields `''`, which renders `class=""`, where a bare
`className={undefined}` renders no attribute at all.

**`heldMotionProps` is reached at its module path, not through the `mount` barrel.** It is `@internal`, and
[CONVENTIONS.md](../../../CONVENTIONS.md) §12.1 makes the tag and a barrel entry mutually exclusive; the
two panels import the leaf, as `capitalizeFirst` and `PanelHandle` are already imported.

## Still open

These rows from [2026-08-04](2026-08-04-SIMPLIFICATION-AUDIT.md) are unresolved and were not re-walked:
the pdf-viewer toolbar icon-buttons, the cartesian engine's exploded prop lists, the three DatePicker
disclosure prologues, the List and Kanban reorder machines, the contrast threshold layer, the test contrast
helper, the hidden-iframe print harness, the two docs listbox wrappers, and the five unread hook options.
