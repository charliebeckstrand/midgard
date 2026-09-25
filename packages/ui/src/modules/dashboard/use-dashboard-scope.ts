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
import { type DashboardView, internList } from './engine/dashboard-store'
import { useDashboardStore } from './use-dashboard-store'

/** What {@link useDashboardScope} returns. */
export type DashboardScope = {
	/** The filter that the app owns. */
	filter: QueryGroup | undefined
	/**
	 * Each cross-filter selection that applies. A selection of a tile that left the
	 * board stops applying, and it stays in the selection value.
	 */
	selections: readonly DashboardSelection[]
	/**
	 * The query that this reader sees: the filter, and the selections of the other
	 * tiles. Show it with `QuerySummary`, or apply it with `evaluateQuery`. An empty
	 * selection value shows with the `isEmpty` label of the field. When the field
	 * does not offer `isEmpty`, it shows as `is Empty`. It keeps its identity
	 * until the filter or a selection of another tile changes.
	 */
	query: QueryGroup
	/**
	 * Whether the query puts a constraint on the rows. A filter of only blank
	 * rules, or of empty groups, leaves it false, because it matches each row.
	 */
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
 * A store selector of the selections that the query of `viewer` applies: each
 * one that another source made. It keeps its last list while the items stay the
 * same. So a select by the viewer keeps the query, and the rows keep their identity.
 *
 * @remarks
 * The store notifies each reader on each drag or resize frame. While the view
 * keeps its list of selections, the selector returns its last result, and it
 * filters nothing.
 */
function appliedTo(viewer: string | null): (view: DashboardView) => readonly DashboardSelection[] {
	let source: readonly DashboardSelection[] | undefined

	let last: readonly DashboardSelection[] | undefined

	return (view) => {
		if (last !== undefined && view.selections === source) return last

		source = view.selections

		last = internList(
			last,
			view.selections.filter((item) => item.source !== viewer),
		)

		return last
	}
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

	const selections = useDashboardStore((view) => view.selections)

	const applied = useDashboardStore(useMemo(() => appliedTo(tile), [tile]))

	const query = useMemo(() => scopeQuery(filter, applied, tile), [filter, applied, tile])

	return useMemo<DashboardScope>(() => {
		const source = tile ?? ''

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
	}, [tile, filter, selections, query, setFilter, updateSelections])
}
