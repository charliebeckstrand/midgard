import type { Row } from '@tanstack/react-table'
import type { GridColumn } from '../../types'
import { hasAggregation } from '../grid-aggregate'

/**
 * The phase of a leaf, a total, or a detail panel in a window. An open row is
 * in view as usual. A closing row stays as an item until its reveal lands.
 *
 * @internal
 */
export type GridItemPhase = 'open' | 'closing'

/**
 * The motion of one row, as a windowed body tracks it.
 *
 * - A closing row stays as an item until its reveal lands. `size` is the
 *   height it had in view, which is its first height guess under its closing key.
 * - An entering row mounts closed and opens over the transition.
 *
 * @internal
 */
export type GridRowMotion = { phase: 'closing'; size: number } | { phase: 'entering' }

/**
 * The part of an item that each windowed body shares. `key` is the virtual
 * key, which caches the measured height. `reactKey` stays the open key while a
 * row closes, so React keeps its node and its transition. A closing row takes
 * a `closing:` key of its own, so its shrinking height does not replace the
 * open height. `size` is the first height guess of a closing row. `position`
 * is the 0-based place among the rows that assistive tech sees, and it is `-1`
 * for a closing row.
 *
 * @internal
 */
type ItemBase = {
	key: string
	reactKey: string
	position: number
	phase: GridItemPhase
	size?: number
}

/**
 * One row of a windowed grouped body. Each kind has a prefixed key, because a
 * consumer key can look like a group id.
 *
 * - A group header is `group:<groupRow.id>`.
 * - An open leaf is `leaf:<leaf.id>`, and a closing leaf is `closing:<leaf.id>`.
 * - An open group total is `total:<groupRow.id>`, and a closing one is
 *   `closing-total:<groupRow.id>`.
 *
 * @internal
 */
export type GridGroupedWindowItem<T> = ItemBase &
	(
		| { kind: 'group'; group: Row<T> }
		| { kind: 'leaf'; group: Row<T>; leaf: Row<T> }
		| { kind: 'total'; group: Row<T> }
	)

/**
 * One row of a windowed master-detail body. A data row is `row:<rowKey>`. An
 * open detail panel is `detail:<rowKey>`, and a closing one is
 * `closing:<rowKey>`. `dataIndex` is the row's index in the source rows.
 *
 * @internal
 */
export type GridDetailWindowItem = ItemBase & { kind: 'row' | 'detail'; dataIndex: number }

/** The open key of a leaf, which is also its React key. @internal */
export function leafItemKey(leafId: string): string {
	return `leaf:${leafId}`
}

/** The open key of a group total, which is also its React key. @internal */
export function totalItemKey(groupId: string): string {
	return `total:${groupId}`
}

/** The size of a closing row in `motions`, or `undefined` when the row is not closing. @internal */
function closingSize<K>(motions: ReadonlyMap<K, GridRowMotion>, key: K): number | undefined {
	const motion = motions.get(key)

	return motion?.phase === 'closing' ? motion.size : undefined
}

/**
 * Builds the item list of a windowed grouped body. An expanded group gives its
 * header, its leaves, and its total. A collapsed group gives its header, plus
 * the rows that `motions` marks as closing. Those are the rows that were in
 * view when the group collapsed, and they stay until their reveal lands.
 *
 * @param groups - The group rows, in display order.
 * @param args.totalled - Whether each group shows a total row.
 * @param args.motions - The motion of each row, by open key.
 * @internal
 */
export function groupedWindowItems<T>(
	groups: Row<T>[],
	args: { totalled: boolean; motions: ReadonlyMap<string, GridRowMotion> },
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
			phase: 'open',
			group,
		})

		const open = group.getIsExpanded()

		for (const leaf of group.subRows) {
			pushRow(items, cursor, open, args.motions, {
				kind: 'leaf',
				reactKey: leafItemKey(leaf.id),
				closingKey: `closing:${leaf.id}`,
				group,
				leaf,
			})
		}

		if (args.totalled) {
			pushRow(items, cursor, open, args.motions, {
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
 * Pushes one leaf or total of a group. The row of an open group takes the
 * next position. The closing row of a collapsed group takes its closing key,
 * its size, and no position. Any other row of a collapsed group is not an item.
 *
 * @internal
 */
function pushRow<T>(
	items: GridGroupedWindowItem<T>[],
	cursor: { position: number },
	open: boolean,
	motions: ReadonlyMap<string, GridRowMotion>,
	row:
		| { kind: 'leaf'; reactKey: string; closingKey: string; group: Row<T>; leaf: Row<T> }
		| { kind: 'total'; reactKey: string; closingKey: string; group: Row<T> },
): void {
	const { closingKey, ...rest } = row

	if (open) {
		items.push({ ...rest, key: row.reactKey, position: cursor.position++, phase: 'open' })

		return
	}

	const size = closingSize(motions, row.reactKey)

	if (size !== undefined) {
		items.push({ ...rest, key: closingKey, position: -1, phase: 'closing', size })
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
 * an item, except while `motions` marks it as closing.
 *
 * @param args.motions - The motion of each detail panel, by row key.
 * @internal
 */
export function detailWindowItems<T>(args: {
	rows: T[]
	rowKeys: (string | number)[]
	expansion: DetailWiring<T>
	motions: ReadonlyMap<string | number, GridRowMotion>
}): GridDetailWindowItem[] {
	const items: GridDetailWindowItem[] = []

	let position = 0

	args.rows.forEach((row, dataIndex) => {
		const rowKey = args.rowKeys[dataIndex] as string | number

		const key = `row:${rowKey}`

		items.push({ kind: 'row', key, reactKey: key, position: position++, phase: 'open', dataIndex })

		const reactKey = `detail:${rowKey}`

		if (detailOpen(row, rowKey, args.expansion)) {
			items.push({
				kind: 'detail',
				key: reactKey,
				reactKey,
				position: position++,
				phase: 'open',
				dataIndex,
			})

			return
		}

		const size = closingSize(args.motions, rowKey)

		if (size === undefined) return

		items.push({
			kind: 'detail',
			key: `closing:${rowKey}`,
			reactKey,
			position: -1,
			phase: 'closing',
			size,
			dataIndex,
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
 * The first height guess of a window item, before it measures. A closing row
 * guesses the height it had in view, so its new key moves no row. Every other
 * row guesses the density row height. The start anchor of the window holds the
 * rows in view still while a guess differs from the real height.
 *
 * @internal
 */
export function windowItemEstimate(
	item: { kind: string; size?: number },
	rowHeight: number,
): number {
	return item.size ?? rowHeight
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
