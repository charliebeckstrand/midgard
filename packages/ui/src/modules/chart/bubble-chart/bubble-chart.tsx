'use client'

import type { BubbleChartSeries, ChartBaseProps } from '../chart-schema'
import { ScatterChart, type ScatterFrameProps } from '../scatter-chart'

/**
 * Props for {@link BubbleChart}: the scatter props with the size encoding
 * required on every series. Requires an accessible name (`aria-label` or
 * `aria-labelledby`) — the plot is `role="img"`, so assistive tech needs a
 * name for it.
 */
export type BubbleChartProps<T> = ChartBaseProps<T> &
	ScatterFrameProps & {
		/** The series to plot, each row a disc sized by its `sizeKey` measure. */
		series: BubbleChartSeries<T>[]
	}

/**
 * A bubble chart: the {@link ScatterChart} with the size encoding required, so
 * every series carries a third measure — each disc's area scales with its
 * `sizeKey` value between the series' `size` and `maxSize` diameters. The
 * discs fill translucently so overlapping points stay severally readable, and
 * the tooltip and data table read the size measure beside each value.
 *
 * @remarks Everything else is the scatter contract: linear scales both ways,
 * parse-tolerant rows, legend toggles, unique-x keyboard roving, and the
 * visually-hidden data table.
 * @example
 * ```tsx
 * <BubbleChart
 *   aria-label="Dwell against distance, sized by weight"
 *   data={stops}
 *   series={[{ xKey: 'distance', yKey: 'dwell', sizeKey: 'weight', yName: 'Stops' }]}
 * />
 * ```
 */
export function BubbleChart<T>(props: BubbleChartProps<T>) {
	return <ScatterChart {...props} />
}
