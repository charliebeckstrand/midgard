import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import type { ChartReferenceLine } from '../../modules/chart/chart-schema'
import { LineChart } from '../../modules/chart/line-chart'
import { allBySlot, bySlot, fireEvent, renderUI, userEvent, waitFor } from '../helpers'

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

	it('lays a wide transparent hover target over the rule', () => {
		const { container } = bar([{ value: 50 }])

		const ruleWidth = Number(rule(container)?.getAttribute('stroke-width'))

		const hit = hitTarget(container)

		expect(hit?.getAttribute('stroke')).toBe('transparent')

		// The hover target is far wider than the drawn rule.
		expect(Number(hit?.getAttribute('stroke-width'))).toBeGreaterThan(ruleWidth * 2)
	})

	it('dashes the rule by default and draws it solid when dashed is false', () => {
		const dashed = bar([{ value: 50 }])

		expect(rule(dashed.container)?.getAttribute('stroke-dasharray')).toBe('6 4')

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

	it('recedes the marks while a rule is hovered, like a legend emphasis', () => {
		const { container } = bar([{ value: 50 }])

		const marks = () => bySlot(container, 'chart-marks')?.getAttribute('class') ?? ''

		expect(marks()).not.toContain('opacity-25')

		const rule = bySlot(container, 'chart-reference-line') as Element

		fireEvent.pointerEnter(rule)

		// The marks dim to the rule while it is pointed.
		expect(marks()).toContain('opacity-25')

		fireEvent.pointerLeave(rule)

		expect(marks()).not.toContain('opacity-25')
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

describe('reference line keyboard navigation', () => {
	const marksClass = (container: HTMLElement) =>
		bySlot(container, 'chart-marks')?.getAttribute('class') ?? ''

	// The rule's floating readout, found by its swatch — the swatch renders only
	// inside the tooltip, so its presence proves the rule opened one. Queried off
	// the document since the surface portals out of the plot.
	const referenceTooltip = () =>
		document
			.querySelector('[data-slot="chart-reference-swatch"]')
			?.closest('[data-slot="tooltip-content"]') ?? null

	it('roves onto the rule, receding the marks and floating its tooltip', async () => {
		const { container } = bar([{ value: 60, label: 'Goal' }])

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		// The first arrow enters at the first bar; the marks stay lit and no rule
		// tooltip floats yet.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(marksClass(container)).not.toContain('opacity-25')

		expect(referenceTooltip()).toBeNull()

		// The value-axis arrow steps onto the rule: the marks recede and the rule
		// floats the same value-and-label readout pointing it would — focusing reads
		// exactly like hovering.
		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(marksClass(container)).toContain('opacity-25')

		expect(bySlot(container, 'chart-reference-line')?.getAttribute('data-focused')).toBe('true')

		await waitFor(() => expect(referenceTooltip()).not.toBeNull())

		expect(referenceTooltip()?.textContent).toContain('60')

		expect(referenceTooltip()?.textContent).toContain('Goal')
	})

	it('restores the marks stepping back off the rule', async () => {
		const { container } = bar([{ value: 60 }])

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		await waitFor(() => expect(referenceTooltip()).not.toBeNull())

		expect(marksClass(container)).toContain('opacity-25')

		// One more step leaves the rule for the next series point: the marks light back
		// up and the rule surrenders its focus, closing the tooltip with it.
		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(marksClass(container)).not.toContain('opacity-25')

		expect(bySlot(container, 'chart-reference-line')?.getAttribute('data-focused')).toBeNull()
	})

	it('releases the emphasis on Escape', async () => {
		const { container } = bar([{ value: 60 }])

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		await waitFor(() => expect(referenceTooltip()).not.toBeNull())

		expect(marksClass(container)).toContain('opacity-25')

		fireEvent.keyDown(plot, { key: 'Escape' })

		expect(marksClass(container)).not.toContain('opacity-25')

		expect(bySlot(container, 'chart-reference-line')?.getAttribute('data-focused')).toBeNull()
	})

	it('transposes the roving with orientation — the value axis reaches the rule', async () => {
		const { container } = bar([{ value: 60 }], 'horizontal')

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		// Down the band axis walks categories under horizontal orientation and never
		// touches the rule.
		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(marksClass(container)).not.toContain('opacity-25')

		expect(referenceTooltip()).toBeNull()

		// The horizontal value-axis arrow roves onto the rule: marks recede, tooltip
		// floats.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(marksClass(container)).toContain('opacity-25')

		await waitFor(() => expect(referenceTooltip()).not.toBeNull())
	})
})
