import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LineChart } from '../../modules/chart/line-chart'
import { act, fireEvent, getSlot, renderUI } from '../helpers'

/**
 * The visually-hidden data table must not render again for a pointer move.
 *
 * Each pointer move sets the pointed mark, so the frame renders again. The
 * table holds one cell for each category and series, and it rendered with the
 * frame. On a 10,000-row line that cost about 440ms of jsdom time for each
 * move. The table is now memoized on the readout thunk, which the pointer does
 * not change.
 *
 * The count reads the `rangeKeys` call that keys the table rows. No other chart
 * render asks for the `category` prefix. The count needs a module mock, so this
 * suite sits in `boundary/`.
 */
const tableRenders = vi.hoisted(() => ({ count: 0 }))

vi.mock('../../utilities', async (importActual) => {
	const actual = await importActual<typeof import('../../utilities')>()

	return {
		...actual,
		rangeKeys: (count: number, prefix: string) => {
			if (prefix === 'category') tableRenders.count++

			return actual.rangeKeys(count, prefix)
		},
	}
})

type Row = { week: string; signups: number }

const data = (offset: number): Row[] =>
	Array.from({ length: 50 }, (_, index) => ({ week: `W${index}`, signups: index + offset }))

function chart(rows: Row[]) {
	return (
		<LineChart
			aria-label="Signups per week"
			data={rows}
			series={[{ xKey: 'week', yKey: 'signups', yName: 'Signups' }]}
			width={400}
		/>
	)
}

describe('chart data table renders', () => {
	beforeEach(() => {
		tableRenders.count = 0
	})

	it('holds the table through a pointer sweep', async () => {
		const { container } = renderUI(chart(data(0)))

		// The table comes in a deferred pass after the mount.
		await act(async () => {})

		expect(tableRenders.count).toBeGreaterThan(0)

		tableRenders.count = 0

		const hit = getSlot(container, 'chart-hit')

		for (let x = 20; x <= 380; x += 40) {
			act(() => {
				fireEvent.pointerMove(hit, { clientX: x, clientY: 50 })
			})
		}

		await act(async () => {})

		expect(tableRenders.count).toBe(0)
	})

	it('renders the table again for new data', async () => {
		const { rerender } = renderUI(chart(data(0)))

		await act(async () => {})

		tableRenders.count = 0

		rerender(chart(data(1)))

		await act(async () => {})

		expect(tableRenders.count).toBeGreaterThan(0)
	})
})
