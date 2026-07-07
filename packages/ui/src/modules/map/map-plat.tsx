'use client'

import { type ReactNode, type RefObject, useCallback, useMemo, useRef, useState } from 'react'
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
import { ChartPlotBox } from '../chart/chart-plot-box'
import { resolveRangeLegend } from '../chart/chart-range-legend'
import type { ChartRangeLegendConfig } from '../chart/chart-schema'
import {
	type MapHoverSet,
	MapHoverSetContext,
	type MapHoverState,
	MapHoverStateContext,
	type MapHoverTarget,
	MapPlatContext,
	type MapPlatContextValue,
} from './context'
import {
	defaultRegionId,
	defaultRegionLabel,
	type MapCategoryMeta,
	regionCategoryIndexes,
	resolveCategories,
	slotColor,
} from './map-categories'
import { type MapPoint2D, projectPoint, regionPaths } from './map-geometry'
import { staticMapGeometry } from './map-geometry-cache'
import { MapLegend, type MapLegendItem } from './map-legend'
import { fitMapProjection, mapFrameSizing, projectionFallbackAspect } from './map-projection'
import { MapRangeLegend, type MapRangeLegendProps } from './map-range-legend'
import { MapRegions } from './map-regions'
import { MapTable } from './map-table'
import { MapTooltip, type MapTooltipEntry } from './map-tooltip'
import { regionValueIndexes, resolveValueBins } from './map-value-scale'
import type {
	DataKey,
	LngLat,
	MapAspectRatio,
	MapCategory,
	MapFeature,
	MapGeography,
	MapLegendPlacement,
	MapProjection,
} from './types'
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
	 * Equal-interval bin count for the ramp and its legend.
	 * @defaultValue one bin per `colorRange` stop
	 */
	bins?: number
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
		 * Show the hover tooltip naming the pointed region or overlay.
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
		/** Overlay marks: {@link MapRoute}, {@link MapPoint}, {@link MapMarker}. */
		children?: ReactNode
	}

/** What {@link useMapShape} resolves: the reserved box, the active draw frame, and its geometry. @internal */
type MapShape = {
	ref: RefObject<HTMLDivElement | null>
	/** The plot box's drawing height in px (`0` until measured); the reserve holds the space meanwhile. */
	boxHeight: number
	reserve: FrameReserve | null
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
): MapShape {
	// The mount-critical geometry — decode, the measurement-free canonical fit,
	// and its region paths — memoised across instances and mounts (see
	// `map-geometry-cache`), so a tab switch, a second plat on the same atlas, or
	// a route revisit paints on the first commit instead of re-paying the fit.
	// Canonical output is deterministic, so the server and the first client
	// render agree. The per-size measured refit below stays per-instance; it
	// reprojects to constant-pixel marks a beat after this canonical draw.
	const { features, canonical, canonicalPaths } = useMemo(
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
	const reserveAspect = canonical?.aspect ?? projectionFallbackAspect(projection)

	const {
		ref,
		width: frameWidth,
		height: frameHeight,
		reserve,
	} = usePlotFrame(width, mapFrameSizing(height, aspectRatio, reserveAspect))

	const measured = useMemo(
		() =>
			frameWidth > 0 && frameHeight > 0
				? fitMapProjection(projection, features, frameWidth, frameHeight)
				: null,
		[projection, features, frameWidth, frameHeight],
	)

	// The measured refit's region paths, once the container is measured; `null`
	// until then, when the cached canonical paths carry the first paint.
	const measuredPaths = useMemo(
		() => (measured === null ? null : regionPaths(features, measured)),
		[features, measured],
	)

	// Draw from the measured fit once it lands, the canonical fit until then, so
	// the geography never waits on the container being measured.
	const fitted = measured ?? canonical?.projection ?? null

	const viewWidth = measured ? frameWidth : (canonical?.width ?? 0)

	const viewHeight = measured ? frameHeight : (canonical?.height ?? 0)

	const paths = measuredPaths ?? canonicalPaths

	const project = useCallback(
		(position: LngLat) => (fitted === null ? null : projectPoint(fitted, position)),
		[fitted],
	)

	return { ref, boxHeight: frameHeight, reserve, viewWidth, viewHeight, paths, features, project }
}

/** The resolved categorical or numeric readout behind the regions. @internal */
type MapRegionReadout = {
	categoryMetas: MapCategoryMeta[]
	regionNames: string[]
	/** Each region's category / bin index, `null` where no datum matches. */
	regionCategory: (number | null)[]
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
		domain,
		valueFormat,
	}: MapRegionData<T>,
	regionId: ((feature: MapFeature) => string) | undefined,
	regionLabel: ((feature: MapFeature) => string) | undefined,
): MapRegionReadout {
	const regionIds = useMemo(() => features.map(regionId ?? defaultRegionId), [features, regionId])

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
		domain: extent,
	} = useMemo<{
		categoryMetas: MapCategoryMeta[]
		regionCategory: (number | null)[]
		domain: [number, number] | null
	}>(() => {
		if (data === undefined || regionKey === undefined) {
			return { categoryMetas: [], regionCategory: regionIds.map(() => null), domain: null }
		}

		if (valueKey !== undefined && colorRange !== undefined) {
			const { metas, domain: resolved } = resolveValueBins(data, valueKey, {
				colorRange,
				bins,
				domain,
				format: valueFormat ?? ((value) => String(value)),
			})

			return {
				categoryMetas: metas,
				regionCategory: regionValueIndexes(
					regionIds,
					data,
					regionKey,
					valueKey,
					metas.length,
					resolved,
				),
				domain: resolved,
			}
		}

		if (categoryKey !== undefined) {
			const metas = resolveCategories(data, categoryKey, categories)

			return {
				categoryMetas: metas,
				regionCategory: regionCategoryIndexes(regionIds, data, regionKey, categoryKey, metas),
				domain: null,
			}
		}

		return { categoryMetas: [], regionCategory: regionIds.map(() => null), domain: null }
	}, [
		data,
		regionKey,
		categoryKey,
		categories,
		valueKey,
		colorRange,
		bins,
		domain,
		valueFormat,
		regionIds,
	])

	return { categoryMetas, regionNames, regionCategory, domain: extent }
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

	// The only object form is the range config, so any object asks for the bar;
	// its `type` (only `'range'`) defaults in.
	return typeof legend === 'object' && (legend.type ?? 'range') === 'range'
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
	regionCategory: (number | null)[]
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
					regionCategory: scale.regionCategory,
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
	const categoryItems = categories.map((meta, index) => ({
		id: `category:${index}`,
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

/** Whether two hover targets are the same mark, so a redundant hover write can bail. @internal */
function sameTarget(a: MapHoverTarget | null, b: MapHoverTarget | null): boolean {
	if (a === b) return true

	if (a === null || b === null || a.kind !== b.kind) return false

	return a.kind === 'region'
		? a.index === (b as { index: number }).index
		: a.id === (b as { id: string }).id
}

/** Whether two hover points coincide, so a redundant hover write can bail. @internal */
function samePoint(a: MapPoint2D | null, b: MapPoint2D | null): boolean {
	return a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y)
}

/**
 * Owns the pointer readout and hands it down split: the stable mover through
 * {@link MapHoverSetContext} — the marks read it, so they never repaint as the
 * pointer travels — and the live {@link MapHoverState} through its own context,
 * which only the tooltip reads. Holding the state here, below {@link MapPlat}
 * and around the plot alone, keeps a pointer move from re-rendering the plat,
 * the legend, or the region layer: the provider re-renders and its stable
 * `children` bail, so the tooltip is the sole subtree that repaints.
 *
 * @internal
 */
function MapHoverProvider({
	enabled,
	plotRef,
	children,
}: {
	/** Whether the tooltip is on; gates the scroll listener on a stable flag. */
	enabled: boolean
	plotRef: RefObject<HTMLDivElement | null>
	children: ReactNode
}) {
	const [state, setState] = useState<MapHoverState>({ target: null, point: null })

	const set = useCallback<MapHoverSet>(
		(target, point) =>
			// Bail on a no-op so a scroll's repeated clears cost one render, and a
			// page scroll far from this map costs none.
			setState((prev) =>
				sameTarget(prev.target, target) && samePoint(prev.point, point) ? prev : { target, point },
			),
		[],
	)

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

			const region = under.closest('[data-region-index]')

			if (region !== null) {
				set({ kind: 'region', index: Number(region.getAttribute('data-region-index')) }, point)

				return
			}

			const entry = under.closest('[data-entry-id]')

			if (entry !== null) {
				set({ kind: 'entry', id: entry.getAttribute('data-entry-id') ?? '' }, point)

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
			<MapHoverStateContext value={state}>{children}</MapHoverStateContext>
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
	table: ReactNode
	width: number | undefined
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
	table,
	width,
	className,
}: MapFrameProps) {
	const aside = legendPlacement === 'left' || legendPlacement === 'right'

	return (
		<div
			ref={containerRef}
			data-slot="map"
			className={cn('flex flex-col gap-4', width === undefined && 'w-full', className)}
			style={width === undefined ? undefined : { width }}
		>
			<MapHoverProvider enabled={tooltip} plotRef={plotRef}>
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
	children: ReactNode
}

/** The `role="img"` plot box: the aspect-reserved SVG with the tooltip beside it. @internal */
function MapPlotRegion({ shape, aside, tooltip, children, ...name }: MapPlotRegionProps) {
	return (
		<div
			ref={shape.ref}
			data-slot="map-plot"
			role="img"
			{...name}
			className={cn('relative', aside && 'min-w-0 flex-1')}
		>
			{/* PlotBox reserves the box height from its own width — steady before the
			    width is measured and across animation replays — or takes a fixed height. */}
			<ChartPlotBox reserve={shape.reserve} height={shape.boxHeight}>
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
 * An SVG geography map on the chart module's interaction grammar: regions
 * coloured by category from typed rows, one merged legend where pointing an
 * entry dims everything outside its group and clicking toggles it off, a
 * pointer-anchored Tooltip readout, and a visually-hidden data table.
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
	domain,
	valueFormat,
	valueName,
	regionId,
	regionLabel,
	width,
	height,
	aspectRatio = 'auto',
	legend,
	tooltip = true,
	animate = false,
	className,
	children,
	...name
}: MapPlatProps<T>) {
	const shape = useMapShape(geography, geographyObject, projection, width, height, aspectRatio)

	const {
		categoryMetas,
		regionNames,
		regionCategory,
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
			domain,
			valueFormat,
		} as MapRegionData<T>,
		regionId,
		regionLabel,
	)

	const { hidden, toggle, setFocus, emphasis } = useMapToggle()

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

	// Registration ordinal per entry, so a staggered reveal can key off it.
	const order = useMemo<ReadonlyMap<string, number>>(
		() => new Map(entries.map((entry, index) => [entry.id, index])),
		[entries],
	)

	const plat = useMemo<MapPlatContextValue>(
		() => ({ project: shape.project, register, colors, order, hidden, emphasis, animate }),
		[shape.project, register, colors, order, hidden, emphasis, animate],
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
					},
				]),
			),
		[entries, colors],
	)

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

		setMeasuredWidth((prev) => (prev === next ? prev : next))
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
		{ colorRange, valueExtent, valueFormat, valueName, regionCategory, onFocus: setFocus },
	)

	const aside = legendPlacement === 'left' || legendPlacement === 'right'

	// The SVG fills its box through the viewBox rather than pixel dimensions, so
	// the box — not the marks — owns the size. The view frame is the canonical
	// one until the container is measured, then the measured pixels, so the
	// geography paints on the first commit without waiting to be measured.
	const svg = shape.viewWidth > 0 && shape.viewHeight > 0 && (
		<svg
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
					/>

					{children}
				</MapMarksLayer>
			</MapPlatContext>
		</svg>
	)

	const hasReadout = (data !== undefined && regionNames.length > 0) || entries.length > 0

	return (
		<MapFrame
			legendNode={
				<MapLegendRegion
					range={rangeLegend}
					show={showLegend}
					aside={aside}
					items={legendItems(categoryMetas, entries, colors, numeric)}
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
					tooltip={
						tooltip ? (
							<MapTooltip
								regionNames={regionNames}
								regionCategory={regionCategory}
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
			table={
				hasReadout ? (
					<MapTable
						header={valueColumnHeader(categoryKey, valueKey, valueName)}
						regionNames={data === undefined ? [] : regionNames}
						regionCategory={regionCategory}
						categories={categoryMetas}
						entries={entries}
					/>
				) : null
			}
			width={width}
			className={className}
		/>
	)
}
