import type { GridGroup } from './engine/grid-group/tree'
import { detailItemKey, eachGroupRow, groupItemKey, rowItemKey } from './engine/grid-items/items'
import { useGridCursorOrder } from './use-grid-cursor-order'

/**
 * One row of the cursor's order in a body that renders more than data rows. A
 * `data` row is a row of the grid's data: a leaf of a group, or a row of a
 * master-detail grid. The cursor visits each of its data columns. The other
 * kinds are one stop each. The cursor keeps its column while it sits on one.
 * A step past a group header thus lands in the same column again.
 *
 * The keys are the item keys of the windowed bodies. A windowed body thus
 * finds the row that the cursor names without an index map of its own.
 *
 * @internal
 */
export type GridCursorRow =
	| { key: string; kind: 'data'; row: unknown; parent?: string }
	| { key: string; kind: 'group'; expanded: boolean; toggle: () => void }
	| { key: string; kind: 'total'; parent: string }
	| { key: string; kind: 'detail'; parent: string }

/**
 * The cursor's order of a client-grouped body: each group header, then its
 * leaves and its total when the group is open. A closed group contributes its
 * header only. The groups come in the order the body renders them.
 *
 * @param toggle - Opens or closes a group, by its id.
 * @internal
 */
export function groupedCursorRows<T>(
	groups: GridGroup<T>[],
	totaled: boolean,
	toggle: (id: string) => void,
): GridCursorRow[] {
	const rows: GridCursorRow[] = []

	for (const group of groups) {
		const key = groupItemKey(group.id)

		const { expanded } = group

		rows.push({ key, kind: 'group', expanded, toggle: () => toggle(group.id) })

		if (!expanded) continue

		eachGroupRow(group, totaled, (rowKey, leaf) => {
			rows.push(
				leaf
					? { key: rowKey, kind: 'data', row: leaf.row, parent: key }
					: { key: rowKey, kind: 'total', parent: key },
			)
		})
	}

	return rows
}

/**
 * The cursor's order of a master-detail body: each data row, then its detail
 * panel when the panel is open.
 *
 * @internal
 */
export function detailCursorRows<T>(
	rows: readonly T[],
	rowKeys: (string | number)[],
	open: (row: T, rowKey: string | number) => boolean,
): GridCursorRow[] {
	const order: GridCursorRow[] = []

	rows.forEach((row, index) => {
		const rowKey = rowKeys[index] as string | number

		const key = rowItemKey(rowKey)

		order.push({ key, kind: 'data', row })

		if (open(row, rowKey)) order.push({ key: detailItemKey(rowKey), kind: 'detail', parent: key })
	})

	return order
}

/**
 * Gives an order to the cursor from a body that renders no hook of its own.
 * It renders nothing (see {@link useGridCursorOrder}). @internal
 */
export function GridCursorOrder({ order }: { order: readonly GridCursorRow[] }): null {
	useGridCursorOrder(order)

	return null
}
