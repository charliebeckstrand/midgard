'use client'

import { createContext } from '../../core'

/**
 * A DOM node to teleport portaled UI into, or `null` to defer to each
 * portal's own fallback (`document.body` / floating-ui's default root).
 */
export type PortalContainer = HTMLElement | null

/**
 * Portal container context: the default node library portals (overlays,
 * floating surfaces, dropdown panels, toasts) render into. The user-facing
 * `<UIProvider>` (which registers it) lives in `providers/ui`; primitives and
 * components consume `usePortalContainer` here without depending on it.
 *
 * @defaultValue `null` outside any provider, leaving each portal to fall back to
 * its own default
 */
export const [PortalContext, usePortalContext] = createContext<PortalContainer>('Portal', {
	default: null,
})

/**
 * The id of the nearest {@link Portal}, or `null` outside each portal.
 *
 * @remarks
 * React context crosses a portal, but a surface ends at one. A dialog that a
 * button in an alert opens is not part of the alert. A context that a surface
 * keeps to itself records this id where the surface provides it. A consumer in
 * another portal reads another id, and ignores the context.
 *
 * @internal
 */
export const [PortalScopeContext, usePortalScope] = createContext<string | null>('PortalScope', {
	default: null,
})

/**
 * Resolves the effective portal container for a single call site. An explicit
 * per-call `container` wins, then the ambient `<UIProvider>` value, then
 * `null` (the caller's own fallback).
 */
export function usePortalContainer(container?: PortalContainer): PortalContainer {
	const ambient = usePortalContext()

	return container ?? ambient
}
