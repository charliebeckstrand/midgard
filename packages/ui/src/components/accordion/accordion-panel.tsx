'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { Hold, useMountHold } from '../../primitives/mount'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k } from '../../recipes/kata/accordion'
import { useAccordion, useAccordionItem } from './context'

/** Props for {@link AccordionPanel}. */
export type AccordionPanelProps = {
	className?: string
	children: ReactNode
}

/**
 * Collapsible region revealed by its {@link AccordionTrigger}. Animates
 * height/opacity via `AnimatePresence`, honoring reduced-motion.
 *
 * @remarks
 * Carries `role="region"` for assistive tech. `className` lands on the inner body
 * element, not the animated wrapper.
 *
 * Under the accordion's default `mount="active"` the panel is mounted only while
 * open, so reopening resets its state. `always` and `lazy` instead hold it in
 * `<Activity mode="hidden">` — state preserved, effects torn down — where it
 * animates between its open and closed states in place and drops into the hold
 * once the closing height transition lands.
 *
 * @see {@link AccordionTrigger}
 */
export function AccordionPanel({ className, children }: AccordionPanelProps) {
	const { value, open, panelProps } = useAccordionItem()

	const { mount, onOpenComplete } = useAccordion()

	const hold = useMountHold(open, mount, { defer: true })

	// The arrival target the motion library hands back on the way in, compared by
	// identity; the preset is a module constant, so the identity holds. The section
	// names itself, because the root reports for every section through one callback.
	const { onAnimationComplete } = useOpenComplete(open, k.motion.animate, () =>
		onOpenComplete?.(value),
	)

	// One shape across every branch below; only how it animates differs.
	const panel = (motionProps: object) => (
		<motion.div
			data-slot="accordion-panel"
			{...panelProps}
			role="region"
			{...motionProps}
			className={cn(k.panel)}
		>
			<div className={cn(k.body, className)}>{children}</div>
		</motion.div>
	)

	// `active` unmounts the closed panel, so its exit rides `AnimatePresence` and
	// the recipe's enter/exit pair applies as written.
	if (!hold.held) {
		return (
			<ReducedMotion>
				<AnimatePresence initial={false}>
					{open && panel({ ...k.motion, onAnimationComplete })}
				</AnimatePresence>
			</ReducedMotion>
		)
	}

	if (!hold.present) return null

	return (
		<ReducedMotion>
			<Hold hold={hold} name="accordion-panel">
				{panel({
					// A `lazy` panel mounts on its first open, so it enters from the
					// closed state; an `always` panel is present from the start and takes
					// its open-or-closed state without playing anything.
					initial: mount === 'lazy' ? k.motion.initial : false,
					// Held, so it animates between the two states in place rather than
					// entering and exiting — no `exit`, which only `AnimatePresence` reads.
					animate: open ? k.motion.animate : k.motion.exit,
					transition: k.motion.transition,
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
