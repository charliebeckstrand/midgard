'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { k, progressTrackVariants } from './variants'

type ProgressColor = keyof typeof k.color

// ── ProgressBar ─────────────────────────────────────────

export type ProgressBarProps = {
	value?: number
	max?: number
	size?: 'sm' | 'md' | 'lg'
	color?: ProgressColor
	'aria-label'?: string
	'aria-labelledby'?: string
	className?: string
}

export function ProgressBar({
	value,
	max = 100,
	size,
	color = 'blue',
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
	className,
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
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledBy}
			className={cn(progressTrackVariants({ size }), className)}
		>
			{determinate ? (
				<motion.div
					className={cn(k.bar.fill, k.color[color].bg)}
					initial={{ width: 0 }}
					animate={{ width: `${pct}%` }}
					transition={{ type: 'spring', stiffness: 100, damping: 20 }}
				/>
			) : (
				<div className={cn(k.bar.fill, k.color[color].bg, k.bar.indeterminate)} />
			)}
		</div>
	)
}
