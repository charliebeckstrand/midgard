# Map roadmap

> **Goal: give the map apps the controls that they now build with overrides, and close the zoom gaps of WCAG 2.2.** Places and Elections use `MapPlat` and `MapPoints` only. The other marks, the OSRM client, and `useMapCoverage` have no app user yet, so new work on them waits for a need.

## Status

`MapPlat` draws a TopoJSON or GeoJSON geography that the caller gives, because the package ships no atlas data. It colors regions by category (with a soft tone or stripes) or by a numeric value along a binned ramp. One legend, a Tooltip readout, and a visually hidden table read one join of rows to regions. `ChoroplethChart` in the chart module wraps the numeric mode. The overlay marks are `MapRoute`, `MapPoint`, `MapPoints`, `MapMarker`, and `MapGeofence`. `fetchOsrmRoute` fetches street geometry and returns a typed failure, and `useMapCoverage` turns a ZIP territory into a geography and a zone.

`MapPlatProps` is a union of the categorical, the numeric, and the no-data forms, and `legend="range"` type-checks only on the numeric form. `numericRegionData` builds the numeric branch with no cast. [`map-plat.test-d.ts`](../../__tests__/modules/map-plat.test-d.ts) holds the union.

The map is a picker with no selection state of its own. `onRegionClick`, `selectedRegions`, and `selectedOverlays` have the shape of the chart selection props, so a dashboard filter or a chat citation feeds both. A pick that opens a Dialog or a Drawer holds its ring until the backdrop covers the map, and [`map-selection-backdrop.test.tsx`](../../__tests__/browser/motion/map-selection-backdrop.test.tsx) holds that rule.

The plot is one tab stop. The arrow keys step to the nearest region or mark in that direction, Enter picks, and Escape leaves the plot. The stop comes from an output that exists: a matched row, a named region, a pick, a zoom, or a registered overlay. A backdrop map takes no stop. The cursor steps by geographic centroids, which the plat computes on the first arrow key. [`map-centroid-deferral.test.tsx`](../../__tests__/boundary/map-centroid-deferral.test.tsx) gates the mount, the render, and the resize paths at zero centroid passes.

`zoom` is a transform over the fitted geography, not a refit. Shift and the wheel zoom, a drag pans, two touches pan and pinch, and `+`, `-`, and `0` zoom from the keyboard. Each spec in pixels divides by the units-per-pixel scale that `MapZoomScaleContext` publishes, so strokes, dots, and hit targets keep their size. [`map-plat-zoom.test.tsx`](../../__tests__/modules/map-plat-zoom.test.tsx) asserts the product of the frame scale and the zoom scale. [`map-zoom-notch-render.test.tsx`](../../__tests__/boundary/map-zoom-notch-render.test.tsx) counts the renders of one wheel notch.

`MapPoints` merges the dots that the frame draws too close together into graded summaries. One merge tree for each plat cuts at the scale of the view, so the sets on one plat never overlap. The server cannot know the box, so a set with its own `color` paints the groups of every width behind a container query. [`map-points-server-markup.test.tsx`](../../__tests__/modules/map-points-server-markup.test.tsx) and [`map-stripes-first-paint.test.tsx`](../../__tests__/browser/geometry/map-stripes-first-paint.test.tsx) hold the first paint.

A dot target is 44px for a finger and narrows for a mouse to what the ground around it can spare. Two targets that overlap divide the ground along their bisector. `markTargets` (`engine/map-cluster/crowd.ts`) is the one rule, and [`map-hit-target-modality.test.tsx`](../../__tests__/browser/geometry/map-hit-target-modality.test.tsx) examines it in a browser.

The map walks its geography once into a buffer of frame coordinates, and each fit emits its paths from that buffer by arithmetic. A witness position refuses a fit that the affine cannot reach, and the direct walk draws it. [`map-geometry-projected.test.ts`](../../__tests__/geometry/map-geometry-projected.test.ts) pins the strings byte for byte against `states-10m`. [`map-path-deferral.test.tsx`](../../__tests__/boundary/map-path-deferral.test.tsx) counts one walk for each sizing mode. The measured fit is one group transform over the canonical paths, which [`map-plat-resize.test.tsx`](../../__tests__/browser/geometry/map-plat-resize.test.tsx) holds across a resize.

A passed d3 projection belongs to the caller, so the module fits it once and never fits it again. [`map-passed-projection.test.tsx`](../../__tests__/modules/map-passed-projection.test.tsx) holds the rule under `test:compiler`. The Maps section of the [browser benchmarks README](../../__benchmarks__/browser/README.md) keeps each measurement, with its date and its bench.

## Engine

Every framework-free rule of the map is in [`engine/`](engine), a functional core in the layout of the grid, chart, and query engines. The engine has no `'use client'`, no runtime import of `react`, `motion`, `@dnd-kit`, or `@floating-ui`, and no runtime import from the module root. It has no `index` barrel, so a reader imports each file by its path. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) gates these rules for each engine. [`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) gates the names: a `map-*` leaf under `engine/`, or a short kind name inside a `map-<concept>/` directory, with no deeper nesting.

The React contexts stay in `context.ts` at the module root, and the comparisons of hover targets are in `engine/map-hover/`. The ledger hook stays in `use-map-legend-registry.ts`, and its `MapOverlayEntry` shape is in `engine/map-overlay/entry.ts`. Thus each dependency runs from the view to the engine.

## Features

1. **A region tint that does not reach into the classes (*P1*).** `places-map.tsx` sets `fill-opacity` on `.fill-green-600` and `.fill-red-600` inside `[data-slot=map-regions]`, so the regions read as tinted ground under the dots. The override names a recipe class, so a change of the fill step in `kata/map` breaks it with no error. Extend `MapCategory.tone` (`engine/types.ts`) with a tint step that `kata/map` writes for each slot, as it writes `soft`. Then remove the override from Places. Prove it with a case in [`map-region-paint.test.ts`](../../__tests__/modules/map-region-paint.test.ts) and a docs example.

2. **A map that does not recede on hover (*P1*).** `places-map.tsx` forces `opacity-100!` on `map-points` and `map-regions-recede`, because the recede dims a region against the dots that stand on it. The plat must take this as a prop, so the lit copies of `map-regions-lit.tsx` do not render for no effect. Add one key to `MapPlatProps` that keeps the hover and the legend emphasis out of the recede, and remove the override from Places. Prove it in [`map-plat.test.tsx`](../../__tests__/modules/map-plat.test.tsx): a pointer on a region leaves each recede wrapper at full opacity and draws no lit copy.

3. **A controlled view (*P2*).** `onViewChange` reports the transform, and its TSDoc names "persist a view" as a use, but no prop gives a view back. Add `view` and `defaultView` beside it (CONVENTIONS §4.9), with the clamp of `engine/map-zoom/transform.ts` applied to each value. This matches the `viewState` of react-map-gl and the `setView` of Leaflet. Prove a round trip in [`map-plat-zoom.test.tsx`](../../__tests__/modules/map-plat-zoom.test.tsx).

4. **Fit the view to a set of regions (*P2*).** Places and the Elections county map both cut a sub-collection out of the atlas to frame it. That swap drops the neighbors and refits each cached layer. A transform that frames the projected bounds of the named regions keeps the context and costs one attribute write, as `fitBounds` does in MapLibre. It depends on the controlled view. Put the bounds rule in `engine/map-zoom/transform.ts`, and prove it in [`map-zoom.test.ts`](../../__tests__/geometry/map-zoom.test.ts).

5. **A public region locator (*P2*).** `apps/places/src/utilities/places-geography.ts` has its own box test, `geoContains` walk, and antimeridian box rule, and imports `d3-geo` and `topojson-client` for them. `engine/map-geometry/locate.ts` answers the same question over a cached grid, and its header names a geocoded result as a reader. Export a locator from the barrel, and move Places to it. This is a new public export across packages, so surface the API for assent first (CLAUDE.md §3.1). Prove it with the Places tests and a case in [`map-geometry.test.ts`](../../__tests__/geometry/map-geometry.test.ts).

6. **Region labels (*P3*).** Highcharts Maps and ECharts can write a label, such as a state abbreviation, on each region. The national map of Elections is the reader that can use it. Two questions are open. Which rule drops a label that does not fit its region? Where does the label of a region with several parts go? The label must stay out of the `role="img"` reading, because the table already names each region.

7. **A projection that centers on a drilled region (*P3*).** Places writes `centeredProjection` to rotate Mercator onto a region, because Alaska crosses the antimeridian and fits to a small part of the frame. The fit can do this for a named projection when the geography crosses the antimeridian. Open question: a world atlas also crosses it, and a rotation must not move a whole-world map.

8. **A ZCTA atlas in the docs (*P3*).** `useMapCoverage` has no demo, because npm has no ZCTA atlas package and the national file is very large. The route demos already fetch from the OSRM demo host at run time (`docs/pages/modules/map/use-route.ts`). Thus a fetch of one simplified state is a smaller change than before. A simplified ZCTA TopoJSON as a dev dependency keeps the rule that atlas data stays out of the package. Until then, the `@example` of the hook and [`map-coverage.test.ts`](../../__tests__/modules/map-coverage.test.ts) give the call shape.

## Pattern cleanup

1. **Places reaches into internal anchors (*P1*).** `places-map.tsx` selects `map-points`, `map-regions-recede`, and recipe fill classes from an app. A unit has one API (CONVENTIONS §3.12), and these selectors go around it. Features 1 and 2 give the API, and their pull requests remove the selectors. After that, a `data-slot=map-` selector in an app is drift, and a Biome plugin can find it in `apps`.

The rest of the module holds to CONVENTIONS through the gates that the status names. Many function names do not start with a verb of §8.5. That drift is in each module of `ui`, and §Not planned gives the reason that this file does not take it.

## Performance

1. **A rung for the merge tree (*P2*).** The cluster pass builds its merge tree in near-linear time on dense piles, and [`map-cluster-tree.test.ts`](../../__tests__/geometry/map-cluster-tree.test.ts) holds the result. No bench times `clusterTree` or `groupSets`. A world frame of Places is the dense case. Add a rung to [`map-compute.bench.ts`](../../__benchmarks__/map-compute.bench.ts) for a dense pile and a spread set, at sizes beyond the 200 dots of `map-fixtures.ts`.

2. **Hold the points of a set by content (*P2*).** `MapPoints` keys its whole pass on the identity of `points` and `clusterDetail`. Places memoizes both, and a comment there says why. A caller that passes a new array of the same dots pays the clustering, the crowding, the readout rows, and the dot layer again. Hold `points` with `useStableValue` and an element compare, as the plat holds `selectedRegions`. Prove with [`map-points-render.test.tsx`](../../__tests__/boundary/map-points-render.test.tsx): a new array of equal points renders no dot again.

## Accessibility and testing

1. **Visible zoom controls (*P1*).** Both apps turn `zoom` on, and on a touch screen only a pinch zooms and only a drag pans. WCAG 2.2 SC 2.5.1 and SC 2.5.7 require a single-pointer alternative to each, and the zoom keys do not satisfy a pointer criterion. Add zoom-in, zoom-out, and reset buttons outside the `role="img"` plot, with their messages in `map-messages.ts`. Leaflet, MapLibre `NavigationControl`, and Highcharts `mapNavigation` do the same. Prove it with the `map (zoom)` case of the a11y corpus and a browser test that taps each button.

2. **Arrow keys under a screen reader (*P2*).** The plot is a focusable `role="img"` that handles arrow keys. A screen reader in browse mode can keep the arrow keys for its own cursor, because `img` is not a widget role. Test the map with NVDA on Firefox and with VoiceOver on Safari. If the keys do not reach the plot, change the role together with the chart frame (`chart/engine/chart-frame/frame.tsx`), which has the same role. Highcharts moves focus to proxy buttons for this reason.

3. **The map under forced colors (*P2*).** [`forced-colors-indicators.test.tsx`](../../__tests__/browser/forced-colors-indicators.test.tsx) examines no map part. Add the selection ring, the overlay halo, the focus ring of the plot, and the region fills. The stripe swatch already hides its gradient under forced colors in `kata/map`. A region color that disappears is acceptable only because the table holds the values, and the test must state that.

## Not planned

- **A dissolve of a GeoJSON territory.** `useMapCoverage` dissolves a topology exactly and reports `dissolved: false` for a feature collection. A clipping dependency or a `topojson-server` pass can fix it. Neither is worth the cost before an app has a ZCTA source that is GeoJSON only.

- **Coverage by county as a measure.** A count of codes for each county needs the placement over the whole atlas, which the coverage pass avoids by design. A count by land area needs the clipping above. It waits for an app that asks the question.

- **Dots sized by value.** Highcharts has a bubble map, but no app needs one. The size of a summary already shows its count, so a size for a value conflicts with the clustering.

- **`vector-effect="non-scaling-stroke"` under the zoom.** Under that attribute, a `pathLength` dash covers only `1 / k` of its path, so a zoomed route loses its far end. The divide by the zoom scale stays.

- **A sweep that renames functions to the verbs of CONVENTIONS §8.5.** Most functions in `chart`, `grid`, and `map` do not use those verbs, and no gate holds the rule. A rename in one module is not clearly better. The decision belongs to the whole package.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`../chart/ROADMAP.md`](../chart/ROADMAP.md) (the chart foundation) · [the browser suite](../../__benchmarks__/browser/README.md) · [`../../../docs/MODULES.md`](../../../docs/MODULES.md).
