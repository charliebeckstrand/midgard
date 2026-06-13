'use client'

import { useMemo } from 'react'
import { createContext } from '../../core'

/** Query state a type-ahead root shares with its descendants. */
export type QueryContextValue = {
	/** Live query text, updated on every keystroke. */
	query: string
	/** Deferred copy of `query`; filter heavy lists against this to keep typing responsive. */
	deferredQuery: string
}

/**
 * Query context for type-ahead roots (Combobox, CommandPalette): the root
 * provides {@link QueryContextValue}; descendants read it through {@link useQuery}
 * to filter their items.
 *
 * @remarks
 * `QueryContext` is the provider context; `useQuery` reads it and throws when
 * called outside a query-scoped root.
 */
export const [QueryContext, useQuery] = createContext<QueryContextValue>('Query', {
	error: 'useQuery must be used within a query-scoped root (Combobox, CommandPalette)',
})

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
