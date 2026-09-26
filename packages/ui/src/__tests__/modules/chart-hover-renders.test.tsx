import { describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { bySlot, fireEvent, getSlot, renderUI } from '../helpers'

// The header is chrome the frame builds on each of its renders. Its render count
// thus reads the frame's own renders.
const headerRenders = vi.hoisted(() => ({ count: 0 }))

vi.mock('../../modules/chart/engine/chart-header', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../modules/chart/engine/chart-header')>()

	return {
		...actual,
		ChartHeader: (props: Parameters<typeof actual.ChartHeader>[0]) => {
			headerRenders.count += 1

			return actual.ChartHeader(props)
		},
	}
})

const DATA = [
	{ quarter: 'Q1', revenue: 40, costs: 24 },
	{ quarter: 'Q2', revenue: 80, costs: 31 },
	{ quarter: 'Q3', revenue: 65, costs: 28 },
]

describe('Chart hover renders', () => {
	it('tracks the pointer inside a bar without a render of the frame', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by quarter"
				title="Revenue"
				data={DATA}
				series={[
					{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
					{ xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
				]}
				width={400}
			/>,
		)

		const hit = getSlot(container, 'chart-hit')

		// The entry lands on Q3's revenue bar. That crossing is a change of the
		// pointed mark, which the frame owns, so it may render the frame once.
		fireEvent.pointerMove(hit, { clientX: 280, clientY: 100 })

		headerRenders.count = 0

		// 50 moves that stay on the same bar. Each one moves the tooltip.
		for (let step = 0; step < 50; step += 1) {
			fireEvent.pointerMove(hit, { clientX: 276 + (step % 9), clientY: 96 + (step % 7) })
		}

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Q3')

		expect(headerRenders.count).toBe(0)
	})
})
