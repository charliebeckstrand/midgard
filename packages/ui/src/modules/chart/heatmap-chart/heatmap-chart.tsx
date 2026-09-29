'use client'

import {
	Fragment,
	type MouseEvent,
	type PointerEvent,
	type ReactNode,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { TooltipPointer } from '../../../components/tooltip/tooltip-pointer'
import { cn, createContext } from '../../../core'
import {
	type FrameSizing,
	useComposedRef,
	useHoverAcrossScroll,
	usePlotFrame,
} from '../../../hooks'
import { useMeasuredWidth } from '../../../hooks/use-measured-width'
import { useStableValue } from '../../../hooks/use-stable-value'
import { useLocale } from '../../../providers/locale'
import { k } from '../../../recipes/kata/chart'
import {
	type BinScale,
	type ColorBin,
	createEmitter,
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
import { ChartContextMenu } from '../engine/chart-context-menu'
import { plotName } from '../engine/chart-frame/frame'
import { chartFrameSizing } from '../engine/chart-frame/sizing'
import { cellAt, type HeatmapCell, heatmapCells } from '../engine/chart-geometry/heatmap'
import { bandTicksOf, plotRect, thinned } from '../engine/chart-layout'
import { rangeLegendPlacement, resolveRangeLegend } from '../engine/chart-legend/range'
import { RangeArrow, RangeLegend, type RangeScale } from '../engine/chart-legend/range-legend'
import { type ChartLegendPlacement, legendAside } from '../engine/chart-legend/schema'
import type { ChartOrientation, PlotRect } from '../engine/chart-orientation'
import { ChartPlotBox } from '../engine/chart-plot-box'
import { ChartReadoutCard, ChartReadoutRow } from '../engine/chart-readout-card'
import { type BandScale, bandScale } from '../engine/chart-scale'
import { readoutCell, seriesGroupClass } from '../engine/chart-series'
import { ChartTable } from '../engine/chart-table'
import { isSparkBox } from '../engine/chart-tier'
import { type ChartTooltipTrigger, resolveTooltip } from '../engine/chart-tooltip'
import { samePoint } from '../engine/context'
import type { ChartReadout, ChartReadoutSource } from '../engine/types'
import { useChartTextWidth } from '../engine/use-chart-text-width'
import {
	type HeatmapChartProps,
	type HeatmapMatrix,
	resolveHeatmapMatrix,
	sameHeatmapSeries,
} from './heatmap-chart-schema'

/** The neutral fill for a cell with no datum, one step off the surface. @internal */
const NO_DATA_FILL = 'fill-zinc-100 dark:fill-zinc-800'

/** A `[row, col]` of the grid. @internal */
type HeatmapCellRef = { row: number; col: number }

/** The pointed cell and the exact pointer point the tooltip tracks. @internal */
type HeatmapHoverState = {
	/** The `[row, col]` under the pointer, or `null` when it is away. */
	cell: HeatmapCellRef | null
	/** The pointer's client coordinates while hovering, `null` at rest. */
	point: { x: number; y: number } | null
}

/**
 * The store that holds the heatmap hover. The provider makes one for its mount
 * and never renders again for a pointer move. A reader subscribes to the slice
 * it needs, so a move inside one cell renders only the tooltip.
 *
 * @internal
 */
type HeatmapHoverStore = {
	get: () => HeatmapHoverState
	/** Moves the hover, or clears it with `null`s. A write that changes nothing calls no listener. */
	set: (cell: HeatmapCellRef | null, point: HeatmapHoverState['point']) => void
	subscribe: (listener: () => void) => () => void
}

const [HeatmapHoverContext, useHeatmapHoverStore] = createContext<HeatmapHoverStore>('HeatmapHover')

/** Whether two cells are the same, so a redundant hover write can bail. @internal */
function sameCell(a: HeatmapCellRef | null, b: HeatmapCellRef | null): boolean {
	return a === b || (a !== null && b !== null && a.row === b.row && a.col === b.col)
}

/**
 * A new {@link HeatmapHoverStore}, at rest. A move inside one cell keeps the
 * cell object, so a reader of the cell alone holds.
 *
 * @internal
 */
function createHeatmapHoverStore(): HeatmapHoverStore {
	let current: HeatmapHoverState = { cell: null, point: null }

	const { subscribe, emit } = createEmitter()

	return {
		get: () => current,
		set: (cell, point) => {
			const same = sameCell(current.cell, cell)

			if (same && samePoint(current.point, point)) return

			current = { cell: same ? current.cell : cell, point }

			emit()
		},
		subscribe,
	}
}

/** Reads the whole hover: the tooltip, which follows the pointer. @internal */
function useHeatmapHover(): HeatmapHoverState {
	const store = useHeatmapHoverStore()

	return useSyncExternalStore(store.subscribe, store.get, store.get)
}

/** Reads the pointed cell alone, so a move inside one cell renders nothing. @internal */
function useHeatmapHoverCell(): HeatmapCellRef | null {
	const store = useHeatmapHoverStore()

	const cell = () => store.get().cell

	return useSyncExternalStore(store.subscribe, cell, cell)
}

/**
 * Owns the pointer readout, so a pointer move renders only the tooltip. The
 * cells and axes are stable children and bail. The hit layer writes the store
 * and does not subscribe, and the range arrow reads only the cell. It is the
 * confined hover of the map and of the cartesian frame.
 *
 * @internal
 */
function HeatmapHoverProvider({ children }: { children: ReactNode }) {
	const [store] = useState(createHeatmapHoverStore)

	return <HeatmapHoverContext value={store}>{children}</HeatmapHoverContext>
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
 * Owns the legend's probed bin, kept off the hover context so a pointer move
 * over the plot never touches it. The cells subscribe here alone, so only a
 * legend probe — not a grid hover — repaints them to dim.
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
 * The legend's hover arrow: it marks the exact value of the cell the pointer
 * is on. It is its own {@link useHeatmapHoverCell} consumer, so a grid hover
 * re-renders only the glyph. The choropleth's region arrow, keyed to a cell
 * instead.
 *
 * @internal
 */
function HeatmapRangeArrow({
	values,
	domain,
	orientation,
}: {
	values: (number | null)[][]
	domain: [number, number] | null
	/** Which way the host bar runs, so the glyph pins to its matching edge. */
	orientation: ChartOrientation
}) {
	const cell = useHeatmapHoverCell()

	if (cell === null || domain === null) return null

	const value = values[cell.row]?.[cell.col]

	if (value == null) return null

	return <RangeArrow value={value} domain={domain} slot="heatmap-range" orientation={orientation} />
}

/** Props for {@link HeatmapRangeLegend}: the scale the shared bar paints and the values its arrow reads. @internal */
type HeatmapRangeLegendProps = RangeScale & {
	values: (number | null)[][]
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
			arrow={<HeatmapRangeArrow values={values} domain={domain} orientation={orientation} />}
		/>
	)
}

/** Props for {@link HeatmapHitLayer}: the plot and bands the pointer resolves against. @internal */
type HeatmapHitLayerProps = {
	plot: PlotRect
	rows: number
	cols: number
	xBand: BandScale
	yBand: BandScale
	/**
	 * How the tooltip opens: tracked on `'hover'`, pinned by a click on `'click'`.
	 * A pinning click also gives the layer a pointer cursor, and toggles the
	 * readout off on a second click of the same cell.
	 * @defaultValue 'hover'
	 */
	trigger?: ChartTooltipTrigger
	/** Band labels, so a click reports the cell by name rather than by index alone. */
	labels: { columns: string[]; rows: string[] }
	/** The consumer's cell-click report, or `undefined` where there is none. */
	onCellClick?: HeatmapChartProps['onCellClick']
}

/**
 * The transparent rectangle over the plot that feeds the hover context. The
 * pointer resolves to its `[row, col]` through the band arithmetic, so a reader
 * aims at a cell without the marks repainting. Under the `'click'` trigger it
 * pins the pointed cell instead — a second click of the same cell clears it —
 * and leaves pointer movement alone.
 *
 * @internal
 */
function HeatmapHitLayer({
	plot,
	rows,
	cols,
	xBand,
	yBand,
	trigger = 'hover',
	labels,
	onCellClick,
}: HeatmapHitLayerProps) {
	// The store, not a subscription: the layer writes the hover and reads the
	// pinned cell only in a click, so a pointer move does not render it.
	const store = useHeatmapHoverStore()

	const set = store.set

	const ref = useRef<SVGRectElement>(null)

	// Whether the pointer is over the layer, so the scroll rescue re-reads only a
	// hover that the pointer owns.
	const inside = useRef(false)

	// Resolve a viewport point to its `[row, col]` and the client point the tooltip
	// tracks, or `null` before the box has a size.
	const locate = (event: { clientX: number; clientY: number }) => {
		const rect = ref.current?.getBoundingClientRect()

		if (!rect || rect.width <= 0 || rect.height <= 0) return null

		// The hit rect covers the plot exactly, so the pointer's fraction across it
		// maps onto the band range: scale that fraction by the plot span and add the
		// plot origin for a frame coordinate. A raw client delta is plot-local (the
		// rect starts at plot.x/plot.y) and ignores the viewBox scale — both of which
		// this reintroduces, so the resolved cell is the one under the cursor.
		const frameX = plot.x + ((event.clientX - rect.left) / rect.width) * plot.width

		const frameY = plot.y + ((event.clientY - rect.top) / rect.height) * plot.height

		return {
			cell: cellAt(frameX, frameY, xBand, yBand, cols, rows),
			point: { x: event.clientX, y: event.clientY },
		}
	}

	const click = trigger === 'click'

	// The consumer's report runs on any click, whichever trigger the readout is
	// on, so a hover-tooltip heatmap is still clickable. It takes the hit the
	// caller already resolved: `locate` reads the layout box, so a click that
	// both reports and pins must not pay for it twice.
	const report = (hit: ReturnType<typeof locate>) => {
		if (!onCellClick) return

		if (hit?.cell == null) return

		const { row, col } = hit.cell

		const x = labels.columns[col]

		const y = labels.rows[row]

		if (x === undefined || y === undefined) return

		onCellClick({ x, y }, [row, col])
	}

	const handleClick = (event: MouseEvent<SVGRectElement>) => {
		const hit = locate(event)

		report(hit)

		if (!click || hit === null) return

		if (sameCell(store.get().cell, hit.cell)) set(null, null)
		else set(hit.cell, hit.point)
	}

	const follow = (event: PointerEvent<SVGRectElement>) => {
		inside.current = true

		const hit = locate(event)

		if (hit !== null) set(hit.cell, hit.point)
	}

	// A scroll slides the grid under a still pointer and fires no pointer event.
	// The rescue hides the readout while the page moves, then reads the cell under
	// the pointer once it settles, as the cartesian pointer does. A pinned readout
	// keeps its place, so the rescue runs under the hover trigger only.
	useHoverAcrossScroll(
		!click,
		() => {
			if (inside.current) set(null, null)
		},
		(clientX, clientY) => {
			if (!inside.current) return

			const rect = ref.current?.getBoundingClientRect()

			const within =
				rect !== undefined &&
				clientX >= rect.left &&
				clientX <= rect.right &&
				clientY >= rect.top &&
				clientY <= rect.bottom

			const hit = within ? locate({ clientX, clientY }) : null

			if (hit === null) set(null, null)
			else set(hit.cell, hit.point)
		},
	)

	// Entry tracks as movement does, so a held touch, which fires no move, opens
	// the readout on the cell under it.
	const handlers = click
		? { onClick: handleClick }
		: {
				onClick: handleClick,
				onPointerEnter: follow,
				onPointerMove: follow,
				onPointerLeave: () => {
					inside.current = false

					set(null, null)
				},
			}

	return (
		<rect
			ref={ref}
			data-slot="heatmap-hit"
			x={plot.x}
			y={plot.y}
			width={plot.width}
			height={plot.height}
			fill="none"
			pointerEvents="all"
			className={cn((click || onCellClick) && 'cursor-pointer')}
			{...handlers}
		/>
	)
}

/** Props for {@link HeatmapTooltip}: the labels and values the pointed cell reads. @internal */
type HeatmapTooltipProps = {
	columns: string[]
	rows: string[]
	values: (number | null)[][]
	format: (value: number) => string
	fills: (string | null)[]
	cols: number
}

/**
 * The hover readout: one cell's row and column labels and its value, in the
 * real Tooltip chrome via {@link TooltipPointer} anchored at the pointer. A
 * pointer enhancement, `aria-hidden` by design — the same values ship in the
 * visually-hidden table.
 *
 * @internal
 */
function HeatmapTooltip({ columns, rows, values, format, fills, cols }: HeatmapTooltipProps) {
	const { cell: hovered, point } = useHeatmapHover()

	// A pinned cell keeps its place when the grid shrinks under it. A cell past
	// the grid reads nothing, so the tooltip closes.
	const cell =
		hovered !== null && hovered.row < rows.length && hovered.col < columns.length ? hovered : null

	// `point` is already the client coordinate the pointer sat at, so the tooltip
	// anchors to the cursor directly.
	const open = cell !== null && point !== null

	const datum = cell === null ? null : values[cell.row]?.[cell.col]

	const fill = cell === null ? null : fills[cell.row * cols + cell.col]

	// `track="point"`: the readout anchors to the pointer point and skips
	// autoUpdate's per-open observer wiring — ~1.5x cheaper across the
	// open/reposition/teardown cycle (`tooltip-track.bench`). The heatmap sets it
	// under both triggers. A pin stores the client point of the click, not the
	// cell, so autoUpdate would re-place a pinned readout at that viewport point
	// on a window scroll, off its cell. Without autoUpdate, the readout keeps its
	// document position and scrolls with the cell. Neither mode re-anchors the
	// readout in an inner scroll container.
	return (
		<TooltipPointer open={open} point={point} track="point" size="sm">
			{cell !== null && (
				<ChartReadoutCard title={columns[cell.col]}>
					<ChartReadoutRow
						swatch={
							<span
								className={cn('size-2.5 shrink-0 rounded-xs', fill === null && NO_DATA_FILL)}
								style={fill === null ? undefined : { backgroundColor: fill }}
							/>
						}
						value={readoutCell(datum, format)}
						label={rows[cell.row]}
					/>
				</ChartReadoutCard>
			)}
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

/** Everything {@link HeatmapChart} derives from its props once measured. @internal */
type HeatmapModel = {
	ref: React.RefObject<HTMLDivElement | null>
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
	/** The measured box is small enough to strip to bare cells — no labels, no readout. */
	spark: boolean
	plot: PlotRect
	xBand: BandScale
	yBand: BandScale
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

/** The plot region grows beside a side rail, and fills a free-form box. @internal */
function plotRegionClass(aside: boolean, fill: boolean): string {
	return cn('relative min-w-0', (aside || fill) && 'flex-1', fill && 'min-h-0')
}

/**
 * The heatmap root. A long press opens the readout, so the whole chart, legend
 * included, selects no text under a hold, as the chart frame does. As in the
 * chart frame, a fluid root fills the box with no max-width cap, and a
 * free-form root fills its height. A `className` can bound it.
 *
 * @internal
 */
function heatmapRootClass(fluid: boolean, fill: boolean, className: string | undefined): string {
	return cn('flex flex-col gap-3', k.touchReadout, fluid && 'w-full', fill && 'h-full', className)
}

/**
 * The heatmap's orchestration: the pivot, container sizing, sequential scale,
 * band scales, cells, fills, ticks, and readout. Kept off the component so its
 * render stays a thin assembly of these parts.
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
	const boxWidth = containerWidth > 0 ? containerWidth : frameWidth

	const boxHeight = boxHeightOf(sizing, boxWidth, containerHeight, frameHeight)

	// Spark strips the heatmap to its bare cells: no row/column labels, no gutter
	// for them, and no hover readout — a sparkline is non-interactive. The cells,
	// the accessible name, and the data table still carry the grid's values.
	const spark = isSparkBox(boxWidth, boxHeight)

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

	return {
		ref,
		textHostRef: rowText.hostRef,
		frameWidth,
		frameHeight,
		reserve,
		fill,
		boxHeight,
		spark,
		plot,
		xBand,
		yBand,
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
	}
}

/** Props for {@link HeatmapFigure}: the plot and the range bar arranged by placement. @internal */
type HeatmapFigureProps = {
	plot: ReactNode
	/** The range bar, or a falsy node when the legend is off — placed around the plot. */
	legend: ReactNode
	/** Where the bar sits, resolved from the caller's `legend` and the chart's tier. */
	placement: ChartLegendPlacement
	/** The bar is a vertical side rail, so it bands beside the plot in a row. */
	aside: boolean
	/** The frame is free-form, so the figure fills the height of the chart. */
	fill: boolean
}

/**
 * The plot and the range bar arranged by placement. A side (vertical) rail bands
 * beside the plot in a row, with a left rail reversing it rather than moving in
 * the DOM. A stacked (horizontal) bar bands above or below. Kept off
 * {@link HeatmapChart} so its render stays a thin assembly of parts, the way the
 * map frame keeps its own layout.
 *
 * One figure div, keyed children. The placement is measured-width-driven (the
 * rail drops to a bottom band across the compact boundary), so a flip
 * re-arranges this tree at runtime. The keys make React *move* the plot node
 * through a flip, rather than recreate it positionally. The plot frame's
 * ResizeObserver is bound to that node. A recreated node would strand the
 * observer on the detached one, freezing the drawing at its last committed size
 * while the box resizes on.
 *
 * @internal
 */
function HeatmapFigure({ plot, legend, placement, aside, fill }: HeatmapFigureProps) {
	return (
		<div
			// A free-form frame measures its spark height off this box, which the rail
			// cannot move (see `usePlotFrame`).
			{...(fill && { 'data-plot-fill-container': '' })}
			className={cn(
				aside
					? // A left rail reverses the row, so the DOM order holds plot-first.
						cn(
							'flex gap-4',
							fill ? 'items-stretch' : 'items-center',
							placement === 'left' && 'flex-row-reverse',
						)
					: 'flex flex-col gap-3',
				fill && 'h-full min-h-0',
			)}
		>
			{placement === 'top' && <Fragment key="legend">{legend}</Fragment>}

			<Fragment key="plot">{plot}</Fragment>

			{placement !== 'top' && <Fragment key="legend">{legend}</Fragment>}
		</div>
	)
}

/**
 * A heatmap: a grid of cells across two categorical axes, each shaded by a
 * numeric value along a sequential color scale. The two-categorical member of
 * the chart family. It reuses the shared plot frame, band scales, and axis
 * chrome, and the same data-driven color scale the {@link ChoroplethChart}
 * shades regions with. Cells with no matching row take the neutral no-data
 * fill. A hover tooltip names the pointed cell, and a visually-hidden data table
 * carries full value parity for assistive tech.
 *
 * @remarks Rows pivot to the grid by their distinct `xKey` (columns) and `yKey`
 * (rows) values in first-seen order. The frame defaults to square-ish cells by
 * fitting its aspect to the grid shape; pass `aspectRatio` to override. The
 * heatmap renders as a static SVG tree and takes no `animate`.
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
		// Kept off the DOM so it never spreads onto the plot element as an invalid
		// attribute, but still names the context menu's fullscreen view.
		title,
		contextMenu,
		...label
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
		spark,
		plot,
		xBand,
		yBand,
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

	// Spark is a bare, non-interactive sparkline, so the hover readout stands down
	// with the labels; every wider tier keeps the caller's `tooltip`.
	const { show, trigger } = resolveTooltip(tooltip)

	const showTooltip = show && !spark

	const rootRef = useComposedRef(containerRef, textHostRef)

	const rangeLegend = resolveRangeLegend(legend, containerWidth, boxHeight)

	const aside = legendAside(rangeLegend.placement)

	const showLegend = rangeLegend.show && domain !== null && bins.length > 0

	// Pinned to its committed pixel size and anchored top-left, `viewBox` matching
	// so user units map 1:1 — not `size-full`, which scales the drawing against a
	// stale viewBox through a resize burst (see ChartFrame). The fraction-based hit
	// locate above reads the rendered rect, so it stays correct either way.
	const svg = frameWidth > 0 && (
		<svg
			aria-hidden="true"
			className="absolute left-0 top-0 block"
			width={frameWidth}
			height={frameHeight}
			viewBox={`0 0 ${frameWidth} ${frameHeight}`}
		>
			{!spark && (
				<>
					<ChartAxis axis="y" plot={plot} ticks={ticks.y} />

					<ChartAxis axis="x" plot={plot} ticks={ticks.x} line={false} />
				</>
			)}

			<HeatmapCells cells={cells} fills={fills} cellBins={cellBins} />

			{/* The layer mounts for a readout or for a consumer's click report: a
			    heatmap that only reports clicks still needs the pointer. */}
			{(showTooltip || onCellClick !== undefined) && rows > 0 && cols > 0 && (
				<HeatmapHitLayer
					plot={plot}
					rows={rows}
					cols={cols}
					xBand={xBand}
					yBand={yBand}
					trigger={showTooltip ? trigger : undefined}
					labels={{ columns: matrix.columns, rows: matrix.rows }}
					onCellClick={onCellClick}
				/>
			)}
		</svg>
	)

	const plotRegion = (
		<div
			ref={ref}
			data-slot="heatmap-plot"
			role="img"
			{...plotName(label)}
			className={plotRegionClass(aside, fill)}
		>
			<ChartPlotBox reserve={reserve} height={frameHeight} fill={fill}>
				{svg}
			</ChartPlotBox>

			{showTooltip && readout && frameWidth > 0 && (
				<HeatmapTooltip
					columns={matrix.columns}
					rows={matrix.rows}
					values={matrix.values}
					format={format}
					fills={fills}
					cols={cols}
				/>
			)}
		</div>
	)

	const legendNode = showLegend && domain && (
		<HeatmapRangeLegend
			colorRange={primary?.colorRange ?? []}
			domain={domain}
			format={format}
			label={primary?.colorName}
			bins={bins.length}
			thresholds={thresholds}
			values={matrix.values}
			orientation={rangeLegend.orientation}
		/>
	)

	const heatmapRoot = (
		<div
			ref={rootRef}
			data-slot="heatmap"
			// A touch hold here reads the chart. It does not open the context menu.
			data-touch-readout=""
			className={heatmapRootClass(width === undefined, fill, className)}
			style={width === undefined ? undefined : { width }}
		>
			<HeatmapHoverProvider>
				<HeatmapFocusProvider>
					<HeatmapFigure
						plot={plotRegion}
						legend={legendNode}
						placement={rangeLegend.placement}
						aside={aside}
						fill={fill}
					/>
				</HeatmapFocusProvider>
			</HeatmapHoverProvider>

			{readout && <ChartTable readout={readout} />}
		</div>
	)

	return (
		<ChartContextMenu
			contextMenu={contextMenu}
			rootRef={containerRef}
			readout={readout}
			title={title}
			fullscreen={<HeatmapChart {...props} />}
		>
			{heatmapRoot}
		</ChartContextMenu>
	)
}
