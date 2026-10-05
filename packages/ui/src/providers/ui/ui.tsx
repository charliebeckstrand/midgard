'use client'

import { type ReactNode, useMemo } from 'react'
// LinkContext / PortalContext live in the primitives layer: the `polymorphic`
// primitive consumes `useLink`; the `overlay` / `floating-surface` primitives
// consume `usePortalContainer`. This provider fans out to both.
import {
	type LinkComponent,
	LinkContext,
	type LinkContextValue,
	useLink,
} from '../../primitives/link'
import { type PortalContainer, PortalContext, usePortalContext } from '../../primitives/portal'

/** Props for {@link UIProvider}: the optional framework `link` component and default `portalContainer`, plus `children`. */
export type UIProviderProps = {
	/**
	 * Framework-specific link component (e.g. `next/link`'s default export);
	 * every `<Link>` and every link-emitting primitive routes through it. Omit
	 * it to keep the binding of the outer provider, or the plain `<a>` fallback
	 * outside each provider. Pass `'a'` to restore the fallback in a nested
	 * provider.
	 */
	link?: LinkComponent
	/**
	 * DOM node every library portal (dialogs, drawers, sheets, tooltips,
	 * popovers, menus, dropdown panels, toasts) teleports into. Set this to
	 * scope portals to a shadow root, an iframe body, or a dedicated portal root.
	 * A per-call `container` prop still wins. Omit it to keep the container of
	 * the outer provider, or each portal's own `document.body` fallback outside
	 * each provider. A nested provider cannot restore that fallback, so pass
	 * `document.body` to portal into the body under an outer container.
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
	const outerLink = useLink()

	const outerPortal = usePortalContext()

	const linkValue = useMemo<LinkContextValue>(
		() => (link === undefined ? outerLink : { component: link }),
		[link, outerLink],
	)

	// Both providers render each time, and an omitted binding passes the outer
	// value through. A provider that comes and goes with its prop changes the
	// element type at the root, and React then mounts the full subtree again.
	return (
		<PortalContext value={portalContainer ?? outerPortal}>
			<LinkContext value={linkValue}>{children}</LinkContext>
		</PortalContext>
	)
}
