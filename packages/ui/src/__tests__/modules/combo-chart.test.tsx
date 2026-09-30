import { describe, expect, it } from 'vitest'
import { ComboChart } from '../../modules/chart/combo-chart'
import { allBySlot, bySlot, fireEvent, getSlot, present, renderUI } from '../helpers'

/** Bars in a combo draw as one path per series; each bar is an `M`-opened subfigure. */
function barCount(container: HTMLElement): number {
	return allBySlot(container, 'chart-bar').reduce(
		(sum, path) => sum + (path.getAttribute('d')?.match(/M/g)?.length ?? 0),
		0,
	)
}

const DATA = [
	{ quarter: 'Q1', revenue: 40, margin: 12, cost: 28 },
	{ quarter: 'Q2', revenue: 80, margin: 18, cost: 30 },
	{ quarter: 'Q3', revenue: 65, margin: 15, cost: 33 },
]

const SERIES = [
	{ type: 'bar', xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
	{ type: 'line', xKey: 'quarter', yKey: 'margin', yName: 'Margin' },
] as const

const TRIO = [
	{ type: 'bar', xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
	{ type: 'area', xKey: 'quarter', yKey: 'cost', yName: 'Cost' },
	{ type: 'line', xKey: 'quarter', yKey: 'margin', yName: 'Margin' },
] as const

function chart(extra?: Partial<Parameters<typeof ComboChart<(typeof DATA)[number]>>[0]>) {
	return (
		<ComboChart
			aria-label="Revenue and margin by quarter"
			data={DATA}
			series={[...SERIES]}
			width={400}
			{...extra}
		/>
	)
}

describe('ComboChart', () => {
	it('draws bar series as bars and line series as lines, bars behind', () => {
		const { container } = renderUI(chart())

		expect(barCount(container)).toBe(3)

		expect(allBySlot(container, 'chart-line')).toHaveLength(1)

		const svg = present<SVGSVGElement>(getSlot(container, 'chart-plot').querySelector('svg'), 'svg')

		const order = [...svg.querySelectorAll('[data-slot="chart-bar"], [data-slot="chart-line"]')]

		expect(order.at(0)?.getAttribute('data-slot')).toBe('chart-bar')

		expect(order.at(-1)?.getAttribute('data-slot')).toBe('chart-line')
	})

	it('reads both series in one tooltip on one shared axis', () => {
		const { container } = renderUI(chart())

		const hit = bySlot(container, 'chart-hit') as Element

		// (185, 100) sits on Q2's revenue bar.
		fireEvent.pointerMove(hit, { clientX: 185, clientY: 100 })

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Q2')

		expect(tooltip?.textContent).toContain('80')

		expect(tooltip?.textContent).toContain('18')

		// One y axis only — no second tick column.
		expect(allBySlot(container, 'chart-axis-y')).toHaveLength(1)

		// Between the groups, clear of the margin line, nothing reads.
		fireEvent.pointerMove(hit, { clientX: 130, clientY: 100 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('leaves line points unmarked by default and marks them on points', () => {
		const bare = renderUI(chart())

		expect(allBySlot(bare.container, 'chart-point')).toHaveLength(0)

		const marked = renderUI(chart({ points: true }))

		expect(allBySlot(marked.container, 'chart-point')).toHaveLength(3)
	})

	it('draws an area series as a filled wash under its top-edge line', () => {
		const { container } = renderUI(chart({ series: [...TRIO] }))

		expect(barCount(container)).toBe(3)

		// One contiguous run of three points: a single wash under a single edge.
		expect(allBySlot(container, 'chart-area')).toHaveLength(1)

		// The area's own top edge plus the line series — two stroked paths.
		expect(allBySlot(container, 'chart-line')).toHaveLength(2)
	})

	it('stacks bars at the back, the area wash over them, the line on top', () => {
		const { container } = renderUI(chart({ series: [...TRIO] }))

		const svg = present<SVGSVGElement>(getSlot(container, 'chart-plot').querySelector('svg'), 'svg')

		const slots = [
			...svg.querySelectorAll(
				'[data-slot="chart-bar"], [data-slot="chart-area"], [data-slot="chart-line"]',
			),
		].map((mark) => mark.getAttribute('data-slot'))

		// Bars paint first at the back, the translucent wash over them, the line last.
		expect(slots.indexOf('chart-bar')).toBeLessThan(slots.indexOf('chart-area'))

		expect(slots.indexOf('chart-area')).toBeLessThan(slots.lastIndexOf('chart-line'))

		expect(slots.at(-1)).toBe('chart-line')
	})

	it('gives an area series a line-shaped legend swatch', () => {
		const { container } = renderUI(chart({ series: [...TRIO] }))

		const items = allBySlot(container, 'chart-legend-item')

		expect(items).toHaveLength(3)

		// Bar wears a rect swatch, area and line the stroke-shaped one. The swatch
		// is the second span, because the hit-target sibling of the Button leads.
		expect(items[0]?.querySelector('span:nth-child(2)')?.className).toContain('size-2.5')

		expect(items[1]?.querySelector('span:nth-child(2)')?.className).toContain('w-3')

		expect(items[2]?.querySelector('span:nth-child(2)')?.className).toContain('w-3')
	})

	it('reads an area series where the pointer sits inside its fill', () => {
		const { container } = renderUI(
			chart({ series: [{ type: 'area', xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }] }),
		)

		const hit = bySlot(container, 'chart-hit') as Element

		// Low in the plot at Q2's band, well inside the wash and clear of any line.
		fireEvent.pointerMove(hit, { clientX: 185, clientY: 180 })

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Q2')

		expect(tooltip?.textContent).toContain('80')
	})

	it('still renders each mark kind under animate', () => {
		const { container } = renderUI(chart({ series: [...TRIO], animate: true }))

		expect(barCount(container)).toBe(3)

		expect(allBySlot(container, 'chart-area')).toHaveLength(1)

		// The top edge of the area plus the line series.
		expect(allBySlot(container, 'chart-line')).toHaveLength(2)
	})

	it('isolates the nearer stroke where the line and area edge share the catch', () => {
		// `points` marks the dots this reads coordinates from; it does not affect
		// the isolation under test.
		const { container } = renderUI(chart({ series: [...TRIO], points: true }))

		const hit = bySlot(container, 'chart-hit') as Element

		// jsdom boxes sit at 0, so a dot's frame coordinates map back to client
		// coordinates through the plot offset the hit rect carries.
		const plotX = Number(hit.getAttribute('x'))

		const plotY = Number(hit.getAttribute('y'))

		const groups = allBySlot(container, 'chart-line-series')

		const areaGroup = groups.find((g) => g.querySelector('[data-slot="chart-area"]')) as Element

		const lineGroup = groups.find((g) => !g.querySelector('[data-slot="chart-area"]')) as Element

		const dotAt = (group: Element, index: number) => {
			const dot = group.querySelectorAll('[data-slot="chart-point"]')[index] as Element

			return { x: Number(dot.getAttribute('cx')), y: Number(dot.getAttribute('cy')) }
		}

		const areaDot = dotAt(areaGroup, 1)

		const lineDot = dotAt(lineGroup, 1)

		// The premise: at Q2 both strokes sit inside one 32px catch, so a
		// draw-order priority would always hand the hover to the line.
		expect(Math.abs(areaDot.y - lineDot.y)).toBeLessThanOrEqual(32)

		// On the area's own dot, the area is the nearer stroke — it isolates,
		// the line and bars recede.
		fireEvent.pointerMove(hit, { clientX: areaDot.x - plotX, clientY: areaDot.y - plotY })

		expect(areaGroup.getAttribute('class')).not.toContain('opacity-25')

		expect(lineGroup.getAttribute('class')).toContain('opacity-25')

		const bars = allBySlot(container, 'chart-bar')

		expect(bars).toHaveLength(1)

		expect(bars.every((bar) => bar.getAttribute('class')?.includes('opacity-25'))).toBe(true)

		// And on the line's dot the resolution flips.
		fireEvent.pointerMove(hit, { clientX: lineDot.x - plotX, clientY: lineDot.y - plotY })

		expect(lineGroup.getAttribute('class')).not.toContain('opacity-25')

		expect(areaGroup.getAttribute('class')).toContain('opacity-25')
	})
})

describe('ComboChart area wash', () => {
	/**
	 * A bar below zero lifts the zero line off the plot floor. The area stays
	 * above zero, and the bar at `C` stands above zero too, so the band under the
	 * zero line at `C` holds no mark.
	 */
	function lifted() {
		const result = renderUI(
			<ComboChart
				aria-label="Net and volume"
				width={400}
				height={240}
				points
				data={[
					{ q: 'A', net: -40, volume: 20 },
					{ q: 'B', net: 30, volume: 60 },
					{ q: 'C', net: 10, volume: 40 },
				]}
				series={[
					{ type: 'bar', xKey: 'q', yKey: 'net', yName: 'Net' },
					{ type: 'area', xKey: 'q', yKey: 'volume', yName: 'Volume' },
				]}
			/>,
		)

		const { container } = result

		const hit = getSlot(container, 'chart-hit')

		// The category rule stands on the zero line.
		const zero = Number(
			getSlot(container, 'chart-axis-x').querySelector('line')?.getAttribute('y1'),
		)

		const floor = Number(hit.getAttribute('y')) + Number(hit.getAttribute('height'))

		return { ...result, hit, zero, floor }
	}

	it('closes the wash at the zero line, not the plot floor', () => {
		const { container, zero, floor } = lifted()

		const d = getSlot(container, 'chart-area').getAttribute('d') ?? ''

		const close = Number(/([\d.]+)\s*Z$/.exec(d)?.[1])

		// The premise: the zero line sits well above the floor.
		expect(floor - zero).toBeGreaterThan(20)

		expect(close).toBeCloseTo(zero, 1)
	})

	it('reads the wash above the zero line and nothing between the zero line and the floor', () => {
		const { container, hit, zero, floor } = lifted()

		const plotX = Number(hit.getAttribute('x'))

		const plotY = Number(hit.getAttribute('y'))

		const dot = allBySlot(container, 'chart-point')[2] as Element

		const x = Number(dot.getAttribute('cx'))

		const top = Number(dot.getAttribute('cy'))

		// Inside the wash, between its top edge and the zero line, the area reads.
		fireEvent.pointerMove(hit, { clientX: x - plotX, clientY: (top + zero) / 2 - plotY })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('40')

		// Under the zero line the wash does not draw, so the pointer reads no mark.
		fireEvent.pointerMove(hit, { clientX: x - plotX, clientY: (zero + floor) / 2 - plotY })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})
})

describe('ComboChart reference labels', () => {
	it('draws a standing label for a reference under `labels.references`', () => {
		const { container } = renderUI(
			<ComboChart
				aria-label="Revenue and margin"
				width={400}
				data={[
					{ q: 'Q1', r: 40, m: 12 },
					{ q: 'Q2', r: 80, m: 18 },
				]}
				series={[
					{ type: 'bar', xKey: 'q', yKey: 'r', yName: 'Revenue' },
					{ type: 'line', xKey: 'q', yKey: 'm', yName: 'Margin' },
				]}
				reference={[{ value: 70, label: 'Target' }]}
				labels={{ references: true }}
			/>,
		)

		expect(bySlot(container, 'chart-reference-label')).toHaveTextContent('Target')
	})

	it('keeps an edge value label on its natural side, above the peak', () => {
		const { container } = renderUI(
			<ComboChart
				aria-label="Revenue and margin"
				width={400}
				points
				labels={{ extremes: true }}
				data={[
					{ q: 'Q1', r: 10, m: 40 },
					{ q: 'Q2', r: 20, m: 100 },
					{ q: 'Q3', r: 15, m: 65 },
				]}
				series={[
					{ type: 'bar', xKey: 'q', yKey: 'r', yName: 'Revenue' },
					{ type: 'line', xKey: 'q', yKey: 'm', yName: 'Margin' },
				]}
			/>,
		)

		const label = allBySlot(container, 'chart-value-label').find((n) => n.textContent === '100')

		const peak = allBySlot(container, 'chart-point')[1]

		expect(Number(label?.getAttribute('y'))).toBeLessThan(Number(peak?.getAttribute('cy')))
	})
})
