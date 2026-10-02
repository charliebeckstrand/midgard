'use client'

import { motion } from 'motion/react'
import { type ReactNode, type RefObject, useEffect } from 'react'
import { cn, dataAttr } from '../../core'
import type { DensityStep } from '../../core/density'
import { useA11yPanel } from '../../hooks'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { useControllableFlag } from '../../hooks/use-controllable'
import { useEnterAnimation } from '../../hooks/use-enter-animation'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { usePanelFit } from '../../hooks/use-panel-fit'
import { usePanelResize } from '../../hooks/use-panel-resize'
import { Density } from '../../primitives/density'
import { Overlay } from '../../primitives/overlay'
import { type PanelOverlayProps, PanelProviders } from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import { type DrawerPanelVariants, k } from '../../recipes/kata/drawer'
import { drawerCeiling, drawerFloor } from './drawer-floor'
import { DrawerHandle } from './drawer-handle'
import { drawerPanelProps } from './drawer-panel-props'

/** Props for {@link Drawer}: open-state control, panel `height`, density `size` scope, and accessible naming. */
export type DrawerProps = Omit<DrawerPanelVariants, 'surface' | 'height'> &
	PanelOverlayProps & {
		/** Controlled open state. Pair with `onOpenChange`. */
		open?: boolean
		/** Initial open state when uncontrolled. */
		defaultOpen?: boolean
		/** Fires when the open state changes (backdrop dismiss, Escape, close button). */
		onOpenChange?: (open: boolean) => void
		/**
		 * Fires once the panel has finished arriving — it is docked, at rest, and covering
		 * whatever it covers.
		 *
		 * The counterpart to `onOpenChange`, which reports the state being *asked for*: this
		 * one reports it having *landed*. Use it for anything that has to hold until the panel
		 * is actually up. Do not guess at the slide with a matching delay.
		 *
		 * Deliberately named for the open, not for the animation. It fires whether or not the
		 * panel animated. It fires on the enter slide's landing. It also fires on the mount
		 * itself, for a panel that arrives in place (`animateOnMount={false}`) with no slide
		 * to land. A slide the user's reduced-motion preference collapses still resolves, and
		 * so still reports. That is the same property the accordion's hold relies on to
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
		size?: DensityStep
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
		 * Give the panel a drag handle: a grip on its top edge that the reader pulls
		 * down to close the panel, as a sheet closes on a phone.
		 *
		 * A panel with a fixed height (`half` or `full`) also resizes on the grip.
		 * The drag sets the height directly, rather than stepping between the `height`
		 * variants. The reader is deciding how much of the screen the panel gets, and
		 * the answer is wherever they let go. `height` still states where it opens.
		 * The drag stops at the chrome that does not scroll: the handle, a header,
		 * and a footer. The grip is a window splitter, so the arrow keys resize too.
		 *
		 * A panel grown to its content (`auto` or `fit`) does not resize. A shorter
		 * panel hides content behind a scroll, and a taller one adds empty space. The
		 * grip there only pulls the panel down. It takes no focus, and assistive
		 * technology does not see it, because `Escape` and the backdrop close the
		 * panel already.
		 *
		 * Below the floor, the panel follows the pointer off the bottom of the screen.
		 * The floor is the chrome of a fixed panel, and the full height of a grown
		 * one. A release closes the panel once a quarter of the floor is off the
		 * screen. A shorter pull springs back to the floor, as a sheet does on a
		 * phone. A flick downward closes it from any height. Both closes arrive
		 * through `onOpenChange`, like every other close. A pulled panel then glides
		 * off the screen from where the release left it, at the speed of the release.
		 *
		 * A resize is the drawer's own state, and reports nowhere. Nothing outside it
		 * needs to hold a pixel height that only means anything on the screen it was
		 * set on.
		 *
		 * @defaultValue false
		 */
		handle?: boolean
		/** Opt the panel and backdrop into the translucent glass surface, resolved against the ambient Glass provider. */
		glass?: boolean
		/**
		 * Drain the color from whatever shows through the backdrop. Both scrims are
		 * translucent, so the page behind stays legible while the drawer is up. This
		 * renders it in gray, marking it as the inert surface rather than merely the
		 * dimmed one.
		 *
		 * @defaultValue false
		 */
		desaturate?: boolean
		className?: string
		/**
		 * Whether the panel plays its enter slide on mount.
		 *
		 * `false` mounts it already in place, backdrop included. The enter animation is keyed
		 * to *mount*, not to the open transition. A drawer whose open state comes from the URL
		 * therefore slides up again every time its route mounts. That is a restored tab, or a
		 * pasted deep link. It re-animates something the user never opened. Pass `false` for
		 * that case and leave it alone for a drawer opened by a press.
		 *
		 * Only that arrival is suppressed. Once the drawer has closed, a reopen while it is
		 * still mounted slides up regardless — the user asked for that one.
		 *
		 * @defaultValue true
		 */
		animateOnMount?: boolean
		children: ReactNode
		/**
		 * Element to receive initial focus when the drawer opens.
		 * @defaultValue the first tabbable child
		 */
		initialFocus?: RefObject<HTMLElement | null>
		/**
		 * Accessible name for drawers without a visible `DrawerTitle`. Ignored once a
		 * `DrawerTitle` registers.
		 */
		'aria-label'?: string
	}

/**
 * Bottom-sheet overlay rendered in an `Overlay` with focus trapping and backdrop dismiss.
 * Docks full-width to the bottom edge with a rounded top, and slides up via the shared
 * bottom motion preset. Open state is controlled (`open`/`onOpenChange`) or uncontrolled
 * (`defaultOpen`).
 *
 * A browser toolbar or an iOS keyboard over the bottom edge does not hide the panel. Chrome
 * on iOS lays the page out under its toolbars. The panel docks to the bottom of its `Overlay`
 * root, which is the part of the screen that the reader sees (`useVisualViewport`).
 *
 * `height` sets how much of the screen it docks over:
 *
 * - Growing to its content by default.
 * - Growing to it under Framer Motion, and up to the whole screen, with `fit`.
 * - Fixed at half or the whole of it.
 *
 * Resolves the surface variant against the enclosing Glass provider. An explicit `size`
 * opens a density scope on the panel, so descendants scale in step. Compose `<DrawerTrigger>`,
 * `<DrawerClose>`, and the slot family (`<DrawerHeader>`, `<DrawerTitle>`,
 * `<DrawerDescription>`, `<DrawerBody>`, `<DrawerFooter>`) within.
 *
 * @remarks
 * A registered `<DrawerTitle>` supplies `aria-labelledby` and takes precedence over the
 * `aria-label` fallback. The panel stops click propagation to keep the portal's synthetic
 * clicks off the consumer ancestors it renders under. The backdrop is a sibling, so a panel
 * click never reaches its dismiss handler anyway. The panel also shares a single open-state
 * setter with its dismiss affordances, via `PanelProviders`.
 */
export function Drawer({
	open,
	defaultOpen,
	onOpenChange,
	onOpenComplete,
	size,
	height,
	handle,
	glass,
	desaturate,
	className,
	animateOnMount = true,
	children,
	initialFocus,
	dismissOnBackdrop,
	modal = true,
	backdrop,
	container,
	'aria-label': ariaLabel,
}: DrawerProps) {
	// Controlled when `open` is passed; otherwise uncontrolled from `defaultOpen`.
	const [resolvedOpen, setOpen] = useControllableFlag({
		value: open,
		defaultValue: defaultOpen,
		onValueChange: onOpenChange,
	})

	const resolvedSurface = useResolvedSurface(glass)

	// The panel unmounts while closed (`Portal`), so the flag has to be scoped to
	// this component's own mount or a minimize/maximize cycle would land in place.
	const animateEnter = useEnterAnimation(resolvedOpen, animateOnMount)

	const { report, onAnimationComplete } = useOpenComplete(
		resolvedOpen,
		k.motion.animate,
		onOpenComplete,
	)

	// A panel that arrives in place plays no enter, so there is no landing to report from —
	// it is already up, and says so from here instead.
	useEffect(() => {
		if (resolvedOpen && !animateEnter) report()
	}, [resolvedOpen, animateEnter, report])

	// Only a fixed height resizes. A grown panel's height is its content, so the
	// grip on it only pulls the panel off.
	const resizable = height === 'half' || height === 'full'

	// The gesture is held here, by the component that owns the panel it writes to.
	// A pixel height means nothing off the screen it was set on, so it stays in
	// here — there is nothing for a consumer to hold.
	const resize = usePanelResize({
		side: 'bottom',
		open: resolvedOpen,
		onDismiss: () => setOpen(false),
		floorOf: drawerFloor,
		ceilingOf: drawerCeiling,
		pull: true,
		resize: resizable,
		pullBack: k.pullBack,
		throwAway: k.throwAway,
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
			open={resolvedOpen}
			onOpenChange={setOpen}
			initialFocus={initialFocus}
			dismissOnBackdrop={dismissOnBackdrop}
			modal={modal}
			backdrop={backdrop}
			container={container}
			animateOnMount={animateOnMount}
			backdropClassName={k.backdrop({ surface: resolvedSurface, desaturate })}
		>
			<motion.div
				{...k.motion}
				// After the preset spread, so it overrides the preset's own `initial`.
				initial={animateEnter ? k.motion.initial : false}
				// A panel that a release throws away leaves at the speed of the release,
				// and only over the part of it still on the screen. The slide of the
				// preset moves the whole panel in a fixed time, which after a long pull
				// takes it off the screen in a frame or two.
				exit={resize.exit ?? k.motion.exit}
				onAnimationComplete={onAnimationComplete}
				ref={panelRef}
				{...ariaProps}
				aria-label={ariaProps['aria-labelledby'] ? undefined : ariaLabel}
				data-slot="drawer"
				data-density={size}
				{...drawerPanelProps({
					surface: resolvedSurface,
					height,
					// A non-modal overlay turns off pointer events on its full-viewport
					// root, so the page stays live. The panel turns them on again for itself.
					className: cn(!modal && 'pointer-events-auto', className),
				})}
				// The panel eases between its `height` variants, which is right for a step
				// and wrong for a finger: eased, each frame's height becomes an animation
				// toward where the pointer already is, so the edge trails the drag and
				// carries on after it ends. The recipe suspends it off this attribute.
				data-resizing={dataAttr(resize.resizing)}
				// Named so the slots below can key off it: a handle changes the panel's
				// top inset, and the header that follows must not add its own on top.
				data-handle={dataAttr(handle === true)}
				onClick={(event) => event.stopPropagation()}
				// A dragged height beats the variant's — and a `fit` panel's, which stands
				// down for as long as one is held. It is inline because it is a
				// measurement rather than a step: there is no class for "412 pixels".
				style={resize.size === null ? undefined : { height: resize.size }}
			>
				<PanelProviders onOpenChange={setOpen} a11y={a11y}>
					{handle ? (
						<DrawerHandle
							handleProps={resize.handleProps}
							covers={resize.covers}
							resizable={resizable}
						/>
					) : null}

					<Density step={size}>{children}</Density>
				</PanelProviders>
			</motion.div>
		</Overlay>
	)
}
