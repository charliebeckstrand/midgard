'use client'

import type { ReactNode } from 'react'
import { ChartPie, type PieBaseProps } from '../chart-pie'

/**
 * Props for {@link DonutChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type DonutChartProps<T> = PieBaseProps<T> & {
	/** Center content, rendered over the hole — a total, a stat, an icon. */
	children?: ReactNode
}

/** The hole radius as a fraction of the outer radius. @internal */
const DONUT_INNER_RATIO = 0.6

/**
 * A donut chart: one dataset's positive shares swept clockwise from the top
 * into a ring, its hole hosting the `children` (a total, a stat). Otherwise
 * identical to {@link PieChart} — the same gaps, legend, tooltip, segment
 * labels, and data table.
 *
 * @example
 * ```tsx
 * <DonutChart
 *   aria-label="Traffic by source"
 *   data={sources}
 *   series={[{ xKey: 'source', yKey: 'visits' }]}
 * >
 *   <Stat label="Total" value="12.4K" />
 * </DonutChart>
 * ```
 */
export function DonutChart<T>({ children, ...props }: DonutChartProps<T>) {
	return (
		<ChartPie {...props} innerRatio={DONUT_INNER_RATIO}>
			{children}
		</ChartPie>
	)
}
