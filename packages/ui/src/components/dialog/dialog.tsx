'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useMinWidth } from '../../hooks'
import { Overlay } from '../../primitives/overlay'
import { PanelA11yProvider, usePanelA11yScope } from '../../primitives/panel'
import { ugoki } from '../../recipes'
import { type DialogPanelVariants, dialogPanelVariants } from '../../recipes/kata/dialog'
import { useResolvedSurface } from '../glass/context'

export type DialogProps = DialogPanelVariants & {
	open: boolean
	onOpenChange: (open: boolean) => void
	align?: 'center' | 'start'
	outsideClick?: boolean
	glass?: boolean
	className?: string
	children: ReactNode
	/** Accessible name when no `<DialogTitle>` is rendered. */
	'aria-label'?: string
	/** Accessible name reference when no `<DialogTitle>` is rendered. */
	'aria-labelledby'?: string
}

const alignClasses = {
	center: 'sm:items-center',
	start: 'sm:items-start',
} as const

export function Dialog({
	open,
	onOpenChange,
	align = 'center',
	outsideClick = true,
	surface,
	size,
	glass,
	className,
	children,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
}: DialogProps) {
	const resolvedSurface = useResolvedSurface(surface, glass)

	const isDesktop = useMinWidth(640)

	const { panelAriaProps, providerValue } = usePanelA11yScope({ ariaLabel, ariaLabelledBy })

	return (
		<Overlay
			open={open}
			onOpenChange={onOpenChange}
			outsideClick={outsideClick}
			glass={resolvedSurface === 'glass'}
		>
			<div
				className={cn(
					'pointer-events-none fixed inset-0 flex min-h-full items-end sm:justify-center sm:p-4',
					alignClasses[align],
				)}
			>
				<motion.div
					{...(isDesktop ? ugoki.popover : ugoki.panel.bottom)}
					{...panelAriaProps}
					data-slot="dialog"
					className={cn(
						'pointer-events-auto',
						dialogPanelVariants({ surface: resolvedSurface, size }),
						className,
					)}
				>
					<PanelA11yProvider value={providerValue}>{children}</PanelA11yProvider>
				</motion.div>
			</div>
		</Overlay>
	)
}
