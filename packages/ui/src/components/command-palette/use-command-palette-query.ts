'use client'

import { useDeferredQuery, useQuery } from '../../primitives/query'

/**
 * Live and deferred query of the enclosing `CommandPalette`. Filter items
 * against `deferredQuery` to keep typing responsive; `query` tracks every
 * keystroke.
 *
 * @see {@link useCommandPaletteDeferredQuery} for a consumer that reads only
 *   `deferredQuery`.
 */
export function useCommandPaletteQuery() {
	return useQuery()
}

/**
 * Deferred query of the enclosing `CommandPalette`. Filter the items against it
 * to keep typing responsive.
 *
 * @returns The same text as `deferredQuery` of {@link useCommandPaletteQuery}.
 * @remarks A consumer of {@link useCommandPaletteQuery} renders for each
 *   keystroke and again when the deferred query follows. A consumer of this hook
 *   renders only when the deferred query changes.
 */
export function useCommandPaletteDeferredQuery() {
	return useDeferredQuery()
}
