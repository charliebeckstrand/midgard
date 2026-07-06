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

function bar(
	reference?: ChartReferenceLine[],
	orientation?: 'vertical' | 'horizontal',
	animate?: boolean,
) {
	return renderUI(
		<BarChart
			aria-label="Revenue by month"
			data={DATA}
			series={[...SERIES]}
			width={400}
			orientation={orientation}
			reference={reference}
			animate={animate}
		/>,
	)
}

/** The visible rule is the first line in a reference group; the hover target is the second. */
function rule(container: HTMLElement): SVGLineElement | null {
	return bySlot(container, 'chart-reference-line')?.querySelector('line') ?? null
}

/**
 * The animated rule wraps its lines in a motion group; the mock surfaces its
 * value-axis enter offset as `data-initial-x` / `data-initial-y`. Absent under a
 * static chart, where the lines sit directly in the rule group.
 */
function riseWrapper(container: HTMLElement): SVGGElement | null {
	return bySlot(container, 'chart-reference-line')?.querySelector('g') ?? null
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

	it('reveals an above-baseline rule upward when animating vertically', () => {
		const { container } = bar([{ value: 50 }], 'vertical', true)

		// Value 50 sits above the zero baseline, so the rule seats at the baseline
		// and rises up to it — a positive enter offset.
		expect(Number(riseWrapper(container)?.getAttribute('data-initial-y'))).toBeGreaterThan(0)
	})

	it('reveals a below-baseline rule downward, the way its bar would point', () => {
		const { container } = bar([{ value: -20 }], 'vertical', true)

		// A value below zero points its bar down, so the rule drops from the
		// baseline to it — a negative enter offset — not up from the plot floor.
		expect(Number(riseWrapper(container)?.getAttribute('data-initial-y'))).toBeLessThan(0)
	})

	it('reveals an above-baseline rule rightward when animating horizontally', () => {
		const { container } = bar([{ value: 50 }], 'horizontal', true)

		// Value 50 sits right of the baseline, so the rule seats at the baseline and
		// slides right to it — a negative enter offset.
		expect(Number(riseWrapper(container)?.getAttribute('data-initial-x'))).toBeLessThan(0)
	})

	it('reveals a below-baseline rule leftward under horizontal orientation', () => {
		const { container } = bar([{ value: -20 }], 'horizontal', true)

		// A value below zero points its bar left, so the rule slides left from the
		// baseline — a positive enter offset.
		expect(Number(riseWrapper(container)?.getAttribute('data-initial-x'))).toBeGreaterThan(0)
	})

	it('leaves the rule static without animate, no motion wrapper', () => {
		const { container } = bar([{ value: 50 }])

		expect(riseWrapper(container)).toBeNull()
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

describe('reference lines in the legend', () => {
	it('names each reference line in the legend when it shows', () => {
		// One series defaults the legend off, so ask for it; the two rules then
		// follow the one series switch as identity chips.
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by month"
				data={DATA}
				series={[...SERIES]}
				width={400}
				legend
				reference={[
					{ value: 55, label: 'Target' },
					{ value: 70, label: 'Ceiling' },
				]}
			/>,
		)

		expect(allBySlot(container, 'chart-legend-reference').map((el) => el.textContent)).toEqual([
			'Target',
			'Ceiling',
		])
	})

	it('falls back to the value for an unlabelled reference', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by month"
				data={DATA}
				series={[...SERIES]}
				width={400}
				legend
				reference={[{ value: 55 }]}
			/>,
		)

		expect(bySlot(container, 'chart-legend-reference')?.textContent).toContain('55')
	})

	it('joins the default legend of a multi-series chart', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue and costs by month"
				data={[
					{ month: 'Jan', revenue: 40, costs: 20 },
					{ month: 'Feb', revenue: 80, costs: 31 },
				]}
				series={[
					{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
					{ xKey: 'month', yKey: 'costs', yName: 'Costs' },
				]}
				width={400}
				reference={[{ value: 55, label: 'Target' }]}
			/>,
		)

		// The legend shows by default for two series; the rule joins it beside them.
		expect(allBySlot(container, 'chart-legend-item')).toHaveLength(2)

		expect(bySlot(container, 'chart-legend-reference')?.textContent).toContain('Target')
	})

	it('stays out of the legend while it is hidden, keeping its list parity', () => {
		// One series keeps the legend off by default; the rule stays out of the
		// (absent) legend, and the reference list still carries it.
		const { container } = bar([{ value: 55, label: 'Target' }])

		expect(bySlot(container, 'chart-legend')).toBeNull()

		expect(allBySlot(container, 'chart-legend-reference')).toHaveLength(0)

		expect(bySlot(container, 'chart-reference-list')?.textContent).toContain('Target')
	})

	it('recedes the marks on hover, as an emphasis chip beside the switchboard', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by month"
				data={DATA}
				series={[...SERIES]}
				width={400}
				legend
				reference={[{ value: 55, label: 'Target' }]}
			/>,
		)

		// One series → one static switch; the rule is a separate chip that recedes
		// the marks like a switch's emphasis but carries no toggle — a rule has no
		// on/off — so it is a plain button with no `aria-pressed`.
		expect(allBySlot(container, 'chart-legend-item')).toHaveLength(1)

		const chip = bySlot(container, 'chart-legend-reference')

		expect(chip?.tagName).toBe('BUTTON')

		expect(chip?.getAttribute('aria-pressed')).toBeNull()

		const marks = () => bySlot(container, 'chart-marks')?.getAttribute('class') ?? ''

		expect(marks()).not.toContain('opacity-25')

		fireEvent.pointerEnter(chip as Element)

		// Pointing the chip recedes the marks to the rule, the same as pointing the rule.
		expect(marks()).toContain('opacity-25')

		fireEvent.pointerLeave(chip as Element)

		expect(marks()).not.toContain('opacity-25')
	})

	it('paints a slot chip through its class and a raw colour inline', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by month"
				data={DATA}
				series={[...SERIES]}
				width={400}
				legend
				reference={[
					{ value: 55, label: 'Target', color: 'green' },
					{ value: 70, label: 'Ceiling', color: '#e11d48' },
				]}
			/>,
		)

		const [slot, raw] = allBySlot(container, 'chart-legend-reference')

		const slotSwatch = slot?.querySelector('[data-slot="swatch"]')

		// A named slot rides its currentColor text class, with no inline colour.
		expect(slotSwatch?.getAttribute('class')).toContain('text-green-600')

		expect(slotSwatch?.getAttribute('style')).toBeNull()

		const rawSwatch = raw?.querySelector('[data-slot="swatch"]') as HTMLElement

		// A raw colour bypasses the slot classes and paints inline instead.
		expect(rawSwatch?.getAttribute('class') ?? '').not.toContain('text-')

		expect(rawSwatch?.style.color).toBeTruthy()
	})

	it('dashes the chip swatch to match the rule, solid only when the rule is', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Revenue by month"
				data={DATA}
				series={[...SERIES]}
				width={400}
				legend
				reference={[
					{ value: 55, label: 'Target' },
					{ value: 70, label: 'Ceiling', dashed: false },
				]}
			/>,
		)

		const [dashed, solid] = allBySlot(container, 'chart-legend-reference')

		// The dashed rule (the default) mirrors to a dashed line swatch; the solid
		// rule drops back to a solid one.
		expect(dashed?.querySelector('[data-slot="swatch"]')?.getAttribute('data-variant')).toBe(
			'dashed',
		)

		expect(solid?.querySelector('[data-slot="swatch"]')?.getAttribute('data-variant')).toBe('solid')
	})
})

describe('reference value labels', () => {
	// `labels` is a line / area prop, so the labelled rules ride the line chart;
	// `labels.references` turns each rule's hover tooltip into a standing label.
	function lineLabels(reference: ChartReferenceLine[]) {
		return renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={DATA}
				series={[...SERIES]}
				width={400}
				reference={reference}
				labels={{ references: true }}
			/>,
		)
	}

	it('draws a standing label per rule and lays no hover target', () => {
		const { container } = lineLabels([{ value: 60, label: 'Goal' }])

		const labels = allBySlot(container, 'chart-reference-label')

		expect(labels).toHaveLength(1)

		const label = labels[0]

		// The label reads the rule's own label, standing in for the value.
		expect(label?.textContent).toBe('Goal')

		// It sits at the rule's far (right) end, anchored inward, and clears the
		// dashes by riding just above the rule's value position.
		const ruleY = Number(rule(container)?.getAttribute('y1'))

		expect(label?.getAttribute('text-anchor')).toBe('end')

		expect(Number(label?.getAttribute('y'))).toBeLessThan(ruleY)

		// No transparent hit target — the standing label replaces the hover readout,
		// so the rule group carries only the one drawn line.
		expect(bySlot(container, 'chart-reference-line')?.querySelectorAll('line').length).toBe(1)
	})

	it('reads the value alone for an unlabelled rule', () => {
		const { container } = lineLabels([{ value: 50 }])

		expect(bySlot(container, 'chart-reference-label')?.textContent).toBe('50')
	})

	it('inks the label to match the rule — a slot through its fill class, a raw colour inline', () => {
		const { container } = lineLabels([
			{ value: 50, label: 'Floor', color: 'green' },
			{ value: 70, label: 'Ceiling', color: '#e11d48' },
		])

		const [slot, raw] = allBySlot(container, 'chart-reference-label')

		expect(slot?.getAttribute('class')).toContain('fill-green-600')

		// A raw colour bypasses the fill classes and paints inline instead.
		expect(raw?.getAttribute('class') ?? '').not.toContain('fill-')

		expect(raw?.style.fill).toBeTruthy()
	})

	it('keeps the visually-hidden reference parity alongside the drawn labels', () => {
		const { container } = lineLabels([{ value: 55, label: 'Target' }])

		const list = bySlot(container, 'chart-reference-list')

		expect(list?.className).toContain('sr-only')

		expect(list?.textContent).toContain('Target')

		expect(list?.textContent).toContain('55')
	})

	it('drops the rule from the keyboard roving, so it never recedes the marks', () => {
		const { container } = lineLabels([{ value: 60, label: 'Goal' }])

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		const marks = () => bySlot(container, 'chart-marks')?.getAttribute('class') ?? ''

		// The first arrow enters at the first point; the value-axis arrow then steps
		// the series' points. With the rule labelled it is no longer a stop, so the
		// marks stay lit and no rule takes focus.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(marks()).not.toContain('opacity-25')

		expect(bySlot(container, 'chart-reference-line')?.getAttribute('data-focused')).toBeNull()
	})
})
