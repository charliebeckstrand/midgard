'use client'

import {
	type ReactNode,
	type RefObject,
	startTransition,
	useCallback,
	useDeferredValue,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import {
	type FrameReserve,
	useHoverAcrossScroll,
	usePlotFrame,
	useResizeObserver,
} from '../../hooks'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import type { AccessibleName } from '../../types'
import type { ChartRangeLegendConfig } from '../chart/engine/chart-legend/range'
import { resolveRangeLegend } from '../chart/engine/chart-legend/range'
import { ChartPlotBox } from '../chart/engine/chart-plot-box'
import {
	type MapHoverSet,
	MapHoverSetContext,
	type MapHoverState,
	MapHoverStateContext,
	type MapHoverTarget,
	MapPlatContext,
	type MapPlatContextValue,
	MapPointedMarkContext,
	markAnchorAt,
	regionIndexAt,
	sameMark,
	sameTarget,
} from './context'
import {
	categoryLegendId,
	defaultRegionId,
	defaultRegionLabel,
	type MapCategoryMeta,
	regionCategoryIndexes,
	regionGroupId,
	resolveCategories,
	slotColor,
} from './map-categories'
import { type MapPoint2D, projectPoint } from './map-geometry'
import { cachedRegionCentroids, measuredRegionPaths, staticMapGeometry } from './map-geometry-cache'
import { mapStops } from './map-keyboard'
import { MapLegend, type MapLegendItem } from './map-legend'
import { mapFrameSizing, measuredMapFit, projectionFallbackAspect } from './map-projection'
import { MapRangeLegend, type MapRangeLegendProps } from './map-range-legend'
import { MapRegions } from './map-regions'
import { MapTable } from './map-table'
import { MapTooltip, type MapTooltipEntry } from './map-tooltip'
import { type RegionValueJoin, regionValueJoin, resolveValueBins } from './map-value-scale'
import type {
	DataKey,
	LngLat,
	MapAspectRatio,
	MapCategory,
	MapFeature,
	MapGeography,
	MapLegendPlacement,
	MapOverlaySelection,
	MapProjection,
} from './types'
import { type MapKeyboardOptions, useMapKeyboard } from './use-map-keyboard'
import type { MapOverlayEntry } from './use-map-legend-registry'
import { useMapLegendRegistry } from './use-map-legend-registry'
import { useMapToggle } from './use-map-toggle'

/** The rows and the field that matches each to a region; shared by both colour modes. @internal */
type MapRegionRows<T> = {
	/** The rows to colour regions by. */
	data: T[]
	/** The field matching a row to a region's id (see `regionId`). */
	regionKey: DataKey<T>
}

/** The numeric-mode fields, absent (as `undefined`) on the categorical and empty branches. @internal */
type MapNumericAbsent = {
	valueKey?: undefined
	colorRange?: undefined
	bins?: undefined
	binning?: undefined
	domain?: undefined
	valueFormat?: undefined
	valueName?: undefined
}

/** Regions coloured by a categorical field, its slot colours resolved in a fixed order. @internal */
type MapCategoricalData<T> = MapRegionRows<T> &
	MapNumericAbsent & {
		/** The field holding the row's category value. */
		categoryKey: DataKey<T>
		/**
		 * Explicit category order, labels, and colours; derived from the data in
		 * first-appearance order when omitted.
		 */
		categories?: MapCategory[]
	}

/** Regions shaded along a sequential ramp by a numeric field — a choropleth. @internal */
type MapNumericData<T> = MapRegionRows<T> & {
	/** The field holding the row's numeric value; shades regions along the colour range. */
	valueKey: DataKey<T>
	/** Ordered CSS colour stops the bins sample, low → high — the data-driven scale. */
	colorRange: string[]
	/**
	 * Bin count for the ramp and its legend.
	 * @defaultValue one bin per `colorRange` stop
	 */
	bins?: number
	/**
	 * How the bins divide the data: `'linear'` (the default) by equal value
	 * span, or `'quantile'` by rank so each shade covers a similar number of
	 * regions — the reading for skewed data, where an equal-interval ramp leaves
	 * most regions in the lowest bucket. The range legend shows the ramp and the
	 * data extent either way; under `'quantile'` the colour-to-value mapping is
	 * non-linear, so the bar reads as an approximation of where the breaks fall.
	 * @defaultValue 'linear'
	 */
	binning?: 'linear' | 'quantile'
	/** Fixed `[min, max]` for the ramp; derived from the data extent when omitted. */
	domain?: [number, number]
	/** Formats the bin-range labels, the tooltip value, and the table cell. */
	valueFormat?: (value: number) => string
	/** The value's display name; the table's value-column header. */
	valueName?: string
	categoryKey?: undefined
	categories?: undefined
}

/** A data-less map: it draws its geography in the neutral fill as a backdrop for overlays. @internal */
type MapNoData = MapNumericAbsent & {
	data?: undefined
	regionKey?: undefined
	categoryKey?: undefined
	categories?: undefined
}

/**
 * The region-data the map colours by: a categorical field, a numeric field (a
 * choropleth), or nothing. The category and value keys are mutually exclusive;
 * each mode's fields travel together or not at all.
 *
 * @internal
 */
type MapRegionData<T> = MapCategoricalData<T> | MapNumericData<T> | MapNoData

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
		 * `legend={false}` and this prop, and render a single {@link RangeLegend}
		 * whose `onProbe` drives it. The ids only line up across plats when the bins
		 * do, which for the numeric mode means the same `colorRange`, `bins`, and an
		 * explicit `domain` — without the last one each plat bins to its own extent
		 * and an id from one means nothing to another.
		 *
		 * Omitted, the plat owns the state and its own legend drives it. A `null`
		 * keeps it controlled with no emphasis (CONVENTIONS §7.3).
		 */
		emphasis?: string | null
		/** Overlay marks: {@link MapRoute}, {@link MapPoint}, {@link MapMarker}. */
		children?: ReactNode
	}

/** What {@link useMapShape} resolves: the reserved box, the active draw frame, and its geometry. @internal */
type MapShape = {
	ref: RefObject<HTMLDivElement | null>
	/** The plot box's drawing height in px (`0` until measured); the reserve holds the space meanwhile. */
	boxHeight: number
	reserve: FrameReserve | null
	/** Free-form (`aspectRatio={false}`) sizing: the plot fills the height its region already holds. */
	fill: boolean
	/** The active viewBox width: measured px once the container is measured, the canonical frame until then. */
	viewWidth: number
	/** The active viewBox height, paired with {@link viewWidth}. */
	viewHeight: number
	/** Region path ds, index-aligned with the features; empty until fitted. */
	paths: (string | null)[]
	features: MapFeature[]
	project: (position: LngLat) => ReturnType<typeof projectPoint>
}

/**
 * Resolves the geometry the map draws, decoupled from measurement so the
 * neutral geography paints on the first commit. A single canonical fit (fixed
 * frame, no container read) reserves the CSS box through its aspect and paints
 * the geography immediately; the container's measured pixels then drive a refit
 * that reprojects to constant-pixel marks a beat after mount. Sharing the
 * canonical fit's aspect, the refit only sharpens strokes — it never reshapes
 * the geography, so the swap is imperceptible. The canonical stage is memoised
 * across instances by {@link staticMapGeometry}, so remounting the same atlas
 * (a tab switch, a second plat) reuses it rather than recomputing on mount.
 *
 * @internal
 */
function useMapShape(
	geography: MapGeography | null | undefined,
	geographyObject: string | undefined,
	projection: MapProjection,
	width: number | undefined,
	height: number | undefined,
	aspectRatio: MapAspectRatio,
	deferPaint: boolean,
): MapShape {
	// The mount-critical geometry — decode, the measurement-free canonical fit,
	// and its region paths — memoised across instances and mounts (see
	// `map-geometry-cache`), so a tab switch, a second plat on the same atlas, or
	// a route revisit paints on the first commit instead of re-paying the fit.
	// Canonical output is deterministic, so the server and the first client
	// render agree. The per-size measured refit below stays per-instance; it
	// reprojects to constant-pixel marks a beat after this canonical draw.
	const statics = useMemo(
		() => staticMapGeometry(geography, geographyObject, projection),
		[geography, geographyObject, projection],
	)

	// A refit reprojects every region path, so resize commits ride the plot
	// frame's transition priority: a burst coalesces to the sizes the machine
	// can afford, and a stale refit is abandoned rather than blocking.
	// Before the geography loads there is no measured aspect; a fixed-subject
	// projection (albers-usa is the US) still knows the ratio it will take, so
	// the frame reserves it and a lazily fetched atlas swaps in without a height
	// shift.
	const reserveAspect = statics.canonical?.aspect ?? projectionFallbackAspect(projection)

	const sizing = mapFrameSizing(height, aspectRatio, reserveAspect)

	const { ref, width: frameWidth, height: frameHeight, reserve } = usePlotFrame(width, sizing)

	// The measured refit, its region paths, and the projector, resolved as one
	// unit so a resize reprojects all three together. A passed d3 instance is fit
	// in place and keeps its reference, so keying the paths or the projector on
	// that reference alone would freeze them at the first fit — the region layer
	// and the overlays would disagree with the resized viewBox. Deriving them
	// inside one memo over the live frame dimensions reprojects on every resize,
	// and hands the context a fresh `project` identity so overlay marks recompute.
	// The measured paths themselves come through the cross-instance memo
	// (`measuredRegionPaths`), so a remount at the same box reuses them instead
	// of reprojecting the atlas. With nothing to frame the measured fit is
	// `null`, so the map holds the canonical draw (or the neutral frame) rather
	// than projecting through an unfitted default.
	const view = useMemo(() => {
		const { features, canonical, canonicalPaths } = statics

		const measured = measuredMapFit(projection, features, canonical, frameWidth, frameHeight)

		// Deferred paint: hold the frame empty (the reserve still owns the box) until
		// the measurement lands, so the geography paints once at the measured aspect
		// with the legend already resolved rather than flashing the canonical fit and
		// refitting. The `viewWidth` 0 keeps the SVG unmounted meanwhile.
		if (!measured && deferPaint) {
			return { viewWidth: 0, viewHeight: 0, paths: canonicalPaths, project: () => null }
		}

		// Draw from the measured fit once it lands, the canonical fit until then, so
		// the geography never waits on the container being measured.
		const fitted = measured ?? canonical?.projection ?? null

		return {
			viewWidth: measured ? frameWidth : (canonical?.width ?? 0),
			viewHeight: measured ? frameHeight : (canonical?.height ?? 0),
			paths: measured
				? measuredRegionPaths(statics, measured, frameWidth, frameHeight)
				: canonicalPaths,
			project: (position: LngLat) => (fitted === null ? null : projectPoint(fitted, position)),
		}
	}, [projection, statics, frameWidth, frameHeight, deferPaint])

	const { viewWidth, viewHeight, paths, project } = view

	return {
		ref,
		boxHeight: frameHeight,
		reserve,
		fill: sizing.mode === 'fill',
		viewWidth,
		viewHeight,
		paths,
		features: statics.features,
		project,
	}
}

/** The resolved categorical or numeric readout behind the regions. @internal */
type MapRegionReadout = {
	categoryMetas: MapCategoryMeta[]
	regionNames: string[]
	/** Each region's category / bin index, `null` where no datum matches. */
	regionCategory: (number | null)[]
	/** Each region's own formatted value in the numeric (choropleth) mode — the
	 * tooltip and table readout, distinct from its bin's range label; `null` in
	 * categorical mode and wherever no datum matches. */
	regionValues: (string | null)[]
	/** Each region's raw number in the numeric (choropleth) mode — the range
	 * legend's arrow marks it on the continuous bar; `null` in categorical mode
	 * and wherever no datum matches. */
	regionNumbers: (number | null)[]
	/** The numeric value extent in the numeric (choropleth) mode; `null` otherwise. Feeds the range legend. */
	domain: [number, number] | null
}

/** Resolves the categories or choropleth bins and matches each region to its bin. @internal */
function useMapRegionReadout<T>(
	features: MapFeature[],
	{
		data,
		regionKey,
		categoryKey,
		categories,
		valueKey,
		colorRange,
		bins,
		binning,
		domain,
		valueFormat,
	}: MapRegionData<T>,
	/** Region identities, resolved by the caller — the join key every branch below matches rows on. */
	regionIds: string[],
	regionLabel: ((feature: MapFeature) => string) | undefined,
): MapRegionReadout {
	const regionNames = useMemo(
		() => features.map(regionLabel ?? defaultRegionLabel),
		[features, regionLabel],
	)

	// One resolution: the numeric branch bins by value along a ramp, the
	// categorical branch resolves slot colours, and a data-less map leaves every
	// region on the neutral fill. Both branches emit the same meta + index shape,
	// so the regions, legend, tooltip, and table read either unchanged.
	const {
		categoryMetas,
		regionCategory,
		regionValues,
		regionNumbers,
		domain: extent,
	} = useMemo<
		RegionValueJoin & { categoryMetas: MapCategoryMeta[]; domain: [number, number] | null }
	>(() => {
		// The all-null column, shared by every field a branch leaves empty:
		// nothing downstream mutates the readout arrays, so one allocation
		// serves them all.
		const noValues = regionIds.map(() => null)

		if (data === undefined || regionKey === undefined) {
			return {
				categoryMetas: [],
				regionCategory: noValues,
				regionValues: noValues,
				regionNumbers: noValues,
				domain: null,
			}
		}

		if (valueKey !== undefined && colorRange !== undefined) {
			const format = valueFormat ?? ((value) => String(value))

			const {
				metas,
				domain: resolved,
				assign,
			} = resolveValueBins(data, valueKey, {
				colorRange,
				bins,
				binning,
				domain,
				format,
			})

			// One joined pass: each region's bin (its colour), its own formatted
			// readout (the tooltip and table show "2,088", not the bin's "1–135"),
			// and its raw number (the range legend's arrow).
			return {
				categoryMetas: metas,
				...regionValueJoin(regionIds, data, regionKey, valueKey, assign, format),
				domain: resolved,
			}
		}

		if (categoryKey !== undefined) {
			const metas = resolveCategories(data, categoryKey, categories)

			return {
				categoryMetas: metas,
				regionCategory: regionCategoryIndexes(regionIds, data, regionKey, categoryKey, metas),
				// Categorical mode reads the category label off the meta; no separate value.
				regionValues: noValues,
				regionNumbers: noValues,
				domain: null,
			}
		}

		return {
			categoryMetas: [],
			regionCategory: noValues,
			regionValues: noValues,
			regionNumbers: noValues,
			domain: null,
		}
	}, [
		data,
		regionKey,
		categoryKey,
		categories,
		valueKey,
		colorRange,
		bins,
		binning,
		domain,
		valueFormat,
		regionIds,
	])

	return { categoryMetas, regionNames, regionCategory, regionValues, regionNumbers, domain: extent }
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

/**
 * The map's `legend` prop: the switchboard's boolean / placement, the `'range'`
 * discriminator that swaps in the continuous scale bar, or the object form
 * `{ type: 'range', placement }` naming that bar's placement — the same shape a
 * chart's range legend takes, so the choropleth and heatmap read alike.
 *
 * @internal
 */
type MapLegendInput = boolean | MapLegendPlacement | 'range' | ChartRangeLegendConfig

/** Whether a `legend` prop asks for the continuous range bar rather than the binned switchboard. @internal */
function isRangeLegend(legend: MapLegendInput | undefined): boolean {
	if (legend === 'range') return true

	// The only object form is the range config, so any object asks for the bar.
	return typeof legend === 'object'
}

/**
 * Whether the legend's box mounts: explicitly asked for, or able to appear —
 * two or more categories, a registered overlay, or overlay children whose
 * entries will register from the client. Deciding off the children keeps the
 * box mounted ahead of late registrations, so they never shift the frame.
 *
 * @internal
 */
function legendCanShow(
	legend: MapLegendInput | undefined,
	categoryCount: number,
	entryCount: number,
	children: ReactNode,
): boolean {
	if (legend !== undefined) return legend !== false

	return categoryCount > 1 || entryCount > 0 || children != null
}

/**
 * The switchboard legend's placement: the numeric (choropleth) mode reads on the
 * right by default, categorical maps keep the centered bottom row, and an
 * explicit placement always wins. The range bar resolves its own placement
 * through {@link resolveRangeLegend}, so this only serves the switchboard.
 *
 * @internal
 */
function resolveLegendPlacement(
	legend: MapLegendInput | undefined,
	numeric: boolean,
): MapLegendPlacement {
	if (typeof legend === 'string' && legend !== 'range') return legend

	return numeric ? 'right' : 'bottom'
}

/** The scale the range bar reads, kept together so {@link planMapLegend} can gate on all of it at once. @internal */
type MapRangeScale = {
	colorRange: string[] | undefined
	valueExtent: [number, number] | null
	valueFormat: ((value: number) => string) | undefined
	valueName: string | undefined
	/** Each region's raw value — the bar's hover arrow marks the pointed one. */
	regionNumbers: (number | null)[]
	onFocus: (id: string | null) => void
}

/** What the map draws for its legend: whether it shows, where it sits, and the range bar's props in range mode. @internal */
type MapLegendPlan = {
	show: boolean
	placement: MapLegendPlacement
	/** The continuous scale bar's props, or `null` for the binned switchboard. */
	range: MapRangeLegendProps | null
}

/**
 * Resolves the map's legend against its measured box: the binned switchboard
 * keeps its own can-show and placement rules, while the range bar (numeric mode,
 * `'range'` or the object form) resolves placement, orientation, and visibility
 * through the shared {@link resolveRangeLegend} — sheds at the spark tier, drops
 * a side placement to a horizontal row in a box too narrow for a rail — so the
 * choropleth's bar behaves exactly as the heatmap's does. Kept pure and off
 * {@link MapPlat} so the component stays a thin assembly.
 *
 * @internal
 */
function planMapLegend(
	legend: MapLegendInput | undefined,
	numeric: boolean,
	box: { width: number; height: number },
	switchboard: { categoryCount: number; entryCount: number; children: ReactNode },
	scale: MapRangeScale,
): MapLegendPlan {
	if (!(numeric && isRangeLegend(legend))) {
		return {
			show: legendCanShow(
				legend,
				switchboard.categoryCount,
				switchboard.entryCount,
				switchboard.children,
			),
			placement: resolveLegendPlacement(legend, numeric),
			range: null,
		}
	}

	const resolved = resolveRangeLegend(
		typeof legend === 'object' ? legend : undefined,
		box.width,
		box.height,
	)

	// The direct value checks (not a precomputed boolean) narrow `colorRange` and
	// `valueExtent` inside the branch, so the range props type without an assertion.
	const range: MapRangeLegendProps | null =
		resolved.show && scale.colorRange !== undefined && scale.valueExtent !== null
			? {
					colorRange: scale.colorRange,
					domain: scale.valueExtent,
					format: scale.valueFormat ?? ((value) => String(value)),
					label: scale.valueName,
					bins: switchboard.categoryCount,
					regionNumbers: scale.regionNumbers,
					onFocus: scale.onFocus,
					orientation: resolved.orientation,
				}
			: null

	return { show: range !== null, placement: resolved.placement, range }
}

/** Props for {@link MapLegendSlot}: the reserved box and the toolbar it holds. @internal */
type MapLegendSlotProps = {
	/** Mount the box at all; `false` renders nothing (legend off). */
	show: boolean
	/** Reserve the side panel's fixed column instead of the row's height. */
	aside: boolean
	items: MapLegendItem[]
	hidden: ReadonlySet<string>
	onToggle: (id: string) => void
	onFocus: (id: string | null) => void
}

/**
 * The legend's reserved box: it owns the space — one row of height, or the
 * side panel's fixed column — and the toolbar mounts inside it only once it
 * has buttons, so the frame holds steady while overlay entries load in.
 *
 * @internal
 */
function MapLegendSlot({ show, aside, items, hidden, onToggle, onFocus }: MapLegendSlotProps) {
	if (!show) return null

	return (
		<div data-slot="map-legend-box" className={cn(aside ? k.legendBox.panel : k.legendBox.row)}>
			{items.length > 0 && (
				<MapLegend
					items={items}
					hidden={hidden}
					onToggle={onToggle}
					onFocus={onFocus}
					panel={aside}
				/>
			)}
		</div>
	)
}

/** Props for {@link MapLegendRegion}: the binned switchboard, or the range scale bar when `range` is set. @internal */
type MapLegendRegionProps = MapLegendSlotProps & {
	/** When set, paint the continuous colour-scale bar (range mode) instead of the switchboard. */
	range: MapRangeLegendProps | null
}

/** The legend beside or under the plot: the continuous scale bar in range mode, else the binned switchboard. @internal */
function MapLegendRegion({ range, ...slot }: MapLegendRegionProps) {
	if (range) return <MapRangeLegend {...range} />

	return <MapLegendSlot {...slot} />
}

/**
 * The legend entries: the region categories, then every registered overlay.
 * A numeric choropleth lists its bins largest-first (descending), matching the
 * range bar's high-at-top scale; the bin ids stay bound to their value order.
 *
 * @internal
 */
function legendItems(
	categories: MapCategoryMeta[],
	entries: MapOverlayEntry[],
	colors: ReadonlyMap<string, MapSeriesColor>,
	descending: boolean,
): MapLegendItem[] {
	const categoryItems = categories.map((meta) => ({
		id: categoryLegendId(meta.value),
		label: meta.label,
		// A categorical slot carries a currentColor class; a numeric bin an inline value.
		...(meta.paint.kind === 'value'
			? { swatchColor: meta.paint.color }
			: { swatchClass: cn(meta.paint.text) }),
		swatch: 'rect' as const,
	}))

	if (descending) categoryItems.reverse()

	const entryItems = entries.map((entry) => ({
		id: entry.id,
		label: entry.label,
		swatchClass: cn(k.series[colors.get(entry.id) ?? 'blue'].text),
		swatch: entry.swatch,
		detail: entry.detail,
	}))

	return [...categoryItems, ...entryItems]
}

/** Whether two hover points coincide, so a redundant hover write can bail. @internal */
function samePoint(a: MapPoint2D | null, b: MapPoint2D | null): boolean {
	return a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y)
}

/**
 * Owns the pointer readout and hands it down split three ways: the stable
 * mover through {@link MapHoverSetContext} — the marks read it, so they never
 * repaint as the pointer travels — the live {@link MapHoverState} through its
 * own context, which only the tooltip reads, and the pointed mark through
 * {@link MapPointedMarkContext}, whose identity holds across a same-mark move
 * so the marks reading it repaint only on discrete crossings. Holding the
 * state here, below {@link MapPlat} and around the plot alone, keeps a pointer
 * move from re-rendering the plat, the legend, or the region layer: the
 * provider re-renders and its stable `children` bail, so the tooltip is the
 * sole subtree that repaints.
 *
 * @internal
 */
function MapHoverProvider({
	enabled,
	plotRef,
	regionActive,
	children,
}: {
	/** Whether the tooltip is on; gates the scroll listener on a stable flag. */
	enabled: boolean
	plotRef: RefObject<HTMLDivElement | null>
	/** Whether a region's category is matched and shown — the pointed-emphasis gate, the same silence the tooltip keeps off data. */
	regionActive: (index: number) => boolean
	children: ReactNode
}) {
	const [state, setState] = useState<MapHoverState>({ target: null, point: null })

	const set = useCallback<MapHoverSet>(
		(target, point) =>
			// Bail on a no-op so a scroll's repeated clears cost one render, and a
			// page scroll far from this map costs none. A same-mark move keeps the
			// held target's identity — every tracked pointer event builds a fresh
			// target object — so the pointed-mark context below changes only on a
			// crossing, never per pixel.
			setState((prev) => {
				if (sameTarget(prev.target, target) && samePoint(prev.point, point)) return prev

				return { target: sameTarget(prev.target, target) ? prev.target : target, point }
			}),
		[],
	)

	// The pointed mark the marks dim against: the hover target, gated so a
	// region outside every live group — no data, or its category toggled
	// off — takes no emphasis; isolating the neutral fill would read as a
	// broken map, the way a chart never dims against a hidden series.
	const target = state.target

	// Pinned at mark granularity, the way the chart frame pins its own pointed
	// mark: this value names the mark, never the stop within it, and every mark on
	// the map reads it. Sweeping between the dots of one plural mark would
	// otherwise republish on each crossing and re-render every mark — the regions,
	// the range legend, all the overlays — for the answer each already held.
	const pinned = useRef<MapHoverTarget | null>(null)

	const pointed = useMemo(() => {
		const next =
			target !== null && target.kind === 'region' && !regionActive(target.index) ? null : target

		if (sameMark(pinned.current, next)) return pinned.current

		pinned.current = next

		return next
	}, [target, regionActive])

	const clear = useCallback(() => set(null, null), [set])

	// A scroll slides the marks under a stationary pointer without firing a pointer
	// event; recompute at its last position once the scroll settles, reading the
	// mark now under it straight off the DOM — a synthetic move never reaches the
	// region handlers.
	const resolveAt = useCallback(
		(clientX: number, clientY: number) => {
			const plot = plotRef.current

			const under = plot === null ? null : document.elementFromPoint(clientX, clientY)

			if (plot === null || under === null || !plot.contains(under)) {
				set(null, null)

				return
			}

			const point = { x: clientX, y: clientY }

			const region = regionIndexAt(under)

			if (region !== null) {
				set({ kind: 'region', index: region }, point)

				return
			}

			// Resolved through the shared anchor reader, so a plural mark re-settles
			// on the dot the pointer is actually over rather than on the mark's first.
			const mark = markAnchorAt(under)

			if (mark !== null) {
				set({ kind: 'entry', ...mark }, point)

				return
			}

			// Over the plat but between marks — the ocean — reads nothing.
			set(null, null)
		},
		[plotRef, set],
	)

	useHoverAcrossScroll(enabled, clear, resolveAt)

	return (
		<MapHoverSetContext value={set}>
			<MapPointedMarkContext value={pointed}>
				<MapHoverStateContext value={state}>{children}</MapHoverStateContext>
			</MapPointedMarkContext>
		</MapHoverSetContext>
	)
}

/** Props for {@link MapFrame}: the assembled parts laid out around the plot. @internal */
type MapFrameProps = {
	legendNode: ReactNode
	legendPlacement: MapLegendPlacement
	plotRegion: ReactNode
	/** The plot region element; the hover provider re-resolves settled scroll pointers within it. */
	plotRef: RefObject<HTMLDivElement | null>
	/** The frame's outer box; its measured width drives the range bar's tier-aware placement. */
	containerRef: RefObject<HTMLDivElement | null>
	/** Whether the tooltip is on; gates the hover provider's scroll listener. */
	tooltip: boolean
	/** Whether a region's category is matched and shown; the hover provider's pointed-emphasis gate. */
	regionActive: (index: number) => boolean
	table: ReactNode
	width: number | undefined
	/** Free-form (`aspectRatio={false}`) sizing: the frame fills its container's height. */
	fill: boolean
	className?: string
}

/** The frame shell: legend and table as plain HTML around the plot, under the hover provider. @internal */
function MapFrame({
	legendNode,
	legendPlacement,
	plotRegion,
	plotRef,
	containerRef,
	tooltip,
	regionActive,
	table,
	width,
	fill,
	className,
}: MapFrameProps) {
	const aside = legendPlacement === 'left' || legendPlacement === 'right'

	return (
		<div
			ref={containerRef}
			data-slot="map"
			// A free-form fill frame grabs its container's height (`h-full`) so the
			// plot region has a real height to grow into; every other mode reserves
			// height from the plot's own width and needs none.
			className={cn(
				'flex flex-col gap-4',
				width === undefined && 'w-full',
				fill && 'h-full',
				className,
			)}
			style={width === undefined ? undefined : { width }}
		>
			<MapHoverProvider enabled={tooltip} plotRef={plotRef} regionActive={regionActive}>
				{aside ? (
					// The panel and plot sit side by side from lg; below it they stack
					// with the panel always under the map, so a left panel reverses
					// the row instead of moving in the DOM.
					<div
						className={cn(
							'flex flex-col gap-4 items-center',
							legendPlacement === 'left' ? 'flex-row-reverse' : 'flex-row',
						)}
					>
						{plotRegion}

						{legendNode}
					</div>
				) : (
					<>
						{legendPlacement === 'top' && legendNode}

						{plotRegion}

						{legendPlacement === 'bottom' && legendNode}
					</>
				)}
			</MapHoverProvider>

			{table}
		</div>
	)
}

/** Props for {@link MapPlotRegion}: the measured box holding the SVG and the tooltip. @internal */
type MapPlotRegionProps = AccessibleName & {
	shape: MapShape
	aside: boolean
	tooltip: ReactNode
	/** What the keyboard cursor needs; the plat resolves it, this element hosts it. */
	keyboard: MapKeyboardOptions
	children: ReactNode
}

/**
 * The `role="img"` plot box: the aspect-reserved SVG with the tooltip beside it.
 * It owns the keyboard tab stop, because the cursor writes to the hover context
 * this element renders inside — {@link MapPlat} sits above the provider and
 * could not reach it.
 *
 * @internal
 */
function MapPlotRegion({
	shape,
	aside,
	tooltip,
	keyboard: options,
	children,
	...name
}: MapPlotRegionProps) {
	const keyboard = useMapKeyboard(options)

	return (
		<div
			ref={shape.ref}
			data-slot="map-plot"
			role="img"
			{...name}
			{...keyboard}
			// A side legend takes the width remainder (`min-w-0 flex-1`); a free-form
			// `fill` map instead grows into the height its region already holds — a
			// `flex-1 min-h-0` child of the `h-full` frame — so the box measures a real
			// height rather than the zero its own reserve would feed back.
			className={cn(
				'relative',
				// The focus ring only rides a region that can take focus; a rounded
				// corner comes with it, so the outline follows the box it rings.
				keyboard && ['rounded-sm', k.focus],
				aside && 'min-w-0',
				(aside || shape.fill) && 'flex-1',
				shape.fill && 'min-h-0',
			)}
		>
			{/* PlotBox reserves the box height from its own width — steady before the
			    width is measured and across animation replays — takes a fixed height, or
			    (under `fill`) fills the height its region already holds. */}
			<ChartPlotBox reserve={shape.reserve} height={shape.boxHeight} fill={shape.fill}>
				{children}
			</ChartPlotBox>

			{tooltip}
		</div>
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
 * table.
 * Geometry is prop-supplied TopoJSON / GeoJSON; {@link MapRoute},
 * {@link MapPoint}, and {@link MapMarker} children draw over the geography
 * and register their own legend entries.
 *
 * @remarks Consumers geocode addresses to coordinates through `AddressInput`
 * (or any provider) and fetch street-following paths through
 * {@link fetchOsrmRoute} / {@link fetchValhallaRoute} — the plat itself
 * never calls the network.
 */
export function MapPlat<T = never>({
	geography,
	geographyObject,
	projection = 'mercator',
	data,
	regionKey,
	categoryKey,
	categories,
	valueKey,
	colorRange,
	bins,
	binning,
	domain,
	valueFormat,
	valueName,
	regionId,
	regionLabel,
	width,
	height,
	aspectRatio = 'auto',
	deferPaint = false,
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
	...name
}: MapPlatProps<T>) {
	const shape = useMapShape(
		geography,
		geographyObject,
		projection,
		width,
		height,
		aspectRatio,
		deferPaint,
	)

	// Region identity, resolved off the geography alone — a property of the
	// geometry, not of the data. Both the readout (which joins rows on it) and a
	// click (which reports it) read this one resolution.
	const regionIds = useMemo(
		() => shape.features.map(regionId ?? defaultRegionId),
		[shape.features, regionId],
	)

	const {
		categoryMetas,
		regionNames,
		regionCategory,
		regionValues,
		regionNumbers,
		domain: valueExtent,
	} = useMapRegionReadout(
		shape.features,
		{
			data,
			regionKey,
			categoryKey,
			categories,
			valueKey,
			colorRange,
			bins,
			binning,
			domain,
			valueFormat,
		} as MapRegionData<T>,
		regionIds,
		regionLabel,
	)

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
		{ categoryCount: categoryMetas.length, entryCount: entries.length, children },
		{ colorRange, valueExtent, valueFormat, valueName, regionNumbers, onFocus: setFocus },
	)

	const aside = legendPlacement === 'left' || legendPlacement === 'right'

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
