'use client'

import { useEffect, useState } from 'react'
import type { SortState } from './context'
import { GRID_STATUS_DEBOUNCE_MS } from './grid-constants'
import { columnLabel, type GridColumn } from './types'

/**
 * The polite live-region message for the grid: `Loading` while loading, then —
 * after a short debounce so a fast filter/search doesn't chatter — a settled
 * row-count summary. Assistive tech hears the load start, its result, and later
 * result-count changes from filtering, search, or paging.
 *
 * @internal
 */
export function useGridStatusMessage(loading: boolean, rowCount: number): string {
	const [message, setMessage] = useState('')

	useEffect(() => {
		if (loading) {
			setMessage('Loading')

			return
		}

		const id = setTimeout(() => {
			setMessage(rowCount === 1 ? '1 row' : rowCount === 0 ? 'No results' : `${rowCount} rows`)
		}, GRID_STATUS_DEBOUNCE_MS)

		return () => clearTimeout(id)
	}, [loading, rowCount])

	return message
}

/**
 * Visually-hidden polite status backing the grid's `aria-busy`: a stable live
 * region announcing the load start and, on completion, the result count (see
 * {@link useGridStatusMessage}).
 *
 * @internal
 */
export function GridBusyStatus({ loading, rowCount }: { loading: boolean; rowCount: number }) {
	const message = useGridStatusMessage(loading, rowCount)

	return (
		<span role="status" className="sr-only">
			{message}
		</span>
	)
}

/**
 * The polite announcement for the grid's current sort, narrated to assistive
 * tech when it changes (WCAG 4.1.3): `Sorting cleared` when unsorted, else the
 * sorted columns by display label and direction, in priority order (`Sorted by
 * Name ascending, then Age descending`). Resolves each label from the visible
 * columns so multi-column sort priority is spoken, not just shown.
 *
 * @internal
 */
export function describeSort<T>(sort: SortState[], columns: GridColumn<T>[]): string {
	if (sort.length === 0) return 'Sorting cleared'

	const parts = sort.map((entry) => {
		const column = columns.find((candidate) => candidate.id === entry.column)

		const name = column ? columnLabel(column) : String(entry.column)

		return `${name} ${entry.direction === 'asc' ? 'ascending' : 'descending'}`
	})

	return `Sorted by ${parts.join(', then ')}`
}

/**
 * The polite announcement for the row selection, narrated when it changes (WCAG
 * 4.1.3): `All rows selected` — or `All rows on this page selected` when
 * paginated, since the select-all is page-scoped and the label says as much —
 * `Selection cleared`, or the running count (`3 rows selected`). The caller
 * gates announcing on a selection column being present, so a non-selectable grid
 * stays silent.
 *
 * @internal
 */
export function describeSelection(size: number, allSelected: boolean, onPage: boolean): string {
	if (allSelected) return onPage ? 'All rows on this page selected' : 'All rows selected'

	if (size === 0) return 'Selection cleared'

	return `${size} ${size === 1 ? 'row' : 'rows'} selected`
}
