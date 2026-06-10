'use client'

import { createContext } from '../../core'

/**
 * A DOM node to teleport portalled UI into, or `null` to defer to each
 * portal's own fallback (`document.body` / floating-ui's default root).
 */
export type PortalContainer = HTMLElement | null

/**
 * Portal container context: the default node library portals (overlays,
 * floating surfaces, dropdown panels, toasts) render into. The user-facing
 * `<UIProvider>` (which registers it) lives in `providers/ui`; primitives and
 * components consume `usePortalContainer` here without depending on it.
 *
 * Defaults to `null` outside any provider, leaving each portal to fall back to
 * its own default.
 */
export const [PortalContext, usePortalContext] = createContext<PortalContainer>('Portal', {
	default: null,
})

/**
 * Resolves the effective portal container for a single call site: an explicit
 * per-call `container` wins, then the ambient `<UIProvider>` value, then
 * `null` (the caller's own fallback).
 */
export function usePortalContainer(container?: PortalContainer): PortalContainer {
	const ambient = usePortalContext()

	return container ?? ambient
}
