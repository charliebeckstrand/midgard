'use client'

import { type ComponentProps, type ReactNode, useCallback, useMemo } from 'react'
import { ariaAttr, cn, dataAttr } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { useKeyedValue } from '../../hooks/use-keyed-value'
import { useMountsEveryPanel } from '../../primitives/mount'
import { k } from '../../recipes/kata/accordion'
import { AccordionItemContext, useAccordion } from './context'

/** Props for {@link AccordionItem}. The `<div>` of the item takes the rest. */
export type AccordionItemProps = Omit<ComponentProps<'div'>, 'children'> & {
	/** Stable key identifying this section within the parent's open set. */
	value: string
	/**
	 * Prevents toggling, and removes the trigger from the Tab sequence and from
	 * arrow-key navigation.
	 * @defaultValue false
	 */
	disabled?: boolean
	children: ReactNode
}

/**
 * A single accordion section. Registers its open state under `value` with the
 * enclosing {@link Accordion} and provides the trigger/panel a11y wiring to its
 * descendants via {@link useAccordionItem}. The item stamps `data-open` while it
 * is open, and `data-disabled` while it is disabled.
 *
 * @see {@link AccordionTrigger}
 * @see {@link AccordionPanel}
 */

export function AccordionItem({
	value,
	disabled = false,
	className,
	children,
	...props
}: AccordionItemProps) {
	const { variant, mount, collapsible, openStore, toggle: toggleValue } = useAccordion()

	// The item reads its own value, so a toggle renders only the items that open
	// or close.
	const open = useKeyedValue(openStore, value)

	const toggle = useCallback(() => {
		if (!disabled) toggleValue(value)
	}, [disabled, toggleValue, value])

	// A generated scope per item namespaces the trigger/panel ids.
	const disclosure = useA11yDisclosure({ expanded: open })

	const everyPanel = useMountsEveryPanel(mount)

	// The wiring is whole here, so each reader of `useAccordionItem` gets all of
	// it. A reference needs its target id in the DOM: an open panel is there, and
	// a closed panel only under `mount="always"` after hydration, because the
	// server markup does not hold it. An open section that a toggle cannot close
	// is `aria-disabled`, per the WAI-ARIA accordion pattern.
	const triggerProps = useMemo(
		() => ({
			...disclosure.triggerProps,
			'aria-controls': open || everyPanel ? disclosure.triggerProps['aria-controls'] : undefined,
			'aria-disabled': ariaAttr(open && !collapsible),
		}),
		[disclosure.triggerProps, open, everyPanel, collapsible],
	)

	const { panelProps } = disclosure

	const context = useMemo(
		() => ({ value, open, toggle, disabled, triggerProps, panelProps }),
		[value, open, toggle, disabled, triggerProps, panelProps],
	)

	return (
		<AccordionItemContext value={context}>
			<div
				data-slot="accordion-item"
				{...props}
				data-open={dataAttr(open)}
				data-disabled={dataAttr(disabled)}
				className={cn(k({ variant }).item, className)}
			>
				{children}
			</div>
		</AccordionItemContext>
	)
}
