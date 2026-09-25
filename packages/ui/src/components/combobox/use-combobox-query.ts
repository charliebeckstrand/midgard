'use client'

import { useDeferredQuery, useQuery } from '../../primitives/query'

/**
 * Live and deferred query of the enclosing {@link Combobox}.
 *
 * @returns `{ query, deferredQuery }`: `query` tracks every keystroke;
 *   `deferredQuery` lags for filtering heavy lists to keep typing responsive.
 * @remarks Throws when called outside a query-scoped root (Combobox,
 *   CommandPalette).
 * @see {@link QueryContextValue}
 * @see {@link useComboboxDeferredQuery} for a consumer that reads only
 *   `deferredQuery`.
 */
export function useComboboxQuery() {
	return useQuery()
}

/**
 * Deferred query of the enclosing {@link Combobox}. Filter the options against
 * it to keep typing responsive.
 *
 * @returns The same text as `deferredQuery` of {@link useComboboxQuery}.
 * @remarks A consumer of {@link useComboboxQuery} renders for each keystroke and
 *   again when the deferred query follows. A consumer of this hook renders only
 *   when the deferred query changes. Throws when called outside a query-scoped
 *   root (Combobox, CommandPalette).
 */
export function useComboboxDeferredQuery() {
	return useDeferredQuery()
}
