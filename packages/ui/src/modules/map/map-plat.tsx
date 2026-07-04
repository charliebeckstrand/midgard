'use client'

import { type ReactNode, type RefObject, useCallback, useMemo, useState } from 'react'
import { cn } from '../../core'
import { type FrameReserve, usePlotFrame } from '../../hooks'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import type { AccessibleName } from '../../types'
import { ChartPlotBox } from '../chart/chart-plot-box'
import { type MapHover, MapHoverContext, MapPlatContext, type MapPlatContextValue } from './context'
import {
	defaultRegionId,
	defaultRegionLabel,
	type MapCategoryMeta,
	regionCategoryIndexes,
	resolveCategories,
	slotColor,
} from './map-categories'
import { projectPoint, regionPaths } from './map-geometry'
import { staticMapGeometry } from './map-geometry-cache'
import { MapLegend, type MapLegendItem } from './map-legend'
import { fitMapProjection, mapFrameSizing, projectionFallbackAspect } from './map-projection'
import { MapRegions } from './map-regions'
import { MapTable } from './map-table'
import { MapTooltip, type MapTooltipEntry } from './map-tooltip'
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

/**
 * The categorical region-data trio — rows, region key, category key — travels
 * together or not at all: a map without data draws its geography in the
 * neutral fill as a backdrop for overlays.
 *
 * @internal
 */
type MapRegionData<T> =
	| {
			/** The rows to colour regions by. */
			data: T[]
			/** The field matching a row to a region's id (see `regionId`). */
			regionKey: DataKey<T>
			/** The field holding the row's category value. */
			categoryKey: DataKey<T>
			/**
			 * Explicit category order, labels, and colours; derived from the data
			 * in first-appearance order when omitted.
			 */
			categories?: MapCategory[]
	  }
	| { data?: undefined; regionKey?: undefined; categoryKey?: undefined; categories?: undefined }

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
		 * (`'bottom'`, the default) or above it (`'top'`), or a column panel
		 * beside it (`'left'` / `'right'`), side by side from `lg` and under the
		 * map below that. Overlay entries register from the client, so they join
		 * the legend after hydration; the legend's box mounts ahead of them —
		 * one row of height for the row placements, a fixed panel width beside
		 * the plot — so late-landing buttons never resize the map or shift the
		 * frame.
		 */
		legend?: boolean | MapLegendPlacement
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

/** The resolved categorical readout behind the regions. @internal */
type MapRegionReadout = {
	categoryMetas: MapCategoryMeta[]
	regionNames: string[]
	/** Each region's category index, `null` where no datum matches. */
	regionCategory: (number | null)[]
}

/** Resolves the categories and matches each region to its row's. @internal */
function useMapRegionReadout<T>(
	features: MapFeature[],
	{ data, regionKey, categoryKey, categories }: MapRegionData<T>,
	regionId: ((feature: MapFeature) => string) | undefined,
	regionLabel: ((feature: MapFeature) => string) | undefined,
): MapRegionReadout {
	const categoryMetas = useMemo(
		() =>
			data !== undefined && categoryKey !== undefined
				? resolveCategories(data, categoryKey, categories)
				: [],
		[data, categoryKey, categories],
	)

	const regionIds = useMemo(() => features.map(regionId ?? defaultRegionId), [features, regionId])

	const regionNames = useMemo(
		() => features.map(regionLabel ?? defaultRegionLabel),
		[features, regionLabel],
	)

	const regionCategory = useMemo(
		() =>
			data !== undefined && regionKey !== undefined && categoryKey !== undefined
				? regionCategoryIndexes(regionIds, data, regionKey, categoryKey, categoryMetas)
				: regionIds.map(() => null),
		[regionIds, data, regionKey, categoryKey, categoryMetas],
	)

	return { categoryMetas, regionNames, regionCategory }
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
 * Whether the legend's box mounts: explicitly asked for, or able to appear —
 * two or more categories, a registered overlay, or overlay children whose
 * entries will register from the client. Deciding off the children keeps the
 * box mounted ahead of late registrations, so they never shift the frame.
 *
 * @internal
 */
function legendCanShow(
	legend: boolean | MapLegendPlacement | undefined,
	categoryCount: number,
	entryCount: number,
	children: ReactNode,
): boolean {
	if (legend !== undefined) return legend !== false

	return categoryCount > 1 || entryCount > 0 || children != null
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

/** The legend entries: the region categories, then every registered overlay. @internal */
function legendItems(
	categories: MapCategoryMeta[],
	entries: MapOverlayEntry[],
	colors: ReadonlyMap<string, MapSeriesColor>,
): MapLegendItem[] {
	const categoryItems = categories.map((meta, index) => ({
		id: `category:${index}`,
		label: meta.label,
		swatchClass: cn(meta.paint.bg),
		swatch: 'rect' as const,
	}))

	const entryItems = entries.map((entry) => ({
		id: entry.id,
		label: entry.label,
		swatchClass: cn(k.series[colors.get(entry.id) ?? 'blue'].bg),
		swatch: entry.swatch,
		detail: entry.detail,
	}))

	return [...categoryItems, ...entryItems]
}

/** Props for {@link MapFrame}: the assembled parts laid out around the plot. @internal */
type MapFrameProps = {
	hover: MapHover
	legendNode: ReactNode
	legendPlacement: MapLegendPlacement
	plotRegion: ReactNode
	table: ReactNode
	width: number | undefined
	className?: string
}

/** The frame shell: legend and table as plain HTML around the plot, under the hover provider. @internal */
function MapFrame({
	hover,
	legendNode,
	legendPlacement,
	plotRegion,
	table,
	width,
	className,
}: MapFrameProps) {
	const aside = legendPlacement === 'left' || legendPlacement === 'right'

	return (
		<div
			data-slot="map"
			className={cn('flex flex-col gap-3', width === undefined && 'w-full', className)}
			style={width === undefined ? undefined : { width }}
		>
			<MapHoverContext value={hover}>
				{aside ? (
					// The panel and plot sit side by side from lg; below it they stack
					// with the panel always under the map, so a left panel reverses
					// the row instead of moving in the DOM.
					<div
						className={cn(
							'flex flex-col gap-2 lg:items-center',
							legendPlacement === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row',
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
			</MapHoverContext>

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

	const { categoryMetas, regionNames, regionCategory } = useMapRegionReadout(
		shape.features,
		{ data, regionKey, categoryKey, categories } as MapRegionData<T>,
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

	const [pointed, setPointed] = useState<Pick<MapHover, 'target' | 'point'>>({
		target: null,
		point: null,
	})

	const hover = useMemo<MapHover>(
		() => ({
			...pointed,
			set: (target, point) => setPointed({ target, point }),
		}),
		[pointed],
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
						swatchClass: cn(k.series[colors.get(entry.id) ?? 'blue'].bg),
						detail: entry.detail,
					},
				]),
			),
		[entries, colors],
	)

	const showLegend = legendCanShow(legend, categoryMetas.length, entries.length, children)

	const legendPlacement: MapLegendPlacement = typeof legend === 'string' ? legend : 'bottom'

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
			hover={hover}
			legendNode={
				<MapLegendSlot
					show={showLegend}
					aside={aside}
					items={legendItems(categoryMetas, entries, colors)}
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
			table={
				hasReadout ? (
					<MapTable
						header={categoryKey === undefined ? 'Detail' : String(categoryKey)}
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
