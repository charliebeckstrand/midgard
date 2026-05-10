'use client'

import { createContext } from '../core'

export interface OffcanvasContextValue {
	close: () => void
}

/**
 * Returns the offcanvas close handle when rendered inside an `<OffcanvasProvider>`,
 * or `null` outside one. Distinct from the state hook in `ui/hooks/use-offcanvas`,
 * which manages an offcanvas's open/close state.
 */
export const [OffcanvasProvider, useOffcanvasClose] = createContext<OffcanvasContextValue | null>(
	'Offcanvas',
	{ default: null },
)
