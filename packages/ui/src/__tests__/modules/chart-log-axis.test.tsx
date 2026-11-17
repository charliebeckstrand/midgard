import { describe, expect, it } from 'vitest'
import { BarChart, LineChart, ScatterChart } from '../../modules/chart'
import { allBySlot, bySlot, getSlot, renderUI } from '../helpers'
import { axisLabels } from '../helpers/axis-labels'
import { subpathCount } from '../helpers/geometry/svg-path'

type Row = { month: string; orders: number; refunds: number }

/** One row of each: a value in the thousands, one in the tens, a zero, and a negative. */
const DATA: Row[] = [
	{ month: 'Jan', orders: 4200, refunds: 12 },
	{ month: 'Feb', orders: 3100, refunds: 0 },
	{ month: 'Mar', orders: 5600, refunds: -3 },
	{ month: 'Apr', orders: 2400, refunds: 30 },
]

const SERIES = [
	{ xKey: 'month', yKey: 'orders', yName: 'Orders' },
	{ xKey: 'month', yKey: 'refunds', yName: 'Refunds' },
] as const

const LOG = { y: { scale: 'log' } } as const

/** How many subfigures the paths of one slot draw: one for each bar, or one for each line run. */
function subpaths(container: HTMLElement, slot: string): number {
	return allBySlot(container, slot).reduce(
		(sum, path) => sum + subpathCount(path.getAttribute('d')),
		0,
	)
}

describe('a log value axis', () => {
	it('ticks on whole powers of ten in the axis format', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Orders"
				data={DATA}
				series={[SERIES[0]]}
				axes={{ y: { scale: 'log', format: (value) => `#${value}` } }}
				width={400}
				height={300}
			/>,
		)

		expect(axisLabels(container, 'chart-axis-y')).toEqual(['#1000', '#10000'])
	})

	it('draws no bar for a zero or a negative value, and the table still reads both', () => {
		const { container } = renderUI(
			<BarChart aria-label="Refunds" data={DATA} series={[SERIES[1]]} axes={LOG} width={400} />,
		)

		expect(subpaths(container, 'chart-bar')).toBe(2)

		const table = getSlot(container, 'chart-table').textContent ?? ''

		expect(table).toContain('0')

		expect(table).toContain('-3')
	})

	it('breaks a line at a value it cannot place', () => {
		const { container } = renderUI(
			<LineChart aria-label="Refunds" data={DATA} series={[SERIES[1]]} axes={LOG} width={400} />,
		)

		const linear = renderUI(
			<LineChart aria-label="Refunds" data={DATA} series={[SERIES[1]]} width={400} />,
		)

		expect(subpaths(linear.container, 'chart-line')).toBe(1)

		// Jan stands alone before the gap, and Apr after it: neither run has a segment.
		expect(subpaths(container, 'chart-line')).toBe(0)
	})

	it('puts the orders and the refunds on one axis, a decade apart or more', () => {
		const { container } = renderUI(
			<BarChart aria-label="Orders" data={DATA} series={[...SERIES]} axes={LOG} width={400} />,
		)

		const ticks = axisLabels(container, 'chart-axis-y').map((label) =>
			Number(label.replace(/\D/g, '')),
		)

		expect(ticks[0]).toBeLessThanOrEqual(10)

		expect(ticks.at(-1)).toBeGreaterThanOrEqual(10_000)
	})

	it('draws no rule at or below zero', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Orders"
				data={DATA}
				series={[SERIES[0]]}
				axes={LOG}
				reference={[
					{ value: 0, label: 'Floor' },
					{ value: 3000, label: 'Target' },
				]}
				width={400}
			/>,
		)

		expect(allBySlot(container, 'chart-reference-line')).toHaveLength(1)

		// The rule at zero does not pull the axis down to a floor it cannot reach.
		expect(axisLabels(container, 'chart-axis-y')[0]).toBe('1,000')

		// The hidden list still names it.
		expect(bySlot(container, 'chart-reference-list')?.textContent).toContain('Floor')
	})

	it('has no effect on a stacked chart', () => {
		const stacked = renderUI(
			<BarChart
				aria-label="Orders"
				data={DATA}
				series={[...SERIES]}
				stacked
				axes={LOG}
				width={400}
			/>,
		)

		const linear = renderUI(
			<BarChart aria-label="Orders" data={DATA} series={[...SERIES]} stacked width={400} />,
		)

		expect(axisLabels(stacked.container, 'chart-axis-y')).toEqual(
			axisLabels(linear.container, 'chart-axis-y'),
		)
	})

	it('draws no disc for a point at or below zero on a log axis of a scatter', () => {
		const points = [
			{ x: 1, y: 10 },
			{ x: 100, y: 0 },
			{ x: 1000, y: 400 },
		]

		const series = [{ xKey: 'x', yKey: 'y', yName: 'Y' }] as const

		const log = renderUI(
			<ScatterChart
				aria-label="Points"
				data={points}
				series={[...series]}
				axes={{ x: { scale: 'log' }, y: { scale: 'log' } }}
				width={400}
			/>,
		)

		const linear = renderUI(
			<ScatterChart aria-label="Points" data={points} series={[...series]} width={400} />,
		)

		expect(subpaths(log.container, 'chart-scatter-discs')).toBeLessThan(
			subpaths(linear.container, 'chart-scatter-discs'),
		)

		expect(axisLabels(log.container, 'chart-axis-x')).toEqual(['1', '10', '100', '1,000'])
	})

	it('leaves a point that the log axis cannot place out of the linear axis', () => {
		const points = [
			{ x: 0, y: -500 },
			{ x: 1, y: 2 },
			{ x: 10, y: 6 },
			{ x: 100, y: 9 },
		]

		const { container } = renderUI(
			<ScatterChart
				aria-label="Points"
				data={points}
				series={[{ xKey: 'x', yKey: 'y', yName: 'Y' }]}
				axes={{ x: { scale: 'log' } }}
				width={400}
			/>,
		)

		// The point at x 0 draws no disc, so its y of -500 does not stretch the y axis.
		const ticks = axisLabels(container, 'chart-axis-y').map(Number)

		expect(Math.min(...ticks)).toBeGreaterThanOrEqual(0)

		expect(Math.max(...ticks)).toBeLessThanOrEqual(10)
	})
})
