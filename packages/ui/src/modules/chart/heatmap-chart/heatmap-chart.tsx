'use client'

import {
	autoUpdate,
	flip,
	offset,
	shift,
	useClientPoint,
	useFloating,
	useInteractions,
} from '@floating-ui/react'
import { type MouseEvent, type PointerEvent, type ReactNode, useMemo, useState } from 'react'
import { TooltipContent } from '../../../components/tooltip'
import { TooltipContext } from '../../../components/tooltip/context'
import { cn, createContext } from '../../../core'
import { usePlotFrame } from '../../../hooks'
import { k } from '../../../recipes/kata/chart'
import { binIndex, type ColorBin, resolveColorBins, valueExtent } from '../../../utilities'
import { RangeArrow, RangeLegend } from '../../map'
import { ChartAxis, type ChartAxisTick } from '../chart-axis'
import {
	BAND_LABEL_HEIGHT,
	GUTTER_GAP,
	LABEL_CHAR_WIDTH,
	TICK_CHAR_WIDTH,
} from '../chart-constants'
import { chartFrameSizing, type PlotRect, plotRect, thinned } from '../chart-layout'
import { ChartPlotBox } from '../chart-plot-box'
import { bandScale } from '../chart-scale'
import { type ChartTooltipTrigger, resolveTooltip } from '../chart-schema'
import { formatChartValue, READOUT_GAP } from '../chart-series'
import { ChartTable } from '../chart-table'
import type { ChartReadout } from '../types'
import { cellAt, heatmapCells } from './heatmap-chart-geometry'
import {
	type HeatmapChartProps,
	type HeatmapMatrix,
	resolveHeatmapMatrix,
} from './heatmap-chart-schema'

/** The neutral fill for a cell with no datum, one step off the surface. @internal */
const NO_DATA_FILL = 'fill-zinc-100 dark:fill-zinc-800'

/** The pointed cell and the exact pointer point the tooltip tracks. @internal */
type HeatmapHover = {
	/** The `[row, col]` under the pointer, or `null` when it is away. */
	cell: { row: number; col: number } | null
	/** The pointer's frame coordinates while hovering, `null` at rest. */
	point: { x: number; y: number } | null
	/** Moves the hover, or clears it with `null`s. */
	set: (cell: { row: number; col: number } | null, point: { x: number; y: number } | null) => void
}

const [HeatmapHoverContext, useHeatmapHover] = createContext<HeatmapHover>('HeatmapHover')

/** Whether two cells are the same, so a redundant hover write can bail. @internal */
function sameCell(a: HeatmapHover['cell'], b: HeatmapHover['cell']): boolean {
	return a === b || (a !== null && b !== null && a.row === b.row && a.col === b.col)
}

/**
 * Owns the pointer readout so a pointer move re-renders only the tooltip: the
 * cells and axes are stable children and bail, the tooltip alone reads the
 * hover. Mirrors the map's and cartesian frame's confined-hover pattern.
 *
 * @internal
 */
function HeatmapHoverProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<{ cell: HeatmapHover['cell']; point: HeatmapHover['point'] }>({
		cell: null,
		point: null,
	})

	const value = useMemo<HeatmapHover>(
		() => ({
			...state,
			set: (cell, point) =>
				setState((prev) =>
					sameCell(prev.cell, cell) && prev.point?.x === point?.x && prev.point?.y === point?.y
						? prev
						: { cell, point },
				),
		}),
		[state],
	)

	return <HeatmapHoverContext value={value}>{children}</HeatmapHoverContext>
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
 * over the plot never touches it: the cells subscribe here alone, so only
 * probing the legend — not hovering the grid — repaints them to dim.
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
	cells: ReturnType<typeof heatmapCells>
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
						className={cn(
							'transition-opacity',
							fill == null && NO_DATA_FILL,
							dimmed && 'opacity-25',
						)}
						{...(fill == null ? {} : { fill })}
					/>
				)
			})}
		</g>
	)
}

/**
 * The legend's hover arrow: it marks the bin of the cell the pointer is on, its
 * own {@link useHeatmapHover} consumer so a grid hover re-renders only the glyph.
 * The choropleth's region arrow, keyed to a cell instead.
 *
 * @internal
 */
function HeatmapRangeArrow({
	values,
	domain,
	bins,
}: {
	values: (number | null)[][]
	domain: [number, number] | null
	bins: number
}) {
	const { cell } = useHeatmapHover()

	if (cell === null || domain === null || bins === 0) return null

	const value = values[cell.row]?.[cell.col]

	if (value == null) return null

	const bin = binIndex(value, domain, bins)

	if (bin === null) return null

	return <RangeArrow bin={bin} bins={bins} slot="heatmap-range" />
}

/** Props for {@link HeatmapRangeLegend}: the scale the shared bar paints and the values its arrow reads. @internal */
type HeatmapRangeLegendProps = {
	colorRange: string[]
	domain: [number, number]
	format: (value: number) => string
	label?: string
	bins: number
	values: (number | null)[][]
}

/**
 * The heatmap's range legend: the shared {@link RangeLegend} scale-bar slider,
 * wired to the grid — its arrow tracks the pointed cell's bin, and probing the
 * bar emphasises that class's cells through the focus context, dimming the rest.
 * The `heatmap-range` slot keeps the heatmap's part names.
 *
 * @internal
 */
function HeatmapRangeLegend({
	colorRange,
	domain,
	format,
	label,
	bins,
	values,
}: HeatmapRangeLegendProps) {
	const { set } = useHeatmapFocus()

	return (
		<RangeLegend
			slot="heatmap-range"
			colorRange={colorRange}
			domain={domain}
			format={format}
			label={label}
			bins={bins}
			onProbe={set}
			arrow={<HeatmapRangeArrow values={values} domain={domain} bins={bins} />}
		/>
	)
}

/** Props for {@link HeatmapHitLayer}: the plot and bands the pointer resolves against. @internal */
type HeatmapHitLayerProps = {
	plot: PlotRect
	rows: number
	cols: number
	xBand: ReturnType<typeof bandScale>
	yBand: ReturnType<typeof bandScale>
	/**
	 * How the tooltip opens: tracked on `'hover'`, pinned by a click on `'click'`
	 * — which also gives the layer a pointer cursor and toggles the readout off on
	 * a second click of the same cell.
	 * @defaultValue 'hover'
	 */
	trigger?: ChartTooltipTrigger
}

/**
 * The transparent rectangle over the plot that feeds the hover context: the
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
}: HeatmapHitLayerProps) {
	const { cell: active, set } = useHeatmapHover()

	// Resolve a pointer event to its `[row, col]` and the client point the tooltip
	// tracks, or `null` before the box has a size.
	const locate = (event: MouseEvent<SVGRectElement>) => {
		const rect = event.currentTarget.getBoundingClientRect()

		if (rect.width <= 0 || rect.height <= 0) return null

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

	const handlers = click
		? {
				onClick: (event: MouseEvent<SVGRectElement>) => {
					const hit = locate(event)

					if (hit === null) return

					if (sameCell(active, hit.cell)) set(null, null)
					else set(hit.cell, hit.point)
				},
			}
		: {
				onPointerMove: (event: PointerEvent<SVGRectElement>) => {
					const hit = locate(event)

					if (hit !== null) set(hit.cell, hit.point)
				},
				onPointerLeave: () => set(null, null),
			}

	return (
		<rect
			data-slot="heatmap-hit"
			x={plot.x}
			y={plot.y}
			width={plot.width}
			height={plot.height}
			fill="none"
			pointerEvents="all"
			className={cn(click && 'cursor-pointer')}
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
 * real Tooltip chrome anchored to the pointer through `useClientPoint`. A
 * pointer enhancement, `aria-hidden` by design — the same values ship in the
 * visually-hidden table.
 *
 * @internal
 */
function HeatmapTooltip({ columns, rows, values, format, fills, cols }: HeatmapTooltipProps) {
	const { cell, point } = useHeatmapHover()

	const open = cell !== null && point !== null

	// `point` is already the client coordinate the pointer sat at, so the tooltip
	// anchors to the cursor directly.
	const clientX = point?.x ?? null

	const clientY = point?.y ?? null

	const { refs, floatingStyles, context } = useFloating({
		open,
		placement: 'top',
		middleware: [offset(12), flip(), shift({ padding: 8 })],
		whileElementsMounted: autoUpdate,
	})

	const clientPoint = useClientPoint(context, { x: clientX, y: clientY })

	const { getReferenceProps, getFloatingProps } = useInteractions([clientPoint])

	const value = useMemo(
		() => ({
			open,
			interactive: false,
			enabled: true,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		}),
		[
			open,
			refs.setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		],
	)

	const datum = cell === null ? null : values[cell.row]?.[cell.col]

	const fill = cell === null ? null : fills[cell.row * cols + cell.col]

	return (
		<TooltipContext value={value}>
			<TooltipContent size="sm">
				{cell !== null && (
					<div aria-hidden="true">
						<div className={cn(k.label, 'mb-1 whitespace-nowrap')}>{columns[cell.col]}</div>

						<div className="flex items-center gap-1.5 whitespace-nowrap">
							<span
								className={cn('size-2.5 shrink-0 rounded-xs', fill === null && NO_DATA_FILL)}
								style={fill === null ? undefined : { backgroundColor: fill }}
							/>

							<span className={cn(k.value)}>{datum == null ? READOUT_GAP : format(datum)}</span>

							<span className={cn(k.label)}>{rows[cell.row]}</span>
						</div>
					</div>
				)}
			</TooltipContent>
		</TooltipContext>
	)
}

/** The x (column) and y (row) band-axis tick labels, thinned to fit their axes. @internal */
function heatmapTicks(
	matrix: HeatmapMatrix,
	xBand: ReturnType<typeof bandScale>,
	yBand: ReturnType<typeof bandScale>,
	plot: PlotRect,
): { x: ChartAxisTick[]; y: ChartAxisTick[] } {
	const widestCol = matrix.columns.reduce((widest, label) => Math.max(widest, label.length), 0)

	// Keyed by the row/column index, not the band center `at`, which collapses onto
	// one coordinate at zero width/height; the index is the cell's stable identity.
	const x = thinned(
		matrix.columns.length,
		plot.width,
		widestCol * TICK_CHAR_WIDTH + GUTTER_GAP,
	).map((index) => ({ at: xBand.center(index), label: matrix.columns[index] ?? '', key: index }))

	const y = thinned(matrix.rows.length, plot.height, BAND_LABEL_HEIGHT).map((index) => ({
		at: yBand.center(index),
		label: matrix.rows[index] ?? '',
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
			values: matrix.columns.map((_, col) => {
				const value = matrix.values[row]?.[col]

				return value == null ? READOUT_GAP : format(value)
			}),
		})),
	}
}

/** Everything {@link HeatmapChart} derives from its props once measured. @internal */
type HeatmapModel = {
	ref: React.RefObject<HTMLDivElement | null>
	frameWidth: number
	frameHeight: number
	reserve: ReturnType<typeof usePlotFrame>['reserve']
	plot: PlotRect
	xBand: ReturnType<typeof bandScale>
	yBand: ReturnType<typeof bandScale>
	matrix: HeatmapMatrix
	cols: number
	rows: number
	cells: ReturnType<typeof heatmapCells>
	fills: (string | null)[]
	cellBins: (number | null)[]
	bins: ColorBin[]
	domain: [number, number] | null
	ticks: { x: ChartAxisTick[]; y: ChartAxisTick[] }
	readout: ChartReadout | null
	format: (value: number) => string
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
	primary: HeatmapChartProps<T>['series'][number] | undefined,
	width: number | undefined,
	height: number | undefined,
	aspectRatio: HeatmapChartProps<T>['aspectRatio'],
	formatValue: HeatmapChartProps<T>['formatValue'],
): HeatmapModel {
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

	const {
		ref,
		width: frameWidth,
		height: frameHeight,
		reserve,
	} = usePlotFrame(width, chartFrameSizing(height, ratio))

	const domain = useMemo(
		() =>
			valueExtent(
				matrix.values.flat().filter((value): value is number => value !== null),
				primary?.colorDomain,
			),
		[matrix, primary],
	)

	const bins = useMemo(
		() => (domain && primary ? resolveColorBins(domain, primary.colorRange, primary.bins) : []),
		[domain, primary],
	)

	// Memoized so their identity holds across a re-render with unchanged data —
	// otherwise a fresh `xBand`/`yBand` every render defeats the `cells`/`cellBins`/
	// `fills` memos below, which key off them. The rows are proportional category
	// labels (day names), not tabular digits, so the gutter reserves at the wider
	// proportional estimate — else a capital-initial label like "Mon"/"Wed" clips
	// against the frame's left edge.
	const plot = useMemo(
		() => plotRect(frameWidth, frameHeight, true, matrix.rows, LABEL_CHAR_WIDTH),
		[frameWidth, frameHeight, matrix.rows],
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
			cells.map((cell) =>
				cell.value === null || domain === null || bins.length === 0
					? null
					: binIndex(cell.value, domain, bins.length),
			),
		[cells, domain, bins],
	)

	// Fill per cell from its bin: the bin's colour, or `null` for the neutral
	// no-data fill.
	const fills = useMemo(
		() => cellBins.map((bin) => (bin === null ? null : (bins[bin]?.color ?? null))),
		[cellBins, bins],
	)

	const format = formatValue ?? formatChartValue

	return {
		ref,
		frameWidth,
		frameHeight,
		reserve,
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
		domain,
		ticks: heatmapTicks(matrix, xBand, yBand, plot),
		readout: cols > 0 && rows > 0 ? heatmapReadout(matrix, format) : null,
		format,
	}
}

/**
 * A heatmap: a grid of cells across two categorical axes, each shaded by a
 * numeric value along a sequential colour scale. The two-categorical member of
 * the chart family — it reuses the shared plot frame, band scales, and axis
 * chrome, and the same data-driven colour scale the {@link ChoroplethChart}
 * shades regions with. Cells with no matching row take the neutral no-data
 * fill; a hover tooltip names the pointed cell and a visually-hidden data table
 * carries full value parity for assistive tech.
 *
 * @remarks Rows pivot to the grid by their distinct `xKey` (columns) and `yKey`
 * (rows) values in first-seen order. The frame defaults to square-ish cells by
 * fitting its aspect to the grid shape; pass `aspectRatio` to override. Motion
 * (`animate`) is not yet wired — the heatmap renders as a static SVG tree.
 * @example
 * ```tsx
 * <HeatmapChart
 *   aria-label="Commits by day and hour"
 *   data={activity}
 *   series={[{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: greens }]}
 * />
 * ```
 */
export function HeatmapChart<T>({
	data,
	series,
	width,
	height,
	aspectRatio,
	legend,
	tooltip,
	formatValue,
	className,
	// Destructured off so the unwired base switches never fall into `...label` and
	// spread onto the plot element as invalid DOM attributes.
	animate: _animate,
	texture: _texture,
	...label
}: HeatmapChartProps<T>) {
	const primary = series[0]

	const { show: showTooltip, trigger } = resolveTooltip(tooltip)

	const {
		ref,
		frameWidth,
		frameHeight,
		reserve,
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
		domain,
		ticks,
		readout,
		format,
	} = useHeatmap(data, primary, width, height, aspectRatio, formatValue)

	const showLegend = (legend ?? true) !== false && domain !== null && bins.length > 0

	const svg = frameWidth > 0 && (
		<svg
			aria-hidden="true"
			className="block size-full"
			viewBox={`0 0 ${frameWidth} ${frameHeight}`}
		>
			<ChartAxis axis="y" plot={plot} ticks={ticks.y} />

			<ChartAxis axis="x" plot={plot} ticks={ticks.x} line={false} />

			<HeatmapCells cells={cells} fills={fills} cellBins={cellBins} />

			{showTooltip && rows > 0 && cols > 0 && (
				<HeatmapHitLayer
					plot={plot}
					rows={rows}
					cols={cols}
					xBand={xBand}
					yBand={yBand}
					trigger={trigger}
				/>
			)}
		</svg>
	)

	return (
		<div
			data-slot="heatmap"
			className={cn('flex flex-col gap-3', width === undefined && 'w-full max-w-2xl', className)}
			style={width === undefined ? undefined : { width }}
		>
			<HeatmapHoverProvider>
				<HeatmapFocusProvider>
					<div className="flex items-center gap-4">
						<div
							ref={ref}
							data-slot="heatmap-plot"
							role="img"
							{...label}
							className="relative min-w-0 flex-1"
						>
							<ChartPlotBox reserve={reserve} height={frameHeight}>
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

						{showLegend && domain && (
							<div data-slot="heatmap-legend-box" className="shrink-0">
								<HeatmapRangeLegend
									colorRange={primary?.colorRange ?? []}
									domain={domain}
									format={format}
									label={primary?.colorName}
									bins={bins.length}
									values={matrix.values}
								/>
							</div>
						)}
					</div>
				</HeatmapFocusProvider>
			</HeatmapHoverProvider>

			{readout && <ChartTable readout={readout} />}
		</div>
	)
}
