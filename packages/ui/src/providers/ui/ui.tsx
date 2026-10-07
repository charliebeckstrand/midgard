'use client'

import { type ReactNode, use, useEffect, useMemo } from 'react'
import { ConfirmHost } from '../../components/confirm/use-confirm'
import type { ToastProps, ToastProviderProps } from '../../components/toast'
import { ToastHost } from '../../components/toast/toast-host'
// LinkContext / PortalContext / PathnameContext live in the primitives layer:
// the `polymorphic` primitive consumes `useLink`; the `overlay` /
// `floating-surface` primitives consume `usePortalContainer`; the nav items
// consume `usePathMatch`. This provider fans out to all three.
import { PathnameContext, usePathnameStore } from '../../primitives/current/current-pathname'
import {
	type LinkComponent,
	LinkContext,
	type LinkContextValue,
	useLink,
} from '../../primitives/link'
import { type PortalContainer, PortalContext, usePortalContext } from '../../primitives/portal'
import { prefetchMotionFeatures } from '../../primitives/reduced-motion/reduced-motion-features'

/** Props for {@link UIProvider}: the optional framework `link` component, default `portalContainer`, current `pathname`, and `toast` setup, plus `children`. */
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
	/**
	 * The path of the current page, such as `usePathname()` from
	 * `next/navigation` or `useLocation().pathname` from React Router. A
	 * `SidebarItem` or a `NavItem` with an `href` that matches it is current.
	 * Omit it to keep the path of the outer provider.
	 *
	 * @remarks
	 * Under Next.js Cache Components, `usePathname()` stops the prerender of a
	 * route that has params not known at build time. Read it in a nested
	 * provider around the navigation, in a part of the page that already
	 * renders at request time, not in the provider at the root of the app.
	 */
	pathname?: string
	/**
	 * The setup of the toasts that `useToast` from `ui/toast` shows: the
	 * `position` of the viewport, the default `duration` of a toast in
	 * milliseconds, and the `maxToasts` cap.
	 *
	 * @remarks
	 * Only the outermost provider mounts the toast queue and its viewport, so
	 * a nested provider ignores this prop.
	 * @defaultValue `{ position: 'bottom-right', duration: 5000, maxToasts: 5 }`
	 */
	toast?: Pick<ToastProviderProps, 'duration' | 'maxToasts'> & Pick<ToastProps, 'position'>
	children: ReactNode
}

/**
 * Single app-root integration point for the library's framework bindings.
 * Registers the link component, the default portal container, and the current
 * path. It also mounts the dialog that `useConfirm` from `ui/confirm` asks in,
 * and the toast queue and viewport that `useToast` from `ui/toast` uses. The
 * dialog loads on the first question, and the viewport on the first toast, so
 * neither loads before the app hydrates. It loads the Motion features of the
 * `ReducedMotion` roots at idle after hydration, so the first dialog, menu, or
 * popover that opens animates in its first frame.
 *
 * Each binding is independent and optional: the provider broadcasts a binding
 * only when its prop is provided. A nested `<UIProvider>` overrides one
 * binding (e.g. scopes `portalContainer` to a dialog subtree) without
 * disturbing the outer provider's others. Each provider mounts its own
 * confirm dialog, so a question asked under a nested provider portals into
 * the container of that provider.
 */
export function UIProvider({ link, portalContainer, pathname, toast, children }: UIProviderProps) {
	const outerLink = useLink()

	const outerPortal = usePortalContext()

	const outerPathname = use(PathnameContext)

	// The store keeps its identity, so a navigation renders only the items whose
	// match changes, not each consumer of the context.
	const pathnameStore = usePathnameStore(pathname)

	const linkValue = useMemo<LinkContextValue>(
		() => (link === undefined ? outerLink : { component: link }),
		[link, outerLink],
	)

	// The Motion features load at idle after hydration, so the first surface
	// that opens finds them ready. A load that is in progress or done is not
	// started again, so a nested provider adds no second load.
	useEffect(() => prefetchMotionFeatures(), [])

	// Each provider renders each time, and an omitted binding passes the outer
	// value through. A provider that comes and goes with its prop changes the
	// element type at the root, and React then mounts the full subtree again.
	return (
		<PortalContext value={portalContainer ?? outerPortal}>
			<LinkContext value={linkValue}>
				<PathnameContext value={pathname === undefined ? outerPathname : pathnameStore}>
					<ToastHost options={toast}>
						<ConfirmHost>{children}</ConfirmHost>
					</ToastHost>
				</PathnameContext>
			</LinkContext>
		</PortalContext>
	)
}
