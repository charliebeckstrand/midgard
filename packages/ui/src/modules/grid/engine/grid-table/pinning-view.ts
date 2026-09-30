import type { ColumnPinningState } from '@tanstack/react-table'
import type { GridColumn } from '../../types'
import { isNewRowAddColumn } from '../grid-new-row-column'
import type { FrozenColumn, FrozenLayout } from '../grid-pin/layout'
import type { FrozenOffsetStore } from '../grid-pin/offsets'
import { frozenSide } from '../grid-pin/overrides'

/**
 * Frozen-column controls: one lookup from a column id to the chrome it draws.
 *
 * @remarks It reads a resolved {@link FrozenLayout} snapshot of the frozen
 * structure: the edge and the boundary role of each column. The pinned chrome
 * rides `memo` boundaries, so a cell that holds on its props sees a structure
 * change only through this object's identity. An offset move keeps the
 * identity. The grid writes the moved offsets to the frozen cells, and
 * {@link GridColumnPinning.offset} gives the committed offset to a cell that
 * renders.
 *
 * @internal
 */
export type GridColumnPinning = {
	/**
	 * The column's frozen chrome — edge, sticky offset, and boundary — or
	 * `undefined` when it scrolls. The offset is the one of the structure
	 * snapshot. Read {@link GridColumnPinning.offset} for the committed offset.
	 */
	column: (id: string | number) => FrozenColumn | undefined
	/** The committed sticky offset (px) of the column, or `undefined` when it scrolls. */
	offset: (id: string | number) => number | undefined
}

/**
 * Derives the engine's `columnPinning` state from each column's effective frozen
 * edge, plus whether any column is frozen at all. That edge is
 * {@link frozenSide}: its `locked` side, else its `pinned` side, `true` being
 * left. The left edge goes in the `start` section of the engine, and the right
 * edge goes in the `end` section.
 *
 * @remarks The selection column always leads the left edge, ahead of every
 * left-frozen data column. The row checkboxes therefore stay anchored to the
 * far left while the grid scrolls sideways. It is held out of the freeze
 * filters (so an explicit flag on it can't double-list its id) and never counts
 * toward `hasPinned`. That gate stays driven by the data columns, so a grid
 * with nothing frozen keeps the selection column inline (no sticky offset or
 * boundary shadow). The freeze only resolves once a data column is pinned or
 * locked.
 *
 * The Add column of the new-row slot (see `withNewRowAddColumn`) is locked,
 * so it turns `hasPinned` on. It does not pull the selection column
 * to the left edge, because nothing else is frozen for it to lead.
 *
 * @internal
 */
export function toColumnPinningState<T>(columns: GridColumn<T>[]): {
	state: ColumnPinningState
	hasPinned: boolean
} {
	const select = columns.filter((col) => col.selectable).map((col) => String(col.id))

	const left = columns
		.filter((col) => !col.selectable && frozenSide(col) === 'left')
		.map((col) => String(col.id))

	const right = columns
		.filter((col) => !col.selectable && frozenSide(col) === 'right')
		.map((col) => String(col.id))

	const leads = left.length > 0 || right.some((id) => !isNewRowAddColumn(id))

	return {
		state: { start: leads ? [...select, ...left] : left, end: right },
		hasPinned: left.length > 0 || right.length > 0,
	}
}

/**
 * Assembles the {@link GridColumnPinning} lookup over a resolved {@link FrozenLayout}.
 *
 * @remarks The Add column of the new-row slot reads as a column that scrolls.
 * Its cells are empty outside the slot, so they draw no sticky surface, rule,
 * or shadow, and the row washes show through them. The layout still holds
 * its offset, so a frozen column of the consumer sticks inside it. The cell
 * of the slot sticks through its own class.
 *
 * The offset comes from `offsets`, the committed layout, while it freezes the
 * column to the same edge. Otherwise it comes from `layout`, which is then the
 * newer of the two.
 *
 * @internal
 */
export function buildColumnPinning(
	layout: FrozenLayout,
	offsets: FrozenOffsetStore,
): GridColumnPinning {
	const column = (id: string | number) =>
		isNewRowAddColumn(id) ? undefined : layout.get(String(id))

	return {
		column,
		offset: (id) => {
			const frozen = column(id)

			if (!frozen) return undefined

			return offsets.get(String(id), frozen.side) ?? frozen.offset
		},
	}
}
