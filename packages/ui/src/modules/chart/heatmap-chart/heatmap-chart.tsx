'use client'

import {
	type ReactNode,
	type RefObject,
	useCallback,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react'
import { TooltipPointer } from '../../../components/tooltip/tooltip-pointer'
import { cn, createContext } from '../../../core'
import { type FrameSizing, useComposedRef, usePlotFrame } from '../../../hooks'
import { useMeasuredWidth } from '../../../hooks/use-measured-width'
import { useStableEvent } from '../../../hooks/use-stable-event'
import { useStableValue } from '../../../hooks/use-stable-value'
import { useLocale } from '../../../providers/locale'
import { k } from '../../../recipes/kata/chart'
import {
	type BinScale,
	type ColorBin,
	fractionFormat,
	once,
	resolveBinScale,
	valueExtent,
} from '../../../utilities'
import { ChartAxis, type ChartAxisTick } from '../engine/chart-axes/axis'
import {
	BAND_LABEL_HEIGHT,
	GUTTER_GAP,
	GUTTER_LABEL_ROOM,
	LABEL_CHAR_WIDTH,
	TICK_CHAR_WIDTH,
} from '../engine/chart-constants'
import { ChartFrame } from '../engine/chart-frame/frame'
import { chartFrameSizing } from '../engine/chart-frame/sizing'
import { cellAt, type HeatmapCell, heatmapCells } from '../engine/chart-geometry/heatmap'
import { ChartHitArea } from '../engine/chart-hit-area'
import { bandTicksOf, plotRect, thinned } from '../engine/chart-layout'
import { rangeLegendPlacement, resolveRangeLegend } from '../engine/chart-legend/range'
import { RangeArrow, RangeLegend, type RangeScale } from '../engine/chart-legend/range-legend'
import { legendAside } from '../engine/chart-legend/schema'
import type { ChartOrientation, PlotRect } from '../engine/chart-orientation'
import { ChartReadoutCard, ChartReadoutRow } from '../engine/chart-readout-card'
import { type BandScale, bandScale } from '../engine/chart-scale'
import { readoutCell, seriesGroupClass } from '../engine/chart-series'
import { type ChartTier, chartPolicy } from '../engine/chart-tier'
import { resolveTooltip } from '../engine/chart-tooltip'
import { type ChartMarkRef, useChartHover, useChartHoverStore } from '../engine/context'
import type { ChartReadout, ChartReadoutSource } from '../engine/types'
import type { ChartFocusTargets } from '../engine/use-chart-keyboard'
import { useChartTextWidth } from '../engine/use-chart-text-width'
import {
	type HeatmapChartProps,
	type HeatmapMatrix,
	resolveHeatmapMatrix,
	sameHeatmapSeries,
} from './heatmap-chart-schema'

/** The neutral fill for a cell with no datum, one step off the surface. @internal */
const NO_DATA_FILL = 'fill-zinc-100 dark:fill-zinc-800'

/**
 * The mark under the pointer anywhere on the grid: the one series, whole. A
 * heatmap reads a cell at each point of its plot, so the pointer is always on
 * data. The mark never changes across the cells, so a move from cell to cell
 * renders no frame.
 *
 * @internal
 */
const GRID_MARK: ChartMarkRef = { series: 0, datum: null }

/** The mark hit test of the heatmap: the grid, at each point. @internal */
function gridMarkAt(): ChartMarkRef {
	return GRID_MARK
}

/**
 * The hovered cell as its row-major index (`row * cols + col`), or `null`. It
 * selects the index alone, so a move inside one cell renders nothing.
 *
 * @internal
 */
function useHoveredCell(): number | null {
	const store = useChartHoverStore()

	const index = () => store.get().index

	return useSyncExternalStore(store.subscribe, index, index)
}

/** The class the range legend is probing, or `null` at rest — the cells outside it dim. @internal */
type HeatmapFocus = {
	/** The probed bin index, or `null` when the legend is at rest. */
	bin: number | null
	/** Sets the probed bin, or clears it with `null`. */
	set: (bin: number | null) => void
}

const [HeatmapFocusContext, useHeatmapFocus] = createContext<HeatmapFocus>('HeatmapFocus')

/**
 * Owns the legend's probed bin, kept off the hover so a pointer move over the
 * plot never touches it. The cells subscribe here alone, so only a legend
 * probe, not a grid hover, repaints them to dim.
 *
 * @internal
 */
function HeatmapFocusProvider({ children }: { children: ReactNode }) {
	const [bin, setBin] = useState<number | null>(null)

	const value = useMemo<HeatmapFocus>(() => ({ bin, set: setBin }), [bin])

	return <HeatmapFocusContext value={value}>{children}</HeatmapFocusContext>
}

/** Props for {@link HeatmapCells}: the resolved cells, their fills, and their bins. @internal */
type HeatmapCellsProps = {
	cells: HeatmapCell[]
	/** The fill per cell, index-aligned; `null` paints the no-data neutral. */
	fills: (string | null)[]
	/** The bin per cell, index-aligned; `null` for a no-data cell. Dims against the legend probe. */
	cellBins: (number | null)[]
}

/**
 * The cell grid: one rect per matrix cell, painted from the sequential scale or
 * the neutral no-data fill. Cells outside the legend's probed bin dim, the
 * heatmap's counterpart to the choropleth's region emphasis.
 *
 * @internal
 */
function HeatmapCells({ cells, fills, cellBins }: HeatmapCellsProps) {
	const { bin: focus } = useHeatmapFocus()

	return (
		<g data-slot="heatmap-cells">
			{cells.map((cell, index) => {
				const fill = fills[index]

				const dimmed = focus !== null && cellBins[index] !== focus

				return (
					<rect
						key={cell.key}
						x={cell.x}
						y={cell.y}
						width={cell.width}
						height={cell.height}
						rx={cell.radius}
						className={cn(seriesGroupClass(dimmed), fill == null && NO_DATA_FILL)}
						{...(fill == null ? {} : { fill })}
					/>
				)
			})}
		</g>
	)
}

/**
 * The legend's hover arrow: it marks the exact value of the cell that the
 * pointer or the keyboard cursor is on. It reads the hovered cell alone, so a
 * grid hover renders only the glyph. The choropleth's region arrow, keyed to a
 * cell instead.
 *
 * @internal
 */
function HeatmapRangeArrow({
	values,
	cols,
	domain,
	orientation,
}: {
	values: (number | null)[][]
	cols: number
	domain: [number, number] | null
	/** Which way the host bar runs, so the glyph pins to its matching edge. */
	orientation: ChartOrientation
}) {
	const cell = useHoveredCell()

	if (cell === null || domain === null || cols === 0) return null

	const value = values[Math.floor(cell / cols)]?.[cell % cols]

	if (value == null) return null

	return <RangeArrow value={value} domain={domain} slot="heatmap-range" orientation={orientation} />
}

/** Props for {@link HeatmapRangeLegend}: the scale the shared bar paints and the values its arrow reads. @internal */
type HeatmapRangeLegendProps = RangeScale & {
	values: (number | null)[][]
	cols: number
	/** Which way the bar runs — vertical beside the plot, horizontal above or below it. */
	orientation: ChartOrientation
}

/**
 * The heatmap's range legend: the shared {@link RangeLegend} scale-bar slider,
 * wired to the grid. Its arrow marks the exact value of the pointed cell. A probe
 * of the bar emphasizes the cells of that class through the focus context, and
 * dims the rest.
 * The `heatmap-range` slot keeps the heatmap's part names. `orientation` follows
 * the bar's resolved placement — vertical beside the plot, horizontal above or
 * below — so the arrow and slider transpose together.
 *
 * @internal
 */
function HeatmapRangeLegend({
	colorRange,
	domain,
	format,
	label,
	bins,
	thresholds,
	values,
	cols,
	orientation,
}: HeatmapRangeLegendProps) {
	const { set } = useHeatmapFocus()

	return (
		<RangeLegend
			slot="heatmap-range"
			box="heatmap-legend-box"
			colorRange={colorRange}
			domain={domain}
			format={format}
			label={label}
			bins={bins}
			thresholds={thresholds}
			orientation={orientation}
			onProbe={set}
			arrow={
				<HeatmapRangeArrow values={values} cols={cols} domain={domain} orientation={orientation} />
			}
		/>
	)
}

/** Props for {@link HeatmapTooltip}: the plot it anchors in, and the labels and values a cell reads. @internal */
type HeatmapTooltipProps = {
	/** The plot region. The hover point is in its frame, as the shared tooltip reads it. */
	plotRef: RefObject<HTMLDivElement | null>
	columns: string[]
	rows: string[]
	values: (number | null)[][]
	format: (value: number) => string
	fills: (string | null)[]
}

/**
 * The hover readout: one cell's row and column labels and its value, in the
 * real Tooltip chrome through {@link TooltipPointer}. It anchors at the pointer,
 * or at the cell center under the keyboard cursor. The frame mounts it in place
 * of the shared tooltip. A pointer enhancement, `aria-hidden` by design: the
 * same values ship in the visually-hidden table.
 *
 * @internal
 */
function HeatmapTooltip({ plotRef, columns, rows, values, format, fills }: HeatmapTooltipProps) {
	const { index, point } = useChartHover()

	const cols = columns.length

	// A pinned cell keeps its index when the grid shrinks under it. An index past
	// the grid reads nothing, so the tooltip closes.
	const cell = index !== null && index < rows.length * cols ? index : null

	const open = cell !== null && point !== null

	// The card holds across the moves inside one cell, so a move repositions the
	// panel and renders no row.
	const card = useMemo(() => {
		if (cell === null) return null

		const row = Math.floor(cell / cols)

		const col = cell % cols

		const fill = fills[cell] ?? null

		return (
			<ChartReadoutCard title={columns[col]}>
				<ChartReadoutRow
					swatch={
						<span
							className={cn('size-2.5 shrink-0 rounded-xs', fill === null && NO_DATA_FILL)}
							style={fill === null ? undefined : { backgroundColor: fill }}
						/>
					}
					value={readoutCell(values[row]?.[col], format)}
					label={rows[row]}
				/>
			</ChartReadoutCard>
		)
	}, [cell, cols, columns, rows, values, format, fills])

	// `track="point"` under both triggers, as the shared tooltip sets it. A pin
	// anchors to the point of this render, so `autoUpdate` would re-place it at
	// that viewport point on a window scroll, off its cell. Without `autoUpdate`,
	// the pin keeps its document position and scrolls with the cell.
	return (
		<TooltipPointer open={open} point={point} originRef={plotRef} track="point" size="sm">
			{card}
		</TooltipPointer>
	)
}

/** The classes of a row label, as the y axis draws it. @internal */
const ROW_LABEL_CLASS = cn(k.tick)

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

/** Everything {@link HeatmapChart} derives from its props once measured. @internal */
type HeatmapModel = {
	ref: ReturnType<typeof usePlotFrame>['ref']
	/** Attach to an element around the plot, so that the row labels measure in its font. */
	textHostRef: React.RefObject<HTMLDivElement | null>
	frameWidth: number
	frameHeight: number
	reserve: ReturnType<typeof usePlotFrame>['reserve']
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
 * The height of the box that the chart owns before a side rail takes its share:
 * a fixed height, the height of a free-form box, or the whole width over the
 * ratio. The rail cannot move it.
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

/**
 * The heatmap's orchestration: the pivot, container sizing, sequential scale,
 * band scales, cells, fills, ticks, readout, and keyboard stops. Kept off the
 * component so its render stays a thin assembly of these parts.
 *
 * @internal
 */
function useHeatmap<T>(
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
): HeatmapModel {
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
	// axis band shave it a touch, which is fine for a categorical key.
	const ratio = aspectRatio ?? (cols > 0 && rows > 0 ? cols / rows : '16/9')

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
		ticks: heatmapTicks(matrix, xBand, yBand, plot, rowText.fit),
		readout,
		format,
		focus,
		resolveCell,
	}
}

/**
 * A heatmap: a grid of cells across two categorical axes, each shaded by a
 * numeric value along a sequential color scale. The two-categorical member of
 * the chart family. It reuses the shared chart frame, band scales, and axis
 * chrome, and the same data-driven color scale the {@link ChoroplethChart}
 * shades regions with. Cells with no matching row take the neutral no-data
 * fill. A hover tooltip names the pointed cell, and a visually-hidden data table
 * carries full value parity for assistive tech.
 *
 * The plot is one tab stop. After focus, the left and right arrows move along
 * the columns. The up and down arrows move along the rows, and the tooltip
 * reads the cell under the cursor. Home and End jump to the ends of the row,
 * and Escape clears the cursor.
 *
 * @remarks Rows pivot to the grid by their distinct `xKey` (columns) and `yKey`
 * (rows) values in first-seen order. The frame defaults to square-ish cells by
 * fitting its aspect to the grid shape; pass `aspectRatio` to override. The
 * heatmap renders as a static SVG tree and takes no `animate`. A function-form
 * context menu `items` receives the row-major index of the cell under the
 * pointer or the keyboard cursor: `row * columns + col`.
 * @example
 * ```tsx
 * <HeatmapChart
 *   aria-label="Commits by day and hour"
 *   data={activity}
 *   series={[{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: greens }]}
 * />
 * ```
 */
export function HeatmapChart<T>(props: HeatmapChartProps<T>) {
	const {
		data,
		series,
		width,
		height,
		aspectRatio,
		legend,
		tooltip,
		formatValue,
		onCellClick,
		className,
		// The heatmap draws no heading. The title still names the context menu's
		// fullscreen view and export files.
		title,
		contextMenu,
		...name
	} = props

	const primary = series[0]

	// The bar's placement, orientation, and visibility follow the caller's
	// `legend` prop and the chart's own tier. Both read the container, not the
	// plot, because a side bar shrinks the plot. A fixed `width` reads
	// deterministically (SSR, tests); otherwise the observer tracks the container.
	const { ref: containerRef, width: containerWidth } = useMeasuredWidth(width)

	// A side rail takes a share of a fixed width, so the plot measures the width
	// that remains. The placement reads the width alone, so it resolves before
	// the frame sizes the plot.
	const sharedWidth = legend !== false && legendAside(rangeLegendPlacement(legend, containerWidth))

	const {
		ref,
		textHostRef,
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
	} = useHeatmap(
		data,
		primary,
		width,
		height,
		aspectRatio,
		formatValue,
		containerWidth,
		sharedWidth,
	)

	// The frame stands the tooltip, the keyboard, and the hit layer down at spark.
	const { show, trigger } = resolveTooltip(tooltip)

	// The root measures its width for the rail, and hosts the row label text.
	const rootRef = useComposedRef(containerRef, textHostRef)

	const rangeLegend = resolveRangeLegend(legend, containerWidth, boxHeight)

	const showLegend = rangeLegend.show && domain !== null && bins.length > 0

	// The pointer reports a cell by its row-major index. A click names the cell by
	// its two band labels and its matrix position.
	const reportCell = useStableEvent((index: number) => {
		const row = Math.floor(index / cols)

		const col = index % cols

		const x = matrix.columns[col]

		const y = matrix.rows[row]

		if (x !== undefined && y !== undefined) onCellClick?.({ x, y }, [row, col])
	})

	const legendNode = showLegend && domain && (
		<HeatmapRangeLegend
			colorRange={primary?.colorRange ?? []}
			domain={domain}
			format={format}
			label={primary?.colorName}
			bins={bins.length}
			thresholds={thresholds}
			values={matrix.values}
			cols={cols}
			orientation={rangeLegend.orientation}
		/>
	)

	return (
		<HeatmapFocusProvider>
			<ChartFrame
				{...name}
				ref={ref}
				textHostRef={rootRef}
				width={frameWidth}
				fixedWidth={width}
				height={frameHeight}
				reserve={reserve}
				fill={fill}
				tier={tier}
				title={title}
				heading={false}
				legend={legendNode}
				legendPlacement={rangeLegend.placement}
				rail
				readout={readout}
				tooltip={show}
				customTooltip={
					<HeatmapTooltip
						plotRef={ref}
						columns={matrix.columns}
						rows={matrix.rows}
						values={matrix.values}
						format={format}
						fills={fills}
					/>
				}
				focus={focus}
				className={className}
				contextMenu={contextMenu}
				fullscreen={<HeatmapChart {...props} />}
			>
				{tier !== 'spark' && (
					<>
						<ChartAxis axis="y" plot={plot} ticks={ticks.y} />

						<ChartAxis axis="x" plot={plot} ticks={ticks.x} line={false} />
					</>
				)}

				<HeatmapCells cells={cells} fills={fills} cellBins={cellBins} />

				{/* The layer mounts for a readout or for a consumer's click report: a
				    heatmap that only reports clicks still needs the pointer. The
				    whole plot reads a cell, so the layer snaps. */}
				{(show || onCellClick !== undefined) && rows > 0 && cols > 0 && (
					<ChartHitArea
						plot={plot}
						resolve={resolveCell}
						markAt={gridMarkAt}
						trigger={show ? trigger : undefined}
						snaps
						onIndexClick={onCellClick ? reportCell : undefined}
					/>
				)}
			</ChartFrame>
		</HeatmapFocusProvider>
	)
}
