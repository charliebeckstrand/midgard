'use client'

import { createContext } from '../../core/create-context'
import type { AccordionVariants } from './variants'

export type AccordionRootContextValue = {
	variant: NonNullable<AccordionVariants['variant']>
	isOpen: (value: string) => boolean
	toggle: (value: string) => void
}

export const [AccordionRootProvider, useAccordionRoot] =
	createContext<AccordionRootContextValue>('Accordion')

export type AccordionItemContextValue = {
	value: string
	open: boolean
	toggle: () => void
	disabled: boolean
}

export const [AccordionItemProvider, useAccordionItem] =
	createContext<AccordionItemContextValue>('AccordionItem')
