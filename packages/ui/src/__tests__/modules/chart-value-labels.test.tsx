import { describe, expect, it } from 'vitest'
import { AreaChart } from '../../modules/chart/area-chart'
import { paintFor } from '../../modules/chart/chart-series'
import {
	labelPoints,
	type PlacedValueLabel,
	resolveValueLabels,
	type ValueLabelSeries,
	valueLabels,
} from '../../modules/chart/chart-value-labels'
import { LineChart } from '../../modules/chart/line-chart'
import { allBySlot, bySlot, renderUI } from '../helpers'

const PLOT = { x: 0, y: 0, width: 200, height: 100 }

/** A single series over the given `[x, y, value]` points. */
function series(points: [number, number, number][]): ValueLabelSeries {
	return { fill: 'fill-blue-600', points: points.map(([x, y, value]) => ({ x, y, value })) }
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
			format: String,
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
			format: String,
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
			format: String,
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
			format: String,
			endpoints: false,
			extremes: true,
		})

		expect(labels).toHaveLength(1)

		expect(labels[0]?.text).toBe('100')
	})

	it('hides a label that would slide sideways to fit, keeping the vertical flip', () => {
		// A label stays centred on its point: near a side edge its box would cross
		// the plot, and it hides rather than sliding onto the neighbouring marks —
		// the small-frame crowding this pins out.
		const right = valueLabels({
			series: [series([[198, 50, 12345]])],
			plot: PLOT,
			format: String,
			endpoints: true,
			extremes: false,
		})

		expect(right).toHaveLength(0)

		const left = valueLabels({
			series: [series([[2, 50, 12345]])],
			plot: PLOT,
			format: String,
			endpoints: true,
			extremes: false,
		})

		expect(left).toHaveLength(0)

		// A fitting label anchors on its point's centre — never slid inward.
		const [fits] = valueLabels({
			series: [series([[100, 50, 12345]])],
			plot: PLOT,
			format: String,
			endpoints: true,
			extremes: false,
		})

		expect(fits?.anchor).toBe('middle')

		// A max sits above its point, but a point at the top still flips its label
		// below — vertically the label never leaves its own mark, so the flip stays.
		const [top] = valueLabels({
			series: [series([[100, 2, 9]])],
			plot: PLOT,
			format: String,
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

describe('resolveValueLabels', () => {
	const list = [
		{
			paint: paintFor('blue'),
			geometry: {
				points: [
					{ x: 10, y: 50 },
					{ x: 100, y: 20 },
				],
			},
		},
	]

	const metas = [{ values: [5, 9] }]

	it('draws nothing without a label switch', () => {
		expect(resolveValueLabels(undefined, list, metas, PLOT, String)).toEqual([])

		expect(resolveValueLabels({}, list, metas, PLOT, String)).toEqual([])
	})

	it('builds the labels in the series ink when a switch is on', () => {
		const labels = resolveValueLabels({ endpoints: true }, list, metas, PLOT, String)

		expect(texts(labels).sort()).toEqual(['5', '9'])

		expect(labels[0]?.fill).toContain('fill-blue-600')
	})

	it('stands the point labels down when the chart has more than one series', () => {
		// Point labels are single-series only — two series would crowd their
		// numbers between the lines, so the config is honoured only for a lone
		// series and the tooltip carries the readout otherwise.
		const twoSeries = [
			...list,
			{
				paint: paintFor('orange'),
				geometry: {
					points: [
						{ x: 10, y: 80 },
						{ x: 100, y: 60 },
					],
				},
			},
		]

		const twoMetas = [...metas, { values: [3, 7] }]

		expect(
			resolveValueLabels({ endpoints: true, extremes: true }, twoSeries, twoMetas, PLOT, String),
		).toEqual([])

		// The lone series still labels.
		expect(resolveValueLabels({ endpoints: true }, list, metas, PLOT, String)).toHaveLength(2)
	})
})

describe('LineChart value labels', () => {
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

		// The peak (90) and trough (40) are labelled; the middle point is not.
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
