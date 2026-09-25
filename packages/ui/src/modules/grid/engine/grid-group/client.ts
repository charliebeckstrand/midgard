import { computeSortOrder, type SmartSortField } from '../grid-sort/utilities'
import { type GridGroup, toRowLeaf } from './tree'

/**
 * The sort of a grouped grid: the fields of the sort, and for each field
 * whether it sorts the grouped column.
 *
 * @internal
 */
export type GroupSort<T> = { fields: SmartSortField<T>[]; grouped: boolean[] }

/**
 * Builds the closed {@link GridGroup}s of a client-grouped grid from its rows,
 * off the engine. {@link expandGroups} then opens them.
 *
 * @remarks
 * The groups match those of the grouped and sorted row models of the engine,
 * which the grid read before:
 *
 * - The groups hold the rows that the filters keep. The key of a group is the
 *   text of the grouped value (`` `${value}` ``), so `null` and `'null'` share
 *   a group.
 * - The groups come in the order of their first rows in the data. The id of a
 *   group is `` `${columnId}:${key}` ``, which the expansion state reads.
 * - The value of a group is the grouped value of its first row in the data,
 *   with `null` read as `undefined`.
 * - A sort orders the rows of each group, and orders the groups by their
 *   first rows. A smart field on the grouped column reads the value of that
 *   row. A smart field on another column reads no value, so the groups keep
 *   the order of the data. A custom `sortFn` compares the first rows.
 *
 * `grid-client-grouping.test.ts` holds the parity with the engine.
 *
 * @param args.kept - The indices of the rows that the filters keep, in data
 *   order, or `null` for every row.
 * @param args.order - The indices that the sort keeps, in sorted order, when
 *   the sort has only smart fields. A custom `sortFn` need not be a consistent
 *   order, so its groups sort their own rows, as the engine does.
 * @internal
 */
export function groupRows<T>(args: {
	rows: readonly T[]
	kept: readonly number[] | null
	order: readonly number[] | null
	sort: GroupSort<T> | null
	columnId: string
	read: (row: T) => unknown
	getKey: (row: T, index: number) => string | number
}): GridGroup<T>[] {
	const { rows, kept, sort, columnId, read } = args

	// The indices of each group, in data order, by the key of the group.
	const members = new Map<string, number[]>()

	const visit = (index: number) => {
		const key = `${read(rows[index] as T)}`

		const list = members.get(key)

		if (list) list.push(index)
		else members.set(key, [index])
	}

	if (kept) for (const index of kept) visit(index)
	else for (let index = 0; index < rows.length; index++) visit(index)

	const keys = [...members.keys()]

	const lists = keys.map((key) => members.get(key) as number[])

	const sorted = sort ? sortLeaves(rows, lists, args.order, sort) : lists

	const groupOrder = sort ? sortGroups(rows, lists, sort) : keys.map((_, index) => index)

	return groupOrder.map((position) => {
		const indices = sorted[position] as number[]

		const first = rows[(lists[position] as number[])[0] as number] as T

		const leaves = indices.map((index) => toRowLeaf(rows[index] as T, index, args.getKey))

		return {
			id: `${columnId}:${keys[position]}`,
			value: read(first) ?? undefined,
			expanded: false,
			leaves,
			rows: leaves.map((leaf) => leaf.row),
		}
	})
}

/**
 * The indices of each group in sorted order. With only smart fields, a group
 * takes its rows from `order`, the sorted order of the kept rows. A custom
 * `sortFn` sorts the rows of each group apart.
 *
 * @internal
 */
function sortLeaves<T>(
	rows: readonly T[],
	lists: readonly number[][],
	order: readonly number[] | null,
	sort: GroupSort<T>,
): number[][] {
	if (order && sort.fields.every((field) => field.sortFn === null)) {
		const groupOf = new Int32Array(rows.length).fill(-1)

		lists.forEach((list, group) => {
			for (const index of list) groupOf[index] = group
		})

		const sorted = lists.map((): number[] => [])

		for (const index of order) {
			const group = groupOf[index] as number

			if (group >= 0) (sorted[group] as number[]).push(index)
		}

		return sorted
	}

	return lists.map((list) => {
		const local = computeSortOrder(
			list.map((index) => rows[index] as T),
			sort.fields,
		)

		return local.map((position) => list[position] as number)
	})
}

/**
 * The positions of the groups in sorted order. Each group sorts by its first
 * row in the data. A smart field on another column than the grouped one reads
 * no value, so it ties, and the groups keep the order of the data.
 *
 * @internal
 */
function sortGroups<T>(
	rows: readonly T[],
	lists: readonly number[][],
	sort: GroupSort<T>,
): number[] {
	const firsts = lists.map((list) => rows[list[0] as number] as T)

	const fields = sort.fields.map((field, index) =>
		field.sortFn !== null || sort.grouped[index] ? field : { ...field, accessor: () => undefined },
	)

	return computeSortOrder(firsts, fields)
}
