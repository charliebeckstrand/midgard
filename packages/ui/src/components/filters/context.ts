'use client'

import { createContext } from '../../core'

/**
 * How a bar answers a width that cannot hold its fields.
 *
 * `stack` drops them into a column on a narrow screen, which is right for a bar
 * over a page: the page scrolls anyway, so the column costs nothing but height.
 * `rail` holds one row at every width and scrolls it sideways instead — for a bar
 * over something the reader has to keep seeing, where a column of fields would
 * take the very thing the bar filters.
 */
export type FiltersLayout = 'stack' | 'rail'

/** Shared state a `Filters` bar exposes to its fields: the current value record, a per-field setter, a clear action, the count of active (non-empty) fields, and the bar's layout. */
export type FiltersContextValue = {
	value: Record<string, unknown>
	setValue: (name: string, fieldValue: unknown) => void
	clear: () => void
	activeCount: number
	/** How the bar lays out, which decides whether a field may be squeezed. */
	layout: FiltersLayout
}

/**
 * Reads the enclosing {@link Filters} context.
 *
 * @returns The bar's {@link FiltersContextValue}.
 * @throws If called outside a `Filters`.
 */
export const [FiltersContext, useFilters] = createContext<FiltersContextValue>('Filters')
