'use client'

import { motion } from 'motion/react'
import { cn } from '../core'

/**
 * Animated active/current indicator that morphs between sibling items.
 *
 * Renders a full background pill that flows between positions using
 * layoutId with fluid spring physics. The low damping creates a
 * liquid, organic feel as it travels between items.
 *
 * Place inside the item's relative container. Content should be
 * positioned above with `relative z-10` so it renders on top.
 */
export function ActiveIndicator({
	layoutId = 'current-indicator',
	className,
}: {
	layoutId?: string
	className?: string
}) {
	return (
		<motion.span
			layoutId={layoutId}
			className={cn('absolute inset-0 rounded-lg bg-zinc-950/5 dark:bg-white/10', className)}
			style={{ borderRadius: 8 }}
			transition={{
				type: 'spring',
				stiffness: 200,
				damping: 20,
				mass: 0.8,
			}}
			whileTap={{ scale: 0.97 }}
		/>
	)
}
