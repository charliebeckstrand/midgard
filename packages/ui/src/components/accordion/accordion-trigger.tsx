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

	// Tailwind preflight zeroes heading font and margin; the wrapper is invisible
	// chrome that satisfies the WAI-ARIA accordion heading requirement.
	const Heading = `h${level}` as const

	return (
		<Heading data-slot="accordion-heading" className="m-0">
			<button
				type="button"
				data-slot="accordion-trigger"
				{...triggerProps}
				disabled={disabled}
				onClick={(e) => {
					toggle()
					onClick?.(e)
				}}
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
