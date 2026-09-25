import type { ColumnPinningState } from '@tanstack/react-table'
import type { FrozenOffsets } from './measure'
import type { PinSide } from './overrides'

/**
 * A column's frozen edge in the engine's pin state, or `undefined` when it
 * scrolls.
 *
 * @internal
 */
export function pinSide(pinning: ColumnPinningState, id: string | number): PinSide | undefined {
	const key = String(id)

	if (pinning.left?.includes(key)) return 'left'

	if (pinning.right?.includes(key)) return 'right'

	return undefined
}

/**
 * One frozen column's resolved chrome: the edge it is frozen to, and its sticky
 * offset (px) from that edge. It also carries whether it sits at the frozen
 * group's scroll-facing boundary. The boundary is the innermost column, which
 * alone draws the edge rule and the separating shadow.
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
 * boundaries, where rows, data cells, and header cells all hold on their props.
 * The facts that chrome draws from must therefore arrive as a value that changes
 * when they change. Read them through a stable object instead. A cell that does
 * not re-render for its own reasons then keeps painting the previous layout. The
 * boundary rule stays on the column a new pin displaced, and a sticky offset
 * holds its pre-drag pixels until the drag settles.
 *
 * @internal
 */
export type FrozenLayout = ReadonlyMap<string, FrozenColumn>

/** The layout of a grid with nothing frozen. @internal */
export const EMPTY_FROZEN_LAYOUT: FrozenLayout = new Map<string, FrozenColumn>()

/** The summed width (px) of the columns `ids` names. @internal */
function summedWidth(ids: readonly string[], widths: ReadonlyMap<string, number>): number {
	return ids.reduce((sum, id) => sum + (widths.get(id) ?? 0), 0)
}

/**
 * Resolves the frozen columns' chrome from the two frozen sections, each in edge
 * order. The layout therefore covers exactly what is frozen, whatever set the
 * body happens to render.
 *
 * A frozen column sticks at the summed width of the frozen columns between it
 * and its edge. `measured` carries the offsets read from the rendered header,
 * and wins where it has an entry. The summed `widths` are the rendered widths
 * only under the fixed layout that a resizable grid sets from them. An
 * auto-layout grid sizes each column to its content, so its frozen columns are
 * measured instead (see {@link FrozenOffsets}). `null` — the resizable case, and
 * every render before the first measurement — leaves the sums.
 *
 * @param sections - The ids of the visible columns frozen to each edge, in edge order.
 * @param widths - Each column's width (px), by id.
 * @param measured - The offsets read from the rendered header, or `null`.
 * @internal
 */
export function frozenLayout(
	sections: { left: readonly string[]; right: readonly string[] },
	widths: ReadonlyMap<string, number>,
	measured: FrozenOffsets | null,
): FrozenLayout {
	const layout = new Map<string, FrozenColumn>()

	const { left, right } = sections

	// The boundary reads off the section itself: a left group's innermost column is
	// its last, and a right group's its first.
	left.forEach((id, index) => {
		layout.set(id, {
			side: 'left',
			offset: measured?.left.get(id) ?? summedWidth(left.slice(0, index), widths),
			boundary: index === left.length - 1,
		})
	})

	right.forEach((id, index) => {
		layout.set(id, {
			side: 'right',
			offset: measured?.right.get(id) ?? summedWidth(right.slice(index + 1), widths),
			boundary: index === 0,
		})
	})

	return layout
}

/**
 * Whether two layouts freeze the same columns to the same edges, at the same
 * pixels, with the boundary on the same column. A re-resolution that moved
 * nothing can hold its previous reference, instead of re-rendering the header
 * and every row for the same chrome.
 *
 * @internal
 */
export function sameFrozenLayout(a: FrozenLayout, b: FrozenLayout): boolean {
	if (a === b) return true

	if (a.size !== b.size) return false

	for (const [id, entry] of a) {
		const other = b.get(id)

		if (
			!other ||
			other.side !== entry.side ||
			other.offset !== entry.offset ||
			other.boundary !== entry.boundary
		) {
			return false
		}
	}

	return true
}
