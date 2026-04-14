'use client'

import { createContext } from '../../core'

export type FiltersContextValue = {
	value: Record<string, unknown>
	setValue: (name: string, fieldValue: unknown) => void
	clear: () => void
	activeCount: number
}

export const [FiltersProvider, useFilters] = createContext<FiltersContextValue>('Filters')
