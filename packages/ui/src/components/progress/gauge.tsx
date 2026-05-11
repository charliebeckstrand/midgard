'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives'
import { k, progressGaugeVariants } from '../../recipes/kata/progress'

type ProgressColor = keyof typeof k.color

// A progressbar role needs an accessible name; require one of these at the type
// level so consumers can't ship an unlabeled gauge.
type ProgressGaugeLabel = { 'aria-label': string } | { 'aria-labelledby': string }

export type ProgressGaugeProps = ProgressGaugeLabel & {
	value?: number
	max?: number
	size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
	color?: ProgressColor
	label?: ReactNode | boolean
	strokeWidth?: number
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
	className,
	...labelProps
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
			{...labelProps}
			className={cn(progressGaugeVariants({ size }), className)}
		>
			<ReducedMotion>
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
			</ReducedMotion>

			{resolvedLabel != null && (
				<span className={cn(k.gauge.label, k.gauge.labelSize[resolvedSize])}>{resolvedLabel}</span>
			)}
		</div>
	)
}
