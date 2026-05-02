'use client'

import { motion } from 'motion/react'
import { type CSSProperties, type ReactNode, useCallback, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { Overlay, PanelA11yProvider, usePanelA11yScope } from '../../primitives'
import { ugoki } from '../../recipes'
import { type Step, sun } from '../../recipes/ryu/sun'
import { ConcentricContext } from '../concentric/context'
import { useGlass } from '../glass/context'
import { type DrawerPanelVariants, drawerBackdropVariants, drawerPanelVariants } from './variants'

type DrawerContextValue = {
	close: () => void
}

export const [DrawerProvider, useDrawerContext] = createContext<DrawerContextValue>('Drawer')

export type DrawerProps = DrawerPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** Size step that propagates to descendants via the concentric context. */
	size?: Step
	glass?: boolean
	className?: string
	children: ReactNode
}

export function Drawer({
	open,
	onOpenChange,
	surface,
	size = 'md',
	glass,
	className,
	children,
}: DrawerProps) {
	const glassContext = useGlass()

	const resolvedSurface = surface ?? (glass || glassContext ? 'glass' : undefined)

	const { panelAriaProps, providerValue } = usePanelA11yScope()

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const contextValue = useMemo(() => ({ close }), [close])

	const concentricValue = useMemo(() => ({ size }), [size])

	const style: CSSProperties = {
		'--ui-radius-inner': `var(--radius-${sun[size].radius})`,
		'--ui-padding': `calc(var(--spacing) * ${sun[size].space})`,
		'--ui-gap': `calc(var(--spacing) * ${sun[size].gap})`,
	} as CSSProperties

	return (
		<Overlay
			open={open}
			onOpenChange={onOpenChange}
			className={drawerBackdropVariants({ surface: resolvedSurface })}
		>
			<motion.div
				{...ugoki.panel.bottom}
				{...panelAriaProps}
				data-slot="drawer"
				data-step={size}
				style={style}
				onClick={(e) => e.stopPropagation()}
				className={cn(drawerPanelVariants({ surface: resolvedSurface }), className)}
			>
				<DrawerProvider value={contextValue}>
					<PanelA11yProvider value={providerValue}>
						<ConcentricContext.Provider value={concentricValue}>
							{children}
						</ConcentricContext.Provider>
					</PanelA11yProvider>
				</DrawerProvider>
			</motion.div>
		</Overlay>
	)
}
