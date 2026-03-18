'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { useId } from 'react'
import { cn } from '../../core'
import { Overlay } from '../../primitives'
import { katachi, omote, ugoki } from '../../recipes'
import { DialogProvider } from './context'

export type DialogProps = {
	open: boolean
	onClose: () => void
	outsideClick?: boolean
	size?: katachi.PanelSize
	className?: string
	children: React.ReactNode
}

export function Dialog({
	open,
	onClose,
	outsideClick,
	size = 'lg',
	className,
	children,
}: DialogProps) {
	const titleId = useId()
	const descriptionId = useId()

	return (
		<DialogProvider value={{ titleId, descriptionId }}>
			<Overlay
				open={open}
				onClose={onClose}
				outsideClick={outsideClick}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={descriptionId}
			>
				<div className="fixed inset-0 w-screen overflow-y-auto pt-6 sm:pt-0">
					{/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard close handled by Overlay Escape listener */}
					{/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss area */}
					<div
						className="grid min-h-full grid-rows-[1fr_auto] justify-items-center sm:grid-rows-[1fr_auto_3fr] sm:p-4"
						onClick={(e) => {
							if (outsideClick !== false && e.target === e.currentTarget) onClose()
						}}
					>
						<motion.div
							{...ugoki.overlay}
							className={cn(katachi.panel[size], 'row-start-2 flex w-full min-w-0 sm:mb-auto')}
						>
							<div
								className={cn(
									`w-full min-w-0 rounded-t-3xl p-(--gutter) [--gutter:--spacing(8)] sm:rounded-2xl ${omote.panel}`,
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
