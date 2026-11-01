'use client'
import { useMemo } from 'react'
import { type GridGroup, type GridLeaf, toRowLeaf } from './engine/grid-group/tree'
import { materializeSort } from './engine/grid-sort/utilities'
import { buildLeaves, type ClientView } from './engine/grid-table/client-view'

/**
 * Derives the flat row views the body reads: the manual display list, and the
 * flat `renderRows`/`rowKeys` backing selection identity and the data count.
 * Each view is a memo over values that change only with the rows or a
 * transform. It therefore keeps its identity across an unrelated re-render,
 * such as a resize-drag frame or a selection toggle.
 *
 * Each key is taken at the row's original data index (the index `getRowId`
 * saw), not the rendered position. A client transform reorders rows while
 * their ids stay fixed to the original order. A rendered-index key would
 * therefore diverge from `getRowId`.
 *
 * @internal
 */
export function useGridRowModel<T>(args: {
	rows: readonly T[]
	getKey: (row: T, index: number) => string | number
	/** Manual-grouping group-header predicate; splits the rows into headers and leaves. */
	manualGroupRow: ((row: T) => boolean) | null
	/** The client view, or `null` when it applies no transform. */
	clientView: ClientView<T> | null
	/** The closed groups of a client-grouped grid, or `null`. */
	groups: GridGroup<T>[] | null
}): {
	manualRows: GridLeaf<T>[] | null
	renderRows: readonly T[]
	rowKeys: (string | number)[]
} {
	const { rows, getKey, manualGroupRow, clientView, groups } = args

	// The leaves in display order when the grid collects them: the rows of its
	// groups, or the rows around the headers of a manual grouping.
	const leaves = useMemo<GridLeaf<T>[] | null>(
		() =>
			groups || manualGroupRow
				? buildLeaves({ rows, getKey, groups, manualGroupRow, order: null })
				: null,
		[groups, manualGroupRow, rows, getKey],
	)

	// The manual body segments the consumer's sequence by position, so it takes
	// every row, headers included, in data order.
	const manualRows = useMemo(
		() => (manualGroupRow ? rows.map((row, index) => toRowLeaf(row, index, getKey)) : null),
		[manualGroupRow, rows, getKey],
	)

	// The rows and keys of a flat body under a client view. A body that
	// collects leaves reads them from the leaves, so it builds neither.
	const flat = useMemo(
		() => (leaves || !clientView ? null : materializeSort(rows, clientView.shown, getKey)),
		[leaves, clientView, rows, getKey],
	)

	const renderRows = useMemo(
		() => (leaves ? leaves.map((leaf) => leaf.row) : (flat?.rows ?? rows)),
		[leaves, flat, rows],
	)

	const rowKeys = useMemo<(string | number)[]>(() => {
		if (leaves) return leaves.map((leaf) => leaf.key)

		return flat?.keys ?? rows.map((row, index) => getKey(row, index))
	}, [leaves, flat, rows, getKey])

	return { manualRows, renderRows, rowKeys }
}
