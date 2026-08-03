import type { Table } from '@tanstack/react-table'
import type { FrozenOffsets } from './measure'
import type { PinSide } from './overrides'

/** A column's frozen edge as the engine resolves it, or `undefined` when it scrolls. @internal */
export function columnPinSide<T>(table: Table<T>, id: string | number): PinSide | undefined {
	return table.getColumn(String(id))?.getIsPinned() || undefined
}

/**
 * One frozen column's resolved chrome: the edge it is frozen to, its sticky
 * offset (px) from that edge, and whether it sits at the frozen group's
 * scroll-facing boundary — the innermost column, which alone draws the edge rule
 * and the separating shadow.
 *
 * @internal
 */
export type FrozenColumn = {
	side: PinSide
	/** Distance (px) from the frozen edge: the summed width of the frozen columns between this one and that edge. */
	offset: number
	/** Whether this is the group's innermost column — the one at the scroll-facing boundary. */
	boundary: boolean
}

/**
 * The frozen layout as a value: each frozen column's {@link FrozenColumn}, keyed
 * by stringified column id. A column the map omits scrolls.
 *
 * @remarks A snapshot, not a live reader. The pinned chrome rides `memo`
 * boundaries — rows, data cells, and header cells all hold on their props — so
 * the facts that chrome draws from must arrive as a value that changes when they
 * change. Read them through a stable object instead, and a cell that does not
 * re-render for its own reasons keeps painting the previous layout: the boundary
 * rule stays on the column a new pin displaced, and a sticky offset holds its
 * pre-drag pixels until the drag settles.
 *
 * @internal
 */
export type FrozenLayout = ReadonlyMap<string, FrozenColumn>

/** The layout of a grid with nothing frozen. @internal */
export const EMPTY_FROZEN_LAYOUT: FrozenLayout = new Map<string, FrozenColumn>()

/**
 * Resolves the frozen columns' chrome from the engine's own left and right
 * sections — the columns it holds at each edge, in edge order — so the layout
 * covers exactly what is frozen, whatever set the body happens to render.
 *
 * `measured` carries the offsets read from the rendered header, and wins where it
 * has an entry. The engine's own offsets sum its column sizes, which are the
 * rendered widths only under the fixed layout a resizable grid sets from them; an
 * auto-layout grid sizes each column to its content, so its frozen columns are
 * measured instead (see {@link FrozenOffsets}). `null` — the resizable case, and
 * every render before the first measurement — leaves the engine's sums.
 *
 * @internal
 */
export function frozenLayout<T>(table: Table<T>, measured: FrozenOffsets | null): FrozenLayout {
	const layout = new Map<string, FrozenColumn>()

	for (const column of table.getLeftVisibleLeafColumns()) {
		layout.set(column.id, {
			side: 'left',
			offset: measured?.left.get(column.id) ?? column.getStart('left'),
			boundary: column.getIsLastColumn('left'),
		})
	}

	for (const column of table.getRightVisibleLeafColumns()) {
		layout.set(column.id, {
			side: 'right',
			offset: measured?.right.get(column.id) ?? column.getAfter('right'),
			boundary: column.getIsFirstColumn('right'),
		})
	}

	return layout
}

/**
 * Whether two layouts freeze the same columns to the same edges, at the same
 * pixels, with the boundary on the same column — so a re-resolution that moved
 * nothing can hold its previous reference instead of re-rendering the header and
 * every row for the same chrome.
 *
 * @internal
 */
export function sameFrozenLayout(a: FrozenLayout, b: FrozenLayout): boolean {
	if (a === b) return true

	if (a.size !== b.size) return false

	for (const [id, entry] of a) {
		const other = b.get(id)

		if (!other) return false

		if (other.side !== entry.side) return false

		if (other.offset !== entry.offset) return false

		if (other.boundary !== entry.boundary) return false
	}

	return true
}
