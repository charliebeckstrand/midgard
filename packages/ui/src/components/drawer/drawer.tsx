'use client'

import { motion } from 'motion/react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { Density, useDensity } from '../../primitives/density'
import { Overlay } from '../../primitives/overlay'
import { PanelA11yProvider, usePanelA11yScope } from '../../primitives/panel'
import type { Step } from '../../recipes'
import { type DrawerPanelVariants, k } from '../../recipes/kata/drawer'
import { useResolvedSurface } from '../glass/context'

type DrawerContextValue = {
	close: () => void
}

export const [DrawerProvider, useDrawerContext] = createContext<DrawerContextValue>('Drawer')

export type DrawerProps = DrawerPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	/**
	 * Size step that propagates to descendants via the Density context.
	 * Resolution order: explicit prop, then enclosing Density size, then `'md'`.
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

	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const contextValue = useMemo(() => ({ close }), [close])

	return (
		<Overlay
			open={open}
			onOpenChange={onOpenChange}
			className={k.backdrop({ surface: resolvedSurface })}
		>
			<motion.div
				{...k.motion}
				{...panelAriaProps}
				data-slot="drawer"
				data-step={resolvedSize}
				onClick={(e) => e.stopPropagation()}
				className={cn(k.panel({ surface: resolvedSurface }), className)}
			>
				<DrawerProvider value={contextValue}>
					<PanelA11yProvider value={providerValue}>
						<Density density={resolvedSize} size={resolvedSize}>
							{children}
						</Density>
					</PanelA11yProvider>
				</DrawerProvider>
			</motion.div>
		</Overlay>
	)
}
