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
 *
 * @remarks The value has the same shape as `PanelCloseContext`, and the mobile
 * sidebar provides both around the same content. Keep them separate. The
 * desktop and floating-sheet paths of the sidebar read `null` here, and that
 * tells them that no offcanvas surrounds them.
 */
export const [OffcanvasContext] = createContext<OffcanvasContextValue | null>('Offcanvas', {
	default: null,
})
