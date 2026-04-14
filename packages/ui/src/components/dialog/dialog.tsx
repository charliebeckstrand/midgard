'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { cn } from '../../core'
import { useIdScope, useIsDesktop } from '../../hooks'
import { Overlay, PanelA11yProvider } from '../../primitives'
import { ugoki } from '../../recipes'
import { useGlass } from '../glass/context'
import { type DialogPanelVariants, dialogPanelVariants } from './variants'

export type DialogProps = DialogPanelVariants & {
	open: boolean
	onClose: () => void
	align?: 'center' | 'start'
	outsideClick?: boolean
	className?: string
	children: React.ReactNode
}

const alignClasses = {
	center: 'sm:items-center',
	start: 'sm:items-start',
} as const

export function Dialog({
	open,
	onClose,
	align = 'center',
	outsideClick = true,
	glass,
	size,
	className,
	children,
}: DialogProps) {
	const glassContext = useGlass()

	const resolvedGlass = glass ?? glassContext

	const isDesktop = useIsDesktop()

	const scope = useIdScope()

	const titleId = scope.sub('title')

	const descriptionId = scope.sub('description')

	return (
		<Overlay open={open} onClose={onClose} outsideClick={outsideClick} glass={resolvedGlass}>
			<div
				className={cn(
					'pointer-events-none fixed inset-0 flex min-h-full items-end sm:justify-center sm:p-4',
					alignClasses[align],
				)}
			>
				<motion.div
					{...(isDesktop ? ugoki.popover : ugoki.panel.bottom)}
					role="dialog"
					aria-modal="true"
					aria-labelledby={titleId}
					aria-describedby={descriptionId}
					data-slot="dialog"
					className={cn(
						'pointer-events-auto',
						dialogPanelVariants({ glass: resolvedGlass, size }),
						className,
					)}
				>
					<PanelA11yProvider value={{ titleId, descriptionId }}>{children}</PanelA11yProvider>
				</motion.div>
			</div>
		</Overlay>
	)
}
