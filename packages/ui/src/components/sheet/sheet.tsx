'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { cn, createContext } from '../../core'
import { useIsDesktop } from '../../hooks'
import { Overlay } from '../../primitives'
import { ugoki } from '../../recipes'
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
	glass = false,
	className,
	children,
}: SheetProps) {
	const isDesktop = useIsDesktop()

	const resolvedSide = (side ?? 'right') as SheetSide

	/**
	 * On desktop, the sheet will slide in from the side specified by the `side` prop.
	 * On mobile, the sheet will always slide in from the bottom, regardless of the `side` prop.
	 */
	const slideDirection = isDesktop ? resolvedSide : 'bottom'

	return (
		<Overlay open={open} onClose={onClose} className={sheetBackdropVariants({ glass })}>
			<motion.div
				{...ugoki.panel[slideDirection]}
				role="dialog"
				aria-modal="true"
				data-slot="sheet"
				onClick={(e) => e.stopPropagation()}
				className={cn(sheetPanelVariants({ side, size, glass }), className)}
			>
				<SheetProvider value={{ onClose }}>{children}</SheetProvider>
			</motion.div>
		</Overlay>
	)
}
