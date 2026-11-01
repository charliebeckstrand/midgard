'use client'
import { type Dispatch, type SetStateAction, useCallback, useMemo } from 'react'
import { useLocale } from '../../providers/locale'
import type { GridSortState } from './context'
import { columnAccessor } from './engine/grid-column/accessor'
import { groupMembers, orderGroups } from './engine/grid-group/client'
import {
	ALL_GROUPS_OPEN,
	expandGroups,
	type GridGroup,
	type GroupExpansion,
	toggleGroupExpanded,
} from './engine/grid-group/tree'
import type { ClientView } from './engine/grid-table/client-view'
import type { GridColumn } from './types'

/**
 * The groups of a client-grouped grid as values, and the action that opens or
 * closes one.
 *
 * @remarks
 * The grid collects the groups from its client view (see {@link groupMembers}
 * and {@link orderGroups}), and opens them. The groups build once for each new
 * view. A toggle then only swaps the value of the group it toggles (see
 * {@link expandGroups}).
 *
 * @internal
 */
export function useGroupTree<T>(args: {
	rows: readonly T[]
	columns: GridColumn<T>[]
	/** The client view, or `null` when it applies no transform. */
	clientView: ClientView<T> | null
	/** The sort of the grid, to order the groups. */
	sort: GridSortState[] | undefined
	/** The grouped column, or `null` when ungrouped. */
	grouping: string | number | null
	/** The expansion state; absent opens every group. */
	expanded: GroupExpansion | undefined
	onExpandedChange: Dispatch<SetStateAction<GroupExpansion>> | undefined
	getKey: (row: T, index: number) => string | number
}): {
	groups: GridGroup<T>[] | null
	closed: GridGroup<T>[] | null
	toggleGroup: (id: string) => void
} {
	const { rows, columns, clientView, sort, grouping, onExpandedChange, getKey } = args

	const columnId = grouping == null ? null : String(grouping)

	const expanded = args.expanded ?? ALL_GROUPS_OPEN

	// The value accessor of the grouped column, or `null` when no column of the
	// grid is grouped. A grouping by no column of the grid has no groups.
	const read = useMemo(() => {
		if (columnId == null) return null

		const column = columns.find((col) => String(col.id) === columnId)

		return column ? columnAccessor(column) : null
	}, [columnId, columns])

	const kept = clientView?.kept ?? null

	// The groups collate in the locale of the nearest `LocaleProvider`, as the
	// flat sort does.
	const { locale } = useLocale()

	// The members of the groups depend on the rows and the filters, not on the
	// sort, so a sort change orders the groups again and collects nothing.
	const members = useMemo(() => (read ? groupMembers(rows, kept, read) : null), [read, rows, kept])

	const closed = useMemo(() => {
		if (columnId == null) return null

		if (!read || !members) return []

		const fields = clientView?.fields ?? null

		const groupSort =
			fields && sort
				? { fields, grouped: sort.map((entry) => String(entry.column) === columnId) }
				: null

		return orderGroups({
			rows,
			members,
			order: clientView?.order ?? null,
			sort: groupSort,
			columnId,
			read,
			getKey,
			locale,
		})
	}, [columnId, read, members, clientView, sort, rows, getKey, locale])

	const groups = useMemo(() => (closed ? expandGroups(closed, expanded) : null), [closed, expanded])

	const toggleGroup = useCallback(
		(id: string) => onExpandedChange?.((prev) => toggleGroupExpanded(prev, id)),
		[onExpandedChange],
	)

	return { groups, closed, toggleGroup }
}
