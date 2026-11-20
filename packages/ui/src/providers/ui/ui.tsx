'use client'

import { type ReactNode, use, useEffect, useMemo } from 'react'
import { ConfirmHost } from '../../components/confirm/confirm-host'
import type { ToastProps, ToastProviderProps } from '../../components/toast'
import { ToastHost } from '../../components/toast/toast-host'
import { createContext } from '../../core/create-context'
// LinkContext / PortalContext / PathnameContext / IconsContext live in the
// primitives layer: the `polymorphic` primitive consumes `useLink`; the
// `overlay` / `floating-surface` primitives consume `usePortalContainer`; the
// nav items consume `useCurrentPathMatch`; the glyphs of `primitives/icons`
// read the icons. This provider fans out to all four.
import { PathnameContext } from '../../primitives/current/context'
import { useCurrentPathStore } from '../../primitives/current/use-current-path-store'
import { IconsContext } from '../../primitives/icons/context'
import type { Icons } from '../../primitives/icons/types'
import {
	type LinkComponent,
	LinkContext,
	type LinkContextValue,
	useLink,
} from '../../primitives/link/context'
import {
	type PortalContainer,
	PortalContext,
	usePortalContext,
} from '../../primitives/portal/context'
import { prefetchMotionFeatures } from '../../primitives/reduced-motion/reduced-motion-features'

/** Props for {@link UIProvider}: the optional framework `link` component, default `portalContainer`, current `pathname`, `toast` setup, and replacement `icons`, plus `children`. */
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
	/**
	 * The icons to draw in place of the Lucide defaults of ui, by the Lucide
	 * name of each glyph, such as `{ X: <FontAwesomeIcon icon={faXmark} /> }`.
	 * Each value replaces its glyph in each component of ui. A glyph with no
	 * value keeps its Lucide default. A nested provider merges its icons over
	 * the icons of the outer provider. A per-instance icon prop, such as the
	 * `icon` of `Alert`, still wins.
	 *
	 * @remarks
	 * Give an element, not a component, so that a server layout can give the
	 * map. The element gets the `className`, the `style`, and the ARIA and
	 * `data-*` attributes of the glyph, and its component must forward them to
	 * its `<svg>`. Keep the map stable, such as in a module constant: a new map
	 * renders each glyph again.
	 */
	icons?: Icons
	children: ReactNode
}

// True under a UIProvider. A nested provider reads it and does not mount a
// second toast queue.
const [UIProviderContext] = createContext<boolean>('UIProvider', { default: false })

/**
 * Single app-root integration point for the library's framework bindings.
 * Registers the link component, the default portal container, the current
 * path, and the icons that replace the Lucide defaults. It also mounts the dialog that `useConfirm` from `ui/confirm` asks in,
 * and the toast queue and viewport that `useToast` from `ui/toast` uses. The
 * dialog and the viewport load in idle time after the hydration, or on the
 * first question or toast when that comes first. Put `LocaleProvider` above
 * it, because the confirm dialog reads the contexts above the provider. It
 * loads the Motion features of the
 * `ReducedMotion` roots at idle after hydration, so the first dialog, menu, or
 * popover that opens animates in its first frame.
 *
 * Each binding is independent and optional: the provider broadcasts a binding
 * only when its prop is provided. A nested `<UIProvider>` overrides one
 * binding (e.g. scopes `portalContainer` to a dialog subtree) without
 * disturbing the outer provider's others. Each provider mounts its own
 * confirm dialog, so a question asked under a nested provider portals into
 * the container of that provider. Only the outermost provider mounts the toast
 * queue and viewport. A nested provider uses the queue of the outer provider,
 * and its `toast` prop has no effect. A `ToastProvider` in the subtree still
 * makes a queue of its own for its descendants.
 */
export function UIProvider({
	link,
	portalContainer,
	pathname,
	toast,
	icons,
	children,
}: UIProviderProps) {
	const outerLink = useLink()

	const outerIcons = use(IconsContext)

	const outerPortal = usePortalContext()

	const outerPathname = use(PathnameContext)

	const nested = use(UIProviderContext)

	// The store keeps its identity, so a navigation renders only the items whose
	// match changes, not each consumer of the context.
	const pathnameStore = useCurrentPathStore(pathname)

	const linkValue = useMemo<LinkContextValue>(
		() => (link === undefined ? outerLink : { component: link }),
		[link, outerLink],
	)

	const iconsValue = useMemo<Icons>(
		() => (icons === undefined ? outerIcons : { ...outerIcons, ...icons }),
		[icons, outerIcons],
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
					<IconsContext value={iconsValue}>
						<UIProviderContext value>
							{/* A provider does not move into or out of another provider, so this branch does not change while the provider is mounted. */}
							{nested ? (
								<ConfirmHost>{children}</ConfirmHost>
							) : (
								<ToastHost options={toast}>
									<ConfirmHost>{children}</ConfirmHost>
								</ToastHost>
							)}
						</UIProviderContext>
					</IconsContext>
				</PathnameContext>
			</LinkContext>
		</PortalContext>
	)
}
