'use client'

import { ChevronDown } from 'lucide-react'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/accordion'
import { Icon } from '../icon'
import { useAccordionItem } from './context'

export type AccordionTriggerProps = ComponentPropsWithoutRef<'button'> & {
	/**
	 * Heading level (1-6) of the element wrapping the trigger button. The
	 * WAI-ARIA accordion pattern requires each header button to sit inside a
	 * heading. @default 3
	 */
	level?: 1 | 2 | 3 | 4 | 5 | 6
}

export function AccordionTrigger({
	className,
	children,
	level = 3,
	onClick,
	...props
}: AccordionTriggerProps) {
	const { open, toggle, disabled, triggerProps } = useAccordionItem()

	// Tailwind preflight zeroes heading font and margin; the wrapper is
	// invisible chrome required by the WAI-ARIA accordion pattern.
	const Heading = `h${level}` as const

	return (
		<Heading data-slot="accordion-heading" className="m-0">
			<button
				type="button"
				// Consumer props spread first; the a11y id wiring, roving tabindex,
				// context-driven disabled, and data-slot below take precedence.
				{...props}
				data-slot="accordion-trigger"
				{...triggerProps}
				// The panel unmounts while closed (AnimatePresence); the reference
				// is set only while its target id exists.
				aria-controls={open ? triggerProps['aria-controls'] : undefined}
				disabled={disabled}
				onClick={(e) => {
					toggle()
					onClick?.(e)
				}}
				className={cn(k.trigger, className)}
			>
				<span className="flex-1">{children}</span>
				<Icon icon={<ChevronDown />} className={cn(k.indicator)} />
			</button>
		</Heading>
	)
}
