'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useOpenChange } from '../../hooks/use-open-change'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { Hold, useMountHold } from '../../primitives/mount'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k } from '../../recipes/kata/collapse'
import { useCollapseContext } from './context'

/** Props for {@link CollapsePanel}. */
export type CollapsePanelProps = {
	children: ReactNode
	className?: string
}

/**
 * Collapsible content region for the {@link Collapse} compound API. Reads
 * `open`, the resolved `animate` mode, and the `mount` policy from context,
 * animating height (plus opacity for `'fade'`) via `AnimatePresence`; the
 * `false` mode renders synchronously without motion. Honors reduced-motion.
 *
 * @remarks
 * Under the default `mount="active"` the panel unmounts while closed, so
 * reopening resets its state. `always` and `lazy` instead hold it in
 * `<Activity mode="hidden">` — state preserved, effects torn down. A held panel
 * stays mounted, so it animates between its open and closed states in place
 * rather than entering and exiting, and drops into the hold only once the
 * closing height transition lands; `display: none` cannot animate, so the hold
 * has to wait for it.
 */
export function CollapsePanel({ children, className }: CollapsePanelProps) {
	const { open, animate, mount, onOpenComplete, panelProps } = useCollapseContext()

	const hold = useMountHold(open, mount, { defer: animate !== false })

	const variant = animate === true || animate === 'fade' ? 'fade' : animate

	// The arrival target the motion library hands back on the way in, compared by
	// identity. Presets are module constants, so the identity holds; `false` has no
	// motion and reports from the effect below instead.
	const { onAnimationComplete } = useOpenComplete(
		open,
		variant === false ? undefined : k.motion[variant].animate,
		onOpenComplete,
	)

	// No transition to land, so the open itself is the arrival. Routed through the
	// transition watcher rather than an `open` effect, so a panel that mounts already
	// open announces nothing — the contract the animated branches keep for free,
	// because the motion library plays no entrance on mount.
	useOpenChange(open, (next) => {
		if (variant === false && next) onOpenComplete?.()
	})

	// The panel's identity — element, a11y wiring, classes — is one shape across
	// every branch below; only how it animates (or whether it does) differs.
	const section = (motionProps: object) => (
		<motion.section
			{...panelProps}
			data-slot="collapse-panel"
			{...motionProps}
			className={cn(k.panel, className)}
		>
			{children}
		</motion.section>
	)

	// Tested on `variant` rather than `animate`, though the two agree: `variant` is what
	// indexes the preset below, so narrowing it here is what lets the rest read it.
	if (variant === false) {
		if (!hold.present) return null

		return (
			<Hold hold={hold} name="collapse-panel">
				<section {...panelProps} data-slot="collapse-panel" className={cn(k.panel, className)}>
					{children}
				</section>
			</Hold>
		)
	}

	// `active` unmounts the closed panel, so its exit rides `AnimatePresence` and
	// the recipe's enter/exit pair applies as written.
	if (!hold.held) {
		return (
			<ReducedMotion>
				<AnimatePresence initial={false}>
					{open && section({ ...k.motion[variant], onAnimationComplete })}
				</AnimatePresence>
			</ReducedMotion>
		)
	}

	if (!hold.present) return null

	return (
		<ReducedMotion>
			<Hold hold={hold} name="collapse-panel">
				{section({
					// A `lazy` panel mounts on its first open, so it enters from the
					// closed state; an `always` panel is present from the start and
					// takes its open-or-closed state without playing anything.
					initial: mount === 'lazy' ? k.motion[variant].initial : false,
					// Held, so it animates between the two states in place rather than
					// entering and exiting — no `exit`, which only `AnimatePresence` reads.
					animate: open ? k.motion[variant].animate : k.motion[variant].exit,
					transition: k.motion[variant].transition,
					// Both landings arrive here. `rest` ignores the one that lands while
					// open — the entrance — and `onAnimationComplete` reports only that
					// one, so the pair splits the close and the open between them.
					onAnimationComplete: (definition: unknown) => {
						hold.rest()

						onAnimationComplete(definition)
					},
				})}
			</Hold>
		</ReducedMotion>
	)
}
