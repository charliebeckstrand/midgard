'use client'

import { ChevronDown } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/accordion'
import { Icon } from '../icon'
import { useAccordionItem } from './context'

export type AccordionTriggerProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
	children: ReactNode | ((bag: { open: boolean }) => ReactNode)
	/**
	 * Heading level (1–6) of the element wrapping the trigger button. The
	 * WAI-ARIA accordion pattern requires each header button to sit inside a
	 * heading so panels are reachable via heading navigation. @default 3
	 */
	headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}

export function AccordionTrigger({
	className,
	children,
	headingLevel = 3,
	...props
}: AccordionTriggerProps) {
	const { open, toggle, disabled, value } = useAccordionItem()

	// Tailwind preflight zeroes heading font/margin, so the wrapper is invisible
	// chrome that exists only to satisfy the accordion's heading requirement.
	const Heading = `h${headingLevel}` as const

	return (
		<Heading data-slot="accordion-heading" className="m-0">
			<button
				type="button"
				data-slot="accordion-trigger"
				aria-expanded={open}
				aria-controls={`accordion-panel-${value}`}
				id={`accordion-trigger-${value}`}
				disabled={disabled}
				onClick={toggle}
				className={cn(k.trigger, className)}
				{...props}
			>
				<span className="flex-1">
					{typeof children === 'function' ? children({ open }) : children}
				</span>
				<Icon icon={<ChevronDown />} className={cn(k.indicator)} />
			</button>
		</Heading>
	)
}
