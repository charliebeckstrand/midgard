'use client'

import { motion } from 'motion/react'
import { type ReactNode, type RefObject, useEffect } from 'react'
import { cn } from '../../core'
import { useA11yPanel } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useEnterAnimation } from '../../hooks/use-enter-animation'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { Density, useDensity } from '../../primitives/density'
import { Overlay } from '../../primitives/overlay'
import { PanelProviders } from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import type { Step } from '../../recipes'
import { type DrawerPanelVariants, k } from '../../recipes/kata/drawer'

/** Props for {@link Drawer}: open-state control, density `size` cascade, and accessible naming. */
export type DrawerProps = Omit<DrawerPanelVariants, 'surface'> & {
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
 * (`defaultOpen`). Resolves the surface variant against the enclosing Glass provider and opens
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
				{...ariaProps}
				aria-label={ariaProps['aria-labelledby'] ? undefined : ariaLabel}
				data-slot="drawer"
				data-size={resolvedSize}
				onClick={(event) => event.stopPropagation()}
				className={cn(k.panel({ surface: resolvedSurface }), className)}
			>
				<PanelProviders onOpenChange={setOpen} a11y={a11y}>
					<Density scale={resolvedSize}>{children}</Density>
				</PanelProviders>
			</motion.div>
		</Overlay>
	)
}
