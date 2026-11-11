'use client'

import { useComposedRefs } from 'motion/react'
import {
	Children,
	type ComponentProps,
	type CSSProperties,
	type ReactNode,
	type Ref,
	useCallback,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useMeasuredWidth } from '../../hooks/use-measured-width'
import { useReportedChange } from '../../hooks/use-reported-change'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useStableValue } from '../../hooks/use-stable-value'
import type { IntlShape } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { useLocale } from '../../providers/locale/context'
import type { MapSeriesColor } from '../../recipes/kata/map'
import type { AccessibleName } from '../../types/accessible-name'
import { getOrCompute } from '../../utilities/get-or-compute'
import { sameElements } from '../../utilities/same-elements'
import { legendAside } from '../chart/engine/chart-legend/schema'
import type { ChartItemClick } from '../chart/engine/types'
import {
	MapPlatContext,
	type MapPlatContextValue,
	MapZoomScaleContext,
	useMapZoomView,
} from './context'
import { createDotPool } from './engine/map-cluster/pool'
import { clusterRadius } from './engine/map-cluster/radius'
import { createClusterStore, sameClusterEntries } from './engine/map-cluster/sets'
import { MAP_FIT_INSET } from './engine/map-constants'
import { cachedRegionCentroids } from './engine/map-geometry/cache'
import { graticuleStep } from './engine/map-geometry/chrome'
import { regionSweep } from './engine/map-geometry/region'
import type { MapHoverTarget, MapOverlayTarget } from './engine/map-hover/target'
import { createStopMoves, entryTarget, mapStops } from './engine/map-keyboard/stops'
import { groupLegendId, legendItems, overlaySwatchClass } from './engine/map-legend/items'
import { planLegend } from './engine/map-legend/plan'
import { type MapOverlayAnchor, sameAnchors } from './engine/map-overlay/entry'
import { targetParts } from './engine/map-overlay/selection'
import { overlaySlotColors } from './engine/map-overlay/slots'
import { createSpareStore } from './engine/map-overlay/spare'
import { regionGroupId } from './engine/map-region/category'
import type { MapCategoricalData, MapNoData, MapNumericData } from './engine/map-region/data'
import { defaultRegionId } from './engine/map-region/identity'
import { NO_REGION_CLAIM } from './engine/map-region/spare'
import type { MapZoomInput } from './engine/map-zoom/input'
import { mapZoomSettings } from './engine/map-zoom/input'
import type { MapTransform } from './engine/map-zoom/transform'
import { transformAttribute } from './engine/map-zoom/transform'
import type {
	LngLat,
	MapAspectRatio,
	MapFeature,
	MapGeography,
	MapOverlaySelection,
	MapProjection,
} from './engine/types'
import { MapChrome } from './map-chrome'
import { MapFrame, MapPlotRegion } from './map-frame'
import { MapLegendRegion } from './map-legend-region'
import { mapMessages } from './map-messages'
import { MapRegions } from './map-regions'
import { MapTable } from './map-table'
import {
	describeMapTarget,
	MapTooltip,
	type MapTooltipEntry,
	type MapTooltipProps,
	nameMapTarget,
} from './map-tooltip'
import { useMapLegendRegistry } from './use-map-legend-registry'
import { useMapRegionReadout } from './use-map-region-readout'
import { useMapShape } from './use-map-shape'
import { useMapToggle } from './use-map-toggle'

/**
 * The props of {@link MapPlat} that each form of its region data shares.
 * Requires an accessible name: the plot is `role="img"`. The name goes to the
 * plot, and the root `<div>` takes the rest.
 *
 * @internal
 */
type MapPlatBaseProps = AccessibleName &
	Omit<ComponentProps<'div'>, 'ref'> & {
		/**
		 * The geometry to draw: a TopoJSON topology or a GeoJSON feature
		 * collection. The package ships no atlas data: pass `us-atlas`,
		 * `world-atlas`, or any equivalent source. Optional so a lazily fetched
		 * atlas passes straight through. `null` or omitted reserves the frame and
		 * paints nothing. The geography then draws in the moment it arrives, with no
		 * `geography ? <MapPlat /> : null` guard at the call site.
		 */
		geography?: MapGeography | null
		/** Which topology object to draw; defaults to the topology's first key. */
		geographyObject?: string
		/**
		 * How the globe projects onto the frame. Pass `'albers-usa'` for US state
		 * maps: it places Alaska and Hawaii as insets. Pass `'identity'` for an
		 * atlas that is already projected, such as `us-atlas`
		 * `states-albers-10m`. That atlas draws the map that `states-10m` draws
		 * under `'albers-usa'`, for a small part of the cost. Marks, coverage,
		 * and the graticule do not apply under `'identity'`. A passed d3 instance is fit to the geography one time; a resize
		 * scales that fit and does not refit the instance.
		 * @defaultValue 'mercator'
		 */
		projection?: MapProjection
		/**
		 * A region's identity, matched against each row's `regionKey` value.
		 * @defaultValue `String(feature.id ?? feature.properties.name)`
		 */
		regionId?: (feature: MapFeature) => string
		/**
		 * A region's tooltip and table name.
		 * @defaultValue `String(feature.properties.name ?? feature.id)`
		 */
		regionLabel?: (feature: MapFeature) => string
		/**
		 * Frame width in px. Omitted, the map measures its container and fills
		 * it; pass a width for a fixed frame (and for deterministic SSR output).
		 * The frame is never narrower than 12rem (`min-w-48`), whatever its
		 * container or this prop asks for.
		 */
		width?: number
		/** Frame height in px; wins over `aspectRatio` when set (a free-form fixed height). */
		height?: number
		/**
		 * The ratio of the width to the height. `'auto'` takes the fitted
		 * geography's own projected proportions. A number or `"4/3"` string fixes
		 * one, and `false` fills the container's height. Before the box is
		 * measured, as on the server, the map draws its canonical fit scaled to
		 * meet the box. It draws in the place where the measured fit draws it.
		 *
		 * With `false`, the container must have a definite height, such as a fixed
		 * height or a grid area. A flex item that grows in a column of auto height
		 * is not one, so put the map in a box with `grid` there.
		 * @defaultValue 'auto'
		 */
		aspectRatio?: MapAspectRatio
		/**
		 * Rules meridian and parallel hairlines under the geography, on the chart's
		 * gridline ink. `true` takes d3-geo's ten-degree step, and a number sets that
		 * step in degrees. The lines draw beneath every region, and answer no
		 * pointer. A region fill covers the ones crossing it, so the graticule reads
		 * around the geography and not across it.
		 *
		 * The projection's own frame bounds the lines, so a composite draws one
		 * graticule rather than three. `'albers-usa'` rules the main map and leaves
		 * the Alaska and Hawaii insets clear. Each inset would otherwise fill with
		 * fragments at its own angle.
		 *
		 * The lines cover the globe whatever the geography frames, and the frame clips
		 * the rest. A regional map's graticule therefore costs what a world map's
		 * does. A step under one degree is floored there: below it the pass draws
		 * millions of points the frame would only clip away.
		 *
		 * Chrome rides the fit the geography sets, so it appears with the geography:
		 * a plat still waiting for its atlas rules nothing.
		 * @defaultValue false
		 */
		graticule?: boolean | number
		/**
		 * Outlines the globe's own edge, on the chart's axis-baseline ink: the frame
		 * that a whole-world map closes itself with, under `'mercator'` or
		 * `'equal-earth'`. A composite projection has no single edge, so
		 * `'albers-usa'` outlines its own clip frames instead: the lower-48 box and
		 * the two inset boxes.
		 * @defaultValue false
		 */
		sphere?: boolean
		/**
		 * Shows the readout naming the pointed region or overlay. It also gates
		 * keyboard navigation, which the readout is the whole output of. The
		 * tooltip is `aria-hidden`, so a polite live region speaks the readout of
		 * each stop that an arrow key moves the cursor onto. A pointer hover speaks
		 * nothing. A touch shows no readout. Turned off, the plot region takes no
		 * tab stop and stays a plain `role="img"` leaf, and the data table carries
		 * the values alone.
		 * @defaultValue true
		 * @remarks It asks for a readout rather than asserting one. A map no row
		 * matches and no mark draws on has nothing to name, so it takes no tab stop
		 * whatever this prop says. A pick or a zoom still earns one, because each is
		 * an output of its own. On that stop, with the readout off, each arrow key
		 * speaks the name of the stop alone.
		 *
		 * With the readout on, a region stop that reads nothing speaks its name
		 * when the map has {@link onRegionClick}, because Enter picks that region.
		 * An unmatched region raises no tooltip and takes no emphasis. Its table
		 * row shows the gap mark as its value.
		 */
		tooltip?: boolean
		/**
		 * Names every region the pointer rests on, not only the ones a row matched.
		 *
		 * A region with no row has nothing to say about the data. It is still a shape
		 * the reader is pointing at, and on a navigation map its name is the whole
		 * readout. A navigation map is one the reader picks a region from rather than
		 * reads a measure off.
		 *
		 * Without this the tooltip stays away there. A backdrop map drawing a hundred
		 * unmatched regions must not raise an empty tooltip over each of them. That
		 * silence is the default, and this is how a map with names worth saying asks
		 * for them.
		 *
		 * The name is the one {@link regionLabel} resolves, which the geography
		 * carries whether or not any row matched. A matched region is unaffected: it
		 * reads out its category or its value as it always did. A toggled-off
		 * category falls back to the name too, so a legend toggle dims a region
		 * rather than muting it.
		 *
		 * It earns the region layer its pointer tracking, so a map with no `data` at
		 * all still reads out under this prop.
		 * @defaultValue false
		 */
		nameRegions?: boolean
		/**
		 * Lets the reader zoom and pan the drawn geography. Shift and a wheel zoom
		 * about the pointer, a drag pans, and two touches pan and pinch. The plot's
		 * own tab stop takes `+`, `-`, and `0`, so the keyboard reaches every scale
		 * the pointer does. Each of these keys speaks the result through a polite
		 * live region. `+` and `-` speak the new scale as a percent of the fit,
		 * such as `Zoom 160%`, and `0` speaks `Zoom reset`. `true` takes the
		 * default ceiling, a number sets its own, and the object form adds
		 * `modifier` (below).
		 *
		 * It is a transform over the fitted geography, not a refit. The projection
		 * places the regions once and the layer moves what it placed, so a gesture
		 * costs one attribute write rather than reprojecting every path.
		 *
		 * Every mark spec rides device pixels through it, so zooming in shows more
		 * ground rather than a bigger picture of the same. Region seams and route
		 * lines stay hairlines. Dots and their hit targets keep their size, and a
		 * summary's count stays inside the dot it sits in.
		 *
		 * `MapPoints` regroups as it goes, because a merge distance is a pixel
		 * distance. The rounds a national frame summarizes separate into their own
		 * dots as the view closes on them.
		 *
		 * The view returns to the fit whenever the geography changes, since a new
		 * geography frames itself. Zooming out never goes past that fit, and a pan
		 * never carries the geography off the frame.
		 *
		 * Nothing on the map answers the pointer for the length of a gesture. A
		 * scaling frame sweeps the geography under a stationary pointer. Without
		 * that, a wheel drags the readout across every region and dot that it
		 * crosses. A wheel reports no end, so the end is read from a gap in the
		 * notches.
		 *
		 * @defaultValue false
		 * @remarks The page keeps every wheel the reader does not aim at the map.
		 * Shift arms it. Held, the wheel zooms and the page stays put; unheld, the plot
		 * scrolls past like anything else. Touch keeps the same bargain, with one
		 * finger scrolling and two panning and pinching.
		 *
		 * That way a map dropped into a page cannot swallow a scroll. That is the
		 * failure worth defaulting against, because it is silent, and it strands the
		 * reader rather than the author.
		 *
		 * `{ modifier: false }` arms the wheel outright, for a map that owns its
		 * screen. A plain wheel zooms, and the gesture goes back to the page only
		 * where the view can no longer move. The plot claims touch, so one finger
		 * pans. Reach for it rarely.
		 */
		zoom?: MapZoomInput
		/**
		 * Fires when the view transform changes, with that transform: `x` and `y` pan
		 * the fitted geography in frame units, `k` scales it.
		 *
		 * The plat owns that transform outright, and nothing reported it, so the
		 * package's own tests read it off the `transform` attribute. Use it to mirror
		 * one map onto another, to persist a view, or to load detail for the visible
		 * ground. It fires on every wheel notch and every tracked pointer move of
		 * a pan, like `ResizableGroup.onSizesChange`, so throttle what you drive from
		 * it. A map with no `zoom` never transforms and never reports. The refit that
		 * follows a new geography reports too, because the view did move.
		 */
		onViewChange?: (view: MapTransform) => void
		/**
		 * Lets the drawn regions answer the pointer at all.
		 *
		 * `false` makes the layer inert: no readout, no pick, no menu. The marks
		 * standing on it keep their whole target, since a dot only narrows to give
		 * ground back to something that can answer with it.
		 *
		 * For a map drilled into one region, which is the ground its marks stand on
		 * and has nothing left to say. It beats `nameRegions`, a matched `data` row,
		 * and a click handler, all of which otherwise earn the layer its handlers. A
		 * caller therefore states the layer is off in one place, rather than
		 * withdrawing each of them.
		 *
		 * Say it here rather than with a CSS `pointer-events` override, which the plat
		 * cannot see. The marks otherwise go on paying a narrowed target for ground
		 * the layer can no longer answer with.
		 *
		 * @defaultValue true
		 * @remarks It withdraws rather than grants, the way `tooltip` does. `true` is
		 * the default and asserts nothing, so a map whose regions earn nothing answers
		 * with nothing whatever this says. Only `false` is an instruction.
		 */
		regionPointer?: boolean
		/**
		 * Animates the map in on mount. The neutral geography paints at once, then
		 * region color washes in. Routes and zone outlines draw themselves. Points
		 * pop in by registration order. A marker pops its start pin, draws its line,
		 * then pops its end pin. The geography itself never fades, so the map is
		 * legible immediately and only the data animates on.
		 *
		 * Honors `prefers-reduced-motion` through the `ReducedMotion` primitive and
		 * the color wash's `motion-reduce` fallback. Off by default: a static map
		 * stays a plain-SVG tree with no motion runtime work.
		 *
		 * `true` washes every region in at once. `'sweep'` washes the regions in
		 * from east to west, by where each centroid draws, so the color crosses the
		 * map as one wave. The sweep is the reveal's alone: a later legend toggle
		 * washes at once.
		 * @defaultValue false
		 */
		animate?: boolean | 'sweep'
		/**
		 * Receives the root `<div>` of the map, the frame that holds the legend, the
		 * plot, and the data table.
		 */
		ref?: Ref<HTMLDivElement>
		/**
		 * Fires when a click lands on a region, with the region's identity and its
		 * feature index. The whole shape is the target, the same hit the tooltip
		 * reads. Identity is the `regionId` value the rows match against, so a click
		 * keys straight into the caller's own data. It is also what a TopoJSON
		 * consumer would otherwise re-decode the topology to recover. The
		 * cross-filter hook the charts' `onCategoryClick` is, and the same shape.
		 *
		 * Set, the region layer carries a pointer cursor and every region answers a
		 * click, unmatched ones included, unless {@link isRegionDisabled} disables
		 * it. The keyboard reports through the same
		 * handler. The plot region is one tab stop, and Enter or Space picks the
		 * region its arrow cursor sits on. A pick therefore carries the same identity
		 * whichever input made it.
		 *
		 * A touch picks with a double tap. One tap picks nothing and shows no
		 * tooltip, because a touch reads nothing from the map.
		 */
		onRegionClick?: ChartItemClick
		/**
		 * Whether a region takes no click, by the identity and feature index
		 * {@link onRegionClick} reports. Use it for a region that opens nothing,
		 * such as a state with no race. A disabled region takes no pointer cursor
		 * and no click hover, and a click, a double tap, or Enter on it reports
		 * nothing. Its readout stays: a disabled region with a row still shows its
		 * tooltip and its hover. With no {@link onRegionClick}, this does nothing.
		 *
		 * Omitted, every region answers a click.
		 */
		isRegionDisabled?: (id: string, index: number) => boolean
		/**
		 * Fires when a right-click lands on a region, with the same identity and
		 * feature index {@link onRegionClick} reports. It suits a context menu that
		 * wraps the map and needs to name the region it opened over. The map's hover state
		 * is provider-isolated, so a pointer move repaints only the tooltip. A menu
		 * outside that provider therefore cannot read the pointed region, and must be
		 * told instead.
		 *
		 * Takes no pointer affordance and never prevents default: the menu still
		 * opens, and the cursor stays as {@link onRegionClick} left it. See
		 * {@link MapRegionsProps.onRegionContextMenu}.
		 */
		onRegionContextMenu?: (id: string, index: number) => void
		/**
		 * Fires when the reader holds a region long enough to read as intent to open
		 * it, with the identity and index {@link onRegionClick} reports. It is the
		 * moment to warm what the pick will need, so the data is there by the click.
		 * That covers a `queryClient.prefetchQuery` for the county atlas a drill-down
		 * opens, and the rows a detail panel reads. `Tab`'s `onPreload`, keyed by region.
		 *
		 * The pointer and the keyboard cursor both signal it. The arrow keys move the
		 * same hover target a pointer does, so a reader navigating a map by keyboard
		 * warms what a pointing one warms.
		 *
		 * It is latched per region for as long as the geography stands, so sweeping
		 * back over a warmed region reports nothing. A new `geography` re-arms every
		 * region, because a feature index means nothing against features it did not
		 * come from.
		 *
		 * The callback owns the work: the map stays agnostic to what loads, and
		 * never waits on it. Warming is an optimization and nothing more: it takes
		 * no cursor, and every region it warms would have loaded on the click
		 * regardless. It earns no tab stop either, so the keyboard half rides
		 * whatever stop a readout, a pick, or a zoom already earned. A map carrying
		 * this prop alone is drilled by some control beside it, and that control is
		 * what a keyboard reader navigates.
		 *
		 * @remarks
		 * Regions sit edge to edge, so the report is held behind a short dwell.
		 * A pointer traveling to the far side of the map crosses every region on the
		 * way. Warming each would spend a dozen requests to answer one. Only
		 * a region the reader rests on warms, and leaving before the dwell elapses
		 * warms nothing.
		 *
		 * Unlike the pointed emphasis, this does not ask whether the region carries
		 * data, because a region with no row still opens into something. A gate on
		 * the readout would leave a plain navigation map reporting nothing. Such a
		 * map is a geography and this prop, with no `data`.
		 */
		onRegionPreload?: (id: string, index: number) => void
		/**
		 * The selected region, by the identity {@link onRegionClick} reports. That is
		 * the `regionId` value, so the pick a click hands the caller comes straight
		 * back as the pick to draw.
		 *
		 * The map paints it and holds no selection state of its own. Whatever owns
		 * the value stays the single source of truth, whether that is the click, a
		 * Select beside the map, or a route parameter. The two halves of a clickable
		 * map therefore can't disagree about what is picked.
		 *
		 * The selected region takes a foreground-ink outline above the region layers,
		 * so it survives the hover recede. A pick made before the pointer arrived is
		 * still marked while the pointer isolates elsewhere. It never dims the rest
		 * of the map, which would read as broken for as long as the pick stood. Overlay children still draw over it, as they do over every
		 * region. The region's row in the data table reads as the current one, so
		 * the selection is in the accessible readout, not the pixels alone.
		 *
		 * An id matching no region draws no ring; `null` (or omitting the prop)
		 * selects nothing.
		 */
		selectedRegion?: string | null
		/**
		 * Marks the region VALUES as still loading: the atlas is drawn and its numbers
		 * are not in yet.
		 *
		 * The shapes pulse while it holds, and a reader who asked for reduced motion
		 * gets a standing dim in place of the pulse. A choropleth with no data takes
		 * the no-data fill on every region, and a fully gray map reads as "nobody
		 * covers anywhere". That is a statement about the subject rather than about a
		 * request in flight.
		 *
		 * It is distinct from an absent `geography`, which reserves the frame and
		 * draws nothing at all. Here there is something to look at, and only the paint
		 * is still loading.
		 *
		 * Say it in words too. This is nothing at all to a screen reader, so a caption
		 * or a status line remains the load's actual disclosure. This only stops the
		 * drawn map lying in the meantime.
		 * @defaultValue false
		 */
		loading?: boolean
		/**
		 * The selected overlay mark, in the pair its reporters hand back (see
		 * {@link MapOverlaySelection} for how the pair reads). It is `selectedRegion`
		 * for the marks drawn over the geography, on the same terms. The map paints
		 * the pick and holds no selection state of its own, so whatever owns the
		 * value stays the single source of truth.
		 *
		 * The picked mark takes a foreground-ink halo behind it, outside the hover
		 * recede. A pick made before the pointer arrived is therefore still marked
		 * while the pointer isolates elsewhere. Behind rather than over: the mark's own color
		 * reads through, as a ringed region keeps its fill. The stop's row in the
		 * data table reads as the current one, so the selection is in the accessible
		 * readout and not the pixels alone.
		 *
		 * A pair naming no drawn stop haloes nothing; `null` (or omitting the prop)
		 * selects nothing.
		 */
		selectedOverlay?: MapOverlaySelection | null
		/**
		 * Controlled legend emphasis: the legend id whose marks hold while every
		 * other group dims (what hovering a legend entry sets on its own). Each
		 * region it holds also takes an outline, so a region at the surface end of
		 * a sequential ramp reads apart from the dimmed ones. On a numeric bin the
		 * outline is dark on a light fill and white on a dark fill.
		 *
		 * Passing it hands that state to the caller, so ONE legend rendered outside
		 * the plat can emphasize across SEVERAL of them at once. Give each plat
		 * `legend={false}` and this prop, and drive it from whatever holds the shared
		 * legend. That is any control that emits a bin id ({@link binEmphasisId}),
		 * for example a range legend that the caller renders.
		 *
		 * The ids only line up across plats when the bins do. For the numeric mode
		 * that means `'linear'` binning with the same `colorRange`, `bins`, and an
		 * explicit `colorDomain`. Without the domain each plat bins to its own
		 * extent, and an id from one means nothing to another. Quantile bins
		 * always cut each plat's own data, so they never line up.
		 *
		 * Omitted, the plat owns the state and its own legend drives it. A `null`
		 * keeps it controlled with no emphasis (CONVENTIONS §7.3).
		 */
		emphasis?: string | null
		/**
		 * Fires when the plat's own legend changes its emphasis, with the legend id
		 * that it emphasizes, or `null` when the emphasis clears.
		 *
		 * The plat's legend writes that state on hover and on focus, and reported
		 * nothing. A caller could therefore either read the emphasis or keep the
		 * plat's own legend behavior, never both. Passing
		 * {@link MapPlatProps.emphasis} silently takes the plat's legend out of the
		 * decision. This reports what that legend wants whether or not `emphasis` is
		 * controlled, which is the other half of the §7.3 triad. It carries only ids
		 * the legend actually published, so a stale id from an unmounted overlay
		 * never arrives.
		 */
		onEmphasisChange?: (emphasis: string | null) => void
		/**
		 * Fires when the plat's legend switches a group on or off, with the set of
		 * legend ids that it has switched off.
		 *
		 * Observation only. The legend owns the set and there is no `hidden` option
		 * to pair with. Hiding a group changes what the reader sees and reported
		 * nothing, so the only readout was the DOM. Use it to mirror one plat's
		 * legend onto another, or to persist what a reader switched off. The ids are
		 * the legend's own: a region category or an overlay entry.
		 */
		onHiddenChange?: (hidden: ReadonlySet<string>) => void
		/**
		 * Overlay marks: {@link MapRoute}, {@link MapPoint}, {@link MapPoints},
		 * {@link MapMarker}, {@link MapGeofence}. They draw in the order they are
		 * given, so a zone drawn before the marks it holds sits behind them.
		 */
		children?: ReactNode
	}

/** Props for a {@link MapPlat} that colors each region by a categorical field. */
export type MapPlatCategoricalProps<T> = MapPlatBaseProps & MapCategoricalData<T>

/** Props for a {@link MapPlat} that shades each region along a ramp by a numeric field: a choropleth. */
export type MapPlatNumericProps<T> = MapPlatBaseProps & MapNumericData<T>

/** Props for a {@link MapPlat} with no region data. It draws its geography in the neutral fill, as a backdrop for overlays. */
export type MapPlatNoDataProps = MapPlatBaseProps & MapNoData

/**
 * Props for {@link MapPlat}: one of {@link MapPlatCategoricalProps},
 * {@link MapPlatNumericProps}, and {@link MapPlatNoDataProps}. Requires an
 * accessible name: the plot is `role="img"`.
 */
export type MapPlatProps<T = never> =
	| MapPlatCategoricalProps<T>
	| MapPlatNumericProps<T>
	| MapPlatNoDataProps

/**
 * The animated wrapper: `ReducedMotion` around the marks; static marks render
 * bare. The reveal plays when the marks mount, at the beat the SVG first gains
 * a width, and never replays. A resize-keyed remount would unmount the overlay
 * children, whose cleanup unregisters their legend entries. The legend churn
 * that follows can feed a resize back into the plot and loop. That remount is
 * the chart module's generation key.
 *
 * @internal
 */
function MapMarksLayer({ animate, children }: { animate: boolean; children: ReactNode }) {
	if (!animate) return <>{children}</>

	return (
		<ReducedMotion>
			<g data-slot="map-marks">{children}</g>
		</ReducedMotion>
	)
}

/**
 * The zoom layer: one transformed group over the whole drawing, mounted only
 * where the plat zooms. A static map keeps the plain-SVG tree it had, the way
 * it keeps one without {@link MapMarksLayer}.
 *
 * Everything under it draws in frame units already. The regions, the marks, and
 * their hit shapes therefore all inherit the transform, and none of them is
 * reprojected.
 *
 * It publishes the scale beside the transform, because the two are one fact:
 * what the layer stretches, a mark divides back out ({@link MapZoomScaleContext}).
 * Mounting the provider here rather than over the whole plat keeps both halves
 * of the zoom's contribution to the tree behind one condition.
 *
 * It stops answering the pointer for the length of any view gesture: a pan, a
 * pinch, or a wheel that has not settled. The geography traveling under a held
 * pointer therefore raises no readout and fires no crossing. A gesture moves the
 * map, and nothing else. Without this a wheel would drag a tooltip across every
 * dot the scaling frame swept past the pointer.
 *
 * @internal
 */
function MapZoomLayer({ children }: { children: ReactNode }) {
	const zoom = useMapZoomView()

	if (zoom === null) return <>{children}</>

	return (
		<MapZoomScaleContext value={zoom.unitsPerPixel}>
			<g
				data-slot="map-zoom"
				transform={transformAttribute(zoom.transform)}
				pointerEvents={zoom.gesturing ? 'none' : undefined}
			>
				{children}
			</g>
		</MapZoomScaleContext>
	)
}

/** The data table's value-column header: the name of the colored field, else the localized "Detail". A data key is never a header. @internal */
function valueColumnHeader(intl: IntlShape, colorName: string | undefined): string {
	return colorName ?? intl.formatMessage(mapMessages.detail)
}

/**
 * Adapts a public region handler to the index-only shape {@link MapRegions}
 * delegates in, so the click and right-click reporters resolve identity the one
 * way. A public handler reports identity beside the index.
 *
 * `noUncheckedIndexedAccess` types the lookup as optional. An index outside the
 * ids would be a layer and geometry disagreement, so it reports nothing rather
 * than an empty identity.
 *
 * @internal
 */
function bridgeRegionIdentity(
	report: ((id: string, index: number) => void) | undefined,
	regionIds: string[],
	disabled?: readonly boolean[],
): ((index: number) => void) | undefined {
	if (report === undefined) return undefined

	return (index: number) => {
		const id = regionIds[index]

		if (id !== undefined && disabled?.[index] !== true) report(id, index)
	}
}

/**
 * The preload reporter, by feature index, wrapped in the latch a warmed region
 * keeps. The pointer crosses back over a region as freely as it first arrived,
 * and the second crossing has nothing left to warm. `undefined` when nothing
 * asked to be told of intent.
 *
 * The reporter keeps one identity, and it reads `report`, `regionIds`, and
 * `features` when the dwell fires. An inline `onRegionPreload` or `regionId` is
 * a fresh identity every render. A latch keyed on either warms a region again
 * that the reader already warmed. It reports through
 * {@link bridgeRegionIdentity}, so a preload, a click, and a menu resolve the
 * identity of a region one way.
 *
 * The latch holds the features it belongs to, so it belongs to the geography: a
 * new `geography` re-arms every region, and nothing else does. It is checked at
 * the event, not built in a memo. A set that a memo builds with no input from
 * the geography is a constant to the React Compiler, which then never re-arms it.
 *
 * @internal
 */
function useRegionPreload(
	report: ((id: string, index: number) => void) | undefined,
	regionIds: string[],
	features: MapFeature[],
): ((index: number) => void) | undefined {
	const latch = useRef<{ features: MapFeature[]; warmed: Set<number> } | null>(null)

	const preload = useStableEvent((index: number) => {
		let current = latch.current

		if (current?.features !== features) {
			current = { features, warmed: new Set() }

			latch.current = current
		}

		if (current.warmed.has(index)) return

		current.warmed.add(index)

		bridgeRegionIdentity(report, regionIds)?.(index)
	})

	return report === undefined ? undefined : preload
}

/**
 * The overlay pick, held on its primitives rather than on the prop's identity.
 * A consumer writing the pair inline hands a fresh object every render, and
 * this value rides the plat context. A churning identity would therefore
 * re-render every mark on the map for a pick that never moved.
 *
 * @internal
 */
function useMarkSelection(
	selection: MapOverlaySelection | null | undefined,
): MapOverlaySelection | null {
	const id = selection?.id ?? null

	const index = selection?.index

	return useMemo(() => (id === null ? null : { id, index }), [id, index])
}

/**
 * What the region layer does for the pointer, once the caller and the map have
 * both had their say.
 *
 * @internal
 */
type MapRegionPointerState = {
	/** Whether the paths take their own pointer handlers. */
	tracked: boolean
	/**
	 * Whether anything under a mark answers: the third claimant on the ground a
	 * dot stands on, and the one that claims first.
	 *
	 * A click is one of several ways a region answers, and the rarest of them. A
	 * matched region reads out under the pointer, a warmed one loads on the dwell,
	 * and a right-click can open a menu on it.
	 *
	 * Thus a map whose regions only read out still answers, and a dot over it
	 * narrows. Read as clicks alone, each dot on such a map keeps the full
	 * finger target. It then puts a 44px hole in the readout under it.
	 */
	answers: boolean
	/** The pick the layer makes, on the pointer and on the keyboard alike. */
	click: ((index: number) => void) | undefined
	/** The menu the layer opens. */
	contextMenu: ((index: number) => void) | undefined
}

/**
 * Resolves the region layer's pointer state.
 *
 * Held apart from {@link MapPlat} because the four answers have to agree. Read
 * inline they were branches in a component already at the complexity limit. The
 * one that matters is the hardest to confirm: a switched-off layer claiming no
 * ground from the marks above it.
 *
 * `earned` is what the map itself justifies: a matched category, a warming
 * reporter, or `nameRegions`. The caller's `regionPointer` beats all of it, and
 * beats it here rather than at each reader. A switched-off layer therefore
 * cannot go on answering through a channel one reader forgot to gate. The two delegated
 * handlers are that risk: they ride the group rather than the paths, so
 * `tracked` never reaches them.
 *
 * Takes the bridged reporters rather than the props, so what it returns is what
 * the layer and the keyboard both bind.
 *
 * @internal
 */
function regionPointerState(
	regionPointer: boolean | undefined,
	earned: boolean,
	click: ((index: number) => void) | undefined,
	contextMenu: ((index: number) => void) | undefined,
): MapRegionPointerState {
	if (regionPointer === false) {
		return { tracked: false, answers: false, click: undefined, contextMenu: undefined }
	}

	return {
		tracked: earned,
		answers: earned || click !== undefined || contextMenu !== undefined,
		click,
		contextMenu,
	}
}

/** A layer that answers nothing offers no region stops; shared so the gate allocates none. @internal */
const NO_CENTROIDS: (LngLat | null)[] = []

/** The plot SVG once the frame is measured: the whole plot box, in its measured pixels. */
const MEASURED_SVG = { className: 'absolute inset-0 block size-full' }

/**
 * The plot SVG before the frame is measured. Its box is the plot box less
 * {@link MAP_FIT_INSET} on each side. The canonical frame meets this box, and
 * the measured fit meets the same box (`measuredMapFit` in
 * `engine/map-projection/fit`), so the geography does not move when the
 * measurement lands. The box of the SVG is the box that the frame readers
 * (`frameToClient`) measure, so it is an inset and not a padding.
 *
 * The content overflows into the band of the inset, and the plot box clips it
 * at the edge where the measured SVG clips it. The chrome and the marks
 * therefore draw to the edge in both states. The canonical frame scales to
 * meet the box, so a stroke keeps its width in px, as the measured frame draws
 * it.
 */
const CANONICAL_SVG = {
	className: 'absolute block overflow-visible [&_*]:[vector-effect:non-scaling-stroke]',
	style: {
		inset: MAP_FIT_INSET,
		width: `calc(100% - ${MAP_FIT_INSET * 2}px)`,
		height: `calc(100% - ${MAP_FIT_INSET * 2}px)`,
	} satisfies CSSProperties,
}

/** The class and the style of the plot SVG in each state of the frame. @internal */
function plotSvgProps(measured: boolean): { className: string; style?: CSSProperties } {
	return measured ? MEASURED_SVG : CANONICAL_SVG
}

/**
 * An SVG geography map on the chart module's interaction grammar. Regions take
 * their color by category from typed rows. One merged legend dims everything
 * outside a pointed entry's group and outlines the regions in it, and a click
 * toggles that group off. A pointed region or overlay on the map isolates
 * behind the same recede. A pointer-anchored Tooltip carries the readout.
 *
 * A ring marks the region the consumer holds selected, and a halo marks the
 * overlay mark. A visually-hidden data table carries the values. Optional
 * graticule and sphere chrome rules the frame beneath it all. Geometry is
 * prop-supplied TopoJSON / GeoJSON. {@link MapRoute}, {@link MapPoint},
 * {@link MapMarker}, and {@link MapGeofence} children draw over the geography
 * and register their own legend entries.
 *
 * @remarks Consumers geocode addresses to coordinates through `AddressInput`
 * (or any provider) and fetch street-following paths through
 * {@link fetchOsrmRoute}: the plat itself never calls the network.
 *
 * Without `width`, the frame is a query container at the full width of its
 * parent, so its content gives it no width. Give it a parent with a definite
 * width. In a parent that sizes to its content, the map gets only the width
 * that the other content of that parent gives. The frame is never narrower than
 * 12rem (`min-w-48`).
 *
 * A `left` or `right` legend goes beside the plot only at a frame width of 32rem
 * (`@lg`) or more. Below that width, the legend stacks under the plot.
 *
 * The fit keeps a clear space between the geography and each edge of the plot.
 * The space is the reach of a selected dot: its radius and its halo. A dot on
 * the edge of the geography therefore draws whole, and so does a selected
 * region border there. The frame clips the part of a larger summary dot that is
 * out of that space. Under `aspectRatio="auto"`, the box takes the geography's
 * own ratio, so on one axis the geography has a little more space than that.
 */
export function MapPlat<T = never>(props: MapPlatProps<T>) {
	const {
		geography,
		geographyObject,
		projection = 'mercator',
		categoryKey,
		valueKey,
		colorRange,
		formatValue,
		colorName,
		regionId,
		regionLabel,
		width,
		height,
		aspectRatio = 'auto',
		graticule = false,
		sphere = false,
		legend,
		tooltip = true,
		nameRegions = false,
		zoom: zoomInput,
		onViewChange,
		regionPointer,
		animate: animation = false,
		onRegionClick,
		isRegionDisabled,
		onRegionContextMenu,
		onRegionPreload,
		selectedRegion,
		loading,
		selectedOverlay,
		emphasis: controlledEmphasis,
		onEmphasisChange,
		onHiddenChange,
		className,
		children,
		ref,
		'aria-label': ariaLabel,
		'aria-labelledby': ariaLabelledBy,
		// Destructured off so the region-data fields nothing else here reads never
		// fall into `...rest` and spread onto the root element as invalid DOM
		// attributes. The readout takes them off `props` below, so a value bound
		// here could only shadow it: a default written on one would never reach
		// the join.
		data: _data,
		regionKey: _regionKey,
		categories: _categories,
		bins: _bins,
		binning: _binning,
		colorDomain: _colorDomain,
		...rest
	} = props

	const shape = useMapShape({
		geography,
		geographyObject,
		projection,
		width,
		height,
		aspectRatio,
		graticule: graticuleStep(graticule),
		sphere,
	})

	const animate = animation !== false

	// The sweep order, handed over as a thunk: the centroid pass behind it walks
	// every ring in the atlas, so it runs when the reveal starts rather than on
	// the first paint. The keyboard cursor shares the cached centroids.
	const sweep = useMemo(
		() =>
			animation === 'sweep'
				? () =>
						regionSweep(
							cachedRegionCentroids(shape.features, projection === 'identity'),
							shape.project,
						)
				: null,
		[animation, shape.features, shape.project, projection],
	)

	// Region identity, resolved off the geography alone: a property of the
	// geometry, not of the data. Both the readout (which joins rows on it) and a
	// click (which reports it) read this one resolution.
	const regionIds = useMemo(
		() => shape.features.map(regionId ?? defaultRegionId),
		[shape.features, regionId],
	)

	// Each handler that makes the region layer answer (a pick, a preload, a
	// context menu) makes each region a cursor stop on a map with no readout, and
	// on that stop each arrow key speaks the name of the region it moves onto. So
	// each of them asks for the names, though the tooltip stays away.
	//
	// The props go in whole: the region-data union's branches are exclusive only
	// while the object holds together, so an object rebuilt from the bindings
	// above matches no branch and needs a cast to pass.
	const {
		categoryMetas,
		regionNames,
		regionCategory,
		regionValues,
		regionNumbers,
		domain: valueExtent,
		thresholds: valueThresholds,
	} = useMapRegionReadout(
		shape.features,
		props,
		regionIds,
		regionLabel,
		nameRegions ||
			onRegionClick !== undefined ||
			onRegionPreload !== undefined ||
			onRegionContextMenu !== undefined,
	)

	const {
		hidden: switched,
		toggle,
		setFocus,
		emphasis: activeFocus,
	} = useMapToggle(animate, onHiddenChange)

	const { entries, register } = useMapLegendRegistry()

	// The ledger as its geometry readers read it: the slot colors, the toggles,
	// the order, the spare resolver, the dot pool, and the keyboard stops. A
	// regroup changes the stop rows of a set, and so the ledger, but no anchor.
	// These readers therefore hold through a regroup, and so does each mark that
	// reads them. The legend, the tooltip, and the table draw the readout fields,
	// so they read the ledger itself.
	const anchored = useStableValue<readonly MapOverlayAnchor[]>(entries, sameAnchors)

	// Overlay slot colors continue the fixed order after the categories, by
	// registration order, one slot per legend entry, so a merged group's members
	// share their first member's color rather than each drawing one.
	const colors = useMemo<ReadonlyMap<string, MapSeriesColor>>(
		() => overlaySlotColors(anchored, categoryMetas.length),
		[anchored, categoryMetas.length],
	)

	// What the legend has switched off, as the MARKS it silences: the switchboard's
	// own set, plus every member of a group toggled off through its merged entry.
	// Expanded once here rather than resolved by each reader, because several
	// readers ask this question (the region layer, the tooltip, the keyboard stops,
	// the dot pool, the cluster pass, and every mark's own `hidden`, which the zone
	// budgets read through) and each would otherwise have to know that an entry id
	// can stand for several marks. The legend is handed the switchboard's own set
	// instead, since an entry is what it draws.
	//
	// A map with no group hands `switched` straight back rather than a copy of it,
	// for its identity and not the allocation: `regionActive` is the one reader that
	// does not already depend on the ledger, so a fresh set here would re-key the
	// memoized region layer on every overlay registration.
	const hidden = useMemo<ReadonlySet<string>>(() => {
		const members = anchored.flatMap((entry) =>
			entry.group !== undefined && switched.has(groupLegendId(entry.group)) ? [entry.id] : [],
		)

		return members.length === 0 ? switched : new Set<string>([...switched, ...members])
	}, [switched, anchored])

	// Each region that takes no click, resolved once against the ids a click
	// reports. An inline predicate is a new identity on each render, so the
	// result holds its last identity while its content is the same, and the
	// memoized region layer holds with it.
	const regionDisabled = useStableValue(
		useMemo(
			() =>
				onRegionClick === undefined || isRegionDisabled === undefined
					? undefined
					: regionIds.map((id, index) => isRegionDisabled(id, index)),
			[onRegionClick, isRegionDisabled, regionIds],
		),
		sameElements,
	)

	// The region layer reports the index it resolved off the pointed path's anchor;
	// the props report identity. Bridge them here, memoized like this component's
	// sibling derivations so the memoized region layer holds across the legend and
	// resize commits.
	const clickRegion = useMemo(
		() => bridgeRegionIdentity(onRegionClick, regionIds, regionDisabled),
		[onRegionClick, regionIds, regionDisabled],
	)

	const contextMenuRegion = useMemo(
		() => bridgeRegionIdentity(onRegionContextMenu, regionIds),
		[onRegionContextMenu, regionIds],
	)

	// Whether anything asked to be told of intent, as the boolean the tracking
	// gate keys on rather than the churning handler behind it.
	const preloads = onRegionPreload !== undefined

	const preloadRegion = useRegionPreload(onRegionPreload, regionIds, shape.features)

	// The selection resolved to the index the layers draw by, against the same
	// ids a click reports, so the pick a consumer echoes back always rings the
	// region that produced it. An id naming no feature resolves to nothing
	// rather than to region 0, the miss `indexOf` would otherwise report as -1.
	//
	// Memoized like every sibling derivation here, and for the reason `hasReadout`
	// below states: this component re-renders on each legend point and leave, each
	// toggle, each overlay registration, and each resize commit, and the scan is
	// linear in the atlas. A counties map holding a pick read three thousand ids
	// on every one of them, against a selection that had not moved.
	const selected = useMemo(() => {
		if (selectedRegion == null) return null

		const index = regionIds.indexOf(selectedRegion)

		return index === -1 ? null : index
	}, [regionIds, selectedRegion])

	const markSelection = useMarkSelection(selectedOverlay)

	// Registration ordinal per entry, so a staggered reveal can key off it.
	const order = useMemo<ReadonlyMap<string, number>>(
		() => new Map(anchored.map((entry, index) => [entry.id, index])),
		[anchored],
	)

	const numeric = valueKey !== undefined

	// The entries the legend draws. Memoized like the sibling derivations
	// (`colors`, `tooltipEntries`, the table): the plat re-renders per legend
	// focus, toggle, and resize commit, in none of which the items change.
	// Without the memo, each such render rebuilds every item object and its class
	// join. Resolved here rather than beside the legend it feeds, because the
	// emphasis gate below is the other reader and has to agree with it exactly.
	const items = useMemo(
		() => legendItems(categoryMetas, entries, colors, numeric),
		[categoryMetas, entries, colors, numeric],
	)

	// The focused id can outlive its entry: an overlay unmounting under the
	// pointer fires no leave or blur, so `useMapToggle` keeps the dead id. Gate
	// emphasis on the live legend ids, so a stale focus can't dim the whole map
	// against a group that no mark belongs to.
	//
	// Read off the drawn entries rather than re-derived from the categories and the
	// ledger: the emphasis is only ever an id the legend published, and re-deriving
	// admitted ids it never publishes. A grouped mark's own id was one: the legend
	// emphasizes its GROUP, so that id passed the gate and then dimmed every mark
	// including the one it named, which is the failure this gate exists to prevent.
	// Taken from the items, any entry kind added later is gated by construction.
	const legendIds = useMemo(() => new Set(items.map((item) => item.id)), [items])

	// The gate both readers take. Stated once, because the comment above requires
	// them to agree exactly.
	const live = (id: string | null) => (id !== null && legendIds.has(id) ? id : null)

	// A controlled `emphasis` wins over this plat's own legend focus, so several
	// plats can share one legend rendered outside them all. The live-id gate below
	// applies either way: an id this plat has no group for would dim the whole map
	// against nothing.
	const focused = controlledEmphasis === undefined ? activeFocus : controlledEmphasis

	const emphasis = live(focused)

	/*
	 * What this plat's OWN legend emphasizes, past the same live-id gate.
	 *
	 * Reported rather than `emphasis`, because a controlled plat would otherwise
	 * echo the caller's own prop back at it. This is the half of the §7.3 triad
	 * the caller cannot see: the legend's intent, whoever holds the state.
	 */
	const ownEmphasis = live(activeFocus)

	useReportedChange(ownEmphasis, onEmphasisChange)

	// The hover provider's pointed-emphasis gate: a region takes the emphasis
	// only while its category is matched and shown. `regionGroupId` resolves the
	// group id that the region fill also keys on (`categoryPaint`).
	const regionActive = useCallback(
		(index: number) => {
			const id = regionGroupId(regionCategory[index] ?? null, categoryMetas)

			return id !== null && !hidden.has(id)
		},
		[regionCategory, categoryMetas, hidden],
	)

	// Whether any region reads out. It reads the join rather than the presence of
	// a `data` array, because rows that match no region leave exactly the silence
	// no rows do: the tooltip resolves nothing for an unmatched region, and the
	// pointed-emphasis gate above lights nothing there either. Toggled-off
	// categories still count: a legend toggle must not take the table or the tab
	// stop away under the reader. Memoized on the join, so the scan a map with no
	// match pays in full runs once per readout rather than once per render.
	//
	// The region layer gates on this (through `regionPointerState` below) rather
	// than on `hasReadout`, which counts the overlays too, and must: overlays
	// register from an effect, so a bit that counted them would read `false` on a
	// backdrop map's first commit and `true` on its next, failing the layer's memo
	// and re-mapping the whole atlas a second time.
	//
	// The gate forks past that point. The paths take their handlers on `tracked`,
	// and the dot targets yield on `answers`, which is wider: the delegated pick and
	// menu ride the group rather than the paths, so a click-only map binds nothing
	// per path and still claims the ground under every dot.
	const regionsRead = useMemo(
		() => regionCategory.some((category) => category !== null),
		[regionCategory],
	)

	// Whether the region paths answer the pointer at all, which anything reading
	// what the pointer is on earns: a matched category, a warming reporter, or
	// `nameRegions`. A plain navigation map (a geography and `onRegionPreload`, no
	// `data`) has no match to earn them, and without this the pointer half of its
	// report would be dead; naming every region is itself a readout, so a map with
	// no `data` that carries that prop would otherwise answer nothing. All three
	// read the same on the first commit as on the next, which the bit above states
	// the layer must have.
	//
	// A caller can switch the layer off outright, which beats all three (see
	// `regionPointerState` for what that gate owes each reader).
	const regions = regionPointerState(
		regionPointer,
		regionsRead || preloads || nameRegions,
		clickRegion,
		contextMenuRegion,
	)

	// How much room the region under a dot can spare it. The shape holds the
	// resolver of its frame, and its measures are on the geometry entry, so a
	// pointer crossing, a legend toggle, and a resize measure nothing again. A map
	// whose regions answer nothing never measures a shape.
	//
	// Whether they answer is this component's own policy, so it is stated here and
	// the resolver takes no boolean about it: the zone half is gated the same way,
	// at the fold rather than inside `zoneBudget`.
	const regionRoom = regions.answers ? shape.regionRoom : NO_REGION_CLAIM

	// How much reach everything under a mark leaves it at a position: the tightest
	// claim any of them allows, since a dot standing over two shapes has to satisfy
	// both. The region layer claims first, then each visible zone. Rebuilt as the
	// anchors of the ledger, the legend's toggles, or the fit change: the resolvers
	// themselves are stable, so the dots that read it hold through a pointer
	// crossing rather than measure again.
	//
	// The resolver is a store. A zone whose budget changes in place changes none of
	// the deps below, so the zone regrounds the store, and the dots measure their
	// targets again.
	//
	// A loop rather than a `reduce` closure: every dot on the map calls this, and
	// the callback would be a fresh allocation per call rather than per rebuild.
	const spare = useMemo(
		() =>
			createSpareStore((at, unitsPerPixel) => {
				// A region layer that answers the pointer is the third claimant on this ground, and it
				// claims first (see `regionPointerState` for what counts as answering).
				//
				// A finger-sized target over such a region takes a 44px bite out of the shape under it:
				// the dot is the topmost thing at those pixels, so the region cannot be pointed at or
				// picked there, and a dot near the middle of a small region can put it out of reach
				// altogether. The dot gives back a share of what the region itself holds, the way it
				// does for a zone: `regionSpare` states why a share and not a figure. Touch keeps the
				// whole 44px target, since `k.hit.fine` narrows only on a device with no coarse pointer:
				// a region is a large shape a finger can reach elsewhere, and a coarse pointer cannot aim
				// at an 11px target (WCAG 2.5.5).
				//
				// The identity of the minimum otherwise, not a size: a map whose regions answer nothing
				// and which draws no zones claims nothing here, and `markTargets` is the one place that
				// knows the cap.
				let room = regionRoom(at, unitsPerPixel)

				for (const entry of anchored) {
					if (entry.spare === undefined || hidden.has(entry.id)) continue

					room = Math.min(room, entry.spare(at, unitsPerPixel))
				}

				return room
			}),
		[anchored, hidden, regionRoom],
	)

	// Every visible dot-drawing mark's dots, in frame units. This is the pool a dot
	// divides its target's ground against, and the seam that lifts `crowd.ts`'s
	// one accepted bound: a mark could previously see only its own dots, so two
	// separate marks each kept a full target and the overlap went to whichever
	// drew last.
	//
	// Gathered on the first read and held from there: the gather invokes every entry's `dotsAt`, which
	// `MapPoints` registers as a thunk precisely so that pass lands on the readers that want it, and a
	// plat with no dot-shaped mark on it must never run the pass at all. A mark that moves changes none
	// of these deps, so it restakes its own dots in the pool (see `createDotPool`).
	const pool = useMemo(
		() => createDotPool(anchored, hidden, shape.project),
		[anchored, hidden, shape.project],
	)

	const intl = useIntl()

	// The radius of a group of each count. A summary holds its count label, which
	// the locale writes, so the radius reads the formatter that the label reads.
	//
	// Held per count for the locale: the pass asks for every group it builds, on
	// every zoom notch, and most of those groups share a few small counts. A format
	// per ask was a large share of the cost of the pass on a dense set.
	const getRadius = useMemo(() => {
		const radii = new Map<number, number>()

		return (count: number) =>
			getOrCompute(radii, count, (held) => clusterRadius(held, intl.formatNumber))
	}, [intl])

	// The ledger as the shared pass reads it. A regroup changes the stop rows of a
	// set, and so the ledger, but not what the pass reads. The pass therefore holds
	// its grouping through a regroup and does not group again at the same scale.
	const clusterEntries = useStableValue(entries, sameClusterEntries)

	// The shared pass of the point sets.
	const clusters = useMemo(
		() => createClusterStore(clusterEntries, hidden, shape.project, getRadius),
		[clusterEntries, hidden, shape.project, getRadius],
	)

	// The one dispatch of a pick and a right-click on an overlay target: each part
	// that the target names (`targetParts`), through the reporter of its own set.
	// A pick on a shared summary from any input therefore reaches every part. A
	// stable event, so the value below holds through a change of the ledger.
	const report = useStableEvent((target: MapOverlayTarget, kind: 'activate' | 'menu') => {
		const entry = entries.find(({ id }) => id === target.id)

		if (entry === undefined) return

		for (const part of targetParts(target, entry)) {
			entries.find(({ id }) => id === part.id)?.[kind]?.(part.stop)
		}
	})

	// The moves of the marks, which the cursor reads to resolve its stops again.
	// One store for the life of the plat, so the value below holds through a move.
	const [moves] = useState(createStopMoves)

	const plat = useMemo<MapPlatContextValue>(
		() => ({
			project: shape.project,
			register,
			colors,
			order,
			hidden,
			spare,
			pool,
			clusters,
			report,
			moves,
			animate,
			selectedOverlay: markSelection,
		}),
		[
			shape.project,
			register,
			colors,
			order,
			hidden,
			spare,
			pool,
			clusters,
			report,
			moves,
			animate,
			markSelection,
		],
	)

	const tooltipEntries = useMemo(
		() =>
			new Map<string, MapTooltipEntry>(
				entries.map((entry) => [
					entry.id,
					{
						label: entry.label,
						swatch: entry.swatch,
						swatchClass: overlaySwatchClass(colors, entry.id),
						detail: entry.detail,
						stopRows: entry.stopRows,
						getStop: entry.getStop,
					},
				]),
			),
		[entries, colors],
	)

	const svgRef = useRef<SVGSVGElement>(null)

	// Whether the map zooms at all, read off the prop alone. The view state
	// itself lives in `MapZoomProvider`, below this component and around the plot,
	// so a wheel notch never re-renders the plat, but the tab-stop gate below
	// needs the bit, and the bit is a pure function of the prop.
	const zoomable = mapZoomSettings(zoomInput) !== null

	// The keyboard cursor's stops, handed over as a closure rather than built
	// here: every region at its centroid, then every registered overlay at its
	// own anchor, each projected through the live fit so a refit carries them with
	// the geography. Regions lead, so Home and End read as the geography's own
	// ends and the marks drawn over it follow.
	//
	// Deliberately unresolved on the render path: the `geoCentroid` pass behind
	// the region half measures every ring in the atlas (on counties, a large
	// fraction of the cost of the mount), and neither the mount nor a resize can
	// pay that for a cursor most maps never carry. The hook calls this on the
	// first navigation key instead. A stop whose position the projection drops
	// (the US composite discards points outside its insets) is left out, so the
	// cursor never lands somewhere the map does not draw.
	//
	// A layer that answers nothing holds no stops either. The pointer half takes
	// care of itself (the paths bind no handlers, so nothing can be pointed at),
	// but the cursor reaches a region through this list rather than through the
	// DOM, so without the gate a reader could arrow onto a drilled state, hear it
	// named, press Enter, and get nothing: `activateTarget` dispatches through
	// `regions.click`, which the same gate already emptied.
	//
	// It reads `answers` rather than the caller's switch alone, so a backdrop map
	// whose regions earn nothing drops them too: the marks over it keep their own
	// stops, and a region that leads nowhere is not one a cursor rests on.
	const resolveStops = useCallback(
		() =>
			mapStops(
				regions.answers
					? cachedRegionCentroids(shape.features, projection === 'identity')
					: NO_CENTROIDS,
				anchored,
				hidden,
				shape.project,
			),
		[shape.features, shape.project, anchored, hidden, regions.answers, projection],
	)

	const { click: pickRegion } = regions

	// Picks the mark the cursor sits on: a region through the caller's own
	// reporter, an overlay through the activation it registered, so the plat
	// dispatches a keyboard pick without knowing what kind of mark it landed on.
	const activateTarget = useCallback(
		(target: MapHoverTarget) => {
			if (target.kind === 'region') pickRegion?.(target.index)
			else report(target, 'activate')
		},
		[pickRegion, report],
	)

	// The target of the stop that holds what a target held. A zoom regroups the
	// dots of a `MapPoints`, so the cursor holds the point it stands on, not the
	// index of its dot, and reads the dot that holds that point here. A point in a
	// shared summary reads the stop of the set that draws it, the one stop of the
	// summary.
	const relocateTarget = useCallback(
		(target: MapHoverTarget): MapHoverTarget => {
			if (target.kind === 'region' || target.reported === undefined) return target

			const entry = entries.find(({ id }) => id === target.id)

			const lead = entry === undefined ? undefined : targetParts(target, entry)[0]

			if (lead === undefined || (lead.id === target.id && lead.stop === target.stop)) return target

			if (lead.id === target.id) return { ...target, stop: lead.stop }

			const owner = entries.find(({ id }) => id === lead.id)

			return owner === undefined ? target : entryTarget(owner, lead.stop)
		},
		[entries],
	)

	// Whether anything at all can read out: a matched region, a named region
	// (`nameRegions`), a registered overlay, or a selected region. The table takes
	// this wider reading: a mark's own row is an output a map with no rows still
	// has, and the row of a selected region is where the selection reads as the
	// current one.
	const hasReadout = regionsRead || entries.length > 0 || nameRegions || selected !== null

	// Whether the tooltip and the cursor can read anything out. A region counts
	// only while its layer answers, because `regionPointer={false}` takes the
	// regions off the pointer and out of the stop list. The table keeps their
	// rows, since the switch withdraws the pointer and not the data.
	const pointReadout = (regions.answers && (regionsRead || nameRegions)) || entries.length > 0

	// `tooltip` asks and `pointReadout` answers; the readout channels all want the
	// pair. Bound once rather than spelled at each of them.
	const readable = tooltip && pointReadout

	// Whether the pointer drives a hover target at all: the tracked region paths
	// and every overlay hit shape write one, with the tooltip on or off. The
	// pointed emphasis reads that target, so a scroll must clear and re-read it
	// whenever this is true, and not only while the tooltip shows it.
	const hover = regions.tracked || entries.length > 0

	// What the tooltip reads, held once: the tooltip shows it, and the keyboard
	// cursor speaks the same text for the stop it moves onto.
	const tooltipProps = useMemo<MapTooltipProps>(
		() => ({
			regionNames,
			regionCategory,
			regionValues,
			categories: categoryMetas,
			entries: tooltipEntries,
			hidden,
			nameRegions,
			formatNumber: intl.formatNumber,
		}),
		[
			regionNames,
			regionCategory,
			regionValues,
			categoryMetas,
			tooltipEntries,
			hidden,
			nameRegions,
			intl,
		],
	)

	// Whether a region stop answers Enter, as the boolean the cursor's speech
	// keys on rather than the churning handler behind it.
	const picksRegions = regions.click !== undefined

	// Without the readout the cursor still speaks the name of its stop, so a
	// picker or a zooming map with `tooltip={false}` does not rove in silence.
	// With it, a region that reads nothing (no row, or a category the legend
	// holds off) still speaks its name where Enter picks it: the reader must hear
	// what a pick would report. A disabled region reports no pick, so it stays
	// silent like a region of a map that picks nothing.
	const describeTarget = useCallback(
		(target: MapHoverTarget) => {
			if (!readable) return nameMapTarget(target, tooltipProps)

			const readout = describeMapTarget(target, tooltipProps)

			return readout === null &&
				target.kind === 'region' &&
				picksRegions &&
				regionDisabled?.[target.index] !== true
				? nameMapTarget(target, tooltipProps)
				: readout
		},
		[readable, picksRegions, regionDisabled, tooltipProps],
	)

	// The cursor earns a tab stop from either of its two outputs. Gating on the
	// readout alone would leave `tooltip={false}` with `onRegionClick` (a
	// supported pairing) a picker no keyboard can reach. Without the readout the
	// cursor still isolates the region it sits on, which the pointed-mark context
	// drives independently, so navigation stays legible.
	//
	// An overlay's own `onClick` counts too: a `tooltip={false}` plat whose only
	// pick is a clickable `MapPoint` is still a picker, and gating on the region
	// half alone would leave it unreachable.
	const pickable = regions.click !== undefined || entries.some((entry) => entry.activate)

	// A zooming map earns the stop on its own: the wheel and the drag are pointer
	// gestures, so without it the scale would be out of a keyboard reader's reach
	// on a plat that carries neither a readout nor a pick.
	//
	// The readout half asks whether one exists, not whether the prop asked for
	// one. `tooltip` is a request, and a map with nothing to read out silences on
	// all three channels (no tooltip, no emphasis, no table), so the prop alone
	// would hand a backdrop map a stop that answers every key with nothing.
	//
	// The drawn-frame test is what keeps a map with nothing to navigate (no
	// geography yet) from offering a stop that answers no key. It reads the frame
	// rather than the stops themselves, so the gate stays O(1) and the centroids
	// stay unresolved.
	const navigable = (readable || pickable || zoomable) && shape.viewWidth > 0

	// The range bar's visibility follows the chart's tier, and its announced axis
	// the frame's breakpoint, so it reads the container width, not the plot's,
	// which a side bar shrinks, feeding the move back on itself. The heatmap
	// reads its own bar the same way, so the measure is one hook.
	const { ref: containerRef, width: containerWidth } = useMeasuredWidth(width)

	const rootRef = useComposedRefs(containerRef, ref)

	// The range bar's default format writes numbers in the ambient locale, as the readout does.
	const { locale } = useLocale()

	const {
		show: showLegend,
		placement: legendPlacement,
		rail: legendRail,
		range: rangeLegend,
		orientation: legendOrientation,
	} = planLegend(
		legend,
		numeric,
		{ width: containerWidth, height: shape.boxHeight },
		{
			categoryCount: categoryMetas.length,
			entryCount: entries.length,
			hasOverlayChildren: Children.toArray(children).length > 0,
		},
		{
			colorRange,
			valueExtent,
			valueThresholds,
			formatValue,
			locale,
			colorName,
			regionNumbers,
			onFocus: setFocus,
		},
	)

	const aside = legendAside(legendPlacement)

	// The SVG fills its box through the viewBox rather than pixel dimensions, so
	// the box (not the marks) owns the size. The view frame is the canonical
	// one until the container is measured, then the measured pixels, so the
	// geography paints on the first commit without waiting to be measured.
	// Until the measurement, the SVG sits inside the inset of the fit
	// (`plotSvgProps`).
	//
	// The SVG is out of flow, as `ChartPlotBox` requires. In flow, its `viewBox`
	// ratio gave the box a content height. A container that sizes to its content,
	// such as a `1fr` grid row, then kept the height of the last frame. A fill map
	// that became narrow and then wide again stayed taller than its container.
	const svg = shape.viewWidth > 0 && shape.viewHeight > 0 && (
		<svg
			ref={svgRef}
			aria-hidden="true"
			{...plotSvgProps(shape.measured)}
			viewBox={`0 0 ${shape.viewWidth} ${shape.viewHeight}`}
		>
			<MapPlatContext value={plat}>
				<MapZoomLayer>
					{/* Inside the zoom, above the marks layer. Inside, because a meridian
					    is a position on the globe like every other. It draws in frame
					    units, so it must travel and scale with the geography it rules
					    rather than hang over a map moving under it. Its hairlines convert
					    their width through the same zoom scale every other mark here
					    does. Above the marks layer rather than within it, because chrome
					    is frame and not data: it never animates on, and it joins no
					    motion group. */}
					<MapChrome paths={shape.chrome} sphere={sphere} />

					<MapMarksLayer animate={animate}>
						<MapRegions
							paths={shape.paths}
							frame={shape.regionFrame}
							regionCategory={regionCategory}
							categories={categoryMetas}
							interactive={regions.tracked}
							hidden={hidden}
							emphasis={emphasis}
							animate={animate}
							sweep={sweep}
							onRegionClick={regions.click}
							disabled={regionDisabled}
							onRegionContextMenu={regions.contextMenu}
							selected={selected}
							loading={loading}
						/>

						{children}
					</MapMarksLayer>
				</MapZoomLayer>
			</MapPlatContext>
		</svg>
	)

	// The visually-hidden table. The frame defers it off the urgent render (see
	// `MapDeferredTable`). The table rides as one memoized element, so the
	// deferred render can't tear across a data change.
	// The name of the map also names its table.
	const table = useMemo(
		() =>
			hasReadout ? (
				<MapTable
					header={valueColumnHeader(intl, colorName)}
					regionNames={regionNames}
					regionCategory={regionCategory}
					regionValues={regionValues}
					categories={categoryMetas}
					entries={entries}
					selected={selected}
					selectedOverlay={markSelection}
					label={ariaLabel}
					labelledBy={ariaLabelledBy}
				/>
			) : null,
		[
			hasReadout,
			intl,
			colorName,
			regionNames,
			regionCategory,
			regionValues,
			categoryMetas,
			entries,
			selected,
			markSelection,
			ariaLabel,
			ariaLabelledBy,
		],
	)

	return (
		<MapFrame
			{...rest}
			legendNode={
				<MapLegendRegion
					range={rangeLegend}
					show={showLegend}
					aside={aside}
					orientation={legendOrientation}
					items={items}
					hidden={switched}
					onToggle={toggle}
					onFocus={setFocus}
				/>
			}
			legendPlacement={legendPlacement}
			rail={legendRail}
			plotRegion={
				<MapPlotRegion
					aria-label={ariaLabel}
					aria-labelledby={ariaLabelledBy}
					shape={shape}
					aside={aside}
					keyboard={{
						enabled: navigable,
						activate: activateTarget,
						relocate: relocateTarget,
						describe: describeTarget,
						resolveStops,
						moves,
						view: { width: shape.viewWidth, height: shape.viewHeight },
						svgRef,
						subject: shape.features,
					}}
					tooltip={
						// A backdrop map mounted a Tooltip that resolved `null` for every
						// region it was ever pointed at.
						readable ? <MapTooltip {...tooltipProps} /> : null
					}
				>
					{svg}
				</MapPlotRegion>
			}
			plotRef={shape.ref}
			zoom={{
				zoom: zoomInput,
				view: { width: shape.viewWidth, height: shape.viewHeight },
				svgRef,
				// A plat handed another atlas fits that one, so a transform made
				// against the last has nothing left to mean. `shape.features` is the
				// decode's own memoized identity, so it changes exactly when the
				// geography does and never on a resize.
				subject: shape.features,
				onViewChange,
			}}
			containerRef={rootRef}
			hover={hover}
			regionsTracked={regions.tracked}
			regionActive={regionActive}
			emphasis={emphasis}
			preloadRegion={preloadRegion}
			table={table}
			width={width}
			fill={shape.fill}
			className={className}
		/>
	)
}
