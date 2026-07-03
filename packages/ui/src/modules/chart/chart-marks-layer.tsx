'use client'

import type { ReactNode } from 'react'
import { ReducedMotion } from '../../primitives/reduced-motion'

/** Props for {@link ChartMarksLayer}. @internal */
export type ChartMarksLayerProps = {
	/** Whether the marks animate; static marks render bare with no motion runtime. */
	animate: boolean
	/** The animation generation from `useChartAnimationKey`; a change replays the reveal. */
	generation: number
	children: ReactNode
}

/**
 * Wraps a chart's marks for the animated case: `ReducedMotion` for the
 * prefers-reduced-motion contract, and a group keyed by the animation
 * generation so the reveal replays only on mount and on resize-settle — never
 * on every intermediate resize frame. Static marks render bare.
 *
 * @internal
 */
export function ChartMarksLayer({ animate, generation, children }: ChartMarksLayerProps) {
	if (!animate) return <>{children}</>

	return (
		<ReducedMotion>
			<g key={generation} data-slot="chart-marks">
				{children}
			</g>
		</ReducedMotion>
	)
}
