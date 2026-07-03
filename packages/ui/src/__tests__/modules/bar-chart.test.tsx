import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { barMarks } from '../../modules/chart/bar-chart/bar-chart-geometry'
import { bandScale } from '../../modules/chart/chart-scale'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

const DATA = [
	{ quarter: 'Q1', revenue: 40, costs: 24 },
	{ quarter: 'Q2', revenue: 80, costs: 31 },
	{ quarter: 'Q3', revenue: 65, costs: 28 },
]

const SERIES = [
	{ key: 'revenue', label: 'Revenue' },
	{ key: 'costs', label: 'Costs' },
] as const

function chart(extra?: Partial<Parameters<typeof BarChart<(typeof DATA)[number]>>[0]>) {
	return (
		<BarChart
			aria-label="Revenue by quarter"
			data={DATA}
			x="quarter"
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

		const one = renderUI(chart({ series: [{ key: 'revenue', label: 'Revenue' }] }))

		expect(bySlot(one.container, 'chart-legend')).toBeNull()
	})

	it('lists every series in the tooltip at the pointed category', () => {
		const { container } = renderUI(chart())

		expect(bySlot(container, 'chart-tooltip')).toBeNull()

		const hit = bySlot(container, 'chart-hit') as Element

		// jsdom boxes sit at 0, so clientX maps straight into plot coordinates.
		fireEvent.pointerMove(hit, { clientX: 390 })

		const tooltip = bySlot(container, 'chart-tooltip')

		expect(tooltip?.textContent).toContain('Q3')

		expect(tooltip?.textContent).toContain('65')

		expect(tooltip?.textContent).toContain('28')

		fireEvent.pointerLeave(hit)

		expect(bySlot(container, 'chart-tooltip')).toBeNull()
	})

	it('rules a horizontal correlation line tracking the pointer while hovering', () => {
		const { container } = renderUI(chart())

		expect(bySlot(container, 'chart-value-line')).toBeNull()

		const hit = bySlot(container, 'chart-hit') as Element

		fireEvent.pointerMove(hit, { clientX: 390, clientY: 70 })

		const line = bySlot(container, 'chart-value-line')

		expect(line).not.toBeNull()

		// A horizontal rule spanning the plot width at the pointer's height.
		const y = line?.getAttribute('y1')

		expect(line?.getAttribute('y2')).toBe(y)

		expect(Number(line?.getAttribute('x2'))).toBeGreaterThan(Number(line?.getAttribute('x1')))

		// It follows the pointer down the value axis.
		fireEvent.pointerMove(hit, { clientX: 390, clientY: 120 })

		expect(bySlot(container, 'chart-value-line')?.getAttribute('y1')).not.toBe(y)

		fireEvent.pointerLeave(hit)

		expect(bySlot(container, 'chart-value-line')).toBeNull()
	})

	it('omits bars for non-finite values and dashes them in the readout', () => {
		const gappy = [
			{ quarter: 'Q1', revenue: 40, costs: 1 },
			{ quarter: 'Q2', revenue: Number.NaN, costs: 2 },
			{ quarter: 'Q3', revenue: 65, costs: 3 },
		]

		const { container } = renderUI(
			chart({ data: gappy, series: [{ key: 'revenue', label: 'Revenue' }] }),
		)

		expect(allBySlot(container, 'chart-bar')).toHaveLength(2)

		expect(bySlot(container, 'chart-table')?.textContent).toContain('—')
	})

	it('still renders the marks under animate', () => {
		const { container } = renderUI(chart({ animate: true }))

		expect(allBySlot(container, 'chart-bar')).toHaveLength(6)
	})

	it('renders the legend as centered toggle buttons', () => {
		const { container } = renderUI(chart())

		expect(bySlot(container, 'chart-legend')?.className).toContain('justify-center')

		const [item] = allBySlot(container, 'chart-legend-item')

		expect(item?.tagName).toBe('BUTTON')

		expect(item).toHaveAttribute('aria-pressed', 'true')

		expect(item?.className).toContain('cursor-pointer')
	})

	it('roves legend focus with the arrow keys as one tab stop, clearing on Escape', async () => {
		const { container } = renderUI(chart())

		const items = allBySlot(container, 'chart-legend-item') as HTMLButtonElement[]

		// Single tab stop: exactly one item is arrow-reachable at rest.
		expect(items.filter((el) => el.tabIndex === 0)).toHaveLength(1)

		items[0]?.focus()

		fireEvent.keyDown(items[0] as Element, { key: 'ArrowRight' })

		expect(document.activeElement).toBe(items[1])

		fireEvent.keyDown(items[1] as Element, { key: 'Escape' })

		expect(document.activeElement).not.toBe(items[1])
	})

	it('carries a keyboard focus ring on legend entries', () => {
		const { container } = renderUI(chart())

		expect(bySlot(container, 'chart-legend-item')?.className).toContain('focus-visible:outline')
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

		// The tooltip readout follows the toggle.
		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, { clientX: 390 })

		expect(bySlot(container, 'chart-tooltip')?.textContent).not.toContain('Costs')

		fireEvent.click(costs)

		expect(allBySlot(container, 'chart-bar')).toHaveLength(6)
	})

	it('tracks the pointer precisely on the tooltip surface', () => {
		const { container } = renderUI(chart())

		const hit = bySlot(container, 'chart-hit') as Element

		fireEvent.pointerMove(hit, { clientX: 30, clientY: 40 })

		const tooltip = bySlot(container, 'chart-tooltip') as HTMLElement

		const first = tooltip.style.left

		expect(first).not.toBe('')

		// Same band, different pointer x: the tooltip follows the pointer, not the band.
		fireEvent.pointerMove(hit, { clientX: 40, clientY: 40 })

		expect((bySlot(container, 'chart-tooltip') as HTMLElement).style.left).not.toBe(first)
	})

	it('routes formatValue through ticks, tooltip, and the data table', () => {
		const { container } = renderUI(chart({ formatValue: (value) => `$${value}` }))

		const yAxis = bySlot(container, 'chart-axis-y')

		expect(yAxis?.textContent).toContain('$')

		fireEvent.pointerMove(bySlot(container, 'chart-hit') as Element, { clientX: 390 })

		expect(bySlot(container, 'chart-tooltip')?.textContent).toContain('$65')

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
})

describe('barMarks', () => {
	const band = bandScale({ count: 2, range: [0, 200] })

	const map = (value: number) => 100 - value

	it('rounds only the data end and squares the baseline', () => {
		const [row] = barMarks([[40, -20]], band, map, 100)

		const up = row?.[0]

		expect(up?.up).toBe(true)

		// Starts and ends on the baseline, arcs at the value end.
		expect(up?.d.startsWith('M ')).toBe(true)

		expect(up?.d).toContain('A 4 4 0 0 1')

		expect(up?.d.endsWith('Z')).toBe(true)

		const down = row?.[1]

		expect(down?.up).toBe(false)

		expect(down?.d).toContain('A 4 4 0 0 0')
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
