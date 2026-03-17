'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useEffect } from 'react'
import { cn } from '../../core'
import { type PanelSize, panelSizes } from '../../recipes/dialog'
import { overlayAnimation } from '../../recipes/motion'
import { overlayBackdrop } from '../../recipes/overlay'
import type { SheetSide } from './context'
import { useSheet } from './context'

const slideAnimations: Record<
	SheetSide,
	{ initial: Record<string, string>; exit: Record<string, string> }
> = {
	right: { initial: { x: '100%' }, exit: { x: '100%' } },
	left: { initial: { x: '-100%' }, exit: { x: '-100%' } },
	top: { initial: { y: '-100%' }, exit: { y: '-100%' } },
	bottom: { initial: { y: '100%' }, exit: { y: '100%' } },
}

const positionClasses: Record<SheetSide, string> = {
	right: 'inset-y-0 right-0',
	left: 'inset-y-0 left-0',
	top: 'inset-x-0 top-0',
	bottom: 'inset-x-0 bottom-0',
}

const sizeClasses: Record<SheetSide, string> = {
	right: 'h-full w-full',
	left: 'h-full w-full',
	top: 'w-full',
	bottom: 'w-full',
}

const floatClasses: Record<SheetSide, string> = {
	right: 'p-4',
	left: 'p-4',
	top: 'p-4',
	bottom: 'p-4',
}

export type SheetSize = PanelSize

export function SheetContent({
	className,
	children,
	noOverlay,
	size = 'sm',
}: {
	className?: string
	children: React.ReactNode
	noOverlay?: boolean
	size?: SheetSize
}) {
	const { open, onOpenChange, side, modal, titleId, descriptionId } = useSheet()

	useEffect(() => {
		if (!open) return

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') onOpenChange(false)
		}

		document.addEventListener('keydown', onKeyDown)
		if (modal) document.body.style.overflow = 'hidden'

		return () => {
			document.removeEventListener('keydown', onKeyDown)
			if (modal) document.body.style.overflow = ''
		}
	}, [open, onOpenChange, modal])

	const slide = slideAnimations[side]
	const isHorizontal = side === 'left' || side === 'right'

	return (
		<AnimatePresence>
			{open && (
				<div className="fixed inset-0 z-50">
					{!noOverlay && (
						<motion.div
							{...overlayAnimation}
							className={overlayBackdrop}
							onClick={() => onOpenChange(false)}
							aria-hidden="true"
						/>
					)}
					<motion.div
						role="dialog"
						aria-modal={modal}
						aria-labelledby={titleId}
						aria-describedby={descriptionId}
						initial={slide.initial}
						animate={isHorizontal ? { x: 0 } : { y: 0 }}
						exit={slide.exit}
						transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
						className={cn(
							'fixed',
							positionClasses[side],
							sizeClasses[side],
							isHorizontal && panelSizes[size],
							isHorizontal && floatClasses[side],
						)}
					>
						<div
							className={cn(
								// Light
								'flex h-full flex-col bg-white shadow-lg',
								isHorizontal ? 'rounded-xl' : '',
								'ring-1 ring-zinc-950/10',
								// Dark
								'dark:bg-zinc-900',
								'dark:ring-white/10',
								className,
							)}
						>
							{children}
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	)
}
