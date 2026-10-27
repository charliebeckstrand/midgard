import { describe, expect, it } from 'vitest'
import { LineChart } from '../../modules/chart/line-chart'
import { LocaleProvider } from '../../providers/locale'
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

/** Twelve rows four minutes apart, from 10:01 to 10:45, keyed by local ISO time. */
const MINUTES = Array.from({ length: 12 }, (_, index) => ({
	at: `2026-06-01T10:${String(1 + index * 4).padStart(2, '0')}`,
	visits: 100 + index,
}))

/** The same chart over a single June date, under an explicit ambient locale. */
function localized(locale: string) {
	return renderUI(
		<LocaleProvider locale={locale}>
			<LineChart
				aria-label="Visits by day"
				data={[
					{ day: '2026-06-10', visits: 100 },
					{ day: '2026-06-11', visits: 120 },
				]}
				series={[{ xKey: 'day', yKey: 'visits', yName: 'Visits' }]}
				width={600}
			/>
		</LocaleProvider>,
	)
}

/** A time axis over one row, keyed by `day`. */
function single(day: string | number) {
	return renderUI(
		<LocaleProvider locale="en-US">
			<LineChart
				aria-label="Visits by day"
				data={[{ day, visits: 100 }]}
				series={[{ xKey: 'day', yKey: 'visits', yName: 'Visits' }]}
				width={600}
				axes={{ x: { type: 'time' } }}
			/>
		</LocaleProvider>,
	)
}

describe('chart time axis', () => {
	it('writes the label of a single row as a date, never as the raw key', () => {
		const iso = bySlot(single('2026-01-05').container, 'chart-axis-x')?.textContent

		expect(iso).toBe('Jan 5, 2026')

		const epoch = new Date(2026, 0, 5).getTime()

		expect(bySlot(single(epoch).container, 'chart-axis-x')?.textContent).toBe('Jan 5, 2026')
	})

	it('replaces the raw category labels with calendar ticks', () => {
		const time = bySlot(line('time').container, 'chart-axis-x')?.textContent ?? ''

		const category = bySlot(line('category').container, 'chart-axis-x')?.textContent ?? ''

		// The category axis normalizes the date keys to the locale's month/day form
		// and thins them; the time axis lines month boundaries, so the day-precise
		// first key is gone and far fewer labels remain.
		expect(category).toContain('01/01')

		expect(time).not.toContain('01/01')

		expect(time.length).toBeLessThan(category.length)
	})

	it('lines minute ticks over a span that crosses no hour', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Visits by minute"
				data={MINUTES}
				series={[{ xKey: 'at', yKey: 'visits', yName: 'Visits' }]}
				width={600}
				axes={{ x: { type: 'time' } }}
			/>,
		)

		// Hour ticks find no boundary here, and an empty tick list drew a blank axis.
		expect(bySlot(container, 'chart-axis-x')?.textContent).toContain('10:15')
	})

	it('reads the tooltip and table categories as formatted dates', () => {
		const table = bySlot(line('time').container, 'chart-table')?.textContent ?? ''

		// Medium locale date, not the raw ISO key.
		expect(table).toContain('2026')

		expect(table).not.toContain('2026-01-01')
	})

	it('reads each row of a one-day span apart in the table', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Visits by minute"
				data={MINUTES}
				series={[{ xKey: 'at', yKey: 'visits', yName: 'Visits' }]}
				width={600}
				axes={{ x: { type: 'time' } }}
			/>,
		)

		const headers = [...(bySlot(container, 'chart-table')?.querySelectorAll('th') ?? [])].map(
			(cell) => cell.textContent,
		)

		// Every row falls on 1 June, so a date alone would read the same twelve times.
		expect(headers).toContain('Jun 1, 2026, 10:01 AM')

		expect(headers).toContain('Jun 1, 2026, 10:45 AM')
	})

	it("leaves the axis categorical by default, normalizing the date keys to the locale's form", () => {
		const category = bySlot(line().container, 'chart-axis-x')?.textContent ?? ''

		// Per-row date labels, normalized but not replaced by calendar month ticks.
		expect(category).toContain('01/01')

		expect(category).not.toContain('2026-01-01')
	})

	it('takes the field order from <LocaleProvider>, not the runtime locale', () => {
		// The 10th of June: the one date whose two numeric orders read differently,
		// so the assertion cannot pass on the runtime locale by accident. `LANG` is
		// pinned to `en-US` by the test scripts, which is the day-second order.
		const gb = bySlot(localized('en-GB').container, 'chart-axis-x')?.textContent ?? ''

		const us = bySlot(localized('en-US').container, 'chart-axis-x')?.textContent ?? ''

		expect(gb).toContain('10/06')

		expect(gb).not.toContain('06/10')

		expect(us).toContain('06/10')

		expect(us).not.toContain('10/06')
	})
})
