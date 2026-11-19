import { describe, expect, it } from 'vitest'
import { BarChart, LineChart } from '../../modules/chart'
import type { ChartReferenceLine } from '../../modules/chart/engine/chart-reference'
import {
	allBySlot,
	bySlot,
	expectAnnouncement,
	fireEvent,
	getSlot,
	present,
	renderUI,
	waitFor,
} from '../helpers'
import { axisLabels } from '../helpers/axis-labels'

const DATA = [
	{ month: 'Jan', revenue: 40 },
	{ month: 'Feb', revenue: 80 },
	{ month: 'Mar', revenue: 65 },
]

const SERIES = [{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }] as const

const RELEASE: ChartReferenceLine = {
	category: 'Feb',
	label: 'Release',
	description: 'Shipped v2',
}

type ChartOptions = Partial<Parameters<typeof BarChart<(typeof DATA)[number]>>[0]>

function bar(options: ChartOptions = {}) {
	return renderUI(
		<BarChart
			aria-label="Revenue by month"
			data={DATA}
			series={[...SERIES]}
			width={400}
			{...options}
		/>,
	)
}

function line(options: ChartOptions = {}) {
	return renderUI(
		<LineChart
			aria-label="Revenue by month"
			data={DATA}
			series={[...SERIES]}
			width={400}
			{...options}
		/>,
	)
}

/** The drawn line of each reference rule. */
function rules(container: HTMLElement): SVGLineElement[] {
	return allBySlot(container, 'chart-reference-line').map((group) =>
		present<SVGLineElement>(group.querySelector('line'), 'rule line'),
	)
}

/** The x of each category label on the band axis, in order. */
function tickXs(container: HTMLElement): number[] {
	return [...getSlot(container, 'chart-axis-x').querySelectorAll('text')].map((label) =>
		Number(label.getAttribute('x')),
	)
}

describe('a category reference', () => {
	it('draws a vertical rule at the band center of its category on a line chart', () => {
		const { container } = line({ reference: [RELEASE] })

		const [rule] = rules(container)

		const [, feb] = tickXs(container)

		expect(rule?.getAttribute('x1')).toBe(String(feb))

		expect(rule?.getAttribute('x2')).toBe(String(feb))

		expect(rule?.getAttribute('y1')).not.toBe(rule?.getAttribute('y2'))
	})

	it('draws at the leading edge of the slot on a chart with bars, between two bars', () => {
		const { container } = bar({ reference: [RELEASE] })

		const [rule] = rules(container)

		const [jan = 0, feb = 0] = tickXs(container)

		expect(Number(rule?.getAttribute('x1'))).toBe((jan + feb) / 2)
	})

	it('draws a horizontal rule under a horizontal orientation', () => {
		const { container } = bar({ orientation: 'horizontal', reference: [RELEASE] })

		const [rule] = rules(container)

		expect(rule?.getAttribute('y1')).toBe(rule?.getAttribute('y2'))

		expect(rule?.getAttribute('x1')).not.toBe(rule?.getAttribute('x2'))
	})

	it('draws nothing for a category that the chart does not draw', () => {
		const { container } = bar({ reference: [{ category: 'Dec', label: 'Launch' }] })

		expect(rules(container)).toHaveLength(0)

		expect(bySlot(container, 'chart-reference-label')).toBeNull()
	})

	it('leaves the value axis as the data sets it', () => {
		const plain = bar()

		const marked = bar({ reference: [RELEASE] })

		expect(axisLabels(marked.container, 'chart-axis-y')).toEqual(
			axisLabels(plain.container, 'chart-axis-y'),
		)
	})

	it('stands its label without labels.references, and a rule with no label draws none', () => {
		const { container } = line({ reference: [RELEASE, { category: 'Mar' }] })

		expect(rules(container)).toHaveLength(2)

		expect(allBySlot(container, 'chart-reference-label').map((label) => label.textContent)).toEqual(
			['Release'],
		)
	})

	it('keeps its label clear of the line of the data, with room', () => {
		// The chart draws no point markers, so only the line moves the label.
		const { container } = line({ reference: [RELEASE] })

		// The line peaks at Feb, the rule of the label, and falls to Mar.
		const d = getSlot(container, 'chart-line').getAttribute('d') ?? ''

		const [, peak, mar] = [...d.matchAll(/[ML]\s*([-\d.]+)[ ,]+([-\d.]+)/g)].map((match) => ({
			x: Number(match[1]),
			y: Number(match[2]),
		}))

		const label = getSlot(container, 'chart-reference-label')

		expect(label.getAttribute('text-anchor')).toBe('start')

		// The label starts at the rule and runs right over the fall to Mar. Its
		// top keeps the room (8) under the line, 40 units into the label.
		const x = Number(label.getAttribute('x')) + 40

		const lineY = peak && mar ? peak.y + ((x - peak.x) * (mar.y - peak.y)) / (mar.x - peak.x) : 0

		expect(Number(label.getAttribute('y')) - 6.5).toBeGreaterThanOrEqual(lineY + 8)
	})

	it('cuts a label too wide for the space between rules, and floats the whole label', async () => {
		const label = 'Release of the new invoice classifier'

		const { container } = line({
			reference: [{ category: 'Jan' }, { category: 'Feb', label }, { category: 'Mar' }],
		})

		const cut = getSlot(container, 'chart-reference-label')

		expect(cut).toHaveAttribute('data-cut')

		expect(cut.textContent).toMatch(/^Rel.*…$/)

		// The cut centers on its rule, and ends the room (8) short of the rule on
		// each side. jsdom has no text layout, so a character is 8.5 wide.
		expect(cut).toHaveAttribute('text-anchor', 'middle')

		const [jan, , mar] = rules(container).map((rule) => Number(rule.getAttribute('x1')))

		const half = (8.5 * (cut.textContent?.length ?? 0)) / 2

		expect(Number(cut.getAttribute('x')) - half).toBeGreaterThanOrEqual((jan ?? 0) + 8)

		expect(Number(cut.getAttribute('x')) + half).toBeLessThanOrEqual((mar ?? 0) - 8)

		// The floating-ui mock has no hover, so focus opens the tooltip here.
		fireEvent.focus(getSlot(container, 'chart-reference-label-target'))

		await waitFor(() =>
			expect(document.querySelector('[data-slot="chart-reference-swatch"]')).not.toBeNull(),
		)

		expect(
			document
				.querySelector('[data-slot="chart-reference-swatch"]')
				?.closest('[data-slot="tooltip-content"]')?.textContent,
		).toContain(label)
	})

	it('moves its label off a value rule that shows no label', () => {
		/** The y of the one standing label. */
		const labelY = (container: HTMLElement) =>
			Number(getSlot(container, 'chart-reference-label').getAttribute('y'))

		const alone = line({ reference: [RELEASE] })

		// A value rule through the label, under `labels.references` off.
		const at = labelY(alone.container)

		const ruleY = (value: number) => {
			const { container } = line({ reference: [{ value }] })

			return Number(
				bySlot(container, 'chart-reference-line')?.querySelector('line')?.getAttribute('y1'),
			)
		}

		// The value whose rule runs closest to the label's center.
		const value = [70, 72, 74, 76, 78, 80].reduce((best, next) =>
			Math.abs(ruleY(next) - at) < Math.abs(ruleY(best) - at) ? next : best,
		)

		const crossed = line({ reference: [{ value, label: 'Goal' }, RELEASE] })

		expect(allBySlot(crossed.container, 'chart-reference-label')).toHaveLength(1)

		expect(labelY(crossed.container)).not.toBe(at)
	})

	it('takes no pointer and no legend chip, while a value rule keeps both', () => {
		const { container } = bar({
			legend: true,
			reference: [RELEASE, { value: 60, label: 'Goal' }],
		})

		const [category, value] = allBySlot(container, 'chart-reference-line')

		expect(category?.getAttribute('pointer-events')).toBe('none')

		expect(value?.getAttribute('pointer-events')).toBeNull()

		expect(allBySlot(container, 'chart-legend-reference').map((chip) => chip.textContent)).toEqual([
			'Goal60',
		])
	})

	it('joins the readout of its category, which the keyboard cursor speaks', async () => {
		const { container } = line({ reference: [RELEASE] })

		const plot = getSlot(container, 'chart-plot')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await expectAnnouncement('Jan, Revenue: 40')

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		await expectAnnouncement('Feb, Revenue: 80, Release: Shipped v2')

		const [note] = allBySlot(container, 'chart-tooltip-note')

		expect(note?.textContent).toBe('ReleaseShipped v2')
	})

	it('names itself in the visually-hidden list with its category and its description', () => {
		const { container } = bar({ reference: [RELEASE, { value: 60, label: 'Goal' }] })

		expect(
			[...getSlot(container, 'chart-reference-list').querySelectorAll('li')].map(
				(item) => item.textContent,
			),
		).toEqual(['Release: Feb, Shipped v2', 'Goal: 60'])
	})

	it('names the category in the format of the band axis', () => {
		const { container } = bar({
			reference: [RELEASE],
			axes: { x: { format: (value) => `Month ${String(value)}` } },
		})

		expect(getSlot(container, 'chart-reference-list').textContent).toBe(
			'Release: Month Feb, Shipped v2',
		)
	})
})
