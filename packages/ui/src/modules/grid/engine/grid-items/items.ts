import type { Row } from '@tanstack/react-table'
import type { GridColumn } from '../../types'
import { hasAggregation } from '../grid-aggregate'

/**
 * One row of a windowed grouped body. Each kind has a prefixed key, because a
 * consumer key can look like a group id.
 *
 * - A group header is `group:<groupRow.id>`.
 * - An open leaf is `leaf:<leaf.id>`, and a closing leaf is `closing:<leaf.id>`.
 * - An open group total is `total:<groupRow.id>`, and a closing one is
 *   `closing-total:<groupRow.id>`.
 *
 * `key` is the virtual key, which caches the measured height. `reactKey` stays
 * the open key while a row closes, so React keeps its node and its transition.
 * A closing row has a key of its own, so its shrinking height does not replace
 * the open height. `position` is the 0-based place among the rows that
 * assistive tech sees, and it is `-1` for a closing row.
 *
 * @internal
 */
export type GridGroupedWindowItem<T> =
	| { kind: 'group'; key: string; reactKey: string; position: number; group: Row<T> }
	| {
			kind: 'leaf'
			key: string
			reactKey: string
			position: number
			group: Row<T>
			leaf: Row<T>
			closing: boolean
	  }
	| {
			kind: 'total'
			key: string
			reactKey: string
			position: number
			group: Row<T>
			closing: boolean
	  }

/**
 * One row of a windowed master-detail body. A data row is `row:<rowKey>`, and a
 * detail panel is `detail:<rowKey>`. `dataIndex` is the row's index in the
 * source rows. `position` is as in {@link GridGroupedWindowItem}.
 *
 * @internal
 */
export type GridDetailWindowItem = {
	kind: 'row' | 'detail'
	key: string
	reactKey: string
	position: number
	dataIndex: number
	/** Whether a detail panel is closing. It is always `false` on a data row. */
	closing: boolean
}

/** The open key of a leaf, which is also its React key. @internal */
export function leafItemKey(leafId: string): string {
	return `leaf:${leafId}`
}

/** The open key of a group total, which is also its React key. @internal */
export function totalItemKey(groupId: string): string {
	return `total:${groupId}`
}

/**
 * Builds the item list of a windowed grouped body. An expanded group gives its
 * header, its leaves, and its total. A collapsed group gives its header, plus
 * the rows that `closing` holds for it. Those are the rows that were in the
 * window when the group collapsed, and they stay until their reveal lands.
 *
 * @param groups - The group rows, in display order.
 * @param args.totalled - Whether each group shows a total row.
 * @param args.closing - For each group id, the open keys of its closing rows.
 * @internal
 */
export function groupedWindowItems<T>(
	groups: Row<T>[],
	args: { totalled: boolean; closing: ReadonlyMap<string, ReadonlySet<string>> },
): GridGroupedWindowItem<T>[] {
	const items: GridGroupedWindowItem<T>[] = []

	const cursor = { position: 0 }

	for (const group of groups) {
		const groupKey = `group:${group.id}`

		items.push({
			kind: 'group',
			key: groupKey,
			reactKey: groupKey,
			position: cursor.position++,
			group,
		})

		// An open group shows every row. A collapsed group shows only its closing rows.
		const closing = group.getIsExpanded() ? null : (args.closing.get(group.id) ?? new Set())

		for (const leaf of group.subRows) {
			pushRow(items, cursor, closing, {
				kind: 'leaf',
				reactKey: leafItemKey(leaf.id),
				closingKey: `closing:${leaf.id}`,
				group,
				leaf,
			})
		}

		if (args.totalled) {
			pushRow(items, cursor, closing, {
				kind: 'total',
				reactKey: totalItemKey(group.id),
				closingKey: `closing-total:${group.id}`,
				group,
			})
		}
	}

	return items
}

/**
 * Pushes one leaf or total of a group. `closing` is `null` for an open group,
 * and the open keys of the closing rows for a collapsed one. An open row takes
 * the next position. A closing row takes its closing key and no position. A
 * collapsed row that is not closing is not an item.
 *
 * @internal
 */
function pushRow<T>(
	items: GridGroupedWindowItem<T>[],
	cursor: { position: number },
	closing: ReadonlySet<string> | null,
	row:
		| { kind: 'leaf'; reactKey: string; closingKey: string; group: Row<T>; leaf: Row<T> }
		| { kind: 'total'; reactKey: string; closingKey: string; group: Row<T> },
): void {
	const { closingKey, ...rest } = row

	if (closing === null) {
		items.push({ ...rest, key: row.reactKey, position: cursor.position++, closing: false })
	} else if (closing.has(row.reactKey)) {
		items.push({ ...rest, key: closingKey, position: -1, closing: true })
	}
}

/**
 * Counts the rows that assistive tech sees in a windowed grouped body: each
 * header, plus the leaves and the total of each expanded group. It equals the
 * count of {@link groupedWindowItems} with no closing rows, and it needs no
 * item list.
 *
 * @internal
 */
export function groupedWindowRowCount<T>(groups: Row<T>[], totalled: boolean): number {
	let count = 0

	for (const group of groups) {
		count += 1

		if (group.getIsExpanded()) count += group.subRows.length + Number(totalled)
	}

	return count
}

/** The master-detail wiring that the item builders read. @internal */
type DetailWiring<T> = {
	expanded: ReadonlySet<string | number>
	rowExpandable: (row: T) => boolean
}

/** Whether the detail panel of `row` is open. @internal */
function detailOpen<T>(row: T, key: string | number, expansion: DetailWiring<T>): boolean {
	return expansion.expanded.has(key) && expansion.rowExpandable(row)
}

/**
 * Builds the item list of a windowed master-detail body. Each data row is an
 * item. An open detail panel follows its row as an item. A closed one is not
 * an item, except while `closing` holds its row key.
 *
 * @param args.closing - The row keys of the detail panels that are closing.
 * @internal
 */
export function detailWindowItems<T>(args: {
	rows: T[]
	rowKeys: (string | number)[]
	expansion: DetailWiring<T>
	closing: ReadonlySet<string | number>
}): GridDetailWindowItem[] {
	const items: GridDetailWindowItem[] = []

	let position = 0

	args.rows.forEach((row, dataIndex) => {
		const rowKey = args.rowKeys[dataIndex] as string | number

		const key = `row:${rowKey}`

		items.push({ kind: 'row', key, reactKey: key, position: position++, dataIndex, closing: false })

		const open = detailOpen(row, rowKey, args.expansion)

		if (!open && !args.closing.has(rowKey)) return

		const detailKey = `detail:${rowKey}`

		items.push({
			kind: 'detail',
			key: detailKey,
			reactKey: detailKey,
			position: open ? position++ : -1,
			dataIndex,
			closing: !open,
		})
	})

	return items
}

/**
 * Counts the rows that assistive tech sees in a windowed master-detail body:
 * each data row, plus each open detail panel. It equals the count of
 * {@link detailWindowItems} with no closing panels.
 *
 * @internal
 */
export function detailWindowRowCount<T>(
	rows: T[],
	rowKeys: (string | number)[],
	expansion: DetailWiring<T>,
): number {
	let count = rows.length

	rows.forEach((row, index) => {
		if (detailOpen(row, rowKeys[index] as string | number, expansion)) count += 1
	})

	return count
}

/**
 * The first height guess of a window item, before it measures. A detail panel
 * guesses 0 pixels, and every other row guesses the density row height.
 *
 * @remarks A panel that opens above the viewport is an insert, not a resize.
 * The virtualizer moves the scroll offset for a resize above the viewport, but
 * not for an insert. A guess of 0 therefore keeps the rows in view still, and
 * the resize that follows the first measurement moves the offset.
 *
 * @internal
 */
export function windowItemEstimate(kind: string, rowHeight: number): number {
	return kind === 'detail' ? 0 : rowHeight
}

/**
 * The count of data-body rows that `aria-rowcount` spans. A windowed grouped or
 * master-detail body counts its exposed items: {@link groupedWindowRowCount} or
 * {@link detailWindowRowCount}. Every other body counts its data rows, as
 * before.
 *
 * @internal
 */
export function bodyRowCount<T>(args: {
	virtualize: boolean
	rows: T[]
	rowKeys: (string | number)[]
	/** The client group rows, or `null` outside client grouping. */
	groupedRows: Row<T>[] | null
	/** The `groupTotalRow` flag, which gives each group a total row while a column aggregates. */
	groupTotalRow: boolean | undefined
	/** The visible columns. */
	columns: GridColumn<T>[]
	/** The master-detail wiring, or `null` when the grid is not expandable. */
	expansion: DetailWiring<T> | null | undefined
}): number {
	if (!args.virtualize) return args.rows.length

	if (args.groupedRows) {
		const totalled = args.groupTotalRow === true && hasAggregation(args.columns)

		return groupedWindowRowCount(args.groupedRows, totalled)
	}

	if (args.expansion) return detailWindowRowCount(args.rows, args.rowKeys, args.expansion)

	return args.rows.length
}
