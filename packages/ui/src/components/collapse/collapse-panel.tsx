'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core/cn'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k } from '../../recipes/kata/collapse'
import { useCollapseContext } from './context'

export type CollapsePanelProps = {
	children: ReactNode
	className?: string
}

export function CollapsePanel({ children, className }: CollapsePanelProps) {
	const { open, animate, panelProps } = useCollapseContext()

	if (animate === false) {
		return open ? (
			<section {...panelProps} data-slot="collapse-panel" className={cn(k.panel, className)}>
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
						{...panelProps}
						data-slot="collapse-panel"
						{...k.motion[variant]}
						className={cn(k.panel, className)}
					>
						{children}
					</motion.section>
				)}
			</AnimatePresence>
		</ReducedMotion>
	)
}
