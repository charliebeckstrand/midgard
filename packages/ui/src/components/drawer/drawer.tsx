'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { cn, createContext } from '../../core'
import { Overlay } from '../../primitives'
import { ugoki } from '../../recipes'
import { useGlass } from '../glass/context'
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

export function Drawer({ open, onClose, glass, className, children }: DrawerProps) {
	const glassContext = useGlass()
	const resolvedGlass = glass ?? glassContext
	return (
		<Overlay
			open={open}
			onClose={onClose}
			className={drawerBackdropVariants({ glass: resolvedGlass })}
		>
			<motion.div
				{...ugoki.panel.bottom}
				role="dialog"
				aria-modal="true"
				data-slot="drawer"
				onClick={(e) => e.stopPropagation()}
				className={cn(drawerPanelVariants({ glass: resolvedGlass }), className)}
			>
				<DrawerProvider value={{ onClose }}>{children}</DrawerProvider>
			</motion.div>
		</Overlay>
	)
}
