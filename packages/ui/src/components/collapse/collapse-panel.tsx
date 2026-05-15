'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core/cn'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { ugoki } from '../../recipes'
import { k } from '../../recipes/kata/collapse'
import { useCollapseContext } from './context'

export type CollapsePanelProps = {
	children: ReactNode
	className?: string
}

export function CollapsePanel({ children, className }: CollapsePanelProps) {
	const { open, animate, triggerId, panelId } = useCollapseContext()

	if (animate === false) {
		return open ? (
			<section
				id={panelId}
				aria-labelledby={triggerId}
				data-slot="collapse-panel"
				className={cn(k.panel, className)}
			>
				{children}
			</section>
		) : null
	}

	const variant = animate === true || animate === 'fade' ? 'fade' : animate

	return (
		<ReducedMotion>
			<AnimatePresence initial={false}>
				{open && (
					<motion.section
						id={panelId}
						aria-labelledby={triggerId}
						data-slot="collapse-panel"
						{...ugoki.collapse[variant]}
						className={cn(k.panel, className)}
					>
						{children}
					</motion.section>
				)}
			</AnimatePresence>
		</ReducedMotion>
	)
}
