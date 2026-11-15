'use client'

import { createContext } from '../../core/create-context'

type OffcanvasContextValue = {
	close: () => void
}

/**
 * Context for the offcanvas close handle. Children that want to close the
 * surrounding offcanvas (e.g. nav items, close buttons) read it via
 * `use(OffcanvasContext)`. The offcanvas's state owner provides it, e.g. a
 * layout calling `useOffcanvas()` from `ui/hooks/use-offcanvas`.
 *
 * @remarks The mobile sidebar opens in a Drawer, so its content is also inside
 * a panel root, and a close part of the panel closes it too. Keep this context
 * separate. The desktop and floating-sheet paths of the sidebar read `null`
 * here, and that tells them that no offcanvas surrounds them.
 */
export const [OffcanvasContext] = createContext<OffcanvasContextValue | null>('Offcanvas', {
	default: null,
})
