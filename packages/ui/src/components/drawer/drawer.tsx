'use client'

import { motion } from 'motion/react'
import { type CSSProperties, type ReactNode, useCallback, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { ConcentricProvider, useResolvedSize } from '../../primitives/concentric'
import { Overlay } from '../../primitives/overlay'
import { PanelA11yProvider, usePanelA11yScope } from '../../primitives/panel'
import { ugoki } from '../../recipes'
import {
	type DrawerPanelVariants,
	drawerBackdropVariants,
	drawerPanelVariants,
} from '../../recipes/kata/drawer'
import { type Step, sun } from '../../recipes/ryu/sun'
import { useResolvedSurface } from '../glass/context'

type DrawerContextValue = {
	close: () => void
}

export const [DrawerProvider, useDrawerContext] = createContext<DrawerContextValue>('Drawer')

export type DrawerProps = DrawerPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	/**
	 * Size step that propagates to descendants via the concentric context.
	 * Resolution order: explicit prop, then enclosing concentric size, then `'md'`.
	 */
	size?: Step
	glass?: boolean
	className?: string
	children: ReactNode
}

export function Drawer({
	open,
	onOpenChange,
	surface,
	size,
	glass,
	className,
	children,
}: DrawerProps) {
	const resolvedSurface = useResolvedSurface(surface, glass)

	const { panelAriaProps, providerValue } = usePanelA11yScope()

	const resolvedSize = useResolvedSize(size)

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const contextValue = useMemo(() => ({ close }), [close])

	const concentricValue = useMemo(() => ({ size: resolvedSize }), [resolvedSize])

	const style: CSSProperties = {
		'--ui-radius-inner': `var(--radius-${sun[resolvedSize].radius})`,
		'--ui-padding': `calc(var(--spacing) * ${sun[resolvedSize].space})`,
		'--ui-gap': `calc(var(--spacing) * ${sun[resolvedSize].gap})`,
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
				data-step={resolvedSize}
				style={style}
				onClick={(e) => e.stopPropagation()}
				className={cn(drawerPanelVariants({ surface: resolvedSurface }), className)}
			>
				<DrawerProvider value={contextValue}>
					<PanelA11yProvider value={providerValue}>
						<ConcentricProvider value={concentricValue}>{children}</ConcentricProvider>
					</PanelA11yProvider>
				</DrawerProvider>
			</motion.div>
		</Overlay>
	)
}
