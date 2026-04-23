'use client'

import { createContext, useContext } from 'react'

export interface OffcanvasContextValue {
	close: () => void
}

export const OffcanvasContext = createContext<OffcanvasContextValue | null>(null)

export const OffcanvasProvider = OffcanvasContext.Provider

export function useOffcanvas(): OffcanvasContextValue | null {
	return useContext(OffcanvasContext)
}
