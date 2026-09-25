import type { ColumnPinningState } from '@tanstack/react-table'
import type { FrozenOffsets } from './measure'
import type { PinSide } from './overrides'

/**
 * A column's frozen edge in the engine's pin state, or `undefined` when it
 * scrolls. The engine names its sections `start` and `end`. The `start`
 * section comes first in the column order, which is the left edge of the grid.
 *
 * @internal
 */
export function pinSide(pinning: ColumnPinningState, id: string | number): PinSide | undefined {
	const key = String(id)

	if (pinning.start?.includes(key)) return 'left'

	if (pinning.end?.includes(key)) return 'right'

	return undefined
}

/**
 * The chrome of one frozen column that does not move with a width. It holds
 * the edge that the column is frozen to, and its slot in the section of that
 * edge. It also holds whether the column sits at the scroll-facing boundary of
 * the frozen group. The boundary is the innermost column, which alone draws the
 * edge rule and the separating shadow.
 *
 * @internal
 */
export type FrozenCell = {
	side: PinSide
	/** The place of the column in its section, counted from the frozen edge. It names the CSS variable that holds the sticky offset (see {@link pinOffsetVar}). */
	slot: number
	/** Whether this is the group's innermost column — the one at the scroll-facing boundary. */
	boundary: boolean
}

/**
 * One frozen column's resolved chrome: the {@link FrozenCell} and its sticky
 * offset (px) from its edge.
 *
 * @internal
 */
export type FrozenColumn = FrozenCell & {
	/** Distance (px) from the frozen edge: the summed width of the frozen columns between this one and that edge. */
	offset: number
}

/**
 * The frozen layout as a value: each frozen column's {@link FrozenColumn}, keyed
 * by stringified column id. A column the map omits scrolls.
 *
 * @remarks The pinned chrome rides `memo` boundaries, where rows, data cells,
 * and header cells all hold on their props. The grid therefore splits the
 * layout in two. The {@link FrozenCell} facts reach the cells as a value that
 * changes when they change (see {@link sameFrozenShape}). The offsets reach
 * them as CSS variables on the `<table>` (see {@link frozenOffsetVars}). A
 * drag on a frozen column therefore moves the sticky offsets without a render
 * of the rows.
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
			slot: index,
			offset: measured?.left.get(id) ?? summedWidth(left.slice(0, index), widths),
			boundary: index === left.length - 1,
		})
	})

	right.forEach((id, index) => {
		layout.set(id, {
			side: 'right',
			slot: right.length - 1 - index,
			offset: measured?.right.get(id) ?? summedWidth(right.slice(index + 1), widths),
			boundary: index === 0,
		})
	})

	return layout
}

/**
 * Whether two layouts freeze the same columns to the same edges and slots,
 * with the boundary on the same column. The offsets do not count, because
 * they reach the cells through CSS variables. A drag on a frozen column
 * therefore keeps the previous reference. The header and the rows do not
 * render again for the same chrome.
 *
 * @internal
 */
export function sameFrozenShape(
	a: ReadonlyMap<string, FrozenCell>,
	b: ReadonlyMap<string, FrozenCell>,
): boolean {
	if (a === b) return true

	if (a.size !== b.size) return false

	for (const [id, entry] of a) {
		const other = b.get(id)

		if (
			!other ||
			other.side !== entry.side ||
			other.slot !== entry.slot ||
			other.boundary !== entry.boundary
		) {
			return false
		}
	}

	return true
}

/** The CSS custom-property name that holds the sticky offset of a frozen slot. @internal */
export function pinOffsetVar(side: PinSide, slot: number): string {
	return `--grid-pin-${side === 'left' ? 'l' : 'r'}-${slot}`
}

/**
 * The sticky offsets of a layout as CSS variables, one for each frozen slot.
 * The grid sets them on the `<table>`, and each frozen cell reads its own (see
 * `pinnedOffsetStyle`).
 *
 * @internal
 */
export function frozenOffsetVars(layout: FrozenLayout): Record<string, string> {
	const vars: Record<string, string> = {}

	for (const entry of layout.values())
		vars[pinOffsetVar(entry.side, entry.slot)] = `${entry.offset}px`

	return vars
}
