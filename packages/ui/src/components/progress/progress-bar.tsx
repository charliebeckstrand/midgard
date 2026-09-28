'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { k, type ProgressBarFillVariants } from '../../recipes/kata/progress'
import type { AccessibleName } from '../../types'
import { clamp, pct } from '../../utilities'

type ProgressColor = NonNullable<ProgressBarFillVariants['color']>

/**
 * Props for {@link ProgressBar}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), enforced at the type level by `AccessibleName`.
 */
export type ProgressBarProps = AccessibleName & {
	/** Current progress; omit (or pass `NaN`) for an indeterminate bar. */
	value?: number
	/** @defaultValue 100 */
	max?: number
	size?: DensityStep
	/** @defaultValue 'zinc' */
	color?: ProgressColor
	className?: string
}

/**
 * Linear progress indicator rendered as a `role="progressbar"`. Determinate
 * when `value` is a usable number, animating the fill width to its clamped
 * percentage; otherwise indeterminate. The track takes the step of the nearest
 * density scope, and an explicit `size` opens a scope on it. It respects
 * reduced-motion.
 *
 * @remarks
 * Exposes `aria-valuenow`/`aria-valuemin`/`aria-valuemax` when determinate and
 * drops `aria-valuenow` when indeterminate. The accessible name is required by
 * {@link ProgressBarProps}.
 */
export function ProgressBar({
	value,
	max = 100,
	size,
	color,
	className,
	...labelProps
}: ProgressBarProps) {
	// NaN is "no usable value": treating it as determinate renders
	// aria-valuenow="NaN" and width "NaN%".
	const determinate = value != null && !Number.isNaN(value)

	const percent = determinate ? clamp(pct(value, 0, max), 0, 100) : 0

	return (
		<div
			data-slot="progress-bar"
			data-density={size}
			role="progressbar"
			aria-valuenow={determinate ? clamp(value, 0, max) : undefined}
			aria-valuemin={0}
			aria-valuemax={max}
			{...labelProps}
			className={cn(k(), className)}
		>
			{determinate ? (
				<ReducedMotion>
					<motion.div
						className={k.bar.fill({ color })}
						initial={{ width: 0 }}
						animate={{ width: `${percent}%` }}
						transition={k.spring}
					/>
				</ReducedMotion>
			) : (
				<div className={cn(k.bar.fill({ color }), k.bar.indeterminate)} />
			)}
		</div>
	)
}
