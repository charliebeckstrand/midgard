'use client'

import { useQuery } from '../../primitives/query'

/**
 * Live and deferred query of the enclosing `CommandPalette`. Filter items
 * against `deferredQuery` to keep typing responsive; `query` tracks every
 * keystroke.
 */
export function useCommandPaletteQuery() {
	return useQuery()
}
