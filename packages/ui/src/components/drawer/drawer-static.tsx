'use client'

import type { ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import type { ScaleStep } from '../../core/density'
import { PanelCloseContext } from '../../primitives/panel'
import { PolymorphicStatic } from '../../primitives/polymorphic'
import { useResolvedSurface } from '../../providers/glass/context'
import { type DrawerPanelVariants, k, type scale } from '../../recipes/kata/drawer'
import { k as overlay } from '../../recipes/kata/overlay'
import { noop } from '../../utilities'
import { drawerPanelProps, drawerShowsGrip } from './drawer-panel-props'
import { DrawerClose, DrawerDefaultFooter } from './slots'

/**
 * The close context of the static copy. The panel is `inert`, so no press reaches a close control,
 * and the `close` does nothing. It lets a `DrawerClose` render here as it does in the drawer.
 */
const STATIC_CLOSE = { close: noop }

/** Props for {@link DrawerStatic}: the {@link DrawerPanel} styling props it has to match, and the content it paints. */
export type DrawerStaticProps = {
	/**
	 * The density step of the painted content, as on {@link DrawerPanel}. Omit it to take the step of
	 * the nearest density scope, which the static drawer sits inside.
	 */
	size?: ScaleStep<typeof scale>
	/**
	 * As on {@link DrawerPanel}: how much of the screen the panel docks over.
	 *
	 * A `fit` copy keeps its rounded top corners, also when its content fills the screen. The
	 * drawer squares them only when it measures its content, after the swap, because a server
	 * paint cannot measure.
	 *
	 * @defaultValue 'auto'
	 */
	height?: DrawerPanelVariants['height']
	/**
	 * As on {@link DrawerPanel}: the grip on the top edge of the panel, painted here and never
	 * interactive. Pass the same value as the drawer, so its inset matches. Only a `half` or
	 * `full` panel shows it, as on the drawer.
	 *
	 * @defaultValue false
	 */
	handle?: boolean
	/** As on {@link DrawerPanel}: the translucent glass panel and backdrop. */
	glass?: boolean
	/** As on {@link DrawerPanel}: drain the color from what shows through the backdrop. @defaultValue false */
	desaturate?: boolean
	/**
	 * As on {@link DrawerPanel}: a modal drawer dims the page. Pass the same value as the drawer.
	 * The flag changes paint only. The root and the backdrop take pointer presses either way.
	 *
	 * @defaultValue true
	 */
	modal?: boolean
	/**
	 * As on {@link DrawerPanel}: paint the backdrop, independently of `modal`. With `false`, the
	 * backdrop stays in place to take a press, but has no paint.
	 *
	 * @defaultValue modal
	 */
	backdrop?: boolean
	/**
	 * As on {@link DrawerPanel}: the content of the footer row that the panel shows after its
	 * children. Set `null` to show no footer row.
	 *
	 * The static copy cannot see a `DrawerFooter` in its children, because the footer registers
	 * only on the client. When the children hold a `DrawerFooter`, pass `footer={null}`.
	 *
	 * @defaultValue `<DrawerClose />`, the standard Close button.
	 */
	footer?: ReactNode
	/** Classes for the panel, as {@link DrawerPanel}'s `className` — pass the same ones. */
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
 * paint shows the drawer rather than the page. Mount the `DrawerPanel` with
 * `animateOnMount={false}`, so it arrives on top of this in place instead of sliding up over it.
 *
 * @remarks
 * Built from the same recipe classes as the overlay root and backdrop, and from the same panel
 * attributes and classes (`drawerPanelProps`), and resolving `glass` through the same hook, so it
 * stays in step with {@link DrawerPanel} by construction. Pass
 * the drawer's `className`, and the same slot components (`DrawerTitle`, `DrawerBody`, …) for
 * content: they read only defaulted context, or the close context that this copy supplies, so
 * they render here unchanged.
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
	modal = true,
	backdrop = modal,
	footer,
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
		<div data-slot="drawer-static" className={cn(overlay.base, overlay.frame, rootClassName)}>
			<div
				className={
					backdrop ? k.backdrop({ surface: resolvedSurface, desaturate }) : 'absolute inset-0'
				}
				aria-hidden="true"
			/>
			<PolymorphicStatic
				as="div"
				data-slot="drawer-static-panel"
				inert
				density={size}
				{...drawerPanelProps({ surface: resolvedSurface, height, className })}
				data-handle={dataAttr(grip)}
			>
				{grip ? (
					<div aria-hidden="true" className={cn(k.handle.base)}>
						<div className={cn(k.handle.bar)} />
					</div>
				) : null}
				<PanelCloseContext value={STATIC_CLOSE}>
					{children}
					<DrawerDefaultFooter>
						{footer === undefined ? <DrawerClose /> : footer}
					</DrawerDefaultFooter>
				</PanelCloseContext>
			</PolymorphicStatic>
		</div>
	)
}
