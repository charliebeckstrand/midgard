'use client'

import { useResolvedSize } from '../../primitives/density'
import type { Step } from '../../recipes'
import type { ChartAxisTick } from './chart-axis'
import { CHART_METRICS, PLOT_TOP_PAD, X_AXIS_HEIGHT } from './chart-constants'
import {
	bandAnchors,
	type ChartAnchor,
	type PlotRect,
	plotRect,
	resolveChartHeight,
	thinnedTicks,
} from './chart-layout'
import type { ChartLegendItem } from './chart-legend'
import { type BandScale, bandScale, linearScale } from './chart-scale'
import {
	chartReadout,
	formatChartValue,
	type SeriesMeta,
	seriesPaint,
	seriesValues,
} from './chart-series'
import type { CartesianChartProps, ChartReadout, ChartSeries } from './types'
import { useChartPlot } from './use-chart-plot'
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
	ref: ReturnType<typeof useChartPlot>['ref']
	width: number
	fixedWidth?: number
	height: number
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
		x,
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

	const resolvedSize = useResolvedSize(size)

	const metrics = CHART_METRICS[resolvedSize as Step] ?? CHART_METRICS.md

	const { ref, width: frameWidth, height: containerHeight } = useChartPlot(width)

	const frameHeight = resolveChartHeight(frameWidth, height, aspectRatio, containerHeight)

	const format = props.formatValue ?? formatChartValue

	const { hidden, toggle, setFocus, emphasis } = useChartSeriesToggle()

	const metas: SeriesMeta[] = series.map((entry, index) => ({
		index,
		label: entry.label,
		paint: seriesPaint(entry, index),
		swatch: config.swatch(entry, index),
		values: seriesValues(data, entry.key),
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

	const categories = data.map((datum) => String(datum[x]))

	const readout =
		data.length > 0 && visible.length > 0 ? chartReadout(data, x, visible, format) : null

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
	}
}
