import { describe, expect, it } from 'vitest'
import { cn } from '../../core/cn'
import { LineChart, seriesColor } from '../../modules/chart'
import { k } from '../../recipes/kata/chart'
import { allBySlot, present, renderUI } from '../helpers'

type Row = { month: string } & Record<`s${number}`, number>

/** One series past the length of the palette, so the case also reads the wrap. */
const SERIES_COUNT = k.order.length + 1

const data: Row[] = ['Jan', 'Feb'].map((month, row) => ({
	month,
	...Object.fromEntries(
		Array.from({ length: SERIES_COUNT }, (_, index) => [`s${index}`, row + index]),
	),
}))

const series = Array.from({ length: SERIES_COUNT }, (_, index) => ({
	xKey: 'month' as const,
	yKey: `s${index}` as const,
	// One explicit color, so the case reads both arms of the rule.
	...(index === 2 ? { color: '#e11d48' } : {}),
}))

describe('seriesColor', () => {
	it('gives the color that the chart paints each series in', () => {
		const { container } = renderUI(
			<LineChart aria-label="Series" data={data} series={series} width={400} />,
		)

		const lines = allBySlot(container, 'chart-line-series').map((group) =>
			present(group.querySelector('[data-slot="chart-line"]'), 'series line'),
		)

		expect(lines).toHaveLength(SERIES_COUNT)

		series.forEach((entry, index) => {
			const color = seriesColor(entry, index)

			const line = present(lines[index], 'series line')

			if (color in k.series) {
				expect(line).toHaveClass(...cn(k.series[color as keyof typeof k.series].stroke).split(' '))
			} else {
				expect(line).toHaveAttribute('stroke', color)
			}
		})
	})

	it('wraps the palette order past its last slot', () => {
		expect(seriesColor({}, k.order.length)).toBe(seriesColor({}, 0))
	})
})
