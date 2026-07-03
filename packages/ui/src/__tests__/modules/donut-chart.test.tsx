import { describe, expect, it } from 'vitest'
import { DonutChart } from '../../modules/chart/donut-chart'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

const DATA = [
	{ source: 'Search', visits: 60 },
	{ source: 'Direct', visits: 25 },
	{ source: 'Referral', visits: 15 },
]

function chart(extra?: Partial<Parameters<typeof DonutChart<(typeof DATA)[number]>>[0]>) {
	return (
		<DonutChart
			aria-label="Traffic by source"
			data={DATA}
			value="visits"
			label="source"
			width={300}
			height={200}
			{...extra}
		/>
	)
}

describe('DonutChart', () => {
	it('slices, names, and reads out exactly like a pie', () => {
		const { container } = renderUI(chart())

		expect(allBySlot(container, 'chart-slice')).toHaveLength(3)

		expect(allBySlot(container, 'chart-legend-item').map((el) => el.textContent)).toEqual([
			'Search',
			'Direct',
			'Referral',
		])

		expect(bySlot(container, 'chart-table')?.textContent).toContain('Search')
	})

	it('renders center content over the hole', () => {
		const { container } = renderUI(chart({ children: <span data-testid="total">9,340</span> }))

		const center = bySlot(container, 'chart-center')

		expect(center?.textContent).toBe('9,340')

		// The ring is still drawn behind it.
		expect(allBySlot(container, 'chart-slice')).toHaveLength(3)
	})

	it('omits the center layer when given no children', () => {
		const { container } = renderUI(chart())

		expect(bySlot(container, 'chart-center')).toBeNull()
	})

	it('names the pointed slice in the tooltip', () => {
		const { container } = renderUI(chart())

		const [first] = allBySlot(container, 'chart-slice')

		fireEvent.pointerEnter(first as Element)

		const tooltip = bySlot(container, 'chart-tooltip')

		expect(tooltip?.textContent).toContain('Search')

		expect(tooltip?.textContent).toContain('60')
	})

	it('still renders the slices under animate', () => {
		const { container } = renderUI(chart({ animate: true }))

		expect(allBySlot(container, 'chart-slice')).toHaveLength(3)
	})
})
