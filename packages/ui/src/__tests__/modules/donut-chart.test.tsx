import { describe, expect, it } from 'vitest'
import { ChartFullscreenContext } from '../../modules/chart/context'
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
			series={[{ xKey: 'source', yKey: 'visits' }]}
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

	it('centers the content on the ring hole, following a callout shift', () => {
		const plain = renderUI(chart({ children: <span>x</span> }))

		const plainInner = plain.container.querySelector(
			'[data-slot="chart-center"] > div',
		) as HTMLElement

		// No callouts: the hole sits at the plot-box center.
		expect(plainInner.style.left).toBe('50%')

		expect(plainInner.style.top).toBe('50%')

		// Callouts with lopsided label widths shift the pie center off the box center;
		// the content follows it into the hole rather than staying box-centered. The
		// frame is widened past the default so the long label's column has room to
		// draw — a narrower box would starve the pie to the spark floor and drop the
		// callouts, leaving nothing to shift the center.
		const shifted = renderUI(
			chart({
				width: 480,
				children: <span>x</span>,
				labels: { callouts: true },
				data: [
					{ source: 'An extraordinarily long slice label', visits: 55 },
					{ source: 'B', visits: 45 },
				],
			}),
		)

		const shiftedInner = shifted.container.querySelector(
			'[data-slot="chart-center"] > div',
		) as HTMLElement

		expect(shiftedInner.style.left).not.toBe('50%')
	})

	it('omits the center layer when given no children', () => {
		const { container } = renderUI(chart())

		expect(bySlot(container, 'chart-center')).toBeNull()
	})

	it('names the pointed slice in the tooltip', () => {
		const { container } = renderUI(chart())

		const [first] = allBySlot(container, 'chart-slice')

		fireEvent.pointerEnter(first as Element)

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Search')

		expect(tooltip?.textContent).toContain('60')
	})

	it('backs each slice with a hit wedge so the gap keeps the tooltip', () => {
		const { container } = renderUI(chart())

		const hits = allBySlot(container, 'chart-slice-hit')

		expect(hits).toHaveLength(3)

		// Pointing the hit layer — as a sweep across the channel between slices
		// would — still names the slice instead of clearing the readout.
		fireEvent.pointerMove(hits[1] as Element, { clientX: 150, clientY: 40 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Direct')
	})

	it('still renders the slices under animate', () => {
		const { container } = renderUI(chart({ animate: true }))

		expect(allBySlot(container, 'chart-slice')).toHaveLength(3)
	})

	it('restricts the default donut to 16/9 inside the fullscreen dialog', () => {
		// A donut shares the pie's sizing: on the page it fits its own square, and
		// the fullscreen copy takes the 16/9 panel's ratio — 300 / (16/9) ≈ 169 —
		// so it holds the panel's height rather than overrunning it as a square.
		const page = renderUI(chart({ height: undefined }))

		expect(page.container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 300 300')

		const { container } = renderUI(
			<ChartFullscreenContext value={true}>{chart({ height: undefined })}</ChartFullscreenContext>,
		)

		expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 300 169')
	})
})
