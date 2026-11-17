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

	it('takes no pointer and no legend chip, while a value rule keeps both', () => {
		const { container } = bar({
			legend: true,
			reference: [RELEASE, { value: 60, label: 'Goal' }],
		})

		const [category, value] = allBySlot(container, 'chart-reference-line')

		expect(category?.getAttribute('pointer-events')).toBe('none')

		expect(value?.getAttribute('pointer-events')).toBeNull()

		expect(allBySlot(container, 'chart-legend-reference').map((chip) => chip.textContent)).toEqual([
			'Goal',
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
