'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { cn, createContext } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { Overlay, PanelA11yProvider } from '../../primitives'
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
	const scope = useIdScope()
	const titleId = scope.sub('title')
	const descriptionId = scope.sub('description')

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
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				data-slot="drawer"
				onClick={(e) => e.stopPropagation()}
				className={cn(drawerPanelVariants({ glass: resolvedGlass }), className)}
			>
				<DrawerProvider value={{ onClose }}>
					<PanelA11yProvider value={{ titleId, descriptionId }}>{children}</PanelA11yProvider>
				</DrawerProvider>
			</motion.div>
		</Overlay>
	)
}
