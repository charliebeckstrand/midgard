# Bug audit — 2026-10-06 (Dashboard)

Batch 3, the last batch, of the bug audit of the D components of `packages/ui`: the Dashboard module (`packages/ui/src/modules/dashboard`). Two scopes, 39 files, 7,209 lines, 12 claims. Five findings stay open: one medium and four low. Seven claims held as mechanisms with no consumer root that constructs their trigger; under the settled reach rule (Q0), B02-C04 counts as reached because its TSDoc names the input, and six stay ruled out.

## Scope

The area holds the module's engine (`engine/`, a framework-free functional core), the store and scope hooks, the `Dashboard` root, `DashboardTiles`, the tile and its parts, the drag and resize handles, the gesture owner, and the drag, resize, flip, and tile hooks.

Left out: the tests in `packages/ui/src/__tests__`, the benchmarks, the demo tree in `packages/ui/src/docs/pages/modules/dashboard` (a consumer root for the verifier), and `ROADMAP.md` (an intent source).

| Scope | Theme | Files | Lines | Claims |
|---|---|---|---|---|
| B01 | Engine and state: `engine/*` (11), `types`, `context`, `index`, `use-dashboard-store`, `use-dashboard-scope`, `use-dashboard-rows`, `dashboard-widget-provider` | 18 | 3,470 | 3 |
| B02 | Shell and interaction: `dashboard`, `dashboard-tiles`, `dashboard-tile` and its 8 parts, the drag and resize handles, `dashboard-placeholder`, `dashboard-gesture`, `use-dashboard-{drag,flip,handle,resize,tile-cell,tile-drag}` | 21 | 3,739 | 9 |
| **Total** | | **39** | **7,209** | **12** |

Intent sources: `CONVENTIONS.md` §3.6, §3.9, §7.2, §7.3, §11.3; `packages/ui/REFERENCE.md` §2; the module's `ROADMAP.md`; `packages/ui/docs/MODULES.md` (it names the module only); the TSDoc, the comments, and the tests. Consumer roots: `apps/admin`, `apps/places`, `packages/ui/src/docs/pages`, `packages/ui/src/modules`, `packages/ui/src/layouts`, and the shipped defaults. Neither app imports the dashboard; the three demo boards (`playground.tsx`, `query.tsx`, `build-and-save.tsx`) are the shipped surface.

## Method

| Pass | In | Out |
|---|---|---|
| Sweep (one `bug-sweeper` per scope, parallel) | 2 scopes, 39 files | 12 claims; coverage 18/18 and 21/21; no leads |
| Strip (script) | 12 claims | `id`, `file`, `symbol`, `trigger`, `wrongResult`, `contract`; line references removed from the text fields by regex; checked for line numbers, severities, and fix ideas |
| Blind verify (one `bug-verifier` per scope) | 3 + 9 stripped claims, digest | B01: 2 CONFIRMED, 1 REFUTED. B02: 1 CONFIRMED, 1 NARROWED, 7 REFUTED (on reach) |
| Overturn (one per scope, with the sweep evidence) | 4 surviving claims | 4 UPHELD; B02-C07 lowered from medium to low; none of the 7 refuted-on-reach claims is recorded as deliberate or known |
| Merge | 2 sheets | No group merged; 4 independent steps, disjoint file sets |
| Settle (the reader's answers, word for word) | Q0–Q5 answers | B02-C04 re-judged CONFIRMED low; steps S1–S5 settled; S5 follows S1 (shared file) |

The B01 blind pass ran twice: the first dispatch carried an unexpanded `$(cat)` in place of the claims, and the verifier returned an empty sheet without opening a file. The second dispatch carried the stripped claims.

Prior-art digest: `2026-09-28-CLEANUP-AUDIT.md` E2 (open; `DashboardLayout` has no consumer) and K7 (fixed); `2026-09-28-DOCS-SITE-AUDIT.md` D7 and D28 (open; demo tree); `2026-09-30-IOS-TOUCH-HOLD-SELECTION-AUDIT.md` S1–S4 (open; no dashboard row). No finding matches a digest entry.

## Findings

Severity: 1 medium, 4 low. Reach: 3 shipped, 2 none.

Status: `◯ OPEN` → `◐ FIXED` (on a branch) → `✅ RESOLVED ([#NNN](…))`.

| Row | File | Symbol | Verdict | Severity | Reach | Group | Status |
|---|---|---|---|---|---|---|---|
| B01-C02 | `engine/dashboard-layout.ts` | `usableDemands` | CONFIRMED | medium | none | independent | ◯ OPEN |
| B01-C01 | `engine/dashboard-drag.ts` | `dragPreview` (`dominantPeer`, `reorderPreview`) | CONFIRMED | low | shipped | independent | ◯ OPEN |
| B02-C03 | `use-dashboard-drag.ts` | `coordinateGetter` | CONFIRMED | low | shipped | independent | ◯ OPEN |
| B02-C07 | `use-dashboard-resize.ts` | `beginResize` | NARROWED | low | shipped | independent | ◯ OPEN |
| B02-C04 | `dashboard-tile.tsx` | `DashboardTile` (`freeHeight`) | CONFIRMED | low | none | independent | ◯ OPEN |

## Mechanisms

### B01-C02 — non-finite size spans pass the registration check

- **File:** `packages/ui/src/modules/dashboard/engine/dashboard-layout.ts`, `usableDemands`.
- **Mechanism:** `usableDemands` cleans only `ratio` and `minWidth`: `dashboard-layout.ts:151` `if (ratio === demands.ratio && minWidth === width) return demands`. The store calls it once per registration: `engine/dashboard-store.ts:457` `replace({ ...state, demands: new Map(state.demands).set(id, usableDemands(demands)) })`. A NaN `defaultSize`, `minSize`, or `maxSize` axis then flows on: `dashboard-layout.ts:516` `w: clampSpan(size?.w ?? DEFAULT_CELL_WIDTH, min?.w, max?.w),`; `utilities/clamp.ts:3` `return Math.min(hi, Math.max(lo, value))` keeps NaN, so `dashboard-layout.ts:201` `const w = clamp(Math.round(item.w), 1, columns)` and `:210` `x: clamp(Math.round(item.x), 0, columns - w),` give NaN, and `:206` `Math.max(1, Math.round(item.h ?? DEFAULT_CELL_HEIGHT))` gives NaN for `h`. `:524` `edge = cell.y + cell.h` then gives each later unplaced tile `y: NaN`. Into the saved layout: tidy (`use-dashboard-handle.ts:38` `const cells = tidyCells(canonical)`, `:47` `const { failure } = commit(cells)`, then `dashboard-layout.ts:677` `if (tile !== undefined && !written.has(cell.id)) merged.push(toLayoutItem(cell, tile))`); and a NaN `minSize.w` resize (`engine/dashboard-resize.ts:71` `return Math.max(legible, demand?.minSize?.w ?? 1)`, `:102` `const minW = clamp(limits.minW, 1, room)`, `:112` `return { minW, maxW: clamp(limits.maxW ?? room, minW, room), minH, maxH }`). A drag or a resize over a `defaultSize`-NaN cell ends canceled instead, because `:575` `return a.x === b.x && …` is false for NaN and `dashboard-gesture.ts:108` `const stale = gesture !== null && !sameGeometry(store.getView().canonical, gesture.snapshot)` cancels.
- **Trigger:** a `DashboardTile` prop or a `DashboardWidget` field `defaultSize`, `minSize`, or `maxSize` with a NaN or infinite axis, then `tidy()` or a resize.
- **Documented intent:** `dashboard-layout.ts:139-140` "The store checks each registration, so no NaN or infinite cell reaches a gesture or the saved layout." The spec route is guarded (`engine/dashboard-spec-parse.ts:115` `return typeof value === 'number' && Number.isFinite(value)`); the JSX and widget routes are not. Tests cover NaN and Infinity for `ratio` and `minWidth` only (`__tests__/modules/dashboard-store.test.ts`).
- **Reach:** none. Every span in the roots is a finite literal (`build-and-save.tsx:58-78`); shipped defaults are finite (`DEFAULT_CELL_WIDTH`, `DEFAULT_CELL_HEIGHT`). The trigger is constructible through the public props typed `number`.
- **Severity:** medium — one bad prop breaks placement and writes NaN geometry into a persisted layout (JSON writes `null`, and the next parse drops the entry), against a stated guarantee; low on reach.
- **Prior art:** none.

### B01-C01 — a half-coverage tie picks the reorder partner by array order

- **File:** `packages/ui/src/modules/dashboard/engine/dashboard-drag.ts`, `dragPreview` through `dominantPeer` and `reorderPreview`.
- **Mechanism:** `dominantPeer` keeps the first peer at the maximum: `dashboard-drag.ts:207` `if (peer.id === target.id) continue`, `:211` `if (area > most) {`. `reorderPreview` tests only that one peer: `:265` `const partner = dominantPeer(snapshot, target)`, `:267` `if (partner === undefined || partner.static) return null`, `:269` `if (partner.w !== origin.w || partner.h !== origin.h) return null`, `:271` `if (overlapArea(partner, target) * 2 < origin.w * origin.h) return null`. On `null`, `:252` `if (reorder !== null) return reorder` falls to `:254` `const snap = nearestFit(snapshot, id, x, y, columns)`. The snapshot is in saved-array order (`dashboard-gesture.ts` `snapshot: [...view.cells.values()],`), which a shift does not reorder.
- **Trigger:** the target of a drag is covered exactly half by an equal-span, non-static peer and half by an unequal or static peer, and the second one comes first in the array. Example: 24 columns; A 8×8 at (0,0), B 8×8 at (8,0), C 8×12 at (16,0), order [A, C, B]; drag A to x=12. In the build-and-save demo: shift tile-2 and tile-3, resize tile-2 to h=27, drag tile-1 to x=12.
- **Documented intent:** `dashboard-drag.ts:9` "2. An equal-span tile covers at least half of the target: the two reorder." `:226-229` "A reorder engages at half coverage, not over half. … A stricter test would block that one column, and the shifted run would move home and back for one step." The test "engages a reorder at exactly half coverage" (`__tests__/geometry/dashboard-drag.test.ts`) has one peer only.
- **Reach:** shipped. `use-dashboard-drag.ts:209` `const preview = dragPreview(gesture.snapshot, gesture.id, x, y, columns)` on each drag move; the build-and-save demo reaches the shape.
- **Severity:** low — one crossover column snaps instead of shifting, and the next column heals it.
- **Prior art:** none.

### B02-C03 — keyboard overshoot at an edge makes the return presses dead

- **File:** `packages/ui/src/modules/dashboard/use-dashboard-drag.ts`, `coordinateGetter`.
- **Mechanism:** the getter adds each step to the unclamped dnd-kit position: `use-dashboard-drag.ts:280` `if (event.code === 'ArrowRight') step.x = pitch`, `:286` `return { x: currentCoordinates.x + step.x, y: currentCoordinates.y + step.y }`. dnd-kit reads `currentCoordinates` from the collision rect of the full translate (`@dnd-kit/core` 6.3.1 `core.esm.js:1204-1205`, `:2984`), and the board passes no `modifiers`. The board clamps only its own target and paint: `:196` `const offset = travelOffset(origin, event.delta, travel, pitch, inline)` → `engine/dashboard-drag.ts:93` `x: inline * clamp(inline * offset.x, -origin.x * pitch, (travel.maxX - origin.x) * pitch),`; `use-dashboard-tile-drag.ts:74` `return travelOffset(cell, transform, travel, pitch, inline)`. A press inside the overshoot changes no target: `use-dashboard-drag.ts:205` `if (last !== null && last.x === x && last.y === y) return`. No override or patch applies to `@dnd-kit/core`.
- **Trigger:** in a keyboard drag, N arrow presses past the travel range, then the opposite arrow: the first N return presses do nothing. Vertical overshoot near a scrollable ancestor can turn into page scroll instead (`core.esm.js:1275-1287`); the horizontal case holds fully.
- **Documented intent:** `use-dashboard-drag.ts:271` "// One arrow press moves one column, or one row, of the traveling tile." The pointer overshoot is deliberate (`dashboard-tile.tsx:194-195`); nothing extends it to the keyboard. Tests call the getter from `{ x: 0, y: 0 }` only.
- **Reach:** shipped. Every movable tile renders the keyboard grip (`dashboard-tile-card.tsx` `const handle = movable && (<DashboardDragHandle`); edit-mode boards `query.tsx:82`, `build-and-save.tsx:357`, `playground.tsx:19`.
- **Severity:** low — dead presses for keyboard and assistive-tech users, no wrong commit; Escape recovers.
- **Prior art:** none.

### B02-C07 — a macOS Ctrl-click starts a pointer resize

- **File:** `packages/ui/src/modules/dashboard/use-dashboard-resize.ts`, `beginResize`.
- **Mechanism:** the only press filter is `use-dashboard-resize.ts:115` `if (event.button !== 0) return`. A macOS Ctrl-click (button 0, `ctrlKey`) passes, takes capture (`:166` `handle.setPointerCapture(pointerId)`), and starts the gesture; it ends on `:254` `handle.addEventListener('pointerup', () => finish(true), { signal })`, `pointercancel`, `:258` `handle.addEventListener('lostpointercapture', () => finish(false), { signal })`, or Escape. The handle wires it directly: `dashboard-resize-handle.tsx:123` `onPointerDown={(event) => beginResize(id, edge, event)}`. The drag path filters the same press: `hooks/use-sortable-sensors.ts:36` `if (!event.isPrimary || event.button !== 0 || event.ctrlKey) return false`. A later release commits through `dashboard-gesture.ts:122` `const { layout: next, kept, failure } = commit(preview)`.
- **Trigger:** a macOS Ctrl-click on a resize splitter in edit mode. Unverified: whether the opening context menu swallows `pointerup` without `lostpointercapture` or `pointercancel` on a captured pointer (Q5). The repository states the premise for drags at `use-sortable-sensors.ts:20-22`.
- **Documented intent:** `use-sortable-sensors.ts:22-24` "Rejecting `ctrlKey` … keeps any context-menu gesture from ever beginning a drag." The test "starts nothing on a secondary button" (`__tests__/modules/dashboard-resize-pointer.test.tsx`) shows the intent to refuse context-menu presses; no test covers `ctrlKey`.
- **Reach:** shipped. Splitters render on every movable tile (`dashboard-tile.tsx` `{movable && (<DashboardTileEdges`); edit-mode boards as in B02-C03.
- **Severity:** low (lowered from medium by the overturn) — macOS only, a thin splitter, the preview shows the size before the next click commits, and Escape recovers; it heals as a cancel if the browser releases capture.
- **Prior art:** none.

### B02-C04 — an unusable ratio hides the south splitter

- **File:** `packages/ui/src/modules/dashboard/dashboard-tile.tsx`, `DashboardTile` (the `freeHeight` prop of `DashboardTileEdges`).
- **Mechanism:** the engine normalizes the ratio at registration (`engine/dashboard-store.ts:457` `replace({ ...state, demands: new Map(state.demands).set(id, usableDemands(demands)) })`, `engine/dashboard-layout.ts:145` `const ratio = usableRatio(demands.ratio)`, `:130` `return ratio !== undefined && Number.isFinite(ratio) && ratio > 0 ? ratio : undefined`), and the resize engine reads the normalized value (`engine/dashboard-resize.ts:122` `return edge !== 'e' && ratio === undefined`). The splitter set reads the raw prop: `dashboard-tile.tsx:345` `freeHeight={ratio === undefined}` → `dashboard-tile-edges.tsx:83` `{freeHeight && <DashboardResizeHandle edge="s" {...shared} />}`. The corner, the only other edge that drives height, is hidden from the keyboard (`dashboard-resize-handle.tsx:102-104` `const keyboard = edge === 'se' ? { 'aria-hidden': true }`). It is the only raw read: `use-dashboard-tile-cell.ts:135` `resolveCell(entry, { ratio }, state.columns)` and `toLayoutItem` normalize inside.
- **Trigger:** `ratio={0 / 0}`, `NaN`, `0`, a negative value, or Infinity, on a JSX tile or through a widget kind (`dashboard-tiles.tsx:242` `ratio={widget?.ratio}`).
- **Documented intent:** `dashboard-tile.tsx:79-81` "Omit it for a free-form tile, which resizes on both axes. A value that is not a finite number above 0, such as the 0/0 of an image before it loads, counts as no ratio." `dashboard-tile-edges.tsx:32-33` "the south edge shows only on a free-form tile."
- **Reach:** none in the roots (every consumer `ratio` is `16 / 9`); counted as reached under Q0, because the public TSDoc names the input.
- **Severity:** low — a keyboard user cannot change the height of that tile, a pointer user keeps the corner, nothing wrong commits, and a transient ratio heals when it turns valid.
- **Prior art:** none.

## Root-cause groups

None. The five rows are independent; no two share a file and a symbol.

## Recommended resolution

Merge order S1 → S5. S1 and S5 both edit `engine/dashboard-layout.ts`, so S5 follows S1; the other file sets are disjoint. Every gate is settled.

### S1 — closes B01-C02

- **Change:** `usableDemands` checks every axis of `defaultSize`, `minSize`, and `maxSize` with `Number.isFinite`, as it checks `minWidth`. A non-finite `minSize` or `maxSize` axis becomes absent, and an object with no axis left becomes `undefined` (as `bound()` in `use-dashboard-tile-cell.ts` does). A non-finite `defaultSize.h` becomes absent; `defaultSize.w` is required, so a non-finite `w` takes `DEFAULT_CELL_WIDTH`. When every value is usable, it returns the same object (`:151`). The TSDoc summary of `usableDemands` names the new fields. No change in `dashboard-resize.ts`.
- **Rows closed:** B01-C02.
- **Files:** `packages/ui/src/modules/dashboard/engine/dashboard-layout.ts`; `packages/ui/src/__tests__/modules/dashboard-store.test.ts`.
- **Order:** first; the only medium row, and S5 shares its file.
- **Depends on:** none.
- **Gate:** settled (Q0, Q1).
- **Test seam:** `createDashboardStore(…).register(id, { defaultSize: { w: NaN }, minSize: { w: Infinity }, maxSize: { h: NaN } })`, then `getView().canonical`: the cell is finite, at `DEFAULT_CELL_WIDTH`; a clean registration returns the same demands object.

### S2 — closes B01-C01

- **Change:** pass `origin` to `dominantPeer` (its only caller is `:265`). At equal overlap area, prefer an eligible peer (not `static`, `w` and `h` equal to `origin`) over an ineligible one: replace the strict `:211` `if (area > most) {` with "greater, or equal and this peer is eligible while the kept one is not". An eligible peer ties the maximum only at exactly half coverage, so the change stays in that tie. `reorderPreview` stays as is.
- **Rows closed:** B01-C01.
- **Files:** `packages/ui/src/modules/dashboard/engine/dashboard-drag.ts`; `packages/ui/src/__tests__/geometry/dashboard-drag.test.ts`.
- **Order:** second.
- **Depends on:** none.
- **Gate:** settled (Q2).
- **Test seam:** 24 columns, A 8×8 at (0,0), B 8×8 at (8,0), C 8×12 at (16,0); `dragPreview(snapshot, 'A', 12, 0, 24)` with the order [A, C, B] and with [A, B, C] both return `kind: 'shift', partner: 'B'`.

### S3 — closes B02-C03

- **Change:** `coordinateGetter` starts each step from the clamped position. Keep the last raw `event.delta` of `handleDragMove` in a ref, set before the dedupe return at `:205` and reset at drag start and end. In the getter, compute `clamped = travelOffset(origin, delta, travel, pitch, inline)` from `store.getView()` and the gesture, as `:188-196` does, and return `currentCoordinates + (clamped − delta) + step`. No change to `modifiers`, the pointer path, or the announcements.
- **Rows closed:** B02-C03.
- **Files:** `packages/ui/src/modules/dashboard/use-dashboard-drag.ts`; `packages/ui/src/__tests__/modules/use-dashboard-drag.test.ts`.
- **Order:** third.
- **Depends on:** none.
- **Gate:** settled (Q3).
- **Test seam:** `context.onDragStart?.(start('alpha'))`, `context.onDragMove?.(move('alpha', <past travel.maxX>))`, then the getter with `currentCoordinates` at that overshoot and `ArrowLeft`: one pitch inside the clamped edge.

### S4 — closes B02-C07

- **Change:** replace `use-dashboard-resize.ts:115` `if (event.button !== 0) return` with `if (!event.isPrimary || event.button !== 0 || event.ctrlKey) return`, inline.
- **Rows closed:** B02-C07.
- **Files:** `packages/ui/src/modules/dashboard/use-dashboard-resize.ts`; `packages/ui/src/__tests__/modules/dashboard-resize-pointer.test.tsx`.
- **Order:** fourth.
- **Depends on:** none.
- **Gate:** settled (Q4; Q5 no longer gates).
- **Test seam:** `fireEvent.pointerDown(east, { button: 0, ctrlKey: true, isPrimary: true })`, and separately `{ button: 0, isPrimary: false }`: `onResizeStart` is not called and `store.getState().gesture` is `null`.

### S5 — closes B02-C04

- **Change:** export `usableRatio` from `engine/dashboard-layout.ts` (a named export of the module file only; `modules/dashboard/index.ts` does not re-export it, so the public surface does not change), and set `dashboard-tile.tsx:345` to `freeHeight={usableRatio(ratio) === undefined}`. Read the prop, not the store's `demand.ratio`: the edges render before registration on the server and in the hydration render.
- **Rows closed:** B02-C04.
- **Files:** `packages/ui/src/modules/dashboard/dashboard-tile.tsx`; `packages/ui/src/modules/dashboard/engine/dashboard-layout.ts` (export only); `packages/ui/src/__tests__/modules/dashboard.test.tsx`.
- **Order:** fifth, after S1 (shared file).
- **Depends on:** S1, for merge order only.
- **Gate:** settled (Q0).
- **Test seam:** beside "gives each edge a keyboard splitter, and no south edge to a ratio tile" in `dashboard.test.tsx`, render an editing board with a tile `ratio={0 / 0}`: two `separator`s named `Resize <label>`, and ArrowDown on the horizontal one changes `aria-valuenow`.

## Open questions

**Q0 — the reach rule.** The B02 verifier applied §3.6 of `bug-verifier.md` strictly: a trigger no consumer root constructs refutes the claim. Seven B02 claims hold as mechanisms and fall on that rule alone. The B01 verifier confirmed B01-C02, whose reach is also none. Axes: (a) strict — B01-C02 goes to a re-judge under the rule and likely moves to Ruled out; (b) count a trigger that the public TSDoc names as a supported input — B01-C02 stays, and B02-C04 (the TSDoc names `0/0` as a ratio) is re-judged; (c) count any trigger the public API can construct — the seven B02 claims are re-judged as findings.

*Answer:* "Documented inputs (Recommended)": "A trigger counts as reached when the public TSDoc names it as a supported input. B01-C02 stays, and B02-C04 (the TSDoc names a 0/0 ratio) is re-judged as a finding. The other six stay ruled out."

**Q1 — S1: what a bad span axis becomes.** (a) Absent, so the axis falls back to its default, as `ratio` and `minWidth` do; (b) rounded or clamped and kept, which needs a guard in `dashboard-resize.ts` too. Sub-axis: whether `maxSize` takes the same rule.

*Answer:* "Absent, all three (Recommended)": "The axis drops and falls back to its default, as ratio and minWidth already do. The same rule applies to maxSize, and the change stays in dashboard-layout.ts plus the store test."

**Q2 — S2: what wins a half-coverage tie.** (a) The eligible equal-span peer, so the half-coverage reorder always engages; (b) any tie with an ineligible peer is no reorder.

*Answer (with Q3):* "Eligible peer + getter (Recommended)": "S2: the equal-span peer wins, so the half-coverage reorder always engages, as the @remarks says. S3: clamp inside coordinateGetter, for the keyboard only, so the pointer keeps its deliberate overshoot."

**Q3 — S3: where the clamp goes.** (a) In `coordinateGetter`, keyboard only, keeping the pointer overshoot; (b) a dnd-kit `modifiers` entry, which clamps the pointer too and changes the announcement delta.

*Answer:* see Q2.

**Q4 — S4: where the guard lives.** (a) Inline in `beginResize`; (b) one predicate exported from `hooks/use-sortable-sensors.ts` (not from `hooks/index.ts`) and used by both.

*Answer (with Q5):* "Inline guard now (Recommended)": "Ship the guard (!isPrimary || button !== 0 || ctrlKey) inline in beginResize, without waiting for the browser fact. It is cheap hardening that matches PrimaryPointerSensor."

**Q5 — S4: the browser fact.** Does a native context menu over a captured pointer fire `lostpointercapture` or `pointercancel` on macOS Chrome, Safari, and Firefox? Yes in all: the defect heals as a cancel and S4 is optional hardening. No in any: S4 stands.

*Answer:* see Q4. The fact stays unverified and no longer gates S4.

## Ruled out

- **B01-C03** (`mergeLayout` rewrites the entry of a tile that is not mounted): `dashboard-gesture.ts:108` `const stale = gesture !== null && !sameGeometry(store.getView().canonical, gesture.snapshot)` cancels a gesture over a changed tile set; tidy commits only `canonical` (`use-dashboard-handle.ts:38` `const cells = tidyCells(canonical)`) and refuses during a gesture (`:34`).
- **B02-C01** (a throwing `onResizeStart` strands the resize gesture): the mechanism holds (`use-dashboard-resize.ts:188` `reportResizeStart({ id, layout })` runs before `:265` `live.current = { id, finish }`); no consumer root passes `onResizeStart`. Dropped part: "the splitter keeps pointer capture" (capture ends at `pointerup`).
- **B02-C02** (a throwing `onDragStart` strands the drag gesture): the mechanism holds (`use-dashboard-drag.ts:176` `reportDragStart({ id, layout })` throws inside the dnd-kit start batch before its `DragStart` dispatch); no consumer root passes `onDragStart`.
- **B02-C05** (a headerless tile has no Clear control): the mechanism holds (`dashboard-tile-card.tsx:160` `{hasHeader && (`); every consumer tile has a header row.
- **B02-C06** (`instanceof Element` fails across realms): the mechanism holds (`use-dashboard-tile-drag.ts:33` `if (!(target instanceof Element) || !currentTarget.contains(target)) return true`); no consumer renders a board into another document.
- **B02-C07, dropped part:** "or a non-primary pointer" — the stranding needs a context menu, and `dashboard-gesture.ts:67` `if (canvas === null || store.getState().gesture !== null) return null` refuses a second concurrent gesture.
- **B02-C08** (tidy announces before a commit that throws): the mechanism holds (`use-dashboard-handle.ts:43` `announce(describeTidy(moved))` before `:47`); the one `tidy` site binds an `onValueChange` that does not throw.
- **B02-C09** (expand-dialog focus falls to the page when its tile unmounts): the mechanism holds (`dashboard-tile-expand.tsx:98` `if (openRef.current) handBackFocus(shell.current)`, `:53` `if (!shell?.isConnected) return`); no consumer removes a tile while its dialog is open.

## Surfaced, not judged

- **Verifier (B01):** while a NaN cell exists, every drag and pointer resize ends canceled with no message (`dashboard-layout.ts:575` against `dashboard-gesture.ts:108`). S1 removes the cause.
- **Verifier (B01):** with a NaN `minSize.w`, the splitter ARIA values from `resizeRange` (`dashboard-tile-edges.tsx`) are likely NaN. S1 removes the cause.
- **Verifier (B02):** `beginResize` and `handleDragStart` set the store gesture before the app callback, and `tidy` announces before its commit (B02-C01, C02, C08). Refuted on reach; Q0 keeps them ruled out.
- **Verifier (settle):** at a tie between two eligible equal-span peers, the first in array order still wins; both outcomes reorder, so B01-C01's wrong result cannot occur.
- **Verifier (B02 overturn):** a headerless tile also has no widget header-actions slot; deliberate (`dashboard-tile.tsx:191-192`), a neighbor of B02-C05.
- **Verifier (B02 overturn):** the stock `sortableKeyboardCoordinates` in `hooks/use-sortable-sensors.ts` may carry the same unclamped accumulation as B02-C03 for other dnd-kit consumers; a cross-component probe.
- **Verifier (merge):** `modules/grid/grid-column-header.tsx:43` cites the same macOS Ctrl-click shape; under Q4 (b), a third caller of a shared predicate.
- **Caller:** no sweep reached `hooks/use-floating-ui.ts` (owned by another session) or the batch-2 leads in `hooks/use-panel-resize.ts` and `hooks/use-panel-fit.ts`.
