'use client'

import { useMemo } from 'react'
import { useStableEvent } from '../../hooks/use-stable-event'
import type { ColumnTests } from './engine/grid-filter/filter'
import { facetSource } from './engine/grid-table/filter-view'
import type { GridColumn } from './types'

/**
 * The distinct cell values that the facets of each column read, which the
 * grid collects itself.
 *
 * @remarks
 * The facets of a column read the rows that pass the quick search and every
 * other column filter. The faceted row model of a stock engine reads the same
 * rows. The
 * filter of the column itself does not apply, so its facets still offer the
 * values that it hides. A filter sheet reads the values when it opens. The first read after a change of the rows, the filters, or the query
 * collects them.
 *
 * The function is a stable event. It keeps one identity and reads the newest
 * source, so a search keystroke or a data change renders no filter button
 * again. Do not call it during render.
 *
 * @returns A function that gives the values of a column.
 * @internal
 */
export function useFacetSource<T>(args: {
	rows: readonly T[]
	columns: GridColumn<T>[]
	columnTests: ColumnTests<T>
	/** The query of the quick search, or `''` when the search prunes no rows. */
	query: string
}): (id: string) => Iterable<unknown> {
	const { rows, columns, columnTests, query } = args

	const source = useMemo(
		() => facetSource(rows, columns, columnTests, query),
		[rows, columns, columnTests, query],
	)

	return useStableEvent((id: string) => source(id))
}
