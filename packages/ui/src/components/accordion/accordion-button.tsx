'use client'

import { ChevronDown } from 'lucide-react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { cn } from '../../core'
import { Icon } from '../icon'
import { useAccordionItem } from './context'
import { k } from './variants'

// ── AccordionButton ─────────────────────────────────────

export type AccordionButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'children'> & {
	children: ReactNode | ((bag: { open: boolean }) => ReactNode)
}

export function AccordionButton({ className, children, ...props }: AccordionButtonProps) {
	const { open, toggle, disabled, value } = useAccordionItem()

	return (
		<button
			type="button"
			data-slot="accordion-button"
			aria-expanded={open}
			aria-controls={`accordion-panel-${value}`}
			id={`accordion-button-${value}`}
			disabled={disabled}
			onClick={toggle}
			className={cn(k.button, className)}
			{...props}
		>
			<span className="flex-1">
				{typeof children === 'function' ? children({ open }) : children}
			</span>
			<Icon icon={<ChevronDown />} className={cn(k.indicator)} />
		</button>
	)
}
