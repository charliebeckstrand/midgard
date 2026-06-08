'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import type { Step } from '../../recipes'
import { k, type ProgressBarFillVariants } from '../../recipes/kata/progress'
import type { AccessibleName } from '../../types'
import { clamp, pct } from '../../utilities'

type ProgressColor = NonNullable<ProgressBarFillVariants['color']>

// `progressbar` requires an accessible name; `AccessibleName` enforces one at the type level.
export type ProgressBarProps = AccessibleName & {
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
			aria-valuenow={determinate ? clamp(value, 0, max) : undefined}
			aria-valuemin={0}
			aria-valuemax={max}
			{...labelProps}
			className={cn(k({ size }), className)}
		>
			{determinate ? (
				<ReducedMotion>
					<motion.div
						className={k.bar.fill({ color })}
						initial={{ width: 0 }}
						animate={{ width: `${percent}%` }}
						transition={{ type: 'spring', stiffness: 100, damping: 20 }}
					/>
				</ReducedMotion>
			) : (
				<div className={cn(k.bar.fill({ color }), k.bar.indeterminate)} />
			)}
		</div>
	)
}
