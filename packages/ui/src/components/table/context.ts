'use client'

import { createContext } from '../../core'

/**
 * Whether a {@link Table} scrolls its own columns. A Grid with a sticky header
 * or a virtualized body scrolls the table in its own container, and sets
 * `false`. The table then takes no scroll, no edge fade, and no tab stop.
 *
 * @internal
 */
export const [TableScrollsContext, useTableScrolls] = createContext<boolean>('TableScrolls', {
	default: true,
})
