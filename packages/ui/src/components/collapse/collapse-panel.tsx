'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
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
	const { open, animate, mount, panelProps } = useCollapseContext()

	const hold = useMountHold(open, mount, { defer: animate !== false })

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

	if (animate === false) {
		if (!hold.present) return null

		return (
			<Hold hold={hold} name="collapse-panel">
				<section {...panelProps} data-slot="collapse-panel" className={cn(k.panel, className)}>
					{children}
				</section>
			</Hold>
		)
	}

	const variant = animate === true || animate === 'fade' ? 'fade' : animate

	// `active` unmounts the closed panel, so its exit rides `AnimatePresence` and
	// the recipe's enter/exit pair applies as written.
	if (!hold.held) {
		return (
			<ReducedMotion>
				<AnimatePresence initial={false}>{open && section(k.motion[variant])}</AnimatePresence>
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
					// `rest` ignores a landing that arrives while open, so the entrance
					// passes through without a guard here.
					onAnimationComplete: hold.rest,
				})}
			</Hold>
		</ReducedMotion>
	)
}
