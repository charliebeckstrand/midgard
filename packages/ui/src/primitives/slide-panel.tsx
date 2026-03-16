'use client'

import { motion } from 'motion/react'
import type React from 'react'
import { slidePanelAnimation } from '../recipes/motion'

export function SlidePanel({
	className,
	children,
}: {
	className?: string
	children: React.ReactNode
}) {
	return (
		<motion.div
			{...slidePanelAnimation}
			className={className ?? 'fixed inset-y-0 left-0 w-full max-w-80 p-2'}
		>
			{children}
		</motion.div>
	)
}
