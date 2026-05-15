'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k, progressTrackVariants } from '../../recipes/kata/progress'

type ProgressColor = keyof typeof k.color

// A progressbar role needs an accessible name; require one of these at the type
// level so consumers can't ship an unlabeled progress indicator.
type ProgressBarLabel = { 'aria-label': string } | { 'aria-labelledby': string }

export type ProgressBarProps = ProgressBarLabel & {
	value?: number
	max?: number
	size?: 'sm' | 'md' | 'lg'
	color?: ProgressColor
	className?: string
}

export function ProgressBar({
	value,
	max = 100,
	size,
	color = 'blue',
	className,
	...labelProps
}: ProgressBarProps) {
	const determinate = value != null

	const pct = determinate ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

	return (
		<div
			data-slot="progress-bar"
			role="progressbar"
			aria-valuenow={determinate ? value : undefined}
			aria-valuemin={0}
			aria-valuemax={max}
			{...labelProps}
			className={cn(progressTrackVariants({ size }), className)}
		>
			{determinate ? (
				<ReducedMotion>
					<motion.div
						className={cn(k.bar.fill, k.color[color].bg)}
						initial={{ width: 0 }}
						animate={{ width: `${pct}%` }}
						transition={{ type: 'spring', stiffness: 100, damping: 20 }}
					/>
				</ReducedMotion>
			) : (
				<div className={cn(k.bar.fill, k.color[color].bg, k.bar.indeterminate)} />
			)}
		</div>
	)
}
