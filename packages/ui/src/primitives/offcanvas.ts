'use client'

import { createContext } from '../core'

export interface OffcanvasContextValue {
	close: () => void
}

export const [OffcanvasProvider, useOffcanvas] = createContext<OffcanvasContextValue | null>(
	'Offcanvas',
	{ default: null },
)
