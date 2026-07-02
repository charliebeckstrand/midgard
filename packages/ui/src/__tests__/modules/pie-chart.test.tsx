import { describe, expect, it } from 'vitest'
import { PieChart } from '../../modules/chart/pie-chart'
import { pieSlices, segmentLabelFits } from '../../modules/chart/pie-chart/pie-chart-geometry'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

const DATA = [
	{ source: 'Search', visits: 60 },
	{ source: 'Direct', visits: 25 },
	{ source: 'Referral', visits: 15 },
]

function chart(extra?: Partial<Parameters<typeof PieChart<(typeof DATA)[number]>>[0]>) {
	return (
		<PieChart
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

describe('PieChart', () => {
	it('draws one slice per positive row and names them all in the legend', () => {
		const { container } = renderUI(chart())

		expect(allBySlot(container, 'chart-slice')).toHaveLength(3)

		expect(allBySlot(container, 'chart-legend-item').map((el) => el.textContent)).toEqual([
			'Search',
			'Direct',
			'Referral',
		])
	})

	it('names the pointed slice in the tooltip', () => {
		const { container } = renderUI(chart())

		const [first] = allBySlot(container, 'chart-slice')

		fireEvent.pointerEnter(first as Element)

		const tooltip = bySlot(container, 'chart-tooltip')

		expect(tooltip?.textContent).toContain('Search')

		expect(tooltip?.textContent).toContain('60')

		fireEvent.pointerLeave(bySlot(container, 'chart-slices') as Element)

		expect(bySlot(container, 'chart-tooltip')).toBeNull()
	})

	it('keeps sliceless rows honest in the data table', () => {
		const withGap = [
			...DATA,
			{ source: 'Refunds', visits: -4 },
			{ source: 'Unknown', visits: Number.NaN },
		]

		const { container } = renderUI(chart({ data: withGap }))

		expect(allBySlot(container, 'chart-slice')).toHaveLength(3)

		const table = bySlot(container, 'chart-table')

		// A negative row keeps its true value; only a missing one dashes.
		expect(table?.textContent).toContain('Refunds')

		expect(table?.textContent).toContain('-4')

		expect(table?.textContent).toContain('—')
	})

	it('renders donut center content over the hole', () => {
		const { container } = renderUI(
			chart({ donut: true, children: <span data-slot="center">Total</span> }),
		)

		expect(bySlot(container, 'center')?.textContent).toBe('Total')
	})

	it('still renders the slices under animate', () => {
		const { container } = renderUI(chart({ animate: true }))

		expect(allBySlot(container, 'chart-slice')).toHaveLength(3)
	})

	it('labels segments with their percent share when asked', () => {
		const off = renderUI(chart())

		expect(allBySlot(off.container, 'chart-segment-label')).toHaveLength(0)

		const on = renderUI(chart({ segmentLabels: true }))

		expect(allBySlot(on.container, 'chart-segment-label').map((el) => el.textContent)).toEqual([
			'60%',
			'25%',
			'15%',
		])
	})

	it('labels segments with values or names by kind', () => {
		const values = renderUI(chart({ segmentLabels: 'value' }))

		expect(allBySlot(values.container, 'chart-segment-label')[0]?.textContent).toBe('60')

		const names = renderUI(chart({ segmentLabels: 'label' }))

		expect(allBySlot(names.container, 'chart-segment-label')[0]?.textContent).toBe('Search')
	})

	it('omits a segment label that will not fit its slice', () => {
		const withSliver = [...DATA, { source: 'Other', visits: 1 }]

		const { container } = renderUI(chart({ data: withSliver, segmentLabels: true }))

		const texts = allBySlot(container, 'chart-segment-label').map((el) => el.textContent)

		expect(texts).not.toContain('1%')

		expect(texts.length).toBeGreaterThan(0)
	})

	it('keeps segment labels under animate', () => {
		const { container } = renderUI(chart({ segmentLabels: true, animate: true }))

		expect(allBySlot(container, 'chart-segment-label')).toHaveLength(3)
	})
})

describe('segmentLabelFits', () => {
	it('admits wide slices and rejects slivers', () => {
		// A quarter slice at centroid radius 60: clearance ≈ 42px.
		expect(segmentLabelFits(3, 0.25, 60, 96, 7.2)).toBe(true)

		// A 2% sliver: clearance ≈ 3.8px can't hold any text.
		expect(segmentLabelFits(2, 0.02, 60, 96, 7.2)).toBe(false)
	})

	it('always admits the full circle and never a too-shallow ring', () => {
		expect(segmentLabelFits(8, 1, 60, 96, 7.2)).toBe(true)

		expect(segmentLabelFits(2, 0.5, 60, 12, 7.2)).toBe(false)
	})
})

describe('pieSlices', () => {
	const FRAME = { cx: 100, cy: 100, radius: 80 }

	it('sweeps shares clockwise from the top, proportional to the whole', () => {
		const slices = pieSlices([50, 50], FRAME)

		expect(slices).toHaveLength(2)

		// Two equal shares: the first sweeps 0°→180°, anchoring its centroid at 90° (right).
		expect(slices[0]?.centroid.x).toBeGreaterThan(FRAME.cx)

		expect(slices[1]?.centroid.x).toBeLessThan(FRAME.cx)
	})

	it('skips non-positive and non-finite values', () => {
		const slices = pieSlices([10, -5, null, 0, 30], FRAME)

		expect(slices.map((slice) => slice.index)).toEqual([0, 4])
	})

	it('degenerates a single share to the full circle', () => {
		const [only] = pieSlices([0, 42], FRAME)

		expect(only?.index).toBe(1)

		// Two half arcs, no line back to center.
		expect(only?.d).not.toContain('L')

		expect((only?.d.match(/A /g) ?? []).length).toBe(2)
	})

	it('returns nothing when no value is positive', () => {
		expect(pieSlices([0, null, -3], FRAME)).toHaveLength(0)
	})
})
