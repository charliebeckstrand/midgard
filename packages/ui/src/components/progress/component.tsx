'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { k, progressGaugeVariants, progressTrackVariants } from './variants'

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

// ── ProgressGauge ───────────────────────────────────────

export type ProgressGaugeProps = {
	value?: number
	max?: number
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
	color?: ProgressColor
	label?: React.ReactNode | boolean
	strokeWidth?: number
	'aria-label'?: string
	'aria-labelledby'?: string
	className?: string
}

const gaugeViewBox = 36

const defaultStrokeWidth = 3.5

export function ProgressGauge({
	value = 0,
	max = 100,
	size,
	color = 'blue',
	label,
	strokeWidth = defaultStrokeWidth,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
	className,
}: ProgressGaugeProps) {
	const pct = Math.min(100, Math.max(0, (value / max) * 100))

	const resolvedSize = size ?? 'md'

	const radius = (gaugeViewBox - strokeWidth) / 2

	const circumference = 2 * Math.PI * radius

	const offset = circumference - (pct / 100) * circumference

	const resolvedLabel = label === true ? Math.round(pct) : label

	return (
		<div
			data-slot="progress-gauge"
			role="progressbar"
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={max}
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledBy}
			className={cn(progressGaugeVariants({ size }), className)}
		>
			<svg
				aria-hidden="true"
				viewBox={`0 0 ${gaugeViewBox} ${gaugeViewBox}`}
				className="size-full -rotate-90"
			>
				{/* Track */}
				<circle
					cx={gaugeViewBox / 2}
					cy={gaugeViewBox / 2}
					r={radius}
					fill="none"
					strokeWidth={strokeWidth}
					className={cn(k.track.stroke)}
					strokeLinecap="round"
				/>

				{/* Fill */}
				<motion.circle
					cx={gaugeViewBox / 2}
					cy={gaugeViewBox / 2}
					r={radius}
					fill="none"
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					className={cn(k.color[color].stroke)}
					initial={{ strokeDashoffset: circumference }}
					animate={{ strokeDashoffset: offset }}
					transition={{ type: 'spring', stiffness: 100, damping: 20 }}
				/>
			</svg>

			{resolvedLabel != null && (
				<span className={cn(k.gauge.label, k.gauge.labelSize[resolvedSize])}>{resolvedLabel}</span>
			)}
		</div>
	)
}
