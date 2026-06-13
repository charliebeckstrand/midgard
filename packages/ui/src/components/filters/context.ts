'use client'

import { createContext } from '../../core'

/** Shared state a `Filters` bar exposes to its fields: the current value record, a per-field setter, a clear action, and the count of active (non-empty) fields. */
export type FiltersContextValue = {
	value: Record<string, unknown>
	setValue: (name: string, fieldValue: unknown) => void
	clear: () => void
	activeCount: number
}

/**
 * Reads the enclosing {@link Filters} context.
 *
 * @returns The bar's {@link FiltersContextValue}.
 * @throws If called outside a `Filters`.
 */
export const [FiltersContext, useFilters] = createContext<FiltersContextValue>('Filters')
