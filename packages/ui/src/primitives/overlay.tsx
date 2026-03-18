'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useEffect } from 'react'
import { omote, ugoki } from '../recipes'

export type OverlayProps = {
	open: boolean
	onClose: () => void
	outsideClick?: boolean
	className?: string
	children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

export function Overlay({
	open,
	onClose,
	outsideClick = true,
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

	return (
		<AnimatePresence>
			{open && (
				<div className="fixed inset-0 z-50" {...props}>
					<motion.div
						{...ugoki.overlay}
						className={className ?? omote.backdrop}
						onClick={outsideClick ? onClose : undefined}
						aria-hidden="true"
					/>
					{children}
				</div>
			)}
		</AnimatePresence>
	)
}
