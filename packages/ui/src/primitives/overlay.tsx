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
	/**
	 * Optional element to portal into. When provided, the overlay is scoped to this
	 * element (rendered with `absolute` positioning, no body scroll lock). The container
	 * must establish a positioning context (e.g. `position: relative`).
	 * Defaults to `document.body` with full-viewport `fixed` positioning.
	 */
	container?: HTMLElement | null
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

export function Overlay({
	open,
	onOpenChange,
	outsideClick = true,
	glass,
	className,
	children,
	container,
	...props
}: OverlayProps) {
	const focusTrapRef = useFocusTrap(open)

	const scoped = container != null

	useDismissable({
		open,
		onDismiss: () => onOpenChange(false),
		outsidePointer: false,
		scrollLock: !scoped,
	})

	if (typeof document === 'undefined') return null

	return createPortal(
		<AnimatePresence>
			{open && (
				<div
					ref={focusTrapRef}
					className={cn(scoped ? 'absolute inset-0 z-99' : 'fixed inset-0 z-99')}
					{...props}
				>
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
		container ?? document.body,
	)
}
