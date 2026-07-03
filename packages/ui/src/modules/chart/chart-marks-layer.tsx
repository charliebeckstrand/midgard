'use client'

import type { ReactNode } from 'react'
import { ReducedMotion } from '../../primitives/reduced-motion'

/** Props for {@link ChartMarksLayer}. @internal */
export type ChartMarksLayerProps = {
	/** Whether the marks animate; static marks render bare with no motion runtime. */
	animate: boolean
	children: ReactNode
}

/**
 * Wraps a chart's marks for the animated case: `ReducedMotion` for the
 * prefers-reduced-motion contract around a slotted group. The reveal plays
 * when the marks first mount — the frame gains its width and the SVG appears
 * — and later geometry changes animate in place on the marks' stable keys,
 * never replaying the reveal. Static marks render bare.
 *
 * @internal
 */
export function ChartMarksLayer({ animate, children }: ChartMarksLayerProps) {
	if (!animate) return <>{children}</>

	return (
		<ReducedMotion>
			<g data-slot="chart-marks">{children}</g>
		</ReducedMotion>
	)
}
