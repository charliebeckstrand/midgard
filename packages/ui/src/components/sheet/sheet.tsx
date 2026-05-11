'use client'

import { motion } from 'motion/react'
import { type ReactNode, useCallback, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { Overlay, PanelA11yProvider, usePanelA11yScope } from '../../primitives'
import { ugoki } from '../../recipes'
import {
	type SheetPanelVariants,
	sheetBackdropVariants,
	sheetPanelVariants,
} from '../../recipes/kata/sheet'
import { useResolvedSurface } from '../glass/context'

type SheetSide = 'right' | 'left' | 'top' | 'bottom'

type SheetContextValue = {
	close: () => void
}

export const [SheetProvider, useSheetContext] = createContext<SheetContextValue>('Sheet')

export type SheetProps = SheetPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	glass?: boolean
	className?: string
	children: ReactNode
	/**
	 * Optional element to scope the sheet to. When provided, the sheet renders within
	 * that element using absolute positioning. The container must be positioned
	 * (e.g. `position: relative`). Defaults to full viewport.
	 */
	container?: HTMLElement | null
}

export function Sheet({
	open,
	onOpenChange,
	side = 'right',
	size,
	surface,
	glass,
	className,
	children,
	container,
}: SheetProps) {
	const resolvedSide = (side ?? 'right') as SheetSide

	const resolvedSurface = useResolvedSurface(surface, glass)

	const { panelAriaProps, providerValue } = usePanelA11yScope()

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const contextValue = useMemo(() => ({ close }), [close])

	return (
		<Overlay
			open={open}
			onOpenChange={onOpenChange}
			container={container}
			className={sheetBackdropVariants({ surface: resolvedSurface })}
		>
			<motion.div
				{...ugoki.panel[resolvedSide]}
				{...panelAriaProps}
				data-slot="sheet"
				onClick={(e) => e.stopPropagation()}
				className={cn(sheetPanelVariants({ side, size, surface: resolvedSurface }), className)}
			>
				<SheetProvider value={contextValue}>
					<PanelA11yProvider value={providerValue}>{children}</PanelA11yProvider>
				</SheetProvider>
			</motion.div>
		</Overlay>
	)
}
