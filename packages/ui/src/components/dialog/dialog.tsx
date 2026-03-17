'use client'

import clsx from 'clsx'
import { motion } from 'motion/react'
import type React from 'react'
import { useId } from 'react'
import { Overlay } from '../../primitives'
import { panelSizes } from '../../recipes/dialog'
import { DialogProvider } from './context'

export type DialogProps = {
	open: boolean
	onClose: () => void
	size?: keyof typeof panelSizes
	className?: string
	children: React.ReactNode
}

export function Dialog({ open, onClose, size = 'lg', className, children }: DialogProps) {
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
							initial={{ opacity: 0, y: 0 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 0 }}
							transition={{ duration: 0.15 }}
							className={clsx(panelSizes[size], 'row-start-2 flex w-full min-w-0 sm:mb-auto')}
						>
							<div
								className={clsx(
									className,
									'w-full min-w-0 rounded-t-3xl bg-white p-(--gutter) shadow-lg ring-1 ring-zinc-950/10 [--gutter:--spacing(8)] sm:rounded-2xl dark:bg-zinc-900 dark:ring-white/10 forced-colors:outline',
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
