'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useCallback, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { Overlay, PanelA11yProvider, usePanelA11yScope } from '../../primitives'
import { ugoki } from '../../recipes'
import { useGlass } from '../glass/context'
import { type DrawerPanelVariants, drawerBackdropVariants, drawerPanelVariants } from './variants'

type DrawerContextValue = {
	close: () => void
}

export const [DrawerProvider, useDrawerContext] = createContext<DrawerContextValue>('Drawer')

export type DrawerProps = DrawerPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	className?: string
	children: React.ReactNode
}

export function Drawer({ open, onOpenChange, glass, className, children }: DrawerProps) {
	const glassContext = useGlass()

	const resolvedGlass = glass ?? glassContext

	const { panelAriaProps, providerValue } = usePanelA11yScope()

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const contextValue = useMemo(() => ({ close }), [close])

	return (
		<Overlay
			open={open}
			onOpenChange={onOpenChange}
			className={drawerBackdropVariants({ glass: resolvedGlass })}
		>
			<motion.div
				{...ugoki.panel.bottom}
				{...panelAriaProps}
				data-slot="drawer"
				onClick={(e) => e.stopPropagation()}
				className={cn(drawerPanelVariants({ glass: resolvedGlass }), className)}
			>
				<DrawerProvider value={contextValue}>
					<PanelA11yProvider value={providerValue}>{children}</PanelA11yProvider>
				</DrawerProvider>
			</motion.div>
		</Overlay>
	)
}
