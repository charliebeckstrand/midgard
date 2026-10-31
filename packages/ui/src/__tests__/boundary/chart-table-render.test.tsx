import { describe, expect, it, vi } from 'vitest'
import { HeatmapChart, PieChart } from '../../modules/chart'
import { LineChart } from '../../modules/chart/line-chart'
import { rangeKeys } from '../../utilities'
import { act, fireEvent, getSlot, renderUI } from '../helpers'

/**
 * The visually-hidden data table must not render again for a pointer move.
 *
 * Each pointer move sets the pointed mark, so the frame renders again. The
 * table holds one cell for each category and series, and it rendered with the
 * frame. On a long line, that was most of the jsdom time of each move. The
 * table is now memoized on the readout thunk, which the pointer does not
 * change.
 *
 * The count reads the `rangeKeys` call that keys the table rows. No other chart
 * render asks for the `category` prefix. The count needs a module mock, so this
 * suite sits in `boundary/`.
 */
vi.mock('../../utilities', async (importActual) => {
	const actual = await importActual<typeof import('../../utilities')>()

	return { ...actual, rangeKeys: vi.fn(actual.rangeKeys) }
})

/** The table renders since the last clear: the `rangeKeys` calls for the `category` prefix. */
const tableRenders = () =>
	vi.mocked(rangeKeys).mock.calls.filter(([, prefix]) => prefix === 'category').length

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
	it('holds the table through a pointer sweep', async () => {
		const { container } = renderUI(chart(data(0)))

		// The table comes in a deferred pass after the mount.
		await act(async () => {})

		expect(tableRenders()).toBeGreaterThan(0)

		vi.mocked(rangeKeys).mockClear()

		const hit = getSlot(container, 'chart-hit')

		for (let x = 20; x <= 380; x += 40) {
			act(() => {
				fireEvent.pointerMove(hit, { clientX: x, clientY: 50 })
			})
		}

		await act(async () => {})

		expect(tableRenders()).toBe(0)
	})

	it('renders the table again for new data', async () => {
		const { rerender } = renderUI(chart(data(0)))

		await act(async () => {})

		vi.mocked(rangeKeys).mockClear()

		rerender(chart(data(1)))

		await act(async () => {})

		expect(tableRenders()).toBeGreaterThan(0)
	})

	it('holds the pie and heatmap tables through a parent render', async () => {
		const pieRows = [
			{ source: 'Search', visits: 60 },
			{ source: 'Direct', visits: 25 },
		]

		const cells = [
			{ day: 'Mon', hour: '9', commits: 1 },
			{ day: 'Tue', hour: '9', commits: 5 },
		]

		const charts = () => (
			<>
				<PieChart
					aria-label="Traffic"
					data={pieRows}
					series={[{ xKey: 'source', yKey: 'visits' }]}
					width={300}
				/>

				<HeatmapChart
					aria-label="Commits"
					data={cells}
					series={[
						{ xKey: 'hour', yKey: 'day', colorKey: 'commits', colorRange: ['#f7fee7', '#365314'] },
					]}
					width={400}
				/>
			</>
		)

		const { rerender } = renderUI(charts())

		await act(async () => {})

		expect(tableRenders()).toBeGreaterThan(0)

		vi.mocked(rangeKeys).mockClear()

		// The same rows: a parent render with no change of content.
		rerender(charts())

		await act(async () => {})

		expect(tableRenders()).toBe(0)
	})
})
