'use client'

import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core/cn'
import { ugoki } from '../../recipes'
import { useCollapseContext } from './context'
import { k } from './variants'

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
	)
}
