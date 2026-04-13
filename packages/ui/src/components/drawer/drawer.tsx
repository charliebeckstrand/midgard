'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { cn, createContext } from '../../core'
import { useSwipeDismiss } from '../../hooks'
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
	const swipeRef = useSwipeDismiss('bottom', onClose)

	return (
		<Overlay
			open={open}
			onClose={onClose}
			className={drawerBackdropVariants({ glass: resolvedGlass })}
		>
			<motion.div
				ref={swipeRef}
				{...ugoki.panel.bottom}
				role="dialog"
				aria-modal="true"
				data-slot="drawer"
				onClick={(e) => e.stopPropagation()}
				className={cn(drawerPanelVariants({ glass: resolvedGlass }), className)}
			>
				<div
					aria-hidden="true"
					className="mx-auto mt-3 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-current opacity-20"
				/>
				<DrawerProvider value={{ onClose }}>{children}</DrawerProvider>
			</motion.div>
		</Overlay>
	)
}
