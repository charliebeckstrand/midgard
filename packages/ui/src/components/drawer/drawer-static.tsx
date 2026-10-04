'use client'

import type { ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import type { ScaleStep } from '../../core/density'
import { PolymorphicStatic } from '../../primitives/polymorphic'
import { useResolvedSurface } from '../../providers/glass/context'
import { type DrawerPanelVariants, k, type scale } from '../../recipes/kata/drawer'
import { k as overlay } from '../../recipes/kata/overlay'
import { drawerPanelProps, drawerShowsGrip } from './drawer-panel-props'

/** Props for {@link DrawerStatic}: the {@link Drawer} styling props it has to match, and the content it paints. */
export type DrawerStaticProps = {
	/**
	 * The density step of the painted content, as on {@link Drawer}. Omit it to take the step of
	 * the nearest density scope, which the static drawer sits inside.
	 */
	size?: ScaleStep<typeof scale>
	/** As on {@link Drawer}: how much of the screen the panel docks over. @defaultValue 'auto' */
	height?: DrawerPanelVariants['height']
	/**
	 * As on {@link Drawer}: the grip on the top edge of the panel, painted here and never
	 * interactive. Pass the same value as the drawer, so its inset matches. Only a `half` or
	 * `full` panel shows it, as on the drawer.
	 *
	 * @defaultValue false
	 */
	handle?: boolean
	/** As on {@link Drawer}: the translucent glass panel and backdrop. */
	glass?: boolean
	/** As on {@link Drawer}: drain the color from what shows through the backdrop. @defaultValue false */
	desaturate?: boolean
	/** Classes for the panel, as {@link Drawer}'s `className` — pass the same ones. */
	className?: string
	/**
	 * Classes for the root, which covers the viewport. For hiding the whole static drawer where the
	 * drawer will not be the surface, say below a breakpoint only CSS can see on the server.
	 */
	rootClassName?: string
	/** What the panel shows until the drawer arrives. Painted, never interactive. */
	children: ReactNode
}

/**
 * An open {@link Drawer} as plain markup, rendered where it sits in the tree, for the frames
 * before the real one can mount.
 *
 * The drawer is client-only: its overlay portals out of the tree, and a portal has no server
 * output. A page that loads with the drawer already open, a deep link or a reload, therefore
 * paints the page under it first, then covers it once the client mounts the drawer. Render this
 * in its place until the drawer reports it has arrived (its `onOpenComplete`), and the first
 * paint shows the drawer rather than the page. Mount the drawer with `animateOnMount={false}`,
 * so it arrives on top of this in place instead of sliding up over it.
 *
 * @remarks
 * Built from the same recipe classes as the overlay root and backdrop, and from the same panel
 * attributes and classes (`drawerPanelProps`), and resolving `glass` through the same hook, so it
 * stays in step with {@link Drawer} by construction. Pass
 * the drawer's `className`, and the same slot components (`DrawerTitle`, `DrawerBody`, …) for
 * content: they read only defaulted context, so they render here unchanged.
 *
 * It is a picture, not a dialog. No portal, no motion, no focus trap, and no dialog role. The
 * content is `inert`, so nothing in it is focusable or announced, and the drawer's own title and
 * focus arrive with the drawer. The root and backdrop still take pointer presses, so a click
 * while the drawer is on its way cannot land on the page behind it.
 *
 * Positioned `fixed` in place rather than portaled. It resolves against the viewport as long as
 * no ancestor is a containing block for fixed descendants (a `transform`, `filter`, `contain`,
 * or `will-change` of those). Its stacking layer also ranks within its nearest stacking context
 * rather than the document's. Sitting in place, it is inside the density scope it was rendered
 * in, which the portaled drawer carries over as its root's `data-density`.
 */
export function DrawerStatic({
	size,
	height,
	handle,
	glass,
	desaturate,
	className,
	rootClassName,
	children,
}: DrawerStaticProps) {
	const resolvedSurface = useResolvedSurface(glass)

	const grip = drawerShowsGrip(handle, height)

	// None of the drawer's own `data-slot`s: nothing styles off them, and a selector written
	// for the real drawer must not find its static copy. The panel's group names and `data-*`
	// hooks are the drawer's, because its slots and rows style off those.
	return (
		<div data-slot="drawer-static" className={cn(overlay.root, overlay.frame, rootClassName)}>
			<div className={k.backdrop({ surface: resolvedSurface, desaturate })} aria-hidden="true" />
			<PolymorphicStatic
				as="div"
				data-slot="drawer-static-panel"
				inert
				density={size}
				{...drawerPanelProps({ surface: resolvedSurface, height, className })}
				data-handle={dataAttr(grip)}
			>
				{grip ? (
					<div aria-hidden="true" className={cn(k.handle.area)}>
						<div className={cn(k.handle.bar)} />
					</div>
				) : null}
				{children}
			</PolymorphicStatic>
		</div>
	)
}
