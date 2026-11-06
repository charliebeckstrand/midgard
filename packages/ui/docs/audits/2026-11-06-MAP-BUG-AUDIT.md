# Bug audit: Map module (packages/ui), 2026-11-06
Mode `area`, at `236f0bb`. The area is the Map unit source: `packages/ui/src/modules/map` and the recipes `kata/map.ts` and `kiso/kokkaku/map.ts`. 4 scopes, 89 files, 19,341 lines, 52 claims. 43 findings stay open (low 39, medium 4); 9 claims are ruled out.

## Scope

The area holds every source file of `packages/ui/src/modules/map` and the two map recipe files. It leaves out the tests and the benchmarks, the module `ROADMAP.md` (no code), and the docs page folder `docs/pages/modules/map`, which stays a consumer root in an `area` audit (bug-audit §3.2). A parallel `/assess` run in 8 passes covered the docs pages and the ROADMAP.

| Scope | Theme | Files | Lines | Claims |
| --- | --- | --- | --- | --- |
| B01 | Plat, frame, context, hover and zoom providers, tooltip, table, coverage, zoom hook and engine, recipes | 20 | 5,131 | 12 |
| B02 | Marks (dot, halo, line, marker, point, points, route, geofence), their hooks, overlay, keyboard and hover engine | 21 | 4,919 | 16 |
| B03 | Regions, region readout, legends, region, zip, legend and cluster engine | 26 | 5,178 | 13 |
| B04 | Engine geometry, projection, routing, outline, constants, types, motion, geofence math | 22 | 4,113 | 11 |

## Method

- Intent sources: `CONVENTIONS.md` §3, §4, §5, §7, §10.7, §10.8, §11.3, and §12.1; `packages/ui/REFERENCE.md` §2; the ARIA Authoring Practices pattern of each role; and the TSDoc, the comments, and the tests of the code.
- Consumer roots: `apps/admin`, `apps/places`, `apps/picks`, `packages/ui/src/docs`, `packages/ui/src/modules`, `packages/ui/src/layouts`, and the shipped defaults of each component. Test roots: `packages/ui/src/__tests__`, `packages/ui/src/docs/fixtures`.
- Digest: the open map rows, ruled-out entries and surfaced entries of `2026-10-26-BUG-AUDIT.md` (branch `claude/project-thread-e6s31k`) and `2026-10-18-BUG-AUDIT.md` (branch `claude/audit-grid-fit-gutter`), and three rulings of the reader (the declined `anySignal` and `round` helpers, cross-mark clustering in #3223 and #3224, the Chromium pointerover answer in #3107).
- Agents: the Agent tool listed no `bug-sweeper` or `bug-verifier` type, so each call ran as a `general-purpose` agent on Opus with the agent file as its instructions (§3.8).
- Coverage: each sweep returned `listed` and `read` equal to its file count and no unopened file, checked with `jq`.
- Strip: `jq` removed `evidence`. The line-reference check printed one claim (B01-C02 quoted a test path with lines in `contract`); the caller moved that reference into its evidence and stripped again, and the check then printed nothing.
- Deviations: the two judge calls each made one stray tool call outside the frontmatter (an empty Bash call, an `echo`, and a refused Artifact publish), and each reports that it opened no sweep file. The merge call joined one defect that the two sheets rate at two severities (M1); the record keeps both ratings (§9.4).

| Pass | In | Out |
| --- | --- | --- |
| Sweep | 4 scopes, 89 files | 52 claims, 6 leads |
| Judge (B01+B02, B03+B04) | 52 stripped claims | 43 confirmed or narrowed, 9 refuted, 0 unlocated |
| Overturn | 5 mediums with evidence | B01-C07 KEPT, B02-C11 KEPT, B02-C14 KEPT, B03-C01 LOWERED, B03-C11 KEPT |
| Merge | 2 sheets | 7 groups, 35 steps, 11 questions |

## Findings

By severity: low 39, medium 4. By reach: none 29, shipped 13, test-only 1. By kind: bug 9, correctness 31, polish 3.

Status: `◯ OPEN`; `✅ RESOLVED (#NNN)` after the fix merges; `✖ DROPPED` with the reason of the reader.

| Row | File | Symbol | Verdict | Severity | Reach | Kind | Group | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [B01-C07](#b01-c07) | `modules/map/use-map-zoom.ts` | useMapZoom | CONFIRMED | medium | shipped | bug | independent | ✅ RESOLVED ([#3311](https://github.com/charliebeckstrand/midgard/pull/3311)) |
| [B02-C11](#b02-c11) | `modules/map/map-dot.tsx` | dotHitProps | CONFIRMED | medium | shipped | bug | independent | ◯ OPEN |
| [B02-C14](#b02-c14) | `modules/map/use-map-keyboard.ts` | useMapKeyboard | CONFIRMED | medium | shipped | bug | independent | ✅ RESOLVED ([#3311](https://github.com/charliebeckstrand/midgard/pull/3311)) |
| [B03-C11](#b03-c11) | `modules/map/map-legend-region.tsx` | MapLegendSlot | CONFIRMED | medium | shipped | bug | M1 | ✅ RESOLVED ([#3309](https://github.com/charliebeckstrand/midgard/pull/3309)) |
| [B01-C01](#b01-c01) | `recipes/kata/map.ts` | k.legend | CONFIRMED | low | shipped | bug | M1 | ✅ RESOLVED ([#3309](https://github.com/charliebeckstrand/midgard/pull/3309)) |
| [B01-C02](#b01-c02) | `modules/map/map-plat.tsx` | MapPlat | NARROWED | low | none | correctness | independent | ✅ RESOLVED ([#3313](https://github.com/charliebeckstrand/midgard/pull/3313)) |
| [B01-C03](#b01-c03) | `modules/map/map-plat.tsx` | MapPlat | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3313](https://github.com/charliebeckstrand/midgard/pull/3313)) |
| [B01-C04](#b01-c04) | `modules/map/map-plat.tsx` | MapPlat | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3313](https://github.com/charliebeckstrand/midgard/pull/3313)) |
| [B01-C05](#b01-c05) | `modules/map/map-plat.tsx` | MapPlat | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3313](https://github.com/charliebeckstrand/midgard/pull/3313)) |
| [B01-C06](#b01-c06) | `modules/map/map-plat.tsx` | MapPlat | CONFIRMED | low | none | correctness | M3 | ✅ RESOLVED ([#3311](https://github.com/charliebeckstrand/midgard/pull/3311)) |
| [B01-C08](#b01-c08) | `modules/map/use-map-zoom.ts` | useMapZoom | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3311](https://github.com/charliebeckstrand/midgard/pull/3311)) |
| [B01-C09](#b01-c09) | `modules/map/map-table.tsx` | MapTableProps.header | NARROWED | low | shipped | correctness | independent | ✅ RESOLVED ([#3319](https://github.com/charliebeckstrand/midgard/pull/3319)) |
| [B01-C11](#b01-c11) | `modules/map/use-map-coverage.ts` | useMapCoverage | CONFIRMED | low | none | polish | M7 | ◯ OPEN |
| [B01-C12](#b01-c12) | `recipes/kata/map.ts` | k.group | CONFIRMED | low | none | polish | M7 | ◯ OPEN |
| [B02-C01](#b02-c01) | `modules/map/map-dot.tsx` | MapDot | CONFIRMED | low | shipped | bug | independent | ◯ OPEN |
| [B02-C02](#b02-c02) | `modules/map/map-point.tsx` | MapPoint | CONFIRMED | low | none | correctness | M2 | ◯ OPEN |
| [B02-C03](#b02-c03) | `modules/map/map-points.tsx` | MapPoints | CONFIRMED | low | shipped | bug | M2 | ◯ OPEN |
| [B02-C04](#b02-c04) | `modules/map/map-marker.tsx` | MapMarker | CONFIRMED | low | none | correctness | M5 | ◯ OPEN |
| [B02-C05](#b02-c05) | `modules/map/map-points.tsx` | MapPoints | CONFIRMED | low | none | correctness | M5 | ◯ OPEN |
| [B02-C06](#b02-c06) | `modules/map/use-map-overlay.ts` | useMapOverlay | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3319](https://github.com/charliebeckstrand/midgard/pull/3319)) |
| [B02-C07](#b02-c07) | `modules/map/map-route.tsx` | MapRoute | CONFIRMED | low | none | correctness | M4 | ✅ RESOLVED ([#3319](https://github.com/charliebeckstrand/midgard/pull/3319)) |
| [B02-C08](#b02-c08) | `modules/map/map-geofence.tsx` | MapGeofence | CONFIRMED | low | none | correctness | M4 | ✅ RESOLVED ([#3319](https://github.com/charliebeckstrand/midgard/pull/3319)) |
| [B02-C09](#b02-c09) | `modules/map/map-line.tsx` | MapLineDraw | CONFIRMED | low | shipped | bug | independent | ◯ OPEN |
| [B02-C10](#b02-c10) | `modules/map/map-dot.tsx` | MapDotCount | CONFIRMED | low | shipped | bug | independent | ◯ OPEN |
| [B02-C12](#b02-c12) | `modules/map/engine/map-overlay/readout.ts` | markRows | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3319](https://github.com/charliebeckstrand/midgard/pull/3319)) |
| [B02-C13](#b02-c13) | `modules/map/engine/map-overlay/readout.ts` | markRows | CONFIRMED | low | shipped | correctness | independent | ✅ RESOLVED ([#3319](https://github.com/charliebeckstrand/midgard/pull/3319)) |
| [B02-C15](#b02-c15) | `modules/map/use-map-keyboard.ts` | useMapKeyboard | CONFIRMED | low | none | correctness | M3 | ✅ RESOLVED ([#3311](https://github.com/charliebeckstrand/midgard/pull/3311)) |
| [B03-C01](#b03-c01) | `modules/map/engine/map-cluster/group.ts` | seedGroups | CONFIRMED | low | shipped | correctness | M6 | ✅ RESOLVED ([#3319](https://github.com/charliebeckstrand/midgard/pull/3319)) |
| [B03-C02](#b03-c02) | `modules/map/engine/map-cluster/group.ts` | nearestSeed | CONFIRMED | low | test-only | correctness | M6 | ✅ RESOLVED ([#3319](https://github.com/charliebeckstrand/midgard/pull/3319)) |
| [B03-C04](#b03-c04) | `modules/map/engine/map-region/value.ts` | resolveValueBins | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3308](https://github.com/charliebeckstrand/midgard/pull/3308)) |
| [B03-C09](#b03-c09) | `modules/map/engine/map-zip/selection.ts` | readRule | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3308](https://github.com/charliebeckstrand/midgard/pull/3308)) |
| [B03-C13](#b03-c13) | `modules/map/map-regions.tsx` | Region | CONFIRMED | low | none | polish | M7 | ◯ OPEN |
| [B04-C01](#b04-c01) | `modules/map/engine/map-geometry/locate.ts` | featureBounds / regionAt / regionsMeeting | CONFIRMED | low | none | correctness | independent | ◯ OPEN |
| [B04-C02](#b04-c02) | `modules/map/engine/map-geometry/mark.ts` | ringArcs | CONFIRMED | low | none | correctness | independent | ◯ OPEN |
| [B04-C03](#b04-c03) | `modules/map/engine/map-geometry/mark.ts` | unprojectPoint | CONFIRMED | low | shipped | correctness | independent | ◯ OPEN |
| [B04-C04](#b04-c04) | `modules/map/engine/map-geometry/projected.ts` | buildWitness / firstPosition | CONFIRMED | low | none | correctness | independent | ◯ OPEN |
| [B04-C05](#b04-c05) | `modules/map/engine/map-geometry/projected.ts` | probeCanonicalFit | CONFIRMED | low | none | correctness | independent | ◯ OPEN |
| [B04-C06](#b04-c06) | `modules/map/engine/map-projection/resolve.ts` | fitWidthFromProbeBounds | CONFIRMED | low | none | correctness | independent | ◯ OPEN |
| [B04-C07](#b04-c07) | `modules/map/engine/map-routing/failure.ts` | thrownFailure | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3308](https://github.com/charliebeckstrand/midgard/pull/3308)) |
| [B04-C08](#b04-c08) | `modules/map/engine/map-routing/request.ts` | requestSignal | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3308](https://github.com/charliebeckstrand/midgard/pull/3308)) |
| [B04-C09](#b04-c09) | `modules/map/engine/map-routing/request.ts` | routeFetch | CONFIRMED | low | none | correctness | independent | ✅ RESOLVED ([#3308](https://github.com/charliebeckstrand/midgard/pull/3308)) |
| [B04-C10](#b04-c10) | `modules/map/engine/map-constants.ts` | ALBERS_USA_ASPECT | CONFIRMED | low | none | correctness | independent | ◯ OPEN |
| [B04-C11](#b04-c11) | `modules/map/engine/types.ts` | MapProjection | NARROWED | low | none | correctness | independent | ◯ OPEN |

## Mechanisms

Each entry is the specification of the fix. Lines are quoted as the verifier read them at the audit commit.

### B01-C07

- File: `packages/ui/src/modules/map/use-map-zoom.ts` (useMapZoom)
- Claim: The pointer stays in the gesture. A later mouse move over the map with no button held pans the map, sets `gesturing` (the marks stop answering the pointer and the readout goes) and the next click on the map is swallowed, until the reader presses again.
- Mechanism:
  - `packages/ui/src/modules/map/use-map-zoom.ts:607 pointers.current.set(event.pointerId, at)`
  - `packages/ui/src/modules/map/use-map-zoom.ts:623 press.current = { from: at, moved: false }`
  - `packages/ui/src/modules/map/use-map-zoom.ts:641 if (pointerGap(gesture.from, at) <= MAP_PAN_THRESHOLD) return`
  - `packages/ui/src/modules/map/engine/map-constants.ts:262 export const MAP_PAN_THRESHOLD = 4`
  - `packages/ui/src/modules/map/use-map-zoom.ts:683 if (press.current?.moved === true) hold(event)`
  - `packages/ui/src/modules/map/use-map-zoom.ts:474 event.currentTarget.setPointerCapture(event.pointerId)`
  - `packages/ui/src/modules/map/use-map-zoom.ts:667-669 const prev = pointers.current.get(event.pointerId) ... if (prev === undefined) return`
  - `packages/ui/src/modules/map/use-map-zoom.ts:643-647 gesture.moved = true ... panned.current = true ... setGesturing(true)`
  - `packages/ui/src/modules/map/use-map-zoom.ts:744-750 onPointerUp: release, onPointerCancel: release, ... onLostPointerCapture,`
  - `packages/ui/src/modules/map/map-frame.tsx:221-222 {...surface} {...press}`
  - `packages/ui/src/modules/map/map-plat.tsx:572 pointerEvents={zoom.gesturing ? 'none' : undefined}`
- Trigger: On a zooming map, a mouse press lands near the plot edge and the first pointermove after it is already outside the plot (a press within 4px of the edge, or a fast drag off the edge that the browser coalesces into one move), and the button lifts outside the plot. Capture is taken only past the threshold, so neither the moves outside nor the `pointerup` reach the plot, and the pointer stays in `pointers`. The next button-less move over the map passes the threshold, pans the map, and sets `gesturing`, so the layer drops the pointer. The click of the next press is lost: its `mousedown` hits the plot through the `pointer-events: none` layer, so the click does not reach the region or the mark. The press after that works.
- Documented intent: map-plat.tsx:213-214 "Shift and a wheel zoom about the pointer, a drag pans"; use-map-zoom.ts:88-91 gesturing is "a pan, a pinch, or a wheel that has not settled". Nothing documents a pan with no button held. use-map-zoom.ts:461-469 makes the late capture deliberate to keep clicks, not the stuck pointer.
- Reach: shipped. apps/places/src/components/places-map/places-map.tsx:314 zoom={{ modifier: false }}; packages/ui/src/docs/pages/modules/map/point/zoomable.tsx:30 zoom. Search: Searched the six roots for zoom on <MapPlat: apps/places places-map.tsx and docs point/zoomable.tsx; the playground can set it through its props.
- Severity: medium. On the Places map and the docs zoom page a mouse user who drags off the edge gets a map that pans under a bare hover, loses its readout, and drops one click, and recovers with the next press.
- Overturn: KEPT. No source makes a hover pan deliberate: the late capture is deliberate only to keep clicks (use-map-zoom.ts:463-467 "A plot that captured on contact would therefore answer every click itself"), the surface binds no window `pointerup` and no `pointerleave` (use-map-zoom.ts:742-751 lists onPointerDown, onPointerMove, onPointerUp: release, onPointerCancel: release, onLostPointerCapture, onClickCapture), `release` runs only from those, and `drag` never reads `event.buttons`, so a coalesced first move off the edge on the shipped Places map reaches the stuck pointer; the defect persists until the next press, so medium stands.
- Prior art: NONE; searched the digest for pointer, capture, pan, gesture. The accepted Chromium pointerover entry (PR #3107) is a different defect. The map ROADMAP (packages/ui/src/modules/map/ROADMAP.md:37) states only "A drag past four pixels swallows the click it ends on", and names no pan without a held button.
- Steps: S1

### B02-C11

- File: `packages/ui/src/modules/map/map-dot.tsx` (dotHitProps)
- Claim: The finger gets the narrowed mouse target, which can be as small as the dot radius (about 11px across), not the 44px target.
- Mechanism:
  - `packages/ui/src/recipes/kata/map.ts:67 fine: 'pointer-fine:[r:var(--map-hit-radius,5.5px)]',`
  - `packages/ui/src/modules/map/map-dot.tsx:408 const fine = target < POINT_HIT_RADIUS`
  - `packages/ui/src/modules/map/map-dot.tsx:424 className: cn(fine ? k.hit.fine : undefined, hit.className),`
  - `packages/ui/src/modules/map/use-map-touch-tap.ts:69 const under = document.elementFromPoint(x, y)`
  - `packages/ui/src/modules/map/use-map-touch-tap.ts:73 const target = targetAt(under)`
- Trigger: A device whose primary pointer is fine but which also has a touchscreen. `pointer-fine:` matches the primary pointer, so every narrowed dot keeps the narrowed CSS radius; a finger double tap resolves its target with `elementFromPoint`, which hit-tests that narrowed circle, so a tap near the dot lands on the region or zone under it.
- Documented intent: map-point.tsx:55-57 "Both narrowings are for a MOUSE only. A coarse pointer keeps the whole 44px target (WCAG 2.5.5). A finger cannot aim at 11px". map-plat.tsx:1072-1075 "Touch keeps the whole 44px target, since `k.hit.fine` narrows at `pointer-fine` only". kata/map.ts:50-51 says CSS is the one form an SVG shape allows, but the double-tap pick is a script path, and `pointer-fine` reads the device's primary pointer, not the pointer of the tap.
- Reach: shipped. apps/places/src/components/places-map/places-map.tsx:338 <MapPoints, on a plat with :318 nameRegions and :330 onRegionClick={onDrill}, so the targets narrow and a missed double tap drills into the region instead of the :346 onClick that selects the places. Search: Searched the six roots for maps whose regions answer or zones stand under dots: apps/places, docs geofence/circle.tsx, geofence/polygon.tsx.
- Severity: medium. On the Places map a finger on a touchscreen laptop can double tap a place dot and drill into the region under it instead, and the reader recovers by going back.
- Overturn: KEPT. The library reads modality from the primary pointer elsewhere too (touch-target.tsx:10 "[--touch-target-floor:1.5rem] pointer-coarse:[--touch-target-floor:2.75rem]"), but no source accepts the hybrid case for the map, and the map's own comments state the opposite outcome (map-plat.tsx:1072-1073 "Touch keeps the whole 44px target, since `k.hit.fine` narrows at `pointer-fine` only"); the sub-24px mouse floor is justified only for a mouse (map-constants.ts:128 "A mouse aims at one pixel"), and on Places the narrowed target sends a finger double tap to onDrill, so medium stands.
- Prior art: NONE; searched the digest for hybrid, coarse, touch target, pointer-fine. The 2026-10-18 surfaced touch-hold entry is a different question.
- Steps: S4

### B02-C14

- File: `packages/ui/src/modules/map/use-map-keyboard.ts` (useMapKeyboard)
- Claim: The zoom steps about the frame center and the cursor's stop leaves the frame. The readout re-anchors at the stop's new position, outside the drawn plot, and the view does not pan to it.
- Mechanism:
  - `packages/ui/src/modules/map/use-map-zoom.ts:709 { x: frame.width / 2, y: frame.height / 2 },`
  - `packages/ui/src/modules/map/use-map-keyboard.ts:374 announce(describeZoom(intl, zoom.stepZoom(zoomKeyFactor(scale))))`
  - `packages/ui/src/modules/map/use-map-keyboard.ts:321-328 useEffect(() => { if (cursorStop === null || drawn === null) return ... anchor(cursorStop, transform)`
  - `packages/ui/src/modules/map/use-map-keyboard.ts:283 anchor(stop, stop === null || zoom === null ? transform : zoom.show(stop.at, MAP_CURSOR_INSET))`
- Trigger: On a zooming map, the cursor stands on a stop away from the frame center and the reader presses `+`. The scale steps about the center, the stop's drawn point can leave the frame, and the re-anchor effect places the readout at that point through `anchor` alone; only a navigation key goes through `show`, which pans.
- Documented intent: use-map-keyboard.ts:152-154 "The cursor takes the view with it: a step onto a stop the zoom put off-frame pans the map to show it. Navigation therefore never points a reader at something the plot does not draw." use-map-keyboard.ts:149-150 states that `+` and `-` step about the frame's center, which covers the scale and not where the readout goes.
- Reach: shipped. packages/ui/src/docs/pages/modules/map/point/zoomable.tsx:30 zoom; apps/places/src/components/places-map/places-map.tsx:314 zoom={{ modifier: false }}. Search: Searched the six roots for zoom on <MapPlat with a readout: docs point/zoomable.tsx, apps/places.
- Severity: medium. On the docs zoom page and the Places map a keyboard reader who zooms with `+` sees the tooltip float outside the map naming a stop the plot no longer draws, and recovers with an arrow key.
- Overturn: KEPT. The comment that routes the zoom key through the re-anchor effect (use-map-keyboard.ts:359-360 "The readout re-anchors through the effect above, which the moved transform trips") makes the re-anchor deliberate but not an off-frame readout, no guard hides a readout whose stop draws outside the frame, the earlier record names this defect as a bug to fix (M2-05), and a known defect is not deliberate, so the verdict and medium stand with known true.
- Prior art: Digest record 2026-10-18, row M2-05 (bug): "`modules/map/use-map-keyboard.ts:241` | the tooltip moves outside the plot box, over the page around the map, and names a stop that the plot no longer draws." (known)
- Steps: S2

### B03-C11

- File: `packages/ui/src/modules/map/map-legend-region.tsx` (MapLegendSlot)
- Claim: The reserved row box is `min-h-4` (16 px), but each legend switch is a `sm` button 32 px high. When the first entry registers, the box grows by at least 16 px, so the map frame resizes or shifts after the first paint.
- Mechanism:
  - packages/ui/src/recipes/kata/map.ts:197-198 - The `row` placements (top / bottom, and every placement stacked below the map's own `@lg` width) hold one item-row of height.
  - `packages/ui/src/recipes/kata/map.ts:207 row: 'min-h-4',`
  - `packages/ui/src/recipes/kata/map.ts:208 panel: ['min-h-4', 'shrink-0', '@lg:w-48'],`
  - packages/ui/src/modules/chart/engine/chart-legend/legend-switch.tsx:15 A switch is a `sm` button, 32 px high, and the entries touch
  - `packages/ui/src/modules/map/map-legend-region.tsx:46 {items.length > 0 && (`
  - `packages/ui/src/modules/map/engine/map-legend/plan.ts:73 if (legend !== undefined) return legend !== false`
  - `packages/ui/src/modules/map/engine/map-legend/plan.ts:75 return categoryCount > 1 || entryCount > 0 || hasOverlayChildren`
  - `packages/ui/src/modules/map/use-map-overlay.ts:535-537 useEffect( () => register({`
- Trigger: As stated, and also through a side placement below the frame's @lg width, which the kata TSDoc counts as a row placement. The box mounts empty at min-h-4 (16 px); the marks register in a passive effect, which the prerender never runs; the first LegendSwitch row is 32 px, so the box grows by at least 16 px and every row past the first adds 32 px more.
- Documented intent: map-legend-region.tsx:35-37 "it owns the space, one row of height ... so the frame holds steady while overlay entries load in." packages/ui/src/__tests__/modules/map-plat.test.tsx:253 "Row placements reserve one item-row of height instead." CONVENTIONS.md:90 (§3.13) "The first paint is the final layout." and "A value that the server cannot know gets a placeholder of the same size." min-h-4 holds half of one row.
- Reach: shipped. packages/ui/src/docs/pages/modules/map/point/basic.tsx:20 legend="right" (with MapPoint children at :23); packages/ui/src/docs/pages/modules/map/point/clustering.tsx:61 legend="right"; packages/ui/src/docs/pages/modules/map/route/basic.tsx:25 legend="right"; packages/ui/src/docs/pages/modules/map/data.ts:11-12 "The atlas is a file in the package, so the map draws with no request, also in the prerender.". Search: apps and packages/ui/src/docs for legend= on MapPlat. No root uses the default bottom or top placement with overlay children (apps/places sets legend={false} at places-map.tsx:301); every docs map page with marks sets legend="right", which stacks under the plot below the frame's @lg width, a phone-width demo. The docs app prerenders (packages/ui/src/docs/app/entry.server.tsx:1 import { prerender } from 'react-dom/static') and hydrates (packages/ui/src/docs/app/entry.client.tsx:2 import { hydrateRoot } from 'react-dom/client').
- Severity: medium. On the prerendered docs map pages at phone width, the legend box grows after hydration and pushes the content under the map down, a layout shift the reader meets in normal use and recovers from.
- Overturn: KEPT. No source accepts a 16 px reserve against a 32 px entry: the test that pins `min-h-4` names it "one item-row of height" (map-plat.test.tsx:253), which the switch height (legend-switch.tsx:15 "A switch is a `sm` button, 32 px high") contradicts, the registration runs in a passive effect (use-map-overlay.ts:535) that a prerender never runs, and the docs app prerenders the map (data.ts:12 "also in the prerender") and hydrates it, so the post-paint growth that §3.13 forbids reaches the shipped docs pages and medium stands.
- Prior art: NONE (digest searched for legend box, min-h, reserved row, first paint).
- Steps: S3

### B01-C01

- File: `packages/ui/src/recipes/kata/map.ts` (k.legend)
- Claim: The reserved legend box is 1rem tall, but one legend entry is a size `sm` Button that is much taller. When the first overlay registers after hydration, the box grows, so the frame grows and the content under the map moves.
- Mechanism:
  - packages/ui/src/recipes/kata/map.ts:194-198 The legend's reserved box, mounted before any button registers so the frame never shifts as entries land: - The `row` placements (top / bottom, and every placement stacked below the map's own `@lg` width) hold one item-row of height.
  - `packages/ui/src/recipes/kata/map.ts:207 row: 'min-h-4',`
  - `packages/ui/src/recipes/kata/map.ts:208 panel: ['min-h-4', 'shrink-0', '@lg:w-48'],`
  - `packages/ui/src/modules/map/map-legend-region.tsx:45-46 <div data-slot="map-legend-box" className={aside ? LEGEND_BOX_PANEL : LEGEND_BOX_ROW}> {items.length > 0 && (`
  - `packages/ui/src/modules/chart/engine/chart-legend/legend-switch.tsx:94-97 <Button type="button" ref={switchRef} size="sm"`
  - `packages/ui/src/recipes/kiso/kokkaku/button.ts:4 The heights match the labeled button: 26, 32, 38, 44, and 50px.`
  - `packages/ui/src/modules/map/use-map-overlay.ts:535-537 useEffect( () => register({`
- Trigger: A MapPlat whose legend box holds no category entry at first paint and gets overlay entries after hydration: a row placement, or a `left`/`right` panel stacked under the plot below the frame's @lg width. The box paints at 1rem (min-h-4); the first overlay registers from an effect, the size `sm` Button (32px labeled) mounts, and the box and the frame grow, moving the content under the map.
- Documented intent: kata/map.ts:194-198 promises that the box holds one item-row so the frame never shifts; engine/map-region/data.ts:22-24 "The legend's box mounts ahead of them, so late-landing buttons never resize the map or shift the frame."; CONVENTIONS.md §3.13 "The first paint is the final layout." The test map-plat.test.tsx:256 pins only the class string 'min-h-4', not a height that matches an entry.
- Reach: shipped. packages/ui/src/docs/pages/modules/map/point/basic.tsx:20 legend="right" (with :23 <MapPoint children, which register after hydration; stacked under the plot below @lg); packages/ui/src/docs/pages/modules/map/route/basic.tsx:25 legend="right" (with :28 <RoutedLine children that mount MapRoute). Search: Searched apps/admin, apps/places, apps/picks, packages/ui/src/docs/pages, packages/ui/src/modules, packages/ui/src/layouts for <MapPlat and legend=. Every docs map page with overlay children passes legend="right" (stacked below @lg); apps/places passes legend={false} (places-map.tsx:301); ChoroplethChart takes no children.
- Severity: low. On shipped docs map pages in a frame under 32rem, the content under the map moves once after hydration, and the layout is final after that shift, so the defect heals itself.
- Prior art: NONE; searched the digest for legend, min-h, reserve, shift, first paint.
- Steps: S3

### B01-C02

- File: `packages/ui/src/modules/map/map-plat.tsx` (MapPlat)
- Claim: The legend box is reserved and stays empty for as long as the map shows. A row placement leaves an empty band under the plot. A `left` or `right` placement at @lg takes a 12rem rail beside the plot and narrows the map for no legend.
- Mechanism:
  - `packages/ui/src/modules/map/map-plat.tsx:1383 hasOverlayChildren: children != null,`
  - `packages/ui/src/modules/map/engine/map-legend/plan.ts:73-75 if (legend !== undefined) return legend !== false ... return categoryCount > 1 || entryCount > 0 || hasOverlayChildren`
  - `packages/ui/src/modules/map/map-legend-region.tsx:42-46 if (!show) return null ... <div data-slot="map-legend-box" ...> {items.length > 0 && (`
- Trigger: Children that React renders as nothing: `{selected && <MapPoint />}` with `selected` false (children is `false`) or `{points.map(...)}` over an empty array (children is `[]`), with no `legend` prop and fewer than two categories. `false != null` and `[] != null` are both true, so the box mounts and stays empty. The `left`/`right` rail case needs the numeric branch's default `right` placement with fewer than two bins, which only a one-stop colorRange gives.
- Documented intent: engine/map-region/data.ts:13-14 "Defaults to on when there are two or more categories or any registered overlay". The test map-plat.test.tsx:226-227 "A child that never registers stands in for overlays whose entries land late: the box must hold the space before any button exists." pins the box for a rendered element child, not for `false` or `[]`, which are not children at all.
- Reach: none. no site. Search: Searched the six roots for <MapPlat with conditional or mapped children and no legend prop. Every docs map page with children passes legend="right"; apps/places passes legend={false}; ChoroplethChart passes no children (choropleth-chart.tsx:324).
- Severity: low. No consumer root builds a plat whose only children render nothing with the legend left to its default, so no shipped surface shows the empty band.
- Prior art: NONE; searched the digest for legend box, children, empty.
- Steps: S14

### B01-C03

- File: `packages/ui/src/modules/map/map-plat.tsx` (MapPlat)
- Claim: The map renders no data table, so no row carries `aria-current`. The selection is in the pixel ring alone, and a screen reader cannot find which region is picked.
- Mechanism:
  - `packages/ui/src/modules/map/map-plat.tsx:1284 const hasReadout = regionsRead || entries.length > 0 || nameRegions`
  - `packages/ui/src/modules/map/map-plat.tsx:1466 hasReadout ? (`
  - `packages/ui/src/modules/map/map-table.tsx:61 <th scope="row" aria-current={ariaAttr(current)}>`
- Trigger: A plain region picker: `onRegionClick` and `selectedRegion="06"`, no `data`, no `nameRegions`, no overlay children. `regionsRead` is false, so `hasReadout` is false, the table never mounts, and no row carries `aria-current`.
- Documented intent: map-plat.tsx:400-401 "The region's row in the data table reads as the current one, so the selection is in the accessible readout, not the pixels alone." The test map-plat-keyboard.test.tsx:337-340 "The names reach the announcement only: no tooltip and no table." pins no table for a picker with no selection; it says nothing of a held selection, so it does not make the pixel-only selection deliberate.
- Reach: none. no site. Search: Searched the six roots for selectedRegion. select-a-state.tsx:57 and drill-into-counties.tsx:85 both pass data (rows match), so the table mounts there.
- Severity: low. No consumer root holds a region selection on a map with no rows, so no shipped surface leaves the pick out of the readout.
- Prior art: NONE; searched the digest for selectedRegion, aria-current, table.
- Steps: S10

### B01-C04

- File: `packages/ui/src/modules/map/map-plat.tsx` (MapPlat)
- Claim: The cursor moves onto each region, but each step announces nothing, because the region names resolve to an empty array.
- Mechanism:
  - `packages/ui/src/modules/map/map-plat.tsx:826 nameRegions || onRegionClick !== undefined,`
  - `packages/ui/src/modules/map/use-map-region-readout.ts:104 const named = data !== undefined || nameAll`
  - `packages/ui/src/modules/map/map-plat.tsx:1034 regionsRead || preloads || nameRegions,`
  - `packages/ui/src/modules/map/map-plat.tsx:688 answers: earned || click !== undefined || contextMenu !== undefined,`
  - `packages/ui/src/modules/map/map-plat.tsx:1236 regions.answers ? cachedRegionCentroids(shape.features) : NO_CENTROIDS,`
  - `packages/ui/src/modules/map/map-plat.tsx:1331 readable ? describeMapTarget(target, tooltipProps) : nameMapTarget(target, tooltipProps),`
  - `packages/ui/src/modules/map/map-tooltip.tsx:239 if (target.kind === 'region') return regionNames[target.index] || null`
- Trigger: A zooming map with no `data`, no `nameRegions`, no `onRegionClick`, and `onRegionPreload` or `onRegionContextMenu`. The handler makes the layer answer, so every region is a cursor stop; the zoom earns the tab stop; `readable` is false, so the cursor speaks `nameMapTarget`, but the names were never resolved (`named` is false) and each arrow onto a region announces nothing.
- Documented intent: map-plat.tsx:182-184 "A pick or a zoom still earns one, because each is an output of its own. On that stop, with the readout off, each arrow key speaks the name of the stop alone."
- Reach: none. no site. Search: Searched the six roots for onRegionPreload, onRegionContextMenu, zoom. drill-into-counties.tsx:99 pairs preload with data and no zoom; places-map.tsx:333 pairs preload with data rows and nameRegions (:318).
- Severity: low. No consumer root builds a zooming map whose regions answer only through a preload or a menu, so no shipped cursor roves in silence.
- Prior art: Digest record 2026-10-26, M2-C07 (open, NARROWED, low, none): its claim named "A zooming map with onRegionPreload and no data likewise arrows over silent regions", but the confirmed part is the picker with an overlay and the dropped part is the readout map's intended silence. This half was neither confirmed nor ruled out there.
- Steps: S11

### B01-C05

- File: `packages/ui/src/modules/map/map-plat.tsx` (MapPlat)
- Claim: `onRegionPreload` fires again for the region that was already warmed.
- Mechanism:
  - `packages/ui/src/modules/map/map-plat.tsx:801-803 const regionIds = useMemo( () => shape.features.map(regionId ?? defaultRegionId), [shape.features, regionId],`
  - `packages/ui/src/modules/map/map-plat.tsx:897 const preloadRegion = useMemo(() => {`
  - `packages/ui/src/modules/map/map-plat.tsx:900 const warmed = new Set<number>()`
  - `packages/ui/src/modules/map/map-plat.tsx:909 }, [preloads, regionIds, reportPreload])`
- Trigger: An inline `regionId` with `onRegionPreload`. Each plat render (a legend point or leave, an overlay registration, a resize commit) mints a new `regionId`, which rebuilds `regionIds` and the latch with an empty `warmed` set, so resting again on a warmed region reports it again.
- Documented intent: map-plat.tsx:360-361 "It is latched per region for as long as the geography stands, so sweeping back over a warmed region reports nothing." The `regionId` TSDoc (map-plat.tsx:109-113) asks for no stable identity.
- Reach: none. no site. Search: Searched the six roots for onRegionPreload with regionId. drill-into-counties.tsx:97 regionId={stateName} and places-map.tsx:290 regionId={regionName} are module-level functions.
- Severity: low. No consumer root pairs an inline regionId with a preload, so no shipped surface warms a region twice.
- Prior art: Digest record 2026-10-26, M2-C08 (open, CONFIRMED, low, none): "onRegionPreload fires again for region A. Each plat render rebuilds regionIds from the new regionId identity, which rebuilds the latch with an empty warmed set". Also record 2026-10-18 row M2-08. (known)
- Steps: S12

### B01-C06

- File: `packages/ui/src/modules/map/map-plat.tsx` (MapPlat)
- Claim: The focused plot loses its `tabIndex` and its key handler while the atlas loads, so focus leaves the plot (to the body) and the keys stop working. When the atlas lands the plot takes a tab stop again, but focus does not come back to it.
- Mechanism:
  - `packages/ui/src/modules/map/use-map-shape.ts:210 viewWidth: measured ? frameWidth : (canonical?.width ?? 0),`
  - `packages/ui/src/modules/map/map-plat.tsx:1359 const navigable = (readable || pickable || zoomable) && shape.viewWidth > 0`
  - `packages/ui/src/modules/map/use-map-keyboard.ts:401 return enabled ? { tabIndex: 0, onKeyDown, onBlur } : null`
  - `packages/ui/src/modules/map/map-frame.tsx:220 {...keyboard}`
- Trigger: A focused plot whose `geography` goes to `null` or `undefined` (a drill handler that passes no atlas while it fetches the next one). The canonical fit is null, `viewWidth` is 0, `navigable` is false, and the hook returns null, so the focused element loses `tabIndex` and its key handler; focus falls to the body and does not come back when the atlas lands.
- Documented intent: map-plat.tsx:93-96 "Optional so a lazily fetched atlas passes straight through. `null` or omitted reserves the frame and paints nothing." map-frame.tsx:112-115 states the plot keeps focus across a drill ("a plot that holds focus keeps it"). The ARIA Authoring Practices keyboard guidance (an intent source the caller named) requires that focus not fall to the body when the focused element stops being focusable. The test 'takes no tab stop before the geography lands' (map-plat-keyboard.test.tsx:407-415) covers the first load only, with no focus held.
- Reach: none. no site. Search: Searched the six roots for geography={. Every site passes a defined geography; drill-into-counties.tsx:79 geography={counties ?? frame} holds the state frame while the counties load.
- Severity: low. No consumer root passes an empty geography to a mounted plot, so no shipped surface drops keyboard focus this way.
- Prior art: NONE; searched the digest for focus, tabIndex, geography null.
- Steps: S9

### B01-C08

- File: `packages/ui/src/modules/map/use-map-zoom.ts` (useMapZoom)
- Claim: The readout stays held after the fingers lift: the tooltip, the pointed emphasis, and the keyboard readout never show again on that map until zoom is on again and a new gesture ends.
- Mechanism:
  - `packages/ui/src/modules/map/use-map-zoom.ts:611-615 if (pointers.current.size > 1) { hold(event) ... holdReadout(true)`
  - `packages/ui/src/modules/map/use-map-zoom.ts:734 if (settings === null) return null`
  - `packages/ui/src/modules/map/map-frame.tsx:202 onPointerUp: composeEventHandlers(touch.onPointerUp, surface?.onPointerUp ?? noop),`
  - `packages/ui/src/modules/map/use-map-zoom.ts:290-294 if (pointers.current.size > 0 || wheelSettle.pending()) return ... holdReadout(false)`
  - `packages/ui/src/modules/map/map-hover-provider.tsx:102 if (held.current && target !== null) return`
- Trigger: The `zoom` prop turns off (`false`, or a ceiling at or under the fit, which `mapZoomSettings` reads as null) while two pointers hold a pinch on a `{ modifier: false }` map. The hook returns null, the surface handlers leave the plot, and the lifts never run `release`, so `settleGesture` never calls `holdReadout(false)`. The hover provider then refuses every non-null target: no tooltip, no pointed emphasis, no keyboard readout.
- Documented intent: context.ts MapHoverActions.hold "Holds the readout through a pinch or a wheel zoom, or lets it go."; map-plat.tsx:239 "Nothing on the map answers the pointer for the length of a gesture." A wheel heals (its settle timer still fires); a pointer pinch does not.
- Reach: none. no site. Search: Searched the six roots for zoom=. places-map.tsx:314 and point/zoomable.tsx:30 hold a constant zoom; the docs playground can toggle zoom only through a control, which a two-finger pinch on the plot cannot press at the same time.
- Severity: low. No consumer root turns zoom off during a pinch, so no shipped map holds its readout this way.
- Prior art: NONE; searched the digest for hold, pinch, readout held.
- Steps: S13

### B01-C09

- File: `packages/ui/src/modules/map/map-table.tsx` (MapTableProps.header)
- Claim: The value column header reads the localized "Detail", not the `categoryKey` field name that the TSDoc of `header` states.
- Mechanism:
  - packages/ui/src/modules/map/map-table.tsx:14 /** The value column's header: the `categoryKey` field name, or a generic fallback. */
  - `packages/ui/src/modules/map/map-plat.tsx:580-582 /** The data table's value-column header: the name of the colored field, else the localized "Detail". A data key is never a header. @internal */ ... return colorName ?? intl.formatMessage(mapMessages.detail)`
  - `packages/ui/src/modules/map/map-plat.tsx:1468 header={valueColumnHeader(intl, colorName)}`
- Trigger: A categorical map with `categoryKey` and no `colorName`: the header reads the localized "Detail", while the internal `MapTableProps.header` TSDoc says the `categoryKey` field name.
- Documented intent: The behavior is deliberate: map-plat.tsx:580 "A data key is never a header." and engine/map-region/data.ts:74 colorName "@defaultValue The localized \"Detail\"." Only the `MapTableProps.header` TSDoc sentence is stale.
- Reach: shipped. packages/ui/src/docs/pages/modules/map/county/drill-into-counties.tsx:83 categoryKey="state" (no colorName). Search: Searched the six roots for categoryKey without colorName.
- Severity: low. The shipped county map shows the intended "Detail" header, so the stale internal TSDoc has no visible result.
- Prior art: NONE; searched the digest for header, colorName, Detail.
- Steps: S15

### B01-C11

- File: `packages/ui/src/modules/map/use-map-coverage.ts` (useMapCoverage)
- Claim: A comment records a measured time ("tens of milliseconds inside the consumer's render"), which the conventions forbid because it goes stale.
- Mechanism:
  - `packages/ui/src/modules/map/use-map-coverage.ts:174-176 otherwise decode and rewind a whole county atlas (tens of milliseconds inside the consumer's render) for a result the frame below discards.`
- Trigger: The comment states a measured time, which changes with the machine and the code.
- Documented intent: CONVENTIONS.md §12.6 "A comment gives the reason for the code. It does not record a measured time, such as the time that a build, a test, or a render took."
- Reach: none. no site. Search: A comment has no consumer; no root runs it.
- Severity: low. A comment has no reach and no user cost; it only goes stale.
- Prior art: NONE; searched the digest for measured, milliseconds, §12.6.
- Steps: S35

### B01-C12

- File: `packages/ui/src/recipes/kata/map.ts` (k.group)
- Claim: The TSDoc records a measured time ("priced a legend focus at hundreds of milliseconds of per-frame compositing"), which the conventions forbid because it goes stale.
- Mechanism:
  - `packages/ui/src/recipes/kata/map.ts:186-188 Thousands of simultaneous opacity transitions priced a legend focus at hundreds of milliseconds of per-frame compositing.`
- Trigger: The TSDoc states a measured time, which changes with the machine and the code.
- Documented intent: CONVENTIONS.md §12.6 "A comment gives the reason for the code. It does not record a measured time, such as the time that a build, a test, or a render took."
- Reach: none. no site. Search: A TSDoc sentence has no consumer; no root runs it.
- Severity: low. A TSDoc sentence has no reach and no user cost; it only goes stale.
- Prior art: NONE; searched the digest for measured, milliseconds, §12.6.
- Steps: S35

### B02-C01

- File: `packages/ui/src/modules/map/map-dot.tsx` (MapDot)
- Claim: The visible dot path is the topmost pointer target there. It carries no data-entry-id, so no readout shows, a click picks nothing, a double tap picks nothing, and the zone or region under the dot cannot be pointed at through it. The reader sees a painted dot that does not answer.
- Mechanism:
  - `packages/ui/src/modules/map/map-dot.tsx:130-136 const shared = { 'data-slot': slot, fill: 'none', strokeLinecap: ..., strokeLinejoin: 'round' as const, className, }`
  - `packages/ui/src/modules/map/map-dot.tsx:138 if (!pops) return <path {...shared} {...full} />`
  - `packages/ui/src/modules/map/map-dot.tsx:243 pointerEvents: 'none' as const, (MapDotRing)`
  - `packages/ui/src/modules/map/map-dot.tsx:334 pointerEvents: 'none' as const, (MapDotCount)`
  - `packages/ui/src/modules/map/use-map-overlay.ts:632 'data-entry-id': id, (only on the hit shape)`
  - `packages/ui/src/modules/map/engine/map-hover/anchor.ts:50 const anchor = node.closest('[data-entry-id]')`
- Trigger: A mouse points at a part of a drawn dot that its hit circle does not cover: the corners of a square dot whose fine target sits at the floor (B02-C02, B02-C03), or the sliver of a MapPoint dot past the bisector clip of an overlapping neighbor that drew earlier. The visible path takes no `pointer-events: none`, so it is the topmost target there; neither it nor its `<g>` carries `data-entry-id`, and it has no handlers, so it reads nothing, picks nothing, and blocks the zone or region under it.
- Documented intent: map-geofence.tsx:213-215 "Off the pointer, as every other drawn shape in the module is (`MapDotCount`, the halo, the lit region copies): the hit shape below is this mark's sole target". map-halo.tsx:27 and map-dot.tsx:243, :334 keep that rule; MapDot does not.
- Reach: shipped. apps/places/src/components/places-map/places-map.tsx:341 shape={RECORD_KIND_META.trips.shape} (square per apps/places/src/constants.ts:49), with :318 nameRegions and :330 onRegionClick, so the region layer answers and narrows the targets. Search: Searched the six roots for shape="square" and square point shapes, and for MapPoint pairs within 11px. The clip-sliver half has no root (no two MapPoints on one plat closer than a dot).
- Severity: low. On the Places map a mouse meets a dead band about 1.4px wide at the corners of a square trip dot, and the rest of the dot answers, so the user recovers by moving the pointer a pixel.
- Prior art: NONE; searched the digest for pointer-events, dot path, dead rim.
- Steps: S6

### B02-C02

- File: `packages/ui/src/modules/map/map-point.tsx` (MapPoint)
- Claim: The fine target is a circle of the dot's radius, which is the inscribed circle of the square. The rounded corners of the drawn square lie outside the target and do not answer the pointer.
- Mechanism:
  - `packages/ui/src/modules/map/map-point.tsx:137 : markTargets([{ at: position, radius: POINT_RADIUS }], unitsPerPixel, spare)[0],`
  - `packages/ui/src/modules/map/engine/map-cluster/crowd.ts:241 return clamp(Math.min(near, spare(at)), radius, Math.max(radius, POINT_HIT_RADIUS))`
  - `packages/ui/src/modules/map/engine/map-geometry/mark.ts:505 export const SQUARE_DOT_CORNER = 0.2`
  - `packages/ui/src/modules/map/engine/map-geometry/mark.ts:519-521 const strokeWidth = width * SQUARE_DOT_CORNER * 2 ... const half = (width - strokeWidth) / 2`
- Trigger: A square MapPoint whose fine target falls to the floor (a small zone, an answering region, or a neighbor). The floor is the circle radius r; the square's rounded corners reach 0.6r·√2 + 0.4r ≈ 1.25r from the center, so the corners lie outside the target.
- Documented intent: crowd.ts:190-191 "A target narrower than its own dot would leave the dot a dead rim."; kata/map.ts:64-65 "It is the floor a budget can never take a target under: the radius a dot of the default size draws at." The floor is stated for a circle and applied to a square.
- Reach: none. no site. Search: Searched the six roots for <MapPoint with shape=. No root draws a square MapPoint (point/basic.tsx and geofence/circle.tsx draw circles).
- Severity: low. No consumer root draws a square MapPoint, so no shipped dot has dead corners from this mark.
- Prior art: NONE; searched the digest for square, corner, floor.
- Steps: S5

### B02-C03

- File: `packages/ui/src/modules/map/map-points.tsx` (MapPoints)
- Claim: The fine target narrows to the inscribed circle of the square, so the drawn corners are outside the target and do not answer.
- Mechanism:
  - `packages/ui/src/modules/map/map-points.tsx:811 groups.map((group, index) => ({ at: group.at, radius: radii[index] ?? POINT_RADIUS })),`
  - `packages/ui/src/modules/map/map-points.tsx:166 shape={shapes[index]}`
  - `packages/ui/src/modules/map/engine/map-cluster/crowd.ts:239 if (near <= radius) return radius`
  - `packages/ui/src/modules/map/engine/map-cluster/crowd.ts:241 return clamp(Math.min(near, spare(at)), radius, Math.max(radius, POINT_HIT_RADIUS))`
  - `packages/ui/src/modules/map/engine/map-geometry/mark.ts:519-521 const strokeWidth = width * SQUARE_DOT_CORNER * 2 ... const half = (width - strokeWidth) / 2`
- Trigger: A MapPoints square dot (mark shape or point shape) whose fine target falls to the floor through a neighbor, a zone, or an answering region. The target is the inscribed circle; the corners, at about 1.25r, do not answer.
- Documented intent: map-points.tsx:548-549 "The narrowing never goes past the dot it draws, and a dot standing clear of all three keeps the full target."; crowd.ts:190-191 "A target narrower than its own dot would leave the dot a dead rim."
- Reach: shipped. apps/places/src/components/places-map/places-map.tsx:341 shape={RECORD_KIND_META.trips.shape} (square), with :318 nameRegions and :330 onRegionClick, so the region share narrows the targets toward the floor on small regions. Search: Searched the six roots for MapPoints with shape="square" or a square point shape: apps/places (trips), docs point/shapes.tsx:21 (depots, on a map whose regions do not answer).
- Severity: low. On the Places map a mouse meets a dead band about 1.4px wide at the corners of a square trip dot at the floor, and the rest of the dot answers.
- Prior art: NONE; searched the digest for square, corner, floor.
- Steps: S5

### B02-C04

- File: `packages/ui/src/modules/map/map-marker.tsx` (MapMarker)
- Claim: The pin keeps its whole circle (no clip, and on a fine pointer no narrowing against the other mark), so it covers the other dot's half of the contested ground. Pointing at the MapPoint's own side of the bisector raises the marker's readout and a click picks the marker.
- Mechanism:
  - `packages/ui/src/modules/map/map-marker.tsx:114-125 const [startTarget, endTarget] = useMemo( () => markTargets( [ { at: from, radius: PIN_RADIUS }, { at: to, radius: PIN_RADIUS }, ], unitsPerPixel, spare, ), [from, to, unitsPerPixel, spare],`
  - `packages/ui/src/modules/map/map-marker.tsx:72 const dots = useCallback(() => pins, [pins])`
  - `packages/ui/src/modules/map/map-point.tsx:116-119 const ground = useMemo( () => position === null ? null : ownGround(position, neighbors(), POINT_HIT_RADIUS * unitsPerPixel),`
- Trigger: A MapMarker pin within the 44px reach of a MapPoint dot (or a non-coincident pin of another MapMarker), with the marker drawn after it. The marker stakes its pins in the pool but never reads `neighbors`, so its pin keeps its whole circle over the other mark's side of the bisector.
- Documented intent: context.ts:210-211 "A dot measures its pointer target's ground against them, so two marks standing on top of one another divide it instead of overlapping." Against it, ROADMAP.md:51 "`MapPoint` reads it today; wiring the plural marks to it is open" and crowd.ts:24-29 "Any other pair of separate marks ... each keep the full RADIUS here ... That is the bound this pass accepts." A recorded open item is a known defect, not intent.
- Reach: none. no site. Search: Searched the six roots for <MapMarker beside <MapPoint or another <MapMarker. route/with-markers.tsx:35-41 draws four markers from one hub, whose start pins coincide (routes.ts:4), so no pin has an own side of a bisector; their end pins are far apart. marker/basic.tsx draws one marker.
- Severity: low. No consumer root places a marker pin beside another mark's distinct dot, so no shipped pick is misrouted.
- Prior art: Digest record 2026-10-26, M2-C06 (open, CONFIRMED, low, none): "The MapPoint clips its target to its half of the ground, but the pin's hit circle stays whole and covers the point's dot." Record 2026-10-18 surfaced "marker pins. MapMarker's own pins never divide ground against the pool". (known)
- Steps: S20

### B02-C05

- File: `packages/ui/src/modules/map/map-points.tsx` (MapPoints)
- Claim: The MapPoints dot keeps its full target over the other mark's half of the contested ground, so pointing at the other dot's own side reads and picks the MapPoints dot.
- Mechanism:
  - `packages/ui/src/modules/map/map-points.tsx:769 const { slot, hidden, spare, animate, dim, onPointerLeave, hit } = useMapOverlay({`
  - `packages/ui/src/modules/map/map-points.tsx:807-815 const targets = useMemo(() => { const room = grouping.room() return markTargets( ... spare, groups.map((group) => room[group.mark] ?? Number.POSITIVE_INFINITY),`
- Trigger: A MapPoints dot within reach of a MapPoint dot, a MapMarker pin, or a dot of a `cluster={false}` MapPoints, with the MapPoints drawn after it. The set never reads the pool and its room covers only the shared pass, so its dot keeps its full target over the other mark's half.
- Documented intent: context.ts:210-211 "A dot measures its pointer target's ground against them, so two marks standing on top of one another divide it instead of overlapping." ROADMAP.md:51 records the plural-mark wiring as open.
- Reach: none. no site. Search: Searched the six roots for <MapPoints beside <MapPoint, <MapMarker, or cluster={false}. apps/places draws one MapPoints; docs point/shapes.tsx draws two clustering sets (the shared pass divides them); geofence/polygon.tsx draws one set.
- Severity: low. No consumer root draws a MapPoints set after a non-pooled dot within reach, so no shipped pick is misrouted.
- Prior art: Digest record 2026-10-26, M2-C05 (open, CONFIRMED, low, none): "the MapPoints dot keeps its whole circle (the crowding pass reads only its own groups), so the MapPoints target covers the MapPoint's dot"; surfaced entry on crowd.ts header. (known)
- Steps: none

### B02-C06

- File: `packages/ui/src/modules/map/use-map-overlay.ts` (useMapOverlay)
- Claim: The dot targets keep the reach that the old zone allowed: the dot stays narrowed after the zone grows, or keeps the full target after the zone shrinks around it, until something else changes the scale, the position, or the ledger.
- Mechanism:
  - `packages/ui/src/modules/map/map-geofence.tsx:178 const budget = useMemo(() => zoneBudget(rings, unitsPerPixel), [rings, unitsPerPixel])`
  - `packages/ui/src/modules/map/map-geofence.tsx:198 spare: (position) => zoneSpare(budget, position),`
  - `packages/ui/src/modules/map/use-map-overlay.ts:473-479 const spareAt = useCallback( ... (at: MapPoint2D) => live.current.ownSpare?.(at) ?? Number.POSITIVE_INFINITY, [],`
  - `packages/ui/src/modules/map/use-map-overlay.ts:521 const budget = ownSpare === undefined ? undefined : spareAt`
  - `packages/ui/src/modules/map/map-plat.tsx:1090 [entries, hidden, regionRoom],`
  - `packages/ui/src/modules/map/map-point.tsx:138 [position, unitsPerPixel, spare],`
- Trigger: A MapGeofence changes its ground in place (radius, boundary, or area) with no refit, zoom, or legend change, while a dot stands on it. The registered resolver is stable, the ledger does not change, the plat's `spare` keeps its identity, and each dot's target memo holds, so no later render re-measures.
- Documented intent: context.ts:204-205 "A zone whose ground changes without a refit therefore moves the targets under it on the next render of the marks."
- Reach: none. no site. Search: Searched the six roots for MapGeofence and useMapCoverage. geofence/circle.tsx:13-27 uses constant radii; geofence/polygon.tsx:15 a module-level ring; useMapCoverage has no root consumer.
- Severity: low. No consumer root changes a zone's ground in place, so no shipped dot keeps a stale target.
- Prior art: Digest record 2026-10-26, M2-C03 (open, CONFIRMED, low, none): "The dots keep the hit-target radius they resolved against the old zone." Record 2026-10-18 row M2-07. (known)
- Steps: S19

### B02-C07

- File: `packages/ui/src/modules/map/map-route.tsx` (MapRoute)
- Claim: The cursor stops on the route, announces its readout, and Enter picks it, at a place where the map draws no route.
- Mechanism:
  - `packages/ui/src/modules/map/map-route.tsx:60 const anchor = useCallback(() => lineAnchor(points), [points])`
  - `packages/ui/src/modules/map/engine/map-geometry/mark.ts:131 if (projected.length < 2) return ''`
  - `packages/ui/src/modules/map/map-route.tsx:76 if (slot === undefined || hidden || d === '') return null`
  - `packages/ui/src/modules/map/engine/map-keyboard/stops.ts:77-80 for (const [stop, at] of entry.stopsAt().entries()) { const point = placeStop(at, project) if (point !== null) stops.push(...`
- Trigger: A MapRoute with one stop, or a path where fewer than two points project while its middle point does. `linePath` is empty and the route draws nothing, but `lineAnchor` returns the point, so the cursor stops there, announces the route, and Enter picks it.
- Documented intent: stops.ts:18-19 "The cursor therefore steps geography and overlays as one field, the way the pointer crosses them, and only ever stands where the map draws."; use-map-keyboard.ts:153-154 "Navigation therefore never points a reader at something the plot does not draw."
- Reach: none. no site. Search: Searched the six roots for <MapRoute. route/basic.tsx:15 draws routed multi-point paths.
- Severity: low. No consumer root draws a route that projects fewer than two points, so no shipped cursor stops on an undrawn route.
- Prior art: NONE for the route; the geofence twin is digest M2-C10.
- Steps: S16

### B02-C08

- File: `packages/ui/src/modules/map/map-geofence.tsx` (MapGeofence)
- Claim: The zone draws nothing, but the keyboard cursor stops on it at its center, announces it, and Enter picks it.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-geofence.ts:59 if (!(radius > 0)) return []`
  - `packages/ui/src/modules/map/engine/map-geofence.ts:63 if (degrees >= HALF_SPHERE_DEGREES) return []`
  - `packages/ui/src/modules/map/map-geofence.tsx:183-185 const anchor = useCallback( (): LngLat[] => (lon === undefined || lat === undefined ? areaAnchor(polygons) : [[lon, lat]]),`
  - `packages/ui/src/modules/map/map-geofence.tsx:201 if (slot === undefined || hidden || d === '') return null`
- Trigger: A circle MapGeofence with a radius at or below zero or of half the globe or more, or a boundary where fewer than three points project while its vertex anchor does. The ring is empty and nothing draws, but the anchor returns the center, so the cursor stops there, announces the zone, and Enter picks it.
- Documented intent: MapGeofenceCircle.radius (map-geofence.tsx:27) "A radius at or below zero draws nothing."; stops.ts:18-19 "only ever stands where the map draws."
- Reach: none. no site. Search: Searched the six roots for MapGeofence. geofence/circle.tsx:13-27 passes positive radii; geofence/polygon.tsx:15 a ring of four projecting metros.
- Severity: low. No consumer root passes a degenerate zone, so no shipped cursor stops on an undrawn zone.
- Prior art: Digest record 2026-10-26, M2-C10 (open, CONFIRMED, low, none): "The zone draws nothing, but it still registers a legend entry, a data-table row, and a keyboard stop at its center." (known)
- Steps: S16

### B02-C09

- File: `packages/ui/src/modules/map/map-line.tsx` (MapLineDraw)
- Claim: The draw keeps running on its original tween and delay. It does not complete at once.
- Mechanism:
  - `packages/ui/src/modules/map/map-line.tsx:121 const still = usePrefersReducedMotion()`
  - `packages/ui/src/modules/map/map-line.tsx:124 const drawn = useMotionValue(still ? 1 : 0)`
  - `packages/ui/src/modules/map/map-line.tsx:132-133 animate={{ pathLength: 1 }} transition={still ? k.motion.instant : transition}`
  - `node_modules/.pnpm/framer-motion@14.0.0_react-dom@19.3.0_react@19.3.0/node_modules/framer-motion/dist/framer-motion.dev.js:9075-9077 const valueHasChanged = Array.isArray(next) && Array.isArray(prev) ? !shallowCompare(next, prev) || variantDidChange : next !== prev;`
  - `node_modules/.pnpm/framer-motion@14.0.0_react-dom@19.3.0_react@19.3.0/node_modules/framer-motion/dist/framer-motion.dev.js:9092-9093 else { typeState.protectedKeys[key] = true;`
- Trigger: Reduced motion turns on (the platform setting, or the Motion setting of AppearanceProvider) while a route, a marker leg, or a zone boundary draws in. `still` changes only the `transition` prop; the target `pathLength: 1` is unchanged, so Motion starts no new animation and the in-flight tween runs on with its delay and duration. The initial value of `drawn` is read at mount only.
- Documented intent: map-line.tsx:80-82 "The draw is no transform, so the reduced-motion config of motion does not skip it. Under reduced motion the line mounts whole, and a draw in flight completes at once." The test map-marks-reduced-motion.test.tsx:64-70 covers the mount only.
- Reach: shipped. packages/ui/src/docs/pages/modules/map/route/basic.tsx:24 animate; packages/ui/src/docs/pages/modules/map/geofence/circle.tsx:38 animate. Search: Searched the six roots for animate on <MapPlat with MapRoute, MapMarker, or MapGeofence children: docs route/basic, route/with-markers, marker/basic, geofence/circle.
- Severity: low. On the docs map pages a reader who turns reduced motion on mid-draw sees the line finish its draw, which ends within the draw duration, so the defect heals itself.
- Prior art: NONE; searched the digest for reduced motion, draw, pathLength.
- Steps: S7

### B02-C10

- File: `packages/ui/src/modules/map/map-dot.tsx` (MapDotCount)
- Claim: The summary disc mounts at once at full size, but its count (and the ring of a shared summary, MapDotRing) waits out the stagger delay and fades in. The dot shows blank, with no count, for up to the stagger cap plus the pop duration.
- Mechanism:
  - `packages/ui/src/modules/map/map-dot.tsx:168 const still = usePrefersReducedMotion()`
  - `packages/ui/src/modules/map/map-dot.tsx:187 transition={still ? k.motion.instant : transition}`
  - `packages/ui/src/modules/map/map-dot.tsx:341 <m.text {...shared} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition}>`
  - `packages/ui/src/modules/map/map-dot.tsx:250-253 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={transition} (MapDotRing)`
  - `packages/ui/src/modules/map/engine/map-motion.ts:50 return { ...POINT_POP, delay: Math.min(ordinal * POINT_STAGGER, POINT_STAGGER_MAX) } as const`
  - `packages/ui/src/modules/map/engine/map-motion.ts:32 const POINT_STAGGER_MAX = 0.6`
  - `packages/ui/src/primitives/reduced-motion/reduced-motion.tsx:36 skipped while opacity / fade still plays.`
- Trigger: Under reduced motion, a MapPoints on an animating plat mounts summary dots or shared summaries. The disc takes the instant transition and paints at full size, but the count and the ring fade on the staggered `pointPop` timing, which Motion's reduced-motion config does not skip (it skips transforms only). The summary shows blank for up to 0.6s plus the pop duration.
- Documented intent: map-points.tsx:152 "One timing for the pair: the count fades in with the dot it sits in."; map-points.tsx:331 "One timing for the set: the ring and the count fade in with the disc."; MapDotCountProps.transition (map-dot.tsx:275) "shared with the dot the count sits in."
- Reach: shipped. apps/places/src/components/places-map/places-map.tsx:336 animate (with :338 <MapPoints, cluster on by default). Search: Searched the six roots for animate with MapPoints: apps/places places-map.tsx, docs point/clustering.tsx and point/basic.tsx (MapPoint, no count).
- Severity: low. On the Places map a reduced-motion reader sees summary discs with no count for under a second at mount, after which the count shows, so the defect heals itself.
- Prior art: NONE; searched the digest for reduced motion, count, ring, stagger.
- Steps: S8

### B02-C12

- File: `packages/ui/src/modules/map/engine/map-overlay/readout.ts` (markRows)
- Claim: The value cell of its row in the visually hidden table reads the internal kind identifier (`route`, `point`, `marker`, `geofence`) in English, and a screen reader speaks it.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-overlay/readout.ts:127 detail: readout.detail ?? mark.kind,`
  - `packages/ui/src/modules/map/map-table.tsx:130 () => entries.flatMap((entry) => markRows(entry, intl.formatNumber)),`
- Trigger: A MapRoute, MapPoint, MapMarker, or MapGeofence with no `detail` (or a MapPoints dot with no detail) on a map in a non-English locale. The hidden table's value cell reads the internal kind identifier, which a screen reader speaks in English.
- Documented intent: readout.ts:107-108 documents the fallback to the kind "so the value column is never empty"; CONVENTIONS.md §3.10 "The text that a control shows or speaks, in the language of the reader | `primitives/intl`: a unit defines its messages with `defineMessages` and reads them through `useIntl`". The fallback is deliberate; its untranslated spelling breaks §3.10.
- Reach: none. no site. Search: Searched the six roots for overlay marks without detail. Every docs mark carries a detail (route/basic.tsx:15, marker/basic.tsx:26, geofence/circle.tsx:49 and :53, geofence/polygon.tsx:12 and :29, point/data.ts:44). apps/places can omit a dot's detail (places-map-utilities.ts:21 detail: record.city), but its own strings are English (places-map.tsx:282, :340) and no locale is set there.
- Severity: low. No consumer root renders a detail-less mark in a non-English locale, so no shipped reader hears the English identifier.
- Prior art: Digest record 2026-10-26, surfaced entry: "markRows falls back to mark.kind ('point', 'route', 'geofence', 'marker') as the table value of a mark with no detail. That string is an internal identifier shown to screen-reader users in English, outside the intl message catalog."
- Steps: S18

### B02-C13

- File: `packages/ui/src/modules/map/engine/map-overlay/readout.ts` (markRows)
- Claim: The visually hidden table lists one row for the set, with the set's label and its detail or `point`, although the set draws no dot.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-overlay/readout.ts:119 const count = mark.stopRows?.length ?? 0`
  - `packages/ui/src/modules/map/engine/map-overlay/readout.ts:121 return Array.from({ length: Math.max(count, 1) }, (_, stop) => {`
  - `packages/ui/src/modules/map/engine/map-overlay/readout.ts:52 if (row === undefined) return { name: mark.label, detail: mark.detail }`
- Trigger: A MapPoints with `points={[]}`. Its `stopRows` is an empty array, which `Math.max(count, 1)` treats as a singular mark, so the table lists one row with the set's label and its detail (or the kind), though the set draws no dot.
- Documented intent: readout.ts:103-104 "Every row a mark contributes to the data table: one for a singular mark, one per dot for a plural one." The test map-points.test.tsx:330-336 keeps the empty set's legend row and says nothing of a table row.
- Reach: shipped. apps/places/src/components/places-map/places-map.tsx:344 points={stops} (empty when the filter admits no record), with :343 detail={intl.formatNumber(records.length)}. Search: Searched the six roots for MapPoints whose points can be empty: apps/places (filtered records); docs sets use constant data.
- Severity: low. On the Places map with an empty filter the hidden table holds one extra row that reads the set's name and a count of zero, which misleads no one.
- Prior art: NONE; searched the digest for empty set, markRows, points=[].
- Steps: S17

### B02-C15

- File: `packages/ui/src/modules/map/use-map-keyboard.ts` (useMapKeyboard)
- Claim: The hook returns null, the region loses tabIndex while it holds focus, and focus falls to the document body.
- Mechanism:
  - `packages/ui/src/modules/map/map-plat.tsx:1349 const pickable = regions.click !== undefined || entries.some((entry) => entry.activate)`
  - `packages/ui/src/modules/map/map-plat.tsx:1359 const navigable = (readable || pickable || zoomable) && shape.viewWidth > 0`
  - `packages/ui/src/modules/map/use-map-keyboard.ts:401 return enabled ? { tabIndex: 0, onKeyDown, onBlur } : null`
  - `packages/ui/src/modules/map/use-map-keyboard.ts:298-300 Release what the cursor held once navigation switches off (the readout unmounted, the pick removed), so no stale emphasis lingers`
- Trigger: The plot holds focus on a map whose only output is a pick (readout off, no zoom), and the consumer removes the only `onClick` or `onRegionClick` (for example after a pick). `navigable` turns false, the hook returns null, and the focused element loses `tabIndex`, so focus falls to the body.
- Documented intent: use-map-keyboard.ts:298-300 anticipates "the pick removed" and clears the emphasis but not the focus. The ARIA Authoring Practices keyboard guidance (an intent source the caller named) requires that focus not fall to the body when the focused element stops being focusable.
- Reach: none. no site. Search: Searched the six roots for onRegionClick and overlay onClick that a pick removes. select-a-state.tsx:56, drill-into-counties.tsx:84 and :100, places-map.tsx:330 and :346 hold their handlers for the life of the map.
- Severity: low. No consumer root removes the last pick of a readout-off map while it holds focus, so no shipped surface drops focus this way.
- Prior art: NONE; searched the digest for focus, tabIndex, enabled.
- Steps: S9

### B03-C01

- File: `packages/ui/src/modules/map/engine/map-cluster/group.ts` (seedGroups)
- Claim: The broad phase puts all three dots in the group of the middle dot, so the map draws one summary of 3. The overlap rule alone gives a summary of 2 and a lone dot, in either input order, so the broad phase decides a merge that the rule refuses.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-cluster/group.ts:201 return (POINT_RADIUS * 2 + gap) * unitsPerPixel`
  - `packages/ui/src/modules/map/engine/map-cluster/group.ts:245-247 const nearest = nearestSeed(cells, at, cell, (group) => dotReach(Math.max(gap, group.gap), unitsPerPixel),`
  - `packages/ui/src/modules/map/engine/map-cluster/group.ts:411 if (spread > reach * reach || spread >= best) return false`
  - `packages/ui/src/modules/map/engine/map-cluster/group.ts:456-458 const reach = a.radius + b.radius + Math.max(a.gap, b.gap) ... return squared(a.at, b.at) < reach * reach`
  - `packages/ui/src/modules/map/engine/map-cluster/radius.ts:46 if (grade === undefined) return POINT_RADIUS`
  - `packages/ui/src/modules/map/engine/map-constants.ts:91 export const POINT_RADIUS = 5.5`
  - `packages/ui/src/modules/map/engine/map-constants.ts:184 export const POINT_CLUSTER_GAP = 3`
  - `packages/ui/src/modules/map/engine/map-constants.ts:202 { from: 2, radius: 9 },`
- Trigger: As stated. Dot reach is 5.5*2+3 = 14. The middle dot M seeds; A and B (each 13.9 from M, 27.8 apart) both pass the seed test, so the broad phase returns {M,A,B} and consolidate has one group to keep. The rule alone, in any order: the first pair that overlaps (13.9 < 14) merges to a mark of radius 9 at 6.95 from M; the third dot is then 20.85 from that center against a reach of 9+5.5+3 = 17.5, so it stays a lone dot, and the next round changes nothing. Output: a summary of 3 where the rule gives a summary of 2 and a dot that stands 6.35 px clear.
- Documented intent: group.ts:13-16 "{@link seedGroups} is a broad phase under it. It is a linear pass that can only merge dots the rule would merge anyway. It therefore takes the count down cheaply before the rule runs, and never decides the result on its own." group.ts:212-214 "It also merges strictly less than the overlap rule does, since two dots inside `reach` are two marks inside their own. This pass can only take work off {@link consolidate}, never decide against it." The pairwise argument does not hold for a chain through one seed: A and B never overlap as dots.
- Reach: shipped. packages/ui/src/modules/map/map-points.tsx:566 cluster = true,; apps/places/src/components/places-map/places-map.tsx:338 <MapPoints (no cluster prop, so the default applies); packages/ui/src/docs/pages/modules/map/point/clustering.tsx:64 <MapPoints (no cluster prop). Search: apps, packages/ui/src/docs, packages/ui/src/modules for cluster props and <MapPoints; the shipped default cluster = true groups every MapPoints set.
- Severity: low. On the shipped Places map and the docs clustering demo the over-merge draws a true summary of 3 nearby stops in place of a summary of 2 and a dot 6.35 px clear of it, an output that still keeps the one rule the pass draws by, so the reader meets no wrong count or overlap and only the broad-phase TSDoc sentence breaks.
- Overturn: LOWERED. The mechanism holds and is not deliberate, but the output still obeys the one rule that the header names (group.ts:11-12 "One rule decides the output: no two marks draw within `gap` of one another") and that the test pins (map-cluster.test.ts:174 "leaves no two marks drawing over one another, however the merging chains"), the summary's count names exactly the dots it holds, and the rule's own greedy fold is order-dependent (group.ts:276 "Each round folds every overlapping group into the first it meets"), so no unique picture exists for the over-merge to contradict; what breaks is the TSDoc sentence (group.ts:15-16 "never decides the result on its own"), which is correctness at low.
- Prior art: NONE. Digest searched for group.ts, seedGroups, nearestSeed, broad phase: M1-C10 (2026-10-26) is a tie-order defect in nearestSeed and M1-05 (2026-10-18, group.ts:56) is a different merge-all defect; neither names the chain. The map ROADMAP repeats the claim (packages/ui/src/modules/map/ROADMAP.md:33 "it can only merge what the rule would merge anyway, so it takes the count down cheaply and never decides the result").
- Steps: S21

### B03-C02

- File: `packages/ui/src/modules/map/engine/map-cluster/group.ts` (nearestSeed)
- Claim: The broad phase merges them into one summary, because its reject is `spread > reach * reach`. The overlap rule keeps two marks whose edges are exactly `gap` apart, because its test is `squared < reach * reach`.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-cluster/group.ts:411 if (spread > reach * reach || spread >= best) return false`
  - `packages/ui/src/modules/map/engine/map-cluster/group.ts:458 return squared(a.at, b.at) < reach * reach`
- Trigger: As stated: two dots exactly 14 frame units apart (unitsPerPixel 1, cluster true). The broad phase keeps a spread equal to reach squared and merges; the rule refuses an equal distance. Exact equality in projected frame units needs a constructed input.
- Documented intent: group.ts:11-12 "One rule decides the output: no two marks draw within `gap` of one another ({@link marksOverlap})." map-constants.ts:167 "Two dots merge under `POINT_RADIUS * 2 + this`". Against it, packages/ui/src/__tests__/geometry/map-cluster.test.ts:77-88 puts a chain at exactly DOT_REACH and expects [[0, 1], [2]], so the suite pins the inclusive broad-phase boundary; the test's stated subject is the fixed seed, not the boundary.
- Reach: test-only. packages/ui/src/__tests__/geometry/map-cluster.test.ts:80 [DOT_REACH, 0],. Search: Roots: apps/places records and docs deliveryStops are real coordinates; no root builds an exact float tie at the reach. The test root builds it.
- Severity: low. Only a test builds two dots at exactly the reach, so no shipped map shows the extra merge.
- Prior art: NONE for the boundary. Related, not the same: M1-C10 (open, low, none) is a tie of two seeds in nearestSeed.
- Steps: S21

### B03-C04

- File: `packages/ui/src/modules/map/engine/map-region/value.ts` (resolveValueBins)
- Claim: `valueExtent` returns the explicit domain, so the function returns one bin per stop with labels, a non-null domain, and a working `assign`. The legend lists bins and the range bar paints a scale for a map that has no data.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-region/value.ts:83 const extent = valueExtent(values, binning === 'quantile' ? undefined : domain)`
  - `packages/ui/src/modules/map/engine/map-region/value.ts:85 if (extent === null) return { metas: [], domain: null, assign: () => null }`
  - `packages/ui/src/utilities/color-scale.ts:82 if (explicit) return explicit`
- Trigger: As stated, under linear binning: colorDomain set and no joined row with a finite value (joinedRows drops rows that match no region, use-map-region-readout.ts:157).
- Documented intent: value.ts:62-63 "Empty (with a `null` domain and a no-op `assign`) when no row carries a finite value." The shared scale says the opposite: color-scale.ts:74-76 "the explicit override when given ... `null` when nothing pins or spans a domain, so the caller renders no scale." The heatmap takes the pinned domain with no data the same way (use-heatmap-chart.ts:304). The value.ts sentence is the one the code does not keep.
- Reach: none. no site. Search: apps, packages/ui/src/docs, packages/ui/src/modules for colorDomain: only ChoroplethChart forwards it (choropleth-chart.tsx:346); no root page passes it. packages/ui/src/__benchmarks__/browser/maps.tsx:58 passes it with data (out-of-root).
- Severity: low. No root pins a domain, so no shipped map paints a scale over empty data; the defect is a TSDoc sentence the code does not keep.
- Prior art: Digest, 2026-10-26 record, open row M1-C14 (value.ts, resolveValueBins, CONFIRMED low none): "It returns the full set of bins and the explicit domain, so the legend and range bar draw a scale for a map that has no data". (known)
- Steps: S22

### B03-C09

- File: `packages/ui/src/modules/map/engine/map-zip/selection.ts` (readRule)
- Claim: The tie on `lowest` keeps the input order, so `6-600` reads 60000 to 60099 and `600-6` reads 60000 to 69999. The two orders of one range name different territories.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-zip/selection.ts:113 return term.padEnd(ZIP_LENGTH, '0')`
  - `packages/ui/src/modules/map/engine/map-zip/selection.ts:140 const [low, high] = lowest(first) <= lowest(second) ? [first, second] : [second, first]`
  - `packages/ui/src/modules/map/engine/map-zip/selection.ts:142 return { kind: 'range', from: lowest(low), to: highest(high) }`
- Trigger: As stated. lowest('6') and lowest('600') are both '60000', so the tie keeps input order: '6-600' reads 60000-60099 and '600-6' reads 60000-69999.
- Documented intent: selection.ts:136-139 "Reversed ends still name the span the reader meant, so they are ordered rather than refused: `60640-60601` and `60601-60640` are one territory." Two orders of one range give two territories here.
- Reach: none. no site. Search: apps, packages/ui/src/docs, packages/ui/src/modules, packages/ui/src/layouts for parseZipSelection, zipMatcher, useMapCoverage: no root consumer. packages/ui/src/__tests__/geometry/map-zip.test.ts builds no tied range.
- Severity: low. No root parses a territory, so no shipped surface draws the wrong span.
- Prior art: NONE (digest searched for readRule, selection.ts, range order; M1-C12 concerns the ZIP+4 precedence).
- Steps: S23

### B03-C13

- File: `packages/ui/src/modules/map/map-regions.tsx` (Region)
- Claim: The comments record measured shares of the mount time ("a quarter of the mount", "~a fifth of the choropleth mount"), which change with the machine and with later code.
- Mechanism:
  - `packages/ui/src/modules/map/map-regions.tsx:185 // matching at first style resolution (a quarter of the mount) for an`
  - `packages/ui/src/modules/map/map-regions.tsx:190-191 // an inline style: per-element CSSOM style declarations priced ~a fifth // of the choropleth mount.`
- Trigger: As stated: the two comments keep measured shares of the mount time.
- Documented intent: CONVENTIONS.md:324 (§12.6) "A comment gives the reason for the code. It does not record a measured time ... A measured time changes with the machine and with later code, so a comment that keeps it becomes wrong. Write the reason in words that stay true, such as \"most of the time of the suite\"." A quarter and a fifth are measured proportions of a render time.
- Reach: none. no site. Search: A comment has no runtime consumer.
- Severity: low. A comment text with no user cost and no runtime reach.
- Prior art: NONE (digest searched for map-regions comments, measured).
- Steps: S35

### B04-C01

- File: `packages/ui/src/modules/map/engine/map-geometry/locate.ts` (featureBounds / regionAt / regionsMeeting)
- Claim: geoContains places the position inside the region, because d3-geo joins two vertices with a great-circle arc that bulges poleward of the vertices. The plain min/max box stops at the vertex latitude and rejects the position first, so regionAt returns -1 (or another region) where the exact test answers this region, and regionsMeeting can omit a region whose drawn shape meets the query box.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-geometry/locate.ts:91-93 const [lon, lat] = node as number[] ... if (lon !== undefined && lat !== undefined) extend(box, lon, lat)`
  - `packages/ui/src/modules/map/engine/map-geometry/locate.ts:233 if (!within(index.bounds[region] ?? null, at)) continue`
  - `packages/ui/src/modules/map/engine/map-geometry/locate.ts:237 if (geometry != null && geoContains(geometry, at)) return region`
  - `packages/ui/src/modules/map/engine/map-geometry/locate.ts:273 const meets = (region: number) => overlaps(index.bounds[region] ?? null, box)`
- Trigger: As stated. geoContains tests a spherical polygon whose edges are great-circle arcs. For the edge [-102,40]-[-94,40], the arc's latitude at its middle is atan(tan 40 deg / cos 4 deg), about 40.07 deg, so [-98, 40.05] is inside the shape and outside the vertex box (north 40). regionAt rejects it at the box test.
- Documented intent: locate.ts:7-9 "A box is a conservative test. A position outside it is outside the region for certain"; locate.ts:14 "A prefilter needs a box that is never too small"; locate.ts:250-251 "it can name a region the shape does not touch, and never miss one it does."
- Reach: none. no site. Search: Callers: map-zip/frame.ts:87 and :131 (useMapCoverage, no root consumer) and map-region/spare.ts:408 (regionSpare, shipped via map-plat.tsx:1050). Roots draw us-atlas and world-atlas; no root passes a hand-drawn polygon with long edges. Whether us-atlas holds long edges along a parallel is unverified (see leads).
- Severity: low. No root builds a long-edge polygon, so no shipped placement or hit target misses a region.
- Prior art: NONE for the box. Related: M1-C05 (open, low, shipped) is a too-small reach box in spare.ts, not the feature box.
- Steps: S24

### B04-C02

- File: `packages/ui/src/modules/map/engine/map-geometry/mark.ts` (ringArcs)
- Claim: The large share takes the `M start A ... end` branch with start and end points that round to the same two-decimal coordinates. Per SVG, an arc whose end point equals its start point is omitted, so the ring shows no arc at all for the set that holds almost every dot.
- Mechanism:
  - packages/ui/src/modules/map/engine/map-geometry/mark.ts:551 return `${round(at.x + radius * Math.cos(angle))},${round(at.y + radius * Math.sin(angle))}`
  - packages/ui/src/modules/map/engine/map-geometry/mark.ts:565-567 turn >= 1 ? `M${point(start)}${arc(start + 0.5, false)}${arc(start + 1, false)}` : `M${point(start)}${arc(end, turn > 0.5)}`
  - `packages/ui/src/modules/map/engine/map-geometry/mark.ts:585 return Math.round(value * 100) / 100`
- Trigger: As stated. With shares 30000 and 1 the large turn is 0.999967; at a ring radius near 27 the chord is about 0.006 frame units, under the 0.01 rounding grid, so the start and end strings are often equal and the SVG arc is omitted. The guard handles only turn >= 1.
- Documented intent: mark.ts:536-537 "A share that is the whole ring has no arc of its own, because an arc that starts and ends at one point draws nothing. It is two half arcs instead." The code keeps that rule for an exact whole only.
- Reach: none. no site. Search: ringArcs is called at packages/ui/src/modules/map/map-dot.tsx:231 for a shared summary, which needs two or more clustering sets on one plat. Every root mounts one MapPoints per plat (apps/places places-map.tsx:338, docs point/clustering.tsx:64, point/zoomable.tsx).
- Severity: low. No root mounts two clustering sets, so no shipped shared summary loses its ring.
- Prior art: NONE (digest searched for ringArcs, shared summary ring). The reader's ruling on the two map round helpers concerns their duplication, not this arc.
- Steps: S25

### B04-C03

- File: `packages/ui/src/modules/map/engine/map-geometry/mark.ts` (unprojectPoint)
- Claim: The function returns a lon/lat (the lower-48 conic's inverse, a point in Mexico or the Pacific) instead of `null`, because d3's geoAlbersUsa.invert always delegates to one sub-projection's invert and never answers null.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-geometry/mark.ts:45-47 const inverted = projection?.invert?.([at.x, at.y]) ... if (inverted == null) return null`
  - `packages/ui/src/modules/map/engine/map-projection/resolve.ts:99 if (spec === 'albers-usa') return geoAlbersUsa()`
  - `node_modules/.pnpm/d3-geo@3.1.1/node_modules/d3-geo/src/projection/albersUsa.js:46-48 return (y >= 0.120 && y < 0.234 && x >= -0.425 && x < -0.214 ? alaska : y >= 0.166 && y < 0.234 && x >= -0.214 && x < -0.115 ? hawaii : lower48).invert(coordinates);`
- Trigger: As stated. The composite's invert sends every position outside the Alaska and Hawaii boxes to the lower-48 conic, which answers a finite lon/lat.
- Documented intent: mark.ts:37-40 "or `null` where the fit has none. That is an unfitted projection, a point the composite drops between its insets, or one a projection cannot invert at all." The one caller already knows otherwise: spare.ts:148-149 "`d3-geo`'s `geoAlbersUsa` inverts every position, and so the jump is the only sign of it."
- Reach: shipped. packages/ui/src/modules/map/use-map-shape.ts:222-223 unproject: (at: MapPoint2D) => unprojectPoint(fitted, frame === null ? at : invertTransform(at, frame)),; packages/ui/src/modules/map/map-plat.tsx:1050 ? regionSpare(shape.features, shape.unproject, shape.project). Search: packages/ui/src/modules/map for unproject; apps/places draws albers-usa with answering regions (places-map.tsx:177, :324). regionSpare reads a jump, not a null, so the wrong return has no visible result.
- Severity: low. The shipped caller detects the jump itself, so the TSDoc sentence the code does not keep costs the user nothing.
- Prior art: NONE (digest searched for unprojectPoint, invert).
- Steps: S26

### B04-C04

- File: `packages/ui/src/modules/map/engine/map-geometry/projected.ts` (buildWitness / firstPosition)
- Claim: The witness is null, so frameAffine refuses every fit: emitRegionPaths returns null and carriedTransform returns null for the whole atlas. Every canonical and measured stage falls back to the direct `regionPaths` walk and a refit rewrites every `d`, though the buffer is valid.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-geometry/projected.ts:151-153 const position = rings?.[0]?.[0] ... if (position !== undefined) return position as LngLat`
  - `packages/ui/src/modules/map/engine/map-geometry/projected.ts:173-175 const at = projection(position) ... if (at === null || !Number.isFinite(at[0]) || !Number.isFinite(at[1])) return null`
  - `packages/ui/src/modules/map/engine/map-geometry/projected.ts:212 if (witness === null) return false`
- Trigger: As stated: a collection whose first feature's first vertex does not project, while later features do.
- Documented intent: projected.ts:85-86 "`null` where no feature offered one that projects, which refuses every later fit." projected.ts:161-163 "`null` where nothing projects: an empty geography, or one that falls entirely outside the projection's own frame."
- Reach: none. no site. Search: Roots draw us-atlas states and world-atlas countries (apps/places places-map.tsx:177; docs data.ts:4) and a drilled region under a centered mercator; per the digest probe the first features (Alabama, Fiji) project. Searched the roots for projection= and geography sources.
- Severity: low. The cost is a fallback to the direct walk with no visible change, and no root leads with a dropped feature.
- Prior art: Digest, 2026-10-26 record, open row M1-C07 (projected.ts, firstPosition / buildWitness, CONFIRMED low none). Also 2026-10-18 row M1-07 (projected.ts:169, correctness, "Nothing visible changes."). (known)
- Steps: S27

### B04-C05

- File: `packages/ui/src/modules/map/engine/map-geometry/projected.ts` (probeCanonicalFit)
- Claim: The probe walk runs at precision / PROBE_REFINEMENT, so it resamples the curved edges more finely than the default-precision `geoPath.bounds` pass in fitProjectionWidth. The bounds, and so the canonical height and aspect, differ from what canonicalFit reports for the same geography.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-geometry/projected.ts:388 if (precision !== null) projection.precision(precision / PROBE_REFINEMENT)`
  - `packages/ui/src/modules/map/engine/map-geometry/projected.ts:396 const [x0, y0, x1, y1] = bufferBounds(atlas.points)`
  - `packages/ui/src/modules/map/engine/map-projection/resolve.ts:162 const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(shape)`
- Trigger: As stated: a geography with long edges that d3 resamples. The probe walk refines to a quarter of the tolerance that fitProjectionWidth uses, so the extreme of a curved edge lands farther out and the height differs.
- Documented intent: projected.ts:364-365 "The two passes then cost about as much as the buffer alone did. The frame comes out to the same bit." The qualified forms elsewhere are kept: resolve.ts:139 "The two agree to the last bit on a real atlas" and projected.ts:319-320 "It costs a real atlas nothing, because a quantized topology's own vertices already sit inside the finer tolerance."
- Reach: none. no site. Search: Roots draw quantized us-atlas and world-atlas topologies; no root passes hand-drawn long-edge geography. No runtime reader compares the two fits for one geography (cache.ts:140 uses the probe and falls back only when it declines).
- Severity: low. No root builds long-edge geography and nothing compares the two fits, so only the unqualified TSDoc sentence is wrong.
- Prior art: NONE (digest searched for probeCanonicalFit, PROBE_REFINEMENT).
- Steps: S28

### B04-C06

- File: `packages/ui/src/modules/map/engine/map-projection/resolve.ts` (fitWidthFromProbeBounds)
- Claim: spanY passes the `> 0` guard, but the rounded height is 0, so the function returns 0 instead of null. canonicalFit and probeCanonicalFit then report `aspect: 1000 / 0 = Infinity`, the `'auto'` frame reserves an infinite aspect ratio, and the viewBox height is 0.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-projection/resolve.ts:67 if (spanX <= 0 || spanY <= 0) return null`
  - `packages/ui/src/modules/map/engine/map-projection/resolve.ts:73 return Math.round(spanY * k * REGION_PATH_ROUNDING) / REGION_PATH_ROUNDING`
  - `packages/ui/src/modules/map/engine/map-constants.ts:44 export const REGION_PATH_ROUNDING = 10 ** REGION_PATH_DIGITS`
  - `packages/ui/src/modules/map/engine/map-geometry/projected.ts:408 aspect: MAP_CANONICAL_WIDTH / height,`
- Trigger: As stated: a canonical height under 0.05 units rounds to 0, the guard has already passed, and the aspect becomes Infinity.
- Documented intent: resolve.ts:38-39 "It returns `null` where the bounds collapse on either axis: no geography, or a lone point." A height of 0 on the grid is a collapse the guard misses.
- Reach: none. no site. Search: Roots draw us-atlas states, world-atlas countries, a state frame, and a drilled region; none is a sliver of aspect over 20,000:1.
- Severity: low. No root draws such a sliver, so no shipped frame reserves an infinite ratio.
- Prior art: NONE (digest searched for fitWidthFromProbeBounds, aspect).
- Steps: S29

### B04-C07

- File: `packages/ui/src/modules/map/engine/map-routing/failure.ts` (thrownFailure)
- Claim: fetch rejects with that reason, which carries no `AbortError` name, so the request reads as `{ kind: 'network', retryable: true }` instead of `{ kind: 'aborted', retryable: false }`. A caller that retries on `retryable` sends again the request it just canceled.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-routing/failure.ts:98 return typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : ''`
  - `packages/ui/src/modules/map/engine/map-routing/failure.ts:118 if (name === 'AbortError') return routeFailure('aborted')`
  - `packages/ui/src/modules/map/engine/map-routing/failure.ts:120 return routeFailure(fallback)`
  - `packages/ui/src/modules/map/engine/map-routing/failure.ts:55 const RETRYABLE_KIND: ReadonlySet<MapRouteFailureKind> = new Set(['timeout', 'network'])`
  - `packages/ui/src/modules/map/engine/map-routing/request.ts:76 return { ok: false, failure: thrownFailure(error, 'network') }`
- Trigger: As stated: a caller aborts its own signal with a reason that is not an AbortError DOMException; fetch rejects with that reason.
- Documented intent: failure.ts:16-17 "It is `false` on `'aborted'`, because the caller ended that request itself." failure.ts:102-104 assumes the default reason: "a caller's own controller an `AbortError`". The public signal option admits any reason.
- Reach: none. no site. Search: Only root caller: packages/ui/src/docs/pages/modules/map/use-route.ts:14 fetchOsrmRoute([start, end]) passes no signal. Searched the roots for fetchOsrmRoute, signal, timeoutMs.
- Severity: low. No root passes a signal, so no shipped caller retries a request it canceled.
- Prior art: Digest, 2026-10-26 open row M1-C02 (failure.ts, thrownFailure, CONFIRMED low none); also 2026-10-18 row M1-06 (failure.ts:113, correctness). (known)
- Steps: S31

### B04-C08

- File: `packages/ui/src/modules/map/engine/map-routing/request.ts` (requestSignal)
- Claim: AbortSignal.timeout enforces an unsigned long long range and throws a TypeError. The throw happens inside the async fetchOsrmRoute, so the promise rejects instead of resolving to a MapRouteAnswer.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-routing/request.ts:25 if (timeoutMs === undefined) return signal`
  - `packages/ui/src/modules/map/engine/map-routing/request.ts:27 const timeout = AbortSignal.timeout(timeoutMs)`
  - `packages/ui/src/modules/map/engine/map-routing/osrm.ts:83 return routeFetch(url, { signal: requestSignal(signal, timeoutMs) })`
- Trigger: As stated: Infinity, a negative value, or NaN reaches AbortSignal.timeout, whose argument is an [EnforceRange] unsigned long long, and it throws outside every try, so the async function rejects.
- Documented intent: osrm.ts:54-55 "@returns `{ ok: true, route }` with the leg, or `{ ok: false, failure }` naming what stopped it". The option is typed `timeoutMs?: number` (osrm.ts:44), which admits the values the platform refuses.
- Reach: none. no site. Search: No root passes timeoutMs (use-route.ts:14 passes no options). Searched the roots for timeoutMs.
- Severity: low. No root sets a timeout, so no shipped call rejects.
- Prior art: Digest, 2026-10-26 open row M1-C04 (request.ts, requestSignal, CONFIRMED low none). (known)
- Steps: S32

### B04-C09

- File: `packages/ui/src/modules/map/engine/map-routing/request.ts` (routeFetch)
- Claim: osrm-backend answers every code other than 'Ok' (NoRoute, NoSegment) with HTTP 400. routeFetch returns `{ kind: 'http', status: 400, retryable: false }` before it reads the body, so the 'no-route' kind and its `code` never reach a caller of the OSRM client.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-routing/request.ts:79 if (!response.ok) return { ok: false, failure: httpFailure(response.status) }`
  - packages/ui/src/modules/map/engine/map-routing/result.ts:50-52 A service that cannot join a pair refuses in its own code under a 200. OSRM answers `'NoRoute'` with no `routes` at all.
  - `packages/ui/src/modules/map/engine/map-routing/result.ts:60 if (payload.code !== undefined && payload.code !== 'Ok') return noRouteFailure(payload.code)`
- Trigger: As stated. The traced part: a refusal that arrives with any non-2xx status returns 'http' before the body is read, so 'no-route' comes only from a 200 body. The premise that osrm-backend sends NoRoute and NoSegment under HTTP 400 is external and was not verified in this pass (no source in the repository; this verifier has no network tool). The suite stubs the 200 form only (map-routing.test.ts:176-197).
- Documented intent: osrm.ts:60-61 "`'no-route'` is the service's own answer that no road joins the stops." failure.ts:32-34 "OSRM answers a pair it cannot join with `'NoRoute'`, and a point off the network with `'NoSegment'`."
- Reach: none. no site. Search: Only root caller: packages/ui/src/docs/pages/modules/map/use-route.ts:14, which sends routable US city pairs and treats every failure alike (use-route.ts:39 if (live && answer.ok) setRoute(answer.route)).
- Severity: low. No root sends an unroutable pair and the one caller reads every failure the same way, so the misclassification has no visible result.
- Prior art: Digest, 2026-10-26 open row M1-C01 (request.ts, routeFetch, CONFIRMED low none), whose 400 premise was also unverified. (known)
- Steps: S33

### B04-C10

- File: `packages/ui/src/modules/map/engine/map-constants.ts` (ALBERS_USA_ASPECT)
- Claim: The frame reserves 1.709 before the load and takes the canonical aspect 1000 / 585 = 1.70940 after it, so the frame height changes by about 0.14 px per 1000 px of width when the atlas swaps in.
- Mechanism:
  - `packages/ui/src/modules/map/engine/map-constants.ts:313 export const ALBERS_USA_ASPECT = 1.709`
  - `packages/ui/src/modules/map/use-map-shape.ts:165 const reserveAspect = statics.canonical?.aspect ?? projectionFallbackAspect(projection)`
  - `packages/ui/src/modules/map/engine/map-geometry/projected.ts:408 aspect: MAP_CANONICAL_WIDTH / height,`
  - `packages/ui/src/modules/map/engine/map-projection/resolve.ts:44-45 In Node 22, the albers-usa states height is 585.000128913205.`
- Trigger: As stated. The canonical height rounds to 585.0, so the loaded aspect is 1000/585 = 1.709402; the reserved 1.709 is 0.000137 of the width taller, about 0.14 px per 1000 px.
- Documented intent: map-constants.ts:309-311 "The loaded map fits the same shape, so a lazily fetched atlas swaps in without shifting the frame's height." aspect.ts TSDoc of projectionFallbackAspect (claim quote) says the frame never shifts height.
- Reach: none. no site. Search: Roots import us-atlas synchronously (docs data.ts:4, apps/places places-atlas.ts:2) and apps/places sets aspectRatio={false} (places-map.tsx:285); MapSkeleton appears only in the docs skeleton demo, which does not swap. No root mounts an albers-usa auto frame before its atlas.
- Severity: low. The shift is sub-pixel and no root lazily swaps an albers-usa atlas in, so no shipped frame moves visibly.
- Prior art: NONE (digest searched for ALBERS_USA_ASPECT, fallback aspect).
- Steps: S30

### B04-C11

- File: `packages/ui/src/modules/map/engine/types.ts` (MapProjection)
- Claim: The instance is not refit to the measured frame. measuredMapFit keeps the canonical 1000-wide fit on it and carries its output through a frame transform, so the instance's scale and translate stay at the canonical values, and a consumer that projects its own points through the instance lands in canonical frame units rather than the measured frame.
- Mechanism:
  - packages/ui/src/modules/map/engine/types.ts:156-158 How the map projects the globe onto the frame: a built-in name, or any `d3-geo` projection instance as the escape hatch. Either way the projection is refit to the drawn geography whenever the frame resizes.
  - `packages/ui/src/modules/map/engine/map-projection/fit.ts:142 : { projection: canonical.projection, frame: canonicalFrame(canonical, width, height) }`
- Trigger: Confirmed only as the public MapProjection TSDoc sentence, which the code does not keep for a passed instance. That the instance should be refit is refuted (ruledOut).
- Documented intent: map-plat.tsx:103-105 "A passed d3 instance is fit to the geography one time; a resize scales that fit and does not refit the instance." fit.ts:123-125 "A passed d3 instance belongs to the consumer, and the module cannot make a copy of it. Thus it keeps its canonical fit".
- Reach: none. no site. Search: apps/places/src/components/places-map/places-map.tsx:188-189 passes centeredProjection(geography) in a drill but projects no coordinates of its own through it. The defect is a public TSDoc sentence; no runtime wrong result.
- Severity: low. The behavior is the documented one and no root projects its own points through a passed instance; only a public TSDoc sentence is wrong.
- Prior art: Digest, 2026-10-26 open row M1-C15 (types.ts, MapProjection, NARROWED low none), with the same dropped part. (known)
- Steps: S34

## Root-cause groups

- **M1**: The legend box reserves min-h-4 (16px) in k.legend.row and k.legend.panel, while one entry is a 32px size sm LegendSwitch that registers from a passive effect after the first paint, so the box and the frame grow after hydration. Members: B01-C01, B03-C11.
- **M2**: The fine-target floor is the circle radius, so a square dot's rounded corners fall outside its target. Members: B02-C02, B02-C03.
- **M3**: useMapKeyboard returns null as soon as navigation switches off (no geography, or the last pick removed), so a plot that holds focus loses tabIndex and focus falls to the body. Members: B01-C06, B02-C15.
- **M4**: A line or area mark registers a keyboard stop from its lon/lat anchor even where its projected path is empty and it draws nothing. Members: B02-C07, B02-C08.
- **M5**: Only MapPoint reads the dot pool (`ownGround`); MapMarker and MapPoints stake their dots but never divide ground against it. Members: B02-C04, B02-C05.
- **M6**: The broad phase admits merges that the overlap rule refuses: it measures each dot against a seed at the full pair reach, so a chain through one seed joins dots that never overlap, and its test is inclusive where the rule is strict. Members: B03-C01, B03-C02.
- **M7**: Comments record a measured time or a measured share of a render time, which CONVENTIONS §12.6 bars. Members: B01-C11, B01-C12, B03-C13.

## Recommended resolution

### S1

- Change: In useMapZoom, drop a pointer whose move reports no button held: in onPointerMove, when the pointer is in `pointers` and `event.buttons === 0`, call `release(event)` and return before `drag`. A press that leaves the plot under the threshold then ends on the next move instead of panning a bare hover.
- Rows closed: B01-C07
- Files: `packages/ui/src/modules/map/use-map-zoom.ts`, `packages/ui/src/__tests__/modules/map-plat-zoom.test.tsx`
- Order: 1: medium bug (shipped on Places and the docs zoom page); the floor tier comes first.
- Depends on: none
- Gate: none
- Test seam: Synchronous: fireEvent.pointerDown then fireEvent.pointerMove with buttons: 0 on the plot, then read the transform attribute of [data-slot=map-zoom] and its pointer-events (map-plat-zoom.test.tsx reads both).

### S2

- Change: After a `+` or `-` step, take the cursor's stop back into the frame: in useMapKeyboard's zoom branch, when a cursor stop is held, anchor it through `zoom.show(stop.at, MAP_CURSOR_INSET)` after `zoom.stepZoom(...)`, as a navigation key does. The center-zoom TSDoc stays true; add that the view then pans to keep the cursor's stop.
- Rows closed: B02-C14
- Files: `packages/ui/src/modules/map/use-map-keyboard.ts`, `packages/ui/src/__tests__/modules/map-plat-keyboard.test.tsx`
- Order: 2: medium bug; first of the use-map-keyboard.ts chain (S2, S9).
- Depends on: none
- Gate: Q1
- Test seam: The tooltip places through floating-ui, which CONVENTIONS §10.3 bars a test from driving. The synchronous seam is the transform attribute of [data-slot=map-zoom] after fireEvent.keyDown '+' with a cursor on an edge stop: the stop's frame point through that transform must lie inside the view box.

### S3

- Change: Make the legend box reserve one real legend row: set the min height of k.legend.row and k.legend.panel to the sm step of the button height (`dan.size.button.base` at `sm`, which LegendSwitch's explicit `size="sm"` paints), from the scale so that it steps with density, in place of min-h-4. Update the class assertion at map-plat.test.tsx:256 and add a browser geometry test that the map-legend-box height does not change when the first entry registers.
- Rows closed: B01-C01, B03-C11
- Files: `packages/ui/src/recipes/kata/map.ts`, `packages/ui/src/__tests__/modules/map-plat.test.tsx`, `packages/ui/src/__tests__/browser/geometry/map-legend-rail.test.tsx`
- Order: 3: medium bug by B03-C11 (B01-C01 is low; see notes); first of the kata/map.ts chain (S3, S4, S35) and of the map-plat.test.tsx chain.
- Depends on: none
- Gate: none
- Test seam: A browser geometry test reads getBoundingClientRect of [data-slot=map-legend-box] before and after the registration effect; no floating-ui, pdfjs, fetch, or virtualization is involved. A side panel stacked under the map with several entries still grows past one row (see notes).

### S4

- Change: Keep the 44px target on any device with a touchscreen: change `k.hit.fine` to narrow only where no coarse pointer exists (an arbitrary media variant for `(pointer: fine) and (not (any-pointer: coarse))`), update the class pin in map-hit-target.test.tsx, and reword the TSDoc in kata/map.ts and map-point.tsx.
- Rows closed: B02-C11
- Files: `packages/ui/src/recipes/kata/map.ts`, `packages/ui/src/modules/map/map-point.tsx`, `packages/ui/src/__tests__/modules/map-hit-target.test.tsx`
- Order: 4: medium bug; after S3 in kata/map.ts.
- Depends on: S3
- Gate: Q2
- Test seam: The class string on the hit circle is synchronous; the media match needs a browser test with an emulated any-pointer: coarse.

### S5

- Change: Floor a square dot's fine target at its corner reach: hand `markTargets` the radius that covers the drawn shape (about 1.25r for a square, from SQUARE_DOT_CORNER) in MapPoint and MapPoints, so the clamp floor never cuts a corner.
- Rows closed: B02-C02, B02-C03
- Files: `packages/ui/src/modules/map/map-point.tsx`, `packages/ui/src/modules/map/map-points.tsx`, `packages/ui/src/modules/map/engine/map-geometry/mark.ts`, `packages/ui/src/__tests__/modules/map-hit-target.test.tsx`
- Order: 5: low bug; after S4 in map-point.tsx and map-hit-target.test.tsx; before S6, because it removes the square-corner exposure of B02-C01.
- Depends on: S4
- Gate: none
- Test seam: Synchronous: markTargets is pure; map-hit-target.test.tsx reads the --map-hit-radius custom property on the hit circle.

### S6

- Change: Take the drawn dot off the pointer, as every other drawn shape in the module is: add `pointerEvents: 'none'` to MapDot's shared props (both the static path and MapDotPop).
- Rows closed: B02-C01
- Files: `packages/ui/src/modules/map/map-dot.tsx`
- Order: 6: low bug, after S5. Check that no test hovers the visible dot path in place of its hit circle.
- Depends on: S5
- Gate: none
- Test seam: Synchronous: read the pointer-events attribute on [data-slot=map-point] and [data-slot=map-points-dot].

### S7

- Change: Complete an in-flight draw when reduced motion turns on: in MapLineDraw, an effect on `still` that, when true, stops the animation and sets `drawn` to 1.
- Rows closed: B02-C09
- Files: `packages/ui/src/modules/map/map-line.tsx`, `packages/ui/src/__tests__/boundary/map-marks-reduced-motion.test.tsx`
- Order: 7: low bug; first of the map-marks-reduced-motion.test.tsx chain (S7, S8).
- Depends on: none
- Gate: none
- Test seam: Synchronous: the boundary test mocks motion/react-m; render animated, flip stubMatchMedia, rerender, and read style.pathLength.get().

### S8

- Change: Give the count and the ring the dot's reduced-motion timing: in MapDotCount and MapDotRing, read usePrefersReducedMotion and use `k.motion.instant` under it, as MapDotPop does.
- Rows closed: B02-C10
- Files: `packages/ui/src/modules/map/map-dot.tsx`, `packages/ui/src/__tests__/boundary/map-marks-reduced-motion.test.tsx`
- Order: 8: low bug, last of the bug tier; after S6 in map-dot.tsx and S7 in the boundary test.
- Depends on: S6, S7
- Gate: none
- Test seam: Synchronous: the boundary test reads the transition prop that each m element gets under stubMatchMedia.

### S9

- Change: In useMapKeyboard, keep the tab stop while the plot holds focus: track focus on the region, return `{ tabIndex: 0, onKeyDown, onBlur }` while `enabled` or focused, and drop it on blur. With no stops the existing path claims a key and moves nothing. One change covers both a geography that goes empty and a removed last pick.
- Rows closed: B01-C06, B02-C15
- Files: `packages/ui/src/modules/map/use-map-keyboard.ts`, `packages/ui/src/__tests__/modules/map-plat-keyboard.test.tsx`
- Order: 9: first of the correctness tier; after S2 in use-map-keyboard.ts and its test.
- Depends on: S2
- Gate: Q3
- Test seam: Synchronous: focus the plot, rerender with geography null, and read document.activeElement and the tabindex attribute; then focus the plot on a tooltip={false} picker, rerender without onRegionClick, and read document.activeElement.

### S10

- Change: Mount the data table when a region is selected: add `selected !== null` to `hasReadout` in MapPlat, so the picked row carries `aria-current` on a picker with no rows.
- Rows closed: B01-C03
- Files: `packages/ui/src/modules/map/map-plat.tsx`, `packages/ui/src/__tests__/modules/map-plat.test.tsx`
- Order: 10: correctness; first of the map-plat.tsx chain (S10, S11, S12, S14, S19); after S3 in map-plat.test.tsx.
- Depends on: S3
- Gate: Q4
- Test seam: Synchronous: render a picker with selectedRegion and no data, then read the row headers' aria-current through map-queries.ts.

### S11

- Change: Resolve region names wherever the layer can answer without rows: pass `nameRegions || onRegionClick !== undefined || onRegionPreload !== undefined || onRegionContextMenu !== undefined` as `nameAll` to useMapRegionReadout, the same handlers that make `regions.answers` true, and update the comment at map-plat.tsx:806-808.
- Rows closed: B01-C04
- Files: `packages/ui/src/modules/map/map-plat.tsx`, `packages/ui/src/__tests__/modules/map-plat-keyboard.test.tsx`
- Order: 11: correctness; after S10 in map-plat.tsx and S9 in map-plat-keyboard.test.tsx.
- Depends on: S10, S9
- Gate: none
- Test seam: Synchronous: a zoom map with onRegionPreload and no data; fireEvent.keyDown ArrowRight, then read the live region text.

### S12

- Change: Key the preload latch on the geography, not on the ids: build the `warmed` set in a memo on `[preloads, shape.features]` and read the current `regionIds` through the bridge at report time, so a new `regionId` identity keeps the latch.
- Rows closed: B01-C05
- Files: `packages/ui/src/modules/map/map-plat.tsx`, `packages/ui/src/__tests__/modules/map-plat.test.tsx`
- Order: 12: correctness; after S11 in map-plat.tsx (S10 already precedes it in map-plat.test.tsx).
- Depends on: S11
- Gate: none
- Test seam: The dwell is a timer: fake timers, an inline regionId, a rerender between two rests on one region, then count the onRegionPreload calls.

### S13

- Change: End any gesture when zoom turns off: in useMapZoom, an effect on `zooms` that, when it turns false, clears `pointers`, `press`, `holder`, `spread`, `midpoint`, ends the cursor hold, and lets the readout go (`setGesturing(false)`, `holdReadout(false)`).
- Rows closed: B01-C08
- Files: `packages/ui/src/modules/map/use-map-zoom.ts`, `packages/ui/src/__tests__/modules/map-plat-zoom.test.tsx`
- Order: 13: correctness; after S1 in use-map-zoom.ts and its test.
- Depends on: S1
- Gate: none
- Test seam: Synchronous: two fireEvent.pointerDown on a { modifier: false } map, rerender with zoom false, lift both, then hover a region and read the tooltip state through the hover context.

### S14

- Change: Read overlay children as React renders them: set `hasOverlayChildren` from `Children.toArray(children).length > 0`, which drops `false`, `null`, and empty arrays and keeps a rendered element that has not registered yet.
- Rows closed: B01-C02
- Files: `packages/ui/src/modules/map/map-plat.tsx`, `packages/ui/src/__tests__/modules/map-plat.test.tsx`
- Order: 14: correctness; after S12 in map-plat.tsx and map-plat.test.tsx.
- Depends on: S12
- Gate: none
- Test seam: Synchronous: render with children {false} and {[]} and read the map-legend-box slot; the existing <circle> case must keep it.

### S15

- Change: Correct the internal `MapTableProps.header` TSDoc to the code: the display name of the colored field (`colorName`), else the localized "Detail".
- Rows closed: B01-C09
- Files: `packages/ui/src/modules/map/map-table.tsx`
- Order: 15: correctness with no runtime change; before S18 in map-table.tsx.
- Depends on: none
- Gate: none
- Test seam: None needed: a TSDoc change.

### S16

- Change: Register no stop for a mark that draws nothing: MapRoute's stop thunk returns [] when its projected path is empty (project through useMapPlat before the registration), and MapGeofence's returns [] when `rings` is empty.
- Rows closed: B02-C07, B02-C08
- Files: `packages/ui/src/modules/map/map-route.tsx`, `packages/ui/src/modules/map/map-geofence.tsx`, `packages/ui/src/__tests__/modules/map-plat-keyboard.test.tsx`
- Order: 16: correctness; after S11 in map-plat-keyboard.test.tsx; before S19 in map-geofence.tsx.
- Depends on: S11
- Gate: none
- Test seam: Synchronous: a one-stop route and a radius={0} zone; fireEvent.keyDown ArrowRight and read the live region.

### S17

- Change: Give an empty plural mark no rows: in markRows, count one row only where `stopRows` is undefined (a singular mark), and `stopRows.length` rows otherwise.
- Rows closed: B02-C13
- Files: `packages/ui/src/modules/map/engine/map-overlay/readout.ts`, `packages/ui/src/__tests__/modules/map-points.test.tsx`
- Order: 17: correctness (shipped reach on Places); before S18 in readout.ts.
- Depends on: none
- Gate: none
- Test seam: Synchronous: markRows is pure; map-points.test.tsx:330 can also read the table rows.

### S18

- Change: Spell the kind fallback in the reader's language: define one message per mark kind in map-messages.ts, pass a kind-name resolver from MapTable into markRows, run `pnpm intl`, and keep the readout.ts TSDoc.
- Rows closed: B02-C12
- Files: `packages/ui/src/modules/map/engine/map-overlay/readout.ts`, `packages/ui/src/modules/map/map-table.tsx`, `packages/ui/src/modules/map/map-messages.ts`, `packages/ui/src/primitives/intl/lang/en.json`
- Order: 18: correctness; after S17 in readout.ts and S15 in map-table.tsx.
- Depends on: S17, S15
- Gate: Q5
- Test seam: Synchronous: render a detail-less MapRoute under a non-English LocaleProvider and read the table's value cell.

### S19

- Change: Re-measure dot targets when a zone's ground changes in place: MapGeofence signals a budget change through a version store on the plat context (the `moves` pattern), and the plat's `spare` keys on that version, so the dots' target memos re-run.
- Rows closed: B02-C06
- Files: `packages/ui/src/modules/map/map-geofence.tsx`, `packages/ui/src/modules/map/use-map-overlay.ts`, `packages/ui/src/modules/map/map-plat.tsx`, `packages/ui/src/modules/map/context.ts`
- Order: 19: correctness; after S16 in map-geofence.tsx and S14 in map-plat.tsx.
- Depends on: S16, S14
- Gate: Q6
- Test seam: Synchronous: rerender a MapGeofence with a larger radius under a MapPoint and read --map-hit-radius on the hit circle.

### S20

- Change: Wire MapMarker's two pins to the dot pool: read `neighbors`, clip each pin with `ownGround` and MapDotClip as MapPoint does; leave MapPoints until the per-dot <defs> decision that ROADMAP.md:51 names, and narrow the crowd.ts header to match. B02-C05 stays open under the recommended answer of Q7.
- Rows closed: B02-C04
- Files: `packages/ui/src/modules/map/map-marker.tsx`, `packages/ui/src/modules/map/engine/map-cluster/crowd.ts`, `packages/ui/src/__tests__/modules/map-hit-target.test.tsx`
- Order: 20: correctness with no root reach; architectural, so it waits on its question and on assent (CLAUDE.md §3.1); after S5 in map-hit-target.test.tsx.
- Depends on: S5
- Gate: Q7
- Test seam: Synchronous: render a MapPoint and a MapMarker pin within 44px and read the clip-path attribute on each hit circle.

### S21

- Change: Restrict seedGroups so that it can only merge what the rule merges: measure each dot against a seed at half the pair reach, (POINT_RADIUS * 2 + gap) / 2 per pair, with the cell size scaled to match, and reject at spread >= reach * reach. Any two members are then strictly inside the pair reach, and every member stays inside the reach of the grown mark. Change the expectation of map-cluster.test.ts:72-88, which pins a merge at exactly DOT_REACH, and add the three-dot chain of B03-C01 and the exact-reach pair of B03-C02 as cases.
- Rows closed: B03-C01, B03-C02
- Files: `packages/ui/src/modules/map/engine/map-cluster/group.ts`, `packages/ui/src/__tests__/geometry/map-cluster.test.ts`
- Order: 21: correctness (B03-C01 was lowered to low correctness in the overturn, so the sheet's medium-bug order no longer holds); independent of other steps.
- Depends on: none
- Gate: Q8
- Test seam: clusterPoints is pure; the suite drives it with flatProjector and englishRadius (map-cluster.test.ts:51).

### S22

- Change: Correct the resolveValueBins TSDoc: the result is empty when no row carries a finite value and no colorDomain pins the scale; a pinned domain resolves its bins with no data, as valueExtent states.
- Rows closed: B03-C04
- Files: `packages/ui/src/modules/map/engine/map-region/value.ts`
- Order: 22: correctness.
- Depends on: none
- Gate: Q9
- Test seam: resolveValueBins is pure (map-value-scale.test.ts); a case with colorDomain and no finite value pins the chosen answer.

### S23

- Change: In readRule, break a tie of the low bounds on the high bounds, so both orders of one range give one span: order the ends by lowest(), then by highest() ascending, which makes '6-600' and '600-6' both read 60000-69999. Add both orders as a parse case.
- Rows closed: B03-C09
- Files: `packages/ui/src/modules/map/engine/map-zip/selection.ts`, `packages/ui/src/__tests__/geometry/map-zip.test.ts`
- Order: 23: correctness; before S24 in map-zip.test.ts.
- Depends on: none
- Gate: Q10
- Test seam: parseZipSelection is pure (map-zip.test.ts:93).

### S24

- Change: Make featureBounds conservative for great-circle edges: in the walk, for each pair of consecutive vertices, also extend the box with the latitude of the arc's extreme where that extreme falls between the two longitudes. Keep the plain longitude walk. Add the four-corner square with [-98, 40.05] as a regionAt case.
- Rows closed: B04-C01
- Files: `packages/ui/src/modules/map/engine/map-geometry/locate.ts`, `packages/ui/src/__tests__/geometry/map-zip.test.ts`
- Order: 24: correctness; after S23 in map-zip.test.ts.
- Depends on: S23
- Gate: none
- Test seam: featureBounds and regionAt are pure; geoContains runs in node. map-zip.test.ts is the suite that already builds a region index; a new locate test file is the other choice.

### S25

- Change: Draw every share longer than half the ring as two arcs of half its length (start to start + turn/2, then to end). One rule then covers the whole ring and a near-whole share, whose rounded ends can meet, and the turn >= 1 branch goes. Update the expected strings in map-geometry.test.ts:520-527 and add the 30000:1 case.
- Rows closed: B04-C02
- Files: `packages/ui/src/modules/map/engine/map-geometry/mark.ts`, `packages/ui/src/__tests__/geometry/map-geometry.test.ts`
- Order: 25: correctness; after S5 in mark.ts; before S26 in the same file.
- Depends on: S5
- Gate: none
- Test seam: ringArcs is pure.

### S26

- Change: Correct the unprojectPoint TSDoc: geoAlbersUsa inverts every position, so a position between the insets comes back through the lower-48 conic and not as null; the callers detect that jump (spare.ts pieceInverse).
- Rows closed: B04-C03
- Files: `packages/ui/src/modules/map/engine/map-geometry/mark.ts`
- Order: 26: correctness; after S25 in mark.ts.
- Depends on: S25
- Gate: none
- Test seam: None needed: a TSDoc change.

### S27

- Change: Build the witness from the first position that projects: walk the features in buildWitness and return the first finite projection, so the witness is null only where nothing projects. Add a case with a leading feature outside the albers-usa insets.
- Rows closed: B04-C04
- Files: `packages/ui/src/modules/map/engine/map-geometry/projected.ts`, `packages/ui/src/__tests__/geometry/map-geometry-projected.test.ts`
- Order: 27: correctness; before S28 in projected.ts and S30 in map-geometry-projected.test.ts.
- Depends on: none
- Gate: none
- Test seam: projectAtlas and buildWitness are pure over a d3 projection.

### S28

- Change: Qualify the probeCanonicalFit TSDoc sentence: the frame comes out to the same bit on a quantized atlas, whose vertices sit inside the finer tolerance; a geography with long resampled edges measures a slightly different frame.
- Rows closed: B04-C05
- Files: `packages/ui/src/modules/map/engine/map-geometry/projected.ts`
- Order: 28: correctness; after S27 in projected.ts.
- Depends on: S27
- Gate: none
- Test seam: None needed: a TSDoc change.

### S29

- Change: In fitWidthFromProbeBounds, compute the rounded height first and return null where it is not above zero, so one test covers both a zero span and a span that rounds to zero.
- Rows closed: B04-C06
- Files: `packages/ui/src/modules/map/engine/map-projection/resolve.ts`, `packages/ui/src/__tests__/geometry/map-projection.test.ts`
- Order: 29: correctness.
- Depends on: none
- Gate: none
- Test seam: fitWidthFromProbeBounds is pure.

### S30

- Change: Set ALBERS_USA_ASPECT to MAP_CANONICAL_WIDTH / 585, the canonical albers-usa height on the path grid, and add a test that probeCanonicalFit(states, 'albers-usa').canonical.aspect equals it.
- Rows closed: B04-C10
- Files: `packages/ui/src/modules/map/engine/map-constants.ts`, `packages/ui/src/__tests__/geometry/map-geometry-projected.test.ts`
- Order: 30: correctness; after S27 in map-geometry-projected.test.ts.
- Depends on: S27
- Gate: none
- Test seam: probeCanonicalFit is pure; the suite already loads stateFeatures (map-geometry-projected.test.ts:166).

### S31

- Change: Classify a thrown request by the signal that ended it, not by the reason's name: pass the caller's signal and the timeout signal to the failure read; 'timeout' where the timeout signal aborted, 'aborted' where the caller's signal aborted, else the fallback.
- Rows closed: B04-C07
- Files: `packages/ui/src/modules/map/engine/map-routing/failure.ts`, `packages/ui/src/modules/map/engine/map-routing/request.ts`, `packages/ui/src/modules/map/engine/map-routing/osrm.ts`, `packages/ui/src/__tests__/modules/map-routing.test.ts`
- Order: 31: correctness; first of the routing chain (S31, S32, S33), which shares request.ts and map-routing.test.ts, so land the three together.
- Depends on: none
- Gate: none
- Test seam: thrownFailure is synchronous: a test passes it an error and an AbortSignal aborted with a string or an Error reason. No fetch drive is needed (CONVENTIONS §10.3).

### S32

- Change: In requestSignal, build a timeout only for a finite timeoutMs of zero or more; treat any other value as no limit, and say so in the timeoutMs TSDoc.
- Rows closed: B04-C08
- Files: `packages/ui/src/modules/map/engine/map-routing/request.ts`, `packages/ui/src/modules/map/engine/map-routing/osrm.ts`, `packages/ui/src/__tests__/modules/map-routing.test.ts`
- Order: 32: correctness; after S31 in request.ts, osrm.ts, and map-routing.test.ts.
- Depends on: S31
- Gate: none
- Test seam: requestSignal is synchronous and returns the signal; a test reads it for Infinity, NaN, and -1.

### S33

- Change: In routeFetch, read the body of a refused response: where it parses and carries a code other than 'Ok', answer noRouteFailure(code); else answer httpFailure(status). Correct the result.ts comment that says OSRM refuses under a 200.
- Rows closed: B04-C09
- Files: `packages/ui/src/modules/map/engine/map-routing/request.ts`, `packages/ui/src/modules/map/engine/map-routing/result.ts`, `packages/ui/src/__tests__/modules/map-routing.test.ts`
- Order: 33: correctness; after S32 in request.ts and map-routing.test.ts.
- Depends on: S32
- Gate: Q11
- Test seam: A pure helper that maps (status, parsed body) to a failure can be tested without fetch; emptyPayloadFailure in result.ts is the model.

### S34

- Change: Correct the MapProjection TSDoc: a named projection is refit at each resize; a passed instance is fit once and keeps that fit, and a frame transform carries it onto the measured frame. MapProjection is a public ui/map export, so check its line in the packages/ui/docs surface index in the same commit (CLAUDE.md §3.4).
- Rows closed: B04-C11
- Files: `packages/ui/src/modules/map/engine/types.ts`
- Order: 34: correctness, last of the tier.
- Depends on: none
- Gate: none
- Test seam: None needed: a TSDoc change.

### S35

- Change: Rewrite the measured-time comments to give the reason in words that stay true, in STE: use-map-coverage.ts:174-176 ("the same order of work as drawing the atlas"), kata/map.ts:186-188 ("made a legend focus miss frames"), and the two comments on Region in map-regions.tsx:185 and :190-191 (for example, "a large share of the mount on a county atlas").
- Rows closed: B01-C11, B01-C12, B03-C13
- Files: `packages/ui/src/modules/map/use-map-coverage.ts`, `packages/ui/src/recipes/kata/map.ts`, `packages/ui/src/modules/map/map-regions.tsx`
- Order: 35: polish, last; after S4, the last step before it in kata/map.ts.
- Depends on: S4
- Gate: none
- Test seam: None needed: a comment change.

## Open questions

### Q1

Where should a `+` or `-` step put the cursor's stop (B02-C14)?

- Axes: (a) Step about the center, then pan to keep the cursor's stop in the frame through `zoom.show`: use-map-keyboard.ts. (b) Step about the cursor's stop when one is held: use-map-keyboard.ts and use-map-zoom.ts (a focus argument on stepZoom), and the center-zoom TSDoc changes; S2 then also touches use-map-zoom.ts and joins the S1, S13 chain. (c) Clear the readout when the stop leaves the frame: use-map-keyboard.ts.
- Recommended: (a), because it reuses the pan a navigation key already makes and keeps the documented center step.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).

### Q2

How should a finger on a fine-primary device get the 44px target (B02-C11)?

- Axes: (a) Narrow only where no coarse pointer exists (`any-pointer`): kata/map.ts, map-point.tsx TSDoc, map-hit-target.test.tsx; a mouse on such a device keeps the coarse target. (b) Resolve the double-tap target with the coarse reach in script: use-map-touch-tap.ts, with a nearest-mark search; mouse precision is kept, and S4 leaves the kata/map.ts chain. (c) Narrow the TSDoc to the primary pointer: map-point.tsx and kata/map.ts TSDoc only.
- Recommended: (a), because one CSS rule keeps WCAG 2.5.5 for every touchscreen and the cost is the old coarse target for a mouse on those devices.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).

### Q3

How should the plot behave when it loses its last output while it holds focus (B01-C06, B02-C15)?

- Axes: (a) Keep the tab stop while the plot holds focus and drop it on blur: use-map-keyboard.ts and its test; closes both. (b) Keep the code and narrow the TSDoc: the geography TSDoc (map-plat.tsx:93-96) says a swap to null drops focus, and a caller must hold a geography through a drill, as drill-into-counties.tsx does: map-plat.tsx only, and S9 joins the map-plat.tsx chain.
- Recommended: (a), because the geography TSDoc invites a lazy atlas and focus that falls to the body is the failure the ARIA guidance names.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).

### Q4

Where should a picker with no rows put its selection for a screen reader (B01-C03)?

- Axes: (a) Mount the data table while a region is selected (`selected !== null` in hasReadout): map-plat.tsx and a test. (b) Narrow the selectedRegion TSDoc to maps that carry a table: map-plat.tsx TSDoc only.
- Recommended: (a), because the TSDoc states the selection must be in the accessible readout and one condition delivers it.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).

### Q5

What should a mark with no detail read in its table value cell (B02-C12)?

- Axes: (a) A localized kind name from four catalog messages: readout.ts, map-table.tsx, map-messages.ts, lang/en.json. (b) The gap mark (READOUT_GAP) that region rows already use: readout.ts and its TSDoc; S18 then no longer depends on S15.
- Recommended: (a), because it keeps the documented readout of the kind and only moves its spelling into the catalog that §3.10 requires.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).

### Q6

Should a zone that changes its ground in place move the dot targets under it (B02-C06)?

- Axes: (a) Yes: a version store that zones bump and the plat's spare keys on: map-geofence.tsx, use-map-overlay.ts, map-plat.tsx, context.ts. (b) No: correct the context.ts TSDoc to say targets move at the next refit, zoom, or legend change: context.ts only, and S19 depends on nothing.
- Recommended: (a), because `radius` is a public prop that a caller can drive from a control, and the TSDoc already states this behavior as the contract.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).

### Q7

How far should the plural-mark pool wiring go now (B02-C04, B02-C05)?

- Axes: (a) Wire MapMarker now and MapPoints after the per-dot <defs> decision: map-marker.tsx, crowd.ts header; B02-C05 stays open. (b) Wire both now, with a clip only for a dot that a mark of another set crowds: adds map-points.tsx (after S5 in that file); closes both. (c) Defer both and correct the context.ts pool TSDoc: context.ts only (after S19 in that file).
- Recommended: (a), because a marker adds two clips at most, while ROADMAP.md:51 names the per-dot <defs> cost as the decision that MapPoints must settle first.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).

### Q8

How must the broad phase of clusterPoints honor its stated contract (B03-C01, B03-C02)?

- Axes: (a) Tighten seedGroups to half the pair reach with a strict test (group.ts and map-cluster.test.ts): the output matches the rule, and consolidate does more of the work. (b) Keep seedGroups and rewrite the group.ts header and the seedGroups TSDoc to say that it can merge a chain the rule would split (group.ts only): the shipped over-merge stays. (c) Remove seedGroups and seed consolidate with one group per dot (group.ts and map-cluster.test.ts): simplest contract, most rule rounds.
- Recommended: (a), because it restores the one-rule output on the shipped map for the cost of a weaker prefilter, and consolidate is already grid-indexed.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).

### Q9

With a pinned colorDomain and no finite value, must the choropleth resolve its bins (B03-C04)?

- Axes: (a) Yes: fix the resolveValueBins TSDoc (value.ts only); a pinned scale shows its legend before data arrives, as the heatmap does. (b) No: test for a finite value before valueExtent and return empty (value.ts and map-value-scale.test.ts); the legend and the range bar then appear only with data.
- Recommended: (a), because a pinned scale that paints before the rows arrive keeps the first paint as the final layout and matches the shared valueExtent contract.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).

### Q10

Which span does a range between two terms with one low code name (B03-C09)?

- Axes: (a) The hull of both terms ('6-600' and '600-6' read 60000-69999). (b) The narrower span ('6-600' and '600-6' read 60000-60099). Either answer changes only the tie-break in selection.ts and its test.
- Recommended: (a), because the hull holds every code that either end names, which is what an inclusive range between the two terms covers.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).

### Q11

Does osrm-backend answer NoRoute and NoSegment with HTTP 400 and a JSON code body (B04-C09)?

- Axes: (a) Yes, or unknown: read the body of a refused response (S33 as written). (b) No, it answers under a 200: drop S33 and rule B04-C09 refuted.
- Recommended: (a), because reading the body of a refused response costs one parse on a failure path and is harmless if the server answers under a 200; verify against the osrm-backend request handler before the step merges.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).

### Q12

How does the Shapes demo (`docs/pages/modules/map/point/shapes.tsx`) show its squares under cross-mark clustering (#3223)? Raised by the caller from the parallel `/assess` run: every depot merges into a shared summary, which is a circle by contract, so the demo draws no square. The demo is a consumer root, not a row of this record.

- Axes: (a) Give the demo a frame or a zoom where the depots stand apart from their rounds: the demo file only. (b) Draw the depot's square inside a shared summary: a change to the #3223 shared-summary contract. `cluster={false}` on the depots is not an axis, because it brings back the depots that hide the stop counts, which #3223 fixed.
- Recommended: (a), because it keeps the #3223 contract and touches the demo alone.
- Answer (Charlie, 2026-11-06 15:32Z): "Proceed as recommended." Settled on (a).
- Done: [#3310](https://github.com/charliebeckstrand/midgard/pull/3310) (the Shapes demo fits Georgia).

### Caller change to S1

The `/assess` pass found the same defect as B01-C07 and challenged the S1 change: every pan test in `map-plat-zoom.test.tsx` fires `pointerMove` with no `buttons`, so a release on `buttons === 0` breaks the suite, and it leaves `holder` set while the pointer is away. S1 instead adds `onPointerLeave` to `MapZoomSurface`, which releases a tracked pointer that the surface did not capture; a captured pan that crosses the plot edge keeps working. The test seam stays: pointer down on the plot, pointer leave, then a move past the threshold with no pointer up; the transform must not change. Approved with the recommendation (Charlie, 2026-11-06 15:32Z: "Proceed as recommended.").

### Merge notes for the reader

- M1 joins B01-C01 and B03-C11: one defect (min-h-4 against a 32px sm LegendSwitch), one change. The two sheets give it different severities: B01-C01 low ("the layout is final after that shift, so the defect heals itself") and B03-C11 medium (overturn KEPT). The merge changes no severity; S3 sits in the medium tier by B03-C11. The caller must reconcile the two rulings.
- B03-S2 (now S21) gave its order as "the shipped medium bug in the clustering pass", but the overturn LOWERED B03-C01 to low correctness. S21 therefore sits in the correctness tier.
- The B03-B04 lead on packages/ui/src/recipes/kata/map.ts:187-188 (a measured cost in the k.group TSDoc) is finding B01-C12. S35 closes it.
- Both sheets lead the same open defect: a side legend stacked under the map below @lg lays N entries in one column and grows by N rows after hydration. S3 reserves one row and does not close it.
- S20 is architectural by its own order note, so it needs assent before work (CLAUDE.md §3.1). S34 changes the TSDoc of a public ui/map export, so its commit also updates the surface index in packages/ui/docs (CLAUDE.md §3.4).

## Ruled out

- **B01-C02** (`modules/map/map-plat.tsx`, MapPlat): The legend box is reserved and stays empty for as long as the map shows. A row placement leaves an empty band under the plot. A `left` or `right` placement at @lg takes a 12rem rail beside the plot and narrows the map for no legend. Ruled out: packages/ui/src/__tests__/modules/map-plat.test.tsx:226-227 "A child that never registers stands in for overlays whose entries land late: the box must hold the space before any button exists." (the part of the claim about a rendered child that never registers)
- **B01-C09** (`modules/map/map-table.tsx`, MapTableProps.header): The value column header reads the localized "Detail", not the `categoryKey` field name that the TSDoc of `header` states. Ruled out: packages/ui/src/modules/map/map-plat.tsx:580 "the name of the colored field, else the localized \"Detail\". A data key is never a header." (the reading that the header should show the categoryKey field name)
- **B01-C10** (`modules/map/map-skeleton.tsx`, MapSkeleton): The skeleton draws the plain rectangle, not the world outline that the plat's default `'mercator'` projection has. Ruled out: packages/ui/src/__tests__/modules/map-skeleton.test.tsx:96-99 "// No projection has no outline to draw. const none = renderUI(<MapSkeleton outline />)"
- **B02-C16** (`modules/map/map-points.tsx`, MapPointsReveal): State (whether the dots pop) reaches the dot layers through a render-function child, not through a prop or a context. Ruled out: packages/ui/src/modules/map/map-points.tsx:219-221 "A one-way flag: a hidden mark unmounts this component, so a toggle that shows the mark again reveals it again."; CONVENTIONS.md §3.6 bars render-function children "on a root" of a compound component.
- **B03-C03** (`modules/map/engine/map-cluster/sets.ts`, groupSets): `off` becomes true and `clusterPoints` gets `null`, so every set in the pass, not only the set with `null`, draws one group per dot with no clustering. Ruled out: packages/ui/src/modules/map/engine/map-cluster/sets.ts:366 if (input.gap === null) return undefined; packages/ui/src/modules/map/map-points.tsx:776 cluster: gap === null ? undefined : input,; map-points.tsx:617 groupSets([{ id, input }], ...) passes one set.
- **B03-C05** (`modules/map/use-map-region-readout.ts`, useMapRegionReadout): `resolveCategories` derives the categories from every row, so the legend lists an entry that paints no region, that entry takes a palette slot (as the first row, slot 0, it shifts the color of every real category), and `legendCanShow` counts it, so a map with one real category shows a legend. Ruled out: packages/ui/src/modules/map/engine/map-region/category.ts:131-132 "omitted, categories derive from the rows in first-appearance order."; joinedRows feeds only the numeric branch (use-map-region-readout.ts:157).
- **B03-C06** (`modules/map/use-map-region-readout.ts`, useMapRegionReadout): The join memo depends on the array identity, so each render re-joins every region of the atlas and returns new `regionCategory` arrays. The `MapRegions` memo then fails and the region layer re-renders, the cost that the hook says it must not pay for an inline array. Ruled out: packages/ui/src/modules/map/use-map-region-readout.ts:67-69 "So the fields come apart in the signature, and the memo below depends on each one. Never depend on the object itself, which would re-join every region on every render."
- **B03-C07** (`modules/map/engine/map-region/identity.ts`, defaultRegionGroup): `defaultRegionId` gives `'6037'`, and `defaultRegionGroup` gives `'60'` instead of `'06'`. The county lands in the wrong state group, so the coverage frame and the group drill-down name the wrong state or none. Ruled out: packages/ui/src/modules/map/engine/map-region/identity.ts:26 "Any other atlas takes the `regionGroup` override."
- **B03-C08** (`modules/map/engine/map-zip/dissolve.ts`, defaultZipId): `String(1001)` gives `'1001'`, `normalizeZip` rejects it as shorter than five digits, and every New England and New Jersey code (leading 0) never matches a territory, so those codes do not draw. Ruled out: packages/ui/src/modules/map/engine/map-zip/dissolve.ts:48-49 "A Census ZCTA file satisfies this as-is, in either vintage; anything else takes the `zipId` override."
- **B03-C10** (`modules/map/engine/map-zip/selection.ts`, readRule): PLUS_FOUR_TERM matches first, so the term reads as the one code 60601 and the rest of the span is dropped with no `invalid` entry. Ruled out: packages/ui/src/modules/map/engine/map-zip/selection.ts:45 "Read before {@link RANGE_TERM}, which this shape also satisfies."; selection.ts:126 "Read first, because a range would read this shape as a span as well."
- **B03-C12** (`modules/map/map-legend.tsx`, MapLegendEntry): The gap between the two swatches stays `gap-1` at each step, while the gap between the keys and the label (`k.legend.entry`, `dan.gap.scale.sm`) steps with density, so the key spacing is fixed outside the scale. Ruled out: CONVENTIONS.md:148 (§5.5) governs how a ramp derives its xs and xl values; CONVENTIONS.md:150 (§5.6) "An app, the docs app of `ui`, and `shared` write no `gap-*` or `space-*` class." limits the class ban to those roots.
- **B04-C11 (dropped part: the instance must be refit)** Ruled out: packages/ui/src/modules/map/map-plat.tsx:103-105 "A passed d3 instance is fit to the geography one time; a resize scales that fit and does not refit the instance."; packages/ui/src/modules/map/engine/map-projection/fit.ts:123-125 "A passed d3 instance belongs to the consumer, and the module cannot make a copy of it. Thus it keeps its canonical fit"

## Surfaced, not judged

- `packages/ui/src/recipes/kata/chart.ts` (sweeper B01): The TSDoc of `touch.readout` says "A long press opens the readout on a map", but MapPlatProps.tooltip says "A touch shows no readout" and useMapTouchTap says "A touch reads nothing from the map". One of the two documents is stale.
- `packages/ui/src/modules/map/map-plat.tsx` (sweeper B02): The plat's spare resolver keeps its identity when a zone is redrawn in place (deps: entries, hidden, regionRoom), so marks that memoize on it never re-measure; its own doc says the targets move on the next render of the marks. See B02-C06.
- `packages/ui/src/modules/map/engine/map-cluster/crowd.ts` (sweeper B02): markTargets floors a target at the circle radius it is given and knows no shape, so a square dot (which reaches about 1.25r) gets a floor inside its own paint. See B02-C02 and B02-C03.
- `packages/ui/src/recipes/kata/map.ts` (sweeper B03): `legend.row` is `min-h-4` (16 px) while a LegendSwitch is a 32 px `sm` button, so the reserved row box is shorter than the row it reserves (the mechanism behind B03-C11). The `group` TSDoc also records "hundreds of milliseconds of per-frame compositing", a measured time under CONVENTIONS §12.6.
- `packages/ui/src/utilities/aspect-ratio.ts` (sweeper B04): parseAspectRatio accepts a numeric Infinity (only `ratio > 0` is tested), so `aspectRatio={Infinity}` reaches the frame as an invalid CSS aspect-ratio, the failure its own @remarks names for a negative ratio.
- `packages/ui/src/__tests__/modules/map-routing.test.ts` (sweeper B04): The no-route cases stub `{ ok: true, json: { code: 'NoRoute' } }`; osrm-backend sends a non-'Ok' code with HTTP 400, so the test pins a response the service does not send (see B04-C09).
- `packages/ui/src/recipes/kata/map.ts` (verifier B01+B02): A side panel stacked under the plot below @lg lays its entries in a grid column (map-legend.tsx:184-185), so N overlay entries grow the box by N rows after hydration; a one-row reserve (B01-S2) cannot hold that, and the kata TSDoc promises no shift.
- `packages/ui/src/modules/map/map-route.tsx` (verifier B01+B02): A route or zone that draws nothing still registers its legend entry and its table row, not only its keyboard stop (B02-C07, B02-C08 cover the stop).
- `packages/ui/src/modules/map/map-plat.tsx` (verifier B01+B02): Digest M2-C07 (picker with an overlay and no nameRegions speaks nothing on an unmatched region) shares the name gating of B01-C04; a fix of `nameAll` does not reach it, because `describeMapTarget` gates names on `nameRegions` (map-tooltip.tsx:178).
- `packages/ui/src/recipes/kata/map.ts` (verifier B03+B04): A side legend stacked under the map below @lg lays its entries in one grid column (map-legend.tsx:184-185), so with several marks the box grows by one 32 px row per entry after hydration; a one-row reservation (B03-S1) cannot hold it. The docs map pages with legend="right" and several marks show it at phone width. Not judged.
- `packages/ui/src/recipes/kata/map.ts` (verifier B03+B04): The TSDoc of k.group (lines 187-188) records a measured cost: "priced a legend focus at hundreds of milliseconds of per-frame compositing", the same §12.6 pattern as B03-C13, outside the file lists.
- `packages/ui/src/modules/map/engine/map-geometry/locate.ts` (verifier B03+B04): If the us-atlas states topology holds long edges along a parallel (for example the 49th-parallel border after simplification), B04-C01 reaches the shipped hit-target rule (spare.ts:408) on the Places states view. Needs a probe of the atlas vertices.
- `packages/ui/src/modules/map/use-map-region-readout.ts` (verifier B03+B04): The names memo lists regionLabel (line 111), so an inline regionLabel re-maps the atlas on each consumer render, which is the cost the comment at lines 101-103 names for an inline data array.
