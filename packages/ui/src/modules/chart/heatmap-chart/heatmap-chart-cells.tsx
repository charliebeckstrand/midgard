'use client'

import { type CSSProperties, startTransition, useEffect, useMemo, useState } from 'react'
import { cn } from '../../../core'
import { usePrefersReducedMotion } from '../../../hooks/use-prefers-reduced-motion'
import { k } from '../../../recipes/kata/chart'
import { CELL_RING_WIDTH, cellRing, type HeatmapCell } from '../engine/chart-geometry/heatmap'
import { CELL_WASH, CELL_WASH_SETTLE, cellWashDelay } from '../engine/chart-motion'
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

/**
 * The color transition of a cell under `animate`: the fill, and the opacity of
 * the legend probe's dim. `motion-reduce` drops it, so a reader who asked for
 * reduced motion sees each color at once. @internal
 */
const WASH_CLASS = 'transition-[fill,opacity] ease-out motion-reduce:transition-none'

/** The wash time, as a CSS duration. @internal */
const WASH_DURATION = `${CELL_WASH.duration * 1000}ms`

/** The wash past the reveal: the crossfade alone, with no delay. @internal */
const SETTLED_WASH: CSSProperties = { transitionDuration: WASH_DURATION }

/**
 * Where the color wash of an animated heatmap stands. A static heatmap is
 * `'none'`: its cells take their colors at once, with no transition. An
 * animated one is `'hold'` before its first commit, so the cells paint the
 * neutral. It is `'reveal'` while the colors wash in from the left, and
 * `'settled'` once the wash has played out.
 *
 * @internal
 */
type CellWash = 'none' | 'hold' | 'reveal' | 'settled'

/**
 * The wash of the grid under `animate`. The first commit flips the cells from
 * the neutral to their colors, and the CSS transition washes them in. The column
 * stagger is the reveal's alone. It retires when the reveal ends, so a later
 * data change crossfades every cell at once and is not held by its column delay.
 * Each flip is one way: a resize never plays the wash again.
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

	const [settled, setSettled] = useState(revealed)

	useEffect(() => {
		if (!animate || !revealed) return

		const timer = setTimeout(() => startTransition(() => setSettled(true)), CELL_WASH_SETTLE * 1000)

		return () => clearTimeout(timer)
	}, [animate, revealed])

	if (!animate) return 'none'

	if (!revealed) return 'hold'

	return settled ? 'settled' : 'reveal'
}

/**
 * The transition style of each column under `wash`, or `null` on a static
 * heatmap. One object serves every cell of a column, so a render of the grid
 * makes no style per cell. @internal
 */
function useWashStyles(wash: CellWash, cols: number): CSSProperties[] | null {
	return useMemo(() => {
		if (wash === 'none') return null

		if (wash !== 'reveal') return Array.from({ length: cols }, () => SETTLED_WASH)

		return Array.from({ length: cols }, (_, col) => ({
			transitionDuration: WASH_DURATION,
			transitionDelay: `${cellWashDelay(col, cols) * 1000}ms`,
		}))
	}, [wash, cols])
}

/** Props for {@link HeatmapChartCells}: the resolved cells, their fills, and their bins. @internal */
type HeatmapChartCellsProps = {
	cells: HeatmapCell[]
	/** The number of columns of the grid, which the wash staggers across. */
	cols: number
	/** The fill per cell, index-aligned; `null` paints the no-data neutral. */
	fills: (string | null)[]
	/** The bin per cell, index-aligned; `null` for a no-data cell. Dims against the legend probe. */
	cellBins: (number | null)[]
	/** Wash the colors in on mount, and crossfade a data change (see {@link useCellWash}). */
	animate: boolean
}

/**
 * The cell grid: one rect per matrix cell, painted from the sequential scale or
 * the neutral no-data fill. Cells outside the legend's probed bin dim, the
 * heatmap's counterpart to the choropleth's region emphasis.
 *
 * @remarks Under `animate` the grid paints the neutral at once, and the colors
 * wash in column by column, as the choropleth's color washes in region by
 * region. The wash is a CSS color transition on a plain `<rect>`, so the grid
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

	const wash = useCellWash(animate, cells.length)

	const styles = useWashStyles(wash, cols)

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
							styles && WASH_CLASS,
							fill == null && NO_DATA_FILL,
						)}
						style={styles?.[cell.col]}
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
