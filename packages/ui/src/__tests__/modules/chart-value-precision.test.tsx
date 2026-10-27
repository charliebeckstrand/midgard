import { describe, expect, it } from 'vitest'
import { LineChart } from '../../modules/chart/line-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { bySlot, renderUI } from '../helpers'

/**
 * The default number formats of a chart, over values that two fraction digits
 * cannot tell apart. A quote moves in the fourth digit, and a rate can be well
 * under a hundredth.
 */
const QUOTES = [
	{ day: 'Mon', rate: 1.0842 },
	{ day: 'Tue', rate: 1.0861 },
	{ day: 'Wed', rate: 1.0855 },
	{ day: 'Thu', rate: 1.0849 },
]

/** The tick labels inside an axis group, in draw order. */
function tickLabels(container: HTMLElement, slot: string): string[] {
	return [...(bySlot(container, slot)?.querySelectorAll('text') ?? [])].map(
		(tick) => tick.textContent ?? '',
	)
}

/** The text of each data cell of the hidden table, row by row. */
function tableCells(container: HTMLElement): string[] {
	return [...(bySlot(container, 'chart-table')?.querySelectorAll('tbody td') ?? [])].map(
		(cell) => cell.textContent ?? '',
	)
}

function quotes(width: number) {
	return renderUI(
		<LineChart
			aria-label="Exchange rate by day"
			data={QUOTES}
			width={width}
			series={[{ xKey: 'day', yKey: 'rate', yName: 'EUR/USD' }]}
		/>,
	)
}

describe('value precision', () => {
	it('writes each value tick once, with the digits of its step', () => {
		const { container } = quotes(480)

		const ticks = tickLabels(container, 'chart-axis-y')

		expect(ticks.length).toBeGreaterThan(1)

		expect(new Set(ticks).size).toBe(ticks.length)

		expect(ticks).toContain('1.085')
	})

	it('writes each compact value tick once in a narrow frame', () => {
		const { container } = quotes(320)

		const ticks = tickLabels(container, 'chart-axis-y')

		expect(ticks.length).toBeGreaterThan(1)

		expect(new Set(ticks).size).toBe(ticks.length)
	})

	it('keeps the digits of a fine value in the readout', () => {
		const { container } = quotes(480)

		expect(tableCells(container)).toEqual(['1.0842', '1.0861', '1.0855', '1.0849'])
	})

	it('keeps a value under a hundredth in the readout', () => {
		const { container } = renderUI(
			<ScatterChart
				aria-label="Error rate by load"
				data={[
					{ load: 1, errors: 0.0001 },
					{ load: 2, errors: 0.0003 },
				]}
				width={480}
				series={[{ xKey: 'load', yKey: 'errors', yName: 'Errors' }]}
			/>,
		)

		expect(tableCells(container).join(' ')).toContain('0.0003')

		const ticks = tickLabels(container, 'chart-axis-y')

		expect(new Set(ticks).size).toBe(ticks.length)
	})
})
