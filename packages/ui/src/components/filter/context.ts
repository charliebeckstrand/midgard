'use client'

import { createContext } from '../../core'

export type FilterContextValue = {
	value: Record<string, unknown>
	setValue: (name: string, fieldValue: unknown) => void
	clear: () => void
	activeCount: number
}

export const [FilterProvider, useFilter] = createContext<FilterContextValue>('Filter')
