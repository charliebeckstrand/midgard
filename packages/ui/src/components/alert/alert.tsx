'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useId } from 'react'
import { cn } from '../../core'
import { Overlay } from '../../primitives'
import { panelSizes } from '../../recipes/dialog'
import { popoverAnimation } from '../../recipes/motion'
import { alertBackdrop } from '../../recipes/overlay'
import { AlertProvider } from './context'

export function Alert({
	open,
	onClose,
	size = 'md',
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
		<AlertProvider value={{ titleId, descriptionId }}>
			<Overlay
				open={open}
				onClose={onClose}
				className={alertBackdrop}
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
			>
				<div className="fixed inset-0 w-screen overflow-y-auto pt-6 sm:pt-0">
					<div className="grid min-h-full grid-rows-[1fr_auto_1fr] justify-items-center p-8 sm:grid-rows-[1fr_auto_3fr] sm:p-4">
						<motion.div
							{...popoverAnimation}
							className={cn(
								panelSizes[size],
								'row-start-2 w-full rounded-2xl bg-white p-8 shadow-lg ring-1 ring-zinc-950/10 sm:rounded-2xl sm:p-6',
								'dark:bg-zinc-900 dark:ring-white/10',
								'forced-colors:outline',
								className,
							)}
						>
							{children}
						</motion.div>
					</div>
				</div>
			</Overlay>
		</AlertProvider>
	)
}
