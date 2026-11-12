import { describe, expect, it, vi } from 'vitest'
import { verticalLayout } from '../../modules/chart/engine/chart-layout'
import { LineChart } from '../../modules/chart/line-chart'
import { act, fireEvent, getSlot, renderUI } from '../helpers'
import { legendItem } from '../helpers/chart-legend'

/**
 * A legend toggle on a static chart does only the work that the toggle needs.
 *
 * The body count reads the `verticalLayout` calls: each run of a vertical
 * cartesian chart body lays out the chart once. The format count reads the
 * category formatter of the x axis. The axis labels format each category once,
 * and the tooltip and the data table read those labels. The counts need a
 * module mock, so this suite sits in `boundary/`.
 */
vi.mock('../../modules/chart/engine/chart-layout', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/chart/engine/chart-layout')>()

	return { ...actual, verticalLayout: vi.fn(actual.verticalLayout) }
})

type Row = { week: string; a: number; b: number }

const ROWS = 40

const DATA: Row[] = Array.from({ length: ROWS }, (_, index) => ({
	week: `W${index}`,
	a: index,
	b: ROWS - index,
}))

const SERIES: { xKey: 'week'; yKey: 'a' | 'b'; yName: string }[] = [
	{ xKey: 'week', yKey: 'a', yName: 'A' },
	{ xKey: 'week', yKey: 'b', yName: 'B' },
]

const REFERENCE = [{ value: 20, label: 'Goal' }]

/** Lets the deferred table and the effects of a toggle settle. */
async function settle() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 50))
	})
}

describe('chart toggle render', () => {
	it('runs a static chart body once for a reference toggle', async () => {
		const { container } = renderUI(
			<LineChart aria-label="L" data={DATA} series={SERIES} reference={REFERENCE} width={400} />,
		)

		await settle()

		vi.mocked(verticalLayout).mockClear()

		act(() => {
			fireEvent.click(getSlot(container, 'chart-legend-reference'))
		})

		// Without the fix, the hidden-set mirror writes state during the render
		// of the toggle, so the body runs twice.
		expect(vi.mocked(verticalLayout)).toHaveBeenCalledTimes(1)
	})

	it('formats no category again for a series toggle', async () => {
		const format = vi.fn((value: unknown) => `#${String(value)}`)

		const { container } = renderUI(
			<LineChart aria-label="L" data={DATA} series={SERIES} axes={{ x: { format } }} width={400} />,
		)

		await settle()

		// The data table shows the formatted labels, so the readout is live.
		expect(container.querySelector('table')?.textContent).toContain('#W0')

		format.mockClear()

		act(() => {
			fireEvent.click(legendItem(container, 'B'))
		})

		await settle()

		// Without the fix, the readout formats each category again.
		expect(format).not.toHaveBeenCalled()
	})
})
