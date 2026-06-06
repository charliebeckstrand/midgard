'use client'

import type { ReactNode } from 'react'
// PortalContext is defined in the primitive, not locally, on purpose: the
// `overlay` and `floating-surface` primitives consume `usePortalContainer`, so
// the context must live at the lowest layer that needs it. A local context
// here would force a primitive to import from the providers layer. This
// provider is a thin friendly wrapper.
import { type PortalContainer, PortalContext } from '../../primitives/portal'

type PortalProviderProps = {
	/**
	 * DOM node every library portal — dialogs, drawers, sheets, tooltips,
	 * popovers, menus, dropdown panels, and toasts — teleports into. Set this to
	 * scope the library to a shadow root, an iframe body, or a dedicated portal
	 * root, e.g. so portalled surfaces inherit a theme class or join a specific
	 * stacking context.
	 *
	 * A per-call `container` prop on an individual overlay still wins; outside a
	 * provider, each portal falls back to `document.body`.
	 */
	container: PortalContainer
	children: ReactNode
}

/**
 * Registers a default portal container at the app root so every overlay and
 * floating surface teleports into it instead of `document.body`. Outside a
 * provider, each portal falls back to its own default.
 */
export function PortalProvider({ container, children }: PortalProviderProps) {
	return <PortalContext value={container}>{children}</PortalContext>
}
