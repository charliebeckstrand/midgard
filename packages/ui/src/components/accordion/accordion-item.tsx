'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { AccordionItemProvider, useAccordionRoot } from './context'
import { accordionItemVariants } from './variants'

// ── AccordionItem ───────────────────────────────────────

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
	const root = useAccordionRoot()

	const open = root.isOpen(value)

	const toggle = useCallback(() => {
		if (!disabled) root.toggle(value)
	}, [disabled, root, value])

	const ctx = useMemo(() => ({ value, open, toggle, disabled }), [value, open, toggle, disabled])

	return (
		<AccordionItemProvider value={ctx}>
			<div
				data-slot="accordion-item"
				data-open={open || undefined}
				className={cn(accordionItemVariants({ variant: root.variant }), className)}
			>
				{children}
			</div>
		</AccordionItemProvider>
	)
}
