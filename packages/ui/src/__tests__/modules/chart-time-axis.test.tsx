import { describe, expect, it } from 'vitest'
import { LineChart } from '../../modules/chart/line-chart'
import { bySlot, renderUI } from '../helpers'

/** A quarter of daily rows keyed by ISO date, `2026-01-01` onward. */
const DAILY = Array.from({ length: 90 }, (_, index) => {
	const date = new Date(2026, 0, 1 + index)

	const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

	return { day: iso, visits: 100 + index }
})

function line(type?: 'category' | 'time') {
	return renderUI(
		<LineChart
			aria-label="Visits by day"
			data={DAILY}
			series={[{ xKey: 'day', yKey: 'visits', yName: 'Visits' }]}
			width={600}
			axes={type ? { x: { type } } : true}
		/>,
	)
}

describe('chart time axis', () => {
	it('replaces the raw category labels with calendar ticks', () => {
		const time = bySlot(line('time').container, 'chart-axis-x')?.textContent ?? ''

		const category = bySlot(line('category').container, 'chart-axis-x')?.textContent ?? ''

		// The category axis normalizes the date keys to MM-DD and thins them; the
		// time axis lines month boundaries, so the day-precise first key is gone and
		// far fewer labels remain.
		expect(category).toContain('01-01')

		expect(time).not.toContain('01-01')

		expect(time.length).toBeLessThan(category.length)
	})

	it('reads the tooltip and table categories as formatted dates', () => {
		const table = bySlot(line('time').container, 'chart-table')?.textContent ?? ''

		// Medium locale date, not the raw ISO key.
		expect(table).toContain('2026')

		expect(table).not.toContain('2026-01-01')
	})

	it('leaves the axis categorical by default, normalizing the date keys to MM-DD', () => {
		const category = bySlot(line().container, 'chart-axis-x')?.textContent ?? ''

		// Per-row date labels, normalized but not replaced by calendar month ticks.
		expect(category).toContain('01-01')

		expect(category).not.toContain('2026-01-01')
	})
})
