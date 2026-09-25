import type { FrozenColumn, FrozenLayout } from './layout'

/**
 * The attribute that marks a frozen cell with the id of its column. The grid
 * finds the cells of a moved column through it (see {@link writeFrozenOffsets}).
 *
 * @internal
 */
export const FROZEN_CELL_ATTRIBUTE = 'data-grid-pin'

/**
 * The committed frozen layout, as a store that the pinned chrome reads its
 * sticky offsets from.
 *
 * @remarks
 * The `pinning` view of the grid changes only when a column changes its edge or
 * its boundary role. An offset move therefore renders no row. The grid commits
 * each new layout to this store in a layout effect. It then writes the offsets
 * of the moved columns to their cells before the browser paints. A cell that
 * renders reads the committed offset, so a later render keeps the offset that
 * the grid wrote.
 *
 * @internal
 */
export type FrozenOffsetStore = {
	/** The committed offset (px) of a column on `side`, or `undefined` when the committed layout does not freeze it there. */
	get: (columnId: string, side: FrozenColumn['side']) => number | undefined
	/** Takes the layout of a commit, and returns the layout it replaces. */
	commit: (layout: FrozenLayout) => FrozenLayout
}

/** A new {@link FrozenOffsetStore} that holds `initial`. @internal */
export function createFrozenOffsetStore(initial: FrozenLayout): FrozenOffsetStore {
	let current = initial

	return {
		get: (columnId, side) => {
			const entry = current.get(columnId)

			return entry?.side === side ? entry.offset : undefined
		},
		commit: (layout) => {
			const previous = current

			current = layout

			return previous
		},
	}
}

/** The CSS property that holds the sticky offset of a column on `side`. @internal */
function insetProperty(side: FrozenColumn['side']): string {
	return side === 'left' ? 'inset-inline-start' : 'inset-inline-end'
}

/**
 * Writes the sticky offset of each column that moved from `previous` to `next`
 * to the frozen cells of that column inside `container`. A cell that already
 * holds the offset gets no write, so a commit that moved nothing restyles no
 * cell.
 *
 * @remarks
 * One query finds all the frozen cells, and only the cells of a moved column get
 * a write. The browser therefore restyles only those cells. A row that renders
 * later reads the same offset from the {@link FrozenOffsetStore}.
 *
 * @internal
 */
export function writeFrozenOffsets(
	container: ParentNode,
	previous: FrozenLayout,
	next: FrozenLayout,
): void {
	const moved = new Map<string, FrozenColumn>()

	for (const [id, entry] of next) {
		const before = previous.get(id)

		if (before?.side !== entry.side || before.offset !== entry.offset) moved.set(id, entry)
	}

	if (moved.size === 0) return

	for (const cell of container.querySelectorAll<HTMLElement>(`[${FROZEN_CELL_ATTRIBUTE}]`)) {
		const entry = moved.get(cell.getAttribute(FROZEN_CELL_ATTRIBUTE) ?? '')

		if (!entry) continue

		const property = insetProperty(entry.side)

		const value = `${entry.offset}px`

		if (cell.style.getPropertyValue(property) !== value) cell.style.setProperty(property, value)
	}
}
