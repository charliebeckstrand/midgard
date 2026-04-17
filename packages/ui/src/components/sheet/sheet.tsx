'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useCallback, useMemo } from 'react'
import { cn, createContext } from '../../core'
import { Overlay, PanelA11yProvider, usePanelA11yScope } from '../../primitives'
import { ugoki } from '../../recipes'
import { useGlass } from '../glass/context'
import { type SheetPanelVariants, sheetBackdropVariants, sheetPanelVariants } from './variants'

type SheetSide = 'right' | 'left' | 'top' | 'bottom'

type SheetContextValue = {
	close: () => void
}

export const [SheetProvider, useSheetContext] = createContext<SheetContextValue>('Sheet')

export type SheetProps = SheetPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	className?: string
	children: React.ReactNode
}

export function Sheet({
	open,
	onOpenChange,
	side = 'right',
	size,
	glass,
	className,
	children,
}: SheetProps) {
	const glassContext = useGlass()

	const resolvedGlass = glass ?? glassContext

	const resolvedSide = (side ?? 'right') as SheetSide

	const { panelAriaProps, providerValue } = usePanelA11yScope()

	const close = useCallback(() => onOpenChange(false), [onOpenChange])

	const contextValue = useMemo(() => ({ close }), [close])

	return (
		<Overlay
			open={open}
			onOpenChange={onOpenChange}
			className={sheetBackdropVariants({ glass: resolvedGlass })}
		>
			<motion.div
				{...ugoki.panel[resolvedSide]}
				{...panelAriaProps}
				data-slot="sheet"
				onClick={(e) => e.stopPropagation()}
				className={cn(sheetPanelVariants({ side, size, glass: resolvedGlass }), className)}
			>
				<SheetProvider value={contextValue}>
					<PanelA11yProvider value={providerValue}>{children}</PanelA11yProvider>
				</SheetProvider>
			</motion.div>
		</Overlay>
	)
}
