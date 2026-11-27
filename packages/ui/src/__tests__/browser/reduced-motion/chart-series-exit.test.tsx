import { describe, expect, it } from 'vitest'
import { BarChart } from '../../../modules/chart/bar-chart'
import { renderUI, waitFor } from '../../helpers'
import { legendItem } from '../../helpers/chart-legend'
import { nextPaint } from '../../helpers/frames'

const DATA = [
	{ quarter: 'Q1', north: 32, south: 24, west: 18 },
	{ quarter: 'Q2', north: 40, south: 28, west: 22 },
	{ quarter: 'Q3', north: 38, south: 35, west: 20 },
]

const SERIES = [
	{ xKey: 'quarter', yKey: 'north', yName: 'North' },
	{ xKey: 'quarter', yKey: 'south', yName: 'South' },
	{ xKey: 'quarter', yKey: 'west', yName: 'West' },
] as const

/** The `d` of each drawn bar, in draw order: series by series. */
function barPaths(container: HTMLElement): string[] {
	return [...container.querySelectorAll('[data-slot="chart-bar"]')].map(
		(bar) => bar.getAttribute('d') ?? '',
	)
}

/**
 * Real-Motion check of the exit of a hidden series for a reader who asks for
 * reduced motion. `motion/chart-series-exit.test.tsx` holds the exit for full
 * motion.
 */
describe('chart series exit under reduced motion (real Motion)', () => {
	it('lays out at once', async () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Sales by quarter"
				data={DATA}
				series={[...SERIES]}
				width={400}
				stacked
				animate
			/>,
		)

		await waitFor(() => expect(barPaths(container)).toHaveLength(9))

		const before = barPaths(container)

		legendItem(container, 'South').click()

		await nextPaint()

		const after = barPaths(container)

		expect(after).toHaveLength(6)

		// The West bars stand on North in the frame of the toggle.
		expect(after.slice(3)).not.toEqual(before.slice(6))
	})
})
