'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { k } from '../../recipes/kata/accordion'
import { AccordionItemContext, useAccordion } from './context'

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

	// A generated scope per item namespaces the trigger/panel ids, so two
	// accordions sharing an item value no longer collide on a global id.
	const { triggerProps, panelProps } = useA11yDisclosure({ expanded: open })

	const context = useMemo(
		() => ({ value, open, toggle, disabled, triggerProps, panelProps }),
		[value, open, toggle, disabled, triggerProps, panelProps],
	)

	return (
		<AccordionItemContext value={context}>
			<div
				data-slot="accordion-item"
				data-open={open || undefined}
				className={cn(k.item({ variant: accordion.variant }), className)}
			>
				{children}
			</div>
		</AccordionItemContext>
	)
}
