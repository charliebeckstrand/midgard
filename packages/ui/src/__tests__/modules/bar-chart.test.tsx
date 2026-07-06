import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { barMarks, stackedBarMarks } from '../../modules/chart/bar-chart/bar-chart-geometry'
import { bandScale } from '../../modules/chart/chart-scale'
import { act, allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

const DATA = [
	{ quarter: 'Q1', revenue: 40, costs: 24 },
	{ quarter: 'Q2', revenue: 80, costs: 31 },
	{ quarter: 'Q3', revenue: 65, costs: 28 },
]

const SERIES = [
	{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
	{ xKey: 'quarter', yKey: 'costs', yName: 'Costs' },
] as const

function chart(extra?: Partial<Parameters<typeof BarChart<(typeof DATA)[number]>>[0]>) {
	return (
		<BarChart
			aria-label="Revenue by quarter"
			data={DATA}
			series={[...SERIES]}
			width={400}
			{...extra}
		/>
	)
}

describe('BarChart', () => {
	it('draws one grouped bar per series per category', () => {
		const { container } = renderUI(chart())

		expect(allBySlot(container, 'chart-bar')).toHaveLength(6)

		expect(bySlot(container, 'chart-plot')).toHaveAttribute('aria-label', 'Revenue by quarter')
	})

	it('shows the legend for two series and drops it for one', () => {
		const two = renderUI(chart())

		expect(allBySlot(two.container, 'chart-legend-item').map((el) => el.textContent)).toEqual([
			'Revenue',
			'Costs',
		])

		const one = renderUI(
			chart({ series: [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }] }),
		)

		expect(bySlot(one.container, 'chart-legend')).toBeNull()
	})

	it('lists every series in the tooltip while the pointer is on a bar', () => {
		const { container } = renderUI(chart())

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		const hit = bySlot(container, 'chart-hit') as Element

		// jsdom boxes sit at 0, so client coordinates map straight into the plot;
		// (300, 100) lands inside Q3's revenue bar.
		fireEvent.pointerMove(hit, { clientX: 300, clientY: 100 })

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Q3')

		expect(tooltip?.textContent).toContain('65')

		expect(tooltip?.textContent).toContain('28')

		// Above the bar tops, or in the gap between groups, the tooltip stays away.
		fireEvent.pointerMove(hit, { clientX: 300, clientY: 20 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		fireEvent.pointerMove(hit, { clientX: 260, clientY: 100 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		fireEvent.pointerMove(hit, { clientX: 300, clientY: 100 })

		fireEvent.pointerLeave(hit)

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('rules a horizontal value line at the pointer with crosshair x', () => {
		const { container } = renderUI(chart({ crosshair: { x: true, y: false } }))

		expect(bySlot(container, 'chart-crosshair-x')).toBeNull()

		const hit = bySlot(container, 'chart-hit') as Element

		fireEvent.pointerMove(hit, { clientX: 390, clientY: 70 })

		const line = bySlot(container, 'chart-crosshair-x')

		expect(line).not.toBeNull()

		// A horizontal rule spanning the plot width at the pointer's height.
		const y = line?.getAttribute('y1')

		expect(line?.getAttribute('y2')).toBe(y)

		expect(Number(line?.getAttribute('x2'))).toBeGreaterThan(Number(line?.getAttribute('x1')))

		// It follows the pointer down the value axis.
		fireEvent.pointerMove(hit, { clientX: 390, clientY: 120 })

		expect(bySlot(container, 'chart-crosshair-x')?.getAttribute('y1')).not.toBe(y)

		fireEvent.pointerLeave(hit)

		expect(bySlot(container, 'chart-crosshair-x')).toBeNull()
	})

	it('draws the crosshair only when asked; snap locks the vertical rule to the band', () => {
		const off = renderUI(chart())

		fireEvent.pointerMove(bySlot(off.container, 'chart-hit') as Element, {
			clientX: 200,
			clientY: 70,
		})

		// Opt-in: neither rule without a crosshair prop.
		expect(bySlot(off.container, 'chart-crosshair-x')).toBeNull()

		expect(bySlot(off.container, 'chart-crosshair-y')).toBeNull()

		// A free vertical rule follows the pointer's x.
		const free = renderUI(chart({ crosshair: { x: false, y: true } }))

		const fh = bySlot(free.container, 'chart-hit') as Element

		fireEvent.pointerMove(fh, { clientX: 300, clientY: 70 })

		const freeX = bySlot(free.container, 'chart-crosshair-y')?.getAttribute('x1')

		fireEvent.pointerMove(fh, { clientX: 312, clientY: 70 })

		expect(bySlot(free.container, 'chart-crosshair-y')?.getAttribute('x1')).not.toBe(freeX)

		// A snapped rule holds its band center across small moves.
		const snapped = renderUI(chart({ crosshair: { x: false, y: true, snap: true } }))

		const sh = bySlot(snapped.container, 'chart-hit') as Element

		fireEvent.pointerMove(sh, { clientX: 300, clientY: 70 })

		const snapX = bySlot(snapped.container, 'chart-crosshair-y')?.getAttribute('x1')

		fireEvent.pointerMove(sh, { clientX: 308, clientY: 70 })

		expect(bySlot(snapped.container, 'chart-crosshair-y')?.getAttribute('x1')).toBe(snapX)
	})

	it('snaps the horizontal value line onto a bar top with crosshair snap', () => {
		const free = renderUI(chart({ crosshair: { x: true, y: false } }))

		fireEvent.pointerMove(bySlot(free.container, 'chart-hit') as Element, {
			clientX: 200,
			clientY: 55,
		})

		const freeY = bySlot(free.container, 'chart-crosshair-x')?.getAttribute('y1')

		const snapped = renderUI(chart({ crosshair: { x: true, y: false, snap: true } }))

		fireEvent.pointerMove(bySlot(snapped.container, 'chart-hit') as Element, {
			clientX: 200,
			clientY: 55,
		})

		// Snap pulls the rule off the pointer onto the nearest series value.
		expect(bySlot(snapped.container, 'chart-crosshair-x')?.getAttribute('y1')).not.toBe(freeY)
	})

	it('reads a bare crosshair as both rails and treats x / y as subtractive overrides', () => {
		// The boolean shorthand draws both rails.
		const both = renderUI(chart({ crosshair: true }))

		fireEvent.pointerMove(bySlot(both.container, 'chart-hit') as Element, {
			clientX: 200,
			clientY: 70,
		})

		expect(bySlot(both.container, 'chart-crosshair-x')).not.toBeNull()

		expect(bySlot(both.container, 'chart-crosshair-y')).not.toBeNull()

		// An object without x / y means both too — snap rides along.
		const snapped = renderUI(chart({ crosshair: { snap: true } }))

		fireEvent.pointerMove(bySlot(snapped.container, 'chart-hit') as Element, {
			clientX: 200,
			clientY: 70,
		})

		expect(bySlot(snapped.container, 'chart-crosshair-x')).not.toBeNull()

		expect(bySlot(snapped.container, 'chart-crosshair-y')).not.toBeNull()

		// y: false subtracts the vertical rule, leaving only the horizontal.
		const xOnly = renderUI(chart({ crosshair: { y: false } }))

		fireEvent.pointerMove(bySlot(xOnly.container, 'chart-hit') as Element, {
			clientX: 200,
			clientY: 70,
		})

		expect(bySlot(xOnly.container, 'chart-crosshair-x')).not.toBeNull()

		expect(bySlot(xOnly.container, 'chart-crosshair-y')).toBeNull()

		// x: false subtracts the horizontal rule, leaving only the vertical.
		const yOnly = renderUI(chart({ crosshair: { x: false } }))

		fireEvent.pointerMove(bySlot(yOnly.container, 'chart-hit') as Element, {
			clientX: 200,
			clientY: 70,
		})

		expect(bySlot(yOnly.container, 'chart-crosshair-y')).not.toBeNull()

		expect(bySlot(yOnly.container, 'chart-crosshair-x')).toBeNull()
	})

	it('omits bars for non-finite values and dashes them in the readout', () => {
		const gappy = [
			{ quarter: 'Q1', revenue: 40, costs: 1 },
			{ quarter: 'Q2', revenue: Number.NaN, costs: 2 },
			{ quarter: 'Q3', revenue: 65, costs: 3 },
		]

		const { container } = renderUI(
			chart({ data: gappy, series: [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }] }),
		)

		expect(allBySlot(container, 'chart-bar')).toHaveLength(2)

		expect(bySlot(container, 'chart-table')?.textContent).toContain('—')
	})

	it('still renders the marks under animate', () => {
		const { container } = renderUI(chart({ animate: true }))

		expect(allBySlot(container, 'chart-bar')).toHaveLength(6)
	})

	it('renders the legend as left-aligned toggle buttons', () => {
		const { container } = renderUI(chart())

		expect(bySlot(container, 'chart-legend')?.className).toContain('justify-start')

		const [item] = allBySlot(container, 'chart-legend-item')

		expect(item?.tagName).toBe('BUTTON')

		expect(item).toHaveAttribute('aria-pressed', 'true')

		expect(item?.className).toContain('cursor-pointer')
	})

	it('renders a lone forced-on legend entry as a static chip, not a switch', () => {
		// One series defaults the legend off; force it on. With nothing to switch
		// against, the entry drops the button — no toggle, no Tab stop — and the
		// container drops its switchboard role.
		const { container } = renderUI(
			chart({ series: [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }], legend: true }),
		)

		const item = bySlot(container, 'chart-legend-item')

		expect(item?.textContent).toBe('Revenue')

		expect(item?.tagName).toBe('SPAN')

		expect(item).not.toHaveAttribute('aria-pressed')

		expect(item).not.toHaveAttribute('tabindex')

		expect(bySlot(container, 'chart-legend')).not.toHaveAttribute('role')
	})

	it('roves legend focus with the arrow keys as one tab stop, clearing on Escape', async () => {
		const { container } = renderUI(chart())

		const items = allBySlot(container, 'chart-legend-item') as HTMLButtonElement[]

		// Single tab stop: exactly one item is arrow-reachable at rest.
		expect(items.filter((el) => el.tabIndex === 0)).toHaveLength(1)

		// Raw focus() drives the legend's emphasis state, so flush it under act.
		act(() => items[0]?.focus())

		fireEvent.keyDown(items[0] as Element, { key: 'ArrowRight' })

		expect(document.activeElement).toBe(items[1])

		fireEvent.keyDown(items[1] as Element, { key: 'Escape' })

		expect(document.activeElement).not.toBe(items[1])
	})

	it('carries a keyboard focus ring on legend entries', () => {
		const { container } = renderUI(chart())

		expect(bySlot(container, 'chart-legend-item')?.className).toContain('focus-visible:ring-2')
	})

	it('dims the other series while a legend entry is hovered', () => {
		const { container } = renderUI(chart())

		const costs = allBySlot(container, 'chart-legend-item')[1] as Element

		fireEvent.pointerEnter(costs)

		const bars = allBySlot(container, 'chart-bar')

		// Revenue bars (first series) dim; costs bars stay full.
		expect(bars[0]?.getAttribute('class')).toContain('opacity-25')

		expect(bars[3]?.getAttribute('class')).not.toContain('opacity-25')

		fireEvent.pointerLeave(costs)

		expect(allBySlot(container, 'chart-bar')[0]?.getAttribute('class')).not.toContain('opacity-25')
	})

	it('toggles a series off and strikes its legend entry through', () => {
		const { container } = renderUI(chart())

		const costs = allBySlot(container, 'chart-legend-item')[1] as HTMLButtonElement

		fireEvent.click(costs)

		expect(allBySlot(container, 'chart-bar')).toHaveLength(3)

		expect(costs).toHaveAttribute('aria-pressed', 'false')

		expect(costs.querySelector('.line-through')).not.toBeNull()

		// The tooltip readout follows the toggle; the lone series recenters, so
		// (305, 100) sits on Q3's remaining revenue bar.
		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, {
			clientX: 305,
			clientY: 100,
		})

		expect(bySlot(container, 'tooltip-content')?.textContent).not.toContain('Costs')

		fireEvent.click(costs)

		expect(allBySlot(container, 'chart-bar')).toHaveLength(6)
	})

	it('routes formatValue through ticks, tooltip, and the data table', () => {
		const { container } = renderUI(chart({ formatValue: (value) => `$${value}` }))

		const yAxis = bySlot(container, 'chart-axis-y')

		expect(yAxis?.textContent).toContain('$')

		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, {
			clientX: 300,
			clientY: 100,
		})

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('$65')

		expect(bySlot(container, 'chart-table')?.textContent).toContain('$65')
	})

	it('sizes the frame height from the aspect ratio, explicit height winning', () => {
		const ratio = renderUI(chart({ aspectRatio: '16/9' }))

		// 400 wide at 16/9 → 225 tall, carried by the viewBox.
		expect(ratio.container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 400 225')

		const square = renderUI(chart({ aspectRatio: 1 }))

		expect(square.container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 400 400')

		const fixed = renderUI(chart({ height: 260 }))

		expect(fixed.container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 400 260')
	})

	it('reserves the box height with the AspectRatio primitive, a fixed height only when set', () => {
		const ratio = renderUI(chart({ aspectRatio: '16/9' }))

		// The design-system AspectRatio reserves the height from the box's own
		// width, so it holds steady before measure and across animation replays.
		const box = bySlot(ratio.container, 'aspect-ratio') as HTMLElement

		expect(box.style.aspectRatio.replace(/\s*\/\s*1$/, '')).toBe('1.7777777777777777')

		const fixed = renderUI(chart({ height: 260 }))

		expect(bySlot(fixed.container, 'aspect-ratio')).toBeNull()

		expect(
			(bySlot(fixed.container, 'chart-plot')?.firstElementChild as HTMLElement).style.height,
		).toBe('260px')
	})

	it('renders an empty frame for empty data', () => {
		const { container } = renderUI(chart({ data: [] }))

		expect(allBySlot(container, 'chart-bar')).toHaveLength(0)

		expect(bySlot(container, 'chart-table')).toBeNull()

		expect(bySlot(container, 'chart-plot')).not.toBeNull()
	})

	it('scales stacked bars to the per-category sum, one segment per series', () => {
		const grouped = renderUI(chart())

		// Grouped tops out at the largest single value (80), so no tick reaches 100.
		expect(bySlot(grouped.container, 'chart-axis-y')?.textContent).not.toContain('100')

		const stacked = renderUI(chart({ stacked: true }))

		// One segment per series per category still.
		expect(allBySlot(stacked.container, 'chart-bar')).toHaveLength(6)

		// The value axis now spans the summed column (Q2 = 80 + 31 = 111), so a
		// three-figure tick appears that the grouped chart never reaches.
		expect(bySlot(stacked.container, 'chart-axis-y')?.textContent).toContain('100')
	})
})

describe('BarChart horizontal', () => {
	it('draws the same bars with the axes transposed', () => {
		const { container } = renderUI(chart({ orientation: 'horizontal' }))

		expect(allBySlot(container, 'chart-bar')).toHaveLength(6)

		// Categories move to the left (y) axis, values to the bottom (x) axis.
		const categoryAxis = bySlot(container, 'chart-axis-y')

		expect(categoryAxis?.textContent).toContain('Q1')

		expect(categoryAxis?.textContent).toContain('Q3')

		const valueAxis = bySlot(container, 'chart-axis-x')

		expect(valueAxis?.textContent).not.toContain('Q1')

		expect(valueAxis?.textContent).toContain('80')

		// The category axis carries the zero baseline as a vertical rule; the value
		// axis stays line-free, its scale drawn by the gridlines alone.
		expect(categoryAxis?.querySelector('line')).not.toBeNull()

		expect(valueAxis?.querySelector('line')).toBeNull()
	})

	it('reads the band off the pointer y and lists the series in the tooltip', () => {
		const { container } = renderUI(chart({ orientation: 'horizontal' }))

		const hit = bySlot(container, 'chart-hit') as Element

		// Frame coords add the plot origin (jsdom boxes sit at 0); (93, 18) lands the
		// pointer inside Q1's revenue bar, its band chosen by the y coordinate.
		fireEvent.pointerMove(hit, { clientX: 93, clientY: 18 })

		const tooltip = bySlot(container, 'tooltip-content')

		expect(tooltip?.textContent).toContain('Q1')

		expect(tooltip?.textContent).toContain('40')

		expect(tooltip?.textContent).toContain('24')

		// Past the value end of every bar in the row, the tooltip clears.
		fireEvent.pointerMove(hit, { clientX: 223, clientY: 18 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('keeps the bottom value labels inside the viewBox instead of clipping them', () => {
		const { container } = renderUI(chart({ orientation: 'horizontal' }))

		const svg = container.querySelector('svg') as SVGSVGElement

		const width = Number((svg.getAttribute('viewBox') ?? '0 0 0 0').split(' ')[2])

		const labels = Array.from(
			(bySlot(container, 'chart-axis-x') as Element).querySelectorAll('text'),
		)

		expect(labels.length).toBeGreaterThan(0)

		// Each centered value label spans its x ± half its width; both edges must
		// fall within [0, width] or the SVG's overflow clips them.
		for (const label of labels) {
			const x = Number(label.getAttribute('x'))

			const half = ((label.textContent?.length ?? 0) * 7.2) / 2

			expect(x - half).toBeGreaterThanOrEqual(0)

			expect(x + half).toBeLessThanOrEqual(width)
		}
	})

	it('rules the value crosshair vertically down the value axis', () => {
		const { container } = renderUI(
			chart({ orientation: 'horizontal', crosshair: { x: true, y: false } }),
		)

		const hit = bySlot(container, 'chart-hit') as Element

		fireEvent.pointerMove(hit, { clientX: 93, clientY: 18 })

		const line = bySlot(container, 'chart-crosshair-x')

		expect(line).not.toBeNull()

		// Transposed from vertical: the value rule now runs down y at a fixed x.
		const x = line?.getAttribute('x1')

		expect(line?.getAttribute('x2')).toBe(x)

		expect(Number(line?.getAttribute('y2'))).toBeGreaterThan(Number(line?.getAttribute('y1')))
	})
})

describe('barMarks', () => {
	const band = bandScale({ count: 2, range: [0, 200] })

	const map = (value: number) => 100 - value

	it('rounds only the data end and squares the baseline', () => {
		const [row] = barMarks([[40, -20]], band, map, 100)

		const up = row?.[0]

		expect(up?.positive).toBe(true)

		// Starts and ends on the baseline, arcs at the value end.
		expect(up?.d.startsWith('M ')).toBe(true)

		expect(up?.d).toContain('A 4 4 0 0 1')

		expect(up?.d.endsWith('Z')).toBe(true)

		const down = row?.[1]

		expect(down?.positive).toBe(false)

		expect(down?.d).toContain('A 4 4 0 0 0')
	})

	it('transposes the span and the hit rect when horizontal', () => {
		// map(v) = 100 - v, baseline 100: a positive value lands left of the baseline
		// on x, so the bar grows toward smaller x. One band of width 200 → thickness
		// runs down y.
		const [row] = barMarks([[40]], bandScale({ count: 1, range: [0, 40] }), map, 100, 'horizontal')

		const mark = row?.[0]

		// The value span is horizontal (x), the thickness vertical (top/bottom = the band slot).
		expect(mark?.x).toBe(60)

		expect(mark?.x1).toBe(100)

		expect(mark?.top).toBeLessThan(mark?.bottom ?? 0)

		// 40 maps to x=60, right of the baseline's screen x (100), so it is not positive here.
		expect(mark?.positive).toBe(false)

		expect(mark?.d.startsWith('M ')).toBe(true)

		expect(mark?.d.endsWith('Z')).toBe(true)
	})

	it('clamps the radius on short bars instead of inverting', () => {
		const [row] = barMarks([[2]], bandScale({ count: 1, range: [0, 100] }), map, 100)

		expect(row?.[0]?.d).toContain('A 2 2')
	})

	it('omits null and zero values', () => {
		const [row] = barMarks([[null, 0, 10]], bandScale({ count: 3, range: [0, 300] }), map, 100)

		expect(row?.[0]).toBeNull()

		expect(row?.[1]).toBeNull()

		expect(row?.[2]).not.toBeNull()
	})
})

describe('stackedBarMarks', () => {
	// A single-category band; map inverts value → y so a taller value sits higher.
	const band = bandScale({ count: 1, range: [0, 100] })

	const map = (value: number) => 100 - value

	it('stacks each series onto the running total in one shared column', () => {
		const [lower, upper] = stackedBarMarks([[40], [30]], band, map)

		const bottom = lower?.[0]

		const top = upper?.[0]

		// Both segments occupy the same band slot — one column, not a group.
		expect(top?.x).toBe(bottom?.x)

		expect(top?.x1).toBe(bottom?.x1)

		// The second series rides the first: its span sits above, meeting at the
		// cumulative boundary (map(40) = 60).
		expect(bottom?.bottom).toBe(map(0))

		expect(bottom?.top).toBe(map(40))

		expect(top?.bottom).toBe(map(40))

		expect(top?.top).toBe(map(70))
	})

	it('rounds only the outermost segment and squares the ones within', () => {
		const [lower, upper] = stackedBarMarks([[40], [30]], band, map)

		// The topmost segment keeps the rounded data end; inner segments are square.
		expect(upper?.[0]?.d).toContain('A ')

		expect(lower?.[0]?.d).not.toContain('A ')
	})

	it('takes no segment for a null, zero, or negative value', () => {
		const [row] = stackedBarMarks(
			[[null, 0, -5, 20]],
			bandScale({ count: 4, range: [0, 400] }),
			map,
		)

		expect(row?.[0]).toBeNull()

		expect(row?.[1]).toBeNull()

		expect(row?.[2]).toBeNull()

		expect(row?.[3]).not.toBeNull()
	})
})
