'use client'

import { motion } from 'motion/react'
import { cn } from '../core'

const orientations = {
	vertical: 'inset-y-2 -left-4 w-0.5',
	horizontal: 'inset-x-2 -bottom-2.5 h-0.5',
	underline: 'inset-x-0 -bottom-px h-0.5',
}

/**
 * Animated active/current indicator that morphs between sibling items.
 *
 * Uses layoutId with spring physics so the indicator slides smoothly
 * between positions with a natural, organic feel (slight overshoot on arrival).
 *
 * Each orientation targets a different nav context:
 * - `vertical`   — sidebar (left edge bar)
 * - `horizontal` — navbar (bottom edge bar)
 * - `underline`  — tabs (flush bottom line)
 */
export function ActiveIndicator({
	layoutId = 'current-indicator',
	orientation = 'horizontal',
	className,
}: {
	layoutId?: string
	orientation?: keyof typeof orientations
	className?: string
}) {
	return (
		<motion.span
			layoutId={layoutId}
			className={cn(
				'absolute rounded-full',
				'bg-zinc-950',
				'dark:bg-white',
				orientations[orientation],
				className,
			)}
			transition={{
				type: 'spring',
				stiffness: 500,
				damping: 35,
				mass: 0.8,
			}}
		/>
	)
}
