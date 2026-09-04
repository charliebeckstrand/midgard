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

The change removes 581 lines net across `src`: 1,993 deleted against 1,412 inserted in 203 files, and 271
of the insertions are nine new shared modules. Source is about 125,000 lines, so the cut is 0.5 percent.
`components/` gives 330 lines, `modules/` 198, `docs/` 51, and the foundation layers (`core`, `hooks`,
`primitives`, `providers`, `recipes`, `utilities`, `layouts`, `types`) the rest. The counts are against
`origin/main` at the merge, and they are smaller than the first draft of this page claimed: a later pass
put several rewritten loops back (see Reverted), which returned insertions the first count had spent.

Two test files changed, both because a symbol they import moved:
`__tests__/modules/chart-scatter.test.tsx` and `docs/engine/__tests__/derive-code/snippet.test.ts`. No
test's assertions changed. The whole suite passed before and after: 6,602 unit tests in 484 files, 517
browser tests in 92 files. `tsc --noEmit` is clean on all three programs, `pnpm build` and
`pnpm docs:build` succeed, and `knip` and `biome check` stay clean. No rendered DOM changed. One public
export changed shape, compatibly: `affixStepDown` narrowed its return from `Ma` to the three sizes its
own map holds.

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
chart, map, query, pdf-viewer, and toast surfaces. `Object.fromEntries`, `new Map(entries)`, and
`flatMap` replace accumulator loops across the recipe engine, the a11y scope, the docs plugins, and the
grid, chart, and map engines — though a later pass put several of them back, and Reverted says why.
`Node.contains(null)` is
`false`, so `ReadyReveal` drops three null guards, and `useReducer` replaces a hand-rolled force-update.
`useKeybindings` drops a `typeof window === 'undefined'` guard that sat inside an effect, where it could
never be true; the ref-counted scroll-lock and grabbing-cursor guards go the same way, since each of those
functions has one caller and it is an effect.

**One machine written twice.** Nine new modules hold what two or more files each spelled for themselves:
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

## Reverted

Three rounds of review read the sweep back, and each returned some of it.

**Where the allocation showed.** `flatMap` returning `[v]` or `[]` per element allocates a throwaway array
per datum. The chart's snap builders run that inside `Array.from({length: count})` on every mount and
resize frame, over a surface documented for ten thousand points; measured, the pair went from about 3ms to
7-11ms of a 10ms layout budget. The same shape cost the grid's row-selection state 2.8x per checkbox click
and the pivot's grand total 1.8x over every cell. Those, plus the grid's numeric-column walk, the column
visibility map, the a11y scope's slot registrar, and the resizable group's handle measure, hold an
accumulator again inside the same outer shape. The 10,000-category layout benches at 7.4ms against 10.5ms
before.

**Where the rewrite changed behaviour.** `Children.toArray` drops a `false` child instead of letting it
hold its slot, so the Stepper's conditional parts shifted every stamped key after them and remounted their
siblings on toggle; both Stepper files walk raw children again. Folding the HTML-table escaper into the
worksheet's five-character one wrote `&apos;` into element text, which is not a legacy entity every
clipboard parser resolves; one escaper still serves both, with the XML form composing the HTML one.

**Where it was simply wrong.** `positionOf` walked the time anchors left to right and stopped at the first
one whose successor was later than the instant it placed. The sweep read that as "the last anchor at or
before the instant" and wrote `findLastIndex`, which agrees only on ascending anchors — and `times`
arrives in row order, so a table sorted by another column hands it a later instant before an earlier one.
On four rows dated Jan 1, Feb 10, Jan 11, Feb 20 across a 400-unit axis, the February tick sat at 277.5
where it belongs at 127.5. The early-stop walk is back. The pivot's `min` and `max` reduce with `<` and
`>` rather than `Math.min` and `Math.max`, so the first of an equal pair still wins and a `NaN` or `-0`
reads as it did, though no caller can reach either today.

## Two differences, kept on purpose

A skeptic read the whole diff after it landed and found two places where the sweep changed behaviour rather
than preserving it. Both are kept, and both are recorded here rather than in a commit message alone.

**The query builder now refuses an impossible date instead of rolling it.** `fromIsoDate` parsed with a
regex and `new Date(y, m - 1, d)`, so a stored `2025-02-31` rendered as 3 March and `2025-13-01` as
January 2026. `parseDate` throws on both, and the caught throw leaves the picker empty. A value from
outside the app can now read as absent where it used to read as a different day; showing the day nobody
wrote is the worse of the two.

**The api-reference extractor blanks whitespace-only lines.** Its private `dedent` sliced them like any
other line, leaving the residue past the common indent; the shared `reindent` empties them. The rendered
type text is the same, minus trailing whitespace.

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
