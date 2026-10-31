'use client'

import { useDeferredValue, useMemo } from 'react'
import type { QueryContextValue } from './context'

/**
 * Memoizes a {@link QueryContextValue} for a root to pass to {@link QueryContext}.
 *
 * @param query - Live query text, updated on every keystroke.
 * @param deferredQuery - Deferred copy of `query` for filtering heavy lists.
 * @returns A value referentially stable until either argument changes.
 */
export function useQueryValue(query: string, deferredQuery: string): QueryContextValue {
	return useMemo(() => ({ query, deferredQuery }), [query, deferredQuery])
}

/**
 * The deferred copy of a query, for a filter of a heavy list. An empty query
 * bypasses the deferral. A cleared filter thus shows every item in the same
 * commit, and a reset paints no stale frame of the prior filter.
 *
 * @param query - Live query text, updated on every keystroke.
 * @returns The deferred query, or `''` at once when `query` is empty.
 *
 * @internal
 */
export function useDeferredQueryValue(query: string): string {
	const deferred = useDeferredValue(query)

	return query === '' ? '' : deferred
}
