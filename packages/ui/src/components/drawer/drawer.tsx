'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useA11yPanel } from '../../hooks'
import { Density, useDensity } from '../../primitives/density'
import { Overlay } from '../../primitives/overlay'
import { PanelProviders } from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import type { Step } from '../../recipes'
import { type DrawerPanelVariants, k } from '../../recipes/kata/drawer'

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

/**
 * Animated overlay panel anchored to a screen edge — controlled via
 * `open`/`onOpenChange`. Opens a density cascade sized by `size`, with optional
 * `glass` surface treatment.
 */
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

	const { panelAriaProps, a11y } = useA11yPanel()

	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

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
				<PanelProviders onOpenChange={onOpenChange} a11y={a11y}>
					<Density density={resolvedSize} size={resolvedSize}>
						{children}
					</Density>
				</PanelProviders>
			</motion.div>
		</Overlay>
	)
}
