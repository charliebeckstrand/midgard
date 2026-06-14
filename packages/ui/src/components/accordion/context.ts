'use client'

import { createContext } from '../../core'
import type { A11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import type { AccordionVariants } from '../../recipes/kata/accordion'

type AccordionContextValue = {
	variant: NonNullable<AccordionVariants['variant']>
	isOpen: (value: string) => boolean
	toggle: (value: string) => void
}

/**
 * Reads the enclosing {@link Accordion} context: resolved `variant` plus the
 * shared `isOpen`/`toggle` operating on the open set. Throws outside an accordion.
 * @internal
 */
export const [AccordionContext, useAccordion] = createContext<AccordionContextValue>('Accordion')

type AccordionItemContextValue = {
	value: string
	open: boolean
	toggle: () => void
	disabled: boolean
	triggerProps: A11yDisclosure['triggerProps']
	panelProps: A11yDisclosure['panelProps']
}

/**
 * Reads the enclosing {@link AccordionItem} context: open state, toggle, and the
 * disclosure a11y props for wiring a custom trigger/panel. Throws outside an item.
 */
export const [AccordionItemContext, useAccordionItem] =
	createContext<AccordionItemContextValue>('AccordionItem')
