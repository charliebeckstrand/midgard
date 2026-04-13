'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../core'
import { omote, ugoki } from '../recipes'

export type OverlayProps = {
	open: boolean
	onClose: () => void
	outsideClick?: boolean
	glass?: boolean
	className?: string
	children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

export function Overlay({
	open,
	onClose,
	outsideClick = true,
	glass,
	className,
	children,
	...props
}: OverlayProps) {
	useEffect(() => {
		if (!open) return

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') onClose()
		}

		document.addEventListener('keydown', onKeyDown)

		document.body.style.overflow = 'hidden'

		return () => {
			document.removeEventListener('keydown', onKeyDown)

			document.body.style.overflow = ''
		}
	}, [open, onClose])

	if (typeof document === 'undefined') return null

	return createPortal(
		<AnimatePresence>
			{open && (
				<div className="fixed inset-0 z-99" {...props}>
					<motion.div
						{...ugoki.overlay}
						className={
							className ??
							cn('absolute inset-0', glass ? omote.backdrop.glass : omote.backdrop.base)
						}
						onClick={outsideClick ? onClose : undefined}
						aria-hidden="true"
					/>
					{children}
				</div>
			)}
		</AnimatePresence>,
		document.body,
	)
}
