'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../core'
import { useFocusTrap } from '../hooks/use-focus-trap'
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
	const focusTrapRef = useFocusTrap(open)

	const onCloseRef = useRef(onClose)

	onCloseRef.current = onClose

	useEffect(() => {
		if (!open) return

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') onCloseRef.current()
		}

		document.addEventListener('keydown', onKeyDown)

		document.body.style.overflow = 'hidden'

		return () => {
			document.removeEventListener('keydown', onKeyDown)

			document.body.style.overflow = ''
		}
	}, [open])

	if (typeof document === 'undefined') return null

	return createPortal(
		<AnimatePresence>
			{open && (
				<div ref={focusTrapRef} className="fixed inset-0 z-99" {...props}>
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
