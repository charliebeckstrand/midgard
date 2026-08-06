# Map roadmap

> **Goal: a geography surface for logistics dashboards, on the chart module's hand-rolled SVG foundation.** The module ships `MapPlat` with two colour modes, one merged legend, a Tooltip readout, and a hidden data table. `MapRoute`, `MapPoint`, and `MapMarker` draw over the geography, and the OSRM and Valhalla clients fetch street geometry. This file records what shipped, and what the foundation must absorb next.

## Status

The foundation is complete. The projection and geometry cores are pure and React-free (`map-projection`, `map-geometry`, `map-categories`, `map-value-scale`), on d3-geo and topojson-client with the rest hand-rolled. The geometry arrives as a prop, either TopoJSON or GeoJSON, because the package ships no atlas data. The plat frame holds the legend and the visually-hidden table in plain HTML around a `role="img"` plot. The chart module's eight-slot palette reaches the marks through `kata/map`. The chart `animate` contract holds: the SVG is static by default, and the `motion/react` renderers are opt-in inside `ReducedMotion`.

Both colour modes ship. Categorical mode colours each region from a `categoryKey` value, in a fixed slot order. Numeric mode — the choropleth — bins a `valueKey` along a `colorRange` ramp, by equal interval or by quantile, and `MapRangeLegend` paints the continuous bar beside the plot. `ChoroplethChart` wraps that mode as a chart-family component. Both modes emit one meta-and-index shape, so the regions, the legend, the tooltip, and the table read either one unchanged.

The interaction grammar matches the chart module. Overlays register their own legend entries through context, so one legend switches regions and routes together: a point on an entry dims every other group, and a click toggles that group off. A point on a region or an overlay isolates the mark behind the same recede. The tooltip is the real Tooltip component on the map's own floating state; it anchors to the pointer and flips at the viewport edges.

The map is a picker that holds no state of its own. `onRegionClick` reports the clicked region's identity and index, in the shape the charts' `onCategoryClick` takes, and `onRegionContextMenu` reports the same pair for a menu that wraps the map. `selectedRegion` takes that identity back and rings the region above every layer, outside the hover recede, so a standing pick outlasts a passing emphasis. The region's table row reads as the current one. The map and the control beside it read one value, so the two can never disagree about the pick.

Three optimisations hold the mount cost down, and four browser benches gate them. `staticMapGeometry` memoises the decode, the canonical fit, and the canonical paths across instances and mounts, keyed on the atlas identity. `scaleCanonicalFit` derives the measured fit from the canonical one by arithmetic, so a resize never re-projects the bounds. The region layer resolves one paint per category and delegates its pointer handlers, so the base tree holds its render while the pointer travels and only the lit copies repaint. `map-mount`, `map-update`, `map-hover`, and `map-emphasis` measure all three.

## Backlog

In priority order. Each entry names the gap, the shape of the fix, and where it lands.

- **Keyboard region focus.** The clickable map has no keyboard path: `onRegionClick` and `onRegionContextMenu` answer the pointer alone, and `MapRegionsProps.onRegionClick` hands the keyboard model to the consumer. `useChartKeyboard` solves this shape already, and without a focusable mark — one tab stop on the `role="img"` region, and a cursor that drives the shared hover context. The map needs the same hook over region centroids, plus a directional step so an arrow key moves by compass direction. `geoPath().centroid()` gives the centroids beside `regionPaths`; keep them lazy, so a county atlas pays for them only when navigation is on.

- **Overlay identity and click.** `MapPoint`, `MapRoute`, and `MapMarker` take no `id` and no `onClick`. Their identity is a `useId` value that never leaves the module, so a consumer cannot key a click back into its own rows. The regions took `onRegionClick` in #1045 and the right-click reporter in #1052; the overlays never followed. Give each overlay an optional `id` and the region reporters' shape. This is also what the retired shipment-composition item needed: a `MapPoint` with a Popover is not buildable until a point answers a click.

- **A plural point overlay.** `useMapLegendRegistry` appends and re-sorts on each registration, and each overlay claims one legend entry. Two hundred stops therefore cost two hundred state commits, two hundred sorts, and two hundred legend rows against an eight-slot palette. Add `MapPoints`, which takes an array of positions under one entry and one registration.

- **A numeric demo.** The map demo shows the categorical map, the routes, the points, the markers, the picker, and `animate`. It passes no `valueKey`, so `MapPlat`'s own numeric mode, its range legend, and `binning: 'quantile'` have no demo. Only the chart demo shows a choropleth, and it goes through `ChoroplethChart`.

- **The union cast.** `MapPlatProps` keeps the categorical and the numeric fields mutually exclusive, and `map-plat.tsx` then casts them back with `as MapRegionData<T>` at the one place the two modes join. Narrow on `valueKey` before the call, so the exclusivity holds end to end.

- **Split `map-plat.tsx`.** The file is 1425 lines, near three times the next one. `useMapShape`, `useMapRegionReadout`, and the legend plan (`planMapLegend` and its three helpers) are pure and separately testable. Move them to `map-shape.ts`, `map-readout.ts`, and `map-legend-plan.ts`, the way the chart module splits under `engine/`.

- **Zoom and pan.** A viewBox transform layer, with wheel, drag, and pinch input and a projection-aware constraint. The overlays and the hit strokes draw in frame units already, so they inherit the transform. Hold the constant-pixel discipline: the transform must scale the geometry without a refit, and `vectorEffect="non-scaling-stroke"` must keep every stroke a hairline.

- **Routing failure reasons.** `fetchOsrmRoute` and `fetchValhallaRoute` return `null` for every failure. A timeout, a 504 from the rate-limited demo server, a malformed payload, and a genuine no-route answer all read the same, so a caller cannot tell a retry from a dead end. Return a reason beside the result.

- **Geofences.** Circle and polygon region overlays, which the old MapLibre module drew. The circle-to-polygon math ports to one pure helper, and that helper feeds the overlay registration that exists.

- **Graticule and sphere chrome.** Optional meridian and parallel hairlines, and an outline for a world map, on the chart gridline inks.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`../chart/ROADMAP.md`](../chart/ROADMAP.md) (the foundation this builds on) · [`../../../docs/MODULES.md`](../../../docs/MODULES.md).
