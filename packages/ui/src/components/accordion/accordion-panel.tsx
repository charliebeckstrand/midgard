'use client'

import type { ComponentProps, ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import { useOpenComplete } from '../../hooks/use-open-complete'
import { useMountHold } from '../../primitives/mount'
import { MountPresence } from '../../primitives/mount/mount-presence'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../recipes/kata/accordion'
import { useAccordion, useAccordionItem } from './context'

/**
 * Props for {@link AccordionPanel}. The animated `<div>` of the panel takes the
 * rest, except the keys that Motion gives a meaning of its own.
 */
export type AccordionPanelProps = Omit<
	ComponentProps<'div'>,
	'children' | 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'
> & {
	children: ReactNode
}

/**
 * Collapsible region revealed by its {@link AccordionTrigger}. Animates
 * height/opacity via `AnimatePresence`, honoring reduced-motion.
 *
 * @remarks
 * Carries `role="region"`, named by its header button, unless the accordion
 * sets `region={false}`. `className` lands on the inner body element, not the
 * animated wrapper. The other props land on the wrapper, which stamps
 * `data-open` while the section is open.
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
export function AccordionPanel({ className, children, ...props }: AccordionPanelProps) {
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

	// One shape for the unheld and the held panel; only how it animates differs.
	// The consumer props spread first, so the wiring of the item and the motion
	// win.
	const panel = (motionProps: object) => (
		<m.div
			{...props}
			// The item reads this anchor, so it comes after the spread (CONVENTIONS.md §3.9).
			data-slot="accordion-panel"
			{...a11yProps}
			{...motionProps}
			data-open={dataAttr(open)}
			className={cn(k.panel)}
		>
			<div className={cn(k.body, className)}>{children}</div>
		</m.div>
	)

	return (
		<MountPresence
			open={open}
			hold={hold}
			preset={k.motion}
			name="accordion-panel"
			onAnimationComplete={onAnimationComplete}
		>
			{panel}
		</MountPresence>
	)
}
