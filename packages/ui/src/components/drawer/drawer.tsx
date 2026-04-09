'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { cn, createContext } from '../../core'
import { Overlay } from '../../primitives'
import { ugoki } from '../../recipes'
import { type DrawerPanelVariants, drawerBackdropVariants, drawerPanelVariants } from './variants'

type DrawerContextValue = {
	onClose: () => void
}

export const [DrawerProvider, useDrawerContext] = createContext<DrawerContextValue>('Drawer')

export type DrawerProps = DrawerPanelVariants & {
	open: boolean
	onClose: () => void
	className?: string
	children: React.ReactNode
}

export function Drawer({ open, onClose, glass = false, className, children }: DrawerProps) {
	return (
		<Overlay open={open} onClose={onClose} className={drawerBackdropVariants({ glass })}>
			<motion.div
				{...ugoki.panel.bottom}
				role="dialog"
				aria-modal="true"
				data-slot="drawer"
				onClick={(e) => e.stopPropagation()}
				className={cn(drawerPanelVariants({ glass }), className)}
			>
				<DrawerProvider value={{ onClose }}>{children}</DrawerProvider>
			</motion.div>
		</Overlay>
	)
}
