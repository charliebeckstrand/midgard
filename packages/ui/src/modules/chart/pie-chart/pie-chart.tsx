'use client'

import { ChartPie, type PieBaseProps } from '../chart-pie'

/**
 * Props for {@link PieChart}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type PieChartProps<T> = PieBaseProps<T>

/**
 * A pie chart: one dataset's positive shares swept clockwise from the top
 * into full slices, separated by surface-colour gaps, with a legend naming
 * every slice, a per-slice hover tooltip, optional fit-gated segment labels,
 * and a visually-hidden data table. For a ring with center content, use
 * {@link DonutChart}.
 *
 * @remarks Slice colours follow the fixed categorical slot order. Rows with
 * non-positive values take no slice but keep their true value in the table;
 * missing values show an em-dash there. Focus the plot to read it by keyboard —
 * the arrow keys walk the slices, the tooltip riding each centroid.
 * @example
 * ```tsx
 * <PieChart
 *   aria-label="Traffic by source"
 *   data={sources}
 *   series={[{ xKey: 'source', yKey: 'visits' }]}
 *   labels={{ segment: true }}
 * />
 * ```
 */
export function PieChart<T>(props: PieChartProps<T>) {
	return <ChartPie {...props} innerRatio={0} />
}
