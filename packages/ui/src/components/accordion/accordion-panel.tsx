'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useRef } from 'react'
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

	// Frozen at mount: whether this section started open decides its motion entry point,
	// and a held panel reads that long after the value has moved on.
	const mountedOpen = useRef(open)

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
					// Keyed on the state this section mounted in, not on the policy. Motion
					// reads `initial` at its first `animateChanges`, which a held panel
					// defers until its first reveal — so `false` there suppresses the
					// reveal rather than the mount, leaving the section shut and its
					// landing unreported. A section that mounted open instead matches
					// `initial` to the target, which is the other arm of the same guard,
					// so it still takes its open state without playing anything.
					initial: mountedOpen.current ? k.motion.animate : k.motion.initial,
					// Held, so it animates between the two states in place rather than
					// entering and exiting — no `exit`, which only `AnimatePresence` reads.
					animate: open ? k.motion.animate : k.motion.exit,
					transition: k.motion.transition,
					// Both landings arrive here: `rest` takes the close, the gate takes
					// the open.
					onAnimationComplete: (definition: unknown) => {
						hold.rest()

						onAnimationComplete(definition)
					},
				})}
			</Hold>
		</ReducedMotion>
	)
}
