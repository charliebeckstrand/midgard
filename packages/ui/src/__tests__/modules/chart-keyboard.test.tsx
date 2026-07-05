import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { bySlot, fireEvent, renderUI } from '../helpers'

const DATA = [
	{ quarter: 'Q1', revenue: 40 },
	{ quarter: 'Q2', revenue: 80 },
	{ quarter: 'Q3', revenue: 65 },
]

const SERIES = [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }] as const

function bar(extra?: Partial<Parameters<typeof BarChart<(typeof DATA)[number]>>[0]>) {
	return renderUI(
		<BarChart
			aria-label="Revenue by quarter"
			data={DATA}
			series={[...SERIES]}
			width={400}
			{...extra}
		/>,
	)
}

function tip(container: HTMLElement): string {
	return bySlot(container, 'tooltip-content')?.textContent ?? ''
}

describe('chart keyboard navigation', () => {
	it('makes a cartesian plot a tab stop, and an empty one inert', () => {
		expect(bySlot(bar().container, 'chart-plot')?.getAttribute('tabindex')).toBe('0')

		// No categories, no cursor to move.
		expect(bySlot(bar({ data: [] }).container, 'chart-plot')?.getAttribute('tabindex')).toBeNull()
	})

	it('roves the categories with the band-axis arrows, reading the tooltip', () => {
		const { container } = bar()

		const plot = bySlot(container, 'chart-plot') as Element

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		// Vertical chart: categories run across x, so Right advances them.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(tip(container)).toContain('Q1')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(tip(container)).toContain('Q2')

		// End jumps to the last category, Home to the first.
		fireEvent.keyDown(plot, { key: 'End' })

		expect(tip(container)).toContain('Q3')

		fireEvent.keyDown(plot, { key: 'Home' })

		expect(tip(container)).toContain('Q1')

		// The value-axis arrows don't rove a vertical chart's categories.
		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(tip(container)).toContain('Q1')
	})

	it('wraps at the ends', () => {
		const { container } = bar()

		const plot = bySlot(container, 'chart-plot') as Element

		fireEvent.keyDown(plot, { key: 'ArrowLeft' })

		// From nothing, Left lands on the last category, then wraps forward.
		expect(tip(container)).toContain('Q3')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(tip(container)).toContain('Q1')
	})

	it('clears the readout on Escape', () => {
		const { container } = bar()

		const plot = bySlot(container, 'chart-plot') as Element

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(bySlot(container, 'tooltip-content')).not.toBeNull()

		fireEvent.keyDown(plot, { key: 'Escape' })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('transposes the arrows for a horizontal chart', () => {
		const { container } = bar({ orientation: 'horizontal' })

		const plot = bySlot(container, 'chart-plot') as Element

		// Categories run down y, so Right does nothing and Down advances them.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(tip(container)).toContain('Q1')
	})

	it('leaves a pie plot without a tab stop', () => {
		const { container } = renderUI(
			<PieChart
				aria-label="Revenue share by quarter"
				data={DATA}
				series={[{ xKey: 'quarter', yKey: 'revenue' }]}
				width={400}
			/>,
		)

		expect(bySlot(container, 'chart-plot')?.getAttribute('tabindex')).toBeNull()
	})
})
