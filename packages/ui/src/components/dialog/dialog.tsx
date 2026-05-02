'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useMinWidth } from '../../hooks'
import { Overlay, PanelA11yProvider, usePanelA11yScope } from '../../primitives'
import { ugoki } from '../../recipes'
import { useGlass } from '../glass/context'
import { type DialogPanelVariants, dialogPanelVariants } from './variants'

export type DialogProps = DialogPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	align?: 'center' | 'start'
	outsideClick?: boolean
	glass?: boolean
	className?: string
	children: ReactNode
}

const alignClasses = {
	center: 'sm:items-center',
	start: 'sm:items-start',
} as const

export function Dialog({
	open,
	onOpenChange,
	align = 'center',
	outsideClick = true,
	surface,
	size,
	glass,
	className,
	children,
}: DialogProps) {
	const glassContext = useGlass()

	// Resolve the surface from explicit prop, then the `glass` shorthand, then any
	// enclosing <GlassProvider> (boolean context translated to the surface enum).
	const resolvedSurface = surface ?? (glass || glassContext ? 'glass' : undefined)

	const isDesktop = useMinWidth(640)

	const { panelAriaProps, providerValue } = usePanelA11yScope()

	return (
		<Overlay
			open={open}
			onOpenChange={onOpenChange}
			outsideClick={outsideClick}
			glass={resolvedSurface === 'glass'}
		>
			<div
				className={cn(
					'pointer-events-none fixed inset-0 flex min-h-full items-end sm:justify-center sm:p-4',
					alignClasses[align],
				)}
			>
				<motion.div
					{...(isDesktop ? ugoki.popover : ugoki.panel.bottom)}
					{...panelAriaProps}
					data-slot="dialog"
					className={cn(
						'pointer-events-auto',
						dialogPanelVariants({ surface: resolvedSurface, size }),
						className,
					)}
				>
					<PanelA11yProvider value={providerValue}>{children}</PanelA11yProvider>
				</motion.div>
			</div>
		</Overlay>
	)
}
