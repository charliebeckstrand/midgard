'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useId } from 'react'
import { cn } from '../../core'
import { Overlay } from '../../primitives'
import { panelSizes } from '../../recipes/dialog'
import { overlayAnimation } from '../../recipes/motion'
import { DialogProvider } from './context'

export function Dialog({
	open,
	onClose,
	size = 'lg',
	className,
	children,
}: {
	open: boolean
	onClose: () => void
	size?: keyof typeof panelSizes
	className?: string
	children: React.ReactNode
}) {
	const titleId = useId()
	const descriptionId = useId()

	return (
		<DialogProvider value={{ titleId, descriptionId }}>
			<Overlay
				open={open}
				onClose={onClose}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
			>
				<div className="fixed inset-0 w-screen overflow-y-auto pt-6 sm:pt-0">
					<div className="grid min-h-full grid-rows-[1fr_auto] justify-items-center sm:grid-rows-[1fr_auto_3fr] sm:p-4">
						<motion.div
							{...overlayAnimation}
							className={cn(panelSizes[size], 'row-start-2 flex w-full min-w-0 sm:mb-auto')}
						>
							<div
								className={cn(
									'w-full min-w-0 rounded-t-3xl bg-white p-(--gutter) shadow-lg ring-1 ring-zinc-950/10 [--gutter:--spacing(8)] sm:rounded-2xl',
									'dark:bg-zinc-900 dark:ring-white/10',
									'forced-colors:outline',
									className,
								)}
							>
								{children}
							</div>
						</motion.div>
					</div>
				</div>
			</Overlay>
		</DialogProvider>
	)
}
