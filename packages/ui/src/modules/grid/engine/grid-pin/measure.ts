import type { GridColumn } from '../../types'
import type { PinSide } from './overrides'

/**
 * Sticky offsets (px) for the frozen columns, keyed by stringified column id:
 * `left` holds each left-frozen column's distance from the left edge, `right`
 * each right-frozen column's distance from the right one. Measured from the
 * rendered header (see {@link frozenOffsets}) for the grids whose column widths
 * the engine's size model does not set.
 *
 * @internal
 */
export type FrozenOffsets = {
	left: Map<string, number>
	right: Map<string, number>
}

/** One frozen column's rendered header cell and the edge it is frozen to. @internal */
export type FrozenCell = {
	id: string
	side: PinSide
	cell: HTMLElement
}

/**
 * The rendered column-header cells in visible-column order, or `null` when no
 * header has rendered. Anchored on a data column's `data-grid-col` cell and read
 * through its row, so the column-header row resolves whether or not a
 * column-group band row sits above it — a band cell carries no column id.
 *
 * @internal
 */
function headerRowCells(container: HTMLElement): HTMLElement[] | null {
	const row = container.querySelector('thead th[data-grid-col]')?.parentElement

	if (!row) return null

	return [...row.children] as HTMLElement[]
}

/**
 * The frozen columns' rendered header cells, in visible-column order. The header
 * row carries one cell per visible column, so the columns index straight into it;
 * a row that does not match the column count is mid-render and yields nothing.
 * These are the cells a measured offset sums — and the exact set whose width
 * change moves one.
 *
 * @param side - A column's frozen edge, read from the engine.
 * @internal
 */
export function frozenHeaderCells<T>(
	container: HTMLElement,
	columns: GridColumn<T>[],
	side: (id: string | number) => PinSide | undefined,
): FrozenCell[] {
	const cells = headerRowCells(container)

	if (!cells || cells.length !== columns.length) return []

	const frozen: FrozenCell[] = []

	columns.forEach((col, index) => {
		const edge = side(col.id)

		const cell = cells[index]

		if (edge && cell) frozen.push({ id: String(col.id), side: edge, cell })
	})

	return frozen
}

/**
 * The sticky offsets the frozen cells resolve to: each left-frozen column starts
 * after the ones ahead of it, each right-frozen column after the ones behind it.
 * Summed from the cells' rendered widths rather than the engine's column sizes,
 * which are the rendered widths only under the fixed layout a resizable grid
 * sets — an auto-layout grid sizes its columns to their content, so summing the
 * engine's sizes there spreads the frozen columns apart and lets the scrolling
 * columns show through the gaps.
 *
 * @internal
 */
export function frozenOffsets(cells: FrozenCell[]): FrozenOffsets {
	const left = new Map<string, number>()

	const right = new Map<string, number>()

	let offset = 0

	for (const entry of cells) {
		if (entry.side !== 'left') continue

		left.set(entry.id, offset)

		offset += entry.cell.getBoundingClientRect().width
	}

	offset = 0

	for (let index = cells.length - 1; index >= 0; index--) {
		const entry = cells[index]

		if (entry?.side !== 'right') continue

		right.set(entry.id, offset)

		offset += entry.cell.getBoundingClientRect().width
	}

	return { left, right }
}

/** Whether two offset maps hold the same columns at the same pixels. @internal */
function sameOffsetMap(a: Map<string, number>, b: Map<string, number>): boolean {
	if (a.size !== b.size) return false

	for (const [id, offset] of a) {
		if (b.get(id) !== offset) return false
	}

	return true
}

/**
 * Whether two measurements place every frozen column identically, so a
 * re-measure that moved nothing can hold its previous reference instead of
 * re-rendering the header and every row for the same pixels.
 *
 * @internal
 */
export function sameFrozenOffsets(a: FrozenOffsets | null, b: FrozenOffsets): boolean {
	return a != null && sameOffsetMap(a.left, b.left) && sameOffsetMap(a.right, b.right)
}
