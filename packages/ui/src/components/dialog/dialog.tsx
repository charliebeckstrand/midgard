'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { cn } from '../../core'
import { Overlay } from '../../primitives'
import { ugoki } from '../../recipes'
import { type DialogPanelVariants, dialogPanelVariants } from './variants'

export type DialogProps = DialogPanelVariants & {
	open: boolean
	onClose: () => void
	className?: string
	children: React.ReactNode
}

export function Dialog({ open, onClose, size, className, children }: DialogProps) {
	return (
		<Overlay open={open} onClose={onClose}>
			<div className="fixed inset-0 flex min-h-full items-center justify-center p-4">
				<motion.div
					{...ugoki.popover}
					role="dialog"
					aria-modal="true"
					data-slot="dialog"
					onClick={(e) => e.stopPropagation()}
					className={cn(dialogPanelVariants({ size }), className)}
				>
					{children}
				</motion.div>
			</div>
		</Overlay>
	)
}
