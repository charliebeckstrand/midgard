import { describe, expect, it, vi } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import { LABEL_GAP } from '../../modules/chart/engine/chart-constants'
import type { PlacedReferenceLabel } from '../../modules/chart/engine/chart-geometry/label'
import type { ChartReferenceLine } from '../../modules/chart/engine/chart-reference'
import { ruleBreaks } from '../../modules/chart/engine/chart-reference-lines'
import { LineChart } from '../../modules/chart/line-chart'
import {
	allBySlot,
	bySlot,
	fireEvent,
	getSlot,
	present,
	renderUI,
	setupUser,
	waitFor,
} from '../helpers'

const DATA = [
	{ month: 'Jan', revenue: 40 },
	{ month: 'Feb', revenue: 80 },
	{ month: 'Mar', revenue: 65 },
]

const SERIES = [{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }] as const

/** The options of a test BarChart. A case gives only the props that it changes. */
type BarOptions = Partial<Parameters<typeof BarChart<(typeof DATA)[number]>>[0]>

/** A BarChart of the revenue series over `DATA`, 400 px wide. */
function barChart(options: BarOptions = {}) {
	return (
		<BarChart
			aria-label="Revenue by month"
			data={DATA}
			series={[...SERIES]}
			width={400}
			{...options}
		/>
	)
}

/** Renders the BarChart of `barChart`. */
function bar(options: BarOptions = {}) {
	return renderUI(barChart(options))
}

/** The visible rule is the first line in a reference group; the hover target is the second. */
function rule(container: HTMLElement): SVGLineElement | null {
	return bySlot(container, 'chart-reference-line')?.querySelector('line') ?? null
}

/** The lengths of the `stroke-dasharray` of a rule, drawn and empty in turn. */
function readDashes(line: SVGLineElement | null): number[] {
	return (line?.getAttribute('stroke-dasharray') ?? '').split(' ').filter(Boolean).map(Number)
}

/**
 * The breaks of a rule: each empty span of its dash pattern that is wider than
 * a dash gap, as `[from, to]` from the start of the rule.
 */
function findBreaks(line: SVGLineElement | null): [number, number][] {
	const [x1, y1, x2, y2] = ['x1', 'y1', 'x2', 'y2'].map((name) => Number(line?.getAttribute(name)))

	const length = Math.hypot((x2 ?? 0) - (x1 ?? 0), (y2 ?? 0) - (y1 ?? 0))

	const breaks: [number, number][] = []

	let at = 0

	readDashes(line).forEach((span, index) => {
		// The empty length past the end of the rule only stops the pattern repeating.
		if (index % 2 === 1 && span > 5 && at < length) breaks.push([at, Math.min(at + span, length)])

		at += span
	})

	return breaks
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
		const withRefs = bar({ reference: [{ value: 50 }, { value: 70 }] })

		expect(allBySlot(withRefs.container, 'chart-reference-line')).toHaveLength(2)

		const none = bar()

		// Self-gating: absent the prop the group never mounts.
		expect(bySlot(none.container, 'chart-reference-lines')).toBeNull()

		expect(allBySlot(none.container, 'chart-reference-line')).toHaveLength(0)
	})

	it('lays a wide transparent hover target over the rule', () => {
		const { container } = bar({ reference: [{ value: 50 }] })

		const ruleWidth = Number(rule(container)?.getAttribute('stroke-width'))

		const hit = hitTarget(container)

		expect(hit?.getAttribute('stroke')).toBe('transparent')

		// The hover target is far wider than the drawn rule.
		expect(Number(hit?.getAttribute('stroke-width'))).toBeGreaterThan(ruleWidth * 2)
	})

	it('dashes the rule by default and draws it solid when dashed is false', () => {
		const dashed = bar({ reference: [{ value: 50 }] })

		// The dashes fit the rule, so it starts and ends on a full dash.
		const [dash = 0, gap = 0] = readDashes(rule(dashed.container))

		expect(dash).toBeCloseTo(6, 0)

		expect(gap).toBeCloseTo(4, 0)

		const solid = bar({ reference: [{ value: 50, dashed: false }] })

		expect(rule(solid.container)?.getAttribute('stroke-dasharray')).toBeNull()
	})

	it('paints a named slot through its class and a raw color inline', () => {
		const slot = bar({ reference: [{ value: 50, color: 'red' }] })

		expect(rule(slot.container)?.getAttribute('class')).toContain('stroke-red-600')

		const neutral = bar({ reference: [{ value: 50 }] })

		// Defaults to the neutral de-emphasis slot.
		expect(rule(neutral.container)?.getAttribute('class')).toContain('stroke-zinc-600')

		const hex = bar({ reference: [{ value: 50, color: '#e11d48' }] })

		const hexRule = rule(hex.container)

		expect(hexRule).not.toBeNull()

		// A raw color bypasses the slot classes entirely (no stroke-* class) and
		// strokes inline instead, so the class path is never taken.
		expect(hexRule?.getAttribute('class') ?? '').not.toContain('stroke-')
	})

	it('carries the label and value in a visually-hidden list for parity', () => {
		const { container } = bar({ reference: [{ value: 55, label: 'Target' }, { value: 30 }] })

		const list = bySlot(container, 'chart-reference-list')

		expect(list?.className).toContain('sr-only')

		expect(list?.textContent).toContain('Target')

		expect(list?.textContent).toContain('55')

		// The unlabeled line still lists its value.
		expect(list?.textContent).toContain('30')
	})

	it('folds an off-data target into the domain so it stays on the frame', () => {
		// 200 sits far above the data max of 80; the fold grows the domain to meet
		// it rather than clamping the rule to the top edge.
		const { container } = bar({ reference: [{ value: 200 }] })

		expect(bySlot(container, 'chart-axis-y')?.textContent).toContain('200')

		const svg = present<SVGSVGElement>(container.querySelector('svg'), 'svg')

		const height = Number((svg.getAttribute('viewBox') ?? '0 0 0 0').split(' ')[3])

		const y = Number(rule(container)?.getAttribute('y1'))

		expect(y).toBeGreaterThanOrEqual(0)

		expect(y).toBeLessThanOrEqual(height)
	})

	it('draws no rule outside a pinned domain, and keeps it in the list', () => {
		// A pin holds the domain at 100, so the fold cannot reach 150. The rule
		// drew on the clamped top edge, where it read as 100.
		const { container } = bar({
			axes: { y: { max: 100 } },
			reference: [
				{ value: 150, label: 'Stretch' },
				{ value: 55, label: 'Target' },
			],
		})

		const rules = allBySlot(container, 'chart-reference-line')

		expect(rules).toHaveLength(1)

		expect(bySlot(container, 'chart-reference-list')?.textContent).toContain('Stretch')
	})

	it('transposes the rule to a vertical line under horizontal orientation', () => {
		const { container } = bar({ reference: [{ value: 50 }], orientation: 'horizontal' })

		const line = rule(container)

		// A vertical rule down the value axis: one x, spanning y.
		expect(line?.getAttribute('x1')).toBe(line?.getAttribute('x2'))

		expect(Number(line?.getAttribute('y2'))).toBeGreaterThan(Number(line?.getAttribute('y1')))
	})

	it('floats a tooltip with the value and label when a rule is hovered', async () => {
		// The floating-ui mock has no hover, so focus opens the tooltip here. The
		// design-system Tooltip drives hover in a browser. Either way this proves
		// the rule's trigger is wired to its content.
		const { container } = bar({ reference: [{ value: 55, label: 'Target' }] })

		fireEvent.focus(bySlot(container, 'chart-reference-line') as Element)

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

	it('shows the description of a rule in its tooltip', async () => {
		const { container } = bar({
			reference: [{ value: 55, label: 'Target', description: 'Q3 target' }],
		})

		fireEvent.focus(bySlot(container, 'chart-reference-line') as Element)

		const swatch = await waitFor(() =>
			present(document.querySelector('[data-slot="chart-reference-swatch"]'), 'swatch'),
		)

		expect(swatch.closest('[data-slot="tooltip-content"]')?.textContent).toContain('Q3 target')
	})

	it('wraps a long description inside the width cap of the tooltip', async () => {
		const description = 'PDFs the classifier is unsure of are held for a person to check'

		const { container } = bar({ reference: [{ value: 55, label: 'Target', description }] })

		fireEvent.focus(bySlot(container, 'chart-reference-line') as Element)

		const swatch = await waitFor(() =>
			present(document.querySelector('[data-slot="chart-reference-swatch"]'), 'swatch'),
		)

		// The readout is the wrapping row of the category readout, so no box in
		// the tooltip holds the text on one line.
		const content = present(swatch.closest('[data-slot="tooltip-content"]'), 'tooltip content')

		expect(content.querySelector('.whitespace-nowrap')).toBeNull()

		expect(swatch.parentElement?.parentElement).toHaveClass('items-start')
	})

	// The legend chip of the rule is a line Swatch, which keeps a paint under
	// forced colors. The swatch of the readout is the same key.
	it('keys the readout with a dashed line Swatch, as the legend chip does', async () => {
		const { container } = bar({ reference: [{ value: 55, label: 'Target' }] })

		fireEvent.focus(bySlot(container, 'chart-reference-line') as Element)

		const swatch = await waitFor(() =>
			present(document.querySelector('[data-slot="chart-reference-swatch"]'), 'swatch'),
		)

		expect(swatch).toHaveAttribute('data-shape', 'line')

		expect(swatch).toHaveAttribute('data-variant', 'dashed')
	})

	it('recedes the marks while a rule is hovered, like a legend emphasis', () => {
		const { container } = bar({ reference: [{ value: 50 }] })

		const marks = () => bySlot(container, 'chart-marks')?.getAttribute('class') ?? ''

		expect(marks()).not.toContain('opacity-25')

		const rule = bySlot(container, 'chart-reference-line') as Element

		fireEvent.pointerEnter(rule)

		// The marks dim to the rule while it is pointed.
		expect(marks()).toContain('opacity-25')

		fireEvent.pointerLeave(rule)

		expect(marks()).not.toContain('opacity-25')
	})

	it('recedes nothing under a touch, as the marks do', () => {
		const { container } = bar({
			reference: [
				{ value: 50, label: 'Floor' },
				{ value: 70, label: 'Ceiling' },
			],
		})

		const [floor] = allBySlot(container, 'chart-reference-line')

		// A tap or a hold: the touch `pointerenter` is not a point.
		fireEvent.pointerEnter(floor as Element, { pointerType: 'touch' })

		expect(container.querySelector('svg [class*="opacity-25"]')).toBeNull()

		fireEvent.pointerLeave(floor as Element, { pointerType: 'touch' })

		expect(container.querySelector('svg [class*="opacity-25"]')).toBeNull()
	})

	it('recedes the sibling rules while one is hovered', () => {
		const { container } = bar({
			reference: [
				{ value: 50, label: 'Floor' },
				{ value: 70, label: 'Ceiling' },
			],
		})

		const rules = () => allBySlot(container, 'chart-reference-line')

		const readClass = (el: Element | undefined) => el?.getAttribute('class') ?? ''

		const [floor, ceiling] = rules()

		expect(readClass(floor)).not.toContain('opacity-25')

		expect(readClass(ceiling)).not.toContain('opacity-25')

		fireEvent.pointerEnter(floor as Element)

		// The pointed rule stays lit; its sibling recedes to it.
		expect(readClass(rules()[0])).not.toContain('opacity-25')

		expect(readClass(rules()[1])).toContain('opacity-25')

		fireEvent.pointerLeave(floor as Element)

		expect(readClass(rules()[1])).not.toContain('opacity-25')
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

	// An animated rule enters from the baseline, the way its bar would point. The
	// mock surfaces the enter offset on the value axis: y is down the screen, so a
	// rise is positive; x is across it, so a rightward slide is negative.
	it.each([
		['an above-baseline', 50, 'vertical', 'y', 1],
		['a below-baseline', -20, 'vertical', 'y', -1],
		['an above-baseline', 50, 'horizontal', 'x', -1],
		['a below-baseline', -20, 'horizontal', 'x', 1],
	] as const)(
		'reveals %s rule from the baseline under %s orientation',
		(_, value, orientation, axis, sign) => {
			const { container } = bar({ reference: [{ value }], orientation, animate: true })

			const offset = Number(riseWrapper(container)?.getAttribute(`data-initial-${axis}`))

			expect(Math.sign(offset)).toBe(sign)
		},
	)

	it('draws two lines at one value on two axes, with no duplicate React key', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const { container } = renderUI(
			<LineChart
				aria-label="Dual"
				data={[
					{ w: 'W1', a: 10, b: 20 },
					{ w: 'W2', a: 30, b: 40 },
				]}
				width={480}
				series={[
					{ xKey: 'w', yKey: 'a', yName: 'A' },
					{ xKey: 'w', yKey: 'b', yName: 'B', axis: 'y2' },
				]}
				reference={[{ value: 25 }, { value: 25, axis: 'y2' }]}
			/>,
		)

		expect(allBySlot(container, 'chart-reference-line')).toHaveLength(2)

		const duplicate = error.mock.calls.some((call) =>
			String(call[0]).includes('Encountered two children with the same key'),
		)

		expect(duplicate).toBe(false)
	})

	it('leaves the rule static without animate, no motion wrapper', () => {
		const { container } = bar({ reference: [{ value: 50 }] })

		expect(riseWrapper(container)).toBeNull()
	})
})

describe('reference line keyboard navigation', () => {
	const marksClass = (container: HTMLElement) =>
		bySlot(container, 'chart-marks')?.getAttribute('class') ?? ''

	// The rule's floating readout, found by its swatch: the swatch renders only
	// inside the tooltip, so its presence proves the rule opened one. Queried off
	// the document since the surface portals out of the plot.
	const referenceTooltip = () =>
		document
			.querySelector('[data-slot="chart-reference-swatch"]')
			?.closest('[data-slot="tooltip-content"]') ?? null

	it('roves onto the rule, receding the marks and floating its tooltip', async () => {
		const { container } = bar({ reference: [{ value: 60, label: 'Goal' }] })

		const plot = getSlot(container, 'chart-plot')

		// The first arrow enters at the first bar; the marks stay lit and no rule
		// tooltip floats yet.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(marksClass(container)).not.toContain('opacity-25')

		expect(referenceTooltip()).toBeNull()

		// The value-axis arrow steps onto the rule: the marks recede and the rule
		// floats the same value-and-label readout pointing it would; focusing reads
		// exactly like hovering.
		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(marksClass(container)).toContain('opacity-25')

		expect(bySlot(container, 'chart-reference-line')?.getAttribute('data-focused')).toBe('')

		await waitFor(() => expect(referenceTooltip()).not.toBeNull())

		expect(referenceTooltip()?.textContent).toContain('60')

		expect(referenceTooltip()?.textContent).toContain('Goal')
	})

	it('keeps the hover target of a value rule whose label is cut at a category rule', () => {
		// A category rule at Feb crosses the rule near its middle, and the label is
		// too wide for either side of it.
		const { container } = bar({
			reference: [
				{ value: 60, label: 'Hold every invoice for a second review' },
				{ category: 'Feb' },
			],
			labels: { references: true },
		})

		const label = bySlot(container, 'chart-reference-label')

		expect(label).toHaveAttribute('data-cut')

		expect(label?.textContent).toMatch(/…$/)

		// The value rule keeps its wide hover target, which reads the whole label.
		const [valueRule] = allBySlot(container, 'chart-reference-line')

		expect(valueRule?.querySelectorAll('line').length).toBe(2)
	})

	it('keeps the stop and the tooltip of a labeled rule whose value reads on hover', async () => {
		const { container } = bar({
			reference: [{ value: 60, label: 'Goal', valueDisplay: 'hover' }],
			labels: { references: true },
		})

		// The label stands on the rule with no value after it.
		const label = bySlot(container, 'chart-reference-label')

		expect(label?.textContent).toBe('Goal')

		expect(label?.querySelector('tspan')).toBeNull()

		// The rule keeps its wide hover target.
		expect(bySlot(container, 'chart-reference-line')?.querySelectorAll('line').length).toBe(2)

		const plot = getSlot(container, 'chart-plot')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(bySlot(container, 'chart-reference-line')?.getAttribute('data-focused')).toBe('')

		await waitFor(() => expect(referenceTooltip()).not.toBeNull())

		expect(referenceTooltip()?.textContent).toContain('60')

		expect(referenceTooltip()?.textContent).toContain('Goal')
	})

	it('restores the marks stepping back off the rule', async () => {
		const { container } = bar({ reference: [{ value: 60 }] })

		const plot = getSlot(container, 'chart-plot')

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
		const { container } = bar({ reference: [{ value: 60 }] })

		const plot = getSlot(container, 'chart-plot')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		await waitFor(() => expect(referenceTooltip()).not.toBeNull())

		expect(marksClass(container)).toContain('opacity-25')

		fireEvent.keyDown(plot, { key: 'Escape' })

		expect(marksClass(container)).not.toContain('opacity-25')

		expect(bySlot(container, 'chart-reference-line')?.getAttribute('data-focused')).toBeNull()
	})

	it('releases the emphasis when the rule it parks on goes away', () => {
		const chart = (reference?: ChartReferenceLine[]) => barChart({ reference })

		const { container, rerender } = renderUI(chart([{ value: 60 }]))

		const plot = getSlot(container, 'chart-plot')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(marksClass(container)).toContain('opacity-25')

		// The rule goes, so the cursor falls back to its bar. The marks light up
		// again, and the readout returns to the bar.
		rerender(chart())

		expect(marksClass(container)).not.toContain('opacity-25')

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Jan')

		// The next step walks on from the bar, not from the rule that went.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		expect(bySlot(container, 'tooltip-content')?.textContent).toContain('Feb')
	})

	it('transposes the roving with orientation — the value axis reaches the rule', async () => {
		const { container } = bar({ reference: [{ value: 60 }], orientation: 'horizontal' })

		const plot = getSlot(container, 'chart-plot')

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
		const { container } = bar({
			legend: true,
			reference: [
				{ value: 55, label: 'Target' },
				{ value: 70, label: 'Ceiling' },
			],
		})

		expect(allBySlot(container, 'chart-legend-reference').map((el) => el.textContent)).toEqual([
			'Target',
			'Ceiling',
		])
	})

	it('falls back to the value for an unlabeled reference', () => {
		const { container } = bar({ legend: true, reference: [{ value: 55 }] })

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
		const { container } = bar({ reference: [{ value: 55, label: 'Target' }] })

		expect(bySlot(container, 'chart-legend')).toBeNull()

		expect(allBySlot(container, 'chart-legend-reference')).toHaveLength(0)

		expect(bySlot(container, 'chart-reference-list')?.textContent).toContain('Target')
	})

	it('recedes the marks on hover, as a switch beside the switchboard', () => {
		const { container } = bar({ legend: true, reference: [{ value: 55, label: 'Target' }] })

		// One series → one switch; the rule is a separate switch that recedes the
		// marks like a series entry's emphasis and carries its own toggle: pressed
		// while the rule is shown.
		expect(allBySlot(container, 'chart-legend-item')).toHaveLength(1)

		const chip = bySlot(container, 'chart-legend-reference')

		expect(chip?.tagName).toBe('BUTTON')

		expect(chip?.getAttribute('aria-pressed')).toBe('true')

		const marks = () => bySlot(container, 'chart-marks')?.getAttribute('class') ?? ''

		expect(marks()).not.toContain('opacity-25')

		fireEvent.pointerEnter(chip as Element)

		// Pointing the chip recedes the marks to the rule, the same as pointing the rule.
		expect(marks()).toContain('opacity-25')

		fireEvent.pointerLeave(chip as Element)

		expect(marks()).not.toContain('opacity-25')
	})

	it('toggles its rule off when the chip is clicked, and back on again', async () => {
		const user = setupUser()

		const { container } = bar({ legend: true, reference: [{ value: 55, label: 'Target' }] })

		const chip = () => getSlot(container, 'chart-legend-reference')

		// The rule draws and the chip reads pressed while it is shown.
		expect(allBySlot(container, 'chart-reference-line')).toHaveLength(1)

		expect(chip().getAttribute('aria-pressed')).toBe('true')

		await user.click(chip())

		// Clicking pulls the rule from the plot and un-presses the chip, striking
		// its label the way a hidden series entry is struck.
		expect(allBySlot(container, 'chart-reference-line')).toHaveLength(0)

		expect(chip().getAttribute('aria-pressed')).toBe('false')

		// The struck label is the off treatment a hidden series entry takes.
		expect(chip().querySelector('.line-through')?.textContent).toBe('Target')

		await user.click(chip())

		// Clicking again brings the rule back.
		expect(allBySlot(container, 'chart-reference-line')).toHaveLength(1)

		expect(chip().getAttribute('aria-pressed')).toBe('true')
	})

	it('keeps a toggled-off rule off when an earlier rule leaves the prop', async () => {
		const user = setupUser()

		const floor = { value: 30, label: 'Floor' }

		const target = { value: 50, label: 'Target' }

		const ceiling = { value: 70, label: 'Ceiling' }

		const chart = (reference: ChartReferenceLine[]) => barChart({ legend: true, reference })

		const { container, rerender } = renderUI(chart([floor, target, ceiling]))

		const pressed = () =>
			allBySlot(container, 'chart-legend-reference').map(
				(chip) => `${chip.textContent}:${chip.getAttribute('aria-pressed')}`,
			)

		await user.click(allBySlot(container, 'chart-legend-reference')[1] as Element)

		expect(pressed()).toEqual(['Floor:true', 'Target:false', 'Ceiling:true'])

		// The rule before the hidden one leaves. The hide stays with its rule, and
		// the rule after it keeps its own state.
		rerender(chart([target, ceiling]))

		expect(pressed()).toEqual(['Target:false', 'Ceiling:true'])

		expect(allBySlot(container, 'chart-reference-line')).toHaveLength(1)

		expect(bySlot(container, 'chart-reference-list')?.textContent).toBe('Ceiling: 70')
	})

	it('recedes nothing from the chip of a rule outside a pinned domain', () => {
		// The rule draws nothing, so pointing its chip receded every mark to a rule
		// that was not on the plot.
		const { container } = bar({
			legend: true,
			axes: { y: { max: 100 } },
			reference: [
				{ value: 150, label: 'Stretch' },
				{ value: 55, label: 'Target' },
			],
		})

		const [stretch, target] = allBySlot(container, 'chart-legend-reference')

		fireEvent.pointerEnter(stretch as Element)

		expect(getSlot(container, 'chart-marks').getAttribute('class')).not.toContain('opacity-25')

		fireEvent.pointerLeave(stretch as Element)

		// The chip of a drawn rule still recedes the marks to it.
		fireEvent.pointerEnter(target as Element)

		expect(getSlot(container, 'chart-marks').getAttribute('class')).toContain('opacity-25')
	})

	it('keeps a toggled-off labeled rule off when its value changes', async () => {
		// A rule such as an average takes a new value with each data refresh. The
		// hide keyed on the value too, so a refresh brought the rule back.
		const user = setupUser()

		const chart = (average: number) =>
			barChart({
				legend: true,
				reference: [
					{ value: average, label: 'Average' },
					{ value: 70, label: 'Ceiling' },
				],
			})

		const { container, rerender } = renderUI(chart(41.2))

		const pressed = () =>
			allBySlot(container, 'chart-legend-reference').map(
				(chip) => `${chip.textContent}:${chip.getAttribute('aria-pressed')}`,
			)

		await user.click(allBySlot(container, 'chart-legend-reference')[0] as Element)

		rerender(chart(41.7))

		expect(pressed()).toEqual(['Average:false', 'Ceiling:true'])

		expect(allBySlot(container, 'chart-reference-line')).toHaveLength(1)
	})

	it('drops a toggled-off rule from the domain and the hidden parity', async () => {
		const user = setupUser()

		// The rule at 200 folds the axis up to meet it while shown.
		const { container } = bar({ legend: true, reference: [{ value: 200, label: 'Ceiling' }] })

		const axis = () => bySlot(container, 'chart-axis-y')?.textContent ?? ''

		const list = () => bySlot(container, 'chart-reference-list')?.textContent ?? ''

		expect(axis()).toContain('200')

		expect(list()).toContain('Ceiling')

		await user.click(bySlot(container, 'chart-legend-reference') as Element)

		// Off, the rule leaves the domain so the axis rescales to the data, and the
		// visually-hidden parity drops it the way the data table drops a hidden series.
		expect(axis()).not.toContain('200')

		expect(list()).not.toContain('Ceiling')
	})

	it('recedes nothing while an off chip is hovered, its rule being gone', async () => {
		const user = setupUser()

		const { container } = bar({
			series: [
				{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' },
				{ xKey: 'month', yKey: 'revenue', yName: 'Copy' },
			],
			reference: [{ value: 55, label: 'Target' }],
		})

		const chip = getSlot(container, 'chart-legend-reference')

		const marks = () => bySlot(container, 'chart-marks')?.getAttribute('class') ?? ''

		await user.click(chip)

		// Pointing the struck chip must not recede the marks to a rule that no
		// longer draws.
		fireEvent.pointerEnter(chip)

		expect(marks()).not.toContain('opacity-25')
	})

	it('recedes the sibling rules from a chip, keyed to the rule not the chip position', () => {
		const { container } = bar({
			legend: true,
			// A non-finite rule drops from both the plot and the chips, so the second
			// chip's array index (2) outruns its position (1): the emphasis must key
			// off the index to land on the rule the plot draws.
			reference: [
				{ value: 50, label: 'Floor' },
				{ value: Number.NaN, label: 'Gap' },
				{ value: 70, label: 'Ceiling' },
			],
		})

		const chips = allBySlot(container, 'chart-legend-reference')

		const rules = () => allBySlot(container, 'chart-reference-line')

		const readClass = (el: Element | undefined) => el?.getAttribute('class') ?? ''

		// Two finite rules, two chips; the non-finite one draws and lists nothing.
		expect(chips).toHaveLength(2)

		expect(rules()).toHaveLength(2)

		fireEvent.pointerEnter(chips[1] as Element)

		// The Ceiling chip lights its own rule and recedes the Floor, not the reverse.
		expect(readClass(rules()[0])).toContain('opacity-25')

		expect(readClass(rules()[1])).not.toContain('opacity-25')

		fireEvent.pointerLeave(chips[1] as Element)

		expect(readClass(rules()[0])).not.toContain('opacity-25')
	})

	it('paints a slot chip through its class and a raw color inline', () => {
		const { container } = bar({
			legend: true,
			reference: [
				{ value: 55, label: 'Target', color: 'green' },
				{ value: 70, label: 'Ceiling', color: '#e11d48' },
			],
		})

		const [slot, raw] = allBySlot(container, 'chart-legend-reference')

		const slotSwatch = slot?.querySelector('[data-slot="swatch"]')

		// A named slot rides its currentColor text class, with no inline color.
		expect(slotSwatch?.getAttribute('class')).toContain('text-green-600')

		expect(slotSwatch?.getAttribute('style')).toBeNull()

		const rawSwatch = present(raw?.querySelector('[data-slot="swatch"]'), 'swatch')

		// A raw color bypasses the slot classes and paints inline instead. Only a
		// text utility with no variant is a slot class; the forced-colors ink of
		// the swatch is not.
		expect(rawSwatch?.getAttribute('class') ?? '').not.toMatch(/(^|\s)text-/)

		expect(rawSwatch?.style.color).toBeTruthy()
	})

	it('dashes the chip swatch to match the rule, solid only when the rule is', () => {
		const { container } = bar({
			legend: true,
			reference: [
				{ value: 55, label: 'Target' },
				{ value: 70, label: 'Ceiling', dashed: false },
			],
		})

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
	// `labels` is a line / area prop, so the labeled rules ride the line chart;
	// `labels.references` turns each rule's hover tooltip into a standing label.
	function lineLabels(
		reference: ChartReferenceLine[],
		references: boolean | { value?: boolean } = true,
	) {
		return renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={DATA}
				series={[...SERIES]}
				width={400}
				reference={reference}
				labels={{ references }}
			/>,
		)
	}

	it('shows the label alone, with no value after it, under references.value false', () => {
		const { container } = lineLabels([{ value: 60, label: 'Good 60' }, { value: 30 }], {
			value: false,
		})

		const [named, bare] = allBySlot(container, 'chart-reference-label')

		expect(named?.textContent).toBe('Good 60')

		expect(named?.querySelector('tspan')).toBeNull()

		// A rule with no label still shows its value, which names it.
		expect(bare?.textContent).toBe('30')
	})

	it('inks the value as its rule, unless the rule sets a valueColor', () => {
		const { container } = lineLabels([
			{ value: 60, label: 'Goal', color: 'green' },
			{ value: 40, label: 'Floor', color: 'green', valueColor: 'zinc' },
			{ value: 20, label: 'Base', valueColor: '#e11d48' },
		])

		const [goal, floor, base] = allBySlot(container, 'chart-reference-label').map((label) =>
			label.querySelector('tspan'),
		)

		// The value inherits the ink of the label: it sets no fill of its own.
		expect(goal?.getAttribute('class')).not.toMatch(/fill-/)

		expect(goal?.getAttribute('style')).toBeNull()

		// A slot inks the value through its fill class, and a raw color inline.
		expect(floor?.getAttribute('class')).toMatch(/fill-zinc/)

		expect(base?.getAttribute('style')).toMatch(/fill: ?(#e11d48|rgb\(225, 29, 72\))/)
	})

	it('shows the value after the label for an object with no value key', () => {
		const { container } = lineLabels([{ value: 60, label: 'Goal' }], {})

		expect(bySlot(container, 'chart-reference-label')?.textContent).toBe('Goal60')
	})

	it('draws a standing label per rule and lays no hover target', () => {
		const { container } = lineLabels([{ value: 60, label: 'Goal' }])

		const labels = allBySlot(container, 'chart-reference-label')

		expect(labels).toHaveLength(1)

		const label = labels[0]

		// The label reads the rule's own label, and then its value in the muted ink.
		expect(label?.firstChild?.textContent).toBe('Goal')

		expect(label?.querySelector('tspan')?.textContent).toBe('60')

		// It sits on the rule at its right end, anchored inward and flush with the plot.
		const line = rule(container)

		expect(label?.getAttribute('text-anchor')).toBe('end')

		expect(label?.getAttribute('x')).toBe(line?.getAttribute('x2'))

		expect(label?.getAttribute('y')).toBe(line?.getAttribute('y1'))

		// The rule breaks for the label: its last break runs from before the text to its end.
		const length = Number(line?.getAttribute('x2')) - Number(line?.getAttribute('x1'))

		const [from = 0, to = 0] = findBreaks(line).at(-1) ?? []

		expect(from).toBeLessThan(length - 20)

		expect(to).toBeCloseTo(length, 5)

		// Each piece of the rule starts on a full dash.
		expect(readDashes(line)[0]).toBeGreaterThan(5)

		// No transparent hit target: the standing label replaces the hover readout,
		// so the rule group carries only the one drawn line.
		expect(bySlot(container, 'chart-reference-line')?.querySelectorAll('line').length).toBe(1)
	})

	it('moves a crowded label to the left end, and draws the labels over every rule', () => {
		const { container } = lineLabels([
			{ value: 60, label: 'Target' },
			{ value: 61, label: 'Stretch' },
		])

		const [target, stretch] = allBySlot(container, 'chart-reference-label')

		expect(target?.getAttribute('text-anchor')).toBe('end')

		expect(stretch?.getAttribute('text-anchor')).toBe('start')

		// Each label follows every rule in paint order, so no rule crosses its halo.
		const lastRule = allBySlot(container, 'chart-reference-line').at(-1) as Node

		for (const label of [target, stretch]) {
			expect(
				lastRule.compareDocumentPosition(label as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy()
		}
	})

	it('reads the value alone, in the rule ink, for an unlabeled rule', () => {
		const { container } = lineLabels([{ value: 50 }])

		const label = bySlot(container, 'chart-reference-label')

		expect(label?.textContent).toBe('50')

		expect(label?.querySelector('tspan')).toBeNull()
	})

	it('takes the rules out of the legend, since the plot names them', () => {
		const labeled = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={DATA}
				series={[...SERIES]}
				width={400}
				legend
				reference={[{ value: 60, label: 'Goal' }]}
				labels={{ references: true }}
			/>,
		)

		expect(bySlot(labeled.container, 'chart-legend-reference')).toBeNull()

		const hovered = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={DATA}
				series={[...SERIES]}
				width={400}
				legend
				reference={[{ value: 60, label: 'Goal' }]}
			/>,
		)

		expect(bySlot(hovered.container, 'chart-legend-reference')?.textContent).toBe('Goal')
	})

	it('inks the label to match the rule — a slot through its ink class, a raw color inline', () => {
		const { container } = lineLabels([
			{ value: 50, label: 'Floor', color: 'green' },
			{ value: 70, label: 'Ceiling', color: '#e11d48' },
		])

		const [slot, raw] = allBySlot(container, 'chart-reference-label')

		// The ink step of the slot, which clears the text floor where the 600 fill does not.
		expect(slot?.getAttribute('class')).toContain('fill-green-700')

		expect(slot?.getAttribute('class')).toContain('dark:fill-green-400')

		// A raw color bypasses the fill classes and paints inline instead.
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

		const plot = getSlot(container, 'chart-plot')

		const marks = () => bySlot(container, 'chart-marks')?.getAttribute('class') ?? ''

		// The first arrow enters at the first point; the value-axis arrow then steps
		// the series' points. With the rule labeled it is no longer a stop, so the
		// marks stay lit and no rule takes focus.
		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		fireEvent.keyDown(plot, { key: 'ArrowDown' })

		expect(marks()).not.toContain('opacity-25')

		expect(bySlot(container, 'chart-reference-line')?.getAttribute('data-focused')).toBeNull()
	})
	it('labels the rules of a horizontal bar chart the room down from the top edge', () => {
		const { container } = bar({
			orientation: 'horizontal',
			reference: [{ value: 60, label: 'Goal' }],
			labels: { references: true },
		})

		const label = bySlot(container, 'chart-reference-label')

		expect(label?.textContent).toBe('Goal60')

		// The rule is vertical, so the label stands on it with its top the room
		// (8) down from the top of the plot.
		const line = rule(container)

		const labelY = Number(label?.getAttribute('y')) - Number(line?.getAttribute('y1'))

		expect(Number(label?.getAttribute('x'))).toBeCloseTo(Number(line?.getAttribute('x1')), 1)

		expect(labelY).toBeCloseTo(8 + 6.5, 1)

		// The rule runs across the text, so it breaks for the whole row of the label.
		const [from = 0, to = 0] = findBreaks(line)[0] ?? []

		expect(from).toBeLessThan(labelY - 6.5)

		expect(to).toBeGreaterThan(labelY + 6.5)

		expect(bySlot(container, 'chart-reference-line')?.querySelectorAll('line').length).toBe(1)
	})
})

describe('reference rule breaks', () => {
	/** A line chart with point markers over `DATA`, with one rule at `value`. */
	function pointed(value: number, points = true) {
		return renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={DATA}
				series={[...SERIES]}
				width={400}
				points={points}
				reference={[{ value, label: 'Goal' }]}
			/>,
		)
	}

	it('breaks a rule around each point marker that sits on it', () => {
		const value = DATA[1]?.revenue ?? 0

		const { container } = pointed(value)

		const line = rule(container)

		const point = allBySlot(container, 'chart-point').find(
			(dot) => dot.getAttribute('cy') === line?.getAttribute('y1'),
		)

		// One break holds the point, with the same clear space at each side.
		const at = Number(point?.getAttribute('cx')) - Number(line?.getAttribute('x1'))

		const [from = 0, to = 0] = findBreaks(line).find(([a, b]) => a < at && at < b) ?? []

		expect(at - from).toBeCloseTo(to - at, 1)

		expect(at - from).toBeGreaterThan(5.5)
	})

	it('leaves a rule whole where no point marker sits on it', () => {
		const { container } = pointed(DATA[1]?.revenue ?? 0, false)

		expect(findBreaks(rule(container))).toEqual([])
	})
	it('breaks a rule for a neighbor label that comes nearer than the gap', () => {
		// A label of 40 units ends at the right side of a plot 200 units wide, on a rule at y 50.
		const label: PlacedReferenceLabel = {
			x: 200,
			y: 50,
			anchor: 'end',
			width: 40,
			box: { x0: 156, x1: 200, y0: 43.5, y1: 56.5 },
		}

		const breaksAt = (y: number) => ruleBreaks({ x: 0, y }, { x: 200, y }, [label], [])

		// A rule 5.5 units under the label's box is clear of it by more than the gap.
		expect(breaksAt(62)).toEqual([])

		// A rule 3.5 units under the box is inside the gap, so it stops short of the text.
		expect(breaksAt(60)).toEqual([{ from: 160 - LABEL_GAP, to: 200 + LABEL_GAP }])
	})
})

describe('reference lines that the legend names', () => {
	const RULES: ChartReferenceLine[] = [
		{ value: 55, label: 'Target' },
		{ category: 'Feb', label: 'Release', description: 'Shipped v2' },
	]

	/** The text of each legend chip of a rule, in order. */
	const chips = (container: HTMLElement) =>
		allBySlot(container, 'chart-legend-reference').map((chip) => chip.textContent)

	it('names every rule in the legend in place of its label, and shows the legend for one series', () => {
		const { container } = bar({
			legend: { references: true },
			labels: { references: true },
			reference: RULES,
		})

		// One series keeps the legend off by default. The rules that it names
		// count as entries, so it shows.
		expect(bySlot(container, 'chart-legend')).not.toBeNull()

		expect(chips(container)).toEqual(['Target', 'Release'])

		expect(allBySlot(container, 'chart-reference-label')).toHaveLength(0)

		// Each chip is dashed, as its rule is.
		expect(
			allBySlot(container, 'chart-legend-reference').map((chip) =>
				chip.querySelector('[data-slot="swatch"]')?.getAttribute('data-variant'),
			),
		).toEqual(['dashed', 'dashed'])
	})

	it('names one rule in the legend through its own legend, and a rule can opt out', () => {
		const { container } = bar({
			legend: { references: true },
			labels: { references: true },
			reference: [
				{ value: 55, label: 'Target', legend: false },
				{ value: 70, label: 'Ceiling' },
				{ category: 'Feb', label: 'Release', legend: false },
			],
		})

		expect(chips(container)).toEqual(['Ceiling'])

		expect(allBySlot(container, 'chart-reference-label').map((label) => label.textContent)).toEqual(
			['Target55', 'Release'],
		)

		const one = bar({
			labels: { references: true },
			reference: [
				{ value: 55, label: 'Target' },
				{ category: 'Feb', label: 'Release', legend: true },
			],
		})

		expect(chips(one.container)).toEqual(['Release'])

		expect(
			allBySlot(one.container, 'chart-reference-label').map((label) => label.textContent),
		).toEqual(['Target55'])
	})

	it('keeps the labels on the plot where the legend is off', () => {
		const { container } = bar({
			legend: false,
			labels: { references: true },
			reference: [
				{ value: 55, label: 'Target', legend: true },
				{ category: 'Feb', label: 'Release', legend: true },
			],
		})

		expect(bySlot(container, 'chart-legend')).toBeNull()

		expect(allBySlot(container, 'chart-reference-label')).toHaveLength(2)
	})

	it('toggles a category rule off through its chip, with its readout note', async () => {
		const user = setupUser()

		const { container } = bar({ legend: { references: true }, reference: RULES })

		const plot = getSlot(container, 'chart-plot')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await waitFor(() => expect(allBySlot(container, 'chart-tooltip-note')).toHaveLength(1))

		expect(allBySlot(container, 'chart-reference-line')).toHaveLength(2)

		await user.click(present(allBySlot(container, 'chart-legend-reference')[1], 'Release chip'))

		await waitFor(() => expect(allBySlot(container, 'chart-reference-line')).toHaveLength(1))

		expect(allBySlot(container, 'chart-tooltip-note')).toHaveLength(0)

		expect(bySlot(container, 'chart-reference-list')?.textContent).toBe('Target: 55')
	})
})
