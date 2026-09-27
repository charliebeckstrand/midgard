'use client'

import { type ReactNode, useCallback, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { useKeyedValue } from '../../hooks/use-keyed-store'
import { k } from '../../recipes/kata/accordion'
import { AccordionItemContext, useAccordion } from './context'

/** Props for {@link AccordionItem}. */
export type AccordionItemProps = {
	/** Stable key identifying this section within the parent's open set. */
	value: string
	/**
	 * Prevents toggling, and removes the trigger from the Tab sequence and from
	 * arrow-key navigation.
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
	const { variant, openStore, toggle: toggleValue } = useAccordion()

	// The item reads its own value, so a toggle renders only the items that open
	// or close.
	const open = useKeyedValue(openStore, value)

	const toggle = useCallback(() => {
		if (!disabled) toggleValue(value)
	}, [disabled, toggleValue, value])

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
				data-open={dataAttr(open)}
				className={cn(k.item({ variant }), className)}
			>
				{children}
			</div>
		</AccordionItemContext>
	)
}
