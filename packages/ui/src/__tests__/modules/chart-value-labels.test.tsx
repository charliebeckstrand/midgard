import { describe, expect, it } from 'vitest'
import { AreaChart } from '../../modules/chart/area-chart'
import { ComboChart } from '../../modules/chart/combo-chart'
import { fillClass, rawColor, resolvePaint } from '../../modules/chart/engine/chart-color/paint'
import {
	type LabelableSeries,
	labelBesideY,
	labelPoints,
	type PlacedValueLabel,
	resolveValueLabels,
	type ValueLabelSeries,
	valueLabels,
} from '../../modules/chart/engine/chart-geometry/label'
import { LineChart } from '../../modules/chart/line-chart'
import { allBySlot, bySlot, fireEvent, renderUI } from '../helpers'

const PLOT = { x: 0, y: 0, width: 200, height: 100 }

/** A single series over the given `[x, y, value]` points. */
function series(points: [number, number, number][]): ValueLabelSeries {
	return {
		fill: 'fill-blue-600',
		points: points.map(([x, y, value]) => ({ x, y, value })),
		format: String,
	}
}

/** The label texts, in placement order. */
function texts(labels: PlacedValueLabel[]): string[] {
	return labels.map((label) => label.text)
}

describe('valueLabels', () => {
	it('labels the first and last point for endpoints', () => {
		const labels = valueLabels({
			series: [
				series([
					[10, 50, 5],
					[50, 20, 9],
					[100, 80, 2],
				]),
			],
			plot: PLOT,
			endpoints: true,
			extremes: false,
		})

		expect(texts(labels).sort()).toEqual(['2', '5'])
	})

	it('labels the min and max point for extremes', () => {
		const labels = valueLabels({
			series: [
				series([
					[10, 50, 5],
					[50, 20, 9],
					[100, 80, 2],
				]),
			],
			plot: PLOT,
			endpoints: false,
			extremes: true,
		})

		expect(texts(labels).sort()).toEqual(['2', '9'])
	})

	it('de-dupes a point that is both an endpoint and an extreme', () => {
		// Two points: the first is the min and the first endpoint, the last the max
		// and the last endpoint — four roles, two labels.
		const labels = valueLabels({
			series: [
				series([
					[10, 50, 5],
					[180, 20, 9],
				]),
			],
			plot: PLOT,
			endpoints: true,
			extremes: true,
		})

		expect(labels).toHaveLength(2)
	})

	it('drops the lower-priority label when two boxes overlap', () => {
		// Two single-point series on the same spot: both are max-priority, so the
		// first placed wins and the second is dropped rather than stacked.
		const labels = valueLabels({
			series: [series([[100, 50, 100]]), series([[100, 50, 999]])],
			plot: PLOT,
			endpoints: false,
			extremes: true,
		})

		expect(labels).toHaveLength(1)

		expect(labels[0]?.text).toBe('100')
	})

	it('pins a side label to its point rather than sliding it, keeping the vertical flip', () => {
		// Near a side edge a centered box would cross the plot. The label anchors
		// inward at its own point instead, and never slides onto the neighboring
		// marks.
		const [right] = valueLabels({
			series: [series([[198, 50, 12345]])],
			plot: PLOT,
			endpoints: true,
			extremes: false,
		})

		expect(right?.anchor).toBe('end')

		expect(right?.x).toBe(198)

		const [left] = valueLabels({
			series: [series([[2, 50, 12345]])],
			plot: PLOT,
			endpoints: true,
			extremes: false,
		})

		expect(left?.anchor).toBe('start')

		expect(left?.x).toBe(2)

		// A fitting label anchors on its point's center — never slid inward.
		const [fits] = valueLabels({
			series: [series([[100, 50, 12345]])],
			plot: PLOT,
			endpoints: true,
			extremes: false,
		})

		expect(fits?.anchor).toBe('middle')

		// A max sits above its point, but a point at the top still flips its label
		// below — vertically the label never leaves its own mark, so the flip stays.
		const [top] = valueLabels({
			series: [series([[100, 2, 9]])],
			plot: PLOT,
			endpoints: false,
			extremes: true,
		})

		expect(top?.y).toBeGreaterThan(2)
	})
})

describe('labelPoints', () => {
	it('zips finite values onto the plotted points, skipping gaps', () => {
		const points = labelPoints(
			[5, null, 9],
			[
				{ x: 0, y: 10 },
				{ x: 20, y: 30 },
			],
		)

		expect(points).toEqual([
			{ x: 0, y: 10, value: 5 },
			{ x: 20, y: 30, value: 9 },
		])
	})

	it('reads each category by index when points are not gap-skipped (stacked ribbon)', () => {
		// A stacked ribbon's top edge carries one point per category — the gap
		// included — so the value reads straight off `values[index]`, and the null
		// category takes no label. The gap-skipping zip would have shifted 20 onto
		// the middle point and dropped the last to 0.
		const points = labelPoints(
			[null, 10, 20],
			[
				{ x: 0, y: 100 },
				{ x: 20, y: 80 },
				{ x: 40, y: 60 },
			],
			false,
		)

		expect(points).toEqual([
			{ x: 20, y: 80, value: 10 },
			{ x: 40, y: 60, value: 20 },
		])
	})
})

describe('valueLabels at the plot sides', () => {
	it('anchors a label inward where a centered one would cross a side', () => {
		// A dense line puts its endpoints near the plot sides. A centered label
		// there crossed the side and dropped.
		const labels = valueLabels({
			series: [
				series([
					[10, 50, 12345],
					[100, 60, 1],
					[190, 70, 67890],
				]),
			],
			plot: PLOT,
			endpoints: true,
			extremes: false,
		})

		const first = labels.find((label) => label.text === '12345')

		const last = labels.find((label) => label.text === '67890')

		expect(first?.anchor).toBe('start')

		expect(first?.x).toBe(10)

		expect(last?.anchor).toBe('end')

		expect(last?.x).toBe(190)
	})

	it('anchors a label at a point on the plot side', () => {
		// A dense series puts its first point within the label padding of the
		// side. The padding is spacing, not text, so the label still anchors there.
		const [edge] = valueLabels({
			series: [series([[1, 50, 12345]])],
			plot: PLOT,
			endpoints: true,
			extremes: false,
		})

		expect(edge?.anchor).toBe('start')

		expect(edge?.x).toBe(1)
	})

	it('hides a label that does not fit even anchored inward', () => {
		// The plot is narrower than the text.
		const [wide] = valueLabels({
			series: [series([[20, 50, 123456789012]])],
			plot: { x: 0, y: 0, width: 60, height: 100 },
			endpoints: true,
			extremes: false,
		})

		expect(wide).toBeUndefined()
	})
})

describe('resolveValueLabels', () => {
	/** A labelable series in the given palette slot. */
	function labelable(
		color: 'blue' | 'orange',
		points: { x: number; y: number }[],
		values: number[],
	): LabelableSeries {
		const paint = resolvePaint(color)

		return { fill: fillClass(paint), color: rawColor(paint), points, values, format: String }
	}

	const list = [
		labelable(
			'blue',
			[
				{ x: 10, y: 50 },
				{ x: 100, y: 20 },
			],
			[5, 9],
		),
	]

	it('draws nothing without a label switch', () => {
		expect(resolveValueLabels(undefined, list, PLOT)).toEqual([])

		expect(resolveValueLabels({}, list, PLOT)).toEqual([])
	})

	it('builds the labels in the series ink when a switch is on', () => {
		const labels = resolveValueLabels({ endpoints: true }, list, PLOT)

		expect(texts(labels).sort()).toEqual(['5', '9'])

		expect(labels[0]?.fill).toContain('fill-blue-600')
	})

	it('keys each label on its series and its point, not on its position', () => {
		const labels = resolveValueLabels({ endpoints: true }, list, PLOT)

		const wider = resolveValueLabels(
			{ endpoints: true },
			[
				{
					...list[0],
					points: [
						{ x: 20, y: 50 },
						{ x: 180, y: 20 },
					],
				} as LabelableSeries,
			],
			{ ...PLOT, width: 400 },
		)

		expect(labels.map((label) => label.key).sort()).toEqual(['0:0', '0:1'])

		expect(wider.map((label) => label.key).sort()).toEqual(['0:0', '0:1'])
	})

	it('stands the point labels down when the chart has more than one series', () => {
		// Point labels are single-series only — two series would crowd their
		// numbers between the lines, so the config is honored only for a lone
		// series and the tooltip carries the readout otherwise.
		const twoSeries = [
			...list,
			labelable(
				'orange',
				[
					{ x: 10, y: 80 },
					{ x: 100, y: 60 },
				],
				[3, 7],
			),
		]

		expect(resolveValueLabels({ endpoints: true, extremes: true }, twoSeries, PLOT)).toEqual([])

		// The lone series still labels.
		expect(resolveValueLabels({ endpoints: true }, list, PLOT)).toHaveLength(2)
	})
})

describe('labelBesideY', () => {
	it('takes its preferred side, and flips where that side clips the plot', () => {
		expect(labelBesideY(50, PLOT, true)).toBeLessThan(50)

		expect(labelBesideY(50, PLOT, false)).toBeGreaterThan(50)

		// Too near the top to sit above, and too near the bottom to sit below.
		expect(labelBesideY(4, PLOT, true)).toBeGreaterThan(4)

		expect(labelBesideY(96, PLOT, false)).toBeLessThan(96)
	})
})

describe('LineChart value labels', () => {
	it('keeps each label node through a resize', () => {
		// A resize moves the labels, and the data stays. A label keyed on its
		// position mounted again at each width, and an animated one faded out and
		// in: it blinked on each resize.
		const chart = (width: number) => (
			<LineChart
				aria-label="Revenue by month"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 90 },
					{ month: 'Mar', revenue: 65 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={width}
				animate
				labels={{ extremes: true }}
			/>
		)

		const { container, rerender } = renderUI(chart(400))

		const peak = () =>
			allBySlot(container, 'chart-value-label').find((node) => node.textContent === '90')

		const before = peak()

		const x = before?.getAttribute('x')

		rerender(chart(520))

		expect(peak()).toBe(before)

		expect(peak()?.getAttribute('x')).not.toBe(x)
	})

	it('renders the selective labels over the marks', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 90 },
					{ month: 'Mar', revenue: 65 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={400}
				labels={{ extremes: true }}
			/>,
		)

		const drawn = allBySlot(container, 'chart-value-label').map((node) => node.textContent)

		// The peak (90) and trough (40) are labeled; the middle point is not.
		expect(drawn).toContain('90')

		expect(drawn).toContain('40')

		expect(drawn).not.toContain('65')
	})

	it('keeps the extreme labels on their natural sides through the reserved headroom', () => {
		// Both raw extremes land exactly on nice tick steps, so without the
		// reserved headroom each would touch its plot edge and flip onto the
		// line. The reservation clears the flip threshold with slack — the peak's
		// label stays above the peak and the trough's below the trough, and a
		// resize never dances them across the boundary.
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 90 },
					{ month: 'Mar', revenue: 65 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={400}
				points
				labels={{ extremes: true }}
			/>,
		)

		const labels = allBySlot(container, 'chart-value-label')

		const y = (text: string) =>
			Number(labels.find((node) => node.textContent === text)?.getAttribute('y'))

		const points = allBySlot(container, 'chart-point').map((node) =>
			Number(node.getAttribute('cy')),
		)

		const [troughY, peakY] = [points[0] as number, points[1] as number]

		expect(y('90')).toBeLessThan(peakY)

		expect(y('40')).toBeGreaterThan(troughY)
	})

	it('keeps a first-point label at the domain ceiling above its point', () => {
		// Endpoints reserve headroom too: the first value is also the data max
		// and lands exactly on the nice tick ceiling — without the reservation
		// its label would clip the plot top and flip below, onto the descending
		// line.
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month"
				data={[
					{ month: 'Jan', revenue: 90 },
					{ month: 'Feb', revenue: 40 },
					{ month: 'Mar', revenue: 60 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={400}
				points
				labels={{ endpoints: true }}
			/>,
		)

		const first = allBySlot(container, 'chart-value-label').find(
			(node) => node.textContent === '90',
		)

		const firstPoint = allBySlot(container, 'chart-point')[0]

		expect(Number(first?.getAttribute('y'))).toBeLessThan(Number(firstPoint?.getAttribute('cy')))
	})

	it('labels reference rules with their label when references is on', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue by month against a target"
				data={[
					{ month: 'Jan', revenue: 40 },
					{ month: 'Feb', revenue: 90 },
					{ month: 'Mar', revenue: 65 },
				]}
				series={[{ xKey: 'month', yKey: 'revenue', yName: 'Revenue' }]}
				width={400}
				reference={[{ value: 70, label: 'Target' }]}
				labels={{ extremes: true, references: true }}
			/>,
		)

		// The point labels still draw for the extremes...
		const points = allBySlot(container, 'chart-value-label').map((node) => node.textContent)

		expect(points).toContain('90')

		expect(points).toContain('40')

		// ...and the reference rule now carries its own standing label.
		expect(bySlot(container, 'chart-reference-label')?.textContent).toBe('Target')
	})
})

describe('AreaChart stacked value labels', () => {
	it('labels each stacked category by its own value across a gap', () => {
		const { container } = renderUI(
			<AreaChart
				aria-label="Signups by week"
				data={[
					{ week: 'W1', a: undefined },
					{ week: 'W2', a: 10 },
					{ week: 'W3', a: 20 },
				]}
				series={[{ xKey: 'week', yKey: 'a', yName: 'A' }]}
				stacked
				width={400}
				labels={{ endpoints: true }}
			/>,
		)

		const drawn = allBySlot(container, 'chart-value-label').map((node) => node.textContent)

		// The right-edge endpoint reads its own value (20), not the 0 the gap-shift
		// bug left there; the leading gap takes no label.
		expect(drawn).toContain('20')

		expect(drawn).not.toContain('0')
	})
})

describe('AreaChart value-label headroom', () => {
	it('keeps the extreme labels on their natural sides, above the peak', () => {
		const { container } = renderUI(
			<AreaChart
				aria-label="Revenue"
				width={400}
				points
				labels={{ extremes: true }}
				data={[
					{ m: 'Jan', r: 40 },
					{ m: 'Feb', r: 100 },
					{ m: 'Mar', r: 65 },
				]}
				series={[{ xKey: 'm', yKey: 'r', yName: 'Revenue' }]}
			/>,
		)

		const label = allBySlot(container, 'chart-value-label').find((n) => n.textContent === '100')

		const peak = allBySlot(container, 'chart-point')[1]

		expect(Number(label?.getAttribute('y'))).toBeLessThan(Number(peak?.getAttribute('cy')))
	})
})

describe('value-label headroom with a series hidden from the legend', () => {
	// Two series, then the second hidden: one series draws, so its labels show.
	// The headroom must count that one visible series, not the two in `series`.
	const data = [
		{ m: 'Jan', r: 40, s: 1 },
		{ m: 'Feb', r: 100, s: 2 },
		{ m: 'Mar', r: 65, s: 3 },
	]

	const peakLabelAbovePeak = (container: HTMLElement) => {
		fireEvent.click(allBySlot(container, 'chart-legend-item')[1] as HTMLElement)

		const label = allBySlot(container, 'chart-value-label').find((n) => n.textContent === '100')

		const peak = allBySlot(container, 'chart-point')[1]

		expect(Number(label?.getAttribute('y'))).toBeLessThan(Number(peak?.getAttribute('cy')))
	}

	it('reserves the room on a LineChart', () => {
		const { container } = renderUI(
			<LineChart
				aria-label="Revenue"
				width={400}
				points
				labels={{ extremes: true }}
				data={data}
				series={[
					{ xKey: 'm', yKey: 'r', yName: 'Revenue' },
					{ xKey: 'm', yKey: 's', yName: 'Spend' },
				]}
			/>,
		)

		peakLabelAbovePeak(container)
	})

	it('reserves the room on an AreaChart', () => {
		const { container } = renderUI(
			<AreaChart
				aria-label="Revenue"
				width={400}
				points
				labels={{ extremes: true }}
				data={data}
				series={[
					{ xKey: 'm', yKey: 'r', yName: 'Revenue' },
					{ xKey: 'm', yKey: 's', yName: 'Spend' },
				]}
			/>,
		)

		peakLabelAbovePeak(container)
	})

	it('reserves the room on a ComboChart, counting only its line and area series', () => {
		const { container } = renderUI(
			<ComboChart
				aria-label="Revenue"
				width={400}
				points
				labels={{ extremes: true }}
				data={data}
				series={[
					{ type: 'line', xKey: 'm', yKey: 'r', yName: 'Revenue' },
					{ type: 'line', xKey: 'm', yKey: 's', yName: 'Spend' },
				]}
			/>,
		)

		peakLabelAbovePeak(container)
	})
})
