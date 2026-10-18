'use client'

import { useEffect, useState } from 'react'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { GRID_STATUS_DEBOUNCE_MS } from './engine/grid-constants'
import { gridMessages } from './engine/grid-messages'

/**
 * The polite live-region message for the grid: `Loading` while loading, then —
 * after a short debounce so a fast filter/search doesn't chatter — a settled
 * row-count summary. Assistive tech hears the load start, its result, and later
 * result-count changes from filtering, search, or paging.
 *
 * @internal
 */
function useGridStatusMessage(loading: boolean, rowCount: number): string {
	const intl = useIntl()

	// The state holds what the region says, not its text, so the text follows
	// the locale of the reader.
	const [said, setSaid] = useState<'loading' | number | null>(null)

	useEffect(() => {
		if (loading) {
			setSaid('loading')

			return
		}

		const id = setTimeout(() => setSaid(rowCount), GRID_STATUS_DEBOUNCE_MS)

		return () => clearTimeout(id)
	}, [loading, rowCount])

	if (said === null) return ''

	if (said === 'loading') return intl.formatMessage(intlMessages.loading)

	return intl.formatMessage(gridMessages.rowsResult, { count: said })
}

/**
 * Visually-hidden polite status backing the grid's `aria-busy`: a stable live
 * region announcing the load start and, on completion, the result count (see
 * {@link useGridStatusMessage}).
 *
 * Carries `data-slot` because it is the only element that distinguishes "the
 * grid is still fetching" from "the grid has answered". That makes it the
 * settle signal end-to-end tests wait on. `role="status"` alone cannot address
 * it. {@link GridFooter}'s row total is also a `role="status"` and its text is
 * also `'500 rows'` / `'1 row'`, so a role query matches both and trips strict
 * mode. Only this one ever reads `'Loading'`.
 *
 * @internal
 */
export function GridBusyStatus({ loading, rowCount }: { loading: boolean; rowCount: number }) {
	const message = useGridStatusMessage(loading, rowCount)

	return (
		<span role="status" data-slot="grid-busy-status" className="sr-only">
			{message}
		</span>
	)
}
