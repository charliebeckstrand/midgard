'use client'

import { useEffect, useState } from 'react'
import { GRID_STATUS_DEBOUNCE_MS } from './grid-constants'

/**
 * The polite live-region message for the grid: `Loading` while loading, then —
 * after a short debounce so a fast filter/search doesn't chatter — a settled
 * row-count summary. Assistive tech hears the load start, its result, and later
 * result-count changes from filtering, search, or paging.
 *
 * @internal
 */
function useGridStatusMessage(loading: boolean, rowCount: number): string {
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
