'use client'

import { createContext } from '../../core/create-context'
import type { AccordionVariants } from '../../recipes/kata/accordion'

type AccordionContextValue = {
	variant: NonNullable<AccordionVariants['variant']>
	isOpen: (value: string) => boolean
	toggle: (value: string) => void
}

export const [AccordionContext, useAccordion] = createContext<AccordionContextValue>('Accordion')

type AccordionItemContextValue = {
	value: string
	open: boolean
	toggle: () => void
	disabled: boolean
	triggerProps: { id: string; 'aria-controls': string; 'aria-expanded'?: boolean }
	panelProps: { id: string; 'aria-labelledby': string }
}

export const [AccordionItemContext, useAccordionItem] =
	createContext<AccordionItemContextValue>('AccordionItem')
