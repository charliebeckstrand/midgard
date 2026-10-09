import { getOrCompute, toggleItem } from '../../../../utilities'

/**
 * One row of the source data, as a value the grouped bodies render from.
 *
 * @internal
 */
export type GridLeaf<T> = {
	/** The row id: the stringified key. It keys the row's item and its React node. */
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
	/** The id of the group, such as `role:Developer`. It keys the expansion state and the group's items. */
	id: string
	/** The group's value on the grouped column. */
	value: unknown
	/**
	 * The text of the value, which groups the rows: `null` and `'null'` share a
	 * group, and `null` and `undefined` do not. It keys the overlay of the row
	 * manager (see `groupKeyOf`), because the value of a nullish group reads
	 * as `undefined`.
	 */
	key: string
	/** Whether the group is open. */
	expanded: boolean
	/** The group's leaves, in display order. */
	leaves: GridLeaf<T>[]
	/** The leaves' source rows, which the header aggregates and the group total read. */
	rows: readonly T[]
}

/**
 * The {@link GridLeaf} of the row at `index` in the data. Its id is the
 * stringified key, as `getRowId` gives the id of the row.
 *
 * @internal
 */
export function toRowLeaf<T>(
	row: T,
	index: number,
	getKey: (row: T, index: number) => string | number,
): GridLeaf<T> {
	const key = getKey(row, index)

	return { id: String(key), key, row }
}

/**
 * Which groups of a client-grouped grid are open. The state keeps the default
 * and the groups that differ from it, not the open state of each group. A group
 * that the state does not name, such as a group of a new grouping or of new
 * rows, therefore opens as the default says.
 *
 * @internal
 */
export type GroupExpansion = {
	/** Whether a group opens by default. */
	open: boolean
	/** The ids of the groups that differ from the default. */
	toggled: ReadonlySet<string>
}

/** Every group open, with no group toggled. @internal */
export const ALL_GROUPS_OPEN: GroupExpansion = { open: true, toggled: new Set() }

/** Every group closed, with no group toggled. @internal */
export const ALL_GROUPS_CLOSED: GroupExpansion = { open: false, toggled: new Set() }

/**
 * Whether a group is open in the expansion state.
 *
 * @internal
 */
function isGroupExpanded(expansion: GroupExpansion, id: string): boolean {
	return expansion.open !== expansion.toggled.has(id)
}

/** The open value of each closed group, made once. @internal */
const openGroups = new WeakMap<GridGroup<unknown>, GridGroup<unknown>>()

/** The open value of a closed group. The same group always gives the same value. @internal */
function openGroup<T>(group: GridGroup<T>): GridGroup<T> {
	return getOrCompute(openGroups, group, () => ({ ...group, expanded: true })) as GridGroup<T>
}

/**
 * Opens the closed groups of `groupRows` from the expansion state.
 *
 * @remarks Each group has exactly two values, closed and open. A toggle
 * therefore gives a new value to the group it toggles, and every other group
 * keeps its identity. A memoized group row re-renders only for its own
 * toggle.
 *
 * @internal
 */
export function expandGroups<T>(groups: GridGroup<T>[], expansion: GroupExpansion): GridGroup<T>[] {
	return groups.map((group) => (isGroupExpanded(expansion, group.id) ? openGroup(group) : group))
}

/**
 * The expansion state with one group opened or closed.
 *
 * @internal
 */
export function toggleGroupExpanded(expansion: GroupExpansion, id: string): GroupExpansion {
	return { open: expansion.open, toggled: toggleItem(expansion.toggled, id) }
}
