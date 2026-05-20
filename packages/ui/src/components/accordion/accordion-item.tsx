'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { item } from '../../recipes/kata/accordion'
import { AccordionItemProvider, useAccordion } from './context'

export type AccordionItemProps = {
	value: string
	disabled?: boolean
	className?: string
	children: ReactNode
}

export function AccordionItem({
	value,
	disabled = false,
	className,
	children,
}: AccordionItemProps) {
	const accordion = useAccordion()

	const open = accordion.isOpen(value)

	const toggle = useCallback(() => {
		if (!disabled) accordion.toggle(value)
	}, [disabled, accordion, value])

	const context = useMemo(
		() => ({ value, open, toggle, disabled }),
		[value, open, toggle, disabled],
	)

	return (
		<AccordionItemProvider value={context}>
			<div
				data-slot="accordion-item"
				data-open={open || undefined}
				className={cn(item({ variant: accordion.variant }), className)}
			>
				{children}
			</div>
		</AccordionItemProvider>
	)
}
