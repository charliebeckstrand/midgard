'use client'

import { createContext } from '../../core'
import type { A11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
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
	triggerProps: A11yDisclosure['triggerProps']
	panelProps: A11yDisclosure['panelProps']
}

export const [AccordionItemContext, useAccordionItem] =
	createContext<AccordionItemContextValue>('AccordionItem')
