/**
 * The stack of a cartesian chart: how a stacked bar or area builds its column,
 * and the edges of that column for the value domain. It also names the one axis
 * that the stack binds to. It holds no React, so the stack math is
 * unit-testable in isolation.
 */

import type { ChartValueAxisId } from '../chart-axes/schema'
import type { SeriesMeta } from '../chart-series'
import type { ChartSeries } from '../types'

/**
 * How a stack builds its column: `'signed'` adds each value to the running
 * total (area), `'positive'` adds only positive values (bar). `false` is no
 * stack.
 *
 * @internal
 */
export type StackMode = false | 'signed' | 'positive'

/** The stack mode a chart's config asks for. @internal */
export function stackModeOf(config: { stack?: boolean; stackPositive?: boolean }): StackMode {
	if (!config.stack) return false

	return config.stackPositive ? 'positive' : 'signed'
}

/**
 * The per-category edges a stack draws, for its domain. A positive stack rises
 * to the sum of its positive values. A signed stack draws every running total,
 * so a total in the middle of the stack can pass the final one.
 *
 * @internal
 */
export function stackEdges(
	bound: SeriesMeta[],
	count: number,
	mode: 'signed' | 'positive',
): number[] {
	const edges: number[] = []

	for (let index = 0; index < count; index++) {
		let sum = 0

		for (const meta of bound) {
			const value = meta.values[index] ?? 0

			if (mode === 'positive') {
				if (value > 0) sum += value
			} else {
				sum += value

				edges.push(sum)
			}
		}

		if (mode === 'positive') edges.push(sum)
	}

	return edges
}

/** The one axis a stack binds to: the axis every series agrees on, else `y`. @internal */
export function stackAxisOf<T>(series: ChartSeries<T>[]): ChartValueAxisId {
	const first = series[0]?.axis ?? 'y'

	return series.every((entry) => (entry.axis ?? 'y') === first) ? first : 'y'
}
