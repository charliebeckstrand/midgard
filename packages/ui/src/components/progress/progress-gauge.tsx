'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useSizeWide } from '../../primitives/density'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k, type ProgressGaugeVariants } from '../../recipes/kata/progress'
import { clamp, pct } from '../../utilities'
import { GAUGE_VIEW_BOX } from './progress-gauge-constants'

type ProgressColor = keyof typeof k.color

// A progressbar role needs an accessible name; require one of these at the type
// level so consumers can't ship an unlabeled gauge.
type ProgressGaugeLabel = { 'aria-label': string } | { 'aria-labelledby': string }

export type ProgressGaugeProps = ProgressGaugeLabel &
	ProgressGaugeVariants & {
		value?: number
		max?: number
		color?: ProgressColor
		label?: ReactNode | boolean
		strokeWidth?: number
		className?: string
	}

export function ProgressGauge({
	value = 0,
	max = 100,
	size,
	color = 'zinc',
	label,
	strokeWidth = 3.5,
	className,
	...labelProps
}: ProgressGaugeProps) {
	const resolvedSize = useSizeWide(size)

	const radius = (GAUGE_VIEW_BOX - strokeWidth) / 2

	const percent = clamp(pct(value, 0, max), 0, 100)

	const circumference = 2 * Math.PI * radius

	const offset = circumference - (percent / 100) * circumference

	const resolvedLabel = label === true ? Math.round(percent) : label

	return (
		<div
			data-slot="progress-gauge"
			role="progressbar"
			aria-valuenow={value}
			aria-valuemin={0}
			aria-valuemax={max}
			{...labelProps}
			className={cn(k.gauge.root({ size: resolvedSize }), className)}
		>
			<ReducedMotion>
				<svg
					aria-hidden="true"
					viewBox={`0 0 ${GAUGE_VIEW_BOX} ${GAUGE_VIEW_BOX}`}
					className="size-full -rotate-90"
				>
					{/* Track */}
					<circle
						cx={GAUGE_VIEW_BOX / 2}
						cy={GAUGE_VIEW_BOX / 2}
						r={radius}
						fill="none"
						strokeWidth={strokeWidth}
						className={cn(k.gauge.track)}
						strokeLinecap="round"
					/>

					{/* Fill */}
					<motion.circle
						cx={GAUGE_VIEW_BOX / 2}
						cy={GAUGE_VIEW_BOX / 2}
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
				<span className={k.gauge.label({ size: resolvedSize })}>{resolvedLabel}</span>
			)}
		</div>
	)
}
