'use client'

import {
	type ReactNode,
	startTransition,
	useCallback,
	useDeferredValue,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { useResizeObserver } from '../../hooks'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import type { AccessibleName } from '../../types'
import { legendAside } from '../chart/engine/chart-legend/schema'
import { MapPlatContext, type MapPlatContextValue } from './context'
import { cachedRegionCentroids } from './engine/map-geometry/cache'
import { graticuleStep } from './engine/map-geometry/chrome'
import type { MapHoverTarget } from './engine/map-hover/target'
import { mapStops } from './engine/map-keyboard/stops'
import { legendItems } from './engine/map-legend/items'
import { type MapLegendInput, planMapLegend } from './engine/map-legend/plan'
import { categoryLegendId, regionGroupId, slotColor } from './engine/map-region/category'
import type { MapRegionData } from './engine/map-region/data'
import { defaultRegionId } from './engine/map-region/identity'
import type {
	MapAspectRatio,
	MapFeature,
	MapGeography,
	MapOverlaySelection,
	MapProjection,
} from './engine/types'
import { MapChrome } from './map-chrome'
import { MapFrame, MapPlotRegion } from './map-frame'
import { MapLegendRegion } from './map-legend-region'
import { MapRegions } from './map-regions'
import { MapTable } from './map-table'
import { MapTooltip, type MapTooltipEntry } from './map-tooltip'
import { useMapLegendRegistry } from './use-map-legend-registry'
import { useMapRegionReadout } from './use-map-region-readout'
import { useMapShape } from './use-map-shape'
import { useMapToggle } from './use-map-toggle'

/**
 * Props for {@link MapPlat}. Requires an accessible name — the plot is
 * `role="img"`.
 */
export type MapPlatProps<T = never> = AccessibleName &
	MapRegionData<T> & {
		/**
		 * The geometry to draw: a TopoJSON topology or a GeoJSON feature
		 * collection. The package ships no atlas data — pass `us-atlas`,
		 * `world-atlas`, or any equivalent source. Optional so a lazily fetched
		 * atlas passes straight through: `null` or omitted reserves the frame and
		 * paints nothing, then the geography draws in the moment it arrives — no
		 * `geography ? <MapPlat /> : null` guard at the call site.
		 */
		geography?: MapGeography | null
		/** Which topology object to draw; defaults to the topology's first key. */
		geographyObject?: string
		/**
		 * How the globe projects onto the frame; refit to the geography on every
		 * resize. Pass `'albers-usa'` for US state maps — it places Alaska and
		 * Hawaii as insets.
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
		 */
		width?: number
		/** Frame height in px; wins over `aspectRatio` when set (a free-form fixed height). */
		height?: number
		/**
		 * Height as a ratio of the width: `'auto'` takes the fitted geography's
		 * own projected proportions, a number or `"4/3"` string fixes one, and
		 * `false` fills the container's height.
		 * @defaultValue 'auto'
		 */
		aspectRatio?: MapAspectRatio
		/**
		 * Hold the frame empty — its reserved box still owning the space — until the
		 * container is measured, then paint the geography once at the measured aspect
		 * with the legend already resolved, instead of painting the measurement-free
		 * canonical fit and visibly refitting (and reserving a late legend rail) once
		 * the measurement lands. For a chart-context map — a dashboard tile behind a
		 * loading state, carrying an explicit `aspectRatio` that differs from the
		 * geography's own — the canonical paint would draw at the wrong aspect and
		 * legend-less, then jump; deferring trades the instant first paint (invisible
		 * behind the tile's reserved box and its loading state) for a single settled
		 * one. Off by default, so every other map keeps the instant canonical paint for
		 * SSR and the first client commit.
		 * @defaultValue false
		 */
		deferPaint?: boolean
		/**
		 * Rule meridian and parallel hairlines under the geography, on the chart's
		 * gridline ink: `true` takes d3-geo's ten-degree step, and a number sets
		 * that step in degrees. The lines draw beneath every region — a region fill
		 * covers the ones crossing it, so the graticule reads around the geography
		 * and not across it — and answer no pointer.
		 *
		 * The lines are bounded by the projection's own frame, so a composite draws
		 * one graticule rather than three: `'albers-usa'` rules the main map and
		 * leaves the Alaska and Hawaii insets clear, where each would otherwise fill
		 * with fragments at its own angle.
		 *
		 * The lines cover the globe whatever the geography frames, and the frame
		 * clips the rest, so a regional map's graticule costs what a world map's
		 * does. A step under one degree is floored there: below it the pass draws
		 * millions of points the frame would only clip away.
		 *
		 * Chrome rides the fit the geography sets, so it appears with the geography:
		 * a plat still waiting for its atlas rules nothing.
		 * @defaultValue false
		 */
		graticule?: boolean | number
		/**
		 * Outline the globe's own edge, on the chart's axis-baseline ink — the frame
		 * a whole-world map closes itself with, under `'mercator'` or
		 * `'equal-earth'`. A composite projection has no single edge, so
		 * `'albers-usa'` outlines its own clip frames instead: the lower-48 box and
		 * the two inset boxes.
		 * @defaultValue false
		 */
		sphere?: boolean
		/**
		 * Show the legend. Defaults to on when there are two or more categories
		 * or any registered overlay — the identity channel colour alone must
		 * never carry. A placement moves the centered row under the plot
		 * (`'bottom'`) or above it (`'top'`), or a column panel beside it
		 * (`'left'` / `'right'`), side by side from `lg` and under the map below
		 * that. `'range'` (numeric mode only) swaps the binned switchboard for a
		 * continuous colour-scale bar — the heatmap legend — and the object form
		 * `{ type: 'range', placement }` places that bar explicitly. The range bar
		 * follows its placement's orientation (vertical beside the plot, horizontal
		 * above or below) and the chart's tier: it sheds at the spark size and, in a
		 * box too narrow for a side rail, drops to a horizontal row under the plot.
		 * The default placement is `'bottom'` for categorical maps and `'right'` for
		 * the numeric choropleth. Overlay entries register from the client, so they
		 * join the legend after hydration; the legend's box mounts ahead of them so
		 * late-landing buttons never resize the map or shift the frame.
		 */
		legend?: MapLegendInput
		/**
		 * Show the readout naming the pointed region or overlay. It also gates
		 * keyboard navigation, which the readout is the whole output of: turned
		 * off, the plot region takes no tab stop and stays a plain `role="img"`
		 * leaf, and the data table carries the values alone.
		 * @defaultValue true
		 */
		tooltip?: boolean
		/**
		 * Animate the map in on mount: the neutral geography paints at once, then
		 * category colour washes in region by region, routes draw themselves, and
		 * points pop once their route lands — the geography itself never fades, so
		 * the map is legible immediately and only the data animates on. Honours
		 * `prefers-reduced-motion` through the `ReducedMotion` primitive and the
		 * colour wash's `motion-reduce` fallback. Off by default — a static map
		 * stays a plain-SVG tree with no motion runtime work.
		 * @defaultValue false
		 */
		animate?: boolean
		className?: string
		/**
		 * Fires when a click lands on a region — the whole shape is the target, the
		 * same hit the tooltip reads — with the region's identity and its feature
		 * index. Identity is the `regionId` value the rows match against, so a
		 * click keys straight into the caller's own data; it is also what a
		 * TopoJSON consumer would otherwise re-decode the topology to recover. The
		 * cross-filter hook the charts' `onCategoryClick` is, and the same shape.
		 *
		 * Set, the region layer carries a pointer cursor and every region answers a
		 * click, unmatched ones included. The keyboard reports through the same
		 * handler: the plot region is one tab stop, and Enter or Space picks the
		 * region its arrow cursor sits on, so a pick carries the same identity
		 * whichever input made it.
		 */
		onRegionClick?: (id: string, index: number) => void
		/**
		 * Fires when a right-click lands on a region, with the same identity and
		 * feature index {@link onRegionClick} reports — for a context menu wrapping
		 * the map that needs to name the region it opened over. The map's hover state
		 * is provider-isolated so a pointer move repaints only the tooltip, which
		 * means a menu outside that provider cannot read the pointed region and must
		 * be told instead.
		 *
		 * Takes no pointer affordance and never prevents default: the menu still
		 * opens, and the cursor stays as {@link onRegionClick} left it. See
		 * {@link MapRegionsProps.onRegionContextMenu}.
		 */
		onRegionContextMenu?: (id: string, index: number) => void
		/**
		 * The selected region, by the identity {@link onRegionClick} reports — the
		 * `regionId` value, so the pick a click hands the caller comes straight back
		 * as the pick to draw. The map paints it and holds no selection state of its
		 * own: whatever owns the value (the click, a Select beside the map, a route
		 * parameter) stays the single source of truth, and the two halves of a
		 * clickable map can't disagree about what is picked.
		 *
		 * The selected region takes a foreground-ink outline above the region
		 * layers, so it survives the hover recede — a pick made before the pointer
		 * arrived is still marked while the pointer isolates elsewhere — and it
		 * never dims the rest of the map, which would read as broken for as long as
		 * the pick stood. Overlay children still draw over it, as they do over every
		 * region. The region's row in the data table reads as the current one, so
		 * the selection is in the accessible readout, not the pixels alone.
		 *
		 * An id matching no region draws no ring; `null` (or omitting the prop)
		 * selects nothing.
		 */
		selectedRegion?: string | null
		/**
		 * The selected overlay mark, in the pair its reporters hand back — see
		 * {@link MapOverlaySelection} for how the pair reads. `selectedRegion` for
		 * the marks drawn over the geography, on the same terms: the map paints the
		 * pick and holds no selection state of its own, so whatever owns the value
		 * stays the single source of truth.
		 *
		 * The picked mark takes a foreground-ink halo behind it, outside the hover
		 * recede, so a pick made before the pointer arrived is still marked while the
		 * pointer isolates elsewhere. Behind rather than over: the mark's own colour
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
		 * other group dims — what hovering a legend entry sets on its own.
		 *
		 * Passing it hands that state to the caller, so ONE legend rendered outside
		 * the plat can emphasise across SEVERAL of them at once: give each plat
		 * `legend={false}` and this prop, and drive it from whatever holds the
		 * shared legend — a `ChoroplethChart`'s own range bar, or any control that
		 * emits a bin id ({@link binEmphasisId}). The ids only line up across plats
		 * when the bins do, which for the numeric mode means the same `colorRange`,
		 * `bins`, and an explicit `domain` — without the last one each plat bins to
		 * its own extent and an id from one means nothing to another.
		 *
		 * Omitted, the plat owns the state and its own legend drives it. A `null`
		 * keeps it controlled with no emphasis (CONVENTIONS §7.3).
		 */
		emphasis?: string | null
		/** Overlay marks: {@link MapRoute}, {@link MapPoint}, {@link MapMarker}. */
		children?: ReactNode
	}

/**
 * The animated wrapper: `ReducedMotion` around the marks; static marks render
 * bare. The reveal plays when the marks mount — the beat the SVG first gains
 * a width — and never replays: a resize-keyed remount (the chart module's
 * generation key) would unmount the overlay children, whose cleanup
 * unregisters their legend entries, and the legend churn that follows can
 * feed a resize back into the plot and loop.
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

/** The data table's value-column header: the value's name in numeric mode, else the category field. @internal */
function valueColumnHeader(
	categoryKey: string | undefined,
	valueKey: string | undefined,
	valueName: string | undefined,
): string {
	if (valueKey !== undefined) return valueName ?? valueKey

	return categoryKey ?? 'Detail'
}

/**
 * Adapts a public region handler — which reports identity beside the index — to
 * the index-only shape {@link MapRegions} delegates in, so the click and
 * right-click reporters resolve identity the one way.
 *
 * `noUncheckedIndexedAccess` types the lookup as optional, and an index outside
 * the ids would be a layer/geometry disagreement, so it reports nothing rather
 * than an empty identity.
 *
 * @internal
 */
function bridgeRegionIdentity(
	report: ((id: string, index: number) => void) | undefined,
	regionIds: string[],
): ((index: number) => void) | undefined {
	if (report === undefined) return undefined

	return (index: number) => {
		const id = regionIds[index]

		if (id !== undefined) report(id, index)
	}
}

/**
 * The overlay pick, held on its primitives rather than on the prop's identity: a
 * consumer writing the pair inline hands a fresh object every render, and this
 * value rides the plat context, so its identity churning would re-render every
 * mark on the map for a pick that never moved.
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
 * An SVG geography map on the chart module's interaction grammar: regions
 * coloured by category from typed rows, one merged legend where pointing an
 * entry dims everything outside its group and clicking toggles it off,
 * pointing a region or overlay on the map isolating it behind the same
 * recede, a pointer-anchored Tooltip readout, a ring on the region and a halo
 * on the overlay mark the consumer holds selected, and a visually-hidden data
 * table. Optional graticule and sphere chrome rules the frame beneath it all.
 * Geometry is prop-supplied TopoJSON / GeoJSON; {@link MapRoute},
 * {@link MapPoint}, and {@link MapMarker} children draw over the geography
 * and register their own legend entries.
 *
 * @remarks Consumers geocode addresses to coordinates through `AddressInput`
 * (or any provider) and fetch street-following paths through
 * {@link fetchOsrmRoute} / {@link fetchValhallaRoute} — the plat itself
 * never calls the network.
 */
export function MapPlat<T = never>(props: MapPlatProps<T>) {
	const {
		geography,
		geographyObject,
		projection = 'mercator',
		data,
		categoryKey,
		valueKey,
		colorRange,
		valueFormat,
		valueName,
		regionId,
		regionLabel,
		width,
		height,
		aspectRatio = 'auto',
		deferPaint = false,
		graticule,
		sphere = false,
		legend,
		tooltip = true,
		animate = false,
		onRegionClick,
		onRegionContextMenu,
		selectedRegion,
		selectedOverlay,
		emphasis: controlledEmphasis,
		className,
		children,
		// Destructured off so the region-data fields nothing else here reads never
		// fall into `...name` and spread onto the plot element as invalid DOM
		// attributes. The readout takes them off `props` below, so a value bound
		// here could only shadow it — a default written on one would never reach
		// the join.
		regionKey: _regionKey,
		categories: _categories,
		bins: _bins,
		binning: _binning,
		domain: _domain,
		...name
	} = props

	const shape = useMapShape(
		geography,
		geographyObject,
		projection,
		width,
		height,
		aspectRatio,
		deferPaint,
		graticuleStep(graticule),
		sphere,
	)

	// Region identity, resolved off the geography alone — a property of the
	// geometry, not of the data. Both the readout (which joins rows on it) and a
	// click (which reports it) read this one resolution.
	const regionIds = useMemo(
		() => shape.features.map(regionId ?? defaultRegionId),
		[shape.features, regionId],
	)

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
	} = useMapRegionReadout(shape.features, props, regionIds, regionLabel)

	const { hidden, toggle, setFocus, emphasis: activeFocus } = useMapToggle()

	const { entries, register } = useMapLegendRegistry()

	// Overlay slot colours continue the fixed order after the categories, by
	// registration order; an explicit `color` still occupies its position.
	const colors = useMemo<ReadonlyMap<string, MapSeriesColor>>(
		() =>
			new Map(
				entries.map((entry, index) => [
					entry.id,
					entry.color ?? slotColor(categoryMetas.length + index),
				]),
			),
		[entries, categoryMetas.length],
	)

	// The region layer reports the index it resolved off the pointed path's anchor;
	// the props report identity. Bridge them here, memoised like this component's
	// sibling derivations so the memoised region layer holds across the legend and
	// resize commits.
	const clickRegion = useMemo(
		() => bridgeRegionIdentity(onRegionClick, regionIds),
		[onRegionClick, regionIds],
	)

	const contextMenuRegion = useMemo(
		() => bridgeRegionIdentity(onRegionContextMenu, regionIds),
		[onRegionContextMenu, regionIds],
	)

	// The selection resolved to the index the layers draw by, against the same
	// ids a click reports — so the pick a consumer echoes back always rings the
	// region that produced it. An id naming no feature resolves to nothing
	// rather than to region 0, the miss `indexOf` would otherwise report as -1.
	const selectedIndex = selectedRegion == null ? -1 : regionIds.indexOf(selectedRegion)

	const selected = selectedIndex === -1 ? null : selectedIndex

	const markSelection = useMarkSelection(selectedOverlay)

	// Registration ordinal per entry, so a staggered reveal can key off it.
	const order = useMemo<ReadonlyMap<string, number>>(
		() => new Map(entries.map((entry, index) => [entry.id, index])),
		[entries],
	)

	// The focused id can outlive its entry: an overlay unmounting under the
	// pointer fires no leave or blur, so `useMapToggle` keeps the dead id. Gate
	// emphasis on the live legend ids — the categories plus the registered
	// overlays — so a stale focus can't dim the whole map against a group that no
	// mark belongs to.
	const legendIds = useMemo(
		() =>
			new Set<string>([
				...categoryMetas.map((meta) => categoryLegendId(meta.value)),
				...entries.map((entry) => entry.id),
			]),
		[categoryMetas, entries],
	)

	// A controlled `emphasis` wins over this plat's own legend focus, so several
	// plats can share one legend rendered outside them all. The live-id gate below
	// applies either way: an id this plat has no group for would dim the whole map
	// against nothing.
	const focused = controlledEmphasis === undefined ? activeFocus : controlledEmphasis

	const emphasis = focused !== null && legendIds.has(focused) ? focused : null

	// The hover provider's pointed-emphasis gate: a region takes the emphasis
	// only while its category is matched and shown, resolved through the same
	// group id the region fill keys on so the two can't disagree.
	const regionActive = useCallback(
		(index: number) => {
			const id = regionGroupId(regionCategory[index] ?? null, categoryMetas)

			return id !== null && !hidden.has(id)
		},
		[regionCategory, categoryMetas, hidden],
	)

	const plat = useMemo<MapPlatContextValue>(
		() => ({
			project: shape.project,
			register,
			colors,
			order,
			hidden,
			emphasis,
			animate,
			selectedOverlay: markSelection,
		}),
		[shape.project, register, colors, order, hidden, emphasis, animate, markSelection],
	)

	const tooltipEntries = useMemo(
		() =>
			new Map<string, MapTooltipEntry>(
				entries.map((entry) => [
					entry.id,
					{
						label: entry.label,
						swatch: entry.swatch,
						swatchClass: cn(k.series[colors.get(entry.id) ?? 'blue'].text),
						detail: entry.detail,
						kind: entry.kind,
						stopRows: entry.stopRows,
					},
				]),
			),
		[entries, colors],
	)

	const svgRef = useRef<SVGSVGElement>(null)

	// The keyboard cursor's stops, handed over as a closure rather than built
	// here: every region at its centroid, then every registered overlay at its
	// own anchor, each projected through the live fit so a refit carries them with
	// the geography. Regions lead, so Home and End read as the geography's own
	// ends and the marks drawn over it follow.
	//
	// Deliberately unresolved on the render path — the `geoCentroid` pass behind
	// the region half measures every ring in the atlas (~30 ms across 3,000
	// counties, against a ~70 ms mount), and neither the mount nor a resize may
	// pay that for a cursor most maps never carry. The hook calls this on the
	// first navigation key instead. A stop whose position the projection drops
	// (the US composite discards points outside its insets) is left out, so the
	// cursor never lands somewhere the map does not draw.
	const resolveStops = useCallback(
		() => mapStops(cachedRegionCentroids(shape.features), entries, hidden, shape.project),
		[shape.features, shape.project, entries, hidden],
	)

	// Picks the mark the cursor sits on: a region through the caller's own
	// reporter, an overlay through the activation it registered — so the plat
	// dispatches a keyboard pick without knowing what kind of mark it landed on.
	const activateTarget = useCallback(
		(target: MapHoverTarget) => {
			if (target.kind === 'region') {
				clickRegion?.(target.index)

				return
			}

			entries.find((entry) => entry.id === target.id)?.activate?.(target.stop)
		},
		[clickRegion, entries],
	)

	// The cursor earns a tab stop from either of its two outputs. Gating on the
	// readout alone would leave `tooltip={false}` with `onRegionClick` — a
	// supported pairing — a picker no keyboard can reach. Without the readout the
	// cursor still isolates the region it sits on, which the pointed-mark context
	// drives independently, so navigation stays legible.
	//
	// An overlay's own `onClick` counts too: a `tooltip={false}` plat whose only
	// pick is a clickable `MapPoint` is still a picker, and gating on the region
	// half alone would leave it unreachable.
	//
	// The drawn-frame test is what keeps a map with nothing to navigate — no
	// geography yet, or a `deferPaint` frame still holding — from offering a stop
	// that answers no key. It reads the frame rather than the stops themselves,
	// so the gate stays O(1) and the centroids stay unresolved.
	const pickable = onRegionClick !== undefined || entries.some((entry) => entry.activate)

	const navigable = (tooltip || pickable) && shape.viewWidth > 0

	const numeric = valueKey !== undefined

	// The range bar's placement follows the chart's tier, so it reads the
	// container width — not the plot's, which a side bar shrinks, feeding the move
	// back on itself. A fixed `width` reads deterministically (SSR, tests);
	// otherwise the observer tracks the container the frame's outer box measures.
	const containerRef = useRef<HTMLDivElement>(null)

	const [measuredWidth, setMeasuredWidth] = useState(0)

	const measureContainer = useCallback(() => {
		const el = containerRef.current

		if (!el) return

		const next = Math.round(el.clientWidth)

		// Commit as a transition — the same priority the plot's own refit rides — so
		// a resize burst coalesces rather than this urgent write preempting and
		// stranding the refit at an intermediate frame (which would fatten strokes).
		startTransition(() => setMeasuredWidth((prev) => (prev === next ? prev : next)))
	}, [])

	useResizeObserver(containerRef, measureContainer)

	const containerWidth = width ?? measuredWidth

	const {
		show: showLegend,
		placement: legendPlacement,
		range: rangeLegend,
	} = planMapLegend(
		legend,
		numeric,
		{ width: containerWidth, height: shape.boxHeight },
		{
			categoryCount: categoryMetas.length,
			entryCount: entries.length,
			hasOverlayChildren: children != null,
		},
		{ colorRange, valueExtent, valueFormat, valueName, regionNumbers, onFocus: setFocus },
	)

	const aside = legendAside(legendPlacement)

	// The SVG fills its box through the viewBox rather than pixel dimensions, so
	// the box — not the marks — owns the size. The view frame is the canonical
	// one until the container is measured, then the measured pixels, so the
	// geography paints on the first commit without waiting to be measured.
	const svg = shape.viewWidth > 0 && shape.viewHeight > 0 && (
		<svg
			ref={svgRef}
			aria-hidden="true"
			className="block size-full"
			viewBox={`0 0 ${shape.viewWidth} ${shape.viewHeight}`}
		>
			{/* Under the marks layer rather than inside it: chrome is frame, not data,
			    so it never animates on and never joins a motion group. */}
			<MapChrome paths={shape.chrome} />

			<MapPlatContext value={plat}>
				<MapMarksLayer animate={animate}>
					<MapRegions
						paths={shape.paths}
						regionCategory={regionCategory}
						categories={categoryMetas}
						hidden={hidden}
						emphasis={emphasis}
						animate={animate}
						onRegionClick={clickRegion}
						onRegionContextMenu={contextMenuRegion}
						selected={selected}
					/>

					{children}
				</MapMarksLayer>
			</MapPlatContext>
		</svg>
	)

	const hasReadout = (data !== undefined && regionNames.length > 0) || entries.length > 0

	// Memoised like the sibling derivations (`colors`, `tooltipEntries`, the
	// table): the plat re-renders per legend focus, toggle, and resize commit,
	// in none of which the items change — without the memo each such render
	// rebuilds every item object and its class join.
	const items = useMemo(
		() => legendItems(categoryMetas, entries, colors, numeric),
		[categoryMetas, entries, colors, numeric],
	)

	// The visually-hidden table renders one row per region — thousands on a
	// county atlas — and none of it is mount-critical: defer it off the urgent
	// render the way the chart frame defers its data table, so the geography
	// commits first and the table hydrates a low-priority beat behind. The
	// table rides as one memoised element, so the deferred render can't tear
	// across a data change. Parity is unchanged — the table always converges
	// on the current readout, one low-priority commit behind.
	const table = useMemo(
		() =>
			hasReadout ? (
				<MapTable
					header={valueColumnHeader(categoryKey, valueKey, valueName)}
					regionNames={data === undefined ? [] : regionNames}
					regionCategory={regionCategory}
					regionValues={regionValues}
					categories={categoryMetas}
					entries={entries}
					selected={selected}
					selectedOverlay={markSelection}
				/>
			) : null,
		[
			hasReadout,
			categoryKey,
			valueKey,
			valueName,
			data,
			regionNames,
			regionCategory,
			regionValues,
			categoryMetas,
			entries,
			selected,
			markSelection,
		],
	)

	const deferredTable = useDeferredValue(table, null)

	return (
		<MapFrame
			legendNode={
				<MapLegendRegion
					range={rangeLegend}
					show={showLegend}
					aside={aside}
					items={items}
					hidden={hidden}
					onToggle={toggle}
					onFocus={setFocus}
				/>
			}
			legendPlacement={legendPlacement}
			plotRegion={
				<MapPlotRegion
					{...name}
					shape={shape}
					aside={aside}
					keyboard={{
						enabled: navigable,
						activate: activateTarget,
						resolveStops,
						view: { width: shape.viewWidth, height: shape.viewHeight },
						svgRef,
					}}
					tooltip={
						tooltip ? (
							<MapTooltip
								regionNames={regionNames}
								regionCategory={regionCategory}
								regionValues={regionValues}
								categories={categoryMetas}
								entries={tooltipEntries}
								hidden={hidden}
							/>
						) : null
					}
				>
					{svg}
				</MapPlotRegion>
			}
			plotRef={shape.ref}
			containerRef={containerRef}
			tooltip={tooltip}
			regionActive={regionActive}
			table={deferredTable}
			width={width}
			fill={shape.fill}
			className={className}
		/>
	)
}
