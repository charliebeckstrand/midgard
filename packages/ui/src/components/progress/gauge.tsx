'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { k, progressGaugeVariants } from './variants'

type ProgressColor = keyof typeof k.color

export type ProgressGaugeProps = {
	value?: number
	max?: number
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
	color?: ProgressColor
	label?: ReactNode | boolean
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
