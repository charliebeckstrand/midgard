'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import type { Step } from '../../recipes'
import { k, type ProgressBarFillVariants, progressBarFill } from '../../recipes/kata/progress'
import { clamp, pct } from '../../utilities'

type ProgressColor = NonNullable<ProgressBarFillVariants['color']>

// A progressbar role needs an accessible name; require one of these at the type
// level so consumers can't ship an unlabeled progress indicator.
type ProgressBarLabel = { 'aria-label': string } | { 'aria-labelledby': string }

export type ProgressBarProps = ProgressBarLabel & {
	value?: number
	max?: number
	size?: Step
	color?: ProgressColor
	className?: string
}

export function ProgressBar({
	value,
	max = 100,
	size,
	color,
	className,
	...labelProps
}: ProgressBarProps) {
	const determinate = value != null

	const percent = determinate ? clamp(pct(value, 0, max), 0, 100) : 0

	return (
		<div
			data-slot="progress-bar"
			role="progressbar"
			aria-valuenow={determinate ? value : undefined}
			aria-valuemin={0}
			aria-valuemax={max}
			{...labelProps}
			className={cn(k({ size }), className)}
		>
			{determinate ? (
				<ReducedMotion>
					<motion.div
						className={progressBarFill({ color })}
						initial={{ width: 0 }}
						animate={{ width: `${percent}%` }}
						transition={{ type: 'spring', stiffness: 100, damping: 20 }}
					/>
				</ReducedMotion>
			) : (
				<div className={cn(progressBarFill({ color }), k.barIndeterminate)} />
			)}
		</div>
	)
}
