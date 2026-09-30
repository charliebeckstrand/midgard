// @vitest-environment node
import { describe, expect, it } from 'vitest'
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

/** The plot box of the value-label tests: 200 units wide and 100 units high. */
export const PLOT = { x: 0, y: 0, width: 200, height: 100 }

/** A single series over the given `[x, y, value]` points. */
export function series(points: [number, number, number][]): ValueLabelSeries {
	return {
		fill: 'fill-blue-600',
		points: points.map(([x, y, value]) => ({ x, y, value })),
		format: String,
	}
}

/** The label texts, in placement order. */
export function texts(labels: PlacedValueLabel[]): string[] {
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

describe('labelBesideY', () => {
	it('takes its preferred side, and flips where that side clips the plot', () => {
		expect(labelBesideY(50, PLOT, true)).toBeLessThan(50)

		expect(labelBesideY(50, PLOT, false)).toBeGreaterThan(50)

		// Too near the top to sit above, and too near the bottom to sit below.
		expect(labelBesideY(4, PLOT, true)).toBeGreaterThan(4)

		expect(labelBesideY(96, PLOT, false)).toBeLessThan(96)
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
