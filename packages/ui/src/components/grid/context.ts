'use client'

import { type Provider, createContext as reactCreateContext, useContext } from 'react'
import type { Responsive } from './variants'

export type GridContextValue = {
	columns: Responsive<number> | undefined
	gap: Responsive<number> | undefined
}

const GridContext = reactCreateContext<GridContextValue | null>(null)

export const GridProvider = GridContext.Provider as unknown as Provider<GridContextValue>

/** Returns the grid context, or null outside a Grid. */
export function useGrid(): GridContextValue | null {
	return useContext(GridContext)
}
