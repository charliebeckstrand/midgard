import { describe, expect, it } from 'vitest'
import { ComboChart } from '../../modules/chart/combo-chart'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

const DATA = [
	{ quarter: 'Q1', revenue: 40, margin: 12 },
	{ quarter: 'Q2', revenue: 80, margin: 18 },
	{ quarter: 'Q3', revenue: 65, margin: 15 },
]

const SERIES = [
	{ type: 'bar', xKey: 'quarter', yKey: 'revenue', yName: 'Revenue' },
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

		expect(allBySlot(container, 'chart-bar')).toHaveLength(3)

		expect(allBySlot(container, 'chart-line')).toHaveLength(1)

		const svg = bySlot(container, 'chart-plot')?.querySelector('svg') as SVGSVGElement

		const order = [...svg.querySelectorAll('[data-slot="chart-bar"], [data-slot="chart-line"]')]

		expect(order.at(0)?.getAttribute('data-slot')).toBe('chart-bar')

		expect(order.at(-1)?.getAttribute('data-slot')).toBe('chart-line')
	})

	it('mirrors each mark in its legend swatch', () => {
		const { container } = renderUI(chart())

		const items = allBySlot(container, 'chart-legend-item')

		expect(items).toHaveLength(2)

		// Bar series wear a rect swatch, line series a stroke-shaped one. The
		// swatch is the second span — the Button's hit-target sibling leads.
		expect(items[0]?.querySelector('span:nth-child(2)')?.className).toContain('size-2.5')

		expect(items[1]?.querySelector('span:nth-child(2)')?.className).toContain('w-3')
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

	it('still renders both mark kinds under animate', () => {
		const { container } = renderUI(chart({ animate: true }))

		expect(allBySlot(container, 'chart-bar')).toHaveLength(3)

		expect(allBySlot(container, 'chart-line')).toHaveLength(1)
	})

	it('marks line points by default and stands down on points={false}', () => {
		const marked = renderUI(chart())

		expect(allBySlot(marked.container, 'chart-point')).toHaveLength(3)

		const bare = renderUI(chart({ points: false }))

		expect(allBySlot(bare.container, 'chart-point')).toHaveLength(0)
	})
})
