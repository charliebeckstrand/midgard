'use client'

import { createContext } from '../../core'
import type { Responsive } from './variants'

type GridContextValue = {
	columns: Responsive<number> | undefined
}

/** Returns the grid context, or null outside a Grid. */
export const [GridContext, useGrid] = createContext<GridContextValue | null>('Grid', {
	default: null,
})
