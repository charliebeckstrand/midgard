import { describe, expect, it } from 'vitest'
import { PieChart } from '../../modules/chart/pie-chart'
import {
	CALLOUT_CHAR_WIDTH,
	CALLOUT_GAP,
	CALLOUT_LEADER,
	CALLOUT_LINE,
	CALLOUT_NUB,
	type PieSlice,
	pieCalloutFit,
	pieCallouts,
	pieCentroidRadius,
	pieSlices,
	segmentLabelFits,
} from '../../modules/chart/pie-chart/pie-chart-geometry'
import { act, allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

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
		const { container } = renderUI(chart())

		expect(allBySlot(container, 'chart-slice')).toHaveLength(3)

		expect(allBySlot(container, 'chart-legend-item').map((el) => el.textContent)).toEqual([
			'Search',
			'Direct',
			'Referral',
		])
	})

	it('does not recede the pie when a sliceless legend entry takes emphasis', () => {
		const { container } = renderUI(
			chart({
				data: [
					{ source: 'Search', visits: 60 },
					{ source: 'Direct', visits: 40 },
					{ source: 'Empty', visits: 0 },
				],
			}),
		)

		const items = allBySlot(container, 'chart-legend-item') as HTMLButtonElement[]

		// The zero row is still named in the legend but owns no slice; pointing its
		// entry (the pointer path sets emphasis directly, unlike focus, which rides
		// `:focus-visible`) must not dim the real slices — it would recede the whole
		// pie with nothing lifted against them.
		fireEvent.pointerEnter(items[2] as Element)

		for (const slice of allBySlot(container, 'chart-slice')) {
			expect(slice.parentElement?.getAttribute('class') ?? '').not.toContain('opacity-25')
		}
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

	it('pins a slice on click under trigger click, ignoring hover', () => {
		const { container } = renderUI(chart({ tooltip: { trigger: 'click' } }))

		const [first] = allBySlot(container, 'chart-slice')

		// The slice reads as clickable.
		expect((first as Element).getAttribute('class')).toContain('cursor-pointer')

		// Hovering no longer opens the readout.
		fireEvent.pointerEnter(first as Element)

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		// A click pins the slice's readout.
		fireEvent.click(first as Element)

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Search')

		// A second click of the same slice dismisses it.
		fireEvent.click(first as Element)

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('backs each slice with a gapless hit wedge so the gap keeps the tooltip', () => {
		const { container } = renderUI(chart())

		const hits = allBySlot(container, 'chart-slice-hit')

		expect(hits).toHaveLength(3)

		// Gapless: the wedge runs to the frame centre (150, 100) where the visible
		// slice stops short, so the channel between slices still reads as a slice.
		expect(hits[0]?.getAttribute('d')).toContain('L 150 100')

		// Pointing the hit layer — as a sweep across the gap would — still names
		// the slice instead of clearing the readout.
		fireEvent.pointerMove(hits[1] as Element, { clientX: 150, clientY: 60 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Direct')
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

	it('names slices from the outside with leadered callouts', () => {
		const { container } = renderUI(chart({ labels: { callouts: true } }))

		const texts = allBySlot(container, 'chart-callout-label').map((el) => el.textContent)

		expect(texts).toHaveLength(3)

		expect(texts).toContain('Search 60%')

		expect(texts).toContain('Referral 15%')

		// Each callout draws a leader out to its label.
		expect(allBySlot(container, 'chart-callout-leader')).toHaveLength(3)
	})

	it('fits the frame height to the callouts instead of leaving the default square empty', () => {
		// height/aspectRatio both unset: the frame fits the pie's own tight,
		// per-slice callout fit (see the `pieCalloutFit` describe block below)
		// rather than a flat margin sized as if every label sat at 3 o'clock;
		// vMargin = 14 + 15 = 29, radius ≈ 62.34, height = round(2*62.34+2*29) = 183.
		const { container } = renderUI(chart({ height: undefined, labels: { callouts: true } }))

		expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 300 183')
	})

	it('keeps the default frame square when callouts are off', () => {
		const { container } = renderUI(chart({ height: undefined }))

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

	it('lets an explicit aspectRatio win over the callout content-fit', () => {
		const { container } = renderUI(
			chart({ height: undefined, aspectRatio: 2, labels: { callouts: true } }),
		)

		expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 300 150')
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

	it('renders a lone slice legend entry as a static chip', () => {
		// A single-slice pie with the legend forced on: the one entry is static,
		// since toggling it would empty the pie.
		const { container } = renderUI(
			chart({ data: [{ source: 'Search', visits: 60 }], legend: true }),
		)

		const item = bySlot(container, 'chart-legend-item')

		expect(item?.tagName).toBe('SPAN')

		expect(item).not.toHaveAttribute('aria-pressed')
	})

	it('sets the legend beside the plot as a share panel with legend="right"', () => {
		const { container } = renderUI(chart({ legend: 'right' }))

		// Panel entries carry each slice's live share after the name.
		const items = allBySlot(container, 'chart-legend-item')

		expect(items.map((el) => el.textContent)).toEqual(['Search60%', 'Direct25%', 'Referral15%'])

		// Each entry stretches full width so the column shares one edge, but its
		// own content stays left-justified — a full-width button would otherwise
		// center a shorter row's swatch under a longer one's.
		for (const item of items) expect(item.className).toContain('justify-start')

		const panel = bySlot(container, 'chart-legend') as Element

		// A single column at every viewport, never a grid.
		expect(panel.className).toContain('flex-col')

		expect(panel.className).not.toContain('grid')

		// The panel always follows the plot in the DOM — under the chart when
		// stacked; a left panel reverses the container-query row instead of moving.
		const plot = bySlot(container, 'chart-plot') as Element

		expect(plot.compareDocumentPosition(panel) & 4).toBeTruthy()

		expect(panel.parentElement?.className).toContain('@xl:flex-row')

		const left = renderUI(chart({ legend: 'left' }))

		expect(bySlot(left.container, 'chart-legend')?.parentElement?.className).toContain(
			'@xl:flex-row-reverse',
		)
	})

	it('roves the side panel with the vertical arrow keys, matching its column layout', () => {
		const { container } = renderUI(chart({ legend: 'right' }))

		// A side panel stacks vertically, so it declares a vertical toolbar and roves
		// on Up/Down rather than the wrap row's Left/Right.
		expect(bySlot(container, 'chart-legend')).toHaveAttribute('aria-orientation', 'vertical')

		const items = allBySlot(container, 'chart-legend-item') as HTMLButtonElement[]

		// Raw focus() drives the legend's emphasis state, so flush it under act.
		act(() => items[0]?.focus())

		fireEvent.keyDown(items[0] as Element, { key: 'ArrowDown' })

		expect(document.activeElement).toBe(items[1])

		// The cross-axis arrow leaves the vertical toolbar where it is.
		fireEvent.keyDown(items[1] as Element, { key: 'ArrowRight' })

		expect(document.activeElement).toBe(items[1])
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

	it('hands each slice a gapless hit wedge that runs edge to edge', () => {
		const [first] = pieSlices([1, 1, 1, 1], { ...FRAME, pad: 6 })

		// The visible wedge stops at its knife-cut tip short of the middle; the hit
		// wedge has no gap, so it runs its straight edges to the exact centre —
		// claiming the slice's half of every channel, no dead zone in the gap.
		expect(first?.hit).toContain(`L ${FRAME.cx} ${FRAME.cy}`)

		expect(first?.d).not.toContain(`L ${FRAME.cx} ${FRAME.cy}`)
	})

	it('matches the flush wedge for the hit path, gap or no gap', () => {
		// The hit wedge is the pad-0 slice, so a padded pie's hit path is exactly
		// what the same slice draws with no gap at all.
		const flush = pieSlices([50, 30, 20], FRAME)

		const padded = pieSlices([50, 30, 20], { ...FRAME, pad: 8 })

		expect(padded.map((slice) => slice.hit)).toEqual(flush.map((slice) => slice.d))
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

describe('pieCalloutFit', () => {
	it('flushes only the outermost callout on each side against the frame, hugging the rest to their own slice', () => {
		const values = [4820, 2210, 1370, 940]

		const total = values.reduce((sum, value) => sum + value, 0)

		const texts = ['Search', 'Direct', 'Referral', 'Social'].map(
			(name, index) => `${name} ${Math.round(((values[index] ?? 0) / total) * 100)}%`,
		)

		const frameWidth = 480

		const fit = pieCalloutFit({ values, texts, charWidth: CALLOUT_CHAR_WIDTH, frameWidth })

		const slices = pieSlices(values, { cx: fit.cx, cy: 200, radius: fit.radius })

		const callouts = pieCallouts(slices, {
			cx: fit.cx,
			cy: 200,
			radius: fit.radius,
			top: 10,
			bottom: 390,
		})

		// Each callout's far edge: past its nub by the label's own width, outward
		// from center on its side — 0 at the left frame edge, `frameWidth` at right.
		const farEdges = callouts.map((callout) => {
			const extent = (texts[callout.index]?.length ?? 0) * CALLOUT_CHAR_WIDTH

			return callout.anchor === 'start' ? callout.x + extent : callout.x - extent
		})

		expect(Math.max(...farEdges)).toBeCloseTo(frameWidth, 3)

		expect(Math.min(...farEdges)).toBeCloseTo(0, 3)

		// Not every label reaches an edge — only the widest-reaching one per side.
		expect(farEdges.some((edge) => edge > 5 && edge < frameWidth - 5)).toBe(true)
	})

	it('falls back to a centered, flat-margin radius with fewer than two slices', () => {
		const frameWidth = 300

		const texts = ['Everything 100%']

		const fit = pieCalloutFit({ values: [42], texts, charWidth: CALLOUT_CHAR_WIDTH, frameWidth })

		expect(fit.cx).toBe(frameWidth / 2)

		expect(fit.radius).toBeCloseTo(
			frameWidth / 2 -
				CALLOUT_LEADER -
				CALLOUT_NUB -
				CALLOUT_GAP -
				(texts[0]?.length ?? 0) * CALLOUT_CHAR_WIDTH,
			5,
		)
	})
})
