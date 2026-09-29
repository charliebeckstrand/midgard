'use client'

import { type RefObject, useCallback, useMemo } from 'react'
import { cn } from '../../../core'
import {
	type FrameReserve,
	type FrameSizing,
	type PlotFrameRef,
	usePlotFrame,
} from '../../../hooks'
import { useStableValue } from '../../../hooks/use-stable-value'
import { useLocale } from '../../../providers/locale'
import { k } from '../../../recipes/kata/chart'
import {
	type BinScale,
	type ColorBin,
	clamp,
	fractionFormat,
	once,
	resolveBinScale,
	valueExtent,
} from '../../../utilities'
import type { ChartAxisTick } from '../engine/chart-axes/axis'
import {
	BAND_LABEL_HEIGHT,
	GUTTER_GAP,
	GUTTER_LABEL_ROOM,
	LABEL_CHAR_WIDTH,
	TICK_CHAR_WIDTH,
} from '../engine/chart-constants'
import { type ChartAspectRatio, chartFrameSizing } from '../engine/chart-frame/sizing'
import { cellAt, type HeatmapCell, heatmapCells } from '../engine/chart-geometry/heatmap'
import { bandTicksOf, plotRect, thinned } from '../engine/chart-layout'
import type { PlotRect } from '../engine/chart-orientation'
import { type BandScale, bandScale } from '../engine/chart-scale'
import { readoutCell } from '../engine/chart-series'
import { type ChartTier, COMPACT_WIDTH, chartPolicy, SPARK_HEIGHT } from '../engine/chart-tier'
import type { ChartReadout, ChartReadoutSource } from '../engine/types'
import type { ChartFocusTargets } from '../engine/use-chart-keyboard'
import { useChartTextWidth } from '../engine/use-chart-text-width'
import {
	type HeatmapChartProps,
	type HeatmapMatrix,
	resolveHeatmapMatrix,
	sameHeatmapSeries,
} from './heatmap-chart-schema'

/** The classes of a row label, as the y axis draws it. @internal */
const ROW_LABEL_CLASS = cn(k.tick)

/**
 * The widest default ratio, 4. A box at the compact width then stands at the
 * spark height, so a wide grid in a framed box never draws as a spark strip.
 *
 * @internal
 */
const MAX_GRID_RATIO = COMPACT_WIDTH / SPARK_HEIGHT

/** The tallest default ratio: a tall grid draws at most twice as tall as it is wide. @internal */
const MIN_GRID_RATIO = 1 / 2

/**
 * The default ratio of the frame: the shape of the grid, so that the cells read
 * square-ish, held between {@link MIN_GRID_RATIO} and {@link MAX_GRID_RATIO}.
 * One row of 24 cells therefore draws at 4, not 24. An empty grid takes 16/9.
 *
 * @internal
 */
function gridRatio(cols: number, rows: number): ChartAspectRatio {
	return cols > 0 && rows > 0 ? clamp(cols / rows, MIN_GRID_RATIO, MAX_GRID_RATIO) : '16/9'
}

/**
 * The x (column) and y (row) band-axis tick labels, thinned to fit their axes.
 * `fitRow` gives each row label as it draws, cut to the gutter.
 *
 * @internal
 */
function heatmapTicks(
	matrix: HeatmapMatrix,
	xBand: BandScale,
	yBand: BandScale,
	plot: PlotRect,
	fitRow: (label: string) => string,
): { x: ChartAxisTick[]; y: ChartAxisTick[] } {
	const widestCol = matrix.columns.reduce((widest, label) => Math.max(widest, label.length), 0)

	// The columns thin as a cartesian band axis does, each slot as wide as the
	// widest column label.
	const x = bandTicksOf(
		matrix.columns,
		xBand,
		plot.width,
		widestCol * TICK_CHAR_WIDTH + GUTTER_GAP,
		false,
	)

	// Keyed by the row index, not the band center `at`, which collapses onto one
	// coordinate at zero height; the index is the row's stable identity.
	const y = thinned(matrix.rows.length, plot.height, BAND_LABEL_HEIGHT).map((index) => ({
		at: yBand.center(index),
		label: fitRow(matrix.rows[index] ?? ''),
		key: index,
	}))

	return { x, y }
}

/** The visually-hidden data table's readout: columns across, rows down, one value per cell. @internal */
function heatmapReadout(matrix: HeatmapMatrix, format: (value: number) => string): ChartReadout {
	return {
		categories: matrix.columns,
		rows: matrix.rows.map((label, row) => ({
			label,
			swatchClass: '',
			swatch: 'rect' as const,
			values: matrix.columns.map((_, col) => readoutCell(matrix.values[row]?.[col], format)),
		})),
	}
}

/**
 * The keyboard stops of the grid. Each column is a category, and each row is a
 * stop at the cell center. The band arrows therefore walk the columns, and the
 * value arrows walk the rows. Each stop writes its row-major cell index.
 *
 * @internal
 */
function heatmapFocus(
	cols: number,
	rows: number,
	xBand: BandScale,
	yBand: BandScale,
): ChartFocusTargets {
	const points = Array.from({ length: cols }, (_, col) =>
		Array.from({ length: rows }, (_, row) => ({ x: xBand.center(col), y: yBand.center(row) })),
	)

	const indices = Array.from({ length: cols }, (_, col) =>
		Array.from({ length: rows }, (_, row) => row * cols + col),
	)

	return { points, indices }
}

/**
 * The height of the box that the chart owns before a side rail takes its
 * share. It is a fixed height, the height of a free-form box, or the whole
 * width over the ratio. The rail cannot move it.
 *
 * @internal
 */
function boxHeightOf(
	sizing: FrameSizing,
	boxWidth: number,
	containerHeight: number,
	frameHeight: number,
): number {
	switch (sizing.mode) {
		case 'fixed':
			return sizing.height
		case 'fill':
			return containerHeight
		case 'aspect':
			return boxWidth / sizing.ratio
		default:
			return frameHeight
	}
}

/** Everything {@link HeatmapChart} derives from its props once measured. @internal */
export type HeatmapChartModel = {
	/** Attach to the plot region, so that the frame measures it. */
	ref: PlotFrameRef
	/** Attach to an element around the plot, so that the row labels measure in its font. */
	textHostRef: RefObject<HTMLDivElement | null>
	frameWidth: number
	frameHeight: number
	reserve: FrameReserve | null
	/** The frame is free-form (`aspectRatio={false}`), so the plot fills the height of its box. */
	fill: boolean
	/**
	 * The height of the box that the chart owns before a side rail takes its
	 * share. The rail cannot move it, so the tier and the rail read it.
	 */
	boxHeight: number
	/** The tier of the box that the chart owns, or `undefined` before the box has a width. */
	tier: ChartTier | undefined
	plot: PlotRect
	matrix: HeatmapMatrix
	cols: number
	rows: number
	cells: HeatmapCell[]
	fills: (string | null)[]
	cellBins: (number | null)[]
	bins: ColorBin[]
	/** The class edges the cells are binned by under `'quantile'`; absent under `'linear'`. */
	thresholds: number[] | undefined
	domain: [number, number] | null
	ticks: { x: ChartAxisTick[]; y: ChartAxisTick[] }
	readout: ChartReadoutSource | null
	format: (value: number) => string
	/** The keyboard stops, one per cell. */
	focus: ChartFocusTargets
	/** Maps a frame point to the row-major index of its cell, or `null` off the grid. */
	resolveCell: (x: number, y: number) => number | null
}

/**
 * The heatmap's orchestration: the pivot, container sizing, sequential scale,
 * band scales, cells, fills, ticks, readout, and keyboard stops. Kept off the
 * component so its render stays a thin assembly of these parts.
 *
 * @remarks Destructure `ref` where you call the hook. The compiler then does
 * not read the other fields as refs.
 * @internal
 */
export function useHeatmapChart<T>(
	data: T[],
	series: HeatmapChartProps<T>['series'][number] | undefined,
	width: number | undefined,
	height: number | undefined,
	aspectRatio: HeatmapChartProps<T>['aspectRatio'],
	formatValue: HeatmapChartProps<T>['formatValue'],
	/** The measured width of the whole chart, rail included; `0` before it lands. */
	containerWidth: number,
	/** A side rail shares the width with the plot, so the plot measures its own. */
	sharedWidth: boolean,
): HeatmapChartModel {
	// A series literal is a new object on each render of the caller. It is held
	// while its fields keep their values, so the grid memos below hold through a
	// parent render.
	const primary = useStableValue(series, sameHeatmapSeries)

	const matrix = useMemo(
		() =>
			primary
				? resolveHeatmapMatrix(data, primary)
				: { columns: [], rows: [], values: [] as (number | null)[][] },
		[data, primary],
	)

	const cols = matrix.columns.length

	const rows = matrix.rows.length

	// Fit the frame to the grid so cells read square-ish; the reserved gutter and
	// axis band shave it a touch, which is fine for a categorical key. An explicit
	// `aspectRatio` is not bounded.
	const ratio = aspectRatio ?? gridRatio(cols, rows)

	const sizing = chartFrameSizing(height, ratio)

	const {
		ref,
		width: frameWidth,
		height: frameHeight,
		reserve,
		containerHeight,
	} = usePlotFrame(width, sizing, sharedWidth)

	const fill = sizing.mode === 'fill'

	// A side rail narrows the plot, and a ratio then shortens it. A tier read off
	// the plot could drop to spark, shed the rail, grow back, and show the rail
	// again, with no end. The tier and the rail therefore read the box that the
	// chart owns before the rail takes its share: the whole width, and the height
	// that the ratio or the free-form box gives it.
	const boxHeight = boxHeightOf(sizing, containerWidth, containerHeight, frameHeight)

	// Spark strips the heatmap to its bare cells: the frame drops the labels, the
	// rail, the readout, and the pointer. The cells, the accessible name, and the
	// data table still carry the values of the grid. The heatmap draws no value
	// axis, so the tick budget of the policy does not apply. Before the box has a
	// width, the tier stays open, so the rail keeps its place for the first
	// measure of the plot.
	const tier = containerWidth > 0 ? chartPolicy(containerWidth, boxHeight, 0).tier : undefined

	const spark = tier === 'spark'

	// The extent and the quantile thresholds read the same cells, so the grid is
	// flattened once. Each did its own pass over every row before this.
	const values = useMemo(() => matrix.values.flat().filter((value) => value !== null), [matrix])

	// `colorDomain` applies to linear binning. Quantile bins cut the data, so the
	// bar spans the data extent, where the bins sit.
	const domain = useMemo(
		() => valueExtent(values, primary?.binning === 'quantile' ? undefined : primary?.colorDomain),
		[values, primary],
	)

	// One resolution yields both the painted bins and the assignment the cells
	// read, so the fills and the legend cannot disagree on where the buckets fall.
	// `MapPlat` resolves its own through the same `resolveBinScale`.
	const { bins, thresholds, assign } = useMemo(
		(): BinScale =>
			domain && primary
				? resolveBinScale(values, domain, primary.colorRange, primary.bins, primary.binning)
				: { bins: [], assign: () => null },
		[domain, primary, values],
	)

	// The rows are proportional category labels, so the gutter holds the width
	// that each label draws at. A label wider than the room is cut with an
	// ellipsis. The tooltip and the data table show the full label.
	const rowText = useChartTextWidth(
		matrix.rows,
		ROW_LABEL_CLASS,
		LABEL_CHAR_WIDTH,
		GUTTER_LABEL_ROOM,
	)

	// Memoized so their identity holds across a re-render with unchanged data —
	// otherwise a fresh `xBand`/`yBand` every render defeats the `cells`/`cellBins`/
	// `fills` memos below, which key off them.
	const plot = useMemo(
		() => plotRect(frameWidth, frameHeight, !spark, matrix.rows, rowText.width),
		[frameWidth, frameHeight, matrix.rows, spark, rowText.width],
	)

	const xBand = useMemo(
		() => bandScale({ count: cols, range: [plot.x, plot.x + plot.width], padding: 0 }),
		[cols, plot],
	)

	const yBand = useMemo(
		() => bandScale({ count: rows, range: [plot.y, plot.y + plot.height], padding: 0 }),
		[rows, plot],
	)

	const cells = useMemo(() => heatmapCells(matrix.values, xBand, yBand), [matrix, xBand, yBand])

	// Bin per cell, index-aligned with `cells` (row-major): the class a finite
	// value lands in, `null` for a no-data cell. The legend dims against it.
	const cellBins = useMemo(
		() =>
			cells.map((cell) => (cell.value === null || bins.length === 0 ? null : assign(cell.value))),
		[cells, bins, assign],
	)

	// Fill per cell from its bin: the bin's color, or `null` for the neutral
	// no-data fill.
	const fills = useMemo(
		() => cellBins.map((bin) => (bin === null ? null : (bins[bin]?.color ?? null))),
		[cellBins, bins],
	)

	// The default writes numbers in the ambient locale, as a cartesian chart does.
	const { locale } = useLocale()

	const format = formatValue ?? fractionFormat(locale)

	// A cached thunk ({@link ChartReadoutSource}). The data table and the context
	// menu's CSV actions call it. It holds while the matrix and the format hold, so
	// a parent render formats no cell again.
	const readout = useMemo(
		() => (cols > 0 && rows > 0 ? once(() => heatmapReadout(matrix, format)) : null),
		[cols, rows, matrix, format],
	)

	const focus = useMemo(() => heatmapFocus(cols, rows, xBand, yBand), [cols, rows, xBand, yBand])

	// A parent render thins no tick and cuts no row label again.
	const ticks = useMemo(
		() => heatmapTicks(matrix, xBand, yBand, plot, rowText.fit),
		[matrix, xBand, yBand, plot, rowText.fit],
	)

	// The pointer resolves to its cell through the band arithmetic, so a reader
	// aims at a cell without the marks repainting.
	const resolveCell = useCallback(
		(x: number, y: number) => {
			const cell = cellAt(x, y, xBand, yBand, cols, rows)

			return cell === null ? null : cell.row * cols + cell.col
		},
		[xBand, yBand, cols, rows],
	)

	return {
		ref,
		textHostRef: rowText.hostRef,
		frameWidth,
		frameHeight,
		reserve,
		fill,
		boxHeight,
		tier,
		plot,
		matrix,
		cols,
		rows,
		cells,
		fills,
		cellBins,
		bins,
		thresholds,
		domain,
		ticks,
		readout,
		format,
		focus,
		resolveCell,
	}
}
