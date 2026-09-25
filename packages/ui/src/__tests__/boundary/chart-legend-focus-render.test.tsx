import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChartSeriesToggle } from '../../modules/chart/engine/use-chart-series-toggle'
import { LineChart } from '../../modules/chart/line-chart'
import { PieChart } from '../../modules/chart/pie-chart'
import { ScatterChart } from '../../modules/chart/scatter-chart'
import { act, allBySlot, fireEvent, renderUI } from '../helpers'

/**
 * A legend hover does not run the chart body, and does not render the data table.
 *
 * The legend emphasis was state of the chart body. A legend hover therefore ran
 * the whole body again, and the body made a new readout thunk. The data table
 * then formatted each cell again. The frame now owns the emphasis, so a hover
 * renders the frame and the legend only.
 *
 * The body count reads the `useChartSeriesToggle` call that each body run makes.
 * The table count reads the `rangeKeys` call that keys the table rows, as
 * `chart-table-render.test.tsx` does. The counts need module mocks, so this
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

vi.mock('../../modules/chart/engine/use-chart-series-toggle', async (importActual) => {
	const actual =
		await importActual<typeof import('../../modules/chart/engine/use-chart-series-toggle')>()

	return { ...actual, useChartSeriesToggle: vi.fn(actual.useChartSeriesToggle) }
})

type Row = { week: string; signups: number; churn: number }

const rows: Row[] = Array.from({ length: 50 }, (_, index) => ({
	week: `W${index}`,
	signups: index,
	churn: 50 - index,
}))

/** Mounts the chart and settles the deferred table. */
async function mount(ui: Parameters<typeof renderUI>[0]) {
	const result = renderUI(ui)

	await act(async () => {})

	return result
}

/** Moves the pointer onto the legend entry at `position` and off it again, and returns the body runs and the table renders. */
async function hoverLegend(container: HTMLElement, position: number) {
	const entry = allBySlot(container, 'chart-legend-item')[position] as HTMLElement

	vi.mocked(useChartSeriesToggle).mockClear()

	tableRenders.count = 0

	act(() => {
		fireEvent.pointerEnter(entry)
	})

	const emphasized = container.innerHTML

	act(() => {
		fireEvent.pointerLeave(entry)
	})

	await act(async () => {})

	return {
		body: vi.mocked(useChartSeriesToggle).mock.calls.length,
		table: tableRenders.count,
		emphasized,
	}
}

describe('chart legend focus renders', () => {
	beforeEach(() => {
		tableRenders.count = 0

		vi.mocked(useChartSeriesToggle).mockClear()
	})

	it('holds the cartesian body and the table through a legend hover', async () => {
		const { container } = await mount(
			<LineChart
				aria-label="Signups and churn"
				data={rows}
				series={[
					{ xKey: 'week', yKey: 'signups', yName: 'Signups' },
					{ xKey: 'week', yKey: 'churn', yName: 'Churn' },
				]}
				legend
				width={400}
			/>,
		)

		const before = container.innerHTML

		const { body, table, emphasized } = await hoverLegend(container, 1)

		// The hover still dims the other series.
		expect(emphasized).not.toBe(before)

		expect(body).toBe(0)

		expect(table).toBe(0)
	})

	it('holds the scatter body and the table through a legend hover', async () => {
		const { container } = await mount(
			<ScatterChart
				aria-label="Signups and churn"
				data={rows.map((row, index) => ({ ...row, x: index }))}
				series={[
					{ xKey: 'x', yKey: 'signups', yName: 'Signups' },
					{ xKey: 'x', yKey: 'churn', yName: 'Churn' },
				]}
				legend
				width={400}
			/>,
		)

		const before = container.innerHTML

		const { body, table, emphasized } = await hoverLegend(container, 1)

		expect(emphasized).not.toBe(before)

		expect(body).toBe(0)

		expect(table).toBe(0)
	})

	it('holds the pie body and the table through a legend hover', async () => {
		const { container } = await mount(
			<PieChart
				aria-label="Signups by week"
				data={rows.slice(0, 6)}
				series={[{ xKey: 'week', yKey: 'signups', yName: 'Signups' }]}
				legend
				width={400}
			/>,
		)

		const before = container.innerHTML

		const { body, table, emphasized } = await hoverLegend(container, 2)

		expect(emphasized).not.toBe(before)

		expect(body).toBe(0)

		expect(table).toBe(0)
	})
})
