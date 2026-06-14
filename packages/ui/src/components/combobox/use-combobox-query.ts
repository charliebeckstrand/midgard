'use client'

import { useQuery } from '../../primitives/query'

/**
 * Live and deferred query of the enclosing {@link Combobox}.
 *
 * @returns `{ query, deferredQuery }`: `query` tracks every keystroke;
 *   `deferredQuery` lags for filtering heavy lists to keep typing responsive.
 * @remarks Throws when called outside a query-scoped root (Combobox,
 *   CommandPalette).
 * @see {@link QueryContextValue}
 */
export function useComboboxQuery() {
	return useQuery()
}
