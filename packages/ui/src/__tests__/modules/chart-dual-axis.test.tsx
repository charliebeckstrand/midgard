import { describe, expect, it } from 'vitest'
import { BarChart } from '../../modules/chart/bar-chart'
import type { ChartValueAxis } from '../../modules/chart/chart-schema'
import { ComboChart } from '../../modules/chart/combo-chart'
import { LineChart } from '../../modules/chart/line-chart'
import { act, allBySlot, bySlot, fireEvent, renderUI, userEvent } from '../helpers'

type Week = { week: string; shipments: number; rate: number }

const WEEKS: Week[] = [
	{ week: 'W1', shipments: 40, rate: 12 },
	{ week: 'W2', shipments: 80, rate: 25 },
	{ week: 'W3', shipments: 65, rate: 18 },
]

const dollars = (value: number) => `$${value}`

const percent = (value: number) => `${value}%`

function line(overrides?: {
	yAxis?: ChartValueAxis
	y2Axis?: ChartValueAxis
	y2Series?: boolean
	/** The frame width; wide enough for axis titles (≥ 512) only where a test needs them. */
	width?: number
}) {
	return renderUI(
		<LineChart
			aria-label="Shipments and exception rate by week"
			data={WEEKS}
			width={overrides?.width ?? 480}
			series={[
				{ xKey: 'week', yKey: 'shipments', yName: 'Shipments' },
				...(overrides?.y2Series === false
					? []
					: [{ xKey: 'week', yKey: 'rate', yName: 'Rate', axis: 'y2' } as const]),
			]}
			axes={{
				y: { format: dollars, ...overrides?.yAxis },
				y2: { format: percent, ...overrides?.y2Axis },
			}}
		/>,
	)
}

/** The tick labels inside an axis group, in draw order. */
function tickLabels(container: HTMLElement, slot: string): string[] {
	return [...(bySlot(container, slot)?.querySelectorAll('text') ?? [])].map(
		(tick) => tick.textContent ?? '',
	)
}

describe('secondary y-axis', () => {
	it('draws a right axis once a series binds to it, and none without', () => {
		const dual = line()

		expect(bySlot(dual.container, 'chart-axis-y-right')).not.toBeNull()

		const single = line({ y2Series: false })

		expect(bySlot(single.container, 'chart-axis-y-right')).toBeNull()
	})

	it('scales each side to its own domain with its own formatter', () => {
		const { container } = line()

		const left = tickLabels(container, 'chart-axis-y')

		const right = tickLabels(container, 'chart-axis-y-right')

		// Left ticks read the shipments domain in dollars; right ticks read the
		// far smaller rate domain in percent — neither domain swallows the other.
		expect(left.length).toBeGreaterThan(0)

		expect(left.every((label) => label.startsWith('$'))).toBe(true)

		expect(right.length).toBeGreaterThan(0)

		expect(right.every((label) => label.endsWith('%'))).toBe(true)

		expect(left.some((label) => label === '$80' || label === '$100')).toBe(true)
	})

	it('formats the data table per series axis', () => {
		const { container } = line()

		const table = bySlot(container, 'chart-table')

		expect(table?.textContent).toContain('$40')

		expect(table?.textContent).toContain('12%')
	})

	it('pins the y2 domain through axes.y2 min / max', () => {
		const { container } = line({ y2Axis: { min: 0, max: 50 } })

		const right = tickLabels(container, 'chart-axis-y-right')

		expect(right.at(0)).toBe('0%')

		// The pin is exact while the ticks stay on clean steps inside it, so the
		// widened domain shows through the highest tick rather than a 50% label.
		expect(right).toContain('40%')

		expect(right.every((label) => Number.parseInt(label, 10) <= 50)).toBe(true)
	})

	it('draws gridlines from the left axis only, until the right opts in', () => {
		const defaulted = line()

		const leftTickCount = tickLabels(defaulted.container, 'chart-axis-y').length

		expect(
			defaulted.container.querySelectorAll('[data-slot="chart-grid-lines"] line'),
		).toHaveLength(leftTickCount)

		const optedIn = line({ y2Axis: { grid: true } })

		const opted = optedIn.container.querySelectorAll('[data-slot="chart-grid-lines"] line').length

		const bothCount =
			tickLabels(optedIn.container, 'chart-axis-y').length +
			tickLabels(optedIn.container, 'chart-axis-y-right').length

		// The right ticks join the layer; coinciding positions (both floors on a
		// zero baseline) collapse to one hairline.
		expect(opted).toBeGreaterThan(tickLabels(optedIn.container, 'chart-axis-y').length)

		expect(opted).toBeLessThanOrEqual(bothCount)
	})

	it('draws each axis title in its reserved gutter band', () => {
		// A frame wide and tall enough to afford titles (past the tier's title bounds).
		const { container } = line({
			width: 560,
			yAxis: { title: 'Shipments' },
			y2Axis: { title: 'Exception rate' },
		})

		const titles = bySlot(container, 'chart-axis-titles')

		expect(titles?.textContent).toContain('Shipments')

		expect(titles?.textContent).toContain('Exception rate')

		// Vertical gutter titles rotate along their axes.
		const rotated = [...(titles?.querySelectorAll('text') ?? [])].map((title) =>
			title.getAttribute('transform'),
		)

		expect(rotated.every((transform) => transform?.startsWith('rotate('))).toBe(true)
	})

	it('sheds the axis titles in a frame too narrow to afford them', () => {
		// The same titled axes in a standard-but-narrow frame (480 wide, under the
		// tier's title width): the gutter reserves no title band and none draw, the
		// scales and their series still reading through the legend and tooltip.
		const { container } = line({
			yAxis: { title: 'Shipments' },
			y2Axis: { title: 'Exception rate' },
		})

		expect(bySlot(container, 'chart-axis-titles')).toBeNull()
	})

	it('draws the category (x) axis title flat under its labels', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Shipments by week"
				data={WEEKS}
				width={560}
				height={360}
				series={[{ xKey: 'week', yKey: 'shipments', yName: 'Shipments' }]}
				axes={{ x: { title: 'Week' } }}
			/>,
		)

		const titles = bySlot(container, 'chart-axis-titles')

		expect(titles?.textContent).toContain('Week')

		// The band-axis title reads horizontally under the labels — no rotation.
		const week = [...(titles?.querySelectorAll('text') ?? [])].find(
			(node) => node.textContent === 'Week',
		)

		expect(week?.getAttribute('transform') ?? '').not.toContain('rotate(')
	})

	it('drops the right axis when its last series toggles off, and the left when everything binds right', async () => {
		const user = userEvent.setup()

		const { container } = line()

		await user.click(container.querySelector('button[aria-pressed]:nth-of-type(2)') as Element)

		expect(bySlot(container, 'chart-axis-y-right')).toBeNull()

		const allRight = renderUI(
			<LineChart
				aria-label="Rate by week"
				data={WEEKS}
				width={480}
				series={[
					{ xKey: 'week', yKey: 'rate', yName: 'Rate', axis: 'y2' },
					{ xKey: 'week', yKey: 'shipments', yName: 'Shipments', axis: 'y2' },
				]}
			/>,
		)

		expect(bySlot(allRight.container, 'chart-axis-y-right')).not.toBeNull()

		expect(bySlot(allRight.container, 'chart-axis-y')).toBeNull()
	})

	it('reads both axes from the keyboard with per-axis formatting', () => {
		const { container } = line()

		const plot = bySlot(container, 'chart-plot') as HTMLElement

		act(() => plot.focus())

		fireEvent.keyDown(plot, { key: 'ArrowRight' })

		const tip = bySlot(container, 'tooltip-content')

		expect(tip?.textContent).toContain('W1')

		expect(tip?.textContent).toContain('$40')

		expect(tip?.textContent).toContain('12%')
	})

	it('binds a reference line to the right axis, folding its value into that domain', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Shipments and rate with a rate ceiling"
				data={WEEKS}
				width={480}
				series={[
					{ xKey: 'week', yKey: 'shipments', yName: 'Shipments' },
					{ xKey: 'week', yKey: 'rate', yName: 'Rate', axis: 'y2' },
				]}
				axes={{ y2: { format: percent } }}
				reference={[{ value: 40, label: 'Ceiling', axis: 'y2' }]}
			/>,
		)

		expect(allBySlot(container, 'chart-reference-line')).toHaveLength(1)

		// The rule folds into the right domain (rate tops out at 25, the ceiling
		// pushes it to 40) and its parity entry reads the right formatter.
		const right = tickLabels(container, 'chart-axis-y-right')

		expect(right.at(-1)).toBe('40%')

		expect(bySlot(container, 'chart-reference-list')?.textContent).toContain('Ceiling: 40%')
	})

	it('keeps a mixed-axis stack on one scale — the left, when its series disagree', () => {
		const { container } = renderUI(
			<BarChart
				aria-label="Disagreeing stacked axes"
				data={WEEKS}
				width={480}
				series={[
					{ xKey: 'week', yKey: 'shipments', yName: 'Shipments' },
					{ xKey: 'week', yKey: 'rate', yName: 'Rate', axis: 'y2' },
				]}
				stacked
			/>,
		)

		expect(bySlot(container, 'chart-axis-y-right')).toBeNull()

		expect(bySlot(container, 'chart-axis-y')).not.toBeNull()
	})

	it('lets a combo bind marks across both axes', () => {
		const { container } = renderUI(
			<ComboChart
				aria-label="Shipments bars with a rate line"
				data={WEEKS}
				width={480}
				series={[
					{ type: 'bar', xKey: 'week', yKey: 'shipments', yName: 'Shipments' },
					{ type: 'line', xKey: 'week', yKey: 'rate', yName: 'Rate', axis: 'y2' },
				]}
				axes={{ y2: { format: percent } }}
			/>,
		)

		expect(bySlot(container, 'chart-axis-y-right')).not.toBeNull()

		expect(allBySlot(container, 'chart-line-series')).toHaveLength(1)

		expect(container.querySelectorAll('[data-slot="chart-bar"]').length).toBeGreaterThan(0)
	})
})
