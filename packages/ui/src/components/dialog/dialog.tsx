'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { cn, useIsDesktop } from '../../core'
import { Overlay } from '../../primitives'
import { ugoki } from '../../recipes'
import { type DialogPanelVariants, dialogPanelVariants } from './variants'

export type DialogProps = DialogPanelVariants & {
	open: boolean
	onClose: () => void
	outsideClick?: boolean
	className?: string
	children: React.ReactNode
}

export function Dialog({
	open,
	onClose,
	outsideClick = true,
	size,
	className,
	children,
}: DialogProps) {
	const isDesktop = useIsDesktop()

	return (
		<Overlay open={open} onClose={onClose} outsideClick={outsideClick}>
			<div className="pointer-events-none fixed inset-0 flex min-h-full items-end sm:items-center sm:justify-center sm:p-4">
				<motion.div
					{...(isDesktop ? ugoki.popover : ugoki.panel.bottom)}
					role="dialog"
					aria-modal="true"
					data-slot="dialog"
					className={cn('pointer-events-auto', dialogPanelVariants({ size }), className)}
				>
					{children}
				</motion.div>
			</div>
		</Overlay>
	)
}
