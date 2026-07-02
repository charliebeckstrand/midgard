'use client'

import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import type { ChartAnchor, PlotRect } from './chart-layout'
import { useChartHover } from './context'
import type { ChartReadout } from './types'

/** Props for {@link ChartTooltip}. @internal */
export type ChartTooltipProps = {
	plot: PlotRect
	/** Per-category attachment points, indexed like the readout's categories. */
	anchors: ChartAnchor[]
	readout: ChartReadout
}

/**
 * The hover readout: one tooltip listing every series at the pointed
 * category, values leading their labels. Positioned by math alone — right of
 * the anchor on the plot's left half, left of it on the right half, clamped
 * into the frame — so it never needs to measure itself.
 *
 * @remarks A pointer enhancement, `aria-hidden` by design: the same values
 * ship in the visually-hidden table, so nothing is gated behind hover.
 * @internal
 */
export function ChartTooltip({ plot, anchors, readout }: ChartTooltipProps) {
	const { index } = useChartHover()

	if (index === null) return null

	const anchor = anchors[index]

	if (!anchor) return null

	const flipped = anchor.x > plot.x + plot.width / 2

	const side = flipped ? { right: `calc(100% - ${anchor.x - 8}px)` } : { left: anchor.x + 8 }

	return (
		<div
			data-slot="chart-tooltip"
			aria-hidden="true"
			className={cn('pointer-events-none absolute z-10 px-2.5 py-1.5', k.tooltip)}
			style={{ top: Math.max(0, anchor.y), ...side }}
		>
			<div className={cn(k.label, 'mb-1 whitespace-nowrap')}>{readout.categories[index]}</div>

			<div className="space-y-0.5">
				{readout.rows.map((row) => (
					<div key={row.label} className="flex items-center gap-1.5 whitespace-nowrap">
						<span
							className={cn(
								row.swatch === 'rect' ? 'size-2 rounded-xs' : 'h-0.5 w-2.5 rounded-full',
								row.swatchClass,
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
