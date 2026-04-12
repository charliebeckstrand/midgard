'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { cn, createContext } from '../../core'
import { Overlay } from '../../primitives'
import { ugoki } from '../../recipes'
import { useGlass } from '../glass/context'
import { type SheetPanelVariants, sheetBackdropVariants, sheetPanelVariants } from './variants'

type SheetSide = 'right' | 'left' | 'top' | 'bottom'

type SheetContextValue = {
	onClose: () => void
}

export const [SheetProvider, useSheetContext] = createContext<SheetContextValue>('Sheet')

export type SheetProps = SheetPanelVariants & {
	open: boolean
	onClose: () => void
	className?: string
	children: React.ReactNode
}

export function Sheet({
	open,
	onClose,
	side = 'right',
	size,
	glass,
	className,
	children,
}: SheetProps) {
	const glassContext = useGlass()
	const resolvedGlass = glass ?? glassContext

	return (
		<Overlay
			open={open}
			onClose={onClose}
			className={sheetBackdropVariants({ glass: resolvedGlass })}
		>
			<motion.div
				{...ugoki.panel[(side ?? 'right') as SheetSide]}
				role="dialog"
				aria-modal="true"
				data-slot="sheet"
				onClick={(e) => e.stopPropagation()}
				className={cn(sheetPanelVariants({ side, size, glass: resolvedGlass }), className)}
			>
				<SheetProvider value={{ onClose }}>{children}</SheetProvider>
			</motion.div>
		</Overlay>
	)
}
