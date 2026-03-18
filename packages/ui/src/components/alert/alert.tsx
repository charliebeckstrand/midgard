'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useId } from 'react'
import { cn } from '../../core'
import { Overlay } from '../../primitives'
import { katachi, omote, ugoki } from '../../recipes'
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
	size?: keyof typeof katachi.panel
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
				className={omote.alert}
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
			>
				<div className="fixed inset-0 w-screen overflow-y-auto pt-6 sm:pt-0">
					<div className="grid min-h-full grid-rows-[1fr_auto_1fr] justify-items-center p-8 sm:grid-rows-[1fr_auto_3fr] sm:p-4">
						<motion.div
							{...ugoki.popover}
							className={cn(
								katachi.panel[size],
								`row-start-2 w-full rounded-2xl p-8 sm:p-6 ${omote.panel}`,
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
