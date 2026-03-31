'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useSyncExternalStore } from 'react'
import { cn, createContext } from '../../core'
import { Overlay } from '../../primitives'
import { ugoki } from '../../recipes'
import { type SheetPanelVariants, sheetPanelVariants } from './variants'

type SheetSide = 'right' | 'left' | 'top' | 'bottom'

type SheetContextValue = {
	onClose: () => void
}

export const [SheetProvider, useSheetContext] = createContext<SheetContextValue>('Sheet')

const smQuery = typeof window !== 'undefined' ? window.matchMedia('(min-width: 640px)') : null

function subscribeSmQuery(cb: () => void) {
	smQuery?.addEventListener('change', cb)
	return () => smQuery?.removeEventListener('change', cb)
}

function getSmSnapshot() {
	return smQuery?.matches ?? true
}

function useIsDesktop() {
	return useSyncExternalStore(subscribeSmQuery, getSmSnapshot, () => true)
}

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
	const panelMotion = ugoki.panel[animSide]

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
				className={cn(sheetPanelVariants({ side, size }), className)}
			>
				<SheetProvider value={{ onClose }}>{children}</SheetProvider>
			</motion.div>
		</Overlay>
	)
}
