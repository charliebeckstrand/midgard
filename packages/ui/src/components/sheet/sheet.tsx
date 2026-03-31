'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { cn, createContext, useIsDesktop } from '../../core'
import { Overlay } from '../../primitives'
import { ugoki } from '../../recipes'
import { type SheetPanelVariants, sheetPanelVariants } from './variants'

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

export function Sheet({ open, onClose, side = 'right', size, className, children }: SheetProps) {
	const isDesktop = useIsDesktop()
	const resolvedSide = (side ?? 'right') as SheetSide

	// Mobile always slides from bottom; desktop uses the configured side
	const animSide = isDesktop ? resolvedSide : 'bottom'

	return (
		<Overlay open={open} onClose={onClose}>
			<motion.div
				{...ugoki.panel[animSide]}
				role="dialog"
				aria-modal="true"
				data-slot="sheet"
				onClick={(e) => e.stopPropagation()}
				className={cn(sheetPanelVariants({ side, size }), className)}
			>
				<SheetProvider value={{ onClose }}>{children}</SheetProvider>
			</motion.div>
		</Overlay>
	)
}
