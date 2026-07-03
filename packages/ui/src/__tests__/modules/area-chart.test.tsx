import { describe, expect, it } from 'vitest'
import { AreaChart } from '../../modules/chart/area-chart'
import { stackedAreas } from '../../modules/chart/area-chart/area-chart-geometry'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

const DATA = [
	{ day: 'Mon', organic: 20, paid: 10 },
	{ day: 'Tue', organic: 28, paid: 14 },
	{ day: 'Wed', organic: 24, paid: 12 },
]

function chart(extra?: Partial<Parameters<typeof AreaChart<(typeof DATA)[number]>>[0]>) {
	return (
		<AreaChart
			aria-label="Traffic by channel"
			data={DATA}
			x="day"
			series={[
				{ key: 'organic', label: 'Organic' },
				{ key: 'paid', label: 'Paid' },
			]}
			width={400}
			{...extra}
		/>
	)
}

describe('AreaChart', () => {
	it('fills an area with a band-edge line per series', () => {
		const { container } = renderUI(chart())

		expect(allBySlot(container, 'chart-area')).toHaveLength(2)

		expect(allBySlot(container, 'chart-line')).toHaveLength(2)

		expect(allBySlot(container, 'chart-legend-item')).toHaveLength(2)
	})

	it('reads each series value in the tooltip, not the stacked total', () => {
		const { container } = renderUI(chart({ stacked: true }))

		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, { clientX: 200 })

		const tooltip = bySlot(container, 'chart-tooltip')

		expect(tooltip?.textContent).toContain('Tue')

		expect(tooltip?.textContent).toContain('28')

		expect(tooltip?.textContent).toContain('14')
	})

	it('marks band-edge points and smooths only when unstacked', () => {
		const dotted = renderUI(chart({ points: true }))

		expect(allBySlot(dotted.container, 'chart-point')).toHaveLength(6)

		const smooth = renderUI(chart({ interpolation: 'smooth' }))

		expect(bySlot(smooth.container, 'chart-line')?.getAttribute('d')).toContain('C')
	})

	it('still renders under animate', () => {
		const { container } = renderUI(chart({ stacked: true, animate: true }))

		expect(allBySlot(container, 'chart-area')).toHaveLength(2)
	})
})

describe('stackedAreas', () => {
	const xs = [0, 10, 20]

	const map = (value: number) => 100 - value

	it('rides each band on the running total below it', () => {
		const [first, second] = stackedAreas(
			[
				[20, 30, 25],
				[10, 10, 10],
			],
			xs,
			map,
		)

		// First band's top edge sits at its own values.
		expect(first?.points.map((p) => p.y)).toEqual([80, 70, 75])

		// Second band's top edge sits at the cumulative total (value + first).
		expect(second?.points.map((p) => p.y)).toEqual([70, 60, 65])
	})

	it('counts a missing value as zero so the stack stays continuous', () => {
		const [, second] = stackedAreas(
			[
				[20, null, 25],
				[10, 10, 10],
			],
			xs,
			map,
		)

		// At the gap the first band contributes 0, so the second rides on 10 alone.
		expect(second?.points[1]?.y).toBe(map(10))
	})

	it('closes each ribbon between its top edge and the one below', () => {
		const [first] = stackedAreas([[20, 30, 25]], xs, map)

		expect(first?.area.startsWith('M ')).toBe(true)

		expect(first?.area.endsWith('Z')).toBe(true)
	})
})
