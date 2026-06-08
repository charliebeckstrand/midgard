'use client'

import { type ReactNode, useMemo } from 'react'
// LinkContext / PortalContext are defined in the primitives layer, not locally:
// the `polymorphic` primitive consumes `useLink` and the `overlay` /
// `floating-surface` primitives consume `usePortalContainer`, keeping each
// context at the lowest layer that needs it. This provider is a thin
// friendly wrapper that fans out to both.
import { type LinkComponent, LinkContext, type LinkContextValue } from '../../primitives/link'
import { type PortalContainer, PortalContext } from '../../primitives/portal'

type UIProviderProps = {
	/**
	 * Framework-specific link component (e.g. `next/link`'s default export) the
	 * library renders whenever it emits a link — every `<Link>` and every
	 * primitive that emits one routes through it. Omit to keep the plain `<a>`
	 * fallback.
	 */
	link?: LinkComponent
	/**
	 * DOM node every library portal — dialogs, drawers, sheets, tooltips,
	 * popovers, menus, dropdown panels, and toasts — teleports into. Set this to
	 * scope portals to a shadow root, an iframe body, or a dedicated portal root.
	 * A per-call `container` prop still wins; omit to leave each portal its own
	 * `document.body` fallback.
	 */
	portalContainer?: PortalContainer
	children: ReactNode
}

/**
 * Single app-root integration point for the library's framework bindings.
 * Registers the link component and default portal container so every component
 * and primitive that needs them resolves through one provider instead of a
 * separate wrapper each.
 *
 * Each binding is independent and optional: a binding is broadcast only when
 * its prop is provided, so a nested `<UIProvider>` can override one (e.g.
 * scope `portalContainer` to a dialog subtree) without disturbing an outer
 * provider's others.
 */
export function UIProvider({ link, portalContainer, children }: UIProviderProps) {
	const linkValue = useMemo<LinkContextValue>(() => ({ component: link ?? 'a' }), [link])

	const withLink =
		link !== undefined ? <LinkContext value={linkValue}>{children}</LinkContext> : children

	return portalContainer != null ? (
		<PortalContext value={portalContainer}>{withLink}</PortalContext>
	) : (
		withLink
	)
}
