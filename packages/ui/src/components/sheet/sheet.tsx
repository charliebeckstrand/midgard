'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { cn, createContext } from '../../core'
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
	const resolvedSide = (side ?? 'right') as SheetSide
	const panelMotion = ugoki.panel[resolvedSide]

	return (
		<Overlay open={open} onClose={onClose}>
			<motion.div
				initial={{ ...panelMotion.initial, opacity: 0 }}
				animate={{ x: 0, y: 0, opacity: 1 }}
				exit={{ ...panelMotion.exit, opacity: 0 }}
				transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
				role="dialog"
				aria-modal="true"
				data-slot="sheet"
				onClick={(e) => e.stopPropagation()}
				className={cn('flex flex-col p-6', sheetPanelVariants({ side, size }), className)}
			>
				<SheetProvider value={{ onClose }}>{children}</SheetProvider>
			</motion.div>
		</Overlay>
	)
}
