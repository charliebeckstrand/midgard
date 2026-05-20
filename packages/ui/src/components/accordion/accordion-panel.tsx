'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k } from '../../recipes/kata/accordion'
import { useAccordionItem } from './context'

export type AccordionPanelProps = {
	className?: string
	children: ReactNode
}

export function AccordionPanel({ className, children }: AccordionPanelProps) {
	const { open, value } = useAccordionItem()

	return (
		<ReducedMotion>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						data-slot="accordion-panel"
						id={`accordion-panel-${value}`}
						role="region"
						aria-labelledby={`accordion-trigger-${value}`}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2, ease: 'easeInOut' }}
						className={cn(k.panel)}
					>
						<div className={cn(k.body, className)}>{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</ReducedMotion>
	)
}
