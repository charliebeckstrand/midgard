'use client'

import { motion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { cn, dataAttr } from '../../core'
import type { ScaleStep } from '../../core/density'
import { useA11yPanel } from '../../hooks'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { usePanelFit } from '../../hooks/use-panel-fit'
import { usePanelResize } from '../../hooks/use-panel-resize'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { Density } from '../../primitives/density'
import { Overlay } from '../../primitives/overlay'
import {
	type PanelOverlayProps,
	PanelProviders,
	PanelRoot,
	type PanelRootProps,
	usePanelState,
} from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import { type DrawerPanelVariants, k, type scale } from '../../recipes/kata/drawer'
import { drawerCeiling, drawerFloor } from './drawer-floor'
import { DrawerHandle } from './drawer-handle'
import { DrawerClose, DrawerDefaultFooter } from './slots'

/** Props for {@link Drawer}: the open state, controlled or uncontrolled. */
export type DrawerProps = PanelRootProps

/** Props for {@link DrawerPanel}: panel `height`, density `size` scope, dismissal, and accessible naming. */
export type DrawerPanelProps = Omit<DrawerPanelVariants, 'surface' | 'height'> &
	PanelOverlayProps & {
		/**
		 * Fires once the panel has finished arriving — it is docked, at rest, and covering
		 * whatever it covers.
		 *
		 * The counterpart to `onOpenChange`, which reports the state being *asked for*: this
		 * one reports it having *landed*. Use it for anything that has to hold until the panel
		 * is actually up. Do not guess at the slide with a matching delay.
		 *
		 * Deliberately named for the open, not for the animation. It fires whether or not the
		 * panel animated. It fires on the enter slide's landing. A slide the user's
		 * reduced-motion preference collapses still resolves, and so still reports. That is the same property the accordion's hold relies on to
		 * unmount a closed panel.
		 *
		 * Once per arrival, and never for a close.
		 */
		onOpenComplete?: () => void
		/**
		 * The density step of the panel content. Omit it to take the step of the
		 * nearest density scope of the drawer, which the portal carries. A step
		 * makes the panel a density scope.
		 */
		size?: ScaleStep<typeof scale>
		/**
		 * How much of the screen the panel docks over.
		 *
		 * `auto` and `fit` grow to the content. `half` and `full` fix the height
		 * instead, for a panel whose own body scrolls. It suits a detail panel beside
		 * the thing it describes, or a form that owns the screen while it is up.
		 *
		 * The two grown steps differ in where they stop, and in whether the panel
		 * travels there. `auto` stops short of the top edge, which is what a drawer is
		 * for: the page it came from stays visible behind it. It also snaps, since a
		 * box sized by what it holds has no second length to interpolate against.
		 *
		 * `fit` takes the whole screen when the content asks for that much. It
		 * measures each new height, so the panel grows or shrinks into it rather than
		 * jumping. It is the answer wherever the panel's own content decides how tall
		 * it is, which is two cases in practice.
		 *
		 * One is a panel whose content is *swapped*, under a breadcrumb, a back step,
		 * or a detail opened from a list. There a fixed height fits one step and
		 * strands the rest, and a snapping one resizes under the reader's hand.
		 *
		 * The other is a panel that simply has a size, and whose last part is the one
		 * the reader is heading for. That part is a form's final field, or an action
		 * row. `auto`'s stop short of the edge is above such a panel on a tall window,
		 * and under it on a short one. The difference is a field below the fold of a
		 * body nothing announced as scrollable.
		 *
		 * `full` squares the top corners, because a rounded corner against the screen
		 * edge reads as a panel that failed to reach it. `fit` squares them on the
		 * steps that stand it there.
		 *
		 * The body scrolls within the panel whichever is set, so no height ever
		 * strands content; it decides where the panel stops, not what fits.
		 * @defaultValue 'auto'
		 */
		height?: DrawerPanelVariants['height']
		/**
		 * Give the panel a drag handle: a grip on its top edge that resizes the panel.
		 *
		 * The grip only shows on a panel with a fixed height (`half` or `full`). The
		 * drag sets the height directly, rather than stepping between the `height`
		 * variants. The reader is deciding how much of the screen the panel gets, and
		 * the answer is wherever they let go. `height` still states where it opens.
		 * The drag stops at the chrome that does not scroll: the handle, a header,
		 * and a footer. The grip is a window splitter, so the arrow keys resize too.
		 *
		 * A panel grown to its content (`auto` or `fit`) does not resize, so it shows
		 * no grip. A shorter panel hides content behind a scroll, and a taller one
		 * adds empty space.
		 *
		 * The grip does not close the panel. `Escape`, the backdrop, and the close
		 * controls of the panel do that.
		 *
		 * A resize is the drawer's own state, and reports nowhere. Nothing outside it
		 * needs to hold a pixel height that only means anything on the screen it was
		 * set on.
		 *
		 * @defaultValue false
		 */
		handle?: boolean
		/**
		 * Opt the panel and backdrop into the translucent glass surface. Omit it to
		 * follow the ambient `<GlassProvider>`. Set `false` to keep the flat surface
		 * inside one.
		 */
		glass?: boolean
		className?: string
		children: ReactNode
		/**
		 * The content of the footer row that the drawer shows when no `DrawerFooter`
		 * is in its children. A `DrawerFooter` child replaces it. Set `null` to show
		 * no footer row.
		 *
		 * @defaultValue `<DrawerClose />`, the standard Close button.
		 */
		footer?: ReactNode
		/**
		 * Element to receive initial focus when the drawer opens.
		 * @defaultValue the first tabbable child.
		 */
		initialFocus?: RefObject<HTMLElement | null>
		/**
		 * Accessible name for drawers without a visible `DrawerTitle`. Ignored once a
		 * `DrawerTitle` registers.
		 */
		'aria-label'?: string
	}

/**
 * Composition root for a drawer. It holds the open state, controlled
 * (`open`/`onOpenChange`) or uncontrolled (`defaultOpen`), and gives it to
 * `<DrawerTrigger>` and `<DrawerPanel>`. It renders no element. A trigger in the
 * root opens an uncontrolled drawer. Escape, the backdrop, and `<DrawerClose>`
 * close it, and focus then goes back to the trigger.
 *
 * @example
 * ```tsx
 * <Drawer>
 *   <DrawerTrigger>
 *     <Button>Open</Button>
 *   </DrawerTrigger>
 *   <DrawerPanel>
 *     <DrawerTitle>Title</DrawerTitle>
 *   </DrawerPanel>
 * </Drawer>
 * ```
 *
 * @see {@link DrawerPanel} for the surface and its props.
 */
export function Drawer(props: DrawerProps) {
	return <PanelRoot {...props} />
}

/**
 * The bottom-sheet surface of a {@link Drawer}, rendered in an `Overlay` with focus
 * trapping and backdrop dismiss. It reads the open state of the enclosing `<Drawer>`.
 * Docks full-width to the bottom edge with a rounded top, and slides up via the shared
 * bottom motion preset.
 *
 * `height` sets how much of the screen it docks over:
 *
 * - Growing to its content by default.
 * - Growing to it under Framer Motion, and up to the whole screen, with `fit`.
 * - Fixed at half or the whole of it.
 *
 * Resolves the surface variant against the enclosing Glass provider. An explicit `size`
 * opens a density scope on the panel, so descendants scale in step. Compose `<DrawerClose>`
 * and the slot family (`<DrawerHeader>`, `<DrawerTitle>`,
 * `<DrawerDescription>`, `<DrawerBody>`, `<DrawerFooter>`) within. With no `<DrawerFooter>` in
 * its children, the drawer shows a footer with the standard Close button.
 *
 * @remarks
 * A registered `<DrawerTitle>` supplies `aria-labelledby` and takes precedence over the
 * `aria-label` fallback. The panel stops click propagation to keep the portal's synthetic
 * clicks off the consumer ancestors it renders under. The backdrop is a sibling, so a panel
 * click never reaches its dismiss handler anyway. The panel, its close parts, and its
 * dismissal share the open-state setter of the root.
 */
export function DrawerPanel({
	onOpenComplete,
	size,
	height,
	handle,
	glass,
	className,
	children,
	footer,
	initialFocus,
	dismissOnBackdrop,
	modal = true,
	backdrop,
	container,
	'aria-label': ariaLabel,
}: DrawerPanelProps) {
	// The root holds the state. One setter drives the Overlay and the close parts.
	const { open, setOpen, panelId } = usePanelState()

	const resolvedSurface = useResolvedSurface(glass)

	// The slide moves `transform`, which `MotionConfig` does not hold still, so the
	// panel reads the setting itself (WCAG 2.3.3).
	const preset = usePrefersReducedMotion() ? k.still : k.motion

	const { onAnimationComplete } = useOpenComplete(open, preset.animate, onOpenComplete)

	// The grip only resizes, so only a panel with a fixed height shows it. A panel grown to
	// its content (`auto` or `fit`) has no height for the grip to set.
	const grip = handle === true && (height === 'half' || height === 'full')

	const isGlass = resolvedSurface === 'glass'

	// The gesture is held here, by the component that owns the panel it writes to.
	// A pixel height means nothing off the screen it was set on, so it stays in
	// here — there is nothing for a consumer to hold.
	const resize = usePanelResize({
		side: 'bottom',
		open,
		floorOf: drawerFloor,
		ceilingOf: drawerCeiling,
	})

	// The other half of the panel's height, and the one the panel itself decides:
	// a `fit` panel grows and shrinks into whatever it is handed. It stands down
	// for a drag, so the two never write the same property at once, and it stamps
	// its own `data-full` rather than reporting one back through a render.
	const fitRef = usePanelFit({
		enabled: height === 'fit',
		dragged: resize.size !== null,
		ceilingOf: drawerCeiling,
		transition: k.fit,
	})

	// One node, two readers of it. The gesture writes the height the reader sets
	// and the fit writes the height the content asks for; both need the element.
	const panelRef = useComposedRef(resize.ref, fitRef)

	const { ariaProps, a11y } = useA11yPanel('dialog', modal)

	return (
		<Overlay
			open={open}
			onOpenChange={setOpen}
			initialFocus={initialFocus}
			dismissOnBackdrop={dismissOnBackdrop}
			modal={modal}
			backdrop={backdrop}
			container={container}
			backdropClassName={k.backdrop({ surface: resolvedSurface })}
		>
			<motion.div
				{...preset}
				onAnimationComplete={onAnimationComplete}
				ref={panelRef}
				{...ariaProps}
				aria-label={ariaProps['aria-labelledby'] ? undefined : ariaLabel}
				id={panelId}
				data-slot="drawer"
				data-density={size}
				data-height={height ?? 'auto'}
				// Opens the glass cascade to the panel contents: `hannou.tint.glass` keys on
				// `group-data-glass/glass`, which needs the named group and the attribute on
				// one element. Rows inside take their hover wash at double strength, because
				// 5% under the translucency of the panel reads as no hover at all.
				data-glass={dataAttr(isGlass)}
				className={cn(
					'group/drawer',
					isGlass && 'group/glass',
					k.panel({ surface: resolvedSurface, height }),
					// A non-modal overlay turns off pointer events on its full-viewport
					// root, so the page stays live. The panel turns them on again for itself.
					!modal && 'pointer-events-auto',
					className,
				)}
				// The panel eases between its `height` variants, which is right for a step
				// and wrong for a finger: eased, each frame's height becomes an animation
				// toward where the pointer already is, so the edge trails the drag and
				// carries on after it ends. The recipe suspends it off this attribute.
				data-resizing={dataAttr(resize.resizing)}
				// Named so the slots below can key off it: a handle changes the panel's
				// top inset, and the header that follows must not add its own on top.
				data-handle={dataAttr(grip)}
				onClick={(event) => event.stopPropagation()}
				// A dragged height beats the variant's — and a `fit` panel's, which stands
				// down for as long as one is held. It is inline because it is a
				// measurement rather than a step: there is no class for "412 pixels".
				style={resize.size === null ? undefined : { height: resize.size }}
			>
				<PanelProviders onOpenChange={setOpen} a11y={a11y}>
					{grip ? (
						<DrawerHandle
							handleProps={resize.handleProps}
							covers={resize.covers}
							controls={panelId}
						/>
					) : null}

					<Density step={size}>
						{children}
						<DrawerDefaultFooter>
							{footer === undefined ? <DrawerClose /> : footer}
						</DrawerDefaultFooter>
					</Density>
				</PanelProviders>
			</motion.div>
		</Overlay>
	)
}
