import { describe, expect, it } from 'vitest'
import { PieChart } from '../../modules/chart/pie-chart'
import {
	CALLOUT_GAP,
	CALLOUT_LINE,
	type PieSlice,
	pieCallouts,
	pieCentroidRadius,
	pieSlices,
	segmentLabelFits,
} from '../../modules/chart/pie-chart/pie-chart-geometry'
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

	it('still renders the slices under animate, behind the sweep mask', () => {
		const { container } = renderUI(chart({ animate: true }))

		expect(allBySlot(container, 'chart-slice')).toHaveLength(3)

		// The reveal is one masking sweep stroke, not per-slice motion.
		expect(container.querySelector('mask circle')).not.toBeNull()

		expect(renderUI(chart()).container.querySelector('mask')).toBeNull()
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

	it('names slices from the outside with leadered callouts', () => {
		const { container } = renderUI(chart({ callouts: true }))

		const texts = allBySlot(container, 'chart-callout-label').map((el) => el.textContent)

		expect(texts).toHaveLength(3)

		expect(texts).toContain('Search 60%')

		expect(texts).toContain('Referral 15%')

		// Each callout draws a leader out to its label.
		expect(allBySlot(container, 'chart-callout-leader')).toHaveLength(3)
	})

	it('trails the value instead of the percent for callouts=value', () => {
		const { container } = renderUI(chart({ callouts: 'value' }))

		expect(allBySlot(container, 'chart-callout-label').map((el) => el.textContent)).toContain(
			'Search 60',
		)
	})

	it('sets the legend under the plot by default, above with legend="top"', () => {
		const bottom = renderUI(chart())

		const plot = bySlot(bottom.container, 'chart-plot') as Element

		const legend = bySlot(bottom.container, 'chart-legend') as Element

		expect(plot.compareDocumentPosition(legend) & 4).toBeTruthy()

		const top = renderUI(chart({ legend: 'top' }))

		expect(
			(bySlot(top.container, 'chart-legend') as Element).compareDocumentPosition(
				bySlot(top.container, 'chart-plot') as Element,
			) & 4,
		).toBeTruthy()
	})

	it('sets the legend beside the plot as a share panel with legend="right"', () => {
		const { container } = renderUI(chart({ legend: 'right' }))

		// Panel entries carry each slice's live share after the name.
		expect(allBySlot(container, 'chart-legend-item').map((el) => el.textContent)).toEqual([
			'Search60%',
			'Direct25%',
			'Referral15%',
		])

		const panel = bySlot(container, 'chart-legend') as Element

		// A single column at every viewport, never a grid.
		expect(panel.className).toContain('flex-col')

		expect(panel.className).not.toContain('grid')

		// The panel always follows the plot in the DOM — under the chart when
		// stacked; a left panel reverses the lg row instead of moving.
		const plot = bySlot(container, 'chart-plot') as Element

		expect(plot.compareDocumentPosition(panel) & 4).toBeTruthy()

		expect(panel.parentElement?.className).toContain('lg:flex-row')

		const left = renderUI(chart({ legend: 'left' }))

		expect(bySlot(left.container, 'chart-legend')?.parentElement?.className).toContain(
			'lg:flex-row-reverse',
		)
	})

	it('re-shares the panel details as slices toggle', () => {
		const { container } = renderUI(chart({ legend: 'right' }))

		fireEvent.click(allBySlot(container, 'chart-legend-item')[0] as HTMLButtonElement)

		const texts = allBySlot(container, 'chart-legend-item').map((el) => el.textContent)

		// Search is off — em-dash; the survivors re-share the whole: 25/40, 15/40.
		expect(texts).toEqual(['Search—', 'Direct63%', 'Referral38%'])
	})

	it('re-shares the sweep when a legend entry toggles a slice off', () => {
		const { container } = renderUI(chart({ segmentLabels: true }))

		const search = allBySlot(container, 'chart-legend-item')[0] as HTMLButtonElement

		fireEvent.click(search)

		expect(allBySlot(container, 'chart-slice')).toHaveLength(2)

		// Direct and Referral re-share the whole: 25/40 and 15/40.
		expect(allBySlot(container, 'chart-segment-label').map((el) => el.textContent)).toEqual([
			'63%',
			'38%',
		])

		expect(search.querySelector('.line-through')).not.toBeNull()

		fireEvent.click(search)

		expect(allBySlot(container, 'chart-slice')).toHaveLength(3)
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

describe('pieCentroidRadius', () => {
	it('pulls a pie label inward as its slice widens', () => {
		// A sliver sits near two-thirds out; a half slice is drawn toward center.
		expect(pieCentroidRadius(80, 0, 0.01)).toBeCloseTo((2 / 3) * 80, 1)

		expect(pieCentroidRadius(80, 0, 0.5)).toBeCloseTo(33.95, 1)

		expect(pieCentroidRadius(80, 0, 0.01)).toBeGreaterThan(pieCentroidRadius(80, 0, 0.5))
	})

	it('collapses a full-circle pie label to the center', () => {
		expect(pieCentroidRadius(80, 0, 1)).toBeCloseTo(0, 5)
	})

	it('holds a donut label on the mid-ring whatever the share', () => {
		expect(pieCentroidRadius(80, 40, 0.1)).toBe(60)

		expect(pieCentroidRadius(80, 40, 0.9)).toBe(60)
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

	it('parts neighbours with a parallel-offset edge, not a pinch', () => {
		const flush = pieSlices([50, 50], FRAME)

		const padded = pieSlices([50, 50], { ...FRAME, pad: 6 })

		expect(padded).toHaveLength(2)

		// The gap reshapes the wedge but leaves the label/tooltip centroid put.
		expect(padded[0]?.centroid).toEqual(flush[0]?.centroid)

		// The edge is pushed sideways off the true radius by a constant offset,
		// so the channel holds its width instead of pinching shut at the center.
		const startX = (slice?: PieSlice) => Number(slice?.d.match(/^M ([\d.]+)/)?.[1])

		expect(startX(padded[0])).toBeGreaterThan(startX(flush[0]))
	})

	it('runs a sub-half-turn slice to its knife-cut tip on the bisector', () => {
		// Four equal quarters, 6px gap → half 3. The offset edges of a 90° wedge
		// meet at half / sin(45°) ≈ 4.24 from the center, on the bisector.
		const [first] = pieSlices([1, 1, 1, 1], { ...FRAME, pad: 6 })

		const tipRadius = 3 / Math.sin((45 * Math.PI) / 180)

		// The first quarter (0°→90°) bisects at 45°: the tip sits up-and-right.
		const tip = {
			x: FRAME.cx + tipRadius * Math.cos(((45 - 90) * Math.PI) / 180),
			y: FRAME.cy + tipRadius * Math.sin(((45 - 90) * Math.PI) / 180),
		}

		const last = first?.d.match(/L ([\d.]+) ([\d.]+) Z$/)

		expect(Number(last?.[1])).toBeCloseTo(tip.x, 3)

		expect(Number(last?.[2])).toBeCloseTo(tip.y, 3)
	})

	it('rides the gap circle for a slice past a half-turn', () => {
		// A dominant slice (> 180°) has no tip; its edges are tangent to the
		// half-radius gap circle, so its inner boundary is an arc of that circle.
		const [big] = pieSlices([80, 20], { ...FRAME, pad: 6 })

		expect(big?.d).toContain('A 3 3 ')
	})

	it('never pads a lone full-circle slice', () => {
		const [only] = pieSlices([0, 42], { ...FRAME, pad: 6 })

		// Still two half arcs, no wedge line to the center.
		expect(only?.d).not.toContain('L')

		expect((only?.d.match(/A /g) ?? []).length).toBe(2)
	})
})

describe('pieCallouts', () => {
	const OPTS = { cx: 100, cy: 100, radius: 60, top: 10, bottom: 190 }

	it('reads right-half labels from the start, left-half from the end', () => {
		const two = pieSlices([50, 50], { cx: 100, cy: 100, radius: 60 })

		const placed = new Map(pieCallouts(two, OPTS).map((callout) => [callout.index, callout]))

		expect(placed.get(0)?.anchor).toBe('start')

		expect(placed.get(1)?.anchor).toBe('end')
	})

	it('stacks crowded labels at least a line apart', () => {
		const many = pieSlices([10, 9, 8, 7, 6, 5], { cx: 100, cy: 100, radius: 60 })

		const ys = pieCallouts(many, OPTS)
			.filter((callout) => callout.anchor === 'start')
			.map((callout) => callout.y)
			.sort((a, b) => a - b)

		for (let i = 1; i < ys.length; i++) {
			expect((ys[i] ?? 0) - (ys[i - 1] ?? 0)).toBeGreaterThanOrEqual(CALLOUT_LINE - 0.001)
		}
	})

	it('routes a three-point leader with the label a constant gap past its nub', () => {
		const [first] = pieCallouts(pieSlices([60, 40], { cx: 100, cy: 100, radius: 60 }), OPTS)

		const points = first?.leader.split(' ') ?? []

		expect(points).toHaveLength(3)

		// The label sits exactly CALLOUT_GAP beyond the leader's nub, on the start side.
		const nubX = Number(points[2]?.split(',')[0])

		expect((first?.x ?? 0) - nubX).toBeCloseTo(CALLOUT_GAP, 5)
	})
})
