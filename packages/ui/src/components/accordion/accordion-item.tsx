'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { k } from '../../recipes/kata/accordion'
import { AccordionItemContext, useAccordion } from './context'

/** Props for {@link AccordionItem}. */
export type AccordionItemProps = {
	/** Stable key identifying this section within the parent's open set. */
	value: string
	/**
	 * Prevents toggling and removes the trigger from roving-tabindex navigation.
	 * @defaultValue false
	 */
	disabled?: boolean
	className?: string
	children: ReactNode
}

/**
 * A single accordion section. Registers its open state under `value` with the
 * enclosing {@link Accordion} and provides the trigger/panel a11y wiring to its
 * descendants via {@link useAccordionItem}.
 *
 * @see {@link AccordionTrigger}
 * @see {@link AccordionPanel}
 */

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

	// A generated scope per item namespaces the trigger/panel ids.
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
