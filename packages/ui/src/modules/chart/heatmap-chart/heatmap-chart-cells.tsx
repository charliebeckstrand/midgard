'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '../../../core/cn'
import { usePrefersReducedMotion } from '../../../hooks/use-prefers-reduced-motion'
import { k } from '../../../recipes/kata/chart'
import { CELL_RING_WIDTH, cellRing, type HeatmapCell } from '../engine/chart-geometry/heatmap'
import { seriesGroupClass } from '../engine/chart-series'
import { useChartSweep } from '../engine/use-chart-sweep'
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

/**
 * The color transition of a cell under `animate`: the fill, and the opacity of
 * the legend probe's dim. The reveal and a later data change crossfade every
 * cell at once, in the tempo of the map's region wash, because the two
 * sequential-color charts fill in the same way. `motion-reduce` drops it, so a
 * reader who asked for reduced motion sees each color at once. @internal
 */
const WASH_CLASS = 'transition-[fill,opacity] duration-400 ease-out motion-reduce:transition-none'

/**
 * Where the color wash of an animated heatmap stands. A static heatmap is
 * `'none'`: its cells take their colors at once, with no transition. An
 * animated one is `'hold'` before its first commit, so the cells paint the
 * neutral, and `'wash'` after it, so the colors crossfade in.
 *
 * @internal
 */
type CellWash = 'none' | 'hold' | 'wash'

/**
 * The wash of the grid under `animate`. The first commit flips the cells from
 * the neutral to their colors, and the CSS transition washes them in. The flip
 * is one way: a resize never plays the wash again.
 *
 * @remarks The server cannot read the reduced-motion preference, so it renders
 * the colors at rest, as the marks of the other charts do. A grid that mounts at
 * rest (on the server, in the hydration render, or for a reader who asked for
 * reduced motion) plays no wash and only crossfades its later data changes.
 * @internal
 */
function useCellWash(animate: boolean, count: number): CellWash {
	// Read once, for the first render: the preference is `true` on the server and
	// in the hydration render.
	const still = usePrefersReducedMotion()

	const [revealed, setRevealed] = useState(!animate || still)

	useEffect(() => {
		if (animate && count > 0) setRevealed(true)
	}, [animate, count])

	if (!animate) return 'none'

	return revealed ? 'wash' : 'hold'
}

/** Props for {@link HeatmapChartCells}: the resolved cells, their fills, and their bins. @internal */
type HeatmapChartCellsProps = {
	cells: HeatmapCell[]
	/** The number of columns of the grid, which a sweep crosses. */
	cols: number
	/** The fill per cell, index-aligned; `null` paints the no-data neutral. */
	fills: (string | null)[]
	/** The bin per cell, index-aligned; `null` for a no-data cell. Dims against the legend probe. */
	cellBins: (number | null)[]
	/**
	 * Wash the colors in on mount, and crossfade a data change (see
	 * {@link useCellWash}). `'sweep'` delays the reveal of each column by its place.
	 */
	animate: boolean | 'sweep'
}

/**
 * The cell grid: one rect per matrix cell, painted from the sequential scale or
 * the neutral no-data fill. Cells outside the legend's probed bin dim, the
 * heatmap's counterpart to the choropleth's region emphasis, and
 * {@link HeatmapProbedRings} rings the cells inside it.
 *
 * @remarks Under `animate` the grid paints the neutral at once, and the colors
 * wash in, as the choropleth's color washes in, column by column under
 * `'sweep'`. The wash is a CSS color transition on a plain `<rect>`, so the grid
 * carries no motion runtime.
 * @internal
 */
export function HeatmapChartCells({
	cells,
	cols,
	fills,
	cellBins,
	animate,
}: HeatmapChartCellsProps) {
	const { bin: focus } = useHeatmapFocus()

	const wash = useCellWash(animate !== false, cells.length)

	// Each cell's place along the sweep is its column.
	const columns = useCallback(
		() => cells.map((cell) => (cols > 1 ? cell.col / (cols - 1) : 0)),
		[cells, cols],
	)

	const delay = useChartSweep(animate === 'sweep' ? columns : null, wash === 'wash')

	return (
		<g data-slot="heatmap-cells">
			{cells.map((cell, index) => {
				// The neutral holds every cell before the wash.
				const fill = wash === 'hold' ? null : fills[index]

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
							seriesGroupClass(dimmed),
							wash !== 'none' && WASH_CLASS,
							fill == null && NO_DATA_FILL,
						)}
						style={delay(index)}
						{...(fill == null ? {} : { fill })}
					/>
				)
			})}
		</g>
	)
}

/** The rect of one stroke of a cell mark. @internal */
function CellStroke({ cell, side }: { cell: HeatmapCell; side: 'outer' | 'inner' }) {
	const rect = cellRing(cell, side)

	return (
		<rect
			x={rect.x}
			y={rect.y}
			width={rect.width}
			height={rect.height}
			rx={rect.radius}
			fill="none"
			strokeWidth={CELL_RING_WIDTH}
			className={cn(side === 'outer' ? k.selected.ring : k.selected.halo)}
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
			<CellStroke cell={cell} side="inner" />

			<CellStroke cell={cell} side="outer" />
		</g>
	)
}

/** Props for {@link HeatmapProbedRings}: the cells and their bins. @internal */
type HeatmapProbedRingsProps = {
	cells: HeatmapCell[]
	/** The bin per cell, index-aligned; `null` for a no-data cell. */
	cellBins: (number | null)[]
}

/**
 * The rings on the cells that the legend probe holds lit. The probe dims the
 * other cells toward the surface, and the surface matches one end of the scale:
 * the light end in light mode, and the dark end in dark mode. A lit cell at that
 * end then has the color of the dimmed cells. The {@link CellRing} on each lit
 * cell tells it apart at every stop of the scale.
 *
 * @internal
 */
export function HeatmapProbedRings({ cells, cellBins }: HeatmapProbedRingsProps) {
	const { bin: focus } = useHeatmapFocus()

	if (focus === null) return null

	return (
		<g data-slot="heatmap-probed" pointerEvents="none">
			{cells.map((cell, index) =>
				cellBins[index] === focus ? (
					<CellRing key={cell.key} cell={cell} slot="heatmap-probed-cell" />
				) : null,
			)}
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
