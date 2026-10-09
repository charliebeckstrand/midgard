// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { declump } from '../../modules/chart/engine/chart-geometry/declump'
import {
	LABEL_HEIGHT,
	type LabelBox,
	type PlacedReferenceLabel,
	referenceLabels,
	type ValueLabelSeries,
	valueLabels,
} from '../../modules/chart/engine/chart-geometry/label'

/** The plot box of the tests: 200 units wide and 100 units high. */
const PLOT = { x: 0, y: 0, width: 200, height: 100 }

/** A single series over the given `[x, y, value]` points. */
function series(points: [number, number, number][]): ValueLabelSeries {
	return {
		fill: 'fill-blue-600',
		points: points.map(([x, y, value]) => ({ x, y, value })),
		format: String,
	}
}

/** Two boxes share area. */
function overlaps(a: LabelBox, b: LabelBox): boolean {
	return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1
}

/** The placed labels, without the `null` slots of the rules that draw nothing. */
function drawn(labels: (PlacedReferenceLabel | null)[]): PlacedReferenceLabel[] {
	return labels.filter((label): label is PlacedReferenceLabel => label !== null)
}

describe('declump', () => {
	it('leaves spans that do not overlap at their centers', () => {
		expect(
			declump(
				[
					{ at: 20, half: 5 },
					{ at: 60, half: 5 },
				],
				0,
				100,
				'high',
			),
		).toEqual([20, 60])
	})

	it('pushes a crowded run the way `toward` names, and keeps the order', () => {
		const spans = [
			{ at: 50, half: 5 },
			{ at: 52, half: 5 },
		]

		// Growing up holds the high span and moves the low span off it.
		expect(declump(spans, 0, 100, 'low')).toEqual([42, 52])

		// Growing down holds the low span and moves the high span off it.
		expect(declump(spans, 0, 100, 'high')).toEqual([50, 60])
	})

	it('keeps each span inside the band', () => {
		expect(
			declump(
				[
					{ at: 2, half: 5 },
					{ at: 3, half: 5 },
				],
				0,
				100,
				'low',
			),
		).toEqual([5, 15])
	})

	it('returns the centers in the input order', () => {
		expect(
			declump(
				[
					{ at: 60, half: 5 },
					{ at: 20, half: 5 },
					{ at: 58, half: 5 },
				],
				0,
				100,
				'high',
			),
		).toEqual([68, 20, 58])
	})
})

describe('referenceLabels', () => {
	it('stacks the labels of close rules in a vertical chart, growing up', () => {
		const labels = referenceLabels(
			[
				{ at: 60, text: 'Target' },
				{ at: 57, text: 'Stretch' },
			],
			'vertical',
			PLOT,
		)

		const [target, stretch] = labels

		// Each label ends at the far end of the plot.
		expect(target?.anchor).toBe('end')

		expect(target?.x).toBe(PLOT.x + PLOT.width)

		// The labels keep the order of their rules, one label height apart, and the
		// crowded run grows up: the lower rule's label holds its place above its rule.
		expect((target?.y ?? 0) - (stretch?.y ?? 0)).toBe(LABEL_HEIGHT)

		expect(target?.y).toBeLessThan(60)

		expect(stretch?.y).toBeLessThan(57)

		expect(overlaps(target?.box as LabelBox, stretch?.box as LabelBox)).toBe(false)
	})

	it('spreads the labels of close rules in a horizontal chart, inside the plot sides', () => {
		const labels = drawn(
			referenceLabels(
				[
					{ at: 150, text: 'Target' },
					{ at: 155, text: 'Stretch' },
					{ at: 196, text: 'Ceiling' },
				],
				'horizontal',
				PLOT,
			),
		)

		expect(labels.map((label) => label.anchor)).toEqual(['middle', 'middle', 'middle'])

		for (const [index, label] of labels.entries()) {
			expect(label.box.x0).toBeGreaterThanOrEqual(PLOT.x)

			expect(label.box.x1).toBeLessThanOrEqual(PLOT.x + PLOT.width)

			for (const other of labels.slice(index + 1)) {
				expect(overlaps(label.box, other.box)).toBe(false)
			}
		}
	})

	it('places nothing for a rule that draws nothing, and keeps the slots aligned', () => {
		const labels = referenceLabels(
			[
				{ at: null, text: 'Hidden' },
				{ at: 40, text: 'Goal' },
			],
			'vertical',
			PLOT,
		)

		expect(labels[0]).toBeNull()

		expect(labels[1]).not.toBeNull()
	})
})

describe('valueLabels against the reference labels', () => {
	it('drops a value label whose box meets a reference label', () => {
		const points = series([
			[10, 50, 5],
			[100, 20, 9],
		])

		const free = valueLabels({ series: [points], plot: PLOT, endpoints: true, extremes: false })

		expect(free.map((label) => label.text)).toEqual(['9', '5'])

		const [goal] = drawn(referenceLabels([{ at: 20, text: 'Goal' }], 'vertical', PLOT))

		// A box over the right half of the plot at the height of the last point's label.
		const blocked = valueLabels({
			series: [points],
			plot: PLOT,
			endpoints: true,
			extremes: false,
			obstacles: [{ ...(goal?.box as LabelBox), x0: 90 }],
		})

		expect(blocked.map((label) => label.text)).toEqual(['5'])
	})
})
