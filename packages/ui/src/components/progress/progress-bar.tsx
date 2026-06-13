'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/density'
import { ReducedMotion } from '../../primitives/reduced-motion'
import type { Step } from '../../recipes'
import { k, type ProgressBarFillVariants } from '../../recipes/kata/progress'
import type { AccessibleName } from '../../types'
import { clamp, pct } from '../../utilities'

type ProgressColor = NonNullable<ProgressBarFillVariants['color']>

/**
 * Props for {@link ProgressBar}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), enforced at the type level by `AccessibleName`.
 */
// `progressbar` requires an accessible name; `AccessibleName` enforces one at the type level.
export type ProgressBarProps = AccessibleName & {
	/** Current progress; omit (or pass `NaN`) for an indeterminate bar. */
	value?: number
	/** @defaultValue 100 */
	max?: number
	size?: Step
	color?: ProgressColor
	className?: string
}

/**
 * Linear progress indicator rendered as a `role="progressbar"`. Determinate
 * when `value` is a usable number, animating the fill width to its clamped
 * percentage; otherwise indeterminate. Resolves `size` against enclosing
 * Density and respects reduced-motion.
 */
export function ProgressBar({
	value,
	max = 100,
	size,
	color,
	className,
	...labelProps
}: ProgressBarProps) {
	const resolvedSize = useResolvedSize(size)

	// NaN is "no usable value": treating it as determinate renders
	// aria-valuenow="NaN" and width "NaN%".
	const determinate = value != null && !Number.isNaN(value)

	const percent = determinate ? clamp(pct(value, 0, max), 0, 100) : 0

	return (
		<div
			data-slot="progress-bar"
			role="progressbar"
			aria-valuenow={determinate ? clamp(value, 0, max) : undefined}
			aria-valuemin={0}
			aria-valuemax={max}
			{...labelProps}
			className={cn(k({ size: resolvedSize }), className)}
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
