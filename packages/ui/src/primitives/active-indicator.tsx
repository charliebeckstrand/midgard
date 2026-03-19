'use client'

import { motion } from 'motion/react'
import { cn } from '../core'

/**
 * Animated active/current indicator that morphs between sibling items.
 *
 * Two layered pills — a crisp foreground and a soft trailing wake —
 * flow between positions using layoutId with fluid spring physics.
 * The wake uses lower stiffness so it arrives after the main pill,
 * creating a liquid, organic feel.
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
		<>
			<motion.span
				layoutId={`${layoutId}-wake`}
				className="absolute inset-0 rounded-lg bg-zinc-950/3 blur-sm dark:bg-white/5"
				style={{ borderRadius: 10 }}
				transition={{
					type: 'spring',
					stiffness: 120,
					damping: 18,
					mass: 1,
				}}
			/>
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
			/>
		</>
	)
}
