'use client'

import { motion } from 'motion/react'
import type { ReactNode, RefObject } from 'react'
import { cn } from '../../core'
import { useA11yPanel, useMinWidth } from '../../hooks'
import { Overlay } from '../../primitives/overlay'
import { PanelProviders } from '../../primitives/panel'
import { useResolvedSurface } from '../../providers/glass/context'
import { type DialogPanelVariants, k } from '../../recipes/kata/dialog'

export type DialogProps = DialogPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	placement?: 'center' | 'top'
	dismissOnBackdrop?: boolean
	glass?: boolean
	className?: string
	children: ReactNode
	/**
	 * Dialog role. Use `'alertdialog'` for confirmations and other prompts that
	 * require a response before proceeding. @default 'dialog'
	 */
	role?: 'dialog' | 'alertdialog'
	/** Element to receive initial focus when the dialog opens. Defaults to the first tabbable child. */
	initialFocus?: RefObject<HTMLElement | null>
	/**
	 * Accessible name for dialogs without a visible `DialogTitle` (e.g. a command
	 * palette). Ignored once a `DialogTitle` registers, since it names the dialog.
	 */
	'aria-label'?: string
	/** Root slot identifier. Wrappers override it to stamp their own name. */
	'data-slot'?: string
}

const placementClasses = {
	center: 'sm:items-center',
	top: 'sm:items-start',
} as const

/**
 * Modal surface rendered in an Overlay with focus trapping and backdrop dismiss —
 * animates as a bottom sheet on mobile and a centered panel on desktop, and is
 * named by a registered `<DialogTitle>` or the `aria-label` fallback.
 */
export function Dialog({
	open,
	onOpenChange,
	placement = 'center',
	dismissOnBackdrop = true,
	surface,
	size,
	glass,
	className,
	children,
	role = 'dialog',
	initialFocus,
	'aria-label': ariaLabel,
	'data-slot': slot = 'dialog',
}: DialogProps) {
	const resolvedSurface = useResolvedSurface(surface, glass)

	const isDesktop = useMinWidth(640)

	const { ariaProps, a11y } = useA11yPanel(role)

	// A registered DialogTitle (aria-labelledby) names the dialog; fall back to
	// the explicit label only when there's no title.
	const ariaLabelledBy = ariaProps['aria-labelledby']

	return (
		<Overlay
			open={open}
			onOpenChange={onOpenChange}
			dismissOnBackdrop={dismissOnBackdrop}
			glass={resolvedSurface === 'glass'}
			initialFocus={initialFocus}
		>
			<div
				className={cn(
					'pointer-events-none fixed inset-0 flex min-h-full items-end sm:justify-center sm:p-4',
					placementClasses[placement],
				)}
			>
				<motion.div
					{...(isDesktop ? k.motion.desktop : k.motion.mobile)}
					{...ariaProps}
					aria-label={ariaLabelledBy ? undefined : ariaLabel}
					data-slot={slot}
					className={cn(
						'pointer-events-auto',
						k.panel({ surface: resolvedSurface, size }),
						className,
					)}
				>
					<PanelProviders onOpenChange={onOpenChange} a11y={a11y}>
						{children}
					</PanelProviders>
				</motion.div>
			</div>
		</Overlay>
	)
}
