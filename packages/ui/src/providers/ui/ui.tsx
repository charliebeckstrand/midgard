'use client'

import { type ReactNode, useMemo } from 'react'
// LinkContext / PortalContext live in the primitives layer: the `polymorphic`
// primitive consumes `useLink`; the `overlay` / `floating-surface` primitives
// consume `usePortalContainer`. This provider fans out to both.
import { type LinkComponent, LinkContext, type LinkContextValue } from '../../primitives/link'
import { type PortalContainer, PortalContext } from '../../primitives/portal'

type UIProviderProps = {
	/**
	 * Framework-specific link component (e.g. `next/link`'s default export);
	 * every `<Link>` and every link-emitting primitive routes through it. Omit
	 * to keep the plain `<a>` fallback.
	 */
	link?: LinkComponent
	/**
	 * DOM node every library portal (dialogs, drawers, sheets, tooltips,
	 * popovers, menus, dropdown panels, toasts) teleports into. Set this to
	 * scope portals to a shadow root, an iframe body, or a dedicated portal root.
	 * A per-call `container` prop still wins; omit to leave each portal its own
	 * `document.body` fallback.
	 */
	portalContainer?: PortalContainer
	children: ReactNode
}

/**
 * Single app-root integration point for the library's framework bindings.
 * Registers the link component and the default portal container.
 *
 * Each binding is independent and optional: the provider broadcasts a binding
 * only when its prop is provided. A nested `<UIProvider>` overrides one
 * binding (e.g. scopes `portalContainer` to a dialog subtree) without
 * disturbing the outer provider's others.
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
