'use client'

import { useMotionValue, useTransform } from 'motion/react'
import type { ReactNode } from 'react'
import { cn } from '../../core'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { ReducedMotion } from '../../primitives/reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
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
		/**
		 * The current progress. The gauge holds it between 0 and `max`, and reads `NaN` as 0.
		 *
		 * @defaultValue 0
		 */
		value?: number
		/**
		 * The value of a full ring.
		 *
		 * @defaultValue 100
		 */
		max?: number
		/**
		 * The palette color of the arc.
		 *
		 * @defaultValue 'zinc'
		 */
		color?: ProgressColor
		/** Center readout; pass `true` to render the rounded percentage, or a node for custom content. */
		centerLabel?: ReactNode | boolean
		/**
		 * Ring thickness in viewBox units, held between 0 and 18 (half the box).
		 * @defaultValue 3.5
		 */
		strokeWidth?: number
		className?: string
	}

/**
 * Circular (radial) progress indicator rendered as a `role="progressbar"` over
 * an SVG ring whose arc shows the clamped percentage, with an optional center
 * readout. The ring mounts at its value and animates each change of value. The ring and the readout take the step of the nearest density
 * scope, and an explicit `size` opens a scope on the root. It respects
 * reduced-motion.
 *
 * @remarks
 * Always determinate: exposes `aria-valuenow`/`aria-valuemin`/`aria-valuemax`,
 * with `value` clamped to `[0, max]`. A `NaN` value reads as `0`. The decorative SVG is `aria-hidden`. The
 * accessible name is required by {@link ProgressGaugeProps}.
 */
export function ProgressGauge({
	value: rawValue = 0,
	max = 100,
	size,
	color = 'zinc',
	centerLabel,
	strokeWidth: rawStrokeWidth = 3.5,
	className,
	...labelProps
}: ProgressGaugeProps) {
	// The gauge is always determinate, so a NaN value reads as zero. Otherwise NaN
	// reaches the ring offset, the readout, and `aria-valuenow`.
	const value = Number.isNaN(rawValue) ? 0 : rawValue

	// A ring as thick as half the box fills the disc to its center. A thicker
	// ring gives a radius of zero or less, and the ring does not draw.
	const strokeWidth = clamp(rawStrokeWidth, 0, GAUGE_VIEW_BOX / 2)

	const radius = (GAUGE_VIEW_BOX - strokeWidth) / 2

	const percent = clamp(pct(value, 0, max), 0, 100)

	const circumference = 2 * Math.PI * radius

	const offset = circumference - (percent / 100) * circumference

	const resolvedLabel = centerLabel === true ? Math.round(percent) : centerLabel

	// The ring mounts at its value. A sweep up from zero on mount plays again
	// each time a tab panel brings the gauge back. The fill animates
	// `strokeDashoffset`, which is no transform, so the reduced-motion config
	// of motion does not skip it. Under reduced motion the ring moves to each
	// new value without a spring.
	const still = usePrefersReducedMotion()

	// The animation moves this value, which the fill reads through `style`.
	const dashOffset = useMotionValue(offset)

	// At 0% the dash has no length, but its round cap still paints a dot. The
	// fill fades out over the last cap width of its length, so 0% shows the
	// track only, and an arc longer than its caps shows at full opacity.
	const fillOpacity = useTransform(dashOffset, [circumference - strokeWidth, circumference], [1, 0])

	return (
		<div
			data-slot="progress-gauge"
			data-density={size}
			role="progressbar"
			aria-valuenow={clamp(value, 0, max)}
			aria-valuemin={0}
			aria-valuemax={max}
			{...labelProps}
			className={cn(k.gauge.base(), className)}
		>
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
				/>

				{/* Fill. The `m` circle animates with the features that a `ReducedMotion` root loads. */}
				<ReducedMotion>
					<m.circle
						cx={GAUGE_VIEW_BOX / 2}
						cy={GAUGE_VIEW_BOX / 2}
						r={radius}
						fill="none"
						strokeWidth={strokeWidth}
						strokeLinecap="round"
						strokeDasharray={circumference}
						className={cn(k.color[color].stroke)}
						style={{ strokeDashoffset: dashOffset, opacity: fillOpacity }}
						initial={false}
						animate={{ strokeDashoffset: offset }}
						transition={still ? k.still : k.spring}
					/>
				</ReducedMotion>
			</svg>

			{resolvedLabel != null && resolvedLabel !== false && (
				<span className={k.gauge.label()}>{resolvedLabel}</span>
			)}
		</div>
	)
}
