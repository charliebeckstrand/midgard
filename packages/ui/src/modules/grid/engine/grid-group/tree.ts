import type { ExpandedState, Row } from '@tanstack/react-table'

/**
 * One row of the source data, as a value the grouped bodies render from.
 *
 * @internal
 */
export type GridLeaf<T> = {
	/** The engine's row id: the stringified key. It keys the row's item and its React node. */
	id: string
	/** The row's key: the value `getKey` gives at the row's source index. It backs selection. */
	key: string | number
	/** The source row. */
	row: T
}

/**
 * One group of a client-grouped grid, as a value. The grid builds a new group
 * each time its leaves or its expansion change, so a memoized row can read it
 * during render.
 *
 * @internal
 */
export type GridGroup<T> = {
	/** The engine's id of the group, such as `role:Developer`. It keys the expansion state and the group's items. */
	id: string
	/** The group's value on the grouped column. */
	value: unknown
	/** Whether the group is open. */
	expanded: boolean
	/** The group's leaves, in display order. */
	leaves: GridLeaf<T>[]
	/** The leaves' source rows, which the header aggregates and the group total read. */
	rows: T[]
}

/** The {@link GridLeaf} of an engine row. @internal */
export function toGridLeaf<T>(
	row: Row<T>,
	getKey: (row: T, index: number) => string | number,
): GridLeaf<T> {
	return { id: row.id, key: getKey(row.original, row.index), row: row.original }
}

/**
 * Whether a group is open in the expansion state. `true` opens every group.
 *
 * @internal
 */
export function isGroupExpanded(expanded: ExpandedState, id: string): boolean {
	return expanded === true || Boolean(expanded[id])
}

/**
 * Builds the {@link GridGroup}s from the engine's group rows, in display order,
 * each closed. Each group row carries all of its leaves on `subRows`.
 * {@link expandGroups} then opens them from the expansion state that the grid
 * owns.
 *
 * @param rows - The engine's top-level group rows.
 * @param columnId - The grouped column.
 * @param getKey - The grid's row-key resolver.
 * @internal
 */
export function toGridGroups<T>(
	rows: readonly Row<T>[],
	columnId: string,
	getKey: (row: T, index: number) => string | number,
): GridGroup<T>[] {
	return rows
		.filter((row) => row.getIsGrouped())
		.map((group) => {
			const leaves = group.subRows.map((leaf) => toGridLeaf(leaf, getKey))

			return {
				id: group.id,
				value: group.getGroupingValue(columnId),
				expanded: false,
				leaves,
				rows: leaves.map((leaf) => leaf.row),
			}
		})
}

/** The open value of each closed group, made once. @internal */
const openGroups = new WeakMap<GridGroup<unknown>, GridGroup<unknown>>()

/** The open value of a closed group. The same group always gives the same value. @internal */
function openGroup<T>(group: GridGroup<T>): GridGroup<T> {
	let open = openGroups.get(group) as GridGroup<T> | undefined

	if (!open) {
		open = { ...group, expanded: true }

		openGroups.set(group, open)
	}

	return open
}

/**
 * Opens the closed groups of {@link toGridGroups} from the expansion state.
 *
 * @remarks Each group has exactly two values, closed and open. A toggle
 * therefore gives a new value to the group it toggles, and every other group
 * keeps its identity. A memoized group row re-renders only for its own
 * toggle.
 *
 * @internal
 */
export function expandGroups<T>(groups: GridGroup<T>[], expanded: ExpandedState): GridGroup<T>[] {
	return groups.map((group) => (isGroupExpanded(expanded, group.id) ? openGroup(group) : group))
}

/**
 * The expansion state with one group opened or closed. `true`, which opens
 * every group, first becomes an entry for each group in `ids`.
 *
 * @param ids - The id of every group, so an all-open state can close one.
 * @internal
 */
export function toggleGroupExpanded(
	expanded: ExpandedState,
	id: string,
	ids: readonly string[],
): ExpandedState {
	const open: Record<string, boolean> =
		expanded === true ? Object.fromEntries(ids.map((each) => [each, true])) : expanded

	if (!open[id]) return { ...open, [id]: true }

	const { [id]: _closed, ...rest } = open

	return rest
}
