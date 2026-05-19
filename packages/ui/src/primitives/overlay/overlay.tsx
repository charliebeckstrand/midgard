'use client'

import { FloatingFocusManager, useFloating } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { type HTMLAttributes, type ReactNode, type RefObject, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../core'
import { useDismissable } from '../../hooks/use-dismissable'
import { omote, ugoki } from '../../recipes'
import { ReducedMotion } from '../reduced-motion'
import { notifyOverlayOpened } from './overlay-signal'

export type OverlayProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	outsideClick?: boolean
	glass?: boolean
	className?: string
	children: ReactNode
	/**
	 * Optional element to portal into. When provided, the overlay is scoped to this
	 * element (rendered with `absolute` positioning, no body scroll lock). The container
	 * must establish a positioning context (e.g. `position: relative`).
	 * Defaults to `document.body` with full-viewport `fixed` positioning.
	 */
	container?: HTMLElement | null
	/** Element to receive initial focus when the overlay opens. Defaults to the first tabbable child. */
	initialFocus?: RefObject<HTMLElement | null>
} & Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'>

export function Overlay({
	open,
	onOpenChange,
	outsideClick = true,
	glass,
	className,
	children,
	container,
	initialFocus,
	...props
}: OverlayProps) {
	const { refs, context } = useFloating({ open, onOpenChange })

	const scoped = container != null

	useDismissable({
		open,
		onDismiss: () => onOpenChange(false),
		outsidePointer: false,
		scrollLock: !scoped,
	})

	useEffect(() => {
		if (open) notifyOverlayOpened()
	}, [open])

	if (typeof document === 'undefined') return null

	return createPortal(
		<ReducedMotion>
			<AnimatePresence>
				{open && (
					<FloatingFocusManager context={context} modal initialFocus={initialFocus ?? undefined}>
						<div
							ref={refs.setFloating}
							data-slot="overlay"
							className={cn(scoped ? 'absolute inset-0 z-99' : 'fixed inset-0 z-99')}
							{...props}
						>
							<motion.div
								{...ugoki.overlay}
								data-slot="overlay-backdrop"
								className={
									className ??
									cn('absolute inset-0', glass ? omote.backdrop.glass : omote.backdrop.base)
								}
								onClick={outsideClick ? () => onOpenChange(false) : undefined}
								aria-hidden="true"
							/>
							{children}
						</div>
					</FloatingFocusManager>
				)}
			</AnimatePresence>
		</ReducedMotion>,
		container ?? document.body,
	)
}
