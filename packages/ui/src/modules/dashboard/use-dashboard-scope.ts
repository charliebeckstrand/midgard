'use client'

import { useMemo } from 'react'
import type { QueryGroup } from '../query/engine/types'
import { useDashboardActions, useDashboardTileId } from './context'
import {
	clearSelection,
	type DashboardSelection,
	type DashboardSelectOptions,
	isScopeActive,
	scopeQuery,
	selectedValues,
	selectValue,
} from './engine/dashboard-scope'
import { useDashboardStore } from './use-dashboard-store'

/** What {@link useDashboardScope} returns. */
export type DashboardScope = {
	/** The filter that the app owns. */
	filter: QueryGroup | undefined
	/** Each cross-filter selection on the board. */
	selections: readonly DashboardSelection[]
	/**
	 * The query that this reader sees: the filter, and the selections of the other
	 * tiles. Show it with `QuerySummary`, or apply it with `evaluateQuery`.
	 */
	query: QueryGroup
	/** Whether the query holds a condition. */
	active: boolean
	/** Replaces the filter. */
	setFilter: (filter: QueryGroup) => void
	/** The values that this reader selected in `field`. */
	selected: (field: string) => readonly string[]
	/**
	 * Selects `value` in `field`, as this reader. Without `additive`, the value
	 * replaces the selection, and a second select of the only value clears it.
	 */
	select: (field: string, value: unknown, options?: DashboardSelectOptions) => void
	/** Clears the selection of this reader in `field`, or in each field. */
	clear: (field?: string) => void
}

/**
 * Reads and writes the filter scope of the nearest `Dashboard`.
 *
 * Inside a `DashboardTile`, the reader is that tile. A selection records the
 * tile, and `query` leaves out the tile's own selections. A chart therefore does
 * not filter itself down to the bar that the user clicked. Outside a tile, the reader
 * is the board: its selections apply to each tile, and it sees each selection.
 *
 * @example
 * ```tsx
 * const scope = useDashboardScope()
 *
 * <BarChart onCategoryClick={(region) => scope.select('region', region)} … />
 * ```
 */
export function useDashboardScope(): DashboardScope {
	const tile = useDashboardTileId()

	const { setFilter, updateSelections } = useDashboardActions()

	const filter = useDashboardStore((_, state) => state.filter)

	const selections = useDashboardStore((_, state) => state.selections)

	return useMemo<DashboardScope>(() => {
		const source = tile ?? ''

		const query = scopeQuery(filter, selections, tile)

		return {
			filter,
			selections,
			query,
			active: isScopeActive(query),
			setFilter,
			selected: (field) => selectedValues(selections, source, field),
			select: (field, value, options) =>
				updateSelections((current) => selectValue(current, source, field, value, options)),
			clear: (field) => updateSelections((current) => clearSelection(current, source, field)),
		}
	}, [tile, filter, selections, setFilter, updateSelections])
}
