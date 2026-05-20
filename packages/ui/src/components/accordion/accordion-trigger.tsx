'use client'

import { ChevronDown } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/accordion'
import { Icon } from '../icon'
import { useAccordionItem } from './context'

export type AccordionTriggerProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
	children: ReactNode | ((bag: { open: boolean }) => ReactNode)
}

export function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
	const { open, toggle, disabled, value } = useAccordionItem()

	return (
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
	)
}
