'use client'

import { AnimatePresence } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { MountHold, useMountHold } from '../../primitives/mount'
import { heldMotionProps } from '../../primitives/mount/mount-held-motion'
import { ReducedMotion } from '../../primitives/reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
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
 * Carries `role="region"`, named by its header button, unless the accordion
 * sets `region={false}`. `className` lands on the inner body element, not the
 * animated wrapper.
 *
 * The panel adds nothing to the intrinsic width of the accordion. In a host that
 * fits its content, such as a popover, the accordion thus keeps one width while
 * a section opens. The panel text wraps at that width. Content that cannot wrap,
 * such as a wide table, needs a width on the accordion.
 *
 * The panel clips its content only while its height moves. At rest, a focus
 * ring or a shadow at the edge of the content shows in full.
 *
 * Under the accordion's default `mount="active"` the panel is mounted only while
 * open, so reopening resets its state. `always` and `lazy` instead hold it in
 * `<Activity mode="hidden">`, with state preserved and effects torn down. There
 * it animates between its open and closed states in place, and drops into the
 * hold once the closing height transition lands.
 *
 * @see {@link AccordionTrigger}
 */
export function AccordionPanel({ className, children }: AccordionPanelProps) {
	const { value, open, panelProps } = useAccordionItem()

	const { mount, region, onOpenComplete } = useAccordion()

	// Without the region, the panel keeps only the id that its header button's
	// `aria-controls` points to.
	const a11yProps = region ? { ...panelProps, role: 'region' } : { id: panelProps.id }

	const hold = useMountHold(open, mount, { defer: true })

	// The arrival target the motion library hands back on the way in, compared by
	// identity; the preset is a module constant, so the identity holds. The section
	// names itself, because the root reports for every section through one callback.
	const { onAnimationComplete } = useOpenComplete(open, k.motion.animate, () =>
		onOpenComplete?.(value),
	)

	// One shape across every branch below; only how it animates differs.
	const panel = (motionProps: object) => (
		<m.div data-slot="accordion-panel" {...a11yProps} {...motionProps} className={cn(k.panel)}>
			<div className={cn(k.body, className)}>{children}</div>
		</m.div>
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
			<MountHold hold={hold} name="accordion-panel">
				{panel(heldMotionProps(k.motion, open, hold, onAnimationComplete))}
			</MountHold>
		</ReducedMotion>
	)
}
