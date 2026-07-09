import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import {
	barMarks,
	stackedBarMarks,
	stackedBarSnapPoints,
	stackedBarSnapSeries,
} from '../../modules/chart/bar-chart/bar-chart-geometry'
import { TICK_CHAR_WIDTH } from '../../modules/chart/chart-constants'
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

	it('pins the readout to a click under trigger click, ignoring hover', () => {
		const { container } = renderUI(chart({ tooltip: { trigger: 'click' } }))

		const hit = bySlot(container, 'chart-hit') as HTMLElement

		// Movement never summons the readout under the click trigger; it only points
		// the cursor at the bars — a pointer over Q3's bar, the default over the gap
		// above it (this chart doesn't snap).
		fireEvent.pointerMove(hit, { clientX: 300, clientY: 100 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		expect(hit.style.cursor).toBe('pointer')

		fireEvent.pointerMove(hit, { clientX: 300, clientY: 20 })

		expect(hit.style.cursor).toBe('default')

		// A click on Q3's bar pins its readout.
		fireEvent.click(hit, { clientX: 300, clientY: 100 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Q3')

		// Clicking the same band again dismisses it.
		fireEvent.click(hit, { clientX: 300, clientY: 100 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()
	})

	it('carries the click cursor across the whole plot when the readout snaps', () => {
		const { container } = renderUI(
			chart({ tooltip: { trigger: 'click' }, crosshair: { snap: true } }),
		)

		// A snapping chart reads a click anywhere, so the whole hit layer is a pointer
		// rather than only the bars.
		expect(bySlot(container, 'chart-hit')?.getAttribute('class')).toContain('cursor-pointer')
	})

	it('reports a band click through onCategoryClick with its label and index', () => {
		const clicks: [string, number][] = []

		const { container } = renderUI(
			chart({ onCategoryClick: (category, index) => clicks.push([category, index]) }),
		)

		const hit = bySlot(container, 'chart-hit') as HTMLElement

		// The bands read as clickable, and a click on Q3's band reports it.
		expect(hit.getAttribute('class')).toContain('cursor-pointer')

		fireEvent.click(hit, { clientX: 300, clientY: 100 })

		expect(clicks).toEqual([['Q3', 2]])

		// Hover tooltips still track — activation never hijacks the readout.
		fireEvent.pointerMove(hit, { clientX: 300, clientY: 100 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Q3')
	})

	it('reports a band click through onCategoryClick under the click trigger too', () => {
		const clicks: string[] = []

		const { container } = renderUI(
			chart({
				tooltip: { trigger: 'click' },
				onCategoryClick: (category) => clicks.push(category),
			}),
		)

		const hit = bySlot(container, 'chart-hit') as HTMLElement

		// One gesture pins the readout AND reports the activation.
		fireEvent.click(hit, { clientX: 300, clientY: 100 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Q3')

		expect(clicks).toEqual(['Q3'])
	})

	it('mounts the hit layer for onCategoryClick even with the tooltip off', () => {
		const clicks: string[] = []

		const { container } = renderUI(
			chart({ tooltip: false, onCategoryClick: (category) => clicks.push(category) }),
		)

		const hit = bySlot(container, 'chart-hit') as HTMLElement

		fireEvent.click(hit, { clientX: 60, clientY: 100 })

		expect(clicks).toEqual(['Q1'])
	})

	it('dismisses on an off-mark click without stranding the band (no snap)', () => {
		const { container } = renderUI(chart({ tooltip: { trigger: 'click' } }))

		const hit = bySlot(container, 'chart-hit') as Element

		fireEvent.click(hit, { clientX: 300, clientY: 100 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Q3')

		// A click above the bars reads nothing on a non-snap chart, so it dismisses
		// rather than pinning a hidden band.
		fireEvent.click(hit, { clientX: 300, clientY: 20 })

		expect(bySlot(container, 'tooltip-content')).toBeNull()

		// The next click on the bar still opens it — no dead click from a stray index.
		fireEvent.click(hit, { clientX: 300, clientY: 100 })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Q3')
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

	it('renders the legend as toggle buttons, centered on mobile', () => {
		const { container } = renderUI(chart())

		const className = bySlot(container, 'chart-legend')?.className

		expect(className).toContain('justify-center')

		const [item] = allBySlot(container, 'chart-legend-item')

		expect(item?.tagName).toBe('BUTTON')

		expect(item).toHaveAttribute('aria-pressed', 'true')

		expect(item?.className).toContain('cursor-pointer')
	})

	it('renders a lone forced-on legend entry as a live switch', () => {
		// One series defaults the legend off; force it on. The lone entry is still a
		// switch — a button, the toolbar's sole Tab stop — and toggling it off empties
		// the plot, with the forced-on legend holding the switch that brings it back.
		const { container } = renderUI(
			chart({ series: [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }], legend: true }),
		)

		const item = bySlot(container, 'chart-legend-item') as HTMLButtonElement

		expect(item.textContent).toBe('Revenue')

		expect(item.tagName).toBe('BUTTON')

		expect(item).toHaveAttribute('aria-pressed', 'true')

		expect(item.tabIndex).toBe(0)

		expect(bySlot(container, 'chart-legend')).toHaveAttribute('role', 'toolbar')

		expect(allBySlot(container, 'chart-bar')).toHaveLength(3)

		fireEvent.click(item)

		expect(item).toHaveAttribute('aria-pressed', 'false')

		expect(item.querySelector('.line-through')).not.toBeNull()

		expect(allBySlot(container, 'chart-bar')).toHaveLength(0)

		fireEvent.click(item)

		expect(allBySlot(container, 'chart-bar')).toHaveLength(3)
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

		// The '$'-prefixed ticks widen the value gutter, narrowing the plot and
		// nudging the bars right; (280, 100) sits on Q3's revenue bar under it.
		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, {
			clientX: 280,
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

	it('carries the whole-chart ratio on the figure when a legend shares the aspect box', () => {
		// Two series show a legend, so the ratio describes the whole chart: the
		// figure wrapper carries the CSS aspect-ratio and the plot fills what the
		// legend leaves, rather than the plot box reserving the ratio alone.
		const { container } = renderUI(chart({ aspectRatio: '16/9' }))

		const figure = bySlot(container, 'chart-figure') as HTMLElement

		expect(figure.style.aspectRatio.replace(/\s*\/\s*1$/, '')).toBe('1.7777777777777777')

		// The plot box no longer reserves its own ratio — it fills the region the
		// figure sized.
		expect(bySlot(container, 'aspect-ratio')).toBeNull()
	})

	it('carries the ratio on the figure even with no legend, so a parent can clamp it', () => {
		// One series shows no legend, but the ratio still rides the figure as a CSS
		// preference — a definite-height parent clamps the whole chart (the box-law)
		// rather than the plot box forcing its own height and overflowing it.
		const { container } = renderUI(
			chart({
				series: [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }],
				aspectRatio: '16/9',
			}),
		)

		const figure = bySlot(container, 'chart-figure') as HTMLElement

		expect(figure.style.aspectRatio.replace(/\s*\/\s*1$/, '')).toBe('1.7777777777777777')

		// The plot box reserves no ratio of its own — it fills and measures the figure.
		expect(bySlot(container, 'aspect-ratio')).toBeNull()

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		expect(plot.className).toContain('flex-1')

		expect((plot.firstElementChild as HTMLElement).className).toContain('size-full')

		// `max-h-full` lets a shorter parent clamp the figure below the ratio's ask.
		expect(figure.className).toContain('max-h-full')
	})

	it('takes a fixed pixel height with no ratio reserved when a height is set', () => {
		const fixed = renderUI(chart({ height: 260 }))

		expect(bySlot(fixed.container, 'aspect-ratio')).toBeNull()

		expect(bySlot(fixed.container, 'chart-figure')?.style.aspectRatio).toBe('')

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

	it('widens the bars to fill the band under thick', () => {
		// The first bar's left edge, off the `M x0 …` that opens its path.
		const leftEdge = (container: HTMLElement) =>
			Number(
				(bySlot(container, 'chart-bar') as HTMLElement)
					.getAttribute('d')
					?.match(/^M\s+([\d.]+)/)?.[1],
			)

		const spec = renderUI(
			chart({ series: [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }] }),
		)

		const wide = renderUI(
			chart({ series: [{ xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' }], thick: true }),
		)

		// Thick fills the band, so the bar starts further out than the centered
		// spec-width one — proof the flag reaches the geometry.
		expect(leftEdge(wide.container)).toBeLessThan(leftEdge(spec.container))
	})
})

describe('BarChart tickRotation', () => {
	const LONG_CATEGORIES = [
		'January Sales',
		'February Sales',
		'March Sales',
		'April Sales',
		'May Sales',
		'June Sales',
	]

	function longChart(
		extra?: Partial<Parameters<typeof BarChart<{ month: string; total: number }>>[0]>,
	) {
		return renderUI(
			<BarChart
				aria-label="Monthly totals"
				data={LONG_CATEGORIES.map((month, index) => ({ month, total: (index + 1) * 10 }))}
				series={[{ xKey: 'month', yKey: 'total', yName: 'Total' }]}
				// Standard width, where the band thins its labels (and tickRotation can
				// tilt them instead); a compact frame would show only its ends.
				width={420}
				{...extra}
			/>,
		)
	}

	it('shows only the first and last label in a compact frame, whatever the rotation', () => {
		// Below the compact width the band drops to its ends — a more aggressive
		// reduction than thinning that tickRotation does not override, since the
		// tier already spent the room a tilted run would need.
		const { container } = longChart({ width: 300, tickRotation: true })

		const ticks = [...(bySlot(container, 'chart-axis-x')?.querySelectorAll('text') ?? [])]

		expect(ticks).toHaveLength(2)

		expect(ticks[0]?.textContent).toBe('January Sales')

		expect(ticks[1]?.textContent).toBe('June Sales')

		// The ends read flat and anchor inward, never tilted.
		expect(ticks.every((tick) => tick.getAttribute('transform') === null)).toBe(true)

		expect(ticks[0]?.getAttribute('text-anchor')).toBe('start')

		expect(ticks[1]?.getAttribute('text-anchor')).toBe('end')
	})

	it('thins long labels by default instead of tilting them', () => {
		const { container } = longChart()

		const ticks = [...(bySlot(container, 'chart-axis-x')?.querySelectorAll('text') ?? [])]

		expect(ticks.length).toBeLessThan(LONG_CATEGORIES.length)

		expect(ticks.every((tick) => tick.getAttribute('transform') === null)).toBe(true)
	})

	it('tilts every label instead of thinning once tickRotation is on', () => {
		const { container } = longChart({ tickRotation: true })

		const ticks = [...(bySlot(container, 'chart-axis-x')?.querySelectorAll('text') ?? [])]

		expect(ticks).toHaveLength(LONG_CATEGORIES.length)

		expect(ticks.every((tick) => tick.getAttribute('transform')?.startsWith('rotate('))).toBe(true)
	})

	it('leaves labels flat when they already fit, tickRotation notwithstanding', () => {
		const { container } = renderUI(chart({ tickRotation: true }))

		const ticks = [...(bySlot(container, 'chart-axis-x')?.querySelectorAll('text') ?? [])]

		expect(ticks).toHaveLength(DATA.length)

		expect(ticks.every((tick) => tick.getAttribute('transform') === null)).toBe(true)
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

			const half = ((label.textContent?.length ?? 0) * TICK_CHAR_WIDTH) / 2

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

	it('caps at the spec thickness by default and fills the band under thick', () => {
		// A band wide enough (160) that the default bar caps at the 24px spec.
		const wide = bandScale({ count: 1, range: [0, 200] })

		const [capped] = barMarks([[40]], wide, map, 100)

		const [full] = barMarks([[40]], wide, map, 100, 'vertical', true)

		expect((capped?.[0]?.x1 ?? 0) - (capped?.[0]?.x ?? 0)).toBe(24)

		expect((full?.[0]?.x1 ?? 0) - (full?.[0]?.x ?? 0)).toBe(wide.width)
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

	it('caps the column at the spec thickness by default and fills the band under thick', () => {
		const [capped] = stackedBarMarks([[40]], band, map)

		const [full] = stackedBarMarks([[40]], band, map, 'vertical', true)

		expect((capped?.[0]?.x1 ?? 0) - (capped?.[0]?.x ?? 0)).toBe(24)

		expect((full?.[0]?.x1 ?? 0) - (full?.[0]?.x ?? 0)).toBe(band.width)
	})
})

describe('stackedBarSnapPoints / stackedBarSnapSeries', () => {
	const band = bandScale({ count: 1, range: [0, 100] })

	const map = (value: number) => 100 - value

	it('reads each segment cumulative top, not the from-zero value positions', () => {
		const marks = stackedBarMarks([[40], [30]], band, map)

		// Bottom segment tops at its own value (map(40)); the second rides it and
		// tops at the running total (map(70)) — not map(30), the from-zero position
		// the shared snap points would carry.
		expect(stackedBarSnapPoints(marks, 1)).toEqual([[map(40), map(70)]])
	})

	it('names each stop series by its stack order, dropping the same gaps', () => {
		const marks = stackedBarMarks([[40], [0], [30]], band, map)

		// The zero-valued middle series takes no segment, so it drops from both the
		// positions and the parallel series list, keeping the two aligned.
		expect(stackedBarSnapPoints(marks, 1)).toEqual([[map(40), map(70)]])

		expect(stackedBarSnapSeries(marks, [0, 1, 2], 1)).toEqual([[0, 2]])
	})
})
