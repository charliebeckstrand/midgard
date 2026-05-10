'use client'

import { createContext } from '../core'

export interface OffcanvasContextValue {
	close: () => void
}

/**
 * Provider + raw context for the offcanvas close handle. Children that want to
 * close the surrounding offcanvas (e.g. nav items, close buttons) read it via
 * `use(OffcanvasContext)`. The provider is given by the offcanvas's state owner
 * — typically a layout calling `useOffcanvas()` from `ui/hooks/use-offcanvas`.
 */
export const [OffcanvasProvider, , OffcanvasContext] = createContext<OffcanvasContextValue | null>(
	'Offcanvas',
	{ default: null },
)
