'use client'

import { useEffect, useState } from 'react'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { GRID_STATUS_DEBOUNCE_MS } from './engine/grid-constants'
import { gridMessages } from './engine/grid-messages'

/**
 * The polite live-region message for the grid: `Loading` while loading, then
 * (after a short debounce so a fast filter/search doesn't chatter) a settled
 * row-count summary. Assistive tech hears the load start, its result, and later
 * result-count changes from filtering, search, or paging. A count of one page
 * of a server set whose total the grid does not know says so (`'25 rows on this
 * page'`). While the grid shows its `error` in place of the body, the region
 * is empty: a row count would contradict the error, and the error slot speaks
 * for itself (the default is an error `Alert`). A failed infinite-scroll load
 * says so at once, because the trailing row that shows its error is not a live
 * region.
 *
 * @internal
 */
function useStatusMessage(
	loading: boolean,
	rowCount: number,
	pageScoped: boolean,
	errorShown: boolean,
	failed: boolean,
): string {
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

	if (errorShown) return ''

	if (failed && !loading) return intl.formatMessage(gridMessages.loadFailed)

	if (said === null) return ''

	if (said === 'loading') return intl.formatMessage(intlMessages.loading)

	return intl.formatMessage(pageScoped ? gridMessages.rowsResultOnPage : gridMessages.rowsResult, {
		count: said,
	})
}

/**
 * Visually-hidden polite status backing the grid's `aria-busy`: a stable live
 * region announcing the load start and, on completion, the result count (see
 * {@link useStatusMessage}).
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
export function GridBusyStatus({
	loading,
	rowCount,
	pageScoped,
	errorShown,
	failed,
}: {
	loading: boolean
	rowCount: number
	/** Says that `rowCount` counts one page, because the grid does not know the server total. */
	pageScoped: boolean
	/** Says that the grid shows its `error` in place of the body. */
	errorShown: boolean
	/** Says that an infinite-scroll load failed: the binding holds an `error`. */
	failed: boolean
}) {
	const message = useStatusMessage(loading, rowCount, pageScoped, errorShown, failed)

	return (
		<span role="status" data-slot="grid-busy-status" className="sr-only">
			{message}
		</span>
	)
}
