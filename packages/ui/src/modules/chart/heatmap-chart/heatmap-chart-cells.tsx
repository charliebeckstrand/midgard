'use client'

import { cn } from '../../../core'
import { k } from '../../../recipes/kata/chart'
import { CELL_RING_WIDTH, cellRing, type HeatmapCell } from '../engine/chart-geometry/heatmap'
import { seriesGroupClass } from '../engine/chart-series'
import { useHeatmapFocus, useHoveredCell } from './context'

/** The neutral fill for a cell with no datum, one step off the surface. @internal */
export const NO_DATA_FILL = 'fill-zinc-100 dark:fill-zinc-800'

/**
 * The no-data neutral on `currentColor`, for the HTML swatch that keys a
 * readout to the cell. It is one step past {@link NO_DATA_FILL}, because the
 * popover surface is `zinc-800` in dark mode and would hide the cell step.
 *
 * @internal
 */
export const NO_DATA_TEXT = 'text-zinc-200 dark:text-zinc-700'

/** Props for {@link HeatmapChartCells}: the resolved cells, their fills, and their bins. @internal */
type HeatmapChartCellsProps = {
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
export function HeatmapChartCells({ cells, fills, cellBins }: HeatmapChartCellsProps) {
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

/** The rect of one stroke of a cell mark. @internal */
function CellStroke({ cell, stroke }: { cell: HeatmapCell; stroke: 'ring' | 'halo' }) {
	const rect = cellRing(cell, stroke)

	return (
		<rect
			x={rect.x}
			y={rect.y}
			width={rect.width}
			height={rect.height}
			rx={rect.radius}
			fill="none"
			strokeWidth={CELL_RING_WIDTH}
			className={cn(k.selected[stroke])}
		/>
	)
}

/**
 * The mark on one cell: the ring in the selection ink, and the halo in the
 * surface fill between the ring and the cell. Each mark of a cell takes it, so
 * the heatmap marks a cell in one way. @internal
 */
export function CellRing({ cell, slot }: { cell: HeatmapCell; slot: string }) {
	return (
		<g data-slot={slot}>
			<CellStroke cell={cell} stroke="halo" />

			<CellStroke cell={cell} stroke="ring" />
		</g>
	)
}

/** Props for {@link HeatmapCellRings}: the cells and the selected one. @internal */
type HeatmapCellRingsProps = {
	cells: HeatmapCell[]
	/** The row-major index of the selected cell, or `null`. */
	selected: number | null
}

/**
 * The rings over the grid. One marks the cell under the pointer or the keyboard
 * cursor, the cell that the tooltip reads and that Enter fires. The other marks
 * the selected cell. Each is a ring in the selection ink, parted from the cell
 * by a halo in the surface fill ({@link cellRing}), so it reads on every stop of
 * the scale. The grid keeps every color at full strength, and the cells can
 * still be compared. Only these
 * rings read the hover, so a move from cell to cell renders no cell.
 *
 * @remarks A pointed cell that is also the selected cell takes the one ring. A
 * hover index past the grid (the grid shrank under a pinned cell) marks nothing.
 * @internal
 */
export function HeatmapCellRings({ cells, selected }: HeatmapCellRingsProps) {
	const hovered = useHoveredCell()

	const picked = selected === null ? undefined : cells[selected]

	const pointed = hovered === null || hovered === selected ? undefined : cells[hovered]

	if (!picked && !pointed) return null

	return (
		<g data-slot="heatmap-rings" pointerEvents="none">
			{picked && <CellRing cell={picked} slot="heatmap-selected" />}

			{pointed && <CellRing cell={pointed} slot="heatmap-pointed" />}
		</g>
	)
}
