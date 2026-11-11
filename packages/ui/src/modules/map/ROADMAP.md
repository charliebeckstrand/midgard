# Map roadmap

> **Goal: a geography surface for logistics dashboards, on the chart module's hand-rolled SVG foundation.** The module ships `MapPlat` with two color modes, one merged legend, a Tooltip readout, and a hidden data table. `MapRoute`, `MapPoint`, `MapPoints`, `MapMarker`, and `MapGeofence` draw over the geography, and the OSRM client fetches street geometry. This file records what shipped, and what the foundation must absorb next.

## Status

The foundation is complete. The projection and geometry cores are pure and React-free. They use d3-geo and topojson-client, and the module writes the rest itself. They live with every other framework-free rule under [`engine/`](engine) (§Engine). The geometry arrives as a prop, either TopoJSON or GeoJSON, because the package ships no atlas data. The plat frame holds the legend and the visually-hidden table in plain HTML around a `role="img"` plot.

The chart palette reaches the marks through `kata/map`. The chart `animate` contract holds. The SVG is static by default, and the `motion/react` renderers are opt-in inside `ReducedMotion`.

The subsections below describe the module as it is now. The [browser benchmarks README](../../__benchmarks__/browser/README.md) keeps the measurements, in its Maps section: the optimization log, and the dated section "Findings from the roadmap".

### Color modes and the data union

Both color modes ship. Categorical mode colors each region from a `categoryKey` value, in a fixed slot order. A category can take the soft tone of its slot (`tone: 'soft'`), or stripes of a second slot (`stripes`), which a pattern in the region layer draws. Numeric mode (the choropleth) bins a `valueKey` along a `colorRange` ramp, by equal interval or by quantile. `MapRangeLegend` paints the continuous bar beside the plot, and `ChoroplethChart` wraps the numeric mode as a chart-family component. Both modes emit one shape of meta and index, so the regions, the legend, the tooltip, and the table read either mode unchanged.

`MapPlatProps` makes the fields of the two modes mutually exclusive. The plat gives the readout its props whole and does not rebuild them, so the exclusion reaches the join intact. `ChoroplethChart` reaches that union through a constructor, not a cast. It states its scale in a `series`, and `series[0]` can be absent under `noUncheckedIndexedAccess`. Each field that it reads one at a time therefore widens by `undefined`, and an object built from those fields matches no branch.

`numericRegionData` (`engine/map-region/data`) tests together the fields that the numeric branch requires. It returns that branch, or the map with no data. The call site spreads a whole branch, so `satisfies` checks its props and no assertion is necessary. A choropleth with no series draws as the map with no data. A cast lets its rows reach the plat without a join key, and the table then shows region names against empty cells.

The `legend` prop is part of the union too, because one of its forms is a mode. `'range'` replaces the binned switchboard with the continuous scale bar, and only the numeric branch has a scale. A `legend="range"` on a categorical plat therefore does not type-check. The two switchboard forms stay on every branch. `isRangeLegend` is the one rule for a range request. The type that refuses the form and the resolver that draws it both read that predicate.

`numericRegionData` carries the legend across. A placement is a layout that the caller asked for, so it holds whether or not a scale lands. A range request on a choropleth with no series drops there, not in the resolver, so the result stays inside a branch.

### Frame chrome

The frame carries optional chrome. `graticule` draws meridians and parallels under the geography. `true` takes the ten-degree step of d3-geo, and a number sets a different step. `sphere` outlines the edge of the globe, which closes the frame of a whole-world map. Both draw under every region, in the chrome inks of `kata/map`: the gridline hairline, and the axis baseline one step firmer. A region fill therefore covers the lines that cross it, and the chrome reads around the geography.

Chrome names no place and carries no value, so it answers no pointer, joins no readout, and takes no legend row.

The graticule spans only the part of the globe that the viewBox shows. The bound reads each edge of the viewBox back onto the globe through the inverse of the projection, and stops at the first line past each edge. It derives from the frame, not from `geoBounds(features)`, which spans nearly every longitude on a US atlas because Alaska crosses the antimeridian. A graticule on a one-state map therefore streams only the few lines that cross it. A world map shows the space round the globe, so it reads back no bound and still costs the full pass. For that reason both parts are off by default, and `engine/map-geometry/chrome` sets a floor under a step below one degree.

The bound moves only the ends of the lines, and each end is past the edge of the view. The zoom holds the view inside the fitted frame, so a zoom never shows an end.

The chrome pass of the canonical stage is memoized on the fitted projection, not on the geometry. The canonical projection is shared across instances and mounts, so its chrome draws once per atlas and step. A mount draws chrome two times through that projection: at the canonical stage on the first commit, and under the measured fit a moment later. The measured pass stays out of the slot. In the slot, it would evict the canonical stage, and each mount would then pay that pass again. The memo of the hook holds the measured pass.

d3 refines a curve to a tolerance in the units of the projection, and the measured fit scales those units. The measured pass therefore divides the tolerance by the scale of the fit, and puts it back after the pass. A meridian then keeps one tolerance in pixels at each box. [`map-chrome-paths`](../../__tests__/geometry/map-chrome-paths.test.ts) compares that pass with the pass of a projection that is fitted to the box.

The chrome resolution has its own memo, apart from the geography memo. A chrome toggle therefore does not rebuild the view, which gives the context a new projector and recomputes every overlay mark.

Chrome moves with the view transform. A meridian is a position on the globe like a region, so it draws in frame units under the zoom group. Its hairlines convert their width by the same units-per-pixel multiply as every other spec. The transform therefore stretches the ground that the lines rule, and never the lines. A zoom redraws no path.

One path bounds the graticule and draws the sphere, because the graticule draws only where the projection draws. A composite projection has no single edge of the globe. `albers-usa` draws three clip frames: the box of the lower 48 states and the two insets. It streams the graticule through all of its sub-projections, so an unbounded graticule fills each inset with lines at a different angle. The module clips the lines to that frame path under the even-odd rule, so the inset boxes become holes in the outer box. The main map shows the graticule, and the insets stay clear.

A whole-globe projection has one frame and no holes, so the same clip changes nothing there. `sphere` strokes the same path that bounds the graticule, so the bound and the outline always agree.

Under `albers-usa` the bound reads the viewBox through the lower-48 piece alone. The composite reads a point in the Alaska box as a point of Alaska, and a bound read that way spans the west of the globe. The insets keep no line under the even-odd clip, so the lower-48 piece is enough.

The docs draw both parts on a world atlas. `world-atlas` is a dev dependency beside `us-atlas`, and the World tab imports its countries as a JSON module. The tab gives the plat the whole topology, which is the other form that `geography` takes. Equal Earth and Mercator each draw their meridians and outline their own edge. Neither map has rows or marks, and neither takes a tab stop.

Each world map frames at a ratio of its own, because the globe extends past the box that the fit maps onto the frame. Mercator takes 9/10, which is taller than the 1.04 of the land. It cuts at 85°N, Greenland reaches 83.6°N, and the top edge of the outline needs that margin. Equal Earth takes 5/2, which is wider than the 2.03 of the land. No land reaches the antimeridian at the equator, where the globe is widest. At the ratio of the land, the frame cuts the outline between 16°S and 16°N.

### Interaction and picks

The interaction grammar matches the chart module. Overlays register their own legend entries through context, so one legend switches regions and routes together. A pointer on an entry dims every other group, and a click toggles that group off. A pointer on a region or an overlay isolates that mark behind the same recede. The tooltip is the real Tooltip component on the floating state of the map. It anchors to the pointer and flips at the edges of the viewport.

The map is a picker that holds no state of its own. `onRegionClick` reports the identity and the index of the clicked region, in the shape of `onCategoryClick` on the charts. `onRegionContextMenu` reports the same pair for a menu that wraps the map. `selectedRegion` takes that identity back and rings the region above every layer, outside the hover recede. A pick therefore stays visible through a passing emphasis, and the table row of the region reads as the current row. The map and the control beside it read one value, so they always agree about the pick.

`selectedOverlay` shows a picked overlay on the same terms. It takes the `{ id, index }` pair that the marks report, and it draws a halo on the mark that it names (`map-halo.tsx`). The halo is the shape of the mark in the selection ink, drawn behind the mark and outside its dim wrapper. The color shows through, and the pick stays visible through a passing hover.

A route and the leg of a marker draw the halo along the line. A point and the pins of a marker draw it behind the dot. A zone draws it along its outline. One ink serves every halo and the region ring.

The index counts the points that a `MapPoints` receives, not the dots that it draws. A pick inside a summary therefore draws the halo on that summary, and the pick separates onto its own dot as the frame widens. One rule resolves the stop that a pick names (`engine/map-overlay/selection`). The halo and the `aria-current` row both read that rule, so the picture and the readout always mark the same dot.

The overlays are pickable on the same terms. `MapRoute`, `MapPoint`, `MapMarker`, and `MapGeofence` take an optional `id` and report it from `onClick` and `onContextMenu`, in the shape of `onRegionClick`. `MapPoints` also reports the index of the point (§Point sets). An explicit id is also the legend key, so a mark keeps its color and its toggle state across a remount. Each mark registers a keyboard anchor and its activation beside its legend entry. The cursor therefore steps regions and overlays as one field, and Enter picks the mark under it. The plat dispatches the pick and does not need to know the kind of mark.

The registrations use stable getters over a ref. An inline handler, or a route whose geometry arrives late, therefore never registers again, and the ledger does not change for it. The overlay marks share one `useMapOverlay` for identity, registration, paint, and hit targets.

### Keyboard

The plot region is one tab stop with arrow navigation, on the model of the chart module, over the axes of the geography. An arrow steps to the nearest region in that direction, and Home and End go to the two ends of the atlas order. Enter or Space picks the region under the cursor. Escape leaves the plot and arms the next Tab again. The cursor writes to the shared hover context, so the readout and the recede answer it on the path that the pointer uses. The chart and the map share one exit rule (`use-plot-tab-stop`), so a reader leaves each plot the same way.

The tab stop comes from an output that exists, not from a prop that asks for one. The tooltip or the table can earn it, so a `tooltip={false}` picker stays reachable. A map that no row matches and no mark draws on is silent on all of its channels. The tooltip resolves nothing for an unmatched region, and the table drops. The pointed emphasis lights nothing there either, because an isolated neutral fill looks broken.

The gate therefore reads the join: a region that the rows match, or a registered overlay. A backdrop map takes no stop, because a stop that answers every key with nothing is worse than no stop. A pick or a zoom also earns the stop, because each is an output of its own. A legend toggle never takes the stop away. The silence that a toggle makes is temporary, and focus must not move under the reader.

No region path is focusable. The SVG stays `aria-hidden` under the `role="img"` plot, so a county atlas adds one stop, not one stop for each county.

The pointer channel has a gate on the region half of the same join. On a backdrop map, the region paths carry no move handler. Without the gate, each crossing commits hover state, and the provider renders a Tooltip that resolves `null`. The region layer reads only the region half, not the whole join that the table and the tab stop read. An overlay registers from an effect, so a flag that counts overlays changes a moment after mount. That change breaks the memo of the layer and maps the atlas a second time.

Each gate derives from the join, not from a fact about the mount. A map that receives rows after its mount therefore arms every channel again.

Keyboard navigation adds nothing to the mount. The cursor steps by geographic centroids, not projected ones, so one pass for each atlas serves every fit. That pass measures every ring in the atlas. The plat therefore gives the hook a closure, which the hook resolves on the first arrow key. The mount benchmarks cannot see this, because they warm the cross-instance caches before they count. [`boundary/map-centroid-deferral`](../../__tests__/boundary/map-centroid-deferral.test.tsx) counts the calls instead, and gates the mount, the render, and the resize paths at zero.

### Point sets and summaries

`MapPoints` draws a set of dots under one registration, for the stops of a fleet or the branches of a chain. The set has one legend row, one swatch, and one toggle. The group is the mark: a pointer on any dot isolates the set, and all the dots draw under one wrapper and one dim class. Each dot keeps its own readout, its own keyboard stop, and its own pick. A pick reports the `id` of the group and the index of the dot. A `MapPoint` for each dot instead takes one registration and one legend row for each dot, from a palette of fixed size.

The tooltip and the visually-hidden table read one resolver (`engine/map-overlay/readout`), so the pointer and a screen reader always agree about a dot. The table has a row for each dot. The pointed mark is held at the granularity of the mark. A sweep between the dots of one set therefore never publishes to every mark on the map again.

`MapPoints` also summarizes the dots that the frame draws too close to tell apart. Dots inside a merge distance draw as one mark, graded in size by the number of stops that it holds, with the count inside it. The merge distance is in pixels, so the grouping answers the scale of the map and not the data. A national frame shows a metro round as one summary, and the round separates into its dots as the frame narrows onto the state. A summary is one mark to everything downstream: one tooltip, one keyboard stop, one table row, and one pick. A pick reports the first stop that the summary holds, so it names a row that the caller owns.

One rule decides the grouping (`engine/map-cluster`): no two marks draw within the `cluster` gap of each other. The gap is measured edge to edge, so one number holds however wide a summary grows. A count label wider than its grade grows the summary to hold the label, such as `1,200` in English and `12.000` in Spanish. The rule measures each summary at the size that it draws, so a grown summary also takes the room that it needs. A merge moves a center and widens a mark, so the rule is a fixpoint, not a single sweep. The pass repeats until nothing overlaps, which usually takes one round.

A broad phase runs first. It groups the dots that are strictly within half the reach of a pair from the first member of a group. It can only merge what the rule merges anyway, so it reduces the count cheaply and never decides the result. Both passes bucket into one grid at one cell per reach, so each mark reads the nine cells around it. Both passes walk that grid with no allocation of a candidate list.

A set that never overlaps makes one group for each dot, index for index with the points. `cluster={false}` skips every pass, so each dot draws whatever it covers. To frame one region, give the plat the geometry of that region, and the fit frames it as it frames each geography. The demo draws a picked state that way. That swap draws the region alone, so it is a drill-down, and the zoom moves the view over the whole geography instead.

All the `MapPoints` sets that cluster group in one pass for the whole plat (`engine/map-cluster/sets.ts`), so two sets never draw over each other. The plat holds the pass as a store beside the dot pool, because the pass reads the zoom scale, which the plat cannot see. The set that reads the store gives it the scale, and the store keeps the grouping of the last scale. Each set registers its dots and its gap through the ledger (`clusterAt`), and stakes them again when they move. A pair of marks from two sets keeps the larger of the two gaps, so one set alone groups by its own gap.

A summary that holds the dots of more than one set is a shared summary. The first of its sets in the ledger draws it, as a disc in the surface color with the count on it. A ring split into the colors of its sets surrounds the disc (`MapDotRing`), so no single set color names a shared mark. Each set keeps the part that holds its own dots, as a table row, a halo, and a pick of that set. The summary sits in its own group, which dims only where all of its sets dim.

The pointer and the keyboard reach a shared summary as one mark. The cursor stops on it once, at the stop of the set that draws it. The parts of the other sets stand at `null` in their stop lists, so each index still names its own group. The tooltip and the announcement read every part (`targetParts`), and a pick from any input reports each part to the `onClick` of its set. The dot targets read the room of the whole pass, so a dot also gives way to the dots of other sets. A set with `cluster={false}`, and a set that the legend hides, stay out of the pass.

### Zoom

`zoom` opens the geography to the reader as a transform, not a refit. One `<g>` over the whole drawing carries a scale and a translation in frame units (`engine/map-zoom/transform`). The projection places the regions once, and the layer moves what it placed. A gesture therefore writes one attribute, and the region paths stay byte-identical.

A wheel zooms about the pointer, and a drag pans. Two touches pan and pinch together: the travel of the midpoint moves the view, and the change in their spread scales it. The pinch applies once per frame, because a phone reports each finger as its own move. The tab stop of the plot takes `+`, `-`, and `0`, so a keyboard reaches every scale that the pointer reaches. The arrow cursor pans the view to keep the stop that it steps onto in view.

The wheel uses a native non-passive listener. React registers `onWheel` as passive, and a passive handler cannot take the gesture from the page. A drag past four pixels swallows the click that it ends on, so a pan never reports a pick. Each commit writes the live view at once, not on the next render, so two moves before a render build on each other.

For the length of a gesture, nothing on the map answers the pointer. A scaled frame moves the geography under a still pointer, and the readout would otherwise follow each region and dot that it crosses. A wheel reports no end, so a gap in the notches ends its gesture. A pointer gesture and a settling wheel each wait for the other before the map answers the pointer again.

The page keeps every wheel that the reader does not aim at the map, and the shift key aims it. With the key held, the wheel zooms and the page stays still. Without it, the plot scrolls past like any other content. Touch keeps the same bargain with `pan-x pan-y`: one finger scrolls, and two fingers pan and pinch. The map takes only the pinch of the browser, which zooms the page over the map.

This is the default because the other default fails silently, and the reader pays for it. A map that swallows a scroll strands the reader on the page, but a map that needs a key only has to be learned. The key is shift only. A trackpad pinch arrives as `ctrl` with a wheel, and the page zoom of the platform takes `ctrl` and `meta`. A browser moves a wheel with shift held onto the horizontal axis, so the map reads `deltaX` when the key is down and never otherwise. Without the key, a sideways delta is a scroll that the page owns.

The touch policy also lets the browser take two fingers as a page pan, which cancels both pointers before a pinch moves. While two pointers are down on the plot, the map therefore cancels each `touchmove` on a native non-passive listener. A single finger still scrolls the page.

The key arms the wheel stream, and the release of the key does not end the stream. A trackpad keeps sending after the fingers lift, so the momentum tail of a zoom can scroll the page. The map holds what the key armed until the stream ends. It swallows the tail and does not zoom with it, because the release stops the zoom. The stream ends on the same gap as the gesture (`MAP_WHEEL_SETTLE_MS`), so a wheel after a pause never meets an old claim.

Momentum only decays, and the decay is the only sign of a coasting wheel. The map therefore keeps a tail only after the stream shows decay: the first push after the release must be strictly smaller. `wheelPush` measures a push across both axes, because the release moves the stream back off `deltaX`. After the stream shows decay, the map also holds the plateau that the decay rounds down to. A mouse notch reports a fixed delta, so the map never takes a wheel that does not decay. A reader who releases the key and keeps turning the wheel scrolls the page, and a push that grows ends the claim too.

`{ modifier: false }` arms the wheel outright, for a map that owns its screen. A plain wheel zooms, and the map gives the gesture back only where the view cannot move. A reader at the fit or at the ceiling therefore still scrolls through the map. The plot claims touch, so one finger pans. The stream rule does not apply in this mode, because it has no key to release in the middle of a coast. To hold the stream here only takes the fall-through that keeps a reader from a trap on the map.

This mode is the rarely used opt-out, and a caller must ask for it. One function reads the whole prop (`engine/map-zoom/input`). The plat therefore gates its tab stop and its touch policy without view state.

The fit is the constraint. The scale has a floor at 1, because the projection already framed the geography, and a smaller scale only letterboxes it. The translation is clamped so that the frame stays inside the scaled frame. At the fit, that clamp collapses to a point and centers the view with no second rule. A fixed `aspectRatio` letterboxes one axis, and a pan can reach that band at the edge.

That band is the band that the map shows at rest. Its removal needs the projected bounds of the geography, and a passed d3 instance has no cached canonical fit to derive them from. A bounds pass on the mount path is the only other source. The view returns to the fit when the geography changes, because a new geography frames itself.

Sizes in pixels hold through the transform, so a zoom shows more ground, not a larger picture of the same ground. Each spec that the layer would stretch takes one multiply by the units-per-pixel scale (`1 / k`). The layer publishes that scale beside its transform (`MapZoomScaleContext`), because the two are one fact. The multiply covers every stroke width: the region seams, the route lines, the dots, and their halos. A dot draws as a zero-length round cap, so its stroke width is its disc. The hit circles, the hit bands of routes and markers, and the count of a summary size in user units, so they take it too.

The module does not use `vector-effect="non-scaling-stroke"`. That attribute puts the drawn size of each mark on a stroke transform that the module cannot reach. A `pathLength` dash under it covers only `1 / k` of its path, so a zoomed route loses its far end. The region seams state their width once on the group of the layer, and every path inherits it. A width on each path sends the whole atlas through React on each notch.

One spec reaches its shape as a CSS length, not as an attribute: the target of a dot for a fine pointer. It answers a media query, and no attribute can do that. CSS wins over the attribute, and a CSS length on an SVG shape is a user unit. That target therefore takes the same division, through a custom property that `dotHitProps` sets on each shape (`hit.radius` in `kata/map`). Without the division, the mouse target grows with the view and claims more ground than a finger target. The property is on each shape, not on the layer, for the reason that the factory states.

A mark reads the scale from `useMapOverlay`, the seam that the overlay marks already use, so a new mark gets the rule by construction. `MapPoints` reads the scale directly, before its registration, because the grouping decides what it registers. The merge distance is in pixels, and the transform is part of what the map draws. The rounds that a national frame summarizes therefore separate as the view closes on them. The conversion happens once, at the boundary of the clustering pass, so its two phases compare in frame units only.

The view state sits below the plat, in `MapZoomProvider` around the plot alone, for the same reason as `MapHoverProvider`. A gesture writes on each wheel notch and each tracked pointer move. On the plat, each write renders the plat and plans its legend again. In the provider, the provider renders and the stable plot element of the plat bails out. A notch reaches only the layer, the plot region, and the marks that read the scale. The region layer holds its render through the gesture, and the legend sits outside the provider.

A notch renders each mark one time. Each producer below the scale keeps its identity while its content is the same. The shared pass keeps the groups of a set while each dot stays in its group. The budget of a zone is in frame units, so a zoom does not change it. The plat keys its geometry readers on the anchors of the ledger (`sameAnchors`), so a write that changes only a readout keeps the dot pool and the spare resolver. The dot pool gives each mark a view that holds no dot of that mark, so a set that regroups does not render again for its own dots. A notch that regroups a set writes the new readout of the set to the ledger. That write runs the plat one time, for the legend and the table. The frame holds the deferred table, so a new table does not run the plat again. [`boundary/map-zoom-notch-render`](../../__tests__/boundary/map-zoom-notch-render.test.tsx) counts these renders.

One flag tells whether a map zooms: the context carries the whole gesture set, or `null`. The plat resolves the gate of the tab stop from `mapZoomSettings` on the `zoom` prop, without view state. The pointer path measures the box of the plot once at the press and keeps it for the gesture. A measurement on each move forces a layout pass over the region tree before the write of the transform.

### Zones and hit targets

`MapGeofence` draws the zone that other marks sit inside, such as a delivery area, a service radius, or a district. It draws a wash under its own boundary. A circle takes a center and a ground radius in meters. `circleRing` (`engine/map-geofence.ts`) turns that pair into a ring on the small circle of `d3-geo`. A ring stepped in degrees looks like an ellipse away from the equator and breaks at a pole. A polygon takes its own ring, for a territory that no radius describes.

Either way, the mark is one closed path. The wash, the boundary, the hit stroke, and the halo all trace that one string, so they cannot diverge. The radius is the one measurement in the module that is not in device pixels. A zone covers the same ground at every zoom, and its boundary uses pixels like every other stroke. The swatch of a zone is the `rect` of a region, because the mark is an area too. `MapSwatchShape` in `engine/types.ts` names the swatch shapes for the legend and the tooltip.

The ring path and its keyboard anchor sit in `map-geometry/mark.ts` beside those of the polyline, over the projection walk that both share. The anchor reads the vertices, not the enclosed area, so a ring with reversed winding cannot center on the far side of the earth.

The whole face of a zone answers the pointer, plus a 24px band around the boundary. That band is the minimum of WCAG 2.5.8, which a line takes on every pointer. A line does not take the 44px of a dot on a coarse pointer, because a band that wide swallows a parallel leg. A zone is a place, so a pointer anywhere inside it names it. The marks inside a zone draw after it, and the topmost shape at a point wins. A stop inside a zone therefore keeps its own hover, but the zone covers the region under it.

The target of a dot answers the input device. The `r` attribute carries the 44px of WCAG 2.5.5 for a finger. `hit.fine` in `kata/map` narrows it for a mouse through CSS, because only CSS can read the modality. It narrows only on a device that has no coarse pointer at all. The floor is the drawn dot, because a target inside its own mark leaves the mark a dead rim. That floor is below the minimum of 2.5.8 on purpose, and `POINT_HIT_RADIUS_FINE` states why.

A mouse target narrows only where the pixels have another use. A dot gives reach back to a drawn zone that it stands on, and to a neighbor dot inside that reach (`neighborRoom`). It also gives reach back to the region layer, wherever that layer answers the pointer. A matched region reads out under the dot, a click picks a region, and a right-click can open a menu on it. A finger target over any of these is a 44px hole in the layer.

The plat resolves once for the whole map whether the region layer answers the pointer (`regionPointerState`). A caller can switch it off there (`regionPointer`), as a drilled map does. Under the dots of a drilled map, the state is only ground and has nothing to say. The switch withdraws the readout, the pick, the menu, and the keyboard stop of the region together. The paths then bind no handlers, and the stop list is the one channel that needs the flag. The dots above take back their whole target.

The claim of the region layer is a share of the region, not a fixed figure (`AREA_SPARE_FRACTION`, read in `engine/map-region/spare.ts`). It is the same half that a zone gives, on the same `2 · area / perimeter` measure. A region with room to spare owes the dots on it nothing, and they keep the full finger target. A region with no room to spare drives the share below the paint of the dot, where `markTargets` puts a floor under it. Small states therefore take the drawn dot, and large states give the full target. A dot over open water has no region under it, and keeps the full target.

The share resolves for each dot. A grid over the canonical frame files each ring as the canonical fit draws it: in each row, the cells from the first to the last that its outline reaches. The grid is built one time for an atlas, on the first dot that asks, and each region is measured when a dot first stands near it. A measured frame reads the grid through its own transform, so a resize and a zoom build nothing. A dot answers to every region that its target can cover, not only to the region that it stands in. The walk stops as soon as one region drives the budget to the floor.

The scale reaches the region half through the resolver of the plat, which takes it as an argument that `useMapOverlay` binds. The plat cannot bind the scale itself, because `MapZoomScaleContext` sits below it. The plat folds the region claim and the claims of the visible zones into one store (`engine/map-overlay/spare.ts`). Each dot-shaped mark reads that store to size its target.

The zone claim is a budget, not a test of inside or outside. A dot on the boundary of a zone has no clear answer to that test. A zone strung between the marks that it holds puts each mark on its own boundary. A ray cast at a vertex depends on the winding and on the hull, so the dots of one set get different targets. A small zone fails the other way: each dot reads as inside, and the finger target covers the whole zone.

A zone therefore publishes its room (`areaReach`, over the projected rings that it paints). A dot near it takes half of that room (`AREA_SPARE_FRACTION`). The zone thus keeps at least as much as it gives, at every size and with no threshold. The measure `2 · area / perimeter` is exactly the inscribed radius of a circle, and `circleRing` makes most zones. For a long thin corridor, the measure gives the width, where a bounding box gives the diagonal.

A 150 km catchment projects to about 25px on a national frame, so a depot inside it takes about 12px. The ring outside the depot answers the zone.

The budget is one value for the whole zone, because a reader sees the corners of one shape as alike. `zoneBudget` measures it once for the zone, and `zoneSpare` only places each dot against it, over the ring boxes that `projectArea` walked. The budget is in frame units, so a zoom keeps it. `zoneSpare` takes the scale as an argument, as the region half does. The resolver runs for every dot against every visible zone, so a measure inside it walks each vertex once per dot. Both functions sit in `engine/map-geofence.ts` beside `circleRing`, because the zone rule is frame arithmetic. The geofence registers the budget beside its legend entry (`MapOverlayEntry.spare`). That field is a stable getter like `stopsAt`, so a redrawn territory never sorts the ledger again.

The plat takes the tightest visible budget, and a mark asks it for each dot, so a legend toggle moves the targets. Each layer below the join writes "no claim" as the identity of a minimum, not as the finger target. `markTargets` is therefore the one place that knows the cap of a target, and a new claimant needs only its own measure.

The crowding half reads one pass of drawn dots: the pair of pins of a `MapMarker`, or the shared pass of the point sets. The plat cannot pool every other dot for this half, because the reaches are in device pixels and the plat cannot see the zoom scale. Inside one mark, a target can swallow a neighbor, because a pair that a zoom just separated sits well inside one 44px circle. Two separate marks that close each keep the full radius, which the pass accepts as its bound.

`engine/map-cluster/ground.ts` handles that bound the other way: it divides the overlap and does not shrink either target. The ground of a dot is its full circle minus the part nearer to another dot. The boundary is the perpendicular bisector between the two dots. The outer part of each circle keeps its whole reach, and the contested middle divides once and evenly. Without that rule, the middle goes to the mark that draws last, with the tooltip of the dot under it and the edge of its face.

A summary can stand closer to a lone dot than its own radius doubled, because the grouping keeps only `POINT_CLUSTER_GAP` between the edges. The midpoint then falls inside the face of the summary. The boundary moves out to the edge of that face, so each dot keeps every pixel that it paints. Both dots read the same line, so the division does not depend on draw order. The pool therefore holds the radius of each dot beside its position, and it holds each dot where its mark draws it. A point and a pin give a position in lon/lat, which the pool projects. A summary draws at the mean of the frame positions of its members, so a set gives each dot at the frame position where it draws the dot (`MapEntryDot`).

The cuts are straight and the arc is the circle, so the target stays a `<circle>` under a `<clipPath>` that holds a convex `<polygon>`. An intersection of half-planes is convex however many neighbors crowd in, so the clip is sound. This half can pool across marks, because it measures in frame units, and a frame position does not depend on scale. The plat gathers the dots of every visible dot-drawing mark once, on the first read (`createDotPool`). Each mark drops its own dots from the finished pool. A mark that moves stakes its own dots in the pool again, so only the readers of the pool render again. A refit moves the frame position of each dot of a set, so the set stakes its dots again after a refit.

Almost every dot has no neighbor inside `2 · reach`, and it gets `null`: no polygon, no `clipPath`, and no id. `MapPoint`, `MapMarker`, and `MapPoints` read the ground. A set divides the ground of all its dots in one pass (`setGrounds`) over the shared grid, against its own dots and the pool. Only a contested dot draws a clip. A set draws each clip as plain elements in its memoized dot layer (`dotClip`), not as a component, so a clip adds no fiber for each dot.

`markTargets` joins the two halves. Both arrive as a reach in device pixels, so the result is their minimum. It has a floor at the paint of the dot. Its cap is the finger target, or the dot where a summary is wider than that target. The floor is the drawn radius of the mark, so a summary keeps its grade. Every dot-shaped mark reads that one rule, so a new mark takes it by construction.

One props factory (`dotHitProps`) sets all of it for each dot target. A component for each dot adds a fiber for each dot, on a set that renders at each pointed-mark crossing.

### Legend groups

`MapOverlayProps.group` gives one place one legend entry. A catchment and the depot inside it are two marks and two registrations. Without a group, a map with three depots shows six entries and names each city twice. Marks that name one group take a single entry, with one swatch for each distinct mark shape. A square beside a dot then says an area and a point without a word for either.

The first registered member of the group names the entry and gives its detail. A zone must come first anyway, so that it draws behind the marks that it holds. The whole group takes the slot color of that member (`engine/map-overlay/slots.ts`, which advances the palette per entry, not per mark). Two colors under one label read as two things, and a slot for each member uses up the palette quickly.

The plat expands the toggle once, not at each reader. `hidden` holds the ids of the switchboard plus the members of each group that is off. The region layer, the tooltip, the keyboard stops, the dot pool, and the `hidden` of each mark therefore ask one question. The zone budgets read through that `hidden`. The legend receives the set of the switchboard, because it draws entries. Only the emphasis resolves a group at the mark, because the emphasis is one id, not a set.

The group applies to the legend only. Each mark keeps its own tooltip, table row, and keyboard stop, because the pointer lands on a mark, not on a group. The readout of an entry has its own column beside the name, at `size="xs"`, one step under the chart legend. The swatches align to the first line of the entry, not to the middle of a wrapped block.

### ZIP coverage

`useMapCoverage` turns a ZIP-code territory into a map. A broker states coverage in codes, not in ground. The hook cuts the territory out of a ZCTA atlas, dissolves it into one shape, and finds the states that it lands in. It returns the counties of those states as the geography to draw. The plat fits each geography that it receives, so the state frames itself through the drill-down, with no new projection rule.

One selection feeds both halves: `geography` to the plat, and `area` to a `MapGeofence`. The ground that the map draws and the ground that the fence holds therefore always agree. The counties are the split, not the scope. They name themselves on hover and fill the table, and the fence carries the whole coverage.

The territory is a small language, not a list. `606` is a ZIP3 prefix, and `60601-60640` and `600-609` are spans at either width. `60601-1234` is the ZIP+4 form that a masked field emits, and it reads as the code inside it. A leading `!` subtracts, so `606, !60605` is a prefix with one exception. The terms parse out of one pasted string. The parser reports an unreadable term and does not throw, so a typo marks itself and the rest of the territory stays.

A prefix is a span, and it compiles to one: `606` is every code from `60600` to `60699`. The rules compile to a closure over a set of whole codes and one sorted list of merged spans. Each code in the atlas then takes one lookup and one bisect, however many rules there are. Codes compare as five-digit strings, because a ZIP keeps its leading zeros. `01001` is a place, and `1001` is nothing.

A topology dissolves exactly, so a topology is the better input. TopoJSON holds each shared border once, as an arc. `merge` drops the arcs that the covered codes share, and keeps the arcs that only one code holds. The seams between neighbors go away, an uncovered code inside the territory becomes a hole, and two clusters become two parts. Nothing is clipped or rounded, because the work uses the arc index, not coordinates.

A feature collection repeats each shared border as two runs, so the hook gathers the rings of each code instead. `dissolved` reports which path ran.

`MapGeofence` takes an `area` for that shape. A dissolved territory is several polygons, and each one can enclose ground that the territory leaves out. The three geometry forms resolve to the shape of the widest form before the mark draws. A circle and a single boundary therefore reach the path, the anchor, the wash, and the hit as one-ring cases. The wash and the hit shape fill under the even-odd rule, so a hole is a hole whichever way its ring winds. A merged topology therefore draws in the winding of its own arcs, with no rewind pass.

A hole answers no pointer, so the region under it keeps its own hover. The keyboard anchor stands on the largest part, sized without regard to winding. A territory in two distant clusters has no middle that stands on either of them.

The hook places most codes without a measurement. Each region whose bounding box meets the box of a code is a region that the code can sit in. Where all of those regions are in one state, no measurement can name another state, so two boxes settle the code. Only a code whose neighborhood spans two states reads its own centroid. The box rule is also the sounder rule, because a centroid is a point. It can land on water that the county atlas does not draw, or not exist where a ring is degenerate.

Chicago's 60611 centers in Lake Michigan, and 61625 measures as `NaN` at the precision of the atlas. Both place correctly on their boxes.

The expensive passes answer the atlas, not the territory, so a keystroke in a coverage field only cuts and dissolves again. The hook holds the frame that it gives the plat on the states that it names, not on the territory. `MapPlat` keys its decode, its canonical fit, its region paths, and its chrome on the identity of that object. A new collection for each keystroke projects the whole county atlas again and misses every cache. The decode is memoized across instances beside the mount-critical pair (`map-geometry/cache`), so a plat and the hook never decode one atlas twice.

The bounding-box grid of the placement is memoized on the decoded features and built on the first read. A map that places nothing builds no grid. The grid belongs to `map-geometry`, not to the coverage pass, because nothing in it knows about ZIP codes. A geocoded result, or a measure rolled up by region, asks the same question.

The grid buckets a region by its corner cells, not by its width. A box narrower than a cell still spans two cells where it crosses a cell line. Cook County, for example, crosses a meridian that the grid divides on. The rewind runs with the measurement that needs it, not at the cut. It measures a spherical area for each ring, and the placement measures almost no codes.

### Routing

The routing client names what stopped it. `fetchOsrmRoute` returns `{ ok: true, route }` or `{ ok: false, failure }`, and the type makes the two exclusive. A caller that reads `ok` reaches one or the other with no second test.

The failure kinds (`engine/map-routing/failure`) cover the whole taxonomy. Fewer than two stops name no leg and send nothing. A signal ends a request as the timeout that the client set, or as the abort that the caller asked for. A request can reach no answer, a status can refuse one, and a body can parse as no routing answer. The service itself can refuse the pair.

Each failure states whether a retry can give a different answer, because a `null` cannot answer that question. A timeout, a dead network, a 5xx, or a status that names a busy service can clear. An example is the 429 of the rate-limited demo server. A refused request, an unreadable body, and two points that no road joins always give the same answer. An abort is neither, because the caller ended that request and already holds the decision to send another.

Two kinds separate on what the answer carries. A signal names itself in the reason that it aborts with. The combined signal passes on the reason of the signal that fired, so `'timeout'` and `'aborted'` separate on a name. OSRM refuses a pair that it cannot join under a 400, with `NoRoute` or `NoSegment` in the body. A refused response with one of those codes reads as that refusal, and any other refused response reads as its status.

Under a 200, a code that is not `Ok` is still the answer of the service, and reads as a refusal with that code. An empty `routes` array reads as a refusal with no code. A body with neither is not a routing answer, whatever else it parses as. A JSON `null` reads as an absent value at each level of the body. A value of the wrong type at one of those levels makes the whole body no routing answer (`isOsrmPayload`, `engine/map-routing/result`). `routeFetch` (`engine/map-routing/request`) reads the failures that occur before the payload, and the client keeps only the URL of its service.

### Mount cost

Cross-instance caches hold the mount cost down. `staticMapGeometry` memoizes the decode and the canonical fit across instances and mounts, keyed on the identity of the atlas. The canonical paths are a memo of their own beside it (`cachedCanonicalPaths`), keyed on the geometry entry and resolved on their first read. A caller that reads only the decode or the fit does not pay for the paths. Every map draws the canonical paths before it measures its box, the server frame included. [`boundary/map-path-deferral`](../../__tests__/boundary/map-path-deferral.test.tsx) counts that pass at one for each sizing mode, because the mount benches warm the cache before they count.

The measured fit derives from the canonical fit by arithmetic (`measuredMapFit`), so a resize never projects the bounds again. The region layer resolves one paint for each category and delegates its pointer handlers. The base tree therefore holds its render while the pointer moves, and only the lit copies paint again. The map scenarios of the browser benchmarks measure this path.

The map walks its geography once into a buffer, and every fit reads that buffer. A d3 projection places a point as `scale · raw + translate`, so two fits of one projection differ by a scale and a translation on the frame. `probeCanonicalFit` (`map-geometry/projected`) streams the geography at a probe scale into a flat buffer of frame coordinates. It measures the bounds of the frame from the same points, so the fit and the buffer take one walk. `emitRegionPaths` writes the `d` strings from the buffer under any later fit, by arithmetic. `fitWidthFromProbeBounds` (`map-projection/resolve`) holds the fit arithmetic of d3, so each path to those bounds places the result by one rule.

The buffer keeps one witness position. A fit that does not place the witness where the affine says is refused, and the paths fall back to the direct walk. A `center`, a `rotate`, a factor for each axis, or a `postclip` therefore costs a fallback, not a wrong map. That holds for a projection from a consumer, and for a later edit to the fit. `frameAffine` (`map-geometry/projected`) states the affine, and the emit applies it to each coordinate.

The strings match the direct walk byte for byte wherever `d3-geo` refines the geography the same way at both fits. `geoPath` resamples a curve until its chord is inside a tolerance in frame units. The buffer therefore keeps the vertices that its own fit earned, and a distant fit earns others. The vertices of a quantized topology already sit inside that tolerance, so no fit refines them, and a real atlas matches at every fit. [`map-geometry-projected`](../../__tests__/geometry/map-geometry-projected.test.ts) pins both halves against `states-10m` under `albers-usa`, where an island state has several rings and each inset clips. A sparse polygon parts from the direct walk only in the density of points along a curve, never in where a point lands.

That gap shows as a straighter long edge, inside the tolerance that its own fit accepts. The witness cannot see it, because a resampled vertex uses the same affine as every other vertex.

The buffer is drawn at the probe scale and read at every larger fit, which is the same resampling gap in the other direction. `PROBE_REFINEMENT` closes it: the probe walk resolves a curve finer than the default of d3. The buffer then holds at least what the canonical frame earns. A quantized atlas costs nothing more, because its vertices already sit inside the finer tolerance. The frame is bit-identical, and every path is byte for byte that of the direct walk. A passed instance gets its precision back after the walk, as `fitProjectionWidth` returns a clip that it borrows.

Two cases stay on the direct walk, because the arithmetic, not the buffer, fails on them. `d3-geo` draws a point or a line from more than the ring vertices that the buffer records. The buffer returns either one closed through its vertices, which is a different shape. A projection with an explicit `clipExtent` cuts in frame units that stay fixed when it scales. One buffer at two fits then keeps two different pieces of the geography. The built-in projections report no clip extent, and `albers-usa` has no such method.

`regionPaths` is the fallback for each refusal, so geography that the buffer declines draws the same map on the slow path. `canonicalFit` keeps the walk pass for that geography and those projections.

The emit costs formatting more than arithmetic. At one decimal, each value divides to a tenth that no double holds exactly. Each conversion then takes the shortest-representation search of V8. The emit therefore formats from the integer that `Math.round` already produced, and places the decimal point itself. The strings are byte for byte the same.

The map reaches the measured fit with a transform, not with a second projection. The measured fit is a scale and a translation on the canonical fit. The paths of the first commit therefore move to the measured frame under one group transform, with no emit and no rewrite of `d`. The overlays, the chrome, and every hit target apply the same transform to each position. They stay in the measured units, and the two coordinate systems land on the same device pixels.

The transform is the measured fit itself (`measuredMapFit`, `map-projection/fit`). The fitted projection is the canonical one at each box, for a named projection and for a passed d3 instance. The region layer, the projector, the inverse, and the chrome therefore read one value, and no reader holds a second projection.

The inherited seam and the selection ring divide by the scale of the frame on top of the zoom scale. One device pixel is the product of the two. [`map-plat-zoom`](../../__tests__/modules/map-plat-zoom.test.tsx) asserts that product, not the value of either factor alone. The canonical paths carry one decimal at a frame 1000 wide. A drawn coordinate lands within 0.08 px of the emitted one at 800 wide, and within 0.24 px at 3,840. Above 1,000 px, the canonical strings are also the smaller payload.

A geography that the buffer declines holds a point or a line. Its canonical paths come from the direct walk, and the layer carries them under the same transform. d3 draws a point at a radius in the units of the path. A point of such a geography therefore scales with the frame, as it scales with the zoom. A mark (`MapPoint`) draws a point at a fixed size.

A passed d3 instance belongs to the consumer, and the module cannot copy it. The module fits each projection once and never fits it again. A refit in place gives the canonical fit and the measured fit one identity. The React Compiler keys its memos on identity, so it keeps the first projector, and the dots stay in the canonical frame.

[`map-passed-projection`](../../__tests__/modules/map-passed-projection.test.tsx) holds that rule under `test:compiler`. [`map-plat-resize`](../../__tests__/browser/geometry/map-plat-resize.test.tsx) holds the transform across a resize.

Every map walks its geography once, whatever it draws, because the fit comes from that walk. The map keeps the buffer, which trades memory for the bounds walk. [`boundary/map-path-deferral`](../../__tests__/boundary/map-path-deferral.test.tsx) counts `probeCanonicalFit` at one for a fixed aspect and for the auto aspect. A second call means that the fit measures its own bounds again.

### File layout

`map-plat.tsx` holds the props type and the assembly. The parts stand in files of their own: the geometry (`use-map-shape`), the join of rows to bins (`use-map-region-readout`), and the data union (`map-region/data`). The legend resolution (`map-legend/plan`), the pointer state (`map-hover-provider`), the shell (`map-frame`), and the legend box (`map-legend-region`) stand alone too. The paint table of the region layer (`map-region/paint`) and the lit overlay (`map-regions-lit`) stand apart from `map-regions.tsx`. `map-plat.tsx` stays the largest file in the module, because the props doccomment that CONVENTIONS §12.1 requires is long.

The scale-bar slider lives in [`chart/engine/chart-legend/range-legend.tsx`](../chart/engine/chart-legend/range-legend.tsx), beside the placement resolver that both color-scaled charts read. [`map-range-legend.tsx`](map-range-legend.tsx) is the map wrapper over it, and no barrel exports the slider.

The module root is the React shell: the components, the hooks, the contexts, and the barrel. A few private pure helpers sit beside their one consumer there (`valueColumnHeader`, `bridgeRegionIdentity`, `regionDelegate`), as in the grid and chart modules. The engine holds every rule that more than one reader shares.

## Engine: the substrate

Every framework-free rule the map holds lives in [`engine/`](engine), a d3-shaped functional core laid out like the grid, chart, and query engines. Leaves at its root hold what earns no directory: `types.ts` (the module's vocabulary, geographic `LngLat` beside frame `MapPoint2D`), `map-constants.ts`, `map-motion.ts`, `map-geofence.ts` (the circle-to-polygon math, which is one kind), and `map-outline.ts` with `map-outline-data.ts` (the outlines that the skeleton draws). Under them, concept directories carry the rest: `map-geometry/` (the TopoJSON decode, the ring winding, the region paths and centroids, the projected buffer they are emitted from, the mark paths and their anchors, the frame chrome, the bounding-box grid a position is located over, and the cross-instance memos), `map-projection/` (resolution, the two-stage fit, the aspect and sizing policy, the frame-to-client conversion and its inverse), `map-cluster/` (the grouping pass and the rule it settles to, the size grade, the spatial grid, the spherical readout), `map-region/` (the data union, the region identity, the categorical and the numeric scale, the layer paint table), `map-overlay/` (the ledger entry, the readout, the pick), `map-hover/` (the hover-target algebra and the `data-*` anchor readers), `map-keyboard/` (the stop list, and the cursor the keys drive across it), `map-zoom/` (the view transform, its constraint, the ceiling a prop asks for, and the gestures that move it), `map-legend/` (the plan and the entries), `map-routing/` (the shared result, the failure taxonomy, the request signal and the send, the OSRM client), and `map-zip/` (the territory language and the matcher it compiles to, the dissolve, and the frame a territory resolves to).

Two files split by layer rather than by concept, so the engine owns its own vocabulary. `context.ts` kept the React contexts and gave up the target comparisons and the anchor readers, which need no React; `use-map-legend-registry.ts` kept the hook and gave up the `MapOverlayEntry` shape its ledger holds. The cursor, the readout, and the selection resolve against those without reaching back at the module root.

The layering invariant is grid's, verbatim: no `'use client'`, no runtime `react` / `motion` / `@dnd-kit` / `@floating-ui` imports, no runtime imports from the module root, no `index` barrel (the engine is imported file-by-file).

No reach outward stands: the engine names nothing from the module root, at runtime or in a type. The range bar's shape is the engine's own (`map-legend/plan.ts`'s `MapLegendRange`), which [`map-range-legend.tsx`](map-range-legend.tsx) takes as its props, so the arrow runs view → engine.

Two suites make the layout a gate rather than a convention. [`module-filename-boundary.test.ts`](../../__tests__/boundary/module-filename-boundary.test.ts) enforces the names (`map-*` directly under `engine/`, short kind names inside a `map-<concept>/` directory, no nesting), and [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) enforces the four rules above for each pure engine at once. That test replaces the greps this section used to carry, and the same paragraph in the grid and query ROADMAPs: a rule that several documents asserted in prose is now asserted once in code, and it carries self-checks proving each rule can still fail.

The public surface was unchanged across the move: every barrel export keeps its name, and every function moved verbatim, so `ChoroplethChart`, the docs demo, the a11y corpus, and the benchmark suites read the same map they did before.

## Backlog

In priority order. Each entry names the gap, the shape of the fix, and where it lands.

- **A GeoJSON territory keeps its interior seams.** `zipArea` dissolves a topology exactly and cannot dissolve a feature collection at all, because a collection repeats each shared border as two independent runs of coordinates and reconciling them needs polygon clipping the module does not carry. A GeoJSON-sourced territory therefore draws as a mesh of codes rather than as one shape, with every interior border stroked: the honest reading of the input, and not the one a broker wants. `dissolved: false` reports it, so a caller can say so. Two shapes would fix it: a clipping dependency (~15 KB, and a new class of floating-point failure on shared borders that do not quite agree), or a `topojson-server` pass that builds a topology from the collection once per atlas and then merges through the exact path. The second stays in the arc index, and costs a one-off build rather than a per-territory clip. Neither is worth doing before a consumer has a ZCTA source that is GeoJSON only.

- **Coverage by county, as a measure rather than a frame.** The counties under a territory draw neutral: they are the split, and the fence carries the coverage. A broker also asks the other question (which counties do I cover, and how much of each?), which the frame pass has most of the parts for and deliberately does not answer. Counting by codes centered in a county is exact against the data and needs the placement to run over every code in the atlas rather than over the covered ones, which is the pass this design was scoped to avoid; counting by land area needs the clipping above. Ship the count behind a prop, with the denominator memoized on the atlas pair the way the grid already is, and say in the readout that a count is of codes centered in a county: real code-to-county relations are many-to-many, and one centroid names one county.

- **A ZCTA atlas in the demo.** `useMapCoverage` ships tested and undemonstrated, because the docs have no ZIP geometry to draw and the module will not invent any. The rule the other map demos hold (atlas data stays out of the package, and a demo imports it from a dev dependency as a JSON module, which the docs build bundles) has no ZCTA equivalent to hold it with: npm carries no ZCTA atlas package, the Census-derived national file is ~105 MB of GeoJSON across 33,092 codes, and one state is ~30 MB. Three shapes, in order of how much they ask of the repository: publish a simplified ZCTA TopoJSON as a dev dependency and follow `us-atlas`'s path exactly; commit one ZIP3's worth of real geometry as a fixture, which is small (~56 codes) and breaks the no-atlas-data rule; or fetch a remote file in the demo alone, which makes the docs page depend on a third-party host at run time. The first is the only one that leaves the rule intact. Until then the hook's own `@example` and [`map-coverage`](../../__tests__/modules/map-coverage.test.ts) are what document the call shape.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`../chart/ROADMAP.md`](../chart/ROADMAP.md) (the foundation this builds on) · [`../../../docs/MODULES.md`](../../../docs/MODULES.md).
