'use client'

import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/density'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k, type ProgressGaugeVariants } from '../../recipes/kata/progress'
import type { AccessibleName } from '../../types'
import { clamp, pct } from '../../utilities'
import { GAUGE_VIEW_BOX } from './progress-gauge-constants'

type ProgressColor = keyof typeof k.color

/**
 * Props for {@link ProgressGauge}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), enforced at the type level by `AccessibleName`.
 */
export type ProgressGaugeProps = AccessibleName &
	ProgressGaugeVariants & {
		/** @defaultValue 0 */
		value?: number
		/** @defaultValue 100 */
		max?: number
		/** @defaultValue 'zinc' */
		color?: ProgressColor
		/** Center label; pass `true` to render the rounded percentage, or a node for custom content. */
		label?: ReactNode | boolean
		/**
		 * Ring thickness in viewBox units.
		 * @defaultValue 3.5
		 */
		strokeWidth?: number
		className?: string
	}

/**
 * Circular (radial) progress indicator rendered as a `role="progressbar"` over
 * an SVG ring whose arc animates to the clamped percentage, with an optional
 * center `label`. Resolves `size` against enclosing Density and respects
 * reduced-motion.
 *
 * @remarks
 * Always determinate: exposes `aria-valuenow`/`aria-valuemin`/`aria-valuemax`,
 * with `value` clamped to `[0, max]`. The decorative SVG is `aria-hidden`. The
 * accessible name is required by {@link ProgressGaugeProps}.
 */
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
	const resolvedSize = useResolvedSize(size)

	const radius = (GAUGE_VIEW_BOX - strokeWidth) / 2

	const percent = clamp(pct(value, 0, max), 0, 100)

	const circumference = 2 * Math.PI * radius

	const offset = circumference - (percent / 100) * circumference

	const resolvedLabel = label === true ? Math.round(percent) : label

	return (
		<div
			data-slot="progress-gauge"
			role="progressbar"
			aria-valuenow={clamp(value, 0, max)}
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

			{resolvedLabel != null && resolvedLabel !== false && (
				<span className={k.gauge.label({ size: resolvedSize })}>{resolvedLabel}</span>
			)}
		</div>
	)
}
