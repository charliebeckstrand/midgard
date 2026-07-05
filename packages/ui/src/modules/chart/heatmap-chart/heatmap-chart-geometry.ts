/**
 * Pure geometry for the {@link HeatmapChart}: a row-major value matrix
 * projected onto a grid of axis-aligned cells, one band scale per axis.
 * Framework- and colour-free so the cell math is unit-testable in isolation —
 * the component resolves each cell's fill from the sequential colour scale by
 * its value, the way the bar geometry emits shapes and leaves the slot colour
 * to the render. Both axes are band scales, so a heatmap is the two-categorical
 * twin of the cartesian frame rather than a value-axis chart.
 */

import { MARK_GAP } from '../chart-constants'
import type { BandScale } from '../chart-scale'

/** Cell corner radius; reads as a tile, not a pill. Clamped per cell below. @internal */
const CELL_RADIUS = 2

/**
 * One drawable cell: its rect, corner radius, grid position, and raw value.
 * Colour-free — the component paints it from the value through the sequential
 * scale, and a `null` value takes the neutral no-data fill.
 *
 * @internal
 */
export type HeatmapCell = {
	/** The cell's left edge, in `viewBox` units. */
	x: number
	/** The cell's top edge. */
	y: number
	/** Drawable width inside its column slot, after the surface gap. */
	width: number
	/** Drawable height inside its row slot. */
	height: number
	/** Corner radius, clamped to half the lesser side so a thin cell never inverts. */
	radius: number
	/** Row (y-band) index — the hit test and hidden table key off it. */
	row: number
	/** Column (x-band) index. */
	col: number
	/** The cell's value, or `null` for a no-data cell drawn in the neutral fill. */
	value: number | null
	/** Stable `row:col` key: geometry-free, so a resize never remounts the cell. */
	key: string
}

/**
 * Projects a row-major value matrix onto cell marks: cell `[row][col]` fills
 * its column's x-band slot crossed with its row's y-band slot, inset by half
 * {@link MARK_GAP} on every side for the surface gap between tiles. The bands
 * are expected to be built with near-zero padding, so the gap comes from the
 * inset alone rather than doubling with band air.
 *
 * @remarks A `null` cell is still emitted (it holds a grid slot and a table
 * cell); the component paints it the no-data fill rather than sampling the
 * scale. The inset is dropped on a cell too small to hold it, so a dense grid
 * degrades to touching tiles instead of vanishing.
 * @internal
 */
export function heatmapCells(
	matrix: (number | null)[][],
	xBand: BandScale,
	yBand: BandScale,
): HeatmapCell[] {
	const gap = MARK_GAP / 2

	const cells: HeatmapCell[] = []

	matrix.forEach((columns, row) => {
		columns.forEach((value, col) => {
			const fitsX = xBand.width > MARK_GAP + 1

			const fitsY = yBand.width > MARK_GAP + 1

			const width = fitsX ? xBand.width - MARK_GAP : xBand.width

			const height = fitsY ? yBand.width - MARK_GAP : yBand.width

			cells.push({
				x: xBand.at(col) + (fitsX ? gap : 0),
				y: yBand.at(row) + (fitsY ? gap : 0),
				width: Math.max(0, width),
				height: Math.max(0, height),
				radius: Math.min(CELL_RADIUS, width / 2, height / 2),
				row,
				col,
				value,
				key: `${row}:${col}`,
			})
		})
	})

	return cells
}

/**
 * Resolves the cell under a pointer to its `[row, col]`, or `null` when the
 * point falls outside the grid. Reuses each band's slot arithmetic rather than
 * hit-testing every rect, so it stays O(1) as the grid grows.
 *
 * @internal
 */
export function cellAt(
	x: number,
	y: number,
	xBand: BandScale,
	yBand: BandScale,
	cols: number,
	rows: number,
): { row: number; col: number } | null {
	const col = bandIndex(x, xBand, cols)

	const row = bandIndex(y, yBand, rows)

	if (col === null || row === null) return null

	return { row, col }
}

/** The band slot a coordinate lands in, or `null` when it sits outside the range. @internal */
function bandIndex(pos: number, band: BandScale, count: number): number | null {
	if (count <= 0 || band.step <= 0) return null

	const first = band.center(0) - band.step / 2

	const index = Math.floor((pos - first) / band.step)

	return index < 0 || index >= count ? null : index
}
