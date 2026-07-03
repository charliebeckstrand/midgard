'use client'

import { type FrameReserve, usePlotFrame } from '../../hooks'
import { useResolvedSize } from '../../primitives/density'
import type { Step } from '../../recipes'
import type { ChartAxisTick } from './chart-axis'
import { CHART_METRICS, PLOT_TOP_PAD, RESIZE_SETTLE_MS, X_AXIS_HEIGHT } from './chart-constants'
import {
	bandAnchors,
	type ChartAnchor,
	chartFrameSizing,
	type PlotRect,
	plotRect,
	thinnedTicks,
} from './chart-layout'
import type { ChartLegendItem } from './chart-legend'
import { type BandScale, bandScale, linearScale } from './chart-scale'
import type { CartesianChartProps, ChartSeries } from './chart-schema'
import {
	chartReadout,
	formatChartValue,
	type SeriesMeta,
	seriesPaint,
	seriesValues,
} from './chart-series'
import type { ChartReadout } from './types'
import { useChartSeriesToggle } from './use-chart-series-toggle'

/** The cartesian props minus the accessible name, which stays with the frame. @internal */
export type CartesianData<T> = Omit<CartesianChartProps<T>, 'aria-label' | 'aria-labelledby'>

/** Per-chart configuration for {@link useChartCartesian}. @internal */
export type CartesianConfig<T> = {
	/** Anchor the value domain at zero — bar-bearing charts. */
	zeroBaseline: boolean
	/** The legend / tooltip swatch mirroring each series' mark. */
	swatch: (series: ChartSeries<T>, index: number) => 'rect' | 'line'
	/**
	 * Scale the value axis to the per-category sum of the visible series rather
	 * than their individual values — the stacked-area domain.
	 * @defaultValue false
	 */
	stack?: boolean
}

/** Everything the cartesian frame and marks derive from the props. @internal */
export type CartesianChart = {
	ref: ReturnType<typeof usePlotFrame>['ref']
	width: number
	fixedWidth?: number
	height: number
	/** How the plot box reserves its height from its own width, or `null` for a pixel height. */
	reserve: FrameReserve | null
	plot: PlotRect
	band: BandScale
	/** `null` when nothing yields a value domain — render the empty frame. */
	yScale: ReturnType<typeof linearScale>
	/** The zero line's y, for bar baselines and the x axis. */
	baseline: number
	yTicks: ChartAxisTick[]
	xTicks: ChartAxisTick[]
	/** Every series, toggled or not — the legend lists them all. */
	metas: SeriesMeta[]
	/** The series still toggled on — scales, marks, and readout draw these. */
	visible: SeriesMeta[]
	/** Legend indexes toggled off. */
	hidden: ReadonlySet<number>
	/** Toggles a series on or off by its index. */
	toggleSeries: (index: number) => void
	/** The legend-emphasised series, when it is visible; other marks dim. */
	emphasis: number | null
	/** Moves the legend emphasis (`null` clears it). */
	setEmphasis: (index: number | null) => void
	readout: ChartReadout | null
	legendItems: ChartLegendItem[] | null
	anchors: ChartAnchor[]
	/** Per category, the visible series' plot-y positions — a value crosshair's snap targets. */
	snapPoints: number[][]
}

/** The thinned category labels at their band centers. @internal */
function xAxisTicks(categories: string[], band: BandScale, plot: PlotRect): ChartAxisTick[] {
	const longest = categories.reduce((widest, label) => Math.max(widest, label.length), 0)

	return thinnedTicks(categories.length, plot.width, longest).map((index) => ({
		at: band.center(index),
		label: categories[index] ?? '',
	}))
}

/**
 * The orchestration every cartesian chart shares: density and container
 * sizing, the value and band scales, tick building with collision thinning,
 * and the legend / readout models. Charts add only their geometry and mark
 * renderers on top.
 *
 * @internal
 */
export function useChartCartesian<T>(
	props: CartesianData<T>,
	config: CartesianConfig<T>,
): CartesianChart {
	const {
		data,
		series,
		size,
		width,
		height,
		aspectRatio = '16/9',
		axes = true,
		legend,
		min,
		max,
	} = props

	// Rows align by index on one shared band scale, so the category field is
	// only ever read for labels — the first series' xKey names it.
	const xKey = series[0]?.xKey

	const resolvedSize = useResolvedSize(size)

	const metrics = CHART_METRICS[resolvedSize as Step] ?? CHART_METRICS.md

	// Rebuilding the scales, ticks, and every mark's geometry is a full
	// re-render, so resizes commit only once they settle; between commits the
	// SVG scales through its viewBox inside the CSS-reserved box, holding its
	// aspect ratio so nothing distorts.
	const {
		ref,
		width: frameWidth,
		height: frameHeight,
		reserve,
	} = usePlotFrame(width, chartFrameSizing(height, aspectRatio), RESIZE_SETTLE_MS)

	const format = props.formatValue ?? formatChartValue

	const { hidden, toggle, setFocus, emphasis } = useChartSeriesToggle()

	const metas: SeriesMeta[] = series.map((entry, index) => ({
		index,
		label: entry.yName ?? entry.yKey,
		paint: seriesPaint(entry, index),
		swatch: config.swatch(entry, index),
		values: seriesValues(data, entry.yKey),
	}))

	// Toggled-off series leave the scales and readout; slot colours stay put
	// because each meta's paint keyed off its original index.
	const visible = metas.filter((meta) => !hidden.has(meta.index))

	// Stacked charts scale to the per-category column totals; every other chart
	// scales to the individual values.
	const domainValues = config.stack
		? data.map((_, index) => visible.reduce((sum, meta) => sum + (meta.values[index] ?? 0), 0))
		: visible.flatMap((meta) => meta.values.filter((value) => value !== null))

	// The y range needs only the frame height, so the scale (and its tick
	// labels) can resolve the gutter before the full plot rect exists.
	const yScale = linearScale({
		values: domainValues,
		range: [frameHeight - (axes ? X_AXIS_HEIGHT : 0), PLOT_TOP_PAD],
		tickTarget: metrics.tickTarget,
		zeroBaseline: config.zeroBaseline,
		min,
		max,
	})

	const yTickValues = yScale?.ticks ?? []

	const plot = plotRect(frameWidth, frameHeight, axes, yTickValues.map(format))

	const band = bandScale({ count: data.length, range: [plot.x, plot.x + plot.width] })

	// Each category's visible values in plot y, for the crosshair's value snap.
	const snapPoints: number[][] = yScale
		? data.map((_, index) =>
				visible.reduce<number[]>((ys, meta) => {
					const value = meta.values[index]

					if (value != null && Number.isFinite(value)) ys.push(yScale.map(value))

					return ys
				}, []),
			)
		: []

	const categories = xKey ? data.map((datum) => String(datum[xKey])) : []

	const readout =
		xKey && data.length > 0 && visible.length > 0 ? chartReadout(data, xKey, visible, format) : null

	const legendItems =
		(legend ?? metas.length > 1)
			? metas.map((meta) => ({
					label: meta.label,
					swatchClass: meta.paint.bg.join(' '),
					swatch: meta.swatch,
				}))
			: null

	return {
		ref,
		width: frameWidth,
		fixedWidth: width,
		height: frameHeight,
		reserve,
		plot,
		band,
		yScale,
		baseline: yScale?.map(0) ?? plot.y + plot.height,
		yTicks: yTickValues.map((tick) => ({ at: yScale?.map(tick) ?? 0, label: format(tick) })),
		xTicks: xAxisTicks(categories, band, plot),
		metas,
		visible,
		hidden,
		toggleSeries: toggle,
		emphasis,
		setEmphasis: setFocus,
		readout,
		legendItems,
		anchors: bandAnchors(band, data.length, plot),
		snapPoints,
	}
}
