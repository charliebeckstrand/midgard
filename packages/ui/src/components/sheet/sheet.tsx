'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useId } from 'react'
import { cn, createContext } from '../../core'
import { Overlay, PanelA11yProvider } from '../../primitives'
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
	const resolvedSide = (side ?? 'right') as SheetSide
	const id = useId()
	const titleId = `${id}-title`
	const descriptionId = `${id}-description`

	return (
		<Overlay
			open={open}
			onClose={onClose}
			className={sheetBackdropVariants({ glass: resolvedGlass })}
		>
			<motion.div
				{...ugoki.panel[resolvedSide]}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
				data-slot="sheet"
				onClick={(e) => e.stopPropagation()}
				className={cn(sheetPanelVariants({ side, size, glass: resolvedGlass }), className)}
			>
				<SheetProvider value={{ onClose }}>
					<PanelA11yProvider value={{ titleId, descriptionId }}>{children}</PanelA11yProvider>
				</SheetProvider>
			</motion.div>
		</Overlay>
	)
}
