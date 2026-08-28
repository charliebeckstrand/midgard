'use client'

import { motion } from 'motion/react'
import { type ReactNode, type RefObject, useEffect } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yPanel } from '../../hooks'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { useControllable } from '../../hooks/use-controllable'
import { useEnterAnimation } from '../../hooks/use-enter-animation'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { usePanelFit } from '../../hooks/use-panel-fit'
import { usePanelResize } from '../../hooks/use-panel-resize'
import { Density, useDensity } from '../../primitives/density'
import { Overlay } from '../../primitives/overlay'
import { PanelProviders } from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import type { Step } from '../../recipes'
import { type DrawerPanelVariants, k } from '../../recipes/kata/drawer'
import { drawerCeiling, drawerFloor } from './drawer-floor'
import { DrawerHandle } from './drawer-handle'

/** Props for {@link Drawer}: open-state control, panel `height`, density `size` cascade, and accessible naming. */
export type DrawerProps = Omit<DrawerPanelVariants, 'surface' | 'height'> & {
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
	 * is actually up, rather than guessing at the slide with a matching delay.
	 *
	 * Deliberately named for the open, not for the animation. It fires whether or not the
	 * panel animated: on the enter slide's landing, and on the mount itself for a panel that
	 * arrives in place (`animateOnMount={false}`) with no slide to land. A slide the user's
	 * reduced-motion preference collapses still resolves, and so still reports — the same
	 * property the accordion's hold relies on to unmount a closed panel.
	 *
	 * Once per arrival, and never for a close.
	 */
	onOpenComplete?: () => void
	/**
	 * Size step that propagates to descendants via the Density context.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
	 * @defaultValue inherited Density size, falling back to 'md'
	 */
	size?: Step
	/**
	 * How much of the screen the panel docks over.
	 *
	 * `auto` and `fit` grow to the content; `half` and `full` fix the height
	 * instead, for a panel whose own body scrolls — a detail panel beside the
	 * thing it describes, or a form that owns the screen for as long as it is up.
	 *
	 * The two grown steps differ in where they stop, and in whether the panel
	 * travels there. `auto` stops short of the top edge, which is what a drawer is
	 * for: the page it came from stays visible behind it. It also snaps, since a
	 * box sized by what it holds has no second length to interpolate against.
	 *
	 * `fit` takes the whole screen when the content asks for that much, and
	 * measures each new height so the panel grows or shrinks into it. Pass it for
	 * a panel the reader navigates *within* — one whose content is swapped under a
	 * breadcrumb or a back step — where a fixed height is a box that fits one step
	 * and strands the rest, and a snapping one resizes under the reader's hand.
	 *
	 * `full` squares the top corners, because a rounded corner against the screen
	 * edge reads as a panel that failed to reach it; `fit` squares them on the
	 * steps that stand it there.
	 *
	 * The body scrolls within the panel whichever is set, so no height ever
	 * strands content; it decides where the panel stops, not what fits.
	 * @defaultValue 'auto'
	 */
	height?: DrawerPanelVariants['height']
	/**
	 * Give the panel a drag handle, so the reader can resize it between the fixed
	 * `height` steps and throw it away downward.
	 *
	 * The drag sets the height directly rather than stepping between the `height`
	 * variants: the reader is deciding how much of the screen the panel gets, and
	 * the answer is wherever they let go. `height` still states where it opens.
	 *
	 * A panel flicked downward closes, which arrives through `onOpenChange` like
	 * every other close — speed, not position, is what tells a dismissal from a
	 * reader placing the edge at its shortest. A resize is the drawer's own state
	 * and reports nowhere: nothing outside it needs to hold a pixel height that
	 * only means anything on the screen it was set on.
	 *
	 * @defaultValue false
	 */
	handle?: boolean
	/** Opt the panel and backdrop into the translucent glass surface, resolved against the ambient Glass provider. */
	glass?: boolean
	/**
	 * Drain the colour from whatever shows through the backdrop. Both scrims are
	 * translucent, so the page behind stays legible while the drawer is up; this
	 * renders it in grey, marking it as the inert surface rather than merely the
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
	 * to *mount*, not to the open transition, so a drawer whose open state comes from the
	 * URL — a restored tab, a pasted deep link — slides up again every time its route
	 * mounts, re-animating something the user never opened. Pass `false` for that case and
	 * leave it alone for a drawer opened by a press.
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
 * Docks full-width to the bottom edge with a rounded top, slides up via the shared bottom
 * motion preset, and drives open state controlled (`open`/`onOpenChange`) or uncontrolled
 * (`defaultOpen`). `height` sets how much of the screen it docks over: growing to its content
 * by default, growing to it under Framer Motion and up to the whole screen with `fit`, or
 * fixed at half or the whole of it. Resolves the surface variant against the enclosing Glass provider and opens
 * a Density cascade at the resolved `size` so descendants scale in step. Compose
 * `<DrawerTrigger>`, `<DrawerClose>`, and the slot family (`<DrawerHeader>`, `<DrawerTitle>`,
 * `<DrawerDescription>`, `<DrawerBody>`, `<DrawerFooter>`) within.
 *
 * @remarks
 * A registered `<DrawerTitle>` supplies `aria-labelledby` and takes precedence over the
 * `aria-label` fallback. The panel stops click propagation to keep the portal's synthetic clicks
 * off the consumer ancestors it renders under — the backdrop is a sibling, so a panel click never
 * reaches its dismiss handler anyway — and shares a single open-state setter with its dismiss
 * affordances via `PanelProviders`.
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
	'aria-label': ariaLabel,
}: DrawerProps) {
	// Controlled when `open` is passed; otherwise uncontrolled from `defaultOpen`.
	const [resolvedOpen = false, setOpen] = useControllable<boolean>({
		value: open,
		defaultValue: defaultOpen ?? false,
		onValueChange: (next) => onOpenChange?.(next ?? false),
	})

	const resolvedSurface = useResolvedSurface(glass)

	// The panel unmounts while closed (`PresencePortal`), so the flag has to be scoped to
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

	// The gesture is held here, by the component that owns the panel it writes to.
	// A pixel height means nothing off the screen it was set on, so it stays in
	// here — there is nothing for a consumer to hold.
	const resize = usePanelResize({
		side: 'bottom',
		open: resolvedOpen,
		onDismiss: () => setOpen(false),
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

	const { ariaProps, a11y } = useA11yPanel()

	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

	return (
		<Overlay
			open={resolvedOpen}
			onOpenChange={setOpen}
			initialFocus={initialFocus}
			animateOnMount={animateOnMount}
			className={k.backdrop({ surface: resolvedSurface, desaturate })}
		>
			<motion.div
				{...k.motion}
				// After the preset spread, so it overrides the preset's own `initial`.
				initial={animateEnter ? k.motion.initial : false}
				onAnimationComplete={onAnimationComplete}
				ref={panelRef}
				{...ariaProps}
				aria-label={ariaProps['aria-labelledby'] ? undefined : ariaLabel}
				data-slot="drawer"
				data-size={resolvedSize}
				data-height={height ?? 'auto'}
				// Opens the glass cascade to the panel's contents: `hannou.glassItem`
				// keys on `group-data-[glass]/glass`, which needs the named group and
				// the attribute on one element. Rows inside take their hover wash at
				// double strength, because 5% under the panel's own translucency reads
				// as no hover at all.
				data-glass={dataAttr(resolvedSurface === 'glass')}
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
				className={cn(
					'group/drawer',
					resolvedSurface === 'glass' && 'group/glass',
					k.panel({ surface: resolvedSurface, height }),
					className,
				)}
			>
				<PanelProviders onOpenChange={setOpen} a11y={a11y}>
					{handle ? <DrawerHandle handleProps={resize.handleProps} covers={resize.covers} /> : null}

					<Density scale={resolvedSize}>{children}</Density>
				</PanelProviders>
			</motion.div>
		</Overlay>
	)
}
