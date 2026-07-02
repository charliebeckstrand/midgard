'use client'

import { cn } from '../../core'
import { useGlass } from '../../providers/glass/context'
import { k } from '../../recipes/kata/chart'
import { k as tooltip } from '../../recipes/kata/tooltip'
import type { PlotRect } from './chart-layout'
import { useChartHover } from './context'
import type { ChartReadout } from './types'

/** Props for {@link ChartTooltip}. @internal */
export type ChartTooltipProps = {
	plot: PlotRect
	readout: ChartReadout
}

/** The pointer offset keeping the readout clear of the cursor. @internal */
const TRACK_OFFSET = 12

/**
 * The hover readout: one tooltip listing every series at the pointed
 * category, values leading their labels. It wears the Tooltip component's
 * surface — glass under the frame's `GlassProvider` — and tracks the pointer
 * precisely, flipping past it at the plot's midlines so it never runs out of
 * the frame. Positioned by math alone, it never needs to measure itself.
 *
 * @remarks A pointer enhancement, `aria-hidden` by design: the same values
 * ship in the visually-hidden table, so nothing is gated behind hover.
 * @internal
 */
export function ChartTooltip({ plot, readout }: ChartTooltipProps) {
	const { index, point } = useChartHover()

	const glass = useGlass()

	if (index === null || point === null) return null

	const flippedX = point.x > plot.x + plot.width / 2

	const flippedY = point.y > plot.y + plot.height / 2

	const position = {
		...(flippedX
			? { right: `calc(100% - ${point.x - TRACK_OFFSET}px)` }
			: { left: point.x + TRACK_OFFSET }),
		...(flippedY
			? { bottom: `calc(100% - ${point.y - TRACK_OFFSET}px)` }
			: { top: point.y + TRACK_OFFSET }),
	}

	return (
		<div
			data-slot="chart-tooltip"
			aria-hidden="true"
			className={cn(
				'pointer-events-none absolute z-10',
				tooltip.content({ size: 'sm' }),
				tooltip.surface[glass ? 'glass' : 'default'],
			)}
			style={position}
		>
			<div className={cn(k.label, 'mb-1 whitespace-nowrap')}>{readout.categories[index]}</div>

			<div className="space-y-0.5">
				{readout.rows.map((row) => (
					<div key={row.label} className="flex items-center gap-1.5 whitespace-nowrap">
						<span
							className={cn(
								row.swatch === 'rect' ? 'size-2 rounded-xs' : 'h-0.5 w-2.5 rounded-full',
								row.swatchClasses?.[index] ?? row.swatchClass,
							)}
						/>

						<span className={cn(k.value)}>{row.values[index]}</span>

						<span className={cn(k.label)}>{row.label}</span>
					</div>
				))}
			</div>
		</div>
	)
}
