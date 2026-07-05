'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { useChartEmphasis } from './context'

/** Props for {@link ChartMarksLayer}. @internal */
export type ChartMarksLayerProps = {
	/** Whether the marks animate; the reveal wraps in `ReducedMotion` when so. */
	animate: boolean
	children: ReactNode
}

/**
 * Wraps a chart's marks in the `chart-marks` group. Pointing a reference rule
 * recedes the whole group to a quarter opacity — the same focus the legend
 * applies to a series — so a rule's hover reads as a deliberate emphasis rather
 * than a hit-target conflict with the marks under it. Animated marks add the
 * `ReducedMotion` reveal: it plays when the marks first mount and later geometry
 * changes animate in place on stable keys, never replaying.
 *
 * @internal
 */
export function ChartMarksLayer({ animate, children }: ChartMarksLayerProps) {
	const { referenceActive } = useChartEmphasis()

	const marks = (
		<g
			data-slot="chart-marks"
			className={cn('transition-opacity', referenceActive && 'opacity-25')}
		>
			{children}
		</g>
	)

	return animate ? <ReducedMotion>{marks}</ReducedMotion> : marks
}
