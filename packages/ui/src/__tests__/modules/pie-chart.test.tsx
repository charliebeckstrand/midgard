import { describe, expect, it } from 'vitest'
import { LABEL_VGAP } from '../../modules/chart/chart-constants'
import { PieChart } from '../../modules/chart/pie-chart'
import {
	calloutFloor,
	calloutMaxWidth,
	sideOf,
	solveCallouts,
} from '../../modules/chart/pie-chart/pie-chart-callout-layout'
import {
	type PieSlice,
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
			series={[{ xKey: 'source', yKey: 'visits' }]}
			width={300}
			height={200}
			{...extra}
		/>
	)
}

describe('PieChart', () => {
	it('draws one slice per positive row and names them all in the legend', () => {
		// Callouts default on and flip the legend off, so force it on to read it.
		const { container } = renderUI(chart({ legend: true }))

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

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Search')

		expect(tooltip?.textContent).toContain('60')

		fireEvent.pointerLeave(bySlot(container, 'chart-slices') as Element)

		expect(bySlot(container, 'tooltip-content')).toBeNull()
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

	it('defaults to auto labels — callout cards when the measured layout fits', () => {
		const { container } = renderUI(chart())

		// Unset labels resolve to callouts when they fit, which they do at this
		// size under the jsdom zero-measurement stub.
		expect(allBySlot(container, 'chart-callout')).toHaveLength(3)

		// A card names every slice, so the legend defaults off and no segment
		// labels double up the naming.
		expect(bySlot(container, 'chart-legend')).toBeNull()

		expect(allBySlot(container, 'chart-segment-label')).toHaveLength(0)
	})

	it('names slices from the outside with callout cards when asked', () => {
		const { container } = renderUI(chart({ labels: { callouts: true } }))

		const cards = allBySlot(container, 'chart-callout')

		expect(cards).toHaveLength(3)

		const texts = cards.map((el) => el.textContent ?? '')

		expect(texts.some((text) => text.includes('Search') && text.includes('60%'))).toBe(true)

		expect(texts.some((text) => text.includes('Referral') && text.includes('15%'))).toBe(true)

		// No leader — association is spatial, so nothing is drawn out to the card.
		expect(allBySlot(container, 'chart-callout-leader')).toHaveLength(0)
	})

	it('flips the legend default off when callouts resolve on, and an explicit legend wins', () => {
		const auto = renderUI(chart({ labels: { callouts: true } }))

		expect(bySlot(auto.container, 'chart-legend')).toBeNull()

		const explicit = renderUI(chart({ labels: { callouts: true }, legend: true }))

		expect(bySlot(explicit.container, 'chart-legend')).not.toBeNull()
	})

	it('drops every label layer, and restores the legend, when both switches are off', () => {
		const { container } = renderUI(chart({ labels: { segment: false, callouts: false } }))

		expect(allBySlot(container, 'chart-callout')).toHaveLength(0)

		expect(allBySlot(container, 'chart-segment-label')).toHaveLength(0)

		// With no callouts to carry the naming, the legend returns to its default-on.
		expect(bySlot(container, 'chart-legend')).not.toBeNull()
	})

	it('labels segments with their percent share when asked', () => {
		const off = renderUI(chart({ labels: { segment: false, callouts: false } }))

		expect(allBySlot(off.container, 'chart-segment-label')).toHaveLength(0)

		const on = renderUI(chart({ labels: { segment: true } }))

		expect(allBySlot(on.container, 'chart-segment-label').map((el) => el.textContent)).toEqual([
			'60%',
			'25%',
			'15%',
		])
	})

	it('omits a segment label that will not fit its slice', () => {
		const withSliver = [...DATA, { source: 'Other', visits: 1 }]

		const { container } = renderUI(chart({ data: withSliver, labels: { segment: true } }))

		const texts = allBySlot(container, 'chart-segment-label').map((el) => el.textContent)

		expect(texts).not.toContain('1%')

		expect(texts.length).toBeGreaterThan(0)
	})

	it('keeps segment labels under animate', () => {
		const { container } = renderUI(chart({ labels: { segment: true }, animate: true }))

		expect(allBySlot(container, 'chart-segment-label')).toHaveLength(3)
	})

	it('keeps the default frame a plain square', () => {
		const { container } = renderUI(chart({ height: undefined }))

		// The frame no longer reserves a label margin; it stays a square and the
		// pie shrinks within to seat any callouts.
		expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 300 300')
	})

	it('keeps the frame square with callouts on, shrinking the pie within instead', () => {
		const { container } = renderUI(chart({ height: undefined, labels: { callouts: true } }))

		expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 300 300')
	})

	it('reserves the content-fit height from the box width so it holds before measure', () => {
		const { container } = renderUI(chart({ height: undefined }))

		// The affine content height is no CSS ratio, so there is no AspectRatio;
		// and the box reserves its height from its own width (the padding-box path,
		// `overflow-hidden`) rather than a fixed pixel height, so it holds from the
		// first paint instead of collapsing to zero. The reserved length itself is
		// a `max(min, calc(…))` jsdom drops, so its value is covered by the
		// `resolveFrameSizing` unit tests rather than read back here.
		expect(bySlot(container, 'aspect-ratio')).toBeNull()

		const box = bySlot(container, 'chart-plot')?.firstElementChild as HTMLElement

		expect(box.className).toContain('overflow-hidden')

		expect(box.style.height).toBe('')
	})

	it('lets an explicit aspectRatio win over the default square', () => {
		const { container } = renderUI(
			chart({ height: undefined, aspectRatio: 2, labels: { callouts: true } }),
		)

		expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 300 150')
	})

	it('sets the legend under the plot by default, above with legend="top"', () => {
		const bottom = renderUI(chart({ legend: true }))

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
		const { container } = renderUI(chart({ labels: { segment: true } }))

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

describe('sideOf', () => {
	it('sends the top-and-right semicircle right, the rest left', () => {
		expect(sideOf(45)).toBe(1)

		expect(sideOf(135)).toBe(1)

		expect(sideOf(225)).toBe(-1)

		expect(sideOf(315)).toBe(-1)
	})
})

describe('calloutFloor', () => {
	it('takes the larger of the absolute floor and a share of r0', () => {
		// 0.6·50 = 30 < 56, so the absolute floor wins.
		expect(calloutFloor(50)).toBe(56)

		// 0.6·200 = 120 > 56, so the proportional floor wins.
		expect(calloutFloor(200)).toBe(120)
	})
})

describe('calloutMaxWidth', () => {
	it('caps the card ceiling by the room a floor-radius pie leaves', () => {
		// floor(200) = 120; W/2 − floor − CARD_GAP = 200 − 120 − 12 = 68 < 176.
		expect(calloutMaxWidth(400, 200)).toBeCloseTo(68, 5)

		// A wide frame hits the ceiling.
		expect(calloutMaxWidth(1200, 100)).toBe(176)
	})
})

describe('solveCallouts', () => {
	const SLICES = [
		{ index: 0, mid: 45, share: 0.3 },
		{ index: 1, mid: 135, share: 0.3 },
		{ index: 2, mid: 225, share: 0.2 },
		{ index: 3, mid: 315, share: 0.2 },
	]

	const sizeMap = (width: number, height: number) =>
		new Map(SLICES.map((slice) => [slice.index, { width, height }]))

	const base = (overrides: Partial<Parameters<typeof solveCallouts>[0]> = {}) => ({
		frame: { width: 400, height: 400 },
		center: { x: 200, y: 200 },
		slices: SLICES,
		sizes: sizeMap(60, 40),
		r0: 150,
		forced: false,
		...overrides,
	})

	it('takes callouts and shrinks the pie to clear the gutter when it fits', () => {
		const solution = solveCallouts(base())

		expect(solution.mode).toBe('callout')

		// r = min(200 − 60 − 12, 200 − 8) = 128, above the floor of 90.
		expect(solution.radius).toBeCloseTo(128, 5)

		expect(solution.placed).toHaveLength(4)
	})

	it('falls back to sector labels when the shrink would breach the radius floor', () => {
		const solution = solveCallouts(base({ sizes: sizeMap(170, 40) }))

		// gutter 170 → wanted 18, under the floor of 90, so the pie stays at r0.
		expect(solution.mode).toBe('sector')

		expect(solution.radius).toBe(150)

		expect(solution.placed).toHaveLength(0)
	})

	it('splits cards to the near edge by their sector angle', () => {
		const side = new Map(solveCallouts(base()).placed.map((card) => [card.index, card.side]))

		expect(side.get(0)).toBe(1)

		expect(side.get(1)).toBe(1)

		expect(side.get(2)).toBe(-1)

		expect(side.get(3)).toBe(-1)
	})

	it('declumps a crowded column against real heights without overlap or leapfrog', () => {
		// Two near sectors on the right, cards too tall to sit at both ideals.
		const slices = [
			{ index: 0, mid: 80, share: 0.5 },
			{ index: 1, mid: 100, share: 0.5 },
		]

		const sizes = new Map([
			[0, { width: 60, height: 60 }],
			[1, { width: 60, height: 60 }],
		])

		const solution = solveCallouts({
			frame: { width: 400, height: 400 },
			center: { x: 200, y: 200 },
			slices,
			sizes,
			r0: 150,
			forced: false,
		})

		const tops = new Map(solution.placed.map((card) => [card.index, card.top]))

		const top0 = tops.get(0) ?? 0

		const top1 = tops.get(1) ?? 0

		// Angular order (80 before 100) is kept: card 0 sits above card 1.
		expect(top0).toBeLessThan(top1)

		// No overlap: at least a card height plus the gap apart.
		expect(top1 - top0).toBeGreaterThanOrEqual(60 + LABEL_VGAP - 0.001)
	})

	it('drops the smallest shares first in forced mode when a column overflows', () => {
		// Three tall cards crowd one right column in a short frame.
		const slices = [
			{ index: 0, mid: 60, share: 0.5 },
			{ index: 1, mid: 90, share: 0.3 },
			{ index: 2, mid: 120, share: 0.2 },
		]

		const sizes = new Map(slices.map((slice) => [slice.index, { width: 60, height: 90 }]))

		const solution = solveCallouts({
			frame: { width: 400, height: 200 },
			center: { x: 200, y: 100 },
			slices,
			sizes,
			r0: 90,
			forced: true,
		})

		// Forced callouts never switch mode; the smallest share (0.2) drops first.
		expect(solution.mode).toBe('callout')

		expect(solution.dropped[0]).toBe(2)

		expect(solution.placed.map((card) => card.index)).not.toContain(2)
	})

	it('holds callouts through the hysteresis band once they are showing', () => {
		// A shrink that lands between the floor (90) and floor + hysteresis (98):
		// fresh it reads as sector, but a chart already showing callouts keeps them.
		const cramped = base({ sizes: sizeMap(107, 40) })

		// wanted = 200 − 107 − 12 = 81 — below the floor, so this stays sector.
		expect(solveCallouts(cramped).mode).toBe('sector')

		// A wanted of 93 sits in the band: sector from cold, callout when held.
		const edge = base({ sizes: sizeMap(95, 40) })

		expect(solveCallouts(edge).mode).toBe('sector')

		expect(solveCallouts({ ...edge, prevMode: 'callout' }).mode).toBe('callout')
	})
})
