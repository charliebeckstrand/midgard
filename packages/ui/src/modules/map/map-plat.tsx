'use client'

import { type ReactNode, type RefObject, useCallback, useMemo, useState } from 'react'
import { AspectRatio } from '../../components/aspect-ratio'
import { cn } from '../../core'
import { usePlotFrame } from '../../hooks'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k, type MapSeriesColor } from '../../recipes/kata/map'
import type { AccessibleName } from '../../types'
import { useChartAnimationKey } from '../chart/use-chart-animation-key'
import { type MapHover, MapHoverContext, MapPlatContext, type MapPlatContextValue } from './context'
import {
	defaultRegionId,
	defaultRegionLabel,
	type MapCategoryMeta,
	regionCategoryIndexes,
	resolveCategories,
	slotColor,
} from './map-categories'
import { geographyFeatures, projectPoint, regionPaths } from './map-geometry'
import { MapLegend, type MapLegendItem } from './map-legend'
import { fitMapProjection, mapAutoAspect, mapFrameSizing } from './map-projection'
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
		 * `world-atlas`, or any equivalent source.
		 */
		geography: MapGeography
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
		 * the legend after hydration.
		 */
		legend?: boolean | MapLegendPlacement
		/**
		 * Show the hover tooltip naming the pointed region or overlay.
		 * @defaultValue true
		 */
		tooltip?: boolean
		/**
		 * Animate the map in on mount: the geography washes in region by region,
		 * routes draw themselves, and points pop once their route lands. Honours
		 * `prefers-reduced-motion` through the `ReducedMotion` primitive. Off by
		 * default — a static map stays a plain-SVG tree with no motion runtime
		 * work.
		 * @defaultValue false
		 */
		animate?: boolean
		className?: string
		/** Overlay marks: {@link MapRoute}, {@link MapPoint}, {@link MapMarker}. */
		children?: ReactNode
	}

/** What {@link useMapShape} resolves: the measured frame and the fitted drawing geometry. @internal */
type MapShape = {
	ref: RefObject<HTMLDivElement | null>
	frameWidth: number
	frameHeight: number
	reserveAspect: number | null
	/** Region path ds, index-aligned with the features; empty until fitted. */
	paths: (string | null)[]
	features: MapFeature[]
	project: (position: LngLat) => ReturnType<typeof projectPoint>
}

/** Measures the frame, resolves its sizing, and fits the projection to it. @internal */
function useMapShape(
	geography: MapGeography,
	geographyObject: string | undefined,
	projection: MapProjection,
	width: number | undefined,
	height: number | undefined,
	aspectRatio: MapAspectRatio,
): MapShape {
	const features = useMemo(
		() => geographyFeatures(geography, geographyObject),
		[geography, geographyObject],
	)

	const autoAspect = useMemo(() => mapAutoAspect(projection, features), [projection, features])

	const {
		ref,
		width: frameWidth,
		height: frameHeight,
		reserveAspect,
	} = usePlotFrame(width, mapFrameSizing(height, aspectRatio, autoAspect))

	const fitted = useMemo(
		() =>
			frameWidth > 0 && frameHeight > 0
				? fitMapProjection(projection, features, frameWidth, frameHeight)
				: null,
		[projection, features, frameWidth, frameHeight],
	)

	const paths = useMemo(
		() => (fitted === null ? [] : regionPaths(features, fitted)),
		[features, fitted],
	)

	const project = useCallback(
		(position: LngLat) => (fitted === null ? null : projectPoint(fitted, position)),
		[fitted],
	)

	return { ref, frameWidth, frameHeight, reserveAspect, paths, features, project }
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

/** The animated wrapper: `ReducedMotion` plus a generation-keyed group; static marks render bare. @internal */
function MapMarksLayer({
	animate,
	generation,
	children,
}: {
	animate: boolean
	generation: number
	children: ReactNode
}) {
	if (!animate) return <>{children}</>

	return (
		<ReducedMotion>
			<g key={generation} data-slot="map-marks">
				{children}
			</g>
		</ReducedMotion>
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
			{/* AspectRatio reserves the box height from its own width — steady
			    before the width is measured and across animation replays — while
			    an explicit height sets a fixed box. */}
			{shape.reserveAspect === null ? (
				<div style={{ height: shape.frameHeight }}>{children}</div>
			) : (
				<AspectRatio ratio={shape.reserveAspect}>{children}</AspectRatio>
			)}

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

	const generation = useChartAnimationKey(shape.frameWidth, animate)

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

	const showLegend = legend ?? (categoryMetas.length > 1 || entries.length > 0)

	const legendPlacement: MapLegendPlacement = typeof legend === 'string' ? legend : 'bottom'

	const aside = legendPlacement === 'left' || legendPlacement === 'right'

	// The SVG fills its box through the viewBox rather than pixel dimensions, so
	// the box — not the marks — owns the size.
	const svg = shape.frameWidth > 0 && shape.frameHeight > 0 && (
		<svg
			aria-hidden="true"
			className="block size-full"
			viewBox={`0 0 ${shape.frameWidth} ${shape.frameHeight}`}
		>
			<MapPlatContext value={plat}>
				<MapMarksLayer animate={animate} generation={generation}>
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
				showLegend ? (
					<MapLegend
						items={legendItems(categoryMetas, entries, colors)}
						hidden={hidden}
						onToggle={toggle}
						onFocus={setFocus}
						panel={aside}
					/>
				) : null
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
