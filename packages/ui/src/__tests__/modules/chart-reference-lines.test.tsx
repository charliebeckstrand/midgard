import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import type { ChartReferenceLine } from '../../modules/chart/chart-schema'
import { LineChart } from '../../modules/chart/line-chart'
import { allBySlot, bySlot, renderUI, userEvent, waitFor } from '../helpers'

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

/** The visible rule is the first line in a reference group; the hover target is the second. */
function rule(container: HTMLElement): SVGLineElement | null {
	return bySlot(container, 'chart-reference-line')?.querySelector('line') ?? null
}

function hitTarget(container: HTMLElement): SVGLineElement | null {
	return (
		(bySlot(container, 'chart-reference-line')?.querySelectorAll('line')[1] as SVGLineElement) ??
		null
	)
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

	it('lays a wide transparent hover target over the 1px rule', () => {
		const { container } = bar([{ value: 50 }])

		expect(rule(container)?.getAttribute('stroke-width')).toBe('1')

		const hit = hitTarget(container)

		expect(hit?.getAttribute('stroke')).toBe('transparent')

		expect(Number(hit?.getAttribute('stroke-width'))).toBeGreaterThan(1)
	})

	it('dashes the rule by default and draws it solid when dashed is false', () => {
		const dashed = bar([{ value: 50 }])

		expect(rule(dashed.container)?.getAttribute('stroke-dasharray')).toBe('4 3')

		const solid = bar([{ value: 50, dashed: false }])

		expect(rule(solid.container)?.getAttribute('stroke-dasharray')).toBeNull()
	})

	it('paints a named slot through its class and a raw colour inline', () => {
		const slot = bar([{ value: 50, color: 'red' }])

		expect(rule(slot.container)?.getAttribute('class')).toContain('stroke-red-600')

		const neutral = bar([{ value: 50 }])

		// Defaults to the neutral de-emphasis slot.
		expect(rule(neutral.container)?.getAttribute('class')).toContain('stroke-zinc-600')

		const hex = bar([{ value: 50, color: '#e11d48' }])

		const hexRule = rule(hex.container)

		expect(hexRule).not.toBeNull()

		// A raw colour bypasses the slot classes entirely — no stroke-* class — and
		// strokes inline instead, so the class path is never taken.
		expect(hexRule?.getAttribute('class') ?? '').not.toContain('stroke-')
	})

	it('carries the label and value in a visually-hidden list for parity', () => {
		const { container } = bar([{ value: 55, label: 'Target' }, { value: 30 }])

		const list = bySlot(container, 'chart-reference-list')

		expect(list?.className).toContain('sr-only')

		expect(list?.textContent).toContain('Target')

		expect(list?.textContent).toContain('55')

		// The unlabelled line still lists its value.
		expect(list?.textContent).toContain('30')
	})

	it('folds an off-data target into the domain so it stays on the frame', () => {
		// 200 sits far above the data max of 80; the fold grows the domain to meet
		// it rather than clamping the rule to the top edge.
		const { container } = bar([{ value: 200 }])

		expect(bySlot(container, 'chart-axis-y')?.textContent).toContain('200')

		const svg = container.querySelector('svg') as SVGSVGElement

		const height = Number((svg.getAttribute('viewBox') ?? '0 0 0 0').split(' ')[3])

		const y = Number(rule(container)?.getAttribute('y1'))

		expect(y).toBeGreaterThanOrEqual(0)

		expect(y).toBeLessThanOrEqual(height)
	})

	it('transposes the rule to a vertical line under horizontal orientation', () => {
		const { container } = bar([{ value: 50 }], 'horizontal')

		const line = rule(container)

		// A vertical rule down the value axis: one x, spanning y.
		expect(line?.getAttribute('x1')).toBe(line?.getAttribute('x2'))

		expect(Number(line?.getAttribute('y2'))).toBeGreaterThan(Number(line?.getAttribute('y1')))
	})

	it('floats a tooltip with the value and label when a rule is hovered', async () => {
		// No hover-capable pointer in jsdom, so the tooltip opens on click; the
		// design-system Tooltip drives hover on pointer devices. Either way this
		// proves the rule's trigger is wired to its content.
		const user = userEvent.setup()

		const { container } = bar([{ value: 55, label: 'Target' }])

		await user.click(bySlot(container, 'chart-reference-line') as Element)

		// The swatch renders only inside the floating tooltip, so its arrival proves
		// the rule opened one.
		await waitFor(() =>
			expect(document.querySelector('[data-slot="chart-reference-swatch"]')).not.toBeNull(),
		)

		const content = document
			.querySelector('[data-slot="chart-reference-swatch"]')
			?.closest('[data-slot="tooltip-content"]')

		expect(content?.textContent).toContain('55')

		expect(content?.textContent).toContain('Target')
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

		expect(bySlot(container, 'chart-reference-list')?.textContent).toContain('Goal')
	})
})
