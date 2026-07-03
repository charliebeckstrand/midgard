# Map roadmap

> **Goal: a geography surface for logistics dashboards on the chart module's hand-rolled SVG foundation.** The module ships `MapPlat` (categorical regions, merged legend, Tooltip-component readout, hidden data table) with `MapRoute`, `MapPoint`, and `MapMarker` overlays and OSRM / Valhalla routing clients; this file tracks what the foundation was shaped to absorb next.

## Status

The foundation is in place: pure projection and geometry cores (`map-projection`, `map-geometry`, `map-categories` — d3-geo projections and topojson-client decoding, everything else hand-rolled), prop-supplied TopoJSON / GeoJSON geometry (the package ships no atlas data), the plat frame (legend and visually-hidden table as plain HTML around a `role="img"` plot), a hover context confined to the tooltip, the chart module's eight-slot palette shared through `kata/map`, and the chart `animate` contract (static SVG by default, opt-in `motion/react` renderers inside `ReducedMotion`).

Regions colour by category from typed rows; unmatched regions take the neutral no-data fill. Overlays register their own legend entries through context, so the one legend switches regions and routes alike — pointing dims everything outside the focused group, clicking toggles. The tooltip is the real Tooltip component (`TooltipContent` on the map's own floating state), anchored to the pointer and flipping at the viewport edges. Routing clients return street geometry plus distance and duration for mileage readouts; geocoding stays with `AddressInput`, whose suggestions carry the lon/lat an overlay consumes.

## Backlog

- **Numeric choropleth.** A `value`-keyed continuous colour scale beside the categorical mode: sequential ramps on one slot hue, a binned legend, and the same readout plumbing. The `MapCategory` resolution already isolates where the scale slots in.

- **Geofences.** Circle and polygon region overlays (the old MapLibre module drew them); the circle→polygon math ports to one pure helper feeding the existing overlay registration.

- **Shipment composition.** The old module's truck-marker-with-dialog reads better composed in the consumer from `MapPoint` plus a Popover; revisit if a shared pattern firms up in tms-ui.

- **Zoom and pan.** A viewBox transform layer with wheel / drag / pinch handling and projection-aware constraint; overlays and hit strokes already draw in frame units, so they inherit the transform.

- **Keyboard region focus.** A roving tabindex over regions driving the same hover context as the pointer, so the tooltip answers arrow keys; today the visually-hidden table carries value parity instead (the chart module records the same tradeoff).

- **Graticule and sphere chrome.** Optional meridian/parallel hairlines and an outline for world maps, on the chart gridline inks.
