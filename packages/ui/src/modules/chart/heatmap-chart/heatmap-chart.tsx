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
import { type PointerEvent, type ReactNode, useMemo, useState } from 'react'
import { Text } from '../../../components/text'
import { TooltipContent } from '../../../components/tooltip'
import { TooltipContext } from '../../../components/tooltip/context'
import { cn, createContext } from '../../../core'
import { usePlotFrame } from '../../../hooks'
import { k } from '../../../recipes/kata/chart'
import { binIndex, type ColorBin, resolveColorBins, valueExtent } from '../../../utilities'
import { ChartAxis, type ChartAxisTick } from '../chart-axis'
import { BAND_LABEL_HEIGHT, GUTTER_GAP, TICK_CHAR_WIDTH } from '../chart-constants'
import { chartFrameSizing, type PlotRect, plotRect, thinned } from '../chart-layout'
import { ChartPlotBox } from '../chart-plot-box'
import { bandScale } from '../chart-scale'
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

/** Props for {@link HeatmapCells}: the resolved cells and their fills. @internal */
type HeatmapCellsProps = {
	cells: ReturnType<typeof heatmapCells>
	/** The fill per cell, index-aligned; `null` paints the no-data neutral. */
	fills: (string | null)[]
}

/** The cell grid: one rect per matrix cell, painted from the sequential scale or the neutral no-data fill. @internal */
function HeatmapCells({ cells, fills }: HeatmapCellsProps) {
	return (
		<g data-slot="heatmap-cells">
			{cells.map((cell, index) => {
				const fill = fills[index]

				return (
					<rect
						key={cell.key}
						x={cell.x}
						y={cell.y}
						width={cell.width}
						height={cell.height}
						rx={cell.radius}
						{...(fill === null || fill === undefined ? { className: cn(NO_DATA_FILL) } : { fill })}
					/>
				)
			})}
		</g>
	)
}

/** Props for {@link HeatmapHitLayer}: the plot and bands the pointer resolves against. @internal */
type HeatmapHitLayerProps = {
	plot: PlotRect
	rows: number
	cols: number
	xBand: ReturnType<typeof bandScale>
	yBand: ReturnType<typeof bandScale>
}

/**
 * The transparent rectangle over the plot that feeds the hover context: the
 * pointer resolves to its `[row, col]` through the band arithmetic, so a reader
 * aims at a cell without the marks repainting.
 *
 * @internal
 */
function HeatmapHitLayer({ plot, rows, cols, xBand, yBand }: HeatmapHitLayerProps) {
	const { set } = useHeatmapHover()

	const move = (event: PointerEvent<SVGRectElement>) => {
		const rect = event.currentTarget.getBoundingClientRect()

		// The SVG fills its box one-to-one through the viewBox, so a client offset
		// inside the plot is already a frame coordinate.
		const x = event.clientX - rect.left

		const y = event.clientY - rect.top

		set(cellAt(x, y, xBand, yBand, cols, rows), { x, y })
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
			onPointerMove={move}
			onPointerLeave={() => set(null, null)}
		/>
	)
}

/** Props for {@link HeatmapTooltip}: the labels and values the pointed cell reads. @internal */
type HeatmapTooltipProps = {
	plotRef: React.RefObject<HTMLDivElement | null>
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
function HeatmapTooltip({
	plotRef,
	columns,
	rows,
	values,
	format,
	fills,
	cols,
}: HeatmapTooltipProps) {
	const { cell, point } = useHeatmapHover()

	const open = cell !== null && point !== null

	const rect = plotRef.current?.getBoundingClientRect()

	const clientX = point && rect ? rect.left + point.x : null

	const clientY = point && rect ? rect.top + point.y : null

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

/** Props for {@link HeatmapLegend}: the colour ramp and the value extent it spans. @internal */
type HeatmapLegendProps = {
	bins: ColorBin[]
	domain: [number, number]
	format: (value: number) => string
	label?: string
}

/**
 * The heatmap's range legend: a continuous vertical colour-scale bar — the
 * ramp low at the bottom to high at the top — with the domain endpoints
 * labelled. The choropleth's `legend="range"` counterpart, self-contained here.
 *
 * @remarks Full value parity ships in the visually-hidden data table; the bar
 * is a visual key, so it is `aria-hidden`.
 * @internal
 */
function HeatmapLegend({ bins, domain, format, label }: HeatmapLegendProps) {
	const [min, max] = domain

	const stops = bins.map((bin) => bin.color)

	const gradient =
		stops.length > 1
			? { backgroundImage: `linear-gradient(to top, ${stops.join(', ')})` }
			: { backgroundColor: stops[0] }

	return (
		<div data-slot="heatmap-legend" className="flex shrink-0 flex-col gap-1.5" aria-hidden="true">
			{label && (
				<Text as="span" size="sm" className="leading-tight">
					{label}
				</Text>
			)}

			<div className="flex h-40 items-stretch gap-2">
				<div data-slot="heatmap-legend-bar" className="w-5 rounded-xs" style={gradient} />

				<div className="flex flex-col justify-between">
					<Text as="span" severity="muted" size="sm" className="tabular-nums leading-none">
						{format(max)}
					</Text>

					<Text as="span" severity="muted" size="sm" className="tabular-nums leading-none">
						{format(min)}
					</Text>
				</div>
			</div>
		</div>
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

	const x = thinned(
		matrix.columns.length,
		plot.width,
		widestCol * TICK_CHAR_WIDTH + GUTTER_GAP,
	).map((index) => ({ at: xBand.center(index), label: matrix.columns[index] ?? '' }))

	const y = thinned(matrix.rows.length, plot.height, BAND_LABEL_HEIGHT).map((index) => ({
		at: yBand.center(index),
		label: matrix.rows[index] ?? '',
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

	const plot = plotRect(frameWidth, frameHeight, true, matrix.rows)

	const xBand = bandScale({ count: cols, range: [plot.x, plot.x + plot.width], padding: 0 })

	const yBand = bandScale({ count: rows, range: [plot.y, plot.y + plot.height], padding: 0 })

	const cells = useMemo(() => heatmapCells(matrix.values, xBand, yBand), [matrix, xBand, yBand])

	// Fill per cell, index-aligned with `cells` (row-major): the bin colour for a
	// finite value, `null` for the neutral no-data fill.
	const fills = useMemo(
		() =>
			cells.map((cell) => {
				if (cell.value === null || domain === null || bins.length === 0) return null

				const index = binIndex(cell.value, domain, bins.length)

				return index === null ? null : (bins[index]?.color ?? null)
			}),
		[cells, domain, bins],
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
	tooltip = true,
	formatValue,
	className,
	...label
}: HeatmapChartProps<T>) {
	const primary = series[0]

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

			<HeatmapCells cells={cells} fills={fills} />

			{tooltip && rows > 0 && cols > 0 && (
				<HeatmapHitLayer plot={plot} rows={rows} cols={cols} xBand={xBand} yBand={yBand} />
			)}
		</svg>
	)

	return (
		<div
			data-slot="heatmap"
			className={cn('flex flex-col gap-3', width === undefined && 'w-full', className)}
			style={width === undefined ? undefined : { width }}
		>
			<HeatmapHoverProvider>
				<div className={cn('flex flex-col gap-2', showLegend && 'lg:flex-row lg:items-center')}>
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

						{tooltip && readout && frameWidth > 0 && (
							<HeatmapTooltip
								plotRef={ref}
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
						<HeatmapLegend bins={bins} domain={domain} format={format} label={primary?.colorName} />
					)}
				</div>
			</HeatmapHoverProvider>

			{readout && <ChartTable readout={readout} />}
		</div>
	)
}
