'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { cn } from '../../core'
import { useOverlay } from '../../hooks'
import { katachi, ma, narabi, omote, ugoki } from '../../recipes'
import { useSheet } from './context'

export type SheetSize = katachi.PanelSize

export function SheetContent({
	className,
	children,
	noOverlay,
	backdropClassName,
	size = 'sm',
}: {
	className?: string
	children: React.ReactNode
	noOverlay?: boolean
	backdropClassName?: string
	size?: SheetSize
}) {
	const { open, onOpenChange, side, modal, titleId, descriptionId } = useSheet()

	useOverlay(open, () => onOpenChange(false), { scrollLock: modal })

	const slide = ugoki.panel[side]

	const isHorizontal = side === 'left' || side === 'right'

	return (
		<AnimatePresence>
			{open && (
				<div className="fixed inset-0 z-50">
					{!noOverlay && (
						<motion.div
							{...ugoki.overlay}
							className={backdropClassName ?? omote.backdrop}
							onClick={() => onOpenChange(false)}
							aria-hidden="true"
						/>
					)}
					<motion.div
						role="dialog"
						aria-modal={modal}
						aria-labelledby={titleId}
						aria-describedby={descriptionId}
						initial={slide?.initial}
						animate={isHorizontal ? { x: 0 } : { y: 0 }}
						exit={slide?.exit}
						transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
						className={cn(
							'fixed',
							narabi.slide[side],
							isHorizontal && katachi.panel[size],
							isHorizontal && ma.float,
						)}
					>
						<div
							className={cn(
								`flex h-full flex-col ${omote.panel}`,
								isHorizontal ? 'rounded-xl' : '',
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
