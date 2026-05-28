'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { Density, useDensity } from '../../primitives/density'
import { Overlay } from '../../primitives/overlay'
import {
	PanelA11yContext,
	PanelCloseContext,
	usePanelA11yScope,
	usePanelCloseValue,
} from '../../primitives/panel'
import type { Step } from '../../recipes'
import { type DrawerPanelVariants, k } from '../../recipes/kata/drawer'
import { useResolvedSurface } from '../glass/context'

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

	const closeValue = usePanelCloseValue(onOpenChange)

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
				data-density={resolvedSize}
				onClick={(e) => e.stopPropagation()}
				className={cn(k.panel({ surface: resolvedSurface }), className)}
			>
				<PanelCloseContext value={closeValue}>
					<PanelA11yContext value={providerValue}>
						<Density density={resolvedSize} size={resolvedSize}>
							{children}
						</Density>
					</PanelA11yContext>
				</PanelCloseContext>
			</motion.div>
		</Overlay>
	)
}
