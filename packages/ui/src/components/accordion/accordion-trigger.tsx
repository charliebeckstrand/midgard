'use client'

import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { mountsEveryPanel } from '../../primitives/mount'
import { k } from '../../recipes/kata/accordion'
import { Icon } from '../icon'
import { useAccordion, useAccordionItem } from './context'

/** Props for {@link AccordionTrigger}. */
export type AccordionTriggerProps = ComponentProps<'button'> & {
	/**
	 * Heading level (1-6) of the element wrapping the trigger button. The
	 * WAI-ARIA accordion pattern requires each header button to sit inside a
	 * heading.
	 * @defaultValue 3
	 */
	level?: 1 | 2 | 3 | 4 | 5 | 6
}

/**
 * Header button that toggles its {@link AccordionItem}. Wraps itself in an
 * `h{level}` element and renders a rotating chevron indicator, per the WAI-ARIA
 * accordion pattern. Is a Tab stop, and takes part in the parent's arrow-key
 * navigation.
 *
 * @see {@link Accordion}
 * @see {@link AccordionPanel}
 */
export function AccordionTrigger({
	className,
	children,
	level = 3,
	onClick,
	...props
}: AccordionTriggerProps) {
	const { mount } = useAccordion()
	const { open, toggle, disabled, triggerProps } = useAccordionItem()

	// Tailwind preflight zeroes heading font and margin; the wrapper is
	// invisible chrome required by the WAI-ARIA accordion pattern.
	const Heading = `h${level}` as const

	return (
		<Heading data-slot="accordion-heading" className="m-0">
			<button
				// Consumer props spread first; the type, a11y id wiring,
				// context-driven disabled, and data-slot below take precedence.
				{...props}
				type="button"
				data-slot="accordion-trigger"
				{...triggerProps}
				// The reference needs its target id in the DOM. An open panel is
				// present, and a closed panel is present only under `mount="always"`.
				aria-controls={open || mountsEveryPanel(mount) ? triggerProps['aria-controls'] : undefined}
				disabled={disabled}
				// The toggle is the activation the trigger exists to perform, so a
				// consumer's preventDefault() does not cancel it (CONVENTIONS.md §3.9).
				onClick={composeEventHandlers(onClick, toggle, { checkForDefaultPrevented: false })}
				className={cn(k.trigger, className)}
			>
				<span className="flex-1">{children}</span>
				<Icon icon={<ChevronDown />} className={cn(k.indicator)} />
			</button>
		</Heading>
	)
}
