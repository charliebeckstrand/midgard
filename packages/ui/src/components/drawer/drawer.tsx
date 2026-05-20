'use client'

import { motion } from 'motion/react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { Density, useDensity } from '../../primitives/density'
import { Overlay } from '../../primitives/overlay'
import { PanelA11yProvider, usePanelA11yScope } from '../../primitives/panel'
import { ugoki } from '../../recipes'
import {
	type DrawerPanelVariants,
	drawerBackdropVariants,
	drawerPanelVariants,
} from '../../recipes/kata/drawer'
import type { Step } from '../../recipes/ryu/sun'
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
	/** Accessible name when no `<DrawerTitle>` is rendered. */
	'aria-label'?: string
	/** Accessible name reference when no `<DrawerTitle>` is rendered. */
	'aria-labelledby'?: string
}

export function Drawer({
	open,
	onOpenChange,
	surface,
	size,
	glass,
	className,
	children,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
}: DrawerProps) {
	const resolvedSurface = useResolvedSurface(surface, glass)

	const { panelAriaProps, providerValue } = usePanelA11yScope({ ariaLabel, ariaLabelledBy })

	const inherited = useDensity()

	const resolvedSize = size ?? inherited.size

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const contextValue = useMemo(() => ({ close }), [close])

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
				onClick={(e) => e.stopPropagation()}
				className={cn(drawerPanelVariants({ surface: resolvedSurface }), className)}
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
