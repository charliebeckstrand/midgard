'use client'

import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { k } from '../../recipes/kata/accordion'
import { Icon } from '../icon'
import { useAccordion, useAccordionItem } from './context'

/**
 * Props for {@link AccordionTrigger}. The item owns `disabled`, so the trigger
 * takes no `disabled` of its own: set it on the {@link AccordionItem}.
 */
export type AccordionTriggerProps = Omit<ComponentProps<'button'>, 'disabled'> & {
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
	onKeyDown,
	...props
}: AccordionTriggerProps) {
	const { onTriggerKeyDown } = useAccordion()
	const { toggle, disabled, triggerProps } = useAccordionItem()

	// Tailwind preflight zeroes heading font and margin; the wrapper is
	// invisible chrome required by the WAI-ARIA accordion pattern.
	const Heading = `h${level}` as const

	return (
		<Heading data-slot="accordion-heading" className="m-0">
			<button
				// Consumer props spread first; the type, the data-slot, the ARIA wiring of
				// the item, and its disabled state below take precedence.
				{...props}
				type="button"
				data-slot="accordion-trigger"
				{...triggerProps}
				disabled={disabled}
				// The toggle is the activation the trigger exists to perform, so a
				// consumer's preventDefault() does not cancel it (CONVENTIONS.md §3.9).
				onClick={composeEventHandlers(onClick, toggle, { checkForDefaultPrevented: false })}
				// Roving is a keyboard model that no consumer switches off, so a
				// consumer's preventDefault() does not cancel it either.
				onKeyDown={composeEventHandlers(onKeyDown, onTriggerKeyDown, {
					checkForDefaultPrevented: false,
				})}
				className={cn(k.trigger, className)}
			>
				<span className="flex-1">{children}</span>
				<Icon icon={<ChevronDown />} className={cn(k.indicator)} />
			</button>
		</Heading>
	)
}
