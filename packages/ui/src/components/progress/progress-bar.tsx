'use client'

import { cn } from '../../core'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { ReducedMotion } from '../../primitives/reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import {
	k,
	type ProgressBarFillVariants,
	type ProgressTrackVariants,
} from '../../recipes/kata/progress'
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
	/**
	 * The value of a full bar. The bar holds `value` between 0 and `max`.
	 *
	 * @defaultValue 100
	 */
	max?: number
	/** The density step of the track height. Omit it to take the step of the nearest density scope. */
	size?: ProgressTrackVariants['size']
	/**
	 * The palette color of the fill.
	 *
	 * @defaultValue 'zinc'
	 */
	color?: ProgressColor
	className?: string
}

/**
 * Linear progress indicator rendered as a `role="progressbar"`. Determinate
 * when `value` is a usable number, with the fill width at its clamped
 * percentage; otherwise indeterminate, with a fill that sweeps along the
 * track. The fill mounts at its value and
 * animates each change of value. The track takes the step of the nearest
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

	// The fill mounts at its value. A sweep up from zero on mount plays again
	// each time a tab panel brings the bar back. The fill animates `width`,
	// which is no transform, so the reduced-motion config of motion does not
	// skip it. Under reduced motion the fill moves to each new value without a
	// spring.
	const still = usePrefersReducedMotion()

	return (
		<div
			data-slot="progress-bar"
			data-density={size}
			{...labelProps}
			role="progressbar"
			aria-valuenow={determinate ? clamp(value, 0, max) : undefined}
			aria-valuemin={0}
			aria-valuemax={max}
			className={cn(k(), className)}
		>
			{/* The `m` fill animates with the features that a `ReducedMotion` root loads. */}
			<ReducedMotion>
				{determinate ? (
					<m.div
						className={k.bar.fill({ color })}
						initial={false}
						animate={{ width: `${percent}%` }}
						transition={still ? k.still : k.spring}
					/>
				) : (
					// The sweep moves a transform, so it needs no keyframe in a stylesheet.
					// Under reduced motion the fill holds still: at the start of the track
					// from its mount, or where a change of the preference stops the sweep.
					<m.div
						className={cn(k.bar.fill({ color }), k.bar.indeterminate)}
						animate={still ? undefined : k.sweep.animate}
						transition={k.sweep.transition}
					/>
				)}
			</ReducedMotion>
		</div>
	)
}
