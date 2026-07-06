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

	it('anchors inward at the edges and flips off a clipped side', () => {
		const [right] = valueLabels({
			series: [series([[198, 50, 12345]])],
			plot: PLOT,
			format: String,
			endpoints: true,
			extremes: false,
		})

		expect(right?.anchor).toBe('end')

		const [left] = valueLabels({
			series: [series([[2, 50, 12345]])],
			plot: PLOT,
			format: String,
			endpoints: true,
			extremes: false,
		})

		expect(left?.anchor).toBe('start')

		// A max sits above its point, but a point at the top flips its label below.
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
