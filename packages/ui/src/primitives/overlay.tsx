'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../core'
import { useDismissable } from '../hooks/use-dismissable'
import { useFocusTrap } from '../hooks/use-focus-trap'
import { omote, ugoki } from '../recipes'

export type OverlayProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	outsideClick?: boolean
	glass?: boolean
	className?: string
	children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

export function Overlay({
	open,
	onOpenChange,
	outsideClick = true,
	glass,
	className,
	children,
	...props
}: OverlayProps) {
	const focusTrapRef = useFocusTrap(open)

	useDismissable({
		open,
		onDismiss: () => onOpenChange(false),
		outsidePointer: false,
		scrollLock: true,
	})

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
						onClick={outsideClick ? () => onOpenChange(false) : undefined}
						aria-hidden="true"
					/>
					{children}
				</div>
			)}
		</AnimatePresence>,
		document.body,
	)
}
