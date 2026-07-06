import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { LineChart } from '../../modules/chart/line-chart'
import { allBySlot, bySlot, renderUI } from '../helpers'

const DATA = [
	{ month: 'Jan', revenue: 40, costs: 25 },
	{ month: 'Feb', revenue: 80, costs: 30 },
	{ month: 'Mar', revenue: 65, costs: 35 },
]

const HEX = '#e11d48'
const OKLCH = 'oklch(0.7 0.15 30)'

/** The first bar mark in the plot. */
function firstBar(container: HTMLElement): Element | null {
	return allBySlot(container, 'chart-bar')[0] ?? null
}

/** The first line segment in the plot. */
function firstLine(container: HTMLElement): Element | null {
	return allBySlot(container, 'chart-line')[0] ?? null
}

describe('series colour', () => {
	it('fills a bar through the slot class for a named colour and inline for a raw one', () => {
		const slot = renderUI(
			<BarChart
				aria-label="Revenue by month"
				data={DATA}
				series={[{ xKey: 'month', yKey: 'revenue', color: 'red' }]}
				width={400}
			/>,
		)

		const named = firstBar(slot.container)

		expect(named?.getAttribute('class')).toContain('fill-red-600')

		// The slot paints through its class, so no inline fill attribute is set.
		expect(named?.getAttribute('fill')).toBeNull()

		const hex = renderUI(
			<BarChart
				aria-label="Revenue by month"
				data={DATA}
				series={[{ xKey: 'month', yKey: 'revenue', color: HEX }]}
				width={400}
			/>,
		)

		const raw = firstBar(hex.container)

		// A raw colour fills inline and takes no slot fill class.
		expect(raw?.getAttribute('fill')).toBe(HEX)

		expect(raw?.getAttribute('class') ?? '').not.toContain('fill-')
	})

	it('strokes a line inline for a raw oklch colour and through the class for a slot', () => {
		const raw = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={DATA}
				series={[{ xKey: 'month', yKey: 'revenue', color: OKLCH }]}
				width={400}
			/>,
		)

		const line = firstLine(raw.container)

		expect(line?.getAttribute('stroke')).toBe(OKLCH)

		expect(line?.getAttribute('class') ?? '').not.toContain('stroke-')

		const slot = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={DATA}
				series={[{ xKey: 'month', yKey: 'revenue', color: 'blue' }]}
				width={400}
			/>,
		)

		const named = firstLine(slot.container)

		expect(named?.getAttribute('class')).toContain('stroke-blue-600')

		expect(named?.getAttribute('stroke')).toBeNull()
	})

	it('gives a raw-coloured series no texture tile, the same opt-out as a raw reference line', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by month"
				data={DATA}
				series={[{ xKey: 'month', yKey: 'revenue', color: HEX }]}
				width={400}
				texture
			/>,
		)

		// A raw colour opts out of the categorical palette, so it defines no tile.
		expect(container.querySelectorAll('[data-slot="chart-patterns"] pattern')).toHaveLength(0)

		const bar = firstBar(container)

		// And with no tile the bar fills flat with its raw colour, not a `var(--chart-fill)` tile.
		expect(bar?.getAttribute('fill')).toBe(HEX)

		expect(bar?.getAttribute('class') ?? '').not.toContain('[fill:var(--chart-fill)]')
	})

	it('inks the legend swatch inline for a raw series and through the class for a slot', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue and costs by month"
				data={DATA}
				series={[
					{ xKey: 'month', yKey: 'revenue', yName: 'Revenue', color: HEX },
					{ xKey: 'month', yKey: 'costs', yName: 'Costs', color: 'blue' },
				]}
				width={400}
			/>,
		)

		const swatches = bySlot(container, 'chart-legend')?.querySelectorAll('[data-slot="swatch"]')

		const raw = swatches?.[0] as HTMLElement

		const slot = swatches?.[1] as HTMLElement

		// The raw swatch carries an inline currentColor and no slot text class.
		expect(raw?.getAttribute('style')).toContain('color')

		expect(raw?.getAttribute('class') ?? '').not.toContain('text-blue-600')

		// The slot swatch is the other way round.
		expect(slot?.getAttribute('class')).toContain('text-blue-600')

		expect(slot?.getAttribute('style')).toBeNull()
	})

	it('inks a raw series value label inline', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={DATA}
				series={[{ xKey: 'month', yKey: 'revenue', color: HEX }]}
				width={400}
				labels={{ extremes: true }}
			/>,
		)

		const label = allBySlot(container, 'chart-value-label')[0]

		expect(label?.getAttribute('fill')).toBe(HEX)

		expect(label?.getAttribute('class') ?? '').not.toContain('fill-')
	})
})
