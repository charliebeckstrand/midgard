import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { referenceLabelAnchor } from '../../modules/chart/chart-reference-lines'
import type { ChartReferenceLine } from '../../modules/chart/chart-schema'
import { LineChart } from '../../modules/chart/line-chart'
import { allBySlot, bySlot, renderUI } from '../helpers'

const DATA = [
	{ month: 'Jan', revenue: 40 },
	{ month: 'Feb', revenue: 80 },
	{ month: 'Mar', revenue: 65 },
]

const SERIES = [{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }] as const

function bar(reference?: ChartReferenceLine[], orientation?: 'vertical' | 'horizontal') {
	return renderUI(
		<BarChart
			aria-label="Revenue by month"
			data={DATA}
			series={[...SERIES]}
			width={400}
			orientation={orientation}
			reference={reference}
		/>,
	)
}

function ruleLine(container: HTMLElement): SVGLineElement | null {
	return bySlot(container, 'chart-reference-line')?.querySelector('line') ?? null
}

describe('reference lines', () => {
	it('draws one rule per reference line, and nothing without the prop', () => {
		const withRefs = bar([{ value: 50 }, { value: 70 }])

		expect(allBySlot(withRefs.container, 'chart-reference-line')).toHaveLength(2)

		const none = bar()

		// Self-gating: absent the prop the group never mounts.
		expect(bySlot(none.container, 'chart-reference-lines')).toBeNull()

		expect(allBySlot(none.container, 'chart-reference-line')).toHaveLength(0)
	})

	it('labels a rule at its end and leaves an unlabelled one bare', () => {
		const { container } = bar([{ value: 50, label: 'Target' }, { value: 20 }])

		const labels = allBySlot(container, 'chart-reference-label')

		expect(labels).toHaveLength(1)

		expect(labels[0]?.textContent).toBe('Target')
	})

	it('dashes the rule by default and draws it solid when dashed is false', () => {
		const dashed = bar([{ value: 50 }])

		expect(ruleLine(dashed.container)?.getAttribute('stroke-dasharray')).toBe('4 3')

		const solid = bar([{ value: 50, dashed: false }])

		expect(ruleLine(solid.container)?.getAttribute('stroke-dasharray')).toBeNull()
	})

	it('paints the rule with the named slot colour, neutral zinc by default', () => {
		const red = bar([{ value: 50, color: 'red' }])

		expect(ruleLine(red.container)?.getAttribute('class')).toContain('stroke-red-600')

		const neutral = bar([{ value: 50 }])

		expect(ruleLine(neutral.container)?.getAttribute('class')).toContain('stroke-zinc-600')
	})

	it('folds an off-data target into the domain so it stays on the frame', () => {
		// 200 sits far above the data max of 80; the fold grows the domain to meet
		// it rather than clamping the rule to the top edge.
		const { container } = bar([{ value: 200 }])

		expect(bySlot(container, 'chart-axis-y')?.textContent).toContain('200')

		const svg = container.querySelector('svg') as SVGSVGElement

		const height = Number((svg.getAttribute('viewBox') ?? '0 0 0 0').split(' ')[3])

		const y = Number(ruleLine(container)?.getAttribute('y1'))

		expect(y).toBeGreaterThanOrEqual(0)

		expect(y).toBeLessThanOrEqual(height)
	})

	it('transposes the rule to a vertical line under horizontal orientation', () => {
		const { container } = bar([{ value: 50 }], 'horizontal')

		const line = ruleLine(container)

		// A vertical rule down the value axis: one x, spanning y.
		expect(line?.getAttribute('x1')).toBe(line?.getAttribute('x2'))

		expect(Number(line?.getAttribute('y2'))).toBeGreaterThan(Number(line?.getAttribute('y1')))
	})

	it('threads through the line chart too', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={DATA}
				series={[...SERIES]}
				width={400}
				reference={[{ value: 60, label: 'Goal' }]}
			/>,
		)

		expect(allBySlot(container, 'chart-reference-line')).toHaveLength(1)

		expect(bySlot(container, 'chart-reference-label')?.textContent).toBe('Goal')
	})
})

describe('referenceLabelAnchor', () => {
	const plot = { x: 40, y: 8, width: 300, height: 200 }

	it('anchors a vertical chart label at the right end, above the rule', () => {
		const anchor = referenceLabelAnchor('vertical', plot, 100)

		expect(anchor.x).toBe(plot.x + plot.width - 4)

		expect(anchor.y).toBe(100 - 4)

		expect(anchor.textAnchor).toBe('end')

		expect(anchor.dominantBaseline).toBe('auto')
	})

	it('anchors a horizontal chart label at the top, beside the rule', () => {
		const anchor = referenceLabelAnchor('horizontal', plot, 150)

		expect(anchor.x).toBe(150 + 4)

		expect(anchor.y).toBe(plot.y + 4)

		expect(anchor.textAnchor).toBe('start')

		expect(anchor.dominantBaseline).toBe('hanging')
	})
})
