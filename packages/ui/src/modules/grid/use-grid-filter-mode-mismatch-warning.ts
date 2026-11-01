'use client'
import { useEffect } from 'react'

/**
 * Warns (dev only) when the global search and the column filters are both
 * configured but their `manual` flags disagree. The grid filters both in one
 * client pass (see {@link useGridClientView}), so {@link resolveFilterMode} runs
 * manual for both. The client-side surface then silently stops filtering.
 * Effect-scoped so it fires once per config change, not every render. Kept out of {@link useGridTable} for its
 * cognitive-complexity budget.
 *
 * @internal
 */
export function useFilterModeMismatchWarning(args: {
	globalConfigured: boolean
	hasColumnFilters: boolean
	globalManual: boolean | undefined
	columnManual: boolean | undefined
}): void {
	const { globalConfigured, hasColumnFilters, globalManual, columnManual } = args

	useEffect(() => {
		if (process.env.NODE_ENV === 'production') return

		if (!globalConfigured || !hasColumnFilters) return

		if (Boolean(globalManual) === Boolean(columnManual)) return

		console.warn(
			"Grid: the global search and column filters share one table-wide filtering mode, but their `manual` flags disagree. The grid runs manual (server) filtering for both, so the client-side surface won't filter locally. Set both `manual` the same.",
		)
	}, [globalConfigured, hasColumnFilters, globalManual, columnManual])
}
