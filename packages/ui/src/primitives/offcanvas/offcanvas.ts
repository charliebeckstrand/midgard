'use client'

import { createContext } from '../../core'

type OffcanvasContextValue = {
	close: () => void
}

/**
 * Context for the offcanvas close handle. Children that want to close the
 * surrounding offcanvas (e.g. nav items, close buttons) read it via
 * `use(OffcanvasContext)`. The offcanvas's state owner provides it, e.g. a
 * layout calling `useOffcanvas()` from `ui/hooks/use-offcanvas`.
 */
export const [OffcanvasContext] = createContext<OffcanvasContextValue | null>('Offcanvas', {
	default: null,
})
