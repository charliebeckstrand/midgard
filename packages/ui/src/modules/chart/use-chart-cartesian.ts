'use client'

import { type FrameReserve, usePlotFrame } from '../../hooks'
import { useResolvedSize } from '../../primitives/density'
import type { Step } from '../../recipes'
import type { ChartAxisTick } from './chart-axis'
import { CHART_METRICS } from './chart-constants'
import {
	type CartesianLayout,
	chartFrameSizing,
	horizontalLayout,
	type PlotRect,
	verticalLayout,
} from './chart-layout'
import type { ChartLegendItem } from './chart-legend'
import type { ChartOrientation } from './chart-orientation'
import type { BandScale, LinearScale } from './chart-scale'
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
	/**
	 * Which screen axis the value axis runs along — only {@link BarChart} varies it.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
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
	yScale: LinearScale | null
	/** The zero line's position along the value axis, for bar baselines and the category axis. */
	baseline: number
	/** Value ticks along the value axis (y when vertical, x when horizontal). */
	yTicks: ChartAxisTick[]
	/** Category labels along the band axis (x when vertical, y when horizontal). */
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
	/** Per category, the band-axis center — a crosshair and tooltip band snap. */
	bandPositions: number[]
	/** Per category, the visible series' value-axis positions — a value crosshair's snap targets. */
	snapPoints: number[][]
	/** Which way the chart faces — the frame parts read it to draw the transpose. */
	orientation: ChartOrientation
}

/**
 * The orchestration every cartesian chart shares: density and container
 * sizing, the series and legend / readout models, and the value and band scales
 * with their ticks. The oriented scale-and-layout math lives in
 * {@link verticalLayout} / {@link horizontalLayout}; this hook picks one by the
 * config's `orientation` and returns its normalized result. Charts add only
 * their geometry and mark renderers on top.
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

	const orientation = config.orientation ?? 'vertical'

	// Rows align by index on one shared band scale, so the category field is
	// only ever read for labels — the first series' xKey names it.
	const xKey = series[0]?.xKey

	const resolvedSize = useResolvedSize(size)

	const metrics = CHART_METRICS[resolvedSize as Step] ?? CHART_METRICS.md

	const {
		ref,
		width: frameWidth,
		height: frameHeight,
		reserve,
	} = usePlotFrame(width, chartFrameSizing(height, aspectRatio))

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

	const categories = xKey ? data.map((datum) => String(datum[xKey])) : []

	const layout: CartesianLayout = (
		orientation === 'horizontal' ? horizontalLayout : verticalLayout
	)({
		frameWidth,
		frameHeight,
		axes,
		tickTarget: metrics.tickTarget,
		zeroBaseline: config.zeroBaseline,
		min,
		max,
		domainValues,
		categories,
		format,
		count: data.length,
		visibleValues: visible.map((meta) => meta.values),
	})

	const readout =
		xKey && data.length > 0 && visible.length > 0 ? chartReadout(data, xKey, visible, format) : null

	const legendItems =
		(legend ?? metas.length > 1)
			? metas.map((meta) => ({
					label: meta.label,
					swatchClass: meta.paint.text.join(' '),
					swatch: meta.swatch,
				}))
			: null

	return {
		ref,
		width: frameWidth,
		fixedWidth: width,
		height: frameHeight,
		reserve,
		plot: layout.plot,
		band: layout.band,
		yScale: layout.valueScale,
		baseline: layout.baseline,
		yTicks: layout.valueTicks,
		xTicks: layout.bandTicks,
		metas,
		visible,
		hidden,
		toggleSeries: toggle,
		emphasis,
		setEmphasis: setFocus,
		readout,
		legendItems,
		bandPositions: layout.bandPositions,
		snapPoints: layout.snapPoints,
		orientation,
	}
}
