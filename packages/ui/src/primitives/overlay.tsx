'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useEffect } from 'react'
import { omote, ugoki } from '../recipes'

export function Overlay({
	open,
	onClose,
	className,
	children,
	...props
}: {
	open: boolean
	onClose: () => void
	className?: string
	children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>) {
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
						onClick={onClose}
						aria-hidden="true"
					/>
					{children}
				</div>
			)}
		</AnimatePresence>
	)
}
