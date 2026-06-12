'use client'

import { useMemo } from 'react'
import { createContext } from '../../core'

export type QueryContextValue = {
	/** Live query text, updated on every keystroke. */
	query: string
	/** Deferred copy of `query`; filter heavy lists against this to keep typing responsive. */
	deferredQuery: string
}

/**
 * Shared query context for type-ahead roots (Combobox, CommandPalette): the
 * root provides the live and deferred query; descendants read it through the
 * consumer hook to filter their items.
 */
export const [QueryContext, useQuery] = createContext<QueryContextValue>('Query', {
	error: 'useQuery must be used within a query-scoped root (Combobox, CommandPalette)',
})

/** Returns a memoized `QueryContext` value from the root's live and deferred query. */
export function useQueryValue(query: string, deferredQuery: string): QueryContextValue {
	return useMemo(() => ({ query, deferredQuery }), [query, deferredQuery])
}
