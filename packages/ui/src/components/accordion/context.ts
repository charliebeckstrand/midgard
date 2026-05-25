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
}

export const [AccordionItemContext, useAccordionItem] =
	createContext<AccordionItemContextValue>('AccordionItem')
